import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { logDealEvent, writeAudit, type Deal } from '../../../lib/deals'
import { bucketWindow, splitVat, sumConfirmed, type PaymentRow } from '../../../lib/collections'
import { dateShort, nf, riyadhDayStart, sar } from '../../../lib/format'
import { McIcon } from './mcIcons'

interface Payment extends PaymentRow { vat_rate: number; rejected_reason: string; sourced_by: string; closed_by: string; note: string }
type Filter = 'all' | 'pending_verification' | 'confirmed' | 'rejected'

const STATUS = {
  pending_verification: { label: 'بانتظار التحقق', cls: 'mc-a' },
  confirmed: { label: 'مؤكدة', cls: 'mc-g' },
  rejected: { label: 'مرفوضة', cls: 'mc-n2' },
} as const
const METHOD: Record<string, string> = { bank_transfer: 'حوالة بنكية', moyasar: 'ميسر', cash: 'نقدًا', other: 'أخرى' }
const todayInput = () => new Date().toISOString().slice(0, 10)

const EMPTY = { customer_name: '', deal_id: '', amount: '', vat_included: 'yes', vat_rate: '15', method: 'bank_transfer', reference: '', received: todayInput(), note: '', sourced_by: 'المالك', closed_by: 'المالك' }

// Collection ledger. A payment counts as collected only after the owner confirms it here.
export const AdminFinance = () => {
  const [rows, setRows] = useState<Payment[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const load = useCallback(async () => {
    const [p, d] = await Promise.all([
      supabase.from('payments').select('*').order('received_at', { ascending: false }).limit(1000),
      supabase.from('deals').select('*').not('stage', 'in', '(won,lost)').limit(300),
    ])
    setError(p.error ? 'تعذّر تحميل الدفعات. أعد المحاولة.' : null)
    setRows(((p.data ?? []) as Payment[]).map(r => ({ ...r, total_amount: Number(r.total_amount), net_amount: Number(r.net_amount), tax_amount: Number(r.tax_amount) })))
    setDeals((d.data ?? []) as Deal[])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const now = new Date()
  const today = riyadhDayStart(now)
  const month = bucketWindow('month', 0, now)
  const todayTotal = sumConfirmed(rows, today, new Date(today.getTime() + 86400000))
  const monthTotal = sumConfirmed(rows, month.start, month.end)
  const pending = rows.filter(r => r.status === 'pending_verification')
  const pendingTotal = pending.reduce((s, r) => s + r.total_amount, 0)
  const shown = useMemo(() => rows.filter(r => filter === 'all' || r.status === filter), [rows, filter])

  const amount = Number(form.amount)
  const split = Number.isFinite(amount) && amount > 0 ? splitVat(amount, Number(form.vat_rate) || 0, form.vat_included === 'yes') : null

  const pickDeal = (id: string) => {
    const d = deals.find(x => x.id === id)
    setForm(f => ({ ...f, deal_id: id, customer_name: d ? d.company_name : f.customer_name, sourced_by: d?.sourced_by || f.sourced_by }))
  }

  const addPayment = async () => {
    if (!split || !form.customer_name.trim()) return
    setSaving(true)
    const { data: u } = await supabase.auth.getUser()
    const { error: e } = await supabase.from('payments').insert({
      customer_name: form.customer_name.trim(), deal_id: form.deal_id || null, method: form.method, total_amount: split.total, net_amount: split.net,
      tax_amount: split.tax, vat_included: form.vat_included === 'yes', vat_rate: Number(form.vat_rate) || 0, reference: form.reference.trim(),
      note: form.note.trim(), sourced_by: form.sourced_by, closed_by: form.closed_by, received_at: new Date(`${form.received}T12:00:00+03:00`).toISOString(), created_by: u.user?.id,
    })
    setSaving(false)
    if (e) { setError(e.code === '23505' ? 'هذا المرجع مسجل مسبقًا، ولا يُسجل نفس التحويل مرتين.' : 'تعذّر تسجيل الدفعة.'); return }
    setAdding(false)
    setForm({ ...EMPTY, received: todayInput() })
    setError(null)
    load()
  }

  const confirm = async (p: Payment) => {
    const { data: u } = await supabase.auth.getUser()
    const at = new Date().toISOString()
    const { data: changed, error: e } = await supabase.from('payments').update({ status: 'confirmed', confirmed_at: at, confirmed_by: u.user?.id }).eq('id', p.id).eq('status', 'pending_verification').select('id')
    if (e || (changed?.length ?? 0) === 0) { setError('تعذّر تأكيد الدفعة (ربما تغيّرت حالتها).'); setConfirmId(null); load(); return }
    await writeAudit('payment_confirmed', 'payment', p.id, { status: p.status }, { status: 'confirmed', total: p.total_amount })
    if (p.deal_id) {
      await supabase.from('deals').update({ stage: 'won', closed_at: at, closed_by: p.closed_by || 'المالك', updated_at: at }).eq('id', p.deal_id)
      await logDealEvent(p.deal_id, 'payment_confirmed', { payment_id: p.id, total: p.total_amount })
    }
    setConfirmId(null)
    load()
  }

  const reject = async (p: Payment) => {
    const { data: changed, error: e } = await supabase.from('payments').update({ status: 'rejected', rejected_reason: reason.trim() }).eq('id', p.id).eq('status', 'pending_verification').select('id')
    if (e || (changed?.length ?? 0) === 0) { setError('تعذّر رفض الدفعة.'); return }
    await writeAudit('payment_rejected', 'payment', p.id, { status: p.status }, { status: 'rejected', reason: reason.trim() })
    setRejectId(null)
    setReason('')
    load()
  }

  return (
    <div>
      {error && <div className="mc-banner">{error}</div>}
      <div className="mc-kpis">
        <article className="mc-card mc-kpi"><div className="mc-h"><div className="mc-ico"><McIcon name="wallet" /></div><span>المحصل اليوم</span></div><div className="mc-big">{nf(todayTotal)} <small>ر.س</small></div></article>
        <article className="mc-card mc-kpi"><div className="mc-h"><div className="mc-ico"><McIcon name="target" /></div><span>المحصل هذا الشهر</span></div><div className="mc-big">{nf(monthTotal)} <small>ر.س</small></div></article>
        <article className="mc-card mc-kpi mc-hot"><div className="mc-h"><div className="mc-ico"><McIcon name="bank" /></div><span>بانتظار التحقق</span></div><div className="mc-big">{nf(pending.length)}</div><div className="mc-delta">{sar(pendingTotal)} لا تُحتسب تحصيلًا قبل التأكيد</div></article>
        <article className="mc-card mc-kpi"><div className="mc-h"><div className="mc-ico"><McIcon name="doc" /></div><span>كل الدفعات المسجلة</span></div><div className="mc-big">{nf(rows.length)}</div></article>
      </div>

      <article className="mc-card">
        <div className="mc-ph">
          <h3>سجل الدفعات</h3>
          <div className="mc-phr">
            <div className="mc-tabs" role="tablist" aria-label="تصفية">
              {([['all', 'الكل'], ['pending_verification', 'بانتظار التحقق'], ['confirmed', 'مؤكدة'], ['rejected', 'مرفوضة']] as const).map(([k, l]) => (
                <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? 'mc-on' : ''} onClick={() => setFilter(k)}>{l}</button>
              ))}
            </div>
            <button className="mc-btn2 p" onClick={() => setAdding(true)}>تسجيل دفعة</button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="mc-tbl">
            <thead><tr><th>الاستلام</th><th>العميل</th><th>الطريقة</th><th>الصافي</th><th>الضريبة</th><th>الإجمالي</th><th>المرجع</th><th>الحالة</th><th /></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="mc-flat">جاري التحميل…</td></tr>}
              {!loading && shown.length === 0 && <tr><td colSpan={9} className="mc-flat">{rows.length === 0 ? 'لا توجد دفعات مسجلة بعد. سجّل أول حوالة وتبدأ الأرقام من هنا.' : 'لا توجد دفعات بهذا الفلتر.'}</td></tr>}
              {shown.map(p => (
                <tr key={p.id}>
                  <td>{dateShort(p.received_at)}</td>
                  <td><b>{p.customer_name}</b>{p.rejected_reason && <div style={{ color: 'var(--ink-3)', fontSize: 12 }}>السبب: {p.rejected_reason}</div>}</td>
                  <td>{METHOD[p.method] ?? p.method}</td>
                  <td>{nf(p.net_amount)}</td><td>{nf(p.tax_amount)}</td><td><b>{nf(p.total_amount)}</b></td>
                  <td dir="ltr" style={{ textAlign: 'right' }}>{p.reference || '—'}</td>
                  <td><span className={`mc-st ${STATUS[p.status].cls}`}>{STATUS[p.status].label}</span></td>
                  <td>
                    {p.status === 'pending_verification' && (
                      confirmId === p.id ? (
                        <span style={{ display: 'flex', gap: 6 }}><button className="mc-btn2 p" onClick={() => confirm(p)}>تأكيد نهائي</button><button className="mc-btn2" onClick={() => setConfirmId(null)}>إلغاء</button></span>
                      ) : rejectId === p.id ? (
                        <span style={{ display: 'flex', gap: 6 }}>
                          <input aria-label="سبب الرفض" placeholder="السبب" value={reason} onChange={e => setReason(e.target.value)} style={{ height: 40, borderRadius: 10, border: '1px solid var(--line)', background: 'rgba(14,28,66,.7)', color: 'var(--ink)', padding: '0 10px', width: 130 }} />
                          <button className="mc-btn2 p" onClick={() => reject(p)}>رفض</button><button className="mc-btn2" onClick={() => setRejectId(null)}>إلغاء</button>
                        </span>
                      ) : (
                        <span style={{ display: 'flex', gap: 6 }}><button className="mc-btn2 p" onClick={() => setConfirmId(p.id)}>تأكيد التحصيل</button><button className="mc-btn2" onClick={() => setRejectId(p.id)}>رفض</button></span>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {adding && (
        <div className="mc-modal-bg" onClick={() => setAdding(false)}>
          <div className="mc-modal" onClick={e => e.stopPropagation()}>
            <h3>تسجيل دفعة</h3>
            <label className="mc-field">ربطها بصفقة (اختياري)
              <select value={form.deal_id} onChange={e => pickDeal(e.target.value)}><option value="">بدون صفقة</option>{deals.map(d => <option key={d.id} value={d.id}>{d.company_name}</option>)}</select>
            </label>
            <label className="mc-field">اسم العميل<input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} /></label>
            <div className="mc-grid2">
              <label className="mc-field">المبلغ (ر.س)<input type="number" min={0} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></label>
              <label className="mc-field">الضريبة %<input type="number" min={0} max={100} value={form.vat_rate} onChange={e => setForm({ ...form, vat_rate: e.target.value })} /></label>
            </div>
            <label className="mc-field">المبلغ المُدخل
              <select value={form.vat_included} onChange={e => setForm({ ...form, vat_included: e.target.value })}><option value="yes">شامل الضريبة (المبلغ المستلم)</option><option value="no">قبل الضريبة (الصافي)</option></select>
            </label>
            {split && <div className="mc-delta">الصافي {sar(split.net)} · الضريبة {sar(split.tax)} · الإجمالي {sar(split.total)}</div>}
            <div className="mc-grid2">
              <label className="mc-field">الطريقة<select value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>{Object.entries(METHOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
              <label className="mc-field">تاريخ الاستلام<input type="date" value={form.received} onChange={e => setForm({ ...form, received: e.target.value })} /></label>
            </div>
            <label className="mc-field">مرجع التحويل (يمنع التكرار)<input dir="ltr" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} /></label>
            <div className="mc-grid2">
              <label className="mc-field">من جلب العميل<input value={form.sourced_by} onChange={e => setForm({ ...form, sourced_by: e.target.value })} /></label>
              <label className="mc-field">من أغلق الصفقة<input value={form.closed_by} onChange={e => setForm({ ...form, closed_by: e.target.value })} /></label>
            </div>
            <label className="mc-field">ملاحظة<textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="mc-btn2" onClick={() => setAdding(false)}>إلغاء</button>
              <button className="mc-btn2 p" disabled={saving || !split || !form.customer_name.trim()} onClick={addPayment}>{saving ? 'جاري الحفظ…' : 'تسجيل (بانتظار التحقق)'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
