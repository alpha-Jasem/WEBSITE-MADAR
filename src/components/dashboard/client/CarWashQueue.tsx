import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, X, Loader2, Clock, ChevronRight, Car, Pencil, Check, Gift, ChevronDown, ChevronUp, Receipt, AlertTriangle, RefreshCw } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { calcVAT } from '../../../lib/vatUtils'
import { logAudit } from '../../../lib/auditLog'
import { getDailyTicketCode } from '../../../lib/carWashTickets'
import { clearSelfCheckinPending, isSelfCheckinPending } from '../../../lib/selfCheckin'
import { sanitizeNameText } from '../../../lib/formSanitizers'
import type { CWQueueItem, CWWorker, CWService, QueueStatus, PaymentMethod } from '../../../types'
import { CarWashInvoicePrint } from './CarWashInvoicePrint'
import type { InvoiceData } from './CarWashInvoicePrint'
import { sendCWInvoice } from '../../../lib/n8nCarWash'
import { ClientInsightPanel } from './ClientUI'

// Notifications (car_ready, delivery_receipt, loyalty_milestone, daily_closing)
// are now handled by Supabase DB triggers — no webhook calls needed here.
const N8N_REGISTER_WEBHOOK = 'https://keepcalm.app.n8n.cloud/webhook/cw-registration'

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
  { key: 'received',   statuses: ['received'],           label: 'استلام',       eyebrow: 'سيارات وصلت للتو',      actionLabel: 'بدء الخدمة',          color: '#0EA5E9', bg: '#F0F9FF' },
  { key: 'in_service', statuses: ['washing', 'drying'],  label: 'قيد الخدمة',  eyebrow: 'يتم العمل عليها الآن',  actionLabel: 'السيارة جاهزة',        color: '#7C3AED', bg: '#F5F3FF' },
  { key: 'ready',      statuses: ['ready'],               label: 'جاهزة',        eyebrow: 'بانتظار التسليم',        actionLabel: 'تسليم واستلام الدفع',  color: '#059669', bg: '#F0FDF4' },
  { key: 'delivered',  statuses: ['delivered'],           label: 'تم التسليم',   eyebrow: 'منجزة اليوم',            color: '#D97706',                     bg: '#FFFBEB' },
]

const NEXT_STATUS: Partial<Record<QueueStatus, QueueStatus>> = {
  received: 'washing',
  washing: 'ready',
  drying: 'ready',
  ready: 'delivered',
}

const QUEUE_PAYMENT_BUTTONS: { value: PaymentMethod; label: string }[] = [
  { value: 'mada', label: 'مدى' },
  { value: 'cash', label: 'كاش' },
  { value: 'visa', label: 'فيزا' },
]

const OPTIONAL_PAYMENT_BUTTONS: { value: PaymentMethod; label: string; flag: 'wallet' | 'memberships' }[] = [
  { value: 'wallet', label: 'محفظة', flag: 'wallet' },
  { value: 'membership', label: 'اشتراك', flag: 'memberships' },
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
  service_ids: [] as string[],
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
  const featureFlags = ((company?.cw_automations as any)?.feature_flags || {}) as Record<string, boolean>
  const [searchParams, setSearchParams] = useSearchParams()
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
  const [deliveryError, setDeliveryError] = useState('')
  const [queueError, setQueueError] = useState('')
  const [queueNotice, setQueueNotice] = useState('')
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelled, setShowCancelled] = useState(false)
  const [workerRequiredId, setWorkerRequiredId] = useState<string | null>(null)
  const [custSearchQ, setCustSearchQ] = useState('')
  const [custResults, setCustResults] = useState<{ id: string; name: string | null; phone: string }[]>([])
  const [showNewCustForm, setShowNewCustForm] = useState(false)
  const [custSearching, setCustSearching] = useState(false)
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const custSearchTimer = useRef<ReturnType<typeof setTimeout>>()

  const loadItems = async (cid: string) => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { data, error } = await supabase
      .from('cw_queue')
      .select('*, worker:cw_workers(id, name, commission_type, commission_value)')
      .eq('company_id', cid)
      .gte('created_at', todayStart.toISOString())
      .order('created_at')
    if (error) {
      setQueueError('تعذر تحديث لوحة التشغيل. تحقق من الاتصال وحاول مرة ثانية.')
      return
    }
    setItems((data as CWQueueItem[]) || [])
    setLastSyncAt(new Date().toISOString())
    setQueueError('')
  }

  const showQueueNotice = (message: string) => {
    setQueueNotice(message)
    window.setTimeout(() => setQueueNotice(current => current === message ? '' : current), 3500)
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
    init().then(() => {
      if (searchParams.get('add') === '1') {
        openAdd()
        setSearchParams({}, { replace: true })
      }
    })

    const subscribe = () => {
      channelRef.current?.unsubscribe()
      channelRef.current = supabase
        .channel(`queue-${cid}-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cw_queue', filter: `company_id=eq.${cid}` }, () => loadItems(cid))
        .subscribe(status => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setTimeout(() => subscribe(), 3000)
          }
        })
    }
    subscribe()

    // Reload data when tab becomes visible again (handles long background sessions)
    const onVisible = () => { if (document.visibilityState === 'visible') { loadItems(cid); subscribe() } }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      channelRef.current?.unsubscribe()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [authLoading, companyId])

  const lookupPhone = async (phone: string) => {
    if (!companyId || phone.length < 9) return
    setLoyaltyLoading(true)
    const digits = phone.replace(/\D/g, '')
    const normalized966 = digits.startsWith('966') ? digits : digits.startsWith('0') ? `966${digits.slice(1)}` : `966${digits}`
    const { data } = await supabase
      .from('cw_customers')
      .select('id, free_washes_available, loyalty_count, total_visits')
      .eq('company_id', companyId)
      .eq('phone', normalized966)
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
    setCustSearchQ('')
    setCustResults([])
    setShowNewCustForm(false)
    setCustSearching(false)
    setShowForm(true)
  }

  const handleCustSearch = (q: string) => {
    setCustSearchQ(q)
    if (custSearchTimer.current) clearTimeout(custSearchTimer.current)
    if (q.length < 2) { setCustResults([]); return }
    custSearchTimer.current = setTimeout(async () => {
      if (!companyId) return
      setCustSearching(true)
      const { data } = await supabase
        .from('cw_customers')
        .select('id, name, phone')
        .eq('company_id', companyId)
        .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(6)
      setCustResults((data || []) as { id: string; name: string | null; phone: string }[])
      setCustSearching(false)
    }, 300)
  }

  const selectCustomer = (c: { id: string; name: string | null; phone: string }) => {
    setForm(f => ({ ...f, customer_name: c.name || '', phone: c.phone || '' }))
    setCustSearchQ('')
    setCustResults([])
    void lookupPhone(c.phone)
  }

  const openEdit = (item: CWQueueItem) => {
    setEditingItem(item)
    setForm({
      customer_name: item.customer_name,
      phone: item.phone || '',
      car_type: item.car_type || '',
      plate: item.plate || '',
      service_id: item.service_id || '',
      service_ids: item.service_id ? [item.service_id] : [],
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
    const customerName = sanitizeNameText(form.customer_name).trim()
    const selectedServices = services.filter(service => form.service_ids.includes(service.id))
    const serviceName = selectedServices.length > 0
      ? selectedServices.map(service => service.name).join(' + ')
      : sanitizeNameText(form.service_name).trim()
    const carType = sanitizeNameText(form.car_type).trim()
    if (!companyId || !customerName) return
    setSaving(true)
    const price = selectedServices.length > 0
      ? selectedServices.reduce((sum, service) => sum + Number(service.price || 0), 0)
      : Number(form.price) || 0

    const payload = {
      customer_name: customerName,
      phone: form.phone || null,
      car_type: carType || null,
      plate: form.plate || null,
      service_id: selectedServices[0]?.id || form.service_id || null,
      service_name: serviceName || null,
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
            name: customerName || null,
            total_visits: 0,
            welcome_sent: true,
          })
          fireWebhook(N8N_REGISTER_WEBHOOK, {
            phone: normalizedPhone,
            customer_name: customerName || '',
            company_name: company?.name || 'المغسلة',
            company_id: companyId,
            is_new_customer: true,
          })
        } else if (customerName && existingCustomer) {
          // Update name if provided
          await supabase.from('cw_customers').update({ name: customerName }).eq('id', existingCustomer.id)
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

  const toggleFormService = (service: CWService) => {
    setForm(current => {
      const exists = current.service_ids.includes(service.id)
      const serviceIds = exists
        ? current.service_ids.filter(id => id !== service.id)
        : [...current.service_ids, service.id]
      const selected = services.filter(item => serviceIds.includes(item.id))
      const total = selected.reduce((sum, item) => sum + Number(item.price || 0), 0)
      return {
        ...current,
        service_ids: serviceIds,
        service_id: selected[0]?.id || '',
        service_name: selected.map(item => item.name).join(' + '),
        price: current.is_free_wash ? '0' : (selected.length > 0 ? String(total) : ''),
      }
    })
  }

  const moveNext = async (item: CWQueueItem) => {
    if (isSelfCheckinPending(item.notes)) {
      setMovingId(item.id)
      setQueueError('')
      const clearedNotes = clearSelfCheckinPending(item.notes)
      const { error } = await supabase.from('cw_queue').update({ notes: clearedNotes }).eq('id', item.id)
      if (error) {
        setQueueError('تعذر اعتماد السيارة. حاول مرة ثانية.')
        setMovingId(null)
        return
      }
      setItems(prev => prev.map(row => row.id === item.id ? { ...row, notes: clearedNotes } : row))
      logAudit(companyId || '', 'self_checkin_approved', { entityType: 'cw_queue', entityId: item.id })
      setMovingId(null)
      showQueueNotice('تم اعتماد السيارة وإدخالها للمسار.')
      return
    }

    const next = NEXT_STATUS[item.status]
    if (!next) return

    if (!item.worker_id && workers.length > 0 && item.status !== 'ready') {
      setWorkerRequiredId(item.id)
      return
    }

    if (next === 'delivered') {
      setDeliverModal(item)
      setSelectedPayment('cash')
      setDeliveryError('')
      return
    }

    setWorkerRequiredId(null)
    setMovingId(item.id)
    setQueueError('')
    const updates: Record<string, unknown> = { status: next }
    if (item.status === 'received' && next === 'washing' && !item.started_at) updates.started_at = new Date().toISOString()
    const { error } = await supabase.from('cw_queue').update(updates).eq('id', item.id)
    if (error) {
      setQueueError('تعذر نقل السيارة للمرحلة التالية. حاول مرة ثانية.')
      setMovingId(null)
      return
    }
    setItems(prev => prev.map(row => row.id === item.id ? { ...row, ...updates, status: next } as CWQueueItem : row))

    const cwAuto = (company as any)?.cw_automations || {}
    setMovingId(null)
    showQueueNotice(next === 'washing' ? 'تم بدء الخدمة ونقل السيارة إلى قيد الخدمة.' : 'تم نقل السيارة إلى جاهزة.')
  }

  const confirmDelivery = async () => {
    if (!deliverModal || !companyId || delivering) return
    setDelivering(true)
    setDeliveryError('')
    const item = deliverModal
    const isMembershipPayment = false
    const price = item.is_free_wash ? 0 : item.price
    const vat = calcVAT(price, company?.tax_enabled ?? true, 15, true)
    const now = new Date().toISOString()

    // Look up customer first so we can link the visit record
    const rawPhone = item.phone?.replace(/\D/g, '') || ''
    const phone = rawPhone.startsWith('966') ? rawPhone : rawPhone.startsWith('0') ? `966${rawPhone.slice(1)}` : rawPhone ? `966${rawPhone}` : ''
    let customer: { id: string; free_washes_available: number; loyalty_count: number; total_visits: number; wallet_balance?: number | null } | null = null
    if (phone && companyId) {
      const { data } = await supabase
        .from('cw_customers')
        .select('id, free_washes_available, loyalty_count, total_visits, wallet_balance')
        .eq('company_id', companyId)
        .eq('phone', phone)
        .maybeSingle()
      customer = data
      if (!customer) {
        const { data: insertedCustomer, error: customerError } = await supabase
          .from('cw_customers')
          .insert({
            company_id: companyId,
            phone,
            name: item.customer_name || null,
            total_visits: 0,
            welcome_sent: true,
          })
          .select('id, free_washes_available, loyalty_count, total_visits, wallet_balance')
          .single()
        if (customerError) {
          setDeliveryError('تعذر تجهيز سجل العميل. حاول مرة ثانية.')
          setDelivering(false)
          return
        }
        customer = insertedCustomer
      }
    }

    const membershipId: string | null = null

    const deliveryUpdate = {
      status: 'delivered',
      payment_method: selectedPayment,
      payment_status: 'paid',
      subtotal: vat.subtotal,
      vat_amount: vat.vat_amount,
      total_amount: vat.total_amount,
      discount_amount: isMembershipPayment ? item.price : item.discount_amount || 0,
      delivered_at: now,
    }

    const { error: queueError } = await supabase.from('cw_queue').update(deliveryUpdate).eq('id', item.id)
    if (queueError) {
      setDeliveryError('تعذر نقل السيارة إلى تم التسليم. حاول مرة ثانية.')
      setDelivering(false)
      return
    }

    const { error: visitError } = await supabase.from('cw_visits').insert({
      company_id: item.company_id,
      customer_id: customer?.id || null,
      service_name: item.service_name,
      service_id: item.service_id || null,
      price: item.price,
      subtotal: vat.subtotal,
      vat_amount: vat.vat_amount,
      total_amount: vat.total_amount,
      payment_method: selectedPayment,
      payment_status: 'paid',
      is_free_wash: item.is_free_wash || isMembershipPayment || false,
      original_price: item.original_price || null,
      discount_amount: isMembershipPayment ? item.price : item.discount_amount || 0,
      worker_id: item.worker_id || null,
      plate: item.plate || null,
      notes: membershipId ? `${item.notes || ''} [membership:${membershipId}]`.trim() : item.notes || null,
      phone: item.phone || null,
      customer_name: item.customer_name || null,
      review_request_sent: false,
    })
    if (visitError) {
      setDeliveryError('تم تسليم السيارة، لكن تعذر حفظ سجل الزيارة. سيتم تحديث الشاشة.')
    }

    // Loyalty update
    if (phone && companyId) {

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

      }
    }

    // Delivery receipt + loyalty notifications handled by Supabase DB trigger

    logAudit(companyId, 'car_delivered', {
      entityType: 'cw_queue',
      entityId: item.id,
      newValue: { payment_method: selectedPayment, total_amount: vat.total_amount },
    })

    const deliveredItem: CWQueueItem = {
      ...item,
      status: 'delivered',
      payment_method: selectedPayment,
      payment_status: 'paid',
      subtotal: vat.subtotal,
      vat_amount: vat.vat_amount,
      total_amount: vat.total_amount,
      discount_amount: isMembershipPayment ? item.price : item.discount_amount || 0,
      delivered_at: now,
    }

    setItems(prev => prev.map(row => row.id === item.id ? deliveredItem : row))
    showQueueNotice('تم تسليم السيارة ونقلها إلى تم التسليم.')
    void loadItems(companyId)

    const invoiceNo = `INV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${item.id.slice(0,6).toUpperCase()}`
    const newInvoiceData: InvoiceData = {
      visitId: item.id,
      invoiceNo,
      items: [{ id: item.id, name: item.service_name || 'خدمة', price: vat.total_amount, qty: 1 }],
      customerName: item.customer_name,
      customerPhone: item.phone || null,
      plate: item.plate || null,
      subtotal: vat.subtotal,
      vatAmount: vat.vat_amount,
      total: vat.total_amount,
      discount: item.is_free_wash ? (item.original_price || item.price) : (item.discount_amount || 0),
      paymentMethod: selectedPayment,
      date: now,
    }

    if (phone) {
      sendCWInvoice({
        phone,
        customer_name: item.customer_name || '',
        company_name: company?.name || '',
        company_id: companyId || '',
        invoice_no: invoiceNo,
        services: item.service_name || '',
        subtotal: vat.subtotal.toFixed(2),
        vat: vat.vat_amount.toFixed(2),
        total: vat.total_amount.toFixed(2),
        payment_method: selectedPayment,
        date: now,
        plate: item.plate || null,
      })
    }

    setItems(prev => prev.map(row => row.id === item.id ? deliveredItem : row))
    showQueueNotice('تم تسليم السيارة ونقلها إلى تم التسليم.')
    void loadItems(companyId)

    setDelivering(false)
    setDeliverModal(null)
    setInvoiceData(newInvoiceData)
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
  const pendingApprovalItems = activeItems.filter(i => isSelfCheckinPending(i.notes))
  const stuckItems = activeItems.filter(i => {
    if (i.status === 'delivered' || i.status === 'cancelled') return false
    const mins = Math.floor((Date.now() - new Date(i.created_at).getTime()) / 60000)
    return mins >= 60
  })
  const deliveredItems = activeItems.filter(i => i.status === 'delivered')
  const readyItems = activeItems.filter(i => i.status === 'ready')
  const inServiceItems = activeItems.filter(i => i.status === 'washing' || i.status === 'drying')
  const todayRevenue = deliveredItems.reduce((sum, item) => sum + (item.total_amount ?? item.price ?? 0), 0)
  const avgMinutes = deliveredItems.length
    ? Math.round(deliveredItems.reduce((sum, item) => sum + Math.max(0, Math.floor((new Date(item.delivered_at || item.updated_at || item.created_at).getTime() - new Date(item.created_at).getTime()) / 60000)), 0) / deliveredItems.length)
    : 0
  const queueInsights = [
    pendingApprovalItems.length > 0
      ? { title: 'اعتمد تسجيلات QR أولاً', description: `${pendingApprovalItems.length} سيارة دخلت من الباركود وتنتظر موظف يثبتها في المسار.`, tone: 'amber' as const }
      : { title: 'QR جاهز بدون انتظار', description: 'لا توجد سيارات معلقة من التسجيل الذاتي الآن، وهذا ممتاز لتخفيف ضغط الاستقبال.', tone: 'green' as const },
    readyItems.length > 0
      ? { title: 'سلّم السيارات الجاهزة', description: `${readyItems.length} سيارة جاهزة. التسليم السريع يقلل الزحام ويرفع رضا العميل.`, tone: 'green' as const }
      : { title: 'لا يوجد تسليم متوقف', description: 'عند ظهور سيارة جاهزة خليها أعلى أولوية حتى لا تتكدس منطقة الخروج.', tone: 'slate' as const },
    stuckItems.length > 0
      ? { title: 'تأخير يحتاج تدخل', description: `${stuckItems.length} سيارة تجاوزت ساعة في المسار. راجع العامل أو الخدمة الآن.`, tone: 'red' as const }
      : { title: 'المسار بدون تأخير خطير', description: 'لا توجد سيارات متأخرة أكثر من ساعة. استمر بنفس الوتيرة.', tone: 'green' as const },
    avgMinutes > 0
      ? { title: 'متوسط مدة الخدمة', description: `متوسط السيارات المسلمة اليوم ${avgMinutes} دقيقة. الهدف المثالي للمغسلة السريعة 20-35 دقيقة.`, tone: avgMinutes > 45 ? 'amber' as const : 'blue' as const }
      : { title: 'ابدأ بقياس الوقت', description: 'بعد أول تسليم سيظهر متوسط مدة الخدمة تلقائياً لمراقبة أداء اليوم.', tone: 'blue' as const },
  ]
  const lastSyncLabel = lastSyncAt
    ? new Date(lastSyncAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    : 'لم يتم التحديث بعد'


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
        {pendingApprovalItems.length > 0 && (
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-1" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.35)' }}>
            <span className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold font-sora flex-shrink-0" style={{ background: '#F59E0B', color: '#fff' }}>
              {pendingApprovalItems.length}
            </span>
            <p className="text-sm font-bold font-tajawal" style={{ color: '#92400E' }}>
              {pendingApprovalItems.length === 1 ? 'سيارة تنتظر اعتمادك' : `${pendingApprovalItems.length} سيارات تنتظر اعتمادك`} — اضغط "اعتماد السيارة" في البطاقة لإدخالها للمسار
            </p>
          </div>
        )}
        {stuckItems.length > 0 && (
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-1" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <span className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold font-sora flex-shrink-0" style={{ background: '#EF4444', color: '#fff' }}>
              {stuckItems.length}
            </span>
            <p className="text-sm font-bold font-tajawal" style={{ color: '#B91C1C' }}>
              {stuckItems.length === 1
                ? `سيارة "${stuckItems[0].customer_name}" في المسار أكثر من ساعة — تحقق منها`
                : `${stuckItems.length} سيارات في المسار أكثر من ساعة — تحقق منها`}
            </p>
          </div>
        )}
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold font-cairo text-emerald-600">مركز تشغيل اليوم</p>
            <h1 className="mt-2 text-2xl md:text-3xl font-bold font-cairo" style={{ color: '#0D1B3E' }}>مسار السيارات السريع</h1>
            <p className="mt-2 text-sm md:text-base font-tajawal leading-7" style={{ color: '#415169' }}>
              أربع خطوات واضحة للموظف: استلام، قيد الخدمة، جاهزة، ثم تسليم. كل سيارة تتحرك بزر واحد بدون تفاصيل زائدة.
            </p>
            <p className="mt-2 text-xs font-bold font-tajawal" style={{ color: '#64748B' }}>
              آخر تحديث: {lastSyncLabel}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => companyId && loadItems(companyId)}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold font-tajawal transition-transform hover:-translate-y-0.5"
              style={{ background: '#FFFFFF', color: '#0D1B3E', border: '1px solid rgba(0,191,255,0.28)' }}
            >
              <RefreshCw size={16} />
              تحديث
            </button>
            <button
              onClick={openAdd}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-slate-950 font-tajawal transition-transform hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #D9F99D, #34D399)' }}
            >
              <Plus size={17} />
              إضافة سيارة
            </button>
          </div>
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

      <ClientInsightPanel
        title="أولويات التشغيل الآن"
        description="هذه التوصيات مصممة لتقليل ضغط الموظف وتسريع خروج السيارات بدون متابعة يدوية طويلة."
        items={queueInsights}
      />

      {queueNotice && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.28)' }}>
          <Check size={18} style={{ color: '#059669' }} />
          <p className="text-sm font-bold font-tajawal" style={{ color: '#047857' }}>{queueNotice}</p>
        </div>
      )}

      {queueError && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.28)' }}>
          <AlertTriangle size={18} style={{ color: '#DC2626' }} />
          <p className="text-sm font-bold font-tajawal" style={{ color: '#B91C1C' }}>{queueError}</p>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-4 lg:grid-cols-2">
        {FAST_LANES.map(lane => {
          const allCars = laneItems(lane)
          const cars = lane.key === 'delivered' ? allCars.slice(-5) : allCars
          return (
            <section
              key={lane.key}
              className="min-h-[420px] rounded-2xl p-3"
              style={{ background: lane.bg, border: '1px solid ' + lane.color + '28', borderTop: '3px solid ' + lane.color }}
            >
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2">
                  <div>
                    <h2 className="text-sm font-bold font-cairo" style={{ color: lane.color }}>{lane.label}</h2>
                    <p className="text-xs text-slate-400 font-tajawal">{lane.eyebrow}</p>
                  </div>
                </div>
                <span className="rounded-full px-2.5 py-1 text-xs font-bold font-sora" style={{ color: lane.color, background: '#FFFFFF', border: '1px solid ' + lane.color + '30' }}>
                  {allCars.length}
                </span>
              </div>

              <div
                className="space-y-3"
                style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 280px)', paddingBottom: 8, paddingRight: 2 }}
              >
                {cars.map(item => (
                  <div
                    key={item.id}
                    className="rounded-xl p-3.5 transition-transform hover:-translate-y-0.5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,191,255,0.18)', boxShadow: '0 4px 20px rgba(13,27,62,0.09)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg px-2 py-1 text-xs font-black font-sora" style={{ color: '#FFFFFF', background: lane.color }}>
                            {getDailyTicketCode(items, item.id)}
                          </span>
                          <p className="truncate text-base font-bold font-cairo" style={{ color: '#0D1B3E' }}>{item.customer_name}</p>
                        </div>
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
                        <span className="rounded-full px-2.5 py-1 text-xs font-medium font-tajawal" style={{ color: lane.color, background: '#FFFFFF', border: '1px solid ' + lane.color + '30' }}>
                          {item.service_name}
                        </span>
                      )}
                      {item.is_free_wash && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-tajawal" style={{ color: '#D97706', background: '#FFFBEB', border: '1px solid #FCD34D50' }}>
                          <Gift size={11} /> مجانية
                        </span>
                      )}
                      {isSelfCheckinPending(item.notes) && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-tajawal" style={{ color: '#B45309', background: '#FFFBEB', border: '1px solid #FCD34D70' }}>
                          بانتظار اعتماد الموظف
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-slate-400 font-tajawal">القيمة</p>
                        <p className="mt-1 font-semibold font-sora" style={{ color: '#0F172A' }}>{item.is_free_wash ? '0' : (item.total_amount ?? item.price ?? 0)} ر.س</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-tajawal">الوقت</p>
                        <p className="mt-1 inline-flex items-center gap-1 font-sora" style={{ color: '#0F172A' }}><Clock size={11} />{elapsed(item.created_at)}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-slate-400 font-tajawal">الموظف</p>
                        <p className="mt-1 truncate font-tajawal" style={{ color: '#0F172A' }}>{item.worker ? (item.worker as { name: string }).name : 'غير محدد'}</p>
                      </div>
                    </div>

                    {lane.key === 'ready' && item.phone && (company as any)?.cw_automations?.car_ready?.enabled !== false && (
                      <p className="mt-3 rounded-lg px-3 py-2 text-xs text-emerald-300 font-tajawal" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}>
                        تم إشعار العميل عبر واتساب
                      </p>
                    )}

                    {workerRequiredId === item.id && (
                      <div className="mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-xs font-tajawal" style={{ color: '#B45309', background: '#FFFBEB', border: '1px solid #FCD34D70' }}>
                        <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                        <span>حدد الموظف المسؤول قبل تحريك السيارة حتى تظهر في الأداء والإغلاق.</span>
                      </div>
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
                        {isSelfCheckinPending(item.notes) ? 'اعتماد السيارة' : lane.actionLabel}
                      </button>
                    )}
                  </div>
                ))}

                {cars.length === 0 && (
                  <div
                    className="flex h-40 flex-col items-center justify-center rounded-xl text-center"
                    style={{ background: '#FFFFFF', border: '1px dashed #CBD5E1' }}
                  >
                    <Car size={22} style={{ color: '#CBD5E1' }} />
                    <p className="mt-2 text-sm font-tajawal" style={{ color: '#94A3B8' }}>لا توجد سيارات</p>
                  </div>
                )}
                {lane.key === 'delivered' && allCars.length > 5 && (
                  <p className="text-center font-tajawal" style={{ fontSize: 11, color: '#94A3B8', padding: '4px 0 2px' }}>
                    + {allCars.length - 5} سيارة مسلّمة سابقاً
                  </p>
                )}
              </div>
            </section>
          )
        })}
      </div>

      {activeItems.length === 0 && (
        <div
          className="flex flex-col items-center justify-center h-40 gap-3"
          style={{ background: '#FAFAFA', border: '1px solid #E2E8F0', borderRadius: 16 }}
        >
          <Car size={32} className="text-slate-700" />
          <p className="text-slate-500 font-tajawal text-sm">لا توجد سيارات في قائمة اليوم</p>
          <button onClick={openAdd} className="text-emerald-300 text-sm font-tajawal underline">أضف أول سيارة</button>
        </div>
      )}

      {/* Cancelled today section */}
      {cancelledItems.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
          <button
            onClick={() => setShowCancelled(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-tajawal text-slate-500"
            style={{ background: '#FAFAFA' }}
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
                  style={{ background: '#F8FAFC' }}
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
          <div role="dialog" aria-modal="true" aria-label="Car form" className="w-full max-w-md rounded-2xl overflow-y-auto max-h-[90vh] shadow-2xl" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-900 font-cairo">{editingItem ? 'تعديل السيارة' : 'إضافة سيارة'}</h2>
                <button aria-label="Close dialog" onClick={() => { setShowForm(false); setEditingItem(null); setLoyaltyInfo(null) }} className="text-slate-400 hover:text-slate-900">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                {/* Customer section */}
                {!editingItem ? (
                  <div>
                    <label className="text-xs text-slate-500 font-tajawal mb-1.5 block">العميل *</label>
                    {!showNewCustForm ? (
                      <>
                        {/* Selected customer chip */}
                        {form.customer_name ? (
                          <div className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'rgba(0,191,255,0.08)', border: '1px solid rgba(0,191,255,0.3)' }}>
                            <div>
                              <p className="text-sm font-bold font-tajawal" style={{ color: '#0D1B3E' }}>{form.customer_name}</p>
                              {form.phone && <p className="text-xs font-sora" style={{ color: '#5A6E85' }} dir="ltr">{form.phone}</p>}
                            </div>
                            <button onClick={() => { setForm(f => ({ ...f, customer_name: '', phone: '' })); setLoyaltyInfo(null) }} className="text-slate-400 hover:text-slate-700">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="relative">
                              <input
                                value={custSearchQ}
                                onChange={e => handleCustSearch(e.target.value)}
                                placeholder="ابحث بالاسم أو الجوال..."
                                className="w-full px-4 py-2.5 rounded-xl text-sm font-tajawal text-slate-900 placeholder-slate-400 outline-none focus:border-sky-400"
                                style={{ background: '#F8FAFC', border: '1px solid #CBD5E1' }}
                              />
                              {custSearching && <Loader2 size={14} className="animate-spin absolute left-3 top-3 text-slate-400" />}
                            </div>
                            {custResults.length > 0 && (
                              <div className="mt-1 rounded-xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
                                {custResults.map(c => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => selectCustomer(c)}
                                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-tajawal hover:bg-sky-50 transition-colors border-b last:border-b-0"
                                    style={{ borderColor: '#F1F5F9' }}
                                  >
                                    <span className="font-medium" style={{ color: '#0D1B3E' }}>{c.name || 'بدون اسم'}</span>
                                    <span className="text-xs font-sora" style={{ color: '#64748B' }} dir="ltr">{c.phone}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => setShowNewCustForm(true)}
                              className="mt-2 flex items-center gap-1 text-xs font-tajawal"
                              style={{ color: '#0EA5E9' }}
                            >
                              <Plus size={12} /> إضافة عميل جديد
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-tajawal" style={{ color: '#5A6E85' }}>بيانات العميل الجديد</span>
                          <button type="button" onClick={() => setShowNewCustForm(false)} className="text-xs font-tajawal" style={{ color: '#0EA5E9' }}>رجوع للبحث</button>
                        </div>
                        <div className="space-y-2">
                          <input
                            value={form.customer_name}
                            onChange={e => setForm(f => ({ ...f, customer_name: sanitizeNameText(e.target.value) }))}
                            placeholder="الاسم"
                            type="text"
                            className="w-full px-4 py-2.5 rounded-xl text-sm font-tajawal text-slate-900 placeholder-slate-400 outline-none"
                            style={{ background: '#F8FAFC', border: '1px solid #CBD5E1' }}
                          />
                          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,191,255,0.28)' }}>
                            <span className="flex items-center px-3 text-sm font-bold font-sora select-none" style={{ background: 'rgba(0,191,255,0.12)', color: '#1565C0', borderLeft: '1px solid rgba(0,191,255,0.22)', flexShrink: 0 }} dir="ltr">966</span>
                            <input
                              value={form.phone.replace(/^966/, '')}
                              onChange={e => {
                                const digits = e.target.value.replace(/\D/g, '').slice(0, 9)
                                setForm(f => ({ ...f, phone: '966' + digits }))
                              }}
                              onBlur={() => lookupPhone(form.phone)}
                              placeholder="5xxxxxxxx"
                              className="flex-1 px-3 py-2.5 text-sm font-sora outline-none"
                              style={{ background: 'transparent', color: '#0D1B3E' }}
                              dir="ltr" maxLength={9} inputMode="numeric"
                            />
                          </div>
                        </div>
                      </>
                    )}
                    {loyaltyLoading && <p className="text-xs text-slate-500 font-tajawal mt-1">جاري البحث...</p>}
                    {!loyaltyLoading && loyaltyInfo && loyaltyInfo.free_washes_available > 0 && (
                      <div className="mt-2 px-3 py-2 rounded-lg flex items-center gap-2" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }}>
                        <Gift size={14} className="text-amber-400 flex-shrink-0" />
                        <p className="text-xs text-amber-400 font-tajawal flex-1">العميل مستحق غسلة مجانية ✨</p>
                        <button
                          onClick={() => {
                            const sel = services.filter(s => form.service_ids.includes(s.id))
                            const tot = sel.reduce((sum, svc) => sum + Number(svc.price || 0), 0)
                            setForm(f => ({ ...f, is_free_wash: !f.is_free_wash, price: !f.is_free_wash ? '0' : (tot > 0 ? String(tot) : f.price) }))
                          }}
                          className="text-xs font-tajawal px-2 py-0.5 rounded-lg transition-all"
                          style={{ background: form.is_free_wash ? 'rgba(245,158,11,0.3)' : 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.4)' }}
                        >
                          {form.is_free_wash ? '✓ مجانية' : 'تفعيل'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-xs text-slate-500 font-tajawal mb-1.5 block">اسم العميل *</label>
                      <input
                        value={form.customer_name}
                        onChange={e => setForm(f => ({ ...f, customer_name: sanitizeNameText(e.target.value) }))}
                        placeholder="اسم العميل"
                        type="text"
                        className="w-full px-4 py-2.5 rounded-xl text-sm font-tajawal text-slate-900 placeholder-slate-400 outline-none focus:border-sky-400"
                        style={{ background: '#F8FAFC', border: '1px solid #CBD5E1' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 font-tajawal mb-1.5 block">رقم الجوال</label>
                      <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,191,255,0.28)' }}>
                        <span className="flex items-center px-3 text-sm font-bold font-sora select-none" style={{ background: 'rgba(0,191,255,0.12)', color: '#1565C0', borderLeft: '1px solid rgba(0,191,255,0.22)', flexShrink: 0 }} dir="ltr">966</span>
                        <input
                          value={form.phone.replace(/^966/, '')}
                          onChange={e => {
                            const digits = e.target.value.replace(/\D/g, '').slice(0, 9)
                            setForm(f => ({ ...f, phone: '966' + digits }))
                          }}
                          onBlur={() => lookupPhone(form.phone)}
                          placeholder="5xxxxxxxx"
                          className="flex-1 px-3 py-2.5 text-sm font-sora outline-none"
                          style={{ background: 'transparent', color: '#0D1B3E' }}
                          dir="ltr" maxLength={9} inputMode="numeric"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 font-tajawal mb-1.5 block">نوع السيارة</label>
                    <input
                      value={form.car_type}
                      onChange={e => setForm(f => ({ ...f, car_type: sanitizeNameText(e.target.value) }))}
                      placeholder="تويوتا، هيونداي..."
                      type="text"
                      className="w-full px-4 py-2.5 rounded-xl text-sm font-tajawal text-slate-900 placeholder-slate-400 outline-none focus:border-sky-400"
                      style={{ background: '#F8FAFC', border: '1px solid #CBD5E1' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-tajawal mb-1.5 block">رقم اللوحة</label>
                    <input
                      value={form.plate}
                      onChange={e => setForm(f => ({ ...f, plate: e.target.value }))}
                      placeholder="أ ب ج 1234"
                      className="w-full px-4 py-2.5 rounded-xl text-sm font-tajawal text-slate-900 placeholder-slate-400 outline-none focus:border-sky-400"
                      style={{ background: '#F8FAFC', border: '1px solid #CBD5E1' }}
                    />
                  </div>
                </div>

                {/* Service */}
                <div>
                  <label className="text-xs text-slate-500 font-tajawal mb-1.5 block">الخدمات</label>
                  {services.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {services.map(service => {
                        const active = form.service_ids.includes(service.id)
                        return (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => toggleFormService(service)}
                            className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-right transition-all"
                            style={{
                              background: active ? 'rgba(0,191,255,0.12)' : '#F8FAFC',
                              border: `1px solid ${active ? 'rgba(0,191,255,0.35)' : '#CBD5E1'}`,
                              color: active ? '#0369A1' : '#0F172A',
                            }}
                          >
                            <span className="min-w-0">
                              <strong className="block truncate text-sm font-bold font-tajawal">{service.name}</strong>
                              <small className="block text-xs font-sora">{Number(service.price || 0).toLocaleString()} ر.س</small>
                            </span>
                            <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-lg" style={{ background: active ? '#00BFFF' : '#E2E8F0', color: active ? '#fff' : '#64748B' }}>
                              {active ? <Check size={13} /> : <Plus size={13} />}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <input
                      value={form.service_name}
                      onChange={e => setForm(f => ({ ...f, service_name: sanitizeNameText(e.target.value) }))}
                      placeholder="غسيل عادي، بريميوم..."
                      type="text"
                      className="w-full px-4 py-2.5 rounded-xl text-sm font-tajawal text-slate-900 placeholder-slate-400 outline-none focus:border-sky-400"
                      style={{ background: '#F8FAFC', border: '1px solid #CBD5E1' }}
                    />
                  )}
                </div>

                <div>
                  <label className="text-xs text-slate-500 font-tajawal mb-1.5 block">الموظف</label>
                  <select
                    value={form.worker_id}
                    onChange={e => setForm(f => ({ ...f, worker_id: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm font-tajawal text-slate-900 outline-none focus:border-sky-400"
                    style={{ background: '#F8FAFC', border: '1px solid #CBD5E1' }}
                  >
                    <option value="">بدون تعيين</option>
                    {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs text-slate-500 font-tajawal mb-1.5 block">ملاحظات</label>
                  <input
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="أي ملاحظات إضافية..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm font-tajawal text-slate-900 placeholder-slate-400 outline-none focus:border-sky-400"
                    style={{ background: '#F8FAFC', border: '1px solid #CBD5E1' }}
                  />
                </div>
              </div>

              {/* Mini invoice */}
              {form.price && Number(form.price) > 0 && (() => {
                const price = Number(form.price)
                const vat = calcVAT(price, company?.tax_enabled ?? true, 15, true)
                return (
                  <div className="mt-4 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,191,255,0.22)' }}>
                    <div className="px-4 py-2" style={{ background: 'rgba(0,191,255,0.08)', borderBottom: '1px solid rgba(0,191,255,0.15)' }}>
                      <p className="text-xs font-bold font-cairo" style={{ color: '#1565C0' }}>ملخص الفاتورة</p>
                    </div>
                    <div className="px-4 py-3 space-y-2" style={{ background: 'rgba(255,255,255,0.96)' }}>
                      {form.service_name && (
                        <div className="flex justify-between text-xs font-tajawal">
                          <span style={{ color: '#5A6E85' }}>{form.service_name}</span>
                          <span style={{ color: '#0D1B3E' }}>{vat.subtotal.toFixed(2)} ر.س</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs font-tajawal">
                        <span style={{ color: '#5A6E85' }}>ضريبة القيمة المضافة (15%)</span>
                        <span style={{ color: '#0D1B3E' }}>{vat.vat_amount.toFixed(2)} ر.س</span>
                      </div>
                      <div className="pt-2 flex justify-between font-tajawal font-bold" style={{ borderTop: '1px dashed rgba(0,191,255,0.3)' }}>
                        <span style={{ color: '#0D1B3E', fontSize: 13 }}>الإجمالي</span>
                        <span style={{ color: '#1565C0', fontSize: 15 }}>{vat.total_amount.toFixed(2)} ر.س</span>
                      </div>
                    </div>
                  </div>
                )
              })()}

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => { setShowForm(false); setEditingItem(null); setLoyaltyInfo(null) }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-tajawal text-slate-600"
                  style={{ background: '#F8FAFC', border: '1px solid #CBD5E1' }}
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
          <div role="dialog" aria-modal="true" aria-label="Confirm delivery" className="w-full max-w-sm rounded-2xl p-6" style={{ background: '#0D1422', border: '1px solid #CBD5E1' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white font-cairo">تأكيد التسليم</h2>
              <button aria-label="Close dialog" onClick={() => setDeliverModal(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            <div className="mb-4 p-3 rounded-xl space-y-1" style={{ background: '#FFFFFF' }}>
              <p className="text-sm font-bold text-slate-950 font-cairo">{deliverModal.customer_name}</p>
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
              const vat = calcVAT(price, company?.tax_enabled ?? true, 15, true)
              return (
                <div className="mb-4 space-y-1.5 p-3 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
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
                        <span className="text-slate-900">الإجمالي</span>
                        <span className="text-emerald-400">0 ر.س</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-xs font-tajawal">
                        <span className="text-slate-500">قبل الضريبة</span>
                        <span className="text-slate-300">{vat.subtotal.toFixed(2)} ر.س</span>
                      </div>
                      <div className="flex justify-between text-xs font-tajawal">
                        <span className="text-slate-500">ضريبة 15%</span>
                        <span className="text-slate-300">{vat.vat_amount.toFixed(2)} ر.س</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold font-cairo pt-1 border-t border-white/5">
                        <span className="text-slate-900">الإجمالي</span>
                        <span className="text-emerald-400">{vat.total_amount.toFixed(2)} ر.س</span>
                      </div>
                    </>
                  )}
                </div>
              )
            })()}

            {/* Payment method selector */}
            {!deliverModal.is_free_wash && (
              <div className="mb-5">
                <p className="text-xs text-slate-400 font-tajawal mb-2">طريقة الدفع</p>
                <div className="grid grid-cols-3 gap-2">
                  {QUEUE_PAYMENT_BUTTONS.map(pm => (
                    <button
                      key={pm.value}
                      onClick={() => setSelectedPayment(pm.value)}
                      className="py-2 rounded-xl text-xs font-tajawal font-medium transition-all"
                      style={{
                        background: selectedPayment === pm.value ? 'rgba(99,102,241,0.3)' : '#FFFFFF',
                        border: `1px solid ${selectedPayment === pm.value ? '#6366F1' : '#E2E8F0'}`,
                        color: selectedPayment === pm.value ? '#A5B4FC' : '#94A3B8',
                      }}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {deliveryError && (
              <p className="mb-3 rounded-xl px-3 py-2 text-xs font-bold text-amber-200 font-tajawal" style={{ background: 'rgba(245,158,11,0.14)', border: '1px solid rgba(245,158,11,0.32)' }}>
                {deliveryError}
              </p>
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
          <div role="dialog" aria-modal="true" aria-label="Cancel car confirmation" className="w-full max-w-xs rounded-2xl p-6" style={{ background: '#0D1422', border: '1px solid #CBD5E1' }}>
            <h2 className="text-base font-bold text-white font-cairo mb-2">إلغاء السيارة</h2>
            <p className="text-sm text-slate-400 font-tajawal mb-5">هل أنت متأكد من إلغاء هذه السيارة من القائمة؟</p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelConfirm(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-tajawal text-slate-400"
                style={{ background: '#FFFFFF', border: '1px solid #CBD5E1' }}
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

      {/* Invoice modal */}
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
          }}
          onClose={() => setInvoiceData(null)}
        />
      )}
    </div>
  )
}
