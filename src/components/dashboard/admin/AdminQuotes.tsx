import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { logDealEvent, writeAudit, type Deal } from '../../../lib/deals'
import { computeQuote, quoteExceptions } from '../../../lib/commercial'
import { dateShort, nf, sar } from '../../../lib/format'

interface Svc { id: string; code: string; name: string }
interface Pkg { id: string; name: string; tier: number; status: string }
interface Price { package_id: string; version: number; setup_net: number | null; monthly_net: number | null; status: string }
interface Quote {
  id: string; number: string; deal_id: string | null; customer_name: string; package_id: string | null; lines: { code: string; name: string }[]; scope: string
  delivery_days: number | null; payment_terms: string; setup_net: number; monthly_net: number; discount_pct: number; vat_rate: number
  net_total: number; tax_total: number; grand_total: number; status: string; valid_until: string | null; snapshot: Record<string, unknown> | null; created_at: string
}
interface Contract { id: string; number: string; quote_id: string; customer_name: string; status: string; term_months: number | null; starts_at: string | null; renews_at: string | null; created_at: string }
interface InvoiceBal { invoice_id: string; number: string; customer_name: string; grand_total: number; status: string; due_at: string | null; paid: number; refunded: number }
type Tab = 'quotes' | 'contracts' | 'invoices'

const Q_STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: 'مسودة', cls: 'mc-n2' }, approved: { label: 'معتمد', cls: 'mc-b' }, sent: { label: 'مُرسل', cls: 'mc-b' },
  accepted: { label: 'قَبِله العميل', cls: 'mc-g' }, rejected: { label: 'مرفوض', cls: 'mc-n2' }, expired: { label: 'منتهي', cls: 'mc-n2' },
}
const C_STATUS: Record<string, string> = { draft: 'مسودة', signed: 'موقّع', active: 'ساري', ended: 'منتهٍ', cancelled: 'ملغى' }
const EMPTY = { deal_id: '', customer_name: '', package_id: '', codes: [] as string[], scope: '', delivery_days: '', payment_terms: '', setup_net: '', monthly_net: '', discount_pct: '0', valid_until: '' }

function invoiceState(b: InvoiceBal) {
  if (b.status === 'void') return { label: 'ملغاة', cls: 'mc-n2' }
  const net = b.paid - b.refunded
  if (net >= b.grand_total - 0.01) return { label: 'مدفوعة', cls: 'mc-g' }
  if (b.paid > 0) return { label: 'مدفوعة جزئيًا', cls: 'mc-a' }
  if (b.due_at && new Date(b.due_at) < new Date()) return { label: 'متأخرة', cls: 'mc-a' }
  return { label: 'بانتظار الدفع', cls: 'mc-b' }
}

// Quotes, contracts and invoices. Approving a quote freezes its terms; accepting a quote is not a payment.
export const AdminQuotes = () => {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('quotes')
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [invoices, setInvoices] = useState<InvoiceBal[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [services, setServices] = useState<Svc[]>([])
  const [packages, setPackages] = useState<Pkg[]>([])
  const [prices, setPrices] = useState<Price[]>([])
  const [campaigns, setCampaigns] = useState<{ name: string; price_net: number | null; max_discount_pct: number | null }[]>([])
  const [vat, setVat] = useState(15)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [exceptionFor, setExceptionFor] = useState<Quote | null>(null)
  const [reason, setReason] = useState('')

  const load = useCallback(async () => {
    const [q, c, i, d, s, p, pr, cp, st] = await Promise.all([
      supabase.from('quotes').select('*').order('created_at', { ascending: false }).limit(300),
      supabase.from('contracts').select('*').order('created_at', { ascending: false }).limit(300),
      supabase.from('invoice_balances').select('*').limit(500),
      supabase.from('deals').select('*').not('stage', 'in', '(won,lost)').limit(300),
      supabase.from('agency_services').select('id, code, name').eq('active', true),
      supabase.from('packages').select('id, name, tier, status').order('tier'),
      supabase.from('package_prices').select('package_id, version, setup_net, monthly_net, status').eq('status', 'approved').order('version', { ascending: false }),
      supabase.from('campaigns').select('name, price_net, max_discount_pct'),
      supabase.from('agency_settings').select('vat_rate').eq('id', 1).maybeSingle(),
    ])
    setError([q, c, i].some(r => r.error) ? 'تعذّر تحميل جزء من البيانات.' : null)
    setQuotes((q.data ?? []) as Quote[]); setContracts((c.data ?? []) as Contract[])
    setInvoices(((i.data ?? []) as InvoiceBal[]).map(b => ({ ...b, grand_total: Number(b.grand_total), paid: Number(b.paid), refunded: Number(b.refunded) })))
    setDeals((d.data ?? []) as Deal[]); setServices((s.data ?? []) as Svc[]); setPackages((p.data ?? []) as Pkg[]); setPrices((pr.data ?? []) as Price[])
    setCampaigns((cp.data ?? []) as typeof campaigns)
    if (st.data) setVat(Number(st.data.vat_rate))
  }, [])
  useEffect(() => { load() }, [load])

  const totals = useMemo(() => computeQuote({ setup_net: Number(form.setup_net) || 0, monthly_net: Number(form.monthly_net) || 0, discount_pct: Number(form.discount_pct) || 0, vat_rate: vat }), [form, vat])
  const dealOf = (id: string | null) => deals.find(d => d.id === id)
  const limitsFor = (q: Quote) => {
    const camp = campaigns.find(c => c.name === (dealOf(q.deal_id)?.campaign ?? '___'))
    return { max_discount_pct: camp?.max_discount_pct ?? null, min_price: camp?.price_net ?? null }
  }

  const pickPackage = (id: string) => {
    const price = prices.find(p => p.package_id === id)
    setForm(f => ({ ...f, package_id: id, setup_net: price?.setup_net != null ? String(price.setup_net) : f.setup_net, monthly_net: price?.monthly_net != null ? String(price.monthly_net) : f.monthly_net }))
  }
  const pickDeal = (id: string) => { const d = deals.find(x => x.id === id); setForm(f => ({ ...f, deal_id: id, customer_name: d ? d.company_name : f.customer_name })) }

  const saveQuote = async () => {
    if (!form.customer_name.trim()) return
    const { data: u } = await supabase.auth.getUser()
    const lines = services.filter(s => form.codes.includes(s.code)).map(s => ({ code: s.code, name: s.name }))
    const { error: e } = await supabase.from('quotes').insert({
      deal_id: form.deal_id || null, customer_name: form.customer_name.trim(), package_id: form.package_id || null, lines, scope: form.scope.trim(),
      delivery_days: form.delivery_days ? Number(form.delivery_days) : null, payment_terms: form.payment_terms.trim(), setup_net: Number(form.setup_net) || 0,
      monthly_net: Number(form.monthly_net) || 0, discount_pct: Number(form.discount_pct) || 0, vat_rate: vat, ...totals, valid_until: form.valid_until || null, created_by: u.user?.id,
    })
    if (e) { setError('تعذّر حفظ العرض.'); return }
    setAdding(false); setForm(EMPTY); load()
  }

  const approve = async (q: Quote, exceptionReason?: string) => {
    const { data: u } = await supabase.auth.getUser()
    const snapshot = { number: q.number, customer_name: q.customer_name, lines: q.lines, scope: q.scope, delivery_days: q.delivery_days, payment_terms: q.payment_terms, setup_net: q.setup_net,
      monthly_net: q.monthly_net, discount_pct: q.discount_pct, vat_rate: q.vat_rate, net_total: q.net_total, tax_total: q.tax_total, grand_total: q.grand_total, frozen_at: new Date().toISOString(),
      exception: exceptionReason ?? null }
    const { data: changed, error: e } = await supabase.from('quotes').update({ status: 'approved', approved_by: u.user?.id, approved_at: new Date().toISOString(), snapshot }).eq('id', q.id).eq('status', 'draft').select('id')
    if (e || (changed?.length ?? 0) === 0) { setError('تعذّر اعتماد العرض.'); return }
    await writeAudit(exceptionReason ? 'quote_approved_with_exception' : 'quote_approved', 'quote', q.id, { status: 'draft' }, { status: 'approved', grand_total: q.grand_total, exception: exceptionReason ?? null })
    if (q.deal_id) await logDealEvent(q.deal_id, 'quote_approved', { number: q.number, grand_total: q.grand_total })
    setExceptionFor(null); setReason(''); load()
  }
  const tryApprove = (q: Quote) => {
    if (quoteExceptions(q, limitsFor(q)).length > 0) { setExceptionFor(q); return }
    approve(q)
  }

  const move = async (q: Quote, status: 'sent' | 'accepted' | 'rejected') => {
    const patch: Record<string, unknown> = { status }
    if (status === 'accepted') patch.accepted_at = new Date().toISOString()
    const { error: e } = await supabase.from('quotes').update(patch).eq('id', q.id)
    if (e) { setError('تعذّر تحديث العرض.'); return }
    if (q.deal_id) {
      if (status === 'sent') await supabase.from('deals').update({ stage: 'offer_sent', updated_at: new Date().toISOString() }).eq('id', q.deal_id).in('stage', ['new', 'contacted', 'interested', 'qualified'])
      if (status === 'accepted') await supabase.from('deals').update({ stage: 'awaiting_payment', updated_at: new Date().toISOString() }).eq('id', q.deal_id).not('stage', 'in', '(won,lost)')
      await logDealEvent(q.deal_id, `quote_${status}`, { number: q.number })
    }
    load()
  }

  const makeContract = async (q: Quote) => {
    if (!q.snapshot) return
    const { data: u } = await supabase.auth.getUser()
    const { error: e } = await supabase.from('contracts').insert({ quote_id: q.id, deal_id: q.deal_id, customer_name: q.customer_name, terms: q.snapshot, created_by: u.user?.id })
    if (e) { setError(e.code === '23505' ? 'يوجد عقد لهذا العرض مسبقًا.' : 'تعذّر إنشاء العقد.'); return }
    setTab('contracts'); load()
  }
  const makeInvoice = async (q: Quote) => {
    if (invoices.some(i => i.status !== 'void' && quotes.find(x => x.id === q.id) && false)) return
    const { data: existing } = await supabase.from('invoices').select('id').eq('quote_id', q.id).neq('status', 'void').limit(1)
    if (existing && existing.length > 0) { setError('أُصدرت فاتورة لهذا العرض مسبقًا.'); return }
    const { data: contract } = await supabase.from('contracts').select('id').eq('quote_id', q.id).neq('status', 'cancelled').maybeSingle()
    const { data: u } = await supabase.auth.getUser()
    const due = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
    const { error: e } = await supabase.from('invoices').insert({
      quote_id: q.id, contract_id: contract?.id ?? null, deal_id: q.deal_id, customer_name: q.customer_name, lines: q.lines,
      net_total: q.net_total, tax_total: q.tax_total, grand_total: q.grand_total, due_at: due, created_by: u.user?.id,
    })
    if (e) { setError('تعذّر إصدار الفاتورة.'); return }
    if (q.deal_id) await logDealEvent(q.deal_id, 'invoice_issued', { quote: q.number, grand_total: q.grand_total })
    setTab('invoices'); load()
  }

  const setContract = async (c: Contract, patch: Partial<Contract>) => {
    const { error: e } = await supabase.from('contracts').update(patch).eq('id', c.id)
    if (e) setError('تعذّر تحديث العقد.')
    load()
  }
  const voidInvoice = async (b: InvoiceBal) => {
    if (b.paid > 0) { setError('لا تُلغى فاتورة عليها دفعات. استخدم الاسترجاع.'); return }
    const { error: e } = await supabase.from('invoices').update({ status: 'void', voided_at: new Date().toISOString() }).eq('id', b.invoice_id)
    if (e) setError('تعذّر إلغاء الفاتورة.')
    await writeAudit('invoice_voided', 'invoice', b.invoice_id, { status: 'issued' }, { status: 'void' })
    load()
  }

  const plusMonths = (start: string, months: number) => { const d = new Date(start); d.setMonth(d.getMonth() + months); return d.toISOString().slice(0, 10) }

  return (
    <div>
      {error && <div className="mc-banner">{error}</div>}
      <article className="mc-card">
        <div className="mc-ph">
          <h3>العروض والعقود والفواتير</h3>
          <div className="mc-phr">
            <div className="mc-tabs" role="tablist">
              {([['quotes', 'العروض'], ['contracts', 'العقود'], ['invoices', 'الفواتير']] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'mc-on' : ''} onClick={() => setTab(k)}>{l}</button>)}
            </div>
            {tab === 'quotes' && <button className="mc-btn2 p" onClick={() => setAdding(true)}>عرض جديد</button>}
          </div>
        </div>

        {tab === 'quotes' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="mc-tbl">
              <thead><tr><th>الرقم</th><th>العميل</th><th>الصافي</th><th>الضريبة</th><th>الإجمالي</th><th>الحالة</th><th /></tr></thead>
              <tbody>
                {quotes.length === 0 && <tr><td colSpan={7} className="mc-flat">لا توجد عروض. الأسعار لم تُعتمد بعد، فأدخل السعر المتفق عليه لكل عرض.</td></tr>}
                {quotes.map(q => (
                  <tr key={q.id}>
                    <td dir="ltr" style={{ textAlign: 'right' }}>{q.number}</td>
                    <td><b>{q.customer_name}</b><div style={{ color: 'var(--ink-3)', fontSize: 12 }}>{q.lines.map(l => l.name).join('، ') || '—'} · {dateShort(q.created_at)}</div></td>
                    <td>{nf(q.net_total)}</td><td>{nf(q.tax_total)}</td><td><b>{nf(q.grand_total)}</b></td>
                    <td><span className={`mc-st ${Q_STATUS[q.status]?.cls}`}>{Q_STATUS[q.status]?.label}</span>{q.snapshot && (q.snapshot as { exception?: string | null }).exception && <div style={{ color: 'var(--amber-ink)', fontSize: 11.5 }}>باستثناء معتمد</div>}</td>
                    <td><span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {q.status === 'draft' && <button className="mc-btn2 p" onClick={() => tryApprove(q)}>اعتماد</button>}
                      {q.status === 'approved' && <button className="mc-btn2" onClick={() => move(q, 'sent')}>سجّلت الإرسال</button>}
                      {['approved', 'sent'].includes(q.status) && <><button className="mc-btn2 p" onClick={() => move(q, 'accepted')}>قَبِله العميل</button><button className="mc-btn2" onClick={() => move(q, 'rejected')}>رفض</button></>}
                      {q.status === 'accepted' && <><button className="mc-btn2" onClick={() => makeContract(q)}>إنشاء عقد</button><button className="mc-btn2 p" onClick={() => makeInvoice(q)}>إصدار فاتورة</button></>}
                    </span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'contracts' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="mc-tbl">
              <thead><tr><th>الرقم</th><th>العميل</th><th>الحالة</th><th>البداية</th><th>المدة (شهر)</th><th>التجديد</th><th /></tr></thead>
              <tbody>
                {contracts.length === 0 && <tr><td colSpan={7} className="mc-flat">لا توجد عقود. تُنشأ من عرض قَبِله العميل، وشروطها مجمدة وقت الإنشاء.</td></tr>}
                {contracts.map(c => (
                  <tr key={c.id}>
                    <td dir="ltr" style={{ textAlign: 'right' }}>{c.number}</td><td><b>{c.customer_name}</b></td><td>{C_STATUS[c.status]}</td>
                    <td><input type="date" aria-label="بداية العقد" defaultValue={c.starts_at ?? ''} onBlur={e => { if (e.target.value !== (c.starts_at ?? '')) setContract(c, { starts_at: e.target.value || null, renews_at: e.target.value && c.term_months ? plusMonths(e.target.value, c.term_months) : null }) }} style={{ height: 36, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--fill)', color: 'var(--ink)', padding: '0 8px' }} /></td>
                    <td><input type="number" min={1} aria-label="مدة العقد بالأشهر" defaultValue={c.term_months ?? ''} onBlur={e => { const m = Number(e.target.value) || null; if (m !== c.term_months) setContract(c, { term_months: m, renews_at: c.starts_at && m ? plusMonths(c.starts_at, m) : null }) }} style={{ width: 80, height: 36, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--fill)', color: 'var(--ink)', padding: '0 8px' }} /></td>
                    <td>{c.renews_at ? dateShort(c.renews_at) : '—'}</td>
                    <td><span style={{ display: 'flex', gap: 6 }}>
                      {c.status === 'draft' && <button className="mc-btn2 p" onClick={() => setContract(c, { status: 'signed', signed_at: new Date().toISOString() } as Partial<Contract>)}>تم التوقيع</button>}
                      {c.status === 'signed' && <button className="mc-btn2 p" onClick={() => setContract(c, { status: 'active' })}>تفعيل</button>}
                    </span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'invoices' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="mc-tbl">
              <thead><tr><th>الرقم</th><th>العميل</th><th>الإجمالي</th><th>المدفوع</th><th>المسترجع</th><th>المتبقي</th><th>الاستحقاق</th><th>الحالة</th><th /></tr></thead>
              <tbody>
                {invoices.length === 0 && <tr><td colSpan={9} className="mc-flat">لا توجد فواتير. تُصدر من عرض قَبِله العميل.</td></tr>}
                {invoices.map(b => {
                  const st = invoiceState(b)
                  return (
                    <tr key={b.invoice_id}>
                      <td dir="ltr" style={{ textAlign: 'right' }}>{b.number}</td><td><b>{b.customer_name}</b></td><td>{nf(b.grand_total)}</td><td>{nf(b.paid)}</td><td>{nf(b.refunded)}</td>
                      <td><b>{sar(Math.max(0, b.grand_total - (b.paid - b.refunded)))}</b></td><td>{b.due_at ? dateShort(b.due_at) : '—'}</td>
                      <td><span className={`mc-st ${st.cls}`}>{st.label}</span></td>
                      <td><span style={{ display: 'flex', gap: 6 }}>
                        {b.status !== 'void' && <button className="mc-btn2 p" onClick={() => navigate(`/admin/finance?invoice=${b.invoice_id}`)}>تسجيل دفعة</button>}
                        {b.status !== 'void' && b.paid === 0 && <button className="mc-btn2" onClick={() => voidInvoice(b)}>إلغاء</button>}
                      </span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {adding && (
        <div className="mc-modal-bg" onClick={() => setAdding(false)}>
          <div className="mc-modal" onClick={e => e.stopPropagation()}>
            <h3>عرض سعر جديد</h3>
            <label className="mc-field">الصفقة (اختياري)<select value={form.deal_id} onChange={e => pickDeal(e.target.value)}><option value="">بدون صفقة</option>{deals.map(d => <option key={d.id} value={d.id}>{d.company_name}</option>)}</select></label>
            <label className="mc-field">العميل<input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} /></label>
            <label className="mc-field">الباقة (اختياري)<select value={form.package_id} onChange={e => pickPackage(e.target.value)}><option value="">بدون باقة</option>{packages.map(p => <option key={p.id} value={p.id}>{p.name}{prices.some(x => x.package_id === p.id) ? '' : ' — بلا سعر معتمد'}</option>)}</select></label>
            <div className="mc-field">الخدمات
              <div className="mc-chips">{services.map(s => (
                <button key={s.id} type="button" className={`mc-chipbtn ${form.codes.includes(s.code) ? 'mc-on' : ''}`} onClick={() => setForm(f => ({ ...f, codes: f.codes.includes(s.code) ? f.codes.filter(c => c !== s.code) : [...f.codes, s.code] }))}>{s.name}</button>
              ))}</div>
            </div>
            <div className="mc-grid2">
              <label className="mc-field">رسوم التأسيس (صافي)<input type="number" min={0} value={form.setup_net} onChange={e => setForm({ ...form, setup_net: e.target.value })} /></label>
              <label className="mc-field">الاشتراك الشهري (صافي)<input type="number" min={0} value={form.monthly_net} onChange={e => setForm({ ...form, monthly_net: e.target.value })} /></label>
            </div>
            <div className="mc-grid2">
              <label className="mc-field">الخصم %<input type="number" min={0} max={100} value={form.discount_pct} onChange={e => setForm({ ...form, discount_pct: e.target.value })} /></label>
              <label className="mc-field">مدة التنفيذ (أيام)<input type="number" min={1} value={form.delivery_days} onChange={e => setForm({ ...form, delivery_days: e.target.value })} /></label>
            </div>
            <div className="mc-delta">الفاتورة الأولى (تأسيس + أول شهر): الصافي {sar(totals.net_total)} · الضريبة {vat}% {sar(totals.tax_total)} · الإجمالي {sar(totals.grand_total)}</div>
            <label className="mc-field">نطاق العمل والمخرجات<textarea value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value })} /></label>
            <label className="mc-field">شروط الدفع<input value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })} /></label>
            <label className="mc-field">صالح حتى<input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} /></label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="mc-btn2" onClick={() => setAdding(false)}>إلغاء</button>
              <button className="mc-btn2 p" disabled={!form.customer_name.trim() || totals.grand_total <= 0} onClick={saveQuote}>حفظ كمسودة</button>
            </div>
          </div>
        </div>
      )}

      {exceptionFor && (
        <div className="mc-modal-bg" onClick={() => setExceptionFor(null)}>
          <div className="mc-modal" onClick={e => e.stopPropagation()}>
            <h3>استثناء يحتاج اعتمادك</h3>
            <ul style={{ margin: 0, paddingInlineStart: 18, color: 'var(--ink-2)', fontSize: 13.5 }}>{quoteExceptions(exceptionFor, limitsFor(exceptionFor)).map(x => <li key={x}>{x}</li>)}</ul>
            <label className="mc-field">سبب الاستثناء (يُسجل في التدقيق)<textarea value={reason} onChange={e => setReason(e.target.value)} /></label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="mc-btn2" onClick={() => setExceptionFor(null)}>إلغاء</button>
              <button className="mc-btn2 p" disabled={!reason.trim()} onClick={() => approve(exceptionFor, reason.trim())}>اعتماد بالاستثناء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
