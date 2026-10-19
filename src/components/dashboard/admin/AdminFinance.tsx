import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { logDealEvent, writeAudit, type Deal } from '../../../lib/deals'
import { bucketWindow, netCollection, splitVat, sumConfirmed, type PaymentRow, type RefundRow } from '../../../lib/collections'
import { commissionFor, type CommissionRule } from '../../../lib/commercial'
import { dateShort, nf, riyadhDayStart, sar } from '../../../lib/format'
import { McIcon } from './mcIcons'
import { useRealtimeRefetch } from '../../../lib/realtime'

interface Payment extends PaymentRow { vat_rate: number; rejected_reason: string; sourced_by: string; closed_by: string; note: string; invoice_id: string | null }
interface Refund extends RefundRow { reason: string; reference: string; requested_at: string; invoice_id: string | null }
interface InvoiceBal { invoice_id: string; number: string; customer_name: string; grand_total: number; status: string; paid: number; refunded: number }
type Filter = 'all' | 'pending_verification' | 'confirmed' | 'rejected'

const STATUS = {
  pending_verification: { label: 'بانتظار التحقق', cls: 'mc-a' },
  confirmed: { label: 'مؤكدة', cls: 'mc-g' },
  rejected: { label: 'مرفوضة', cls: 'mc-n2' },
} as const
const R_STATUS = { requested: { label: 'مطلوب', cls: 'mc-a' }, approved: { label: 'معتمد', cls: 'mc-b' }, executed: { label: 'نُفذ', cls: 'mc-g' }, rejected: { label: 'مرفوض', cls: 'mc-n2' } } as const
const METHOD: Record<string, string> = { bank_transfer: 'حوالة بنكية', moyasar: 'ميسر', cash: 'نقدًا', other: 'أخرى' }
const todayInput = () => new Date().toISOString().slice(0, 10)
const EMPTY = { customer_name: '', deal_id: '', invoice_id: '', amount: '', vat_included: 'yes', vat_rate: '15', method: 'bank_transfer', reference: '', received: todayInput(), note: '', sourced_by: 'المالك', closed_by: 'المالك' }

// Collection ledger. A payment counts as collected only after the owner confirms it; refunds reduce it only once executed.
export const AdminFinance = () => {
  const [params] = useSearchParams()
  const [rows, setRows] = useState<Payment[]>([])
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [invoices, setInvoices] = useState<InvoiceBal[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [refundFor, setRefundFor] = useState<Payment | null>(null)
  const [refundForm, setRefundForm] = useState({ amount: '', reason: '' })
  const [execId, setExecId] = useState<string | null>(null)
  const [execRef, setExecRef] = useState('')

  const load = useCallback(async () => {
    const [p, d, r, i] = await Promise.all([
      supabase.from('payments').select('*').order('received_at', { ascending: false }).limit(1000),
      supabase.from('deals').select('*').not('stage', 'in', '(won,lost)').limit(300),
      supabase.from('refunds').select('*').order('requested_at', { ascending: false }).limit(500),
      supabase.from('invoice_balances').select('*').eq('status', 'issued').limit(500),
    ])
    setError(p.error ? 'تعذّر تحميل الدفعات. أعد المحاولة.' : null)
    setRows(((p.data ?? []) as Payment[]).map(x => ({ ...x, total_amount: Number(x.total_amount), net_amount: Number(x.net_amount), tax_amount: Number(x.tax_amount) })))
    setRefunds(((r.data ?? []) as Refund[]).map(x => ({ ...x, amount: Number(x.amount) })))
    setDeals((d.data ?? []) as Deal[])
    setInvoices(((i.data ?? []) as InvoiceBal[]).map(x => ({ ...x, grand_total: Number(x.grand_total), paid: Number(x.paid), refunded: Number(x.refunded) })))
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])
  useRealtimeRefetch('admin_finance', [{ table: 'payments' }, { table: 'refunds' }, { table: 'deals' }, { table: 'invoices' }, { table: 'commissions' }, { table: 'referrals' }, { table: 'marketers' }], load, true)

  // /admin/finance?invoice=<id> opens the payment form for that invoice (used by the invoices table)
  const wanted = params.get('invoice')
  useEffect(() => {
    if (!wanted || invoices.length === 0) return
    const inv = invoices.find(x => x.invoice_id === wanted)
    if (inv) {
      setForm(f => ({ ...f, invoice_id: inv.invoice_id, customer_name: inv.customer_name, amount: String(Math.max(0, inv.grand_total - (inv.paid - inv.refunded))), vat_included: 'yes' }))
      setAdding(true)
    }
  }, [wanted, invoices])

  const now = new Date()
  const today = riyadhDayStart(now)
  const month = bucketWindow('month', 0, now)
  const todayTotal = netCollection(rows, refunds, today, new Date(today.getTime() + 86400000))
  const monthTotal = netCollection(rows, refunds, month.start, month.end)
  const pending = rows.filter(r => r.status === 'pending_verification')
  const pendingTotal = pending.reduce((s, r) => s + r.total_amount, 0)
  const shown = useMemo(() => rows.filter(r => filter === 'all' || r.status === filter), [rows, filter])

  const amount = Number(form.amount)
  const split = Number.isFinite(amount) && amount > 0 ? splitVat(amount, Number(form.vat_rate) || 0, form.vat_included === 'yes') : null

  const pickDeal = (id: string) => {
    const d = deals.find(x => x.id === id)
    setForm(f => ({ ...f, deal_id: id, customer_name: d ? d.company_name : f.customer_name, sourced_by: d?.sourced_by || f.sourced_by }))
  }
  const pickInvoice = (id: string) => {
    const inv = invoices.find(x => x.invoice_id === id)
    setForm(f => ({ ...f, invoice_id: id, customer_name: inv ? inv.customer_name : f.customer_name, amount: inv ? String(Math.max(0, inv.grand_total - (inv.paid - inv.refunded))) : f.amount, vat_included: inv ? 'yes' : f.vat_included }))
  }

  const addPayment = async () => {
    if (!split || !form.customer_name.trim()) return
    setSaving(true)
    const { data: u } = await supabase.auth.getUser()
    const inv = invoices.find(x => x.invoice_id === form.invoice_id)
    const { error: e } = await supabase.from('payments').insert({
      customer_name: form.customer_name.trim(), deal_id: form.deal_id || null, invoice_id: form.invoice_id || null, method: form.method, total_amount: split.total, net_amount: split.net,
      tax_amount: split.tax, vat_included: form.vat_included === 'yes', vat_rate: Number(form.vat_rate) || 0, reference: form.reference.trim(),
      note: form.note.trim() + (inv && split.total > inv.grand_total - (inv.paid - inv.refunded) + 0.01 ? ' (أعلى من المتبقي على الفاتورة)' : ''), sourced_by: form.sourced_by, closed_by: form.closed_by,
      received_at: new Date(`${form.received}T12:00:00+03:00`).toISOString(), created_by: u.user?.id,
    })
    setSaving(false)
    if (e) { setError(e.code === '23505' ? 'هذا المرجع مسجل مسبقًا، ولا يُسجل نفس التحويل مرتين.' : 'تعذّر تسجيل الدفعة.'); return }
    setAdding(false); setForm({ ...EMPTY, received: todayInput() }); setError(null); load()
  }

  const maybeCommission = async (p: Payment, dealId: string) => {
    const { data: ref } = await supabase.from('referrals').select('id, marketer_id').eq('deal_id', dealId).eq('status', 'accepted').maybeSingle()
    if (!ref) return
    const { data: mk } = await supabase.from('marketers').select('commission_rule, status').eq('id', ref.marketer_id).maybeSingle()
    if (!mk || mk.status !== 'active') return
    const rule = mk.commission_rule as CommissionRule
    const c = commissionFor(p.net_amount, rule)
    if (!c) return
    const hold = new Date(Date.now() + c.hold_days * 86400000).toISOString().slice(0, 10)
    await supabase.from('commissions').insert({ marketer_id: ref.marketer_id, referral_id: ref.id, invoice_id: p.invoice_id, payment_id: p.id, base_amount: c.base, rate_pct: c.rate_pct, amount: c.amount, status: 'on_hold', hold_until: hold })
  }

  const confirm = async (p: Payment) => {
    const { data: u } = await supabase.auth.getUser()
    const at = new Date().toISOString()
    const { data: changed, error: e } = await supabase.from('payments').update({ status: 'confirmed', confirmed_at: at, confirmed_by: u.user?.id }).eq('id', p.id).eq('status', 'pending_verification').select('id')
    if (e || (changed?.length ?? 0) === 0) { setError('تعذّر تأكيد الدفعة (ربما تغيّرت حالتها).'); setConfirmId(null); load(); return }
    await writeAudit('payment_confirmed', 'payment', p.id, { status: p.status }, { status: 'confirmed', total: p.total_amount })
    if (p.deal_id) {
      let fullyPaid = true
      if (p.invoice_id) {
        const { data: bal } = await supabase.from('invoice_balances').select('grand_total, paid, refunded').eq('invoice_id', p.invoice_id).maybeSingle()
        if (bal) fullyPaid = Number(bal.paid) - Number(bal.refunded) >= Number(bal.grand_total) - 0.01
      }
      if (fullyPaid) await supabase.from('deals').update({ stage: 'won', closed_at: at, closed_by: p.closed_by || 'المالك', updated_at: at }).eq('id', p.deal_id)
      await logDealEvent(p.deal_id, 'payment_confirmed', { payment_id: p.id, total: p.total_amount, fully_paid: fullyPaid })
      await maybeCommission(p, p.deal_id)
    }
    setConfirmId(null); load()
  }

  const reject = async (p: Payment) => {
    const { data: changed, error: e } = await supabase.from('payments').update({ status: 'rejected', rejected_reason: reason.trim() }).eq('id', p.id).eq('status', 'pending_verification').select('id')
    if (e || (changed?.length ?? 0) === 0) { setError('تعذّر رفض الدفعة.'); return }
    await writeAudit('payment_rejected', 'payment', p.id, { status: p.status }, { status: 'rejected', reason: reason.trim() })
    setRejectId(null); setReason(''); load()
  }

  const refundable = (p: Payment) => p.total_amount - refunds.filter(r => r.payment_id === p.id && ['approved', 'executed', 'requested'].includes(r.status)).reduce((s, r) => s + r.amount, 0)

  const requestRefund = async () => {
    if (!refundFor) return
    const { data: u } = await supabase.auth.getUser()
    const { error: e } = await supabase.from('refunds').insert({ payment_id: refundFor.id, invoice_id: refundFor.invoice_id, amount: Number(refundForm.amount), reason: refundForm.reason.trim(), requested_by: u.user?.id })
    if (e) { setError(e.message.includes('refund_exceeds_payment') ? 'مبلغ الاسترجاع أكبر من الدفعة.' : 'تعذّر تسجيل طلب الاسترجاع.'); return }
    await writeAudit('refund_requested', 'payment', refundFor.id, null, { amount: Number(refundForm.amount) })
    setRefundFor(null); setRefundForm({ amount: '', reason: '' }); load()
  }

  const setRefund = async (r: Refund, status: 'approved' | 'executed' | 'rejected') => {
    const { data: u } = await supabase.auth.getUser()
    const at = new Date().toISOString()
    const patch: Record<string, unknown> = { status }
    if (status === 'approved') Object.assign(patch, { approved_by: u.user?.id, approved_at: at })
    if (status === 'executed') Object.assign(patch, { executed_by: u.user?.id, executed_at: at, reference: execRef.trim() })
    const { error: e } = await supabase.from('refunds').update(patch).eq('id', r.id)
    if (e) { setError(e.message.includes('refund_exceeds_payment') ? 'مجموع الاسترجاعات يتجاوز الدفعة.' : 'تعذّر تحديث الاسترجاع.'); return }
    await writeAudit(`refund_${status}`, 'refund', r.id, { status: r.status }, { status, amount: r.amount })
    if (status === 'executed') await adjustCommission(r)
    setExecId(null); setExecRef(''); load()
  }

  // A refund lowers the marketer commission of that payment: unpaid ones are reduced, paid ones get a negative settlement row.
  const adjustCommission = async (r: Refund) => {
    const pay = rows.find(x => x.id === r.payment_id)
    if (!pay) return
    const { data: com } = await supabase.from('commissions').select('*').eq('payment_id', pay.id).is('adjustment_of', null).maybeSingle()
    if (!com) return
    const cut = Math.round(Number(com.amount) * (r.amount / pay.total_amount) * 100) / 100
    if (['pending_verification', 'on_hold', 'due', 'approved'].includes(com.status)) {
      await supabase.from('commissions').update({ amount: Math.max(0, Number(com.amount) - cut), reason: `خُفضت بسبب استرجاع ${r.amount}` }).eq('id', com.id)
    } else if (com.status === 'paid') {
      await supabase.from('commissions').insert({ marketer_id: com.marketer_id, referral_id: com.referral_id, invoice_id: com.invoice_id, payment_id: pay.id, base_amount: -r.amount, amount: -cut, status: 'adjusted', adjustment_of: com.id, reason: `تسوية سالبة لاسترجاع ${r.amount}` })
    }
  }

  return (
    <div>
      {error && <div className="mc-banner">{error}</div>}
      <div className="mc-kpis">
        <article className="mc-card mc-kpi"><div className="mc-h"><div className="mc-ico"><McIcon name="wallet" /></div><span>صافي المحصل اليوم</span></div><div className="mc-big">{nf(todayTotal)} <small>ر.س</small></div></article>
        <article className="mc-card mc-kpi"><div className="mc-h"><div className="mc-ico"><McIcon name="target" /></div><span>صافي المحصل هذا الشهر</span></div><div className="mc-big">{nf(monthTotal)} <small>ر.س</small></div><div className="mc-delta">بعد خصم الاسترجاعات المنفذة</div></article>
        <article className="mc-card mc-kpi mc-hot"><div className="mc-h"><div className="mc-ico"><McIcon name="bank" /></div><span>بانتظار التحقق</span></div><div className="mc-big">{nf(pending.length)}</div><div className="mc-delta">{sar(pendingTotal)} لا تُحتسب تحصيلًا قبل التأكيد</div></article>
        <article className="mc-card mc-kpi"><div className="mc-h"><div className="mc-ico"><McIcon name="doc" /></div><span>إجمالي المؤكد (بدون استرجاع)</span></div><div className="mc-big">{nf(sumConfirmed(rows, new Date(0), new Date(8.64e15)))} <small>ر.س</small></div></article>
      </div>

      <article className="mc-card" style={{ marginBottom: 14 }}>
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
                  <td><b>{p.customer_name}</b>{p.invoice_id && <div style={{ color: 'var(--ink-3)', fontSize: 12 }}>{invoices.find(i => i.invoice_id === p.invoice_id)?.number ?? 'فاتورة'}</div>}{p.rejected_reason && <div style={{ color: 'var(--ink-3)', fontSize: 12 }}>السبب: {p.rejected_reason}</div>}</td>
                  <td>{METHOD[p.method] ?? p.method}</td>
                  <td>{nf(p.net_amount)}</td><td>{nf(p.tax_amount)}</td><td><b>{nf(p.total_amount)}</b></td>
                  <td dir="ltr" style={{ textAlign: 'right' }}>{p.reference || '—'}</td>
                  <td><span className={`mc-st ${STATUS[p.status].cls}`}>{STATUS[p.status].label}</span></td>
                  <td>
                    {p.status === 'confirmed' && refundable(p) > 0.01 && <button className="mc-btn2" onClick={() => { setRefundFor(p); setRefundForm({ amount: String(refundable(p)), reason: '' }) }}>طلب استرجاع</button>}
                    {p.status === 'pending_verification' && (
                      confirmId === p.id ? (
                        <span style={{ display: 'flex', gap: 6 }}><button className="mc-btn2 p" onClick={() => confirm(p)}>تأكيد نهائي</button><button className="mc-btn2" onClick={() => setConfirmId(null)}>إلغاء</button></span>
                      ) : rejectId === p.id ? (
                        <span style={{ display: 'flex', gap: 6 }}>
                          <input aria-label="سبب الرفض" placeholder="السبب" value={reason} onChange={e => setReason(e.target.value)} style={{ height: 40, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--fill)', color: 'var(--ink)', padding: '0 10px', width: 130 }} />
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

      <article className="mc-card">
        <div className="mc-ph"><h3>الاسترجاع والإلغاء</h3></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="mc-tbl">
            <thead><tr><th>الطلب</th><th>الدفعة</th><th>المبلغ</th><th>السبب</th><th>المرجع</th><th>الحالة</th><th /></tr></thead>
            <tbody>
              {refunds.length === 0 && <tr><td colSpan={7} className="mc-flat">لا توجد طلبات استرجاع. الطلب لا يخصم من التحصيل إلا بعد تنفيذه فعليًا.</td></tr>}
              {refunds.map(r => (
                <tr key={r.id}>
                  <td>{dateShort(r.requested_at)}</td><td>{rows.find(p => p.id === r.payment_id)?.customer_name ?? '—'}</td><td><b>{nf(r.amount)}</b></td><td>{r.reason || '—'}</td>
                  <td dir="ltr" style={{ textAlign: 'right' }}>{r.reference || '—'}</td><td><span className={`mc-st ${R_STATUS[r.status].cls}`}>{R_STATUS[r.status].label}</span></td>
                  <td>
                    {r.status === 'requested' && <span style={{ display: 'flex', gap: 6 }}><button className="mc-btn2 p" onClick={() => setRefund(r, 'approved')}>اعتماد</button><button className="mc-btn2" onClick={() => setRefund(r, 'rejected')}>رفض</button></span>}
                    {r.status === 'approved' && (execId === r.id ? (
                      <span style={{ display: 'flex', gap: 6 }}><input aria-label="مرجع تحويل الاسترجاع" placeholder="مرجع التحويل" dir="ltr" value={execRef} onChange={e => setExecRef(e.target.value)} style={{ height: 40, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--fill)', color: 'var(--ink)', padding: '0 10px', width: 140 }} /><button className="mc-btn2 p" disabled={!execRef.trim()} onClick={() => setRefund(r, 'executed')}>تأكيد التنفيذ</button></span>
                    ) : <button className="mc-btn2 p" onClick={() => setExecId(r.id)}>سجّلت التنفيذ</button>)}
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
            <label className="mc-field">فاتورة (اختياري)
              <select value={form.invoice_id} onChange={e => pickInvoice(e.target.value)}><option value="">بدون فاتورة</option>{invoices.map(i => <option key={i.invoice_id} value={i.invoice_id}>{i.number} · {i.customer_name} · متبقٍ {nf(Math.max(0, i.grand_total - (i.paid - i.refunded)))}</option>)}</select>
            </label>
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

      {refundFor && (
        <div className="mc-modal-bg" onClick={() => setRefundFor(null)}>
          <div className="mc-modal" onClick={e => e.stopPropagation()}>
            <h3>طلب استرجاع: {refundFor.customer_name}</h3>
            <div className="mc-delta">المتاح للاسترجاع {sar(refundable(refundFor))} من {sar(refundFor.total_amount)}</div>
            <label className="mc-field">المبلغ<input type="number" min={0} max={refundable(refundFor)} value={refundForm.amount} onChange={e => setRefundForm({ ...refundForm, amount: e.target.value })} /></label>
            <label className="mc-field">السبب<textarea value={refundForm.reason} onChange={e => setRefundForm({ ...refundForm, reason: e.target.value })} /></label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="mc-btn2" onClick={() => setRefundFor(null)}>إلغاء</button>
              <button className="mc-btn2 p" disabled={!(Number(refundForm.amount) > 0) || Number(refundForm.amount) > refundable(refundFor) + 0.005} onClick={requestRefund}>إرسال الطلب</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
