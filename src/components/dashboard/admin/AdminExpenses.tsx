import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { bucketWindow, type PaymentRow, type RefundRow } from '../../../lib/collections'
import { marginPct } from '../../../lib/commercial'
import { dateShort, nf, sar } from '../../../lib/format'
import type { Deal } from '../../../lib/deals'

interface Expense { id: string; category: string; description: string; vendor: string; amount_net: number; tax_amount: number; tax_recoverable: boolean; incurred_at: string; deal_id: string | null; reference: string }
interface Pay extends PaymentRow { deal_id: string | null }
interface Ref extends RefundRow { payment_id: string }
const USD_SAR = 3.75
const CAT: Record<string, string> = { tools: 'أدوات', hosting: 'استضافة', servers: 'سيرفرات', ai_agents: 'تشغيل إيجنتات AI', ads: 'إعلانات', voice_provider: 'مزود صوت', other: 'أخرى' }
const EMPTY = { category: 'tools', description: '', vendor: '', amount_net: '', tax_amount: '', tax_recoverable: 'no', incurred_at: new Date().toISOString().slice(0, 10), deal_id: '', reference: '' }

// Real costs against real net collection. A missing cost shows as "data incomplete", never as a 100% margin.
export const AdminExpenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [pays, setPays] = useState<Pay[]>([])
  const [refunds, setRefunds] = useState<Ref[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [apifyUsd, setApifyUsd] = useState(0)
  const [commission, setCommission] = useState(0)
  const [minMargin, setMinMargin] = useState(30)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY)

  const month = useMemo(() => bucketWindow('month', 0), [])

  const load = useCallback(async () => {
    const [e, p, r, d, o, c, s] = await Promise.all([
      supabase.from('expenses').select('*').order('incurred_at', { ascending: false }).limit(500),
      supabase.from('payments').select('id, customer_name, status, total_amount, net_amount, tax_amount, confirmed_at, received_at, reference, method, deal_id').eq('status', 'confirmed').limit(2000),
      supabase.from('refunds').select('id, payment_id, amount, status, executed_at').eq('status', 'executed').limit(500),
      supabase.from('deals').select('*').limit(1000),
      supabase.from('outreach_runs').select('cost_usd, created_at').gte('created_at', month.start.toISOString()).lt('created_at', month.end.toISOString()),
      supabase.from('commissions').select('amount, status, created_at').in('status', ['on_hold', 'due', 'approved', 'paid', 'adjusted']).gte('created_at', month.start.toISOString()),
      supabase.from('agency_settings').select('min_margin_pct').eq('id', 1).maybeSingle(),
    ])
    setError([e, p, r].some(x => x.error) ? 'تعذّر تحميل جزء من البيانات.' : null)
    setExpenses(((e.data ?? []) as Expense[]).map(x => ({ ...x, amount_net: Number(x.amount_net), tax_amount: Number(x.tax_amount) })))
    setPays(((p.data ?? []) as Pay[]).map(x => ({ ...x, total_amount: Number(x.total_amount), net_amount: Number(x.net_amount), tax_amount: Number(x.tax_amount) })))
    setRefunds(((r.data ?? []) as Ref[]).map(x => ({ ...x, amount: Number(x.amount) })))
    setDeals((d.data ?? []) as Deal[])
    setApifyUsd((o.data ?? []).reduce((a, x) => a + Number(x.cost_usd ?? 0), 0))
    setCommission((c.data ?? []).reduce((a, x) => a + Number(x.amount), 0))
    if (s.data) setMinMargin(Number(s.data.min_margin_pct))
  }, [month])
  useEffect(() => { load() }, [load])

  const inMonth = (iso: string | null) => !!iso && new Date(iso) >= month.start && new Date(iso) < month.end
  const costOf = (x: Expense) => x.amount_net + (x.tax_recoverable ? 0 : x.tax_amount)

  // Refund amounts are gross; their net share follows the original payment's net/total ratio.
  const refundNet = (r: Ref) => { const p = pays.find(x => x.id === r.payment_id); return p ? r.amount * (p.net_amount / p.total_amount) : 0 }
  const collectedNet = pays.filter(p => inMonth(p.confirmed_at)).reduce((s, p) => s + p.net_amount, 0) - refunds.filter(r => inMonth(r.executed_at)).reduce((s, r) => s + refundNet(r), 0)
  const expensesMonth = expenses.filter(x => inMonth(x.incurred_at)).reduce((s, x) => s + costOf(x), 0)
  const apifySar = apifyUsd * USD_SAR
  const hasCostData = expenses.some(x => inMonth(x.incurred_at)) || apifyUsd > 0 || commission > 0
  const totalCosts = hasCostData ? expensesMonth + apifySar + commission : null
  const profit = totalCosts === null ? null : collectedNet - totalCosts
  const margin = marginPct(collectedNet, totalCosts)

  const perCustomer = useMemo(() => {
    const map = new Map<string, { name: string; net: number; refunded: number; cost: number }>()
    const dealName = (id: string | null) => deals.find(d => d.id === id)?.company_name
    pays.forEach(p => {
      const name = dealName(p.deal_id) ?? p.customer_name
      const row = map.get(name) ?? { name, net: 0, refunded: 0, cost: 0 }
      row.net += p.net_amount
      map.set(name, row)
    })
    refunds.forEach(r => {
      const p = pays.find(x => x.id === r.payment_id); if (!p) return
      const name = dealName(p.deal_id) ?? p.customer_name
      const row = map.get(name); if (row) row.refunded += refundNet(r)
    })
    expenses.forEach(x => { const name = dealName(x.deal_id); if (name) { const row = map.get(name) ?? { name, net: 0, refunded: 0, cost: 0 }; row.cost += costOf(x); map.set(name, row) } })
    return [...map.values()].sort((a, b) => b.net - a.net)
  }, [pays, refunds, expenses, deals]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    const amount = Number(form.amount_net)
    if (!form.description.trim() || !(amount >= 0)) return
    const { data: u } = await supabase.auth.getUser()
    const { error: e } = await supabase.from('expenses').insert({
      category: form.category, description: form.description.trim(), vendor: form.vendor.trim(), amount_net: amount, tax_amount: Number(form.tax_amount) || 0,
      tax_recoverable: form.tax_recoverable === 'yes', incurred_at: form.incurred_at, deal_id: form.deal_id || null, reference: form.reference.trim(), created_by: u.user?.id,
    })
    if (e) { setError('تعذّر حفظ المصروف.'); return }
    setAdding(false); setForm(EMPTY); load()
  }

  return (
    <div>
      {error && <div className="mc-banner">{error}</div>}
      <div className="mc-kpis">
        <article className="mc-card mc-kpi"><div className="mc-h"><span>صافي المحصل هذا الشهر (قبل الضريبة)</span></div><div className="mc-big">{nf(Math.round(collectedNet))} <small>ر.س</small></div></article>
        <article className="mc-card mc-kpi"><div className="mc-h"><span>التكاليف المسجلة</span></div><div className="mc-big">{totalCosts === null ? <span className="mc-na">لا بيانات</span> : <>{nf(Math.round(totalCosts))} <small>ر.س</small></>}</div><div className="mc-delta">مصروفات {nf(Math.round(expensesMonth))} · Apify {nf(Math.round(apifySar))} · عمولات {nf(Math.round(commission))}</div></article>
        <article className="mc-card mc-kpi"><div className="mc-h"><span>صافي الربح</span></div><div className="mc-big">{profit === null ? <span className="mc-na">بيانات ناقصة</span> : <>{nf(Math.round(profit))} <small>ر.س</small></>}</div></article>
        <article className={`mc-card mc-kpi ${margin !== null && margin < minMargin ? 'mc-hot' : ''}`}><div className="mc-h"><span>الهامش</span></div><div className="mc-big">{margin === null ? <span className="mc-na">—</span> : `${margin}%`}</div><div className="mc-delta">{margin !== null && margin < minMargin ? `أقل من الحد ${minMargin}%: راجع التكلفة أو السعر` : `الحد الأدنى المعتمد ${minMargin}%`}</div></article>
      </div>

      <article className="mc-card" style={{ marginBottom: 14 }}>
        <div className="mc-ph"><h3>ربحية العملاء</h3></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="mc-tbl">
            <thead><tr><th>العميل</th><th>صافي المحصل</th><th>مسترجع</th><th>تكاليف مرتبطة</th><th>الربح</th><th>الهامش</th></tr></thead>
            <tbody>
              {perCustomer.length === 0 && <tr><td colSpan={6} className="mc-flat">لا يوجد تحصيل مؤكد بعد.</td></tr>}
              {perCustomer.map(c => {
                const known = c.cost > 0
                const m = marginPct(c.net - c.refunded, known ? c.cost : null)
                return <tr key={c.name}><td><b>{c.name}</b></td><td>{nf(Math.round(c.net))}</td><td>{nf(Math.round(c.refunded))}</td><td>{known ? nf(Math.round(c.cost)) : 'غير مسجلة'}</td><td>{known ? nf(Math.round(c.net - c.refunded - c.cost)) : '—'}</td><td>{m === null ? 'بيانات ناقصة' : `${m}%`}</td></tr>
              })}
            </tbody>
          </table>
        </div>
      </article>

      <article className="mc-card">
        <div className="mc-ph"><h3>المصروفات العامة</h3><button className="mc-btn2 p" onClick={() => setAdding(true)}>تسجيل مصروف</button></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="mc-tbl">
            <thead><tr><th>التاريخ</th><th>البند</th><th>الجهة</th><th>الصافي</th><th>الضريبة</th><th>التكلفة المحتسبة</th></tr></thead>
            <tbody>
              {expenses.length === 0 && <tr><td colSpan={6} className="mc-flat">لا توجد مصروفات مسجلة. الرواتب غير مفعّلة (ميزة «قريبًا»)، وتكاليف AI والأدوات تُسجل هنا.</td></tr>}
              {expenses.map(x => (
                <tr key={x.id}><td>{dateShort(x.incurred_at)}</td><td><b>{x.description}</b><div style={{ color: 'var(--ink-3)', fontSize: 12 }}>{CAT[x.category]}</div></td><td>{x.vendor || '—'}</td><td>{nf(x.amount_net)}</td><td>{nf(x.tax_amount)}{x.tax_recoverable ? ' (مستردة)' : ''}</td><td>{sar(costOf(x))}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {adding && (
        <div className="mc-modal-bg" onClick={() => setAdding(false)}>
          <div className="mc-modal" onClick={e => e.stopPropagation()}>
            <h3>تسجيل مصروف</h3>
            <label className="mc-field">التصنيف<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label className="mc-field">البند<input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
            <label className="mc-field">الجهة<input value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} /></label>
            <div className="mc-grid2">
              <label className="mc-field">الصافي (ر.س)<input type="number" min={0} value={form.amount_net} onChange={e => setForm({ ...form, amount_net: e.target.value })} /></label>
              <label className="mc-field">ضريبة المشتريات<input type="number" min={0} value={form.tax_amount} onChange={e => setForm({ ...form, tax_amount: e.target.value })} /></label>
            </div>
            <label className="mc-field">الضريبة قابلة للاسترداد؟<select value={form.tax_recoverable} onChange={e => setForm({ ...form, tax_recoverable: e.target.value })}><option value="no">لا (تُحتسب تكلفة)</option><option value="yes">نعم (لا تُحتسب تكلفة)</option></select></label>
            <div className="mc-grid2">
              <label className="mc-field">التاريخ<input type="date" value={form.incurred_at} onChange={e => setForm({ ...form, incurred_at: e.target.value })} /></label>
              <label className="mc-field">ربطه بعميل (يمنع التكرار مع العام)<select value={form.deal_id} onChange={e => setForm({ ...form, deal_id: e.target.value })}><option value="">مصروف عام</option>{deals.map(d => <option key={d.id} value={d.id}>{d.company_name}</option>)}</select></label>
            </div>
            <label className="mc-field">مرجع<input dir="ltr" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} /></label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="mc-btn2" onClick={() => setAdding(false)}>إلغاء</button>
              <button className="mc-btn2 p" disabled={!form.description.trim() || form.amount_net === ''} onClick={save}>حفظ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
