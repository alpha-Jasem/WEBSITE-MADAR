import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, CreditCard, ExternalLink, Loader2, Sparkles, UserRound, WalletCards } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { calcVAT } from '../lib/vatUtils'
import { normalizePhone } from '../lib/phoneUtils'
import { getDailyTicketCode } from '../lib/carWashTickets'
import { canUseSelfCheckin, getSelfCheckinSettings, markSelfCheckinNotes } from '../lib/selfCheckin'
import { sanitizeDigits, sanitizeNameText } from '../lib/formSanitizers'
import { MadarAgentWidget } from '../components/dash/MadarAgentWidget'
import type { Company, CWService, Plan } from '../types'

const N8N_REGISTER_WEBHOOK = 'https://keepcalm.app.n8n.cloud/webhook/cw-registration'

type CheckinCompany = Pick<Company,
  'id' | 'name' | 'business_type' | 'industry' | 'status' | 'webhook_token' |
  'tax_enabled' | 'vat_rate' | 'price_includes_vat' | 'cw_loyalty_threshold' | 'plan'
> & {
  logo_url?: string | null
  public_checkin_token?: string | null
  cw_automations?: Record<string, any> | null
}

type QueueLite = {
  id: string
  created_at: string
}

type KnownCustomer = {
  id: string
  name: string | null
  total_visits?: number | null
  free_washes_available?: number | null
  wallet_balance?: number | null
  membership_status?: string | null
  active_membership?: {
    id: string
    plan_name?: string | null
    remaining_washes?: number | null
    ends_at?: string | null
    auto_renew?: boolean | null
  } | null
}

type PublicMembershipPlan = {
  id: string
  name: string
  price: number
  washes_per_month: number
  billing_cycle: string
}

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  phone: '',
  plate: '',
  service_id: '',
  service_ids: [] as string[],
}


function isValidSaudiMobile(value: string) {
  const digits = value.replace(/\D/g, '')
  return /^05\d{8}$/.test(digits) || /^9665\d{8}$/.test(digits)
}

function splitName(name?: string | null) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  return {
    first: parts[0] || '',
    last: parts.slice(1).join(' '),
  }
}

function qrUrl(value: string, size = 220) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=12&data=${encodeURIComponent(value)}`
}

function money(value: number) {
  return value.toLocaleString('ar-SA', { maximumFractionDigits: 0 })
}


function fireRegistration(body: Record<string, unknown>) {
  fetch(N8N_REGISTER_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => undefined)
}

async function callCheckinFunction(body: Record<string, unknown>) {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL
  if (!baseUrl || baseUrl.includes('placeholder')) return null
  try {
    const response = await fetch(`${baseUrl}/functions/v1/cw-public-checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) return { error: payload.error || 'edge_rejected', anti_spam_minutes: payload.anti_spam_minutes }
    return payload
  } catch {
    return null
  }
}

function edgeErrorMessage(error: string, minutes?: number) {
  const errors: Record<string, string> = {
    duplicate_recent_checkin: `تم تسجيل سيارة بهذا الرقم قبل قليل. انتظر ${minutes || 10} دقائق أو راجع موظف المغسلة.`,
    self_checkin_disabled: 'التسجيل الذاتي غير مفعّل لهذه المغسلة حالياً.',
    plan_locked: 'التسجيل الذاتي غير متاح في باقة هذه المغسلة حالياً.',
    invalid_service: 'الخدمة المختارة غير متاحة حالياً.',
    missing_required_fields: 'أكمل البيانات المطلوبة قبل تسجيل السيارة.',
  }
  return errors[error] || 'تعذر تسجيل السيارة. فضلاً راجع موظف المغسلة.'
}

export function SelfCheckIn() {
  const { token = '' } = useParams()
  const [company, setCompany] = useState<CheckinCompany | null>(null)
  const [services, setServices] = useState<CWService[]>([])
  const [membershipPlans, setMembershipPlans] = useState<PublicMembershipPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [step, setStep] = useState<'phone' | 'details'>('phone')
  const [knownCustomer, setKnownCustomer] = useState<KnownCustomer | null>(null)
  const [checkingPhone, setCheckingPhone] = useState(false)
  const [restoredSession, setRestoredSession] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [ticketCode, setTicketCode] = useState('')
  const [queueId, setQueueId] = useState('')
  const [loyaltyCustomerId, setLoyaltyCustomerId] = useState('')
  const [approvalPending, setApprovalPending] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [purchaseMode, setPurchaseMode] = useState<'single' | 'membership'>('single')
  const [selectedPlanId, setSelectedPlanId] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setLoadError('')

      let companyData: any = null
      let companyError: any = null

      const rpcResult = await supabase.rpc('get_public_checkin_company', { checkin_token: token })
      if (rpcResult.data?.[0]) {
        companyData = rpcResult.data[0]
      } else {
        const direct = await supabase
          .from('companies')
          .select('id, name, logo_url, business_type, industry, status, webhook_token, tax_enabled, vat_rate, price_includes_vat, cw_loyalty_threshold, plan, cw_automations')
          .eq('webhook_token', token)
          .maybeSingle()
        companyData = direct.data
        companyError = direct.error

        if (!companyData) {
          const fallback = await supabase
            .from('companies')
            .select('id, name, logo_url, business_type, industry, status, webhook_token, tax_enabled, vat_rate, price_includes_vat, cw_loyalty_threshold, plan, cw_automations')
            .eq('public_checkin_token', token)
            .maybeSingle()
          companyData = fallback.data
          companyError = fallback.error || companyError
        }
      }

      if (companyError || !companyData) {
        setLoadError('رابط التسجيل غير صحيح أو غير مفعّل.')
        setLoading(false)
        return
      }

      const co = companyData as CheckinCompany
      if (co.status === 'suspended' || (co.business_type !== 'car_wash' && co.industry !== 'car_wash')) {
        setLoadError('التسجيل الذاتي غير متاح لهذه المنشأة حالياً.')
        setLoading(false)
        return
      }

      const settings = getSelfCheckinSettings(co)
      if (!settings.enabled || !canUseSelfCheckin(co.plan as Plan)) {
        setLoadError('التسجيل الذاتي غير مفعّل لهذه المغسلة حالياً.')
        setLoading(false)
        return
      }

      const [{ data: serviceData }, { data: membershipData }] = await Promise.all([
        supabase.rpc('get_public_checkin_services', { checkin_token: token }),
        supabase.rpc('get_public_checkin_membership_plans', { checkin_token: token }),
      ])

      setCompany(co)
      setServices((serviceData || []) as CWService[])
      setMembershipPlans((membershipData || []) as PublicMembershipPlan[])
      setLoading(false)
    }

    load()
  }, [token])

  const selectedServices = services.filter(service => form.service_ids.includes(service.id))
  const selectedService = selectedServices[0] || null
  const selectedServiceName = selectedServices.map(service => service.name).join(' + ')
  const selectedPlan = membershipPlans.find(plan => plan.id === selectedPlanId) || null
  const membershipFeatureEnabled = Boolean((company?.cw_automations as any)?.feature_flags?.memberships)
  const hasActiveMembership = Boolean(knownCustomer?.active_membership && Number(knownCustomer.active_membership.remaining_washes || 0) > 0)
  const walletBalance = Number(knownCustomer?.wallet_balance || 0)
  const vat = useMemo(() => {
    const price = selectedServices.reduce((sum, service) => sum + Number(service.price || 0), 0)
    return calcVAT(price, !!company?.tax_enabled, company?.vat_rate || 15, company?.price_includes_vat !== false)
  }, [company, selectedServices])
  const walletCoversSelectedService = selectedServices.length > 0 ? walletBalance >= vat.total_amount : false

  const toggleService = (service: CWService) => {
    setForm(current => {
      const exists = current.service_ids.includes(service.id)
      const serviceIds = exists
        ? current.service_ids.filter(id => id !== service.id)
        : [...current.service_ids, service.id]
      return {
        ...current,
        service_ids: serviceIds,
        service_id: serviceIds[0] || '',
      }
    })
  }

  const goToDetails = async () => {
    if (!company || checkingPhone) return
    setSubmitError('')
    const firstName = sanitizeNameText(form.first_name).trim()
    const lastName = sanitizeNameText(form.last_name).trim()
    if (!firstName || !lastName) {
      setSubmitError('أدخل الاسم الأول والاسم الأخير.')
      return
    }
    if (!isValidSaudiMobile(form.phone)) {
      setSubmitError('اكتب رقم جوال سعودي صحيح مثل 05XXXXXXXX.')
      return
    }
    const phone = normalizePhone(form.phone)
    setCheckingPhone(true)
    const edgeResult = await callCheckinFunction({ action: 'lookup_customer', token, phone })
    const customer = edgeResult?.customer as KnownCustomer | null
    setKnownCustomer(customer?.id ? customer : null)
    setForm(f => ({ ...f, phone }))
    setCheckingPhone(false)
    setStep('details')
  }

  useEffect(() => {
    if (loading || !company || restoredSession || ticketCode) return
    const previewMode = new URLSearchParams(window.location.search).get('preview')
    if (previewMode === 'memberships') {
      setForm(f => ({ ...f, phone: '966500000000', first_name: 'عميل', last_name: 'تجريبي' }))
      setKnownCustomer(null)
      setPurchaseMode('membership')
      setStep('details')
      setRestoredSession(true)
      return
    }
    setRestoredSession(true)
  }, [loading, company, restoredSession, ticketCode, token])

  useEffect(() => {
    if (purchaseMode === 'membership' && !selectedPlanId && membershipPlans.length > 0) {
      setSelectedPlanId(membershipPlans[0].id)
    }
  }, [membershipPlans, purchaseMode, selectedPlanId])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!company || selectedServices.length === 0 || submitting) return

    const phone = normalizePhone(form.phone)
    const firstName = sanitizeNameText(form.first_name).trim()
    const lastName = sanitizeNameText(form.last_name).trim()
    const customerName = [firstName, lastName].filter(Boolean).join(' ').trim()

    if (!firstName && !lastName && !knownCustomer?.name) {
      setSubmitError('أدخل الاسم.')
      return
    }

    setSubmitting(true)
    setSubmitError('')
    const settings = getSelfCheckinSettings(company)

    const edgeResult = await callCheckinFunction({
      token,
      customer_name: customerName || knownCustomer?.name || `عميل ${phone.slice(-4)}`,
      phone,
      plate: form.plate.trim().toUpperCase() || null,
      service_id: selectedService?.id,
      service_ids: selectedServices.map(service => service.id),
    })

    if (edgeResult?.error) {
      setSubmitError(edgeErrorMessage(String(edgeResult.error), edgeResult.anti_spam_minutes))
      setSubmitting(false)
      return
    }

    if (edgeResult?.queue_id && edgeResult.ticket_code) {
      setTicketCode(edgeResult.ticket_code)
      setQueueId(edgeResult.queue_id)
      setApprovalPending(!!edgeResult.approval_pending)
      if (edgeResult.customer_id) setLoyaltyCustomerId(edgeResult.customer_id)
      else {
        const phone = normalizePhone(form.phone)
        supabase.from('cw_customers').select('id').eq('company_id', company.id).eq('phone', phone).maybeSingle()
          .then(({ data }) => { if (data?.id) setLoyaltyCustomerId(data.id) })
      }
      setSubmitting(false)
      return
    }

    const spamWindow = new Date(Date.now() - settings.antiSpamMinutes * 60 * 1000).toISOString()
    const { data: recentQueue } = await supabase
      .from('cw_queue')
      .select('id')
      .eq('company_id', company.id)
      .eq('phone', phone)
      .gte('created_at', spamWindow)
      .neq('status', 'cancelled')
      .limit(1)

    if (recentQueue && recentQueue.length > 0) {
      setSubmitError(`تم تسجيل سيارة بهذا الرقم قبل قليل. انتظر ${settings.antiSpamMinutes} دقائق أو راجع موظف المغسلة.`)
      setSubmitting(false)
      return
    }

    const { data: existingCustomer } = await supabase
      .from('cw_customers')
      .select('id')
      .eq('company_id', company.id)
      .eq('phone', phone)
      .maybeSingle()

    if (existingCustomer?.id) {
      setLoyaltyCustomerId(existingCustomer.id)
      await supabase.from('cw_customers').update({ name: customerName || knownCustomer?.name || null }).eq('id', existingCustomer.id)
    } else {
      const { data: newCust } = await supabase.from('cw_customers').insert({
        company_id: company.id,
        phone,
        name: customerName,
        total_visits: 0,
        welcome_sent: true,
      }).select('id').single()
      if (newCust?.id) setLoyaltyCustomerId(newCust.id)
      fireRegistration({
        phone,
        customer_name: customerName,
        company_name: company.name,
        company_id: company.id,
        is_new_customer: true,
      })
    }

    const { data: inserted, error } = await supabase
      .from('cw_queue')
      .insert({
        company_id: company.id,
        customer_name: customerName || knownCustomer?.name || `عميل ${phone.slice(-4)}`,
        phone,
        plate: form.plate.trim().toUpperCase() || null,
        service_id: selectedService?.id,
        service_name: selectedServiceName,
        price: selectedServices.reduce((sum, service) => sum + Number(service.price || 0), 0),
        subtotal: vat.subtotal,
        vat_amount: vat.vat_amount,
        total_amount: vat.total_amount,
        status: 'received',
        payment_status: 'unpaid',
        notes: markSelfCheckinNotes(null, settings.approvalRequired),
      })
      .select('id, created_at')
      .single()

    if (error || !inserted) {
      setSubmitError('تعذر تسجيل السيارة. فضلاً راجع موظف المغسلة.')
      setSubmitting(false)
      return
    }

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { data: queueData } = await supabase
      .from('cw_queue')
      .select('id, created_at')
      .eq('company_id', company.id)
      .gte('created_at', todayStart.toISOString())
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true })

    const ticket = getDailyTicketCode((queueData || []) as QueueLite[], inserted.id)
    setTicketCode(ticket)
    setQueueId(inserted.id)
    setApprovalPending(settings.approvalRequired)
    fireRegistration({
      phone,
      customer_name: customerName || knownCustomer?.name,
      company_name: company.name,
      company_id: company.id,
      ticket_code: ticket,
      service: selectedServiceName,
      status_url: `${window.location.origin}/status/${token}/${inserted.id}`,
      self_checkin: true,
    })
    setSubmitting(false)
  }

  if (loading) {
    return <main className="self-checkin-page" dir="rtl" aria-busy="true" />
  }

  if (loadError || !company) {
    return (
      <main className="self-checkin-page" dir="rtl">
        <div className="self-checkin-card self-checkin-state">
          <ShieldCheck size={34} />
          <h1>الرابط غير متاح</h1>
          <p>{loadError}</p>
        </div>
      </main>
    )
  }

  if (ticketCode) {
    const statusUrl = `${window.location.origin}/status/${token}/${queueId}`
    const logoSrc = company.logo_url || '/logo-main.png'
    return (
      <main className="self-checkin-page" dir="rtl">
        <section className="self-checkin-success">
          <img src={logoSrc} alt={company.name} />
          <CheckCircle2 size={52} />
          <span>{company.name}</span>
          <h1>تم تسجيل سيارتك</h1>
          <div className="self-checkin-ticket">{ticketCode}</div>
          <p>{approvalPending ? 'طلبك بانتظار اعتماد الموظف، ثم سيظهر مباشرة في مسار التشغيل.' : 'احتفظ بهذا الرقم. ستتحدث صفحة الحالة مباشرة عند تحريك السيارة.'}</p>
          <Link className="self-checkin-status-link" to={`/status/${token}/${queueId}`}>
            <ExternalLink size={16} />
            متابعة الحالة Live
          </Link>
          {loyaltyCustomerId && (
            <Link className="self-checkin-status-link" to={`/card/${loyaltyCustomerId}`} style={{ marginTop: 8, background: 'linear-gradient(135deg,#0D1B3E,#1e3a5f)', color: '#fff', border: 'none' }}>
              <WalletCards size={16} />
              بطاقة الولاء الخاصة بك
            </Link>
          )}
          <img className="self-checkin-mini-qr" src={qrUrl(statusUrl, 150)} alt="QR" />
        </section>
      </main>
    )
  }

  const logoSrc = company.logo_url || '/logo-main.png'

  return (
    <main className="self-checkin-page" dir="rtl">
      <section className="self-checkin-shell">
        <div className="self-checkin-intro">
          <img src={logoSrc} alt={company.name} />
          <span>تسجيل ذاتي سريع</span>
          <h1>{company.name}</h1>
          <p>اكتب رقم جوالك، اختر الخدمة، وخذ رقم تذكرة Live يظهر للفريق فوراً بدون انتظار عند الكاونتر.</p>
          <div className="self-checkin-points">
            <div><Sparkles size={16} /> رقم التذكرة هو هوية سيارتك داخل المسار</div>
            <div><Sparkles size={16} /> صفحة الحالة تتحدث مباشرة بدون تحديث</div>
            <div><Sparkles size={16} /> لا نحتاج لوحة السيارة أو نوعها للتسجيل السريع</div>
          </div>
        </div>

        <form className="self-checkin-card" onSubmit={submit}>
          <div className="self-checkin-form-head">
            <span>{step === 'phone' ? 'الخطوة 1 من 2' : 'الخطوة 2 من 2'}</span>
            <strong>{step === 'phone' ? 'بياناتك' : 'اختر الخدمة'}</strong>
          </div>

          {step === 'phone' ? (
            <>
              <div className="self-checkin-two">
                <label>
                  الاسم الأول
                  <input value={form.first_name} onChange={e => setForm({ ...form, first_name: sanitizeNameText(e.target.value) })} required type="text" placeholder="مثال: أحمد" autoFocus />
                </label>
                <label>
                  الاسم الأخير
                  <input value={form.last_name} onChange={e => setForm({ ...form, last_name: sanitizeNameText(e.target.value) })} required type="text" placeholder="مثال: الحربي" />
                </label>
              </div>

              <label>
                رقم اللوحة <span className="self-checkin-optional">اختياري</span>
                <input value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value.replace(/[^\p{L}\d\s-]/gu, '').toUpperCase().slice(0, 12) })} placeholder="مثال: ABC 1234" />
              </label>

              <label>
                رقم الجوال
                <input
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: sanitizeDigits(e.target.value, 12) })}
                  required
                  inputMode="numeric"
                  placeholder="05XXXXXXXX"
                  dir="ltr"
                />
              </label>

              {submitError && <p className="self-checkin-error">{submitError}</p>}
              <button type="button" onClick={goToDetails} disabled={checkingPhone}>
                {checkingPhone ? <Loader2 className="animate-spin" size={18} /> : <UserRound size={18} />}
                {checkingPhone ? 'جاري...' : 'التالي — اختيار الخدمة'}
              </button>
            </>
          ) : (
            <>
              <div className="self-checkin-customer known">
                <UserRound size={18} />
                <div>
                  <strong>{[form.first_name, form.last_name].filter(Boolean).join(' ') || knownCustomer?.name || 'عميل'}</strong>
                  <span>{form.phone}{form.plate ? ` · ${form.plate}` : ''}</span>
                </div>
                <button type="button" onClick={() => { setStep('phone'); setSubmitError('') }}>تعديل</button>
              </div>

              {knownCustomer && (hasActiveMembership || walletBalance > 0 || Number(knownCustomer.free_washes_available || 0) > 0) && (
                <div className="self-checkin-benefits" aria-label="مزايا العميل">
                  {hasActiveMembership && (
                    <div>
                      <WalletCards size={17} />
                      <span>اشتراك نشط</span>
                      <strong>{knownCustomer.active_membership?.plan_name || 'باقة شهرية'} · {knownCustomer.active_membership?.remaining_washes || 0} غسلات متبقية</strong>
                    </div>
                  )}
                  {walletBalance > 0 && (
                    <div>
                      <CreditCard size={17} />
                      <span>رصيد المحفظة</span>
                      <strong>{money(walletBalance)} ر.س</strong>
                    </div>
                  )}
                  {Number(knownCustomer.free_washes_available || 0) > 0 && (
                    <div>
                      <Sparkles size={17} />
                      <span>مكافأة ولاء</span>
                      <strong>{knownCustomer.free_washes_available} غسلة مجانية متاحة</strong>
                    </div>
                  )}
                </div>
              )}

              {membershipFeatureEnabled && membershipPlans.length > 0 && (
                <div className="self-checkin-mode-tabs" role="tablist">
                  <button type="button" className={purchaseMode === 'single' ? 'active' : ''} onClick={() => setPurchaseMode('single')}>
                    <CreditCard size={17} /> غسلة واحدة
                  </button>
                  <button type="button" className={purchaseMode === 'membership' ? 'active' : ''} onClick={() => setPurchaseMode('membership')}>
                    <WalletCards size={17} /> اشتراك شهري
                  </button>
                </div>
              )}

              <div>
                <div className="self-checkin-service-head">
                  <strong>{purchaseMode === 'membership' ? 'اختر باقة الاشتراك' : 'اختر الخدمة'}</strong>
                  <span>{purchaseMode === 'membership' ? `${membershipPlans.length} باقات` : `${services.length} خدمات`}</span>
                </div>
                {purchaseMode === 'membership' ? (
                  <div className="self-checkin-memberships">
                    {membershipPlans.map(plan => (
                      <button key={plan.id} type="button" className={selectedPlanId === plan.id ? 'active' : ''} onClick={() => setSelectedPlanId(plan.id)}>
                        <span>{plan.name}</span>
                        <strong>{Number(plan.price || 0).toFixed(0)} ر.س / شهر</strong>
                        <small>{plan.washes_per_month} غسلات شهرية</small>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="self-checkin-services">
                    {services.map(service => (
                      <button key={service.id} type="button" className={form.service_ids.includes(service.id) ? 'active' : ''} onClick={() => toggleService(service)}>
                        <span>{service.name}</span>
                        <strong>{Number(service.price || 0).toFixed(0)} ر.س</strong>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {purchaseMode === 'single' && selectedServices.length > 0 && (
                <div className="self-checkin-price">
                  <span>الإجمالي</span>
                  <strong>{vat.total_amount.toFixed(2)} ر.س</strong>
                  <small>{selectedServiceName}</small>
                </div>
              )}

              {submitError && <p className="self-checkin-error">{submitError}</p>}

              {purchaseMode === 'membership' ? (
                <button type="button" disabled={!selectedPlan} onClick={() => setSubmitError('اختيار الباقة جاهز. الخطوة التالية ستكون ربط الدفع الإلكتروني.')}>
                  اختيار الباقة والمتابعة للدفع
                </button>
              ) : (
                <button type="submit" disabled={submitting || selectedServices.length === 0}>
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : null}
                  تسجيل السيارة وإصدار الرقم
                </button>
              )}
            </>
          )}
        </form>
      </section>
      <MadarAgentWidget agentType="end_customer" publicToken={token} pageTitle={company?.name || 'التسجيل الذاتي'} compact />
    </main>
  )
}
