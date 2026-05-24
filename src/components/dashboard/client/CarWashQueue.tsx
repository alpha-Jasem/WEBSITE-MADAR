import { useEffect, useState, useRef } from 'react'
import { Plus, X, Loader2, Clock, ChevronRight, Car, Pencil, Check, Gift, ChevronDown, ChevronUp, Receipt } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { calcVAT } from '../../../lib/vatUtils'
import { logAudit } from '../../../lib/auditLog'
import type { CWQueueItem, CWWorker, CWService, QueueStatus, PaymentMethod } from '../../../types'
import { CarWashReceipt } from './CarWashReceipt'

const N8N_READY_WEBHOOK     = 'https://keepcalm.app.n8n.cloud/webhook/cw-car-ready'
const N8N_DELIVERY_WEBHOOK  = 'https://keepcalm.app.n8n.cloud/webhook/cw-delivery-receipt'
const N8N_LOYALTY_WEBHOOK   = 'https://keepcalm.app.n8n.cloud/webhook/cw-loyalty-milestone'

const COLUMNS: { status: QueueStatus; label: string; color: string; bg: string }[] = [
  { status: 'received',  label: 'استلام',  color: '#94A3B8', bg: 'rgba(148,163,184,0.1)' },
  { status: 'washing',   label: 'غسيل',    color: '#4F6EF7', bg: 'rgba(79,110,247,0.1)'  },
  { status: 'drying',    label: 'تجفيف',   color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)'  },
  { status: 'ready',     label: 'جاهزة',   color: '#10B981', bg: 'rgba(16,185,129,0.1)'  },
  { status: 'delivered', label: 'تسليم',   color: '#F59E0B', bg: 'rgba(245,158,11,0.1)'  },
]

const NEXT_STATUS: Partial<Record<QueueStatus, QueueStatus>> = {
  received: 'washing',
  washing: 'drying',
  drying: 'ready',
  ready: 'delivered',
}

const PAYMENT_BUTTONS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'كاش' },
  { value: 'mada', label: 'مدى' },
  { value: 'visa', label: 'فيزا' },
  { value: 'bank_transfer', label: 'تحويل' },
  { value: 'stc_pay', label: 'STC Pay' },
  { value: 'other', label: 'أخرى' },
]

function elapsed(created_at: string) {
  const mins = Math.floor((Date.now() - new Date(created_at).getTime()) / 60000)
  if (mins < 60) return `${mins}د`
  return `${Math.floor(mins / 60)}س ${mins % 60}د`
}

const EMPTY_FORM = {
  customer_name: '',
  phone: '',
  car_type: '',
  plate: '',
  service_id: '',
  service_name: '',
  price: '',
  worker_id: '',
  notes: '',
  payment_method: 'cash' as PaymentMethod,
  is_free_wash: false,
}

interface LoyaltyInfo {
  customerId: string
  free_washes_available: number
  loyalty_count: number
  total_visits: number
}

export const CarWashQueue = () => {
  const { companyId, company, loading: authLoading } = useClientCompany()
  const [items, setItems] = useState<CWQueueItem[]>([])
  const [workers, setWorkers] = useState<CWWorker[]>([])
  const [services, setServices] = useState<CWService[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<CWQueueItem | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [loyaltyInfo, setLoyaltyInfo] = useState<LoyaltyInfo | null>(null)
  const [loyaltyLoading, setLoyaltyLoading] = useState(false)
  const [deliverModal, setDeliverModal] = useState<CWQueueItem | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('cash')
  const [delivering, setDelivering] = useState(false)
  const [receiptItem, setReceiptItem] = useState<CWQueueItem | null>(null)
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelled, setShowCancelled] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const loadItems = async (cid: string) => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('cw_queue')
      .select('*, worker:cw_workers(id, name, commission_type, commission_value)')
      .eq('company_id', cid)
      .neq('status', 'delivered')
      .gte('created_at', todayStart.toISOString())
      .order('created_at')
    setItems((data as CWQueueItem[]) || [])
  }

  useEffect(() => {
    if (authLoading || !companyId) return
    const cid = companyId

    const init = async () => {
      setLoading(true)
      const [, { data: w }, { data: svcs }] = await Promise.all([
        loadItems(cid),
        supabase.from('cw_workers').select('*').eq('company_id', cid).eq('active', true).order('name'),
        supabase.from('cw_services').select('*').eq('company_id', cid).eq('active', true).order('created_at'),
      ])
      setWorkers((w || []) as CWWorker[])
      setServices((svcs || []) as CWService[])
      setLoading(false)
    }
    init()

    channelRef.current = supabase
      .channel(`queue-${cid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cw_queue', filter: `company_id=eq.${cid}` }, () => loadItems(cid))
      .subscribe()

    return () => { channelRef.current?.unsubscribe() }
  }, [authLoading, companyId])

  const lookupPhone = async (phone: string) => {
    if (!companyId || phone.length < 9) return
    setLoyaltyLoading(true)
    const normalized = phone.replace(/\D/g, '').replace(/^966/, '0')
    const { data } = await supabase
      .from('cw_customers')
      .select('id, free_washes_available, loyalty_count, total_visits')
      .eq('company_id', companyId)
      .eq('phone', normalized)
      .maybeSingle()
    setLoyaltyLoading(false)
    if (data) {
      setLoyaltyInfo({
        customerId: data.id,
        free_washes_available: data.free_washes_available || 0,
        loyalty_count: data.loyalty_count || 0,
        total_visits: data.total_visits || 0,
      })
    } else {
      setLoyaltyInfo(null)
    }
  }

  const openAdd = () => {
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setLoyaltyInfo(null)
    setShowForm(true)
  }

  const openEdit = (item: CWQueueItem) => {
    setEditingItem(item)
    setForm({
      customer_name: item.customer_name,
      phone: item.phone || '',
      car_type: item.car_type || '',
      plate: item.plate || '',
      service_id: item.service_id || '',
      service_name: item.service_name || '',
      price: item.price > 0 ? String(item.price) : '',
      worker_id: item.worker_id || '',
      notes: item.notes || '',
      payment_method: item.payment_method || 'cash',
      is_free_wash: item.is_free_wash || false,
    })
    setLoyaltyInfo(null)
    setShowForm(true)
  }

  const saveForm = async () => {
    if (!companyId || !form.customer_name.trim()) return
    setSaving(true)
    const price = Number(form.price) || 0

    const payload = {
      customer_name: form.customer_name.trim(),
      phone: form.phone || null,
      car_type: form.car_type || null,
      plate: form.plate || null,
      service_id: form.service_id || null,
      service_name: form.service_name || null,
      price: form.is_free_wash ? 0 : price,
      original_price: form.is_free_wash ? price : null,
      discount_amount: form.is_free_wash ? price : 0,
      is_free_wash: form.is_free_wash,
      worker_id: form.worker_id || null,
      notes: form.notes || null,
    }

    if (editingItem) {
      const oldPrice = editingItem.price
      await supabase.from('cw_queue').update(payload).eq('id', editingItem.id)
      if (oldPrice !== (form.is_free_wash ? 0 : price)) {
        logAudit(companyId, 'price_edited', {
          entityType: 'cw_queue',
          entityId: editingItem.id,
          oldValue: { price: oldPrice },
          newValue: { price: form.is_free_wash ? 0 : price },
        })
      } else {
        logAudit(companyId, 'car_updated', { entityType: 'cw_queue', entityId: editingItem.id })
      }
    } else {
      const { data: inserted } = await supabase.from('cw_queue').insert({
        company_id: companyId,
        ...payload,
        status: 'received',
        payment_status: 'unpaid',
      }).select().single()
      if (inserted) logAudit(companyId, 'car_created', { entityType: 'cw_queue', entityId: inserted.id })
    }

    setForm(EMPTY_FORM)
    setShowForm(false)
    setEditingItem(null)
    setLoyaltyInfo(null)
    setSaving(false)
  }

  const moveNext = async (item: CWQueueItem) => {
    const next = NEXT_STATUS[item.status]
    if (!next) return

    if (next === 'delivered') {
      setDeliverModal(item)
      setSelectedPayment('cash')
      return
    }

    setMovingId(item.id)
    const updates: Record<string, unknown> = { status: next }
    if (item.status === 'washing' && !item.started_at) updates.started_at = new Date().toISOString()
    await supabase.from('cw_queue').update(updates).eq('id', item.id)

    if (next === 'ready' && item.phone) {
      const phone = item.phone.replace(/^0/, '966').replace(/\D/g, '')
      fetch(N8N_READY_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, customer_name: item.customer_name, company_name: company?.name || 'المغسلة' }),
      }).catch(() => {})
    }
    setMovingId(null)
  }

  const confirmDelivery = async () => {
    if (!deliverModal || !companyId || delivering) return
    setDelivering(true)
    const item = deliverModal
    const price = item.is_free_wash ? 0 : item.price
    const vat = calcVAT(price, company?.tax_enabled || false, company?.vat_rate || 15, company?.price_includes_vat || false)
    const now = new Date().toISOString()

    await supabase.from('cw_queue').update({
      status: 'delivered',
      payment_method: selectedPayment,
      payment_status: item.is_free_wash ? 'paid' : 'paid',
      subtotal: vat.subtotal,
      vat_amount: vat.vat_amount,
      total_amount: vat.total_amount,
      delivered_at: now,
    }).eq('id', item.id)

    await supabase.from('cw_visits').insert({
      company_id: item.company_id,
      service_name: item.service_name,
      service_id: item.service_id || null,
      price: item.price,
      subtotal: vat.subtotal,
      vat_amount: vat.vat_amount,
      total_amount: vat.total_amount,
      payment_method: selectedPayment,
      payment_status: 'paid',
      is_free_wash: item.is_free_wash || false,
      original_price: item.original_price || null,
      discount_amount: item.discount_amount || 0,
      worker_id: item.worker_id || null,
      plate: item.plate || null,
      notes: item.notes || null,
      review_request_sent: false,
    })

    // Loyalty update
    const phone = item.phone?.replace(/\D/g, '').replace(/^966/, '0')
    if (phone && companyId) {
      const { data: customer } = await supabase
        .from('cw_customers')
        .select('id, free_washes_available, loyalty_count, total_visits')
        .eq('company_id', companyId)
        .eq('phone', phone)
        .maybeSingle()

      if (customer) {
        const threshold = company?.cw_loyalty_threshold || 5
        let newCount = (customer.loyalty_count || 0)
        let newFree = (customer.free_washes_available || 0)
        let loyaltyMilestone = false

        if (item.is_free_wash) {
          newFree = Math.max(0, newFree - 1)
        } else {
          newCount++
          if (newCount >= threshold) {
            newFree++
            newCount = 0
            loyaltyMilestone = true
          }
        }

        await supabase.from('cw_customers').update({
          loyalty_count: newCount,
          free_washes_available: newFree,
          total_visits: (customer.total_visits || 0) + 1,
          last_visit_at: now,
        }).eq('id', customer.id)

        if (loyaltyMilestone && item.phone) {
          const ph = item.phone.replace(/^0/, '966').replace(/\D/g, '')
          fetch(N8N_LOYALTY_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: ph,
              customer_name: item.customer_name,
              company_name: company?.name || 'المغسلة',
              free_washes: 1,
            }),
          }).catch(() => {})
        }
      }
    }

    // Delivery receipt webhook
    if (item.phone) {
      const ph = item.phone.replace(/^0/, '966').replace(/\D/g, '')
      fetch(N8N_DELIVERY_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: ph,
          customer_name: item.customer_name,
          company_name: company?.name || 'المغسلة',
          service: item.service_name,
          payment_method: selectedPayment,
          subtotal: vat.subtotal,
          vat_amount: vat.vat_amount,
          total_amount: vat.total_amount,
          is_free_wash: item.is_free_wash || false,
          discount_amount: item.discount_amount || 0,
        }),
      }).catch(() => {})
    }

    logAudit(companyId, 'car_delivered', {
      entityType: 'cw_queue',
      entityId: item.id,
      newValue: { payment_method: selectedPayment, total_amount: vat.total_amount },
    })

    const deliveredItem: CWQueueItem = {
      ...item,
      payment_method: selectedPayment,
      payment_status: 'paid',
      subtotal: vat.subtotal,
      vat_amount: vat.vat_amount,
      total_amount: vat.total_amount,
    }

    setDelivering(false)
    setDeliverModal(null)
    setReceiptItem(deliveredItem)
  }

  const cancelCar = async (id: string) => {
    setCancelling(true)
    const item = items.find(i => i.id === id)
    await supabase.from('cw_queue').update({
      status: 'cancelled' as QueueStatus,
      payment_status: 'cancelled',
    }).eq('id', id)
    if (companyId && item) {
      logAudit(companyId, 'car_cancelled', {
        entityType: 'cw_queue',
        entityId: id,
        oldValue: { status: item.status },
        newValue: { status: 'cancelled' },
      })
    }
    setCancelConfirm(null)
    setCancelling(false)
  }

  const activeItems = items.filter(i => i.status !== 'cancelled')
  const cancelledItems = items.filter(i => i.status === 'cancelled')
  const colItems = (status: QueueStatus) => activeItems.filter(i => i.status === status)

  if (authLoading || loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <Loader2 size={20} className="animate-spin text-primary-400" />
      <p className="text-slate-500 font-tajawal text-sm">جاري تحميل لوحة التشغيل...</p>
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-cairo">لوحة التشغيل</h1>
          <p className="text-sm text-slate-500 font-tajawal">
            {activeItems.length > 0 ? `${activeItems.length} سيارة نشطة الآن — مباشر` : 'سيارات اليوم — مباشر'}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-tajawal font-medium text-white"
          style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
        >
          <Plus size={16} /> إضافة سيارة
        </button>
      </div>

      {/* Kanban board */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-4 min-w-max">
          {COLUMNS.map(col => (
            <div key={col.status} className="w-52 flex-shrink-0">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
                <span className="text-sm font-bold font-cairo" style={{ color: col.color }}>{col.label}</span>
                <span className="text-xs text-slate-600 font-sora ml-auto">{colItems(col.status).length}</span>
              </div>
              <div className="space-y-2 min-h-32">
                {colItems(col.status).map(item => (
                  <div key={item.id} className="p-3 rounded-xl" style={{ background: col.bg, border: `1px solid ${col.color}33` }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white font-cairo truncate">{item.customer_name}</p>
                        {item.car_type && <p className="text-xs text-slate-500 font-tajawal truncate">{item.car_type}{item.plate ? ` · ${item.plate}` : ''}</p>}
                      </div>
                      <div className="flex items-center gap-1 mr-1 flex-shrink-0">
                        {col.status !== 'delivered' && (
                          <button onClick={() => openEdit(item)} className="text-slate-600 hover:text-slate-300 transition-colors">
                            <Pencil size={11} />
                          </button>
                        )}
                        {col.status !== 'delivered' && (
                          <button onClick={() => setCancelConfirm(item.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {item.is_free_wash && (
                      <div className="flex items-center gap-1 mb-1.5">
                        <Gift size={11} className="text-amber-400" />
                        <span className="text-xs text-amber-400 font-tajawal">غسلة مجانية</span>
                      </div>
                    )}

                    {item.service_name && (
                      <p className="text-xs font-tajawal mb-2 truncate" style={{ color: col.color }}>{item.service_name}</p>
                    )}

                    <div className="flex items-center justify-between mb-2">
                      {item.price > 0 && !item.is_free_wash && (
                        <span className="text-xs font-sora text-slate-400">{item.price} ر.س</span>
                      )}
                      {item.is_free_wash && (
                        <span className="text-xs font-tajawal text-amber-400 line-through">{item.original_price} ر.س</span>
                      )}
                      <span className="text-xs text-slate-600 font-sora flex items-center gap-1 ml-auto">
                        <Clock size={10} /> {elapsed(item.created_at)}
                      </span>
                    </div>

                    {item.worker && (
                      <p className="text-xs text-slate-500 font-tajawal mb-2 truncate">👤 {(item.worker as { name: string }).name}</p>
                    )}

                    {col.status === 'ready' && item.phone && (
                      <p className="text-xs text-emerald-500 font-tajawal mb-1.5">📱 تم إشعار العميل</p>
                    )}

                    {col.status !== 'delivered' && NEXT_STATUS[col.status] && (
                      <button
                        onClick={() => moveNext(item)}
                        disabled={movingId === item.id}
                        className="w-full py-1.5 rounded-lg text-xs font-tajawal flex items-center justify-center gap-1 transition-all hover:opacity-80 disabled:opacity-50"
                        style={{ background: col.color + '22', color: col.color, border: `1px solid ${col.color}44` }}
                      >
                        {movingId === item.id ? <Loader2 size={10} className="animate-spin" /> : (
                          col.status === 'ready' ? <Receipt size={10} /> : <ChevronRight size={10} />
                        )}
                        {col.status === 'ready' ? 'تسليم ودفع' : COLUMNS.find(c => c.status === NEXT_STATUS[col.status])?.label}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {activeItems.length === 0 && (
        <div
          className="flex flex-col items-center justify-center h-40 gap-3"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 }}
        >
          <Car size={32} className="text-slate-700" />
          <p className="text-slate-500 font-tajawal text-sm">لا توجد سيارات في القائمة</p>
          <button onClick={openAdd} className="text-primary-400 text-sm font-tajawal underline">أضف أول سيارة</button>
        </div>
      )}

      {/* Cancelled today section */}
      {cancelledItems.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <button
            onClick={() => setShowCancelled(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-tajawal text-slate-500"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <span>ملغاة اليوم ({cancelledItems.length})</span>
            {showCancelled ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showCancelled && (
            <div className="p-3 space-y-2">
              {cancelledItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <X size={12} className="text-slate-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 font-tajawal truncate">{item.customer_name}</p>
                    {item.service_name && <p className="text-xs text-slate-600 font-tajawal truncate">{item.service_name}</p>}
                  </div>
                  <span className="text-xs text-slate-600 font-sora">{item.price > 0 ? `${item.price} ر.س` : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit car form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl overflow-y-auto max-h-[90vh]" style={{ background: '#0D1422', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white font-cairo">{editingItem ? 'تعديل السيارة' : 'إضافة سيارة'}</h2>
                <button onClick={() => { setShowForm(false); setEditingItem(null); setLoyaltyInfo(null) }} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                {/* Customer name */}
                <div>
                  <label className="text-xs text-slate-400 font-tajawal mb-1.5 block">اسم العميل *</label>
                  <input
                    value={form.customer_name}
                    onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                    placeholder="اسم العميل"
                    className="w-full px-4 py-2.5 rounded-xl text-sm font-tajawal text-white placeholder-slate-600 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="text-xs text-slate-400 font-tajawal mb-1.5 block">رقم الجوال</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    onBlur={e => lookupPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    className="w-full px-4 py-2.5 rounded-xl text-sm font-sora text-white placeholder-slate-600 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    dir="ltr"
                  />
                  {loyaltyLoading && (
                    <p className="text-xs text-slate-500 font-tajawal mt-1">جاري البحث...</p>
                  )}
                  {!loyaltyLoading && loyaltyInfo && loyaltyInfo.free_washes_available > 0 && (
                    <div
                      className="mt-2 px-3 py-2 rounded-lg flex items-center gap-2"
                      style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }}
                    >
                      <Gift size={14} className="text-amber-400 flex-shrink-0" />
                      <p className="text-xs text-amber-400 font-tajawal flex-1">العميل مستحق غسلة مجانية ✨</p>
                      <button
                        onClick={() => {
                          const svc = services.find(s => s.id === form.service_id)
                          setForm(f => ({
                            ...f,
                            is_free_wash: !f.is_free_wash,
                            price: !f.is_free_wash ? '0' : (svc ? String(svc.price) : f.price),
                          }))
                        }}
                        className="text-xs font-tajawal px-2 py-0.5 rounded-lg transition-all"
                        style={{
                          background: form.is_free_wash ? 'rgba(245,158,11,0.3)' : 'rgba(245,158,11,0.1)',
                          color: '#F59E0B',
                          border: '1px solid rgba(245,158,11,0.4)',
                        }}
                      >
                        {form.is_free_wash ? '✓ مجانية' : 'تفعيل'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 font-tajawal mb-1.5 block">نوع السيارة</label>
                    <input
                      value={form.car_type}
                      onChange={e => setForm(f => ({ ...f, car_type: e.target.value }))}
                      placeholder="تويوتا، هيونداي..."
                      className="w-full px-4 py-2.5 rounded-xl text-sm font-tajawal text-white placeholder-slate-600 outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-tajawal mb-1.5 block">رقم اللوحة</label>
                    <input
                      value={form.plate}
                      onChange={e => setForm(f => ({ ...f, plate: e.target.value }))}
                      placeholder="أ ب ج 1234"
                      className="w-full px-4 py-2.5 rounded-xl text-sm font-tajawal text-white placeholder-slate-600 outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </div>
                </div>

                {/* Service */}
                <div>
                  <label className="text-xs text-slate-400 font-tajawal mb-1.5 block">الخدمة</label>
                  {services.length > 0 ? (
                    <select
                      value={form.service_id}
                      onChange={e => {
                        const svc = services.find(s => s.id === e.target.value)
                        setForm(f => ({
                          ...f,
                          service_id: e.target.value,
                          service_name: svc?.name || '',
                          price: f.is_free_wash ? '0' : (svc ? String(svc.price) : f.price),
                        }))
                      }}
                      className="w-full px-4 py-2.5 rounded-xl text-sm font-tajawal text-white outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <option value="">اختر الخدمة</option>
                      {services.map(s => (
                        <option key={s.id} value={s.id}>{s.name} — {s.price} ر.س</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={form.service_name}
                      onChange={e => setForm(f => ({ ...f, service_name: e.target.value }))}
                      placeholder="غسيل عادي، بريميوم..."
                      className="w-full px-4 py-2.5 rounded-xl text-sm font-tajawal text-white placeholder-slate-600 outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 font-tajawal mb-1.5 block">السعر (ر.س)</label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                      placeholder="0"
                      min={0}
                      disabled={form.is_free_wash}
                      className="w-full px-4 py-2.5 rounded-xl text-sm font-sora text-white placeholder-slate-600 outline-none disabled:opacity-40"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                      dir="ltr"
                    />
                    {form.is_free_wash && (
                      <p className="text-xs text-amber-400 font-tajawal mt-1">مجانية — السعر 0</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-tajawal mb-1.5 block">الموظف</label>
                    <select
                      value={form.worker_id}
                      onChange={e => setForm(f => ({ ...f, worker_id: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm font-tajawal text-white outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <option value="">بدون تعيين</option>
                      {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs text-slate-400 font-tajawal mb-1.5 block">ملاحظات</label>
                  <input
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="أي ملاحظات إضافية..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm font-tajawal text-white placeholder-slate-600 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => { setShowForm(false); setEditingItem(null); setLoyaltyInfo(null) }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-tajawal text-slate-400"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  إلغاء
                </button>
                <button
                  onClick={saveForm}
                  disabled={saving || !form.customer_name.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-tajawal text-white flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {saving ? 'جاري الحفظ...' : editingItem ? 'حفظ التعديل' : 'إضافة'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivery / payment modal */}
      {deliverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: '#0D1422', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white font-cairo">تأكيد التسليم</h2>
              <button onClick={() => setDeliverModal(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            <div className="mb-4 p-3 rounded-xl space-y-1" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <p className="text-sm font-bold text-white font-cairo">{deliverModal.customer_name}</p>
              {deliverModal.service_name && <p className="text-xs text-slate-400 font-tajawal">{deliverModal.service_name}</p>}
              {deliverModal.is_free_wash && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Gift size={12} className="text-amber-400" />
                  <span className="text-xs text-amber-400 font-tajawal">غسلة مجانية</span>
                </div>
              )}
            </div>

            {/* VAT breakdown */}
            {(() => {
              const price = deliverModal.is_free_wash ? 0 : deliverModal.price
              const vat = calcVAT(price, company?.tax_enabled || false, company?.vat_rate || 15, company?.price_includes_vat || false)
              return (
                <div className="mb-4 space-y-1.5 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {deliverModal.is_free_wash ? (
                    <>
                      <div className="flex justify-between text-xs font-tajawal">
                        <span className="text-slate-500">السعر الأصلي</span>
                        <span className="text-slate-400 line-through">{deliverModal.original_price} ر.س</span>
                      </div>
                      <div className="flex justify-between text-xs font-tajawal">
                        <span className="text-slate-500">خصم الولاء</span>
                        <span className="text-amber-400">-{deliverModal.original_price} ر.س</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold font-cairo pt-1 border-t border-white/5">
                        <span className="text-white">الإجمالي</span>
                        <span className="text-emerald-400">0 ر.س</span>
                      </div>
                    </>
                  ) : company?.tax_enabled ? (
                    <>
                      <div className="flex justify-between text-xs font-tajawal">
                        <span className="text-slate-500">قبل الضريبة</span>
                        <span className="text-slate-300">{vat.subtotal.toFixed(2)} ر.س</span>
                      </div>
                      <div className="flex justify-between text-xs font-tajawal">
                        <span className="text-slate-500">ضريبة {company.vat_rate || 15}%</span>
                        <span className="text-slate-300">{vat.vat_amount.toFixed(2)} ر.س</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold font-cairo pt-1 border-t border-white/5">
                        <span className="text-white">الإجمالي</span>
                        <span className="text-emerald-400">{vat.total_amount.toFixed(2)} ر.س</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-sm font-bold font-cairo">
                      <span className="text-white">الإجمالي</span>
                      <span className="text-emerald-400">{price} ر.س</span>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Payment method selector */}
            {!deliverModal.is_free_wash && (
              <div className="mb-5">
                <p className="text-xs text-slate-400 font-tajawal mb-2">طريقة الدفع</p>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_BUTTONS.map(pm => (
                    <button
                      key={pm.value}
                      onClick={() => setSelectedPayment(pm.value)}
                      className="py-2 rounded-xl text-xs font-tajawal font-medium transition-all"
                      style={{
                        background: selectedPayment === pm.value ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${selectedPayment === pm.value ? '#6366F1' : 'rgba(255,255,255,0.1)'}`,
                        color: selectedPayment === pm.value ? '#A5B4FC' : '#94A3B8',
                      }}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={confirmDelivery}
              disabled={delivering}
              className="w-full py-3 rounded-xl text-sm font-tajawal font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
            >
              {delivering ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {delivering ? 'جاري التأكيد...' : 'تأكيد التسليم'}
            </button>
          </div>
        </div>
      )}

      {/* Cancel confirmation modal */}
      {cancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-xs rounded-2xl p-6" style={{ background: '#0D1422', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-base font-bold text-white font-cairo mb-2">إلغاء السيارة</h2>
            <p className="text-sm text-slate-400 font-tajawal mb-5">هل أنت متأكد من إلغاء هذه السيارة من القائمة؟</p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelConfirm(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-tajawal text-slate-400"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                تراجع
              </button>
              <button
                onClick={() => cancelCar(cancelConfirm)}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl text-sm font-tajawal text-white flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#FCA5A5' }}
              >
                {cancelling ? <Loader2 size={12} className="animate-spin" /> : null}
                إلغاء السيارة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt modal */}
      {receiptItem && company && (
        <CarWashReceipt
          item={receiptItem}
          company={company}
          paymentMethod={receiptItem.payment_method || 'cash'}
          onClose={() => setReceiptItem(null)}
        />
      )}
    </div>
  )
}
