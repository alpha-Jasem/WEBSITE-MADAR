import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Search, Plus, X, User, RefreshCw, Trash2, ShoppingCart, Loader2, Receipt, Copy, FileDown, Printer } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { calcVAT } from '../../../lib/vatUtils'
import { useClientCompany } from '../../../hooks/useClientCompany'
import type { CWService, CWWorker } from '../../../types'
import { logAudit } from '../../../lib/auditLog'
import { downloadCSV, formatDateForCSV } from '../../../lib/exportUtils'
import { CarWashInvoicePrint, type InvoiceData } from './CarWashInvoicePrint'
import { CarWashDailyClosing } from './CarWashDailyClosing'
import { sendCWInvoice } from '../../../lib/n8nCarWash'

type POSTab = 'pos' | 'invoices' | 'closing'
type PM    = 'cash' | 'mada' | 'visa'

interface CartItem { id: string; name: string; price: number; qty: number }
interface Customer { id: string; name: string; phone: string; plate?: string | null }

const PM_CFG: { key: PM; label: string }[] = [
  { key: 'cash', label: 'نقد'  },
  { key: 'mada', label: 'مدى'  },
  { key: 'visa', label: 'فيزا' },
]
const PAYMENT_LABELS: Record<string, string> = {
  cash: 'نقد', mada: 'مدى', card: 'مدى', visa: 'فيزا', transfer: 'تحويل',
}

const VAT_RATE = 0.15

/* ─── helpers ─── */
const actionBtn = (active?: boolean) => ({
  display: 'flex' as const, alignItems: 'center' as const, gap: 5,
  padding: '6px 12px', borderRadius: 8,
  border: `1px solid ${active ? '#0EA5A5' : '#E5E7EB'}`,
  background: active ? '#F0FAFA' : '#F9FAFB',
  color: active ? '#0EA5A5' : '#374151',
  fontSize: 12, fontFamily: 'Cairo, sans-serif', fontWeight: 700,
  cursor: 'pointer' as const, whiteSpace: 'nowrap' as const,
})
const iconBtn = () => ({
  width: 34, height: 34, borderRadius: 8,
  border: '1px solid #E5E7EB', background: '#F9FAFB',
  cursor: 'pointer' as const, display: 'flex' as const,
  alignItems: 'center' as const, justifyContent: 'center' as const, color: '#9CA3AF',
})

export function CarWashPOS() {
  const { companyId, company } = useClientCompany()

  /* ── tab ── */
  const [posTab, setPosTab] = useState<POSTab>('pos')

  /* ── data ── */
  const [services,  setServices]  = useState<CWService[]>([])
  const [workers,   setWorkers]   = useState<CWWorker[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [invoices,  setInvoices]  = useState<any[]>([])
  const [invLoading, setInvLoading] = useState(false)

  /* ── cart ── */
  const [cart,     setCart]     = useState<CartItem[]>([])
  const [search,   setSearch]   = useState('')
  const [pm,       setPm]       = useState<PM>('cash')
  const [discount, setDiscount] = useState('')
  const [notes,    setNotes]    = useState('')
  const [plate,    setPlate]    = useState('')
  const [customer,  setCustomer]  = useState<Customer | null>(null)
  const [workerId,  setWorkerId]  = useState('')
  const [saving,    setSaving]    = useState(false)

  /* ── invoice modal ── */
  const [invoiceData,     setInvoiceData]     = useState<InvoiceData | null>(null)
  const [listInvoiceData, setListInvoiceData] = useState<InvoiceData | null>(null)

  /* ── invoice list filters ── */
  const [invSearch,    setInvSearch]    = useState('')
  const [invPayFilter, setInvPayFilter] = useState('all')

  /* ── customer picker ── */
  const [showCust,    setShowCust]    = useState(false)
  const [custSearch,  setCustSearch]  = useState('')
  const [showNewCust, setShowNewCust] = useState(false)
  const [newCust,     setNewCust]     = useState({ name: '', phone: '' })
  const [savingCust,  setSavingCust]  = useState(false)
  const custDropRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!showCust) return
    const handler = (e: MouseEvent) => {
      if (custDropRef.current && !custDropRef.current.contains(e.target as Node)) {
        setShowCust(false); setShowNewCust(false); setCustSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showCust])

  /* ── load base data ── */
  useEffect(() => {
    if (!companyId) return
    supabase.from('cw_services').select('*').eq('company_id', companyId).eq('active', true).order('name')
      .then(({ data }) => setServices((data || []) as CWService[]))
    supabase.from('cw_workers').select('*').eq('company_id', companyId).eq('active', true).order('name')
      .then(({ data }) => setWorkers((data || []) as CWWorker[]))
    supabase.from('cw_customers').select('id,name,phone,plate').eq('company_id', companyId)
      .order('last_visit_at', { ascending: false }).limit(300)
      .then(({ data }) => setCustomers((data || []) as Customer[]))
  }, [companyId])

  /* ── load invoices when tab opens ── */
  const loadInvoices = useCallback(async () => {
    if (!companyId) return
    setInvLoading(true)
    const since = new Date(); since.setDate(since.getDate() - 30)
    const { data } = await supabase.from('cw_visits')
      .select('id,customer_name,service_name,payment_method,total_amount,subtotal,vat_amount,created_at,plate,phone')
      .eq('company_id', companyId).gte('created_at', since.toISOString())
      .order('created_at', { ascending: false }).limit(200)
    setInvoices(data || [])
    setInvLoading(false)
  }, [companyId])

  useEffect(() => { if (posTab === 'invoices') loadInvoices() }, [posTab, loadInvoices])

  /* ── calculations (prices include VAT — extract, don't add) ── */
  const gross = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const disc  = Math.min(Math.max(0, Number(discount) || 0), gross)
  const grossAfterDisc = gross - disc
  const { subtotal: net, vat_amount: vat, total_amount: total } =
    calcVAT(grossAfterDisc, company?.tax_enabled ?? true, company?.vat_rate || 15, company?.price_includes_vat !== false)

  const filtered  = useMemo(() => services.filter(s => s.name.includes(search)), [services, search])
  const filtCusts = useMemo(() => customers.filter(c =>
    c.name.includes(custSearch) || c.phone.includes(custSearch) || (c.plate || '').includes(custSearch)
  ), [customers, custSearch])
  const filteredInvoices = useMemo(() => invoices.filter((inv: any) => {
    const q = invSearch.trim().toLowerCase()
    const invNo = `INV-${new Date(inv.created_at).toISOString().slice(0,10).replace(/-/g,'')}-${inv.id.slice(0,6).toUpperCase()}`
    const matchSearch = !q || [invNo, inv.customer_name, inv.phone, inv.service_name].some(v => String(v || '').toLowerCase().includes(q))
    const matchPay = invPayFilter === 'all' || (inv.payment_method || 'cash') === invPayFilter
    return matchSearch && matchPay
  }), [invoices, invSearch, invPayFilter])
  const invoicePayMethods = useMemo(() => Array.from(new Set(invoices.map((inv: any) => inv.payment_method || 'cash'))), [invoices])

  /* ── cart ops ── */
  const addItem    = (s: CWService) => setCart(p => {
    const e = p.find(i => i.id === s.id)
    return e ? p.map(i => i.id === s.id ? { ...i, qty: i.qty + 1 } : i)
             : [...p, { id: s.id, name: s.name, price: s.price, qty: 1 }]
  })
  const removeItem = (id: string) => setCart(p => p.filter(i => i.id !== id))
  const changeQty  = (id: string, d: number) => setCart(p =>
    p.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + d) } : i)
  )
  const clearCart = () => {
    setCart([]); setDiscount(''); setNotes('')
    setPlate(''); setCustomer(null); setWorkerId('')
  }

  /* ── pay ── */
  const pay = async () => {
    if (!companyId || cart.length === 0) return
    setSaving(true)
    const svcName = cart.map(i => i.qty > 1 ? `${i.name} ×${i.qty}` : i.name).join(' + ')
    const today = new Date()
    const { data, error } = await supabase.from('cw_visits').insert({
      company_id: companyId, customer_id: customer?.id || null,
      customer_name: customer?.name || null, phone: customer?.phone || null,
      plate: plate || customer?.plate || null, service_name: svcName,
      price: total, subtotal: net, vat_amount: vat, total_amount: total,
      discount_amount: disc || null, payment_method: pm,
      payment_status: 'paid', is_free_wash: false,
      worker_id: workerId || null,
      notes: notes || null,
    }).select().single()
    setSaving(false)
    if (error || !data) return
    logAudit(companyId, 'pos_sale', { entityType: 'cw_visits', entityId: (data as any).id, newValue: { total, svcName } })

    const visitId = (data as any).id as string
    const invNo = `INV-${today.toISOString().slice(0,10).replace(/-/g,'')}-${visitId.slice(0,6).toUpperCase()}`

    const inv: InvoiceData = {
      visitId,
      invoiceNo: invNo,
      items: [...cart],
      customerName: customer?.name || null,
      customerPhone: customer?.phone || null,
      plate: plate || customer?.plate || null,
      subtotal: net,
      vatAmount: vat,
      total,
      discount: disc,
      paymentMethod: pm,
      date: today.toISOString(),
    }
    setInvoiceData(inv)

    // Fire n8n invoice webhook (only if customer has a phone)
    if (customer?.phone) {
      sendCWInvoice({
        phone: customer.phone,
        customer_name: customer.name,
        company_name: company?.name || '',
        company_id: companyId,
        invoice_no: invNo,
        services: svcName,
        subtotal: net.toFixed(2),
        vat: vat.toFixed(2),
        total: total.toFixed(2),
        payment_method: pm,
        date: today.toISOString().slice(0, 10),
        plate: plate || customer?.plate || null,
      })
    }
  }

  const handleInvoiceClose = () => {
    setInvoiceData(null)
    clearCart()
  }

  const buildInvoiceFromVisit = (inv: any): InvoiceData => {
    const invNo = `INV-${new Date(inv.created_at).toISOString().slice(0,10).replace(/-/g,'')}-${inv.id.slice(0,6).toUpperCase()}`
    const total = Number(inv.total_amount || inv.price || 0)
    return {
      visitId: inv.id,
      invoiceNo: invNo,
      items: [{ id: inv.id, name: inv.service_name || 'خدمة', price: total, qty: 1 }],
      customerName: inv.customer_name || null,
      customerPhone: inv.phone || null,
      plate: inv.plate || null,
      subtotal: Number(inv.subtotal || (total / 1.15)),
      vatAmount: Number(inv.vat_amount || (total - total / 1.15)),
      total,
      discount: Number(inv.discount_amount || 0),
      paymentMethod: inv.payment_method || 'cash',
      date: inv.created_at,
    }
  }

  const exportInvoicesCSV = () => {
    const today = new Date().toISOString().slice(0, 10)
    const rows = filteredInvoices.map((inv: any) => ({
      'رقم الفاتورة': buildInvoiceFromVisit(inv).invoiceNo,
      'العميل':       inv.customer_name || '—',
      'الجوال':       inv.phone || '—',
      'الخدمة':       inv.service_name || '',
      'طريقة الدفع':  PAYMENT_LABELS[inv.payment_method] || inv.payment_method || 'كاش',
      'قبل الضريبة':  Number(inv.subtotal || 0).toFixed(2),
      'VAT':           Number(inv.vat_amount || 0).toFixed(2),
      'الإجمالي':     Number(inv.total_amount || inv.price || 0).toFixed(2),
      'التاريخ':       formatDateForCSV(inv.created_at),
    }))
    downloadCSV(rows, `madar-invoices-${today}.csv`)
  }

  /* ── add customer ── */
  const addNewCustomer = async () => {
    if (!companyId || !newCust.name.trim() || !newCust.phone.trim()) return
    setSavingCust(true)
    const { data } = await supabase.from('cw_customers').insert({
      company_id: companyId, name: newCust.name.trim(), phone: newCust.phone.trim(),
    }).select().single()
    setSavingCust(false)
    if (data) {
      const c = data as Customer
      setCustomers(p => [c, ...p]); setCustomer(c)
      setShowNewCust(false); setShowCust(false); setNewCust({ name: '', phone: '' })
    }
  }

  const closeCust = () => { setShowCust(false); setShowNewCust(false); setCustSearch('') }

  /* ── invoice copy ── */
  const copyInv = (inv: any) => {
    const txt = [
      `الفاتورة: ${inv.id?.slice(0, 8)}`,
      `العميل: ${inv.customer_name || '—'}`,
      `الخدمة: ${inv.service_name}`,
      `الإجمالي: ${Number(inv.total_amount || inv.price || 0).toFixed(2)} ر.س`,
    ].join('\n')
    navigator.clipboard?.writeText(txt)
  }

  /* ─────────────────────────────────────────────────────────────── */
  return (
    <div
      dir="rtl"
      style={{
        display: 'flex', flexDirection: 'column',
        height: 'calc(100vh - 170px)', minHeight: 620,
        background: '#F3F4F6', borderRadius: 12,
        overflow: 'hidden', border: '1px solid #E5E7EB',
      }}
    >
      <style>{`
        @media (max-width: 640px) {
          .cw-pos-body { flex-direction: column !important; }
          .cw-pos-cart { width: 100% !important; height: auto !important; flex-shrink: 1 !important; border-left: none !important; border-bottom: 1px solid #E5E7EB !important; max-height: 300px !important; }
          .cw-pos-services { flex: 1 !important; min-height: 0 !important; }
        }
      `}</style>

      {/* ── Main Tabs ── */}
      <div style={{ display: 'flex', background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', paddingRight: 4 }}>
        {([
          { key: 'pos',      label: 'شاشة البيع' },
          { key: 'invoices', label: 'قائمة الفواتير' },
          { key: 'closing',  label: 'إغلاق اليوم' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setPosTab(t.key)}
            style={{
              padding: '13px 20px', border: 'none', background: 'transparent', cursor: 'pointer',
              borderBottom: posTab === t.key ? '2px solid #0EA5A5' : '2px solid transparent',
              color: posTab === t.key ? '#0EA5A5' : '#6B7280',
              fontSize: 13, fontWeight: 700, fontFamily: 'Cairo, sans-serif', marginBottom: -1,
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* ════════════════ POS TAB ════════════════ */}
      {posTab === 'pos' && <>

        {/* Action bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', padding: '7px 14px', gap: 8 }}>
          <button style={iconBtn()} onClick={clearCart} title="مسح السلة"><Trash2 size={14} /></button>
          {workers.length > 0 && (
            <select
              value={workerId}
              onChange={e => setWorkerId(e.target.value)}
              style={{
                padding: '6px 10px', borderRadius: 8, fontSize: 12,
                fontFamily: 'Cairo, sans-serif', fontWeight: 700, cursor: 'pointer',
                border: `1px solid ${workerId ? '#0EA5A5' : '#E5E7EB'}`,
                background: workerId ? '#F0FAFA' : '#F9FAFB',
                color: workerId ? '#0EA5A5' : '#374151', outline: 'none',
              }}
            >
              <option value="">الموظف</option>
              {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          )}
          <div ref={custDropRef} style={{ position: 'relative' }}>
            <button style={actionBtn(!!customer)} onClick={() => setShowCust(v => !v)}>
              <User size={13} />{customer ? customer.name : 'العميل'}
              {customer && (
                <span
                  onClick={e => { e.stopPropagation(); setCustomer(null); setPlate('') }}
                  style={{ marginRight: 2, fontSize: 11, opacity: 0.6 }}
                >✕</span>
              )}
            </button>

            {/* ── Customer picker popover ── */}
            {showCust && !showNewCust && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 9999, width: 420, background: '#FFF', borderRadius: 14, boxShadow: '0 8px 40px rgba(0,0,0,0.18)', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                {/* Search row */}
                <div style={{ display: 'flex', gap: 8, padding: '10px 10px 8px', borderBottom: '1px solid #F0F0F0' }}>
                  <button onClick={() => setShowNewCust(true)}
                    style={{ width: 44, height: 44, borderRadius: 10, border: 'none', background: '#0EA5E9', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Plus size={22} />
                  </button>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                    <input autoFocus value={custSearch} onChange={e => setCustSearch(e.target.value)}
                      placeholder="اسم العميل أو رقم هاتفه أو رمزه"
                      style={{ width: '100%', height: 44, padding: '0 36px 0 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', padding: '5px 14px', background: '#F8FAFC', borderBottom: '1px solid #F0F0F0' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', fontFamily: 'Tajawal, sans-serif' }}>الإسم / الكود</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', fontFamily: 'Tajawal, sans-serif' }}>رقم الهاتف</span>
                </div>
                {/* Customer rows */}
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                  {filtCusts.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF', fontFamily: 'Tajawal, sans-serif', fontSize: 13 }}>
                      لا يوجد عملاء — اضغط + لإضافة جديد
                    </div>
                  ) : filtCusts.map(c => (
                    <button key={c.id} onClick={() => { setCustomer(c); if (c.plate) setPlate(c.plate); closeCust() }}
                      style={{ width: '100%', padding: '9px 14px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', border: 'none', borderBottom: '1px solid #F9FAFB', background: 'transparent', cursor: 'pointer', textAlign: 'right' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#111827', fontFamily: 'Tajawal, sans-serif' }}>{c.name}</p>
                        {c.plate && <p style={{ margin: '1px 0 0', fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>{c.plate}</p>}
                      </div>
                      <span style={{ fontSize: 12.5, color: '#6B7280', fontFamily: 'monospace', direction: 'ltr', whiteSpace: 'nowrap' }}>{c.phone}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── New customer form popover ── */}
            {showCust && showNewCust && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 9999, width: 360, background: '#FFF', borderRadius: 14, boxShadow: '0 8px 40px rgba(0,0,0,0.18)', border: '1px solid #E5E7EB', padding: '16px 18px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900, fontFamily: 'Cairo, sans-serif', color: '#111827' }}>إضافة عميل جديد</h3>
                  <button onClick={() => setShowNewCust(false)} style={iconBtn()}><X size={14} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#6B7280', fontFamily: 'Tajawal, sans-serif', marginBottom: 4 }}>اسم العميل *</label>
                    <input autoFocus value={newCust.name} onChange={e => setNewCust(p => ({ ...p, name: e.target.value }))} dir="rtl"
                      style={{ width: '100%', padding: '8px 11px', borderRadius: 9, border: '1px solid #E5E7EB', fontSize: 12.5, fontFamily: 'Tajawal, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#6B7280', fontFamily: 'Tajawal, sans-serif', marginBottom: 4 }}>رقم الجوال *</label>
                    <div style={{ display: 'flex', gap: 7 }}>
                      <div style={{ padding: '8px 11px', borderRadius: 9, border: '1px solid #E5E7EB', background: '#F9FAFB', fontSize: 12.5, fontFamily: 'monospace', color: '#6B7280', flexShrink: 0 }}>🇸🇦 +966</div>
                      <input value={newCust.phone} onChange={e => setNewCust(p => ({ ...p, phone: e.target.value }))} dir="ltr" inputMode="numeric" placeholder="5XXXXXXXX"
                        style={{ flex: 1, padding: '8px 11px', borderRadius: 9, border: '1px solid #E5E7EB', fontSize: 12.5, fontFamily: 'monospace', outline: 'none' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 7, marginTop: 4 }}>
                    <button onClick={addNewCustomer} disabled={!newCust.name.trim() || !newCust.phone.trim() || savingCust}
                      style={{ flex: 1, padding: '10px 0', borderRadius: 9, border: 'none', background: '#0EA5A5', color: '#fff', fontSize: 13.5, fontWeight: 900, fontFamily: 'Cairo, sans-serif', cursor: 'pointer', opacity: (!newCust.name.trim() || !newCust.phone.trim()) ? 0.5 : 1 }}>
                      {savingCust ? 'جاري الحفظ...' : 'إضافة'}
                    </button>
                    <button onClick={() => setShowNewCust(false)}
                      style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#374151', fontSize: 13, fontFamily: 'Tajawal, sans-serif', cursor: 'pointer' }}>رجوع</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* POS Body */}
        <div className="cw-pos-body" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* ── LEFT: Cart ── */}
          <div className="cw-pos-cart" style={{ width: 400, flexShrink: 0, background: '#FFFFFF', borderLeft: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column' }}>

            {/* Totals summary */}
            <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid #F3F4F6' }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 800, color: '#9CA3AF', fontFamily: 'Tajawal,sans-serif' }}>ملخص الفاتورة</p>
              {cart.map(item => {
                const lineGross = item.price * item.qty
                const lineSub = company?.tax_enabled ? lineGross / 1.15 : lineGross
                return (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 12.5, fontFamily: 'Tajawal, sans-serif' }}>
                    <span style={{ fontFamily: 'monospace', color: '#374151', fontSize: 12.5 }}>{lineSub.toFixed(2)} ر.س</span>
                    <span style={{ color: '#374151', fontWeight: 700 }}>{item.qty > 1 ? `${item.name} ×${item.qty}` : item.name}</span>
                  </div>
                )
              })}
              {disc > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 12.5, fontFamily: 'Tajawal, sans-serif' }}>
                  <span style={{ fontFamily: 'monospace', color: '#EF4444', fontSize: 12.5 }}>-{disc.toFixed(2)} ر.س</span>
                  <span style={{ color: '#6B7280' }}>خصم</span>
                </div>
              )}
              {company?.tax_enabled && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 12.5, fontFamily: 'Tajawal, sans-serif' }}>
                  <span style={{ fontFamily: 'monospace', color: '#374151', fontSize: 12.5 }}>{vat.toFixed(2)} ر.س</span>
                  <span style={{ color: '#6B7280' }}>ضريبة القيمة المضافة (15%)</span>
                </div>
              )}
            </div>

            {/* Cart items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {cart.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 20 }}>
                  <ShoppingCart size={44} strokeWidth={1} style={{ color: '#D1D5DB' }} />
                </div>
              ) : cart.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 9px', borderRadius: 7, background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111827', fontFamily: 'Tajawal, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                    <p style={{ margin: 0, fontSize: 11.5, color: '#6B7280', fontFamily: 'monospace' }}>{(item.price * item.qty).toFixed(2)} ر.س</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <button onClick={() => changeQty(item.id, -1)} style={{ width: 20, height: 20, borderRadius: 4, border: '1px solid #E5E7EB', background: '#FFF', cursor: 'pointer', fontSize: 13, color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', minWidth: 16, textAlign: 'center' }}>{item.qty}</span>
                    <button onClick={() => changeQty(item.id, 1)} style={{ width: 20, height: 20, borderRadius: 4, border: '1px solid #E5E7EB', background: '#FFF', cursor: 'pointer', fontSize: 13, color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                  <button onClick={() => removeItem(item.id)} style={{ width: 20, height: 20, borderRadius: 4, border: 'none', background: '#FEF2F2', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>

            {/* Bottom controls */}
            <div style={{ borderTop: '1px solid #E5E7EB', padding: '9px 14px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>

              {/* Notes + discount */}
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', fontFamily: 'Cairo, sans-serif', flexShrink: 0 }}>إضافة</span>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات"
                  style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid #E5E7EB', fontSize: 12, fontFamily: 'Tajawal, sans-serif', outline: 'none', background: '#F9FAFB' }} />
                <input value={discount} onChange={e => setDiscount(e.target.value.replace(/[^\d.]/g, ''))} placeholder="خصم" dir="ltr" inputMode="numeric"
                  style={{ width: 78, padding: '5px 8px', borderRadius: 6, border: '1px solid #E5E7EB', fontSize: 12, fontFamily: 'monospace', outline: 'none', background: '#F9FAFB', textAlign: 'center' }} />
              </div>

              {/* Plate + payment methods */}
              <div style={{ display: 'flex', gap: 5 }}>
                <input value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} placeholder="اللوحة" dir="ltr"
                  style={{ width: 80, padding: '5px 7px', borderRadius: 6, border: '1px solid #E5E7EB', fontSize: 12, fontFamily: 'monospace', outline: 'none', background: '#F9FAFB', textAlign: 'center' }} />
                <div style={{ flex: 1, display: 'flex', gap: 4 }}>
                  {PM_CFG.map(m => (
                    <button key={m.key} onClick={() => setPm(m.key)}
                      style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: `1px solid ${pm === m.key ? '#0EA5A5' : '#E5E7EB'}`, background: pm === m.key ? '#F0FAFA' : '#F9FAFB', color: pm === m.key ? '#0EA5A5' : '#6B7280', fontSize: 11, fontFamily: 'Cairo, sans-serif', fontWeight: 700, cursor: 'pointer', transition: 'all 0.1s' }}>{m.label}</button>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '2px 0' }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: '#111827', fontFamily: 'monospace' }}>﷼ {total.toFixed(2)}</span>
                <span style={{ fontSize: 12, color: '#6B7280', fontFamily: 'Tajawal, sans-serif' }}>الإجمالي (شامل الضريبة)</span>
              </div>

              {/* Pay button */}
              <button
                onClick={pay}
                disabled={cart.length === 0 || saving}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8, border: 'none',
                  background: cart.length === 0 ? '#D1D5DB' : '#111827',
                  color: cart.length === 0 ? '#9CA3AF' : '#FFFFFF',
                  fontSize: 14, fontFamily: 'Cairo, sans-serif', fontWeight: 900,
                  cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ fontSize: 11, opacity: 0.7 }}>{cart.length} خدمة</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {saving && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                  {saving ? 'جاري...' : `دفع ﷼ ${total.toFixed(0)}`}
                </span>
              </button>
            </div>
          </div>

          {/* ── RIGHT: Services ── */}
          <div className="cw-pos-services" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Search */}
            <div style={{ padding: '11px 14px', background: '#FFFFFF', borderBottom: '1px solid #E5E7EB' }}>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="ابحث عن خدمة..."
                  style={{ width: '100%', padding: '9px 38px 9px 14px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#FFFFFF', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', color: '#111827', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                  onFocus={e => (e.target.style.borderColor = '#0EA5A5')}
                  onBlur={e  => (e.target.style.borderColor = '#E5E7EB')}
                />
              </div>
            </div>

            {/* Type bar */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 14px', background: '#FFFFFF', borderBottom: '1px solid #E5E7EB' }}>
              <button style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: '#0EA5A5', color: '#FFFFFF', fontSize: 12, fontFamily: 'Cairo, sans-serif', fontWeight: 700, cursor: 'pointer' }}>
                خدمات المغسلة
              </button>
            </div>

            {/* Grid */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
              {filtered.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', gap: 12, paddingTop: 20 }}>
                  <ShoppingCart size={52} strokeWidth={1} />
                  <p style={{ margin: 0, fontSize: 14, fontFamily: 'Tajawal, sans-serif', textAlign: 'center', lineHeight: 1.9 }}>
                    {services.length === 0
                      ? 'لا توجد خدمات مضافة\nأضفها من تبويب الخدمات والضريبة'
                      : 'لا توجد نتائج مطابقة'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 10 }}>
                  {filtered.map(s => {
                    const inCart = cart.find(i => i.id === s.id)
                    return (
                      <button key={s.id} onClick={() => addItem(s)}
                        style={{
                          padding: '14px 12px', borderRadius: 10, textAlign: 'right',
                          border: `1px solid ${inCart ? '#0EA5A5' : '#E5E7EB'}`,
                          background: inCart ? '#F0FAFA' : '#FFFFFF',
                          cursor: 'pointer', position: 'relative',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          transition: 'all 0.12s',
                        }}
                      >
                        {inCart && (
                          <div style={{ position: 'absolute', top: 8, left: 8, background: '#0EA5A5', color: '#fff', borderRadius: 999, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, fontFamily: 'monospace' }}>
                            {inCart.qty}
                          </div>
                        )}
                        <p style={{ margin: '0 0 7px', fontSize: 13, fontWeight: 700, color: '#111827', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.4 }}>{s.name}</p>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: inCart ? '#0EA5A5' : '#10B981', fontFamily: 'monospace' }}>{s.price.toFixed(2)} <span style={{ fontSize: 10, fontWeight: 400, color: '#9CA3AF', fontFamily: 'Tajawal, sans-serif' }}>ر.س</span></p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </>}

      {/* ════════════════ INVOICES TAB ════════════════ */}
      {posTab === 'invoices' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F8FAFC' }}>

          {/* Header */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #E5E7EB', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 900, fontFamily: 'Cairo, sans-serif', color: '#111827' }}>فواتير المبيعات</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280', fontFamily: 'Tajawal, sans-serif' }}>
                  سجل قابل للتدقيق لكل زيارة مسجلة — آخر 30 يوم ({invoices.length} فاتورة)
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={loadInvoices} style={{ ...actionBtn(), gap: 5 }}><RefreshCw size={13} /> تحديث</button>
                <button onClick={exportInvoicesCSV} style={{ ...actionBtn(), gap: 5 }}><FileDown size={13} /> تصدير</button>
              </div>
            </div>
            {/* Search + filter row */}
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input
                  value={invSearch}
                  onChange={e => setInvSearch(e.target.value)}
                  placeholder="البحث برقم الفاتورة أو العميل أو الجوال"
                  style={{ width: '100%', padding: '7px 30px 7px 10px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12, fontFamily: 'Tajawal, sans-serif', outline: 'none', background: '#F9FAFB', boxSizing: 'border-box' }}
                />
              </div>
              <select
                value={invPayFilter}
                onChange={e => setInvPayFilter(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12, fontFamily: 'Cairo, sans-serif', fontWeight: 700, outline: 'none', background: '#F9FAFB', color: '#374151', cursor: 'pointer' }}
              >
                <option value="all">كل طرق الدفع</option>
                {invoicePayMethods.map(m => (
                  <option key={m} value={m}>{PAYMENT_LABELS[m as string] || m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {invLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: '#9CA3AF' }}>
                <Loader2 size={20} className="animate-spin" />
                <span style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 13 }}>جاري التحميل...</span>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: '#9CA3AF' }}>
                <Receipt size={40} strokeWidth={1} />
                <p style={{ margin: 0, fontFamily: 'Tajawal, sans-serif', fontSize: 13 }}>لا توجد فواتير مطابقة</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: 820, borderCollapse: 'collapse', fontSize: 12.5, textAlign: 'right', background: '#FFFFFF' }}>
                  <thead>
                    <tr style={{ background: '#F8FBFF', borderBottom: '2px solid #E5E7EB' }}>
                      {['رقم الفاتورة', 'العميل', 'الخدمة', 'طريقة الدفع', 'قيمة الفاتورة', 'VAT', 'المدفوع', 'التاريخ', ''].map(h => (
                        <th key={h} style={{ padding: '10px 14px', fontFamily: 'Cairo, sans-serif', fontWeight: 900, color: '#475569', fontSize: 11.5, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((inv: any) => {
                      const invNo = `INV-${new Date(inv.created_at).toISOString().slice(0,10).replace(/-/g,'')}-${inv.id.slice(0,6).toUpperCase()}`
                      const total = Number(inv.total_amount || inv.price || 0)
                      const vat   = Number(inv.vat_amount || 0)
                      const pmLabel = PAYMENT_LABELS[inv.payment_method] || inv.payment_method || '—'
                      return (
                        <tr key={inv.id} style={{ borderBottom: '1px solid #F1F5F9' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11.5, fontWeight: 900, color: '#1E293B', whiteSpace: 'nowrap' }}>{invNo}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <p style={{ margin: 0, fontFamily: 'Tajawal, sans-serif', fontWeight: 700, color: '#111827', fontSize: 13 }}>{inv.customer_name || 'عميل نقدي'}</p>
                            {inv.phone && <p style={{ margin: 0, fontFamily: 'monospace', color: '#94A3B8', fontSize: 11 }} dir="ltr">{inv.phone}</p>}
                          </td>
                          <td style={{ padding: '10px 14px', fontFamily: 'Tajawal, sans-serif', color: '#374151', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.service_name || 'خدمة مغسلة'}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(11,99,246,0.08)', color: '#0B63F6', fontSize: 11, fontFamily: 'Cairo, sans-serif', fontWeight: 700, whiteSpace: 'nowrap' }}>{pmLabel}</span>
                          </td>
                          <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 900, color: '#111827', whiteSpace: 'nowrap' }}>{total.toFixed(2)} ر.س</td>
                          <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#94A3B8', whiteSpace: 'nowrap' }}>{vat.toFixed(2)} ر.س</td>
                          <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 900, color: '#059669', whiteSpace: 'nowrap' }}>{total.toFixed(2)} ر.س</td>
                          <td style={{ padding: '10px 14px', fontFamily: 'Tajawal, sans-serif', color: '#94A3B8', fontSize: 11.5, whiteSpace: 'nowrap' }}>{formatDateForCSV(inv.created_at)}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                onClick={() => setListInvoiceData(buildInvoiceFromVisit(inv))}
                                title="طباعة الفاتورة"
                                style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #E5E7EB', background: '#F0FAFA', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0EA5A5' }}
                              >
                                <Printer size={13} />
                              </button>
                              <button
                                onClick={() => copyInv(inv)}
                                title="نسخ"
                                style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #E5E7EB', background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {filteredInvoices.length > 0 && (
              <p style={{ padding: '8px 16px', fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', textAlign: 'center' }}>
                {filteredInvoices.length} فاتورة
              </p>
            )}
          </div>
        </div>
      )}

      {/* ════════════════ DAILY CLOSING TAB ════════════════ */}
      {posTab === 'closing' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          <CarWashDailyClosing />
        </div>
      )}

      {/* ════════════════ LIST INVOICE PRINT ════════════════ */}
      {listInvoiceData && company && (
        <CarWashInvoicePrint
          data={listInvoiceData}
          company={{
            name: company.name,
            owner_name: company.owner_name,
            owner_phone: company.owner_phone,
            vat_number: (company as any).vat_number || null,
            commercial_reg: (company as any).commercial_reg || null,
            address: (company as any).address || null,
            logo_url: (company as any).logo_url || null,
            tax_enabled: company.tax_enabled,
            print_footer: (company as any).cw_automations?.print_settings?.footer || null,
          }}
          onClose={() => setListInvoiceData(null)}
        />
      )}

      {/* ════════════════ INVOICE MODAL ════════════════ */}
      {invoiceData && company && (
        <CarWashInvoicePrint
          data={invoiceData}
          company={{
            name: company.name,
            owner_name: company.owner_name,
            owner_phone: company.owner_phone,
            vat_number: (company as any).vat_number || null,
            commercial_reg: (company as any).commercial_reg || null,
            address: (company as any).address || null,
            logo_url: (company as any).logo_url || null,
            tax_enabled: company.tax_enabled,
            print_footer: (company as any).cw_automations?.print_settings?.footer || null,
          }}
          onClose={handleInvoiceClose}
        />
      )}
    </div>
  )
}
