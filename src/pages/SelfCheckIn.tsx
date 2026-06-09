import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, CreditCard, ExternalLink, Loader2, MessageCircle, Phone, RefreshCw, ShieldCheck, Sparkles, UserRound, WalletCards } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { calcVAT } from '../lib/vatUtils'
import { getDailyTicketCode } from '../lib/carWashTickets'
import { canUseSelfCheckin, getSelfCheckinSettings, markSelfCheckinNotes } from '../lib/selfCheckin'
import { sanitizeDigits, sanitizeNameText } from '../lib/formSanitizers'
import { MadarAgentWidget } from '../components/dash/MadarAgentWidget'
import type { Company, CWService, Plan } from '../types'

const N8N_REGISTER_WEBHOOK = 'https://keepcalm.app.n8n.cloud/webhook/cw-registration'
const CHECKIN_SESSION_MS = 60 * 60 * 1000
const CHECKIN_SESSION_PREFIX = 'madar_checkin_session'
const CHECKIN_LAST_PHONE_PREFIX = 'madar_checkin_last_phone'

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

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('966')) return digits
  if (digits.startsWith('0')) return `966${digits.slice(1)}`
  return `966${digits}`
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

function sessionKey(token: string, phone: string) {
  return `${CHECKIN_SESSION_PREFIX}:${token}:${phone}`
}

function lastPhoneKey(token: string) {
  return `${CHECKIN_LAST_PHONE_PREFIX}:${token}`
}

function readCheckinSession(token: string, phone: string) {
  try {
    const stored = sessionStorage.getItem(sessionKey(token, phone))
    if (!stored) return null
    const parsed = JSON.parse(stored) as { verificationToken?: string; expiresAt?: number }
    if (!parsed.verificationToken || !parsed.expiresAt || parsed.expiresAt <= Date.now()) {
      sessionStorage.removeItem(sessionKey(token, phone))
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function readLastCheckinSession(token: string) {
  try {
    const phone = sessionStorage.getItem(lastPhoneKey(token)) || ''
    if (!phone) return null
    const session = readCheckinSession(token, phone)
    return session ? { phone, ...session } : null
  } catch {
    return null
  }
}

function storeCheckinSession(token: string, phone: string, verificationToken: string) {
  try {
    sessionStorage.setItem(lastPhoneKey(token), phone)
    sessionStorage.setItem(sessionKey(token, phone), JSON.stringify({
      verificationToken,
      expiresAt: Date.now() + CHECKIN_SESSION_MS,
    }))
  } catch {
    // Best effort only. OTP still works without browser storage.
  }
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
  const [step, setStep] = useState<'phone' | 'otp' | 'details'>('phone')
  const [knownCustomer, setKnownCustomer] = useState<KnownCustomer | null>(null)
  const [checkingPhone, setCheckingPhone] = useState(false)
  const [restoredSession, setRestoredSession] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [ticketCode, setTicketCode] = useState('')
  const [queueId, setQueueId] = useState('')
  const [approvalPending, setApprovalPending] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [purchaseMode, setPurchaseMode] = useState<'single' | 'membership'>('single')
  const [selectedPlanId, setSelectedPlanId] = useState('')
  // OTP state
  const [sendingOtp, setSendingOtp] = useState(false)
  const [otpInput, setOtpInput] = useState('')
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [verificationToken, setVerificationToken] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

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

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  const continueWithVerifiedSession = async (phone: string, vtk: string, showOtpError = true) => {
    setVerificationToken(vtk)
    const edgeResult = await callCheckinFunction({ action: 'lookup_customer', token, phone, verification_token: vtk })
    if (!edgeResult || edgeResult?.error) {
      if (showOtpError) setOtpError('انتهت جلسة التحقق. اطلب رمزاً جديداً.')
      return false
    }

    const customer = edgeResult?.customer as KnownCustomer | null
    if (customer?.id) {
      const nm = splitName(customer.name)
      setKnownCustomer(customer)
      setForm(f => ({ ...f, phone, first_name: nm.first, last_name: nm.last }))
    } else {
      setKnownCustomer(null)
      setForm(f => ({ ...f, phone, first_name: '', last_name: '' }))
    }
    setStep('details')
    return true
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
    const saved = readLastCheckinSession(token)
    if (!saved) {
      setRestoredSession(true)
      return
    }

    setCheckingPhone(true)
    continueWithVerifiedSession(saved.phone, saved.verificationToken, false)
      .finally(() => {
        setCheckingPhone(false)
        setRestoredSession(true)
      })
  }, [loading, company, restoredSession, ticketCode, token])

  useEffect(() => {
    if (purchaseMode === 'membership' && !selectedPlanId && membershipPlans.length > 0) {
      setSelectedPlanId(membershipPlans[0].id)
    }
  }, [membershipPlans, purchaseMode, selectedPlanId])

  const sendOtp = async () => {
    if (!company || sendingOtp || checkingPhone) return
    setSubmitError('')
    if (!isValidSaudiMobile(form.phone)) {
      setSubmitError('اكتب رقم جوال سعودي صحيح مثل 05XXXXXXXX.')
      return
    }
    const phone = normalizePhone(form.phone)
    const saved = readCheckinSession(token, phone)
    if (saved) {
      setCheckingPhone(true)
      const ok = await continueWithVerifiedSession(phone, saved.verificationToken)
      setCheckingPhone(false)
      if (ok) return
    }

    setSendingOtp(true)
    const result = await callCheckinFunction({ action: 'send_otp', token, phone })
    if (!result) {
      setSubmitError('تعذر الاتصال بخدمة التحقق. حاول مرة أخرى.')
      setSendingOtp(false)
      return
    }
    if (result?.error) {
      const msgs: Record<string, string> = {
        rate_limit_exceeded: 'تجاوزت الحد المسموح. انتظر ساعة وحاول مجدداً.',
        phone_otp_limit: 'طلبت رموزاً كثيرة. انتظر ساعة.',
        self_checkin_disabled: 'التسجيل الذاتي غير مفعّل حالياً.',
      }
      setSubmitError(msgs[result.error] || 'تعذر إرسال الرمز. حاول مجدداً.')
      setSendingOtp(false)
      return
    }
    setOtpInput('')
    setOtpError('')
    setStep('otp')
    setResendCooldown(60)
    setSendingOtp(false)
  }

  const verifyOtp = async () => {
    if (verifyingOtp) return
    setOtpError('')
    if (otpInput.length !== 4) { setOtpError('أدخل الرمز المكوّن من 4 أرقام.'); return }
    setVerifyingOtp(true)
    const result = await callCheckinFunction({ action: 'verify_otp', token, phone: normalizePhone(form.phone), otp: otpInput })
    if (!result) {
      setOtpError('تعذر الاتصال بخدمة التحقق. حاول مرة أخرى.')
      setVerifyingOtp(false)
      return
    }
    if (result?.error || !result?.verified) {
      const msgs: Record<string, string> = {
        otp_invalid: 'الرمز غير صحيح. تحقق من الرسالة النصية.',
        otp_expired: 'انتهت صلاحية الرمز. اطلب رمزاً جديداً.',
        otp_not_found: 'لم يُرسَل رمز. اطلب رمزاً جديداً.',
      }
      setOtpError(msgs[result?.error] || 'تعذر التحقق. حاول مجدداً.')
      setVerifyingOtp(false)
      return
    }
    const vtk: string = result.verification_token
    const phone = normalizePhone(form.phone)
    storeCheckinSession(token, phone, vtk)
    setVerificationToken(vtk)
    // Lookup customer after verified
    const edgeResult = await callCheckinFunction({ action: 'lookup_customer', token, phone, verification_token: vtk })
    if (!edgeResult || edgeResult?.error) {
      setOtpError('تم التحقق من الرمز، لكن تعذر تحميل بيانات العميل. حاول مرة أخرى.')
      setVerifyingOtp(false)
      return
    }
    const customer = edgeResult?.customer as KnownCustomer | null
    if (customer?.id) {
      const nm = splitName(customer.name)
      setKnownCustomer(customer)
      setForm(f => ({ ...f, first_name: nm.first, last_name: nm.last }))
    } else {
      setKnownCustomer(null)
      setForm(f => ({ ...f, first_name: '', last_name: '' }))
    }
    setStep('details')
    setVerifyingOtp(false)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!company || selectedServices.length === 0 || submitting) return

    const phone = normalizePhone(form.phone)
    const firstName = sanitizeNameText(form.first_name).trim()
    const lastName = sanitizeNameText(form.last_name).trim()
    const customerName = [firstName, lastName].filter(Boolean).join(' ').trim()

    if (!isValidSaudiMobile(form.phone)) {
      setSubmitError('اكتب رقم جوال سعودي صحيح مثل 05XXXXXXXX.')
      return
    }
    if (!knownCustomer && (!firstName || !lastName)) {
      setSubmitError('للعميل الجديد اكتب الاسم الأول والاسم الأخير.')
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
      verification_token: verificationToken,
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
      await supabase.from('cw_customers').update({ name: customerName || knownCustomer?.name || null }).eq('id', existingCustomer.id)
    } else {
      await supabase.from('cw_customers').insert({
        company_id: company.id,
        phone,
        name: customerName,
        total_visits: 0,
        welcome_sent: true,
      })
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
            <span>{step === 'phone' ? 'الخطوة 1 من 3' : step === 'otp' ? 'الخطوة 2 من 3' : 'الخطوة 3 من 3'}</span>
            <strong>{step === 'phone' ? 'ابدأ برقم الجوال' : step === 'otp' ? 'تحقق من الرقم' : knownCustomer ? 'أهلًا بعودتك' : 'بيانات سريعة'}</strong>
          </div>

          {step === 'phone' ? (
            <>
              <label>
                رقم الجوال السعودي
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
              <button type="button" onClick={sendOtp} disabled={sendingOtp}>
                {sendingOtp ? <Loader2 className="animate-spin" size={18} /> : <MessageCircle size={18} />}
                {sendingOtp ? 'جاري الإرسال...' : 'إرسال رمز إلى الجوال'}
              </button>
            </>
          ) : step === 'otp' ? (
            <>
              <div style={{ textAlign: 'center', padding: '4px 0 8px' }}>
                <p style={{ margin: 0, fontSize: 14, color: '#475569', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.7 }}>
                  أرسلنا رمز التحقق برسالة نصية إلى<br />
                  <strong style={{ color: '#0F172A', fontFamily: 'Sora, sans-serif', direction: 'ltr', display: 'inline-block' }}>
                    {form.phone}
                  </strong>
                </p>
              </div>
              <label>
                رمز التحقق (4 أرقام)
                <input
                  value={otpInput}
                  onChange={e => { setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4)); setOtpError('') }}
                  inputMode="numeric"
                  placeholder="0000"
                  dir="ltr"
                  style={{ textAlign: 'center', fontSize: 28, fontFamily: 'Sora, sans-serif', fontWeight: 700, letterSpacing: 12 }}
                  autoFocus
                />
              </label>
              {otpError && <p className="self-checkin-error">{otpError}</p>}
              <button type="button" onClick={verifyOtp} disabled={verifyingOtp || otpInput.length !== 4}>
                {verifyingOtp ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                {verifyingOtp ? 'جاري التحقق...' : 'تحقق وتابع'}
              </button>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: -4 }}>
                <button type="button" onClick={() => { setStep('phone'); setOtpError(''); setOtpInput('') }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', padding: 0 }}>
                  تغيير الرقم
                </button>
                <button type="button" onClick={sendOtp} disabled={resendCooldown > 0 || sendingOtp}
                  style={{ background: 'none', border: 'none', cursor: resendCooldown > 0 ? 'default' : 'pointer', fontSize: 13, color: resendCooldown > 0 ? '#94A3B8' : '#0099CC', fontFamily: 'Tajawal, sans-serif', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <RefreshCw size={13} />
                  {resendCooldown > 0 ? `إعادة الإرسال (${resendCooldown}ث)` : 'إعادة إرسال الرمز'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={`self-checkin-customer ${knownCustomer ? 'known' : ''}`}>
                <UserRound size={18} />
                <div>
                  <strong>{knownCustomer ? (knownCustomer.name || 'عميل سابق') : 'عميل جديد'}</strong>
                  <span>{knownCustomer ? `${knownCustomer.total_visits || 0} زيارة سابقة` : 'نحتاج الاسم فقط لأول مرة'}</span>
                </div>
                <button type="button" onClick={() => { setStep('phone'); setSubmitError('') }}>تغيير الرقم</button>
              </div>

              {knownCustomer && (hasActiveMembership || walletBalance > 0 || Number(knownCustomer.free_washes_available || 0) > 0) && (
                <div className="self-checkin-benefits" aria-label="مزايا العميل">
                  {hasActiveMembership && (
                    <div>
                      <WalletCards size={17} />
                      <span>اشتراك نشط</span>
                      <strong>{knownCustomer.active_membership?.plan_name || 'باقة شهرية'} - {knownCustomer.active_membership?.remaining_washes || 0} غسلات متبقية</strong>
                    </div>
                  )}
                  {walletBalance > 0 && (
                    <div>
                      <CreditCard size={17} />
                      <span>رصيد المحفظة</span>
                      <strong>{money(walletBalance)} ر.س{walletCoversSelectedService ? ' يكفي للخدمة المختارة' : ''}</strong>
                    </div>
                  )}
                  {Number(knownCustomer.free_washes_available || 0) > 0 && (
                    <div>
                      <Sparkles size={17} />
                      <span>مكافأة ولاء</span>
                      <strong>{knownCustomer.free_washes_available} غسلة مجانية متاحة</strong>
                    </div>
                  )}
                  <p>سيظهر رقمك مباشرة للفريق، ويتم الخصم من الاشتراك أو المحفظة عند التسليم إذا كانت الميزة مفعلة في المغسلة.</p>
                </div>
              )}

              {!knownCustomer && (
                <div className="self-checkin-two">
                  <label>
                    الاسم الأول
                    <input value={form.first_name} onChange={e => setForm({ ...form, first_name: sanitizeNameText(e.target.value) })} required type="text" placeholder="مثال: أحمد" />
                  </label>
                  <label>
                    الاسم الأخير
                    <input value={form.last_name} onChange={e => setForm({ ...form, last_name: sanitizeNameText(e.target.value) })} required type="text" placeholder="مثال: الحربي" />
                  </label>
                </div>
              )}

              <label>
                لوحة السيارة <span className="self-checkin-optional">اختياري</span>
                <input value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value.replace(/[^\p{L}\d\s-]/gu, '').toUpperCase().slice(0, 12) })} placeholder="إذا كانت سهلة عليك" />
              </label>

              {membershipFeatureEnabled && membershipPlans.length > 0 && (
                <div className="self-checkin-choice">
                  <div className="self-checkin-service-head">
                    <strong>اختر طريقة البداية</strong>
                    <span>غسلة اليوم أو اشتراك شهري</span>
                  </div>
                  <div className="self-checkin-mode-tabs" role="tablist" aria-label="طريقة الشراء">
                    <button type="button" className={purchaseMode === 'single' ? 'active' : ''} onClick={() => setPurchaseMode('single')}>
                      <CreditCard size={17} />
                      غسلة واحدة
                    </button>
                    <button type="button" className={purchaseMode === 'membership' ? 'active' : ''} onClick={() => setPurchaseMode('membership')}>
                      <WalletCards size={17} />
                      اشتراك شهري
                    </button>
                  </div>
                </div>
              )}

              <div>
                <div className="self-checkin-service-head">
                  <strong>{purchaseMode === 'membership' ? 'اختر باقة الاشتراك' : 'اختر الخدمة'}</strong>
                  <span>{purchaseMode === 'membership' ? `${membershipPlans.length} باقات متاحة` : `${services.length} خدمات متاحة`}</span>
                </div>
                {purchaseMode === 'membership' ? (
                  <div className="self-checkin-memberships">
                    {membershipPlans.map(plan => {
                      const active = selectedPlanId === plan.id
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          className={active ? 'active' : ''}
                          onClick={() => setSelectedPlanId(plan.id)}
                        >
                          <span>{plan.name}</span>
                          <strong>{Number(plan.price || 0).toFixed(0)} ر.س / شهر</strong>
                          <small>{plan.washes_per_month} غسلات شهرية</small>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                <div className="self-checkin-services">
                  {services.map(service => {
                    const active = form.service_ids.includes(service.id)
                    return (
                      <button
                        key={service.id}
                        type="button"
                        className={active ? 'active' : ''}
                        onClick={() => toggleService(service)}
                      >
                        <span>{service.name}</span>
                        <strong>{Number(service.price || 0).toFixed(0)} ر.س</strong>
                      </button>
                    )
                  })}
                </div>
                )}
              </div>

              {purchaseMode === 'membership' && selectedPlan && (
                <div className="self-checkin-price membership">
                  <span>الاشتراك المختار</span>
                  <strong>{Number(selectedPlan.price || 0).toFixed(2)} ر.س</strong>
                  <small>{selectedPlan.washes_per_month} غسلات شهريا. الدفع الإلكتروني سيظهر في الخطوة التالية.</small>
                </div>
              )}

              {purchaseMode === 'single' && selectedServices.length > 0 && (
                <div className="self-checkin-price">
                  <span>الإجمالي</span>
                  <strong>{vat.total_amount.toFixed(2)} ر.س</strong>
                  <small>{selectedServiceName}</small>
                  {company.tax_enabled && <small>حسب إعدادات ضريبة VAT في المغسلة</small>}
                </div>
              )}

              {submitError && <p className="self-checkin-error">{submitError}</p>}

              {purchaseMode === 'membership' ? (
                <button type="button" disabled={!selectedPlan} onClick={() => setSubmitError('اختيار الباقة جاهز. الخطوة التالية ستكون ربط الدفع الإلكتروني حتى يشتري العميل الاشتراك مباشرة من الجوال.')}>
                  اختيار الباقة والمتابعة للدفع
                </button>
              ) : (
              <button type="submit" disabled={submitting || services.length === 0 || selectedServices.length === 0}>
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
