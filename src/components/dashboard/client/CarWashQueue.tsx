import { useEffect, useState, useRef } from 'react'
import { Plus, X, Loader2, Clock, ChevronRight, Car, Pencil, Check, Gift, ChevronDown, ChevronUp, Receipt } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { calcVAT } from '../../../lib/vatUtils'
import { logAudit } from '../../../lib/auditLog'
import type { CWQueueItem, CWWorker, CWService, QueueStatus, PaymentMethod } from '../../../types'
import { CarWashReceipt } from './CarWashReceipt'

const N8N_BASE              = 'https://keepcalm.app.n8n.cloud/webhook'
const N8N_READY_WEBHOOK     = `${N8N_BASE}/cw-car-ready`
const N8N_DELIVERY_WEBHOOK  = `${N8N_BASE}/cw-delivery-receipt`
const N8N_LOYALTY_WEBHOOK   = `${N8N_BASE}/cw-loyalty-milestone`
const N8N_REGISTER_WEBHOOK  = `${N8N_BASE}/cw-registration`

function fireWebhook(url: string, body: Record<string, unknown>) {
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(r => { if (!r.ok) console.warn('[n8n]', url, r.status) })
    .catch(e => console.warn('[n8n]', url, e))
}

type FastLane = {
  key: 'received' | 'in_service' | 'ready' | 'delivered'
  statuses: QueueStatus[]
  label: string
  eyebrow: string
  actionLabel?: string
  color: string
  bg: string
}

const FAST_LANES: FastLane[] = [
  { key: 'received', statuses: ['received'], label: 'استلام', eyebrow: 'سيارات وصلت للتو', actionLabel: 'بدء الخدمة', color: '#38BDF8', bg: 'rgba(56,189,248,0.10)' },
  { key: 'in_service', statuses: ['washing', 'drying'], label: 'قيد الخدمة', eyebrow: 'يتم العمل عليها الآن', actionLabel: 'السيارة جاهزة', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  { key: 'ready', statuses: ['ready'], label: 'جاهزة', eyebrow: 'بانتظار التسليم', actionLabel: 'تسليم واستلام الدفع', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  { key: 'delivered', statuses: ['delivered'], label: 'تم التسليم', eyebrow: 'منجزة اليوم', color: '#F59E0B', bg: 'rgba(245,158,11,0.11)' },
]

const NEXT_STATUS: Partial<Record<QueueStatus, QueueStatus>> = {
  received: 'washing',
  washing: 'ready',
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

      // Upsert cw_customers + fire registration webhook for new customers
      if (form.phone) {
        const rawPhone = form.phone.replace(/\D/g, '')
        const normalizedPhone = rawPhone.startsWith('966') ? rawPhone : rawPhone.startsWith('0') ? `966${rawPhone.slice(1)}` : `966${rawPhone}`
        const localPhone = rawPhone.startsWith('966') ? `0${rawPhone.slice(3)}` : rawPhone.startsWith('0') ? rawPhone : `0${rawPhone}`

        const { data: existingCustomer } = await supabase
          .from('cw_customers')
          .select('id, total_visits')
          .eq('company_id', companyId)
          .eq('phone', normalizedPhone)
          .maybeSingle()

        if (!existingCustomer) {
          // New customer — create record + send welcome WhatsApp
          await supabase.from('cw_customers').insert({
            company_id: companyId,
            phone: normalizedPhone,
            name: form.customer_name || null,
            total_visits: 0,
            welcome_sent: true,
          })
          fireWebhook(N8N_REGISTER_WEBHOOK, {
            phone: normalizedPhone,
            customer_name: form.customer_name || '',
            company_name: company?.name || 'المغسلة',
            company_id: companyId,
          })
        } else if (form.customer_name && existingCustomer) {
          // Update name if provided
          await supabase.from('cw_customers').update({ name: form.customer_name }).eq('id', existingCustomer.id)
        }
        void localPhone
      }
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
    if (item.status === 'received' && next === 'washing' && !item.started_at) updates.started_at = new Date().toISOString()
    await supabase.from('cw_queue').update(updates).eq('id', item.id)

    const cwAuto = (company as any)?.cw_automations || {}
    if (next === 'ready' && item.phone && cwAuto.car_ready?.enabled !== false) {
      const phone = item.phone.replace(/\D/g, '').replace(/^0/, '966')
      fireWebhook(N8N_READY_WEBHOOK, { phone, customer_name: item.customer_name, company_name: company?.name || 'المغسلة', company_id: companyId })
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
      payment_status: 'paid',
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
      phone: item.phone || null,
      customer_name: item.customer_name || null,
      review_request_sent: false,
    })

    // Loyalty update — phone must match cw_customers international format (966XXXXXXXXX)
    const rawPhone = item.phone?.replace(/\D/g, '') || ''
    const phone = rawPhone.startsWith('966') ? rawPhone : rawPhone.startsWith('0') ? `966${rawPhone.slice(1)}` : rawPhone ? `966${rawPhone}` : ''
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

        if (loyaltyMilestone && item.phone && (company as any)?.cw_automations?.loyalty_milestone?.enabled !== false) {
          const ph = item.phone.replace(/\D/g, '').replace(/^0/, '966')
          fireWebhook(N8N_LOYALTY_WEBHOOK, { phone: ph, customer_name: item.customer_name, company_name: company?.name || 'المغسلة', company_id: companyId, free_washes: 1 })
        }
      }
    }

    // Delivery receipt webhook
    if (item.phone && (company as any)?.cw_automations?.delivery_receipt?.enabled !== false) {
      const ph = item.phone.replace(/^0/, '966').replace(/\D/g, '')
      fireWebhook(N8N_DELIVERY_WEBHOOK, {
        phone: ph,
        customer_name: item.customer_name,
        company_name: company?.name || 'المغسلة',
        company_id: companyId,
        service: item.service_name,
        payment_method: selectedPayment,
        subtotal: vat.subtotal,
        vat_amount: vat.vat_amount,
        total_amount: vat.total_amount,
        is_free_wash: item.is_free_wash || false,
        discount_amount: item.discount_amount || 0,
      })
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
  const laneItems = (lane: FastLane) => activeItems.filter(i => lane.statuses.includes(i.status))
  const pendingItems = activeItems.filter(i => i.status !== 'delivered')
  const deliveredItems = activeItems.filter(i => i.status === 'delivered')
  const readyItems = activeItems.filter(i => i.status === 'ready')
  const inServiceItems = activeItems.filter(i => i.status === 'washing' || i.status === 'drying')
  const todayRevenue = deliveredItems.reduce((sum, item) => sum + (item.total_amount ?? item.price ?? 0), 0)

  if (authLoading || loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <Loader2 size={20} className="animate-spin text-primary-400" />
      <p className="text-slate-500 font-tajawal text-sm">جاري تحميل لوحة التشغيل...</p>
    </div>
  )

  return (
    <div className="space-y-5" dir="rtl">
      <div
        className="relative overflow-hidden rounded-2xl p-5 md:p-6"
        style={{
          background: 'linear-gradient(135deg, #E8F4FF 0%, #EBF7FF 55%, rgba(16,185,129,0.06))',
          border: '1px solid rgba(0,191,255,0.28)',
          boxShadow: '0 4px 24px rgba(13,27,62,0.10)',
        }}
      >
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.6), transparent)' }} />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold font-cairo text-emerald-600">مركز تشغيل اليوم</p>
            <h1 className="mt-2 text-2xl md:text-3xl font-bold font-cairo" style={{ color: '#0D1B3E' }}>مسار السيارات السريع</h1>
            <p className="mt-2 text-sm md:text-base font-tajawal leading-7" style={{ color: '#415169' }}>
              أربع خطوات واضحة للموظف: استلام، قيد الخدمة، جاهزة، ثم تسليم. كل سيارة تتحرك بزر واحد بدون تفاصيل زائدة.
            </p>
          </div>
          <button
            onClick={openAdd}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-slate-950 font-tajawal transition-transform hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #D9F99D, #34D399)' }}
          >
            <Plus size={17} />
            إضافة سيارة
          </button>
        </div>

        <div className="relative mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'في المسار', value: pendingItems.length, hint: 'غير مسلمة', tone: '#38BDF8' },
            { label: 'قيد الخدمة', value: inServiceItems.length, hint: 'داخل المغسلة', tone: '#8B5CF6' },
            { label: 'جاهزة', value: readyItems.length, hint: 'تنتظر العميل', tone: '#10B981' },
            { label: 'إيراد اليوم', value: todayRevenue.toLocaleString('ar-SA'), hint: 'ر.س مستلمة', tone: '#F59E0B' },
          ].map(stat => (
            <div
              key={stat.label}
              className="rounded-xl px-4 py-3"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,191,255,0.22)', boxShadow: '0 2px 12px rgba(13,27,62,0.07)' }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-tajawal" style={{ color: '#5A6E85' }}>{stat.label}</span>
                <span className="h-2 w-2 rounded-full" style={{ background: stat.tone, boxShadow: '0 0 10px ' + stat.tone + '88' }} />
              </div>
              <p className="mt-2 text-2xl font-bold font-sora" style={{ color: '#0D1B3E' }}>{stat.value}</p>
              <p className="mt-1 text-xs font-tajawal" style={{ color: '#415169' }}>{stat.hint}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-4 lg:grid-cols-2">
        {FAST_LANES.map(lane => {
          const cars = laneItems(lane)
          return (
            <section
              key={lane.key}
              className="min-h-[420px] rounded-2xl p-3"
              style={{ background: lane.bg, border: '1px solid ' + lane.color + '33' }}
            >
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="h-9 w-1 rounded-full" style={{ background: lane.color, boxShadow: '0 0 24px ' + lane.color + '88' }} />
                  <div>
                    <h2 className="text-base font-bold font-cairo" style={{ color: lane.color }}>{lane.label}</h2>
                    <p className="text-xs text-slate-500 font-tajawal">{lane.eyebrow}</p>
                  </div>
                </div>
                <span className="rounded-full px-2.5 py-1 text-xs font-bold font-sora" style={{ color: lane.color, background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(4px)' }}>
                  {cars.length}
                </span>
              </div>

              <div className="space-y-3">
                {cars.map(item => (
                  <div
                    key={item.id}
                    className="rounded-xl p-3.5 transition-transform hover:-translate-y-0.5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,191,255,0.18)', boxShadow: '0 4px 20px rgba(13,27,62,0.09)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-bold font-cairo" style={{ color: '#0D1B3E' }}>{item.customer_name}</p>
                        <p className="mt-1 truncate text-xs text-slate-500 font-tajawal">
                          {item.car_type || 'سيارة'}{item.plate ? ' · ' + item.plate : ''}
                        </p>
                      </div>
                      {lane.key !== 'delivered' && (
                        <div className="flex items-center gap-1">
                          <button
                            aria-label="تعديل السيارة"
                            onClick={() => openEdit(item)}
                            className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition-colors hover:text-slate-800"
                            style={{ background: 'rgba(13,27,62,0.06)' }}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            aria-label="إلغاء السيارة"
                            onClick={() => setCancelConfirm(item.id)}
                            className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition-colors hover:text-red-300"
                            style={{ background: 'rgba(13,27,62,0.06)' }}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {item.service_name && (
                        <span className="rounded-full px-2.5 py-1 text-xs font-medium font-tajawal" style={{ color: lane.color, background: lane.bg }}>
                          {item.service_name}
                        </span>
                      )}
                      {item.is_free_wash && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-amber-300 font-tajawal" style={{ background: 'rgba(245,158,11,0.12)' }}>
                          <Gift size={11} /> مجانية
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-slate-600 font-tajawal">القيمة</p>
                        <p className="mt-1 text-slate-300 font-sora">{item.is_free_wash ? '0' : (item.total_amount ?? item.price ?? 0)} ر.س</p>
                      </div>
                      <div>
                        <p className="text-slate-600 font-tajawal">الوقت</p>
                        <p className="mt-1 inline-flex items-center gap-1 text-slate-300 font-sora"><Clock size={11} />{elapsed(item.created_at)}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-slate-600 font-tajawal">الموظف</p>
                        <p className="mt-1 truncate text-slate-300 font-tajawal">{item.worker ? (item.worker as { name: string }).name : 'غير محدد'}</p>
                      </div>
                    </div>

                    {lane.key === 'ready' && item.phone && (company as any)?.cw_automations?.car_ready?.enabled !== false && (
                      <p className="mt-3 rounded-lg px-3 py-2 text-xs text-emerald-300 font-tajawal" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}>
                        تم إشعار العميل عبر واتساب
                      </p>
                    )}

                    {lane.actionLabel && NEXT_STATUS[item.status] && (
                      <button
                        onClick={() => moveNext(item)}
                        disabled={movingId === item.id}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold font-tajawal transition-all hover:opacity-90 disabled:opacity-50"
                        style={{ background: lane.color, color: '#020617' }}
                      >
                        {movingId === item.id ? <Loader2 size={14} className="animate-spin" /> : (
                          lane.key === 'ready' ? <Receipt size={14} /> : <ChevronRight size={14} />
                        )}
                        {lane.actionLabel}
                      </button>
                    )}
                  </div>
                ))}

                {cars.length === 0 && (
                  <div
                    className="flex h-40 flex-col items-center justify-center rounded-xl text-center"
                    style={{ background: 'rgba(3,7,18,0.34)', border: '1px dashed rgba(255,255,255,0.12)' }}
                  >
                    <Car size={24} className="text-slate-700" />
                    <p className="mt-2 text-sm text-slate-600 font-tajawal">لا توجد سيارات هنا</p>
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>

      {activeItems.length === 0 && (
        <div
          className="flex flex-col items-center justify-center h-40 gap-3"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 }}
        >
          <Car size={32} className="text-slate-700" />
          <p className="text-slate-500 font-tajawal text-sm">لا توجد سيارات في قائمة اليوم</p>
          <button onClick={openAdd} className="text-emerald-300 text-sm font-tajawal underline">أضف أول سيارة</button>
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
          <div role="dialog" aria-modal="true" aria-label="Car form" className="w-full max-w-md rounded-2xl overflow-y-auto max-h-[90vh]" style={{ background: '#0D1422', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white font-cairo">{editingItem ? 'تعديل السيارة' : 'إضافة سيارة'}</h2>
                <button aria-label="Close dialog" onClick={() => { setShowForm(false); setEditingItem(null); setLoyaltyInfo(null) }} className="text-slate-400 hover:text-white">
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
          <div role="dialog" aria-modal="true" aria-label="Confirm delivery" className="w-full max-w-sm rounded-2xl p-6" style={{ background: '#0D1422', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white font-cairo">تأكيد التسليم</h2>
              <button aria-label="Close dialog" onClick={() => setDeliverModal(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
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
          <div role="dialog" aria-modal="true" aria-label="Cancel car confirmation" className="w-full max-w-xs rounded-2xl p-6" style={{ background: '#0D1422', border: '1px solid rgba(255,255,255,0.1)' }}>
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
