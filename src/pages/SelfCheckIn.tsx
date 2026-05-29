import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, ExternalLink, Loader2, Phone, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { calcVAT } from '../lib/vatUtils'
import { getDailyTicketCode } from '../lib/carWashTickets'
import { canUseSelfCheckin, getSelfCheckinSettings, markSelfCheckinNotes } from '../lib/selfCheckin'
import type { Company, CWService, Plan } from '../types'

const N8N_REGISTER_WEBHOOK = 'https://keepcalm.app.n8n.cloud/webhook/cw-registration'

type CheckinCompany = Pick<Company,
  'id' | 'name' | 'business_type' | 'industry' | 'status' | 'webhook_token' |
  'tax_enabled' | 'vat_rate' | 'price_includes_vat' | 'cw_loyalty_threshold' | 'plan'
> & {
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
}

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  phone: '',
  plate: '',
  service_id: '',
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
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [step, setStep] = useState<'phone' | 'details'>('phone')
  const [knownCustomer, setKnownCustomer] = useState<KnownCustomer | null>(null)
  const [checkingPhone, setCheckingPhone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [ticketCode, setTicketCode] = useState('')
  const [queueId, setQueueId] = useState('')
  const [approvalPending, setApprovalPending] = useState(false)
  const [submitError, setSubmitError] = useState('')

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
          .select('id, name, business_type, industry, status, webhook_token, tax_enabled, vat_rate, price_includes_vat, cw_loyalty_threshold, plan, cw_automations')
          .eq('webhook_token', token)
          .maybeSingle()
        companyData = direct.data
        companyError = direct.error

        if (!companyData) {
          const fallback = await supabase
            .from('companies')
            .select('id, name, business_type, industry, status, webhook_token, tax_enabled, vat_rate, price_includes_vat, cw_loyalty_threshold, plan, cw_automations')
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

      const { data: serviceData } = await supabase
        .rpc('get_public_checkin_services', { checkin_token: token })

      setCompany(co)
      setServices((serviceData || []) as CWService[])
      setLoading(false)
    }

    load()
  }, [token])

  const selectedService = services.find(service => service.id === form.service_id) || null
  const vat = useMemo(() => {
    const price = selectedService?.price || 0
    return calcVAT(price, !!company?.tax_enabled, company?.vat_rate || 15, !!company?.price_includes_vat)
  }, [company, selectedService])

  const lookupCustomer = async () => {
    if (!company || checkingPhone) return
    setSubmitError('')
    if (!isValidSaudiMobile(form.phone)) {
      setSubmitError('اكتب رقم جوال سعودي صحيح مثل 05XXXXXXXX.')
      return
    }

    setCheckingPhone(true)
    const phone = normalizePhone(form.phone)
    let customer: KnownCustomer | null = null

    const edgeResult = await callCheckinFunction({ action: 'lookup_customer', token, phone })
    if (edgeResult?.customer) customer = edgeResult.customer as KnownCustomer

    if (!customer) {
      const { data } = await supabase
        .from('cw_customers')
        .select('id, name, total_visits, free_washes_available')
        .eq('company_id', company.id)
        .eq('phone', phone)
        .maybeSingle()
      customer = data as KnownCustomer | null
    }

    if (customer?.id) {
      const name = splitName(customer.name)
      setKnownCustomer(customer)
      setForm(current => ({
        ...current,
        first_name: name.first,
        last_name: name.last,
      }))
    } else {
      setKnownCustomer(null)
      setForm(current => ({ ...current, first_name: '', last_name: '' }))
    }
    setStep('details')
    setCheckingPhone(false)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!company || !selectedService || submitting) return

    const phone = normalizePhone(form.phone)
    const firstName = form.first_name.trim()
    const lastName = form.last_name.trim()
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
      plate: form.plate.trim() || null,
      service_id: selectedService.id,
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
        plate: form.plate.trim() || null,
        service_id: selectedService.id,
        service_name: selectedService.name,
        price: selectedService.price,
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
      service: selectedService.name,
      status_url: `${window.location.origin}/status/${token}/${inserted.id}`,
      self_checkin: true,
    })
    setSubmitting(false)
  }

  if (loading) {
    return (
      <main className="self-checkin-page" dir="rtl">
        <div className="self-checkin-state">
          <Loader2 className="animate-spin" size={28} />
          <span>جاري فتح التسجيل الذاتي...</span>
        </div>
      </main>
    )
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
    return (
      <main className="self-checkin-page" dir="rtl">
        <section className="self-checkin-success">
          <img src="/logo-main.png" alt="Madar" />
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

  return (
    <main className="self-checkin-page" dir="rtl">
      <section className="self-checkin-shell">
        <div className="self-checkin-intro">
          <img src="/logo-main.png" alt="Madar" />
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
            <strong>{step === 'phone' ? 'ابدأ برقم الجوال' : knownCustomer ? 'أهلًا بعودتك' : 'بيانات سريعة'}</strong>
          </div>

          {step === 'phone' ? (
            <>
              <label>
                رقم الجوال السعودي
                <input
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  required
                  inputMode="tel"
                  placeholder="05XXXXXXXX"
                  dir="ltr"
                />
              </label>
              {submitError && <p className="self-checkin-error">{submitError}</p>}
              <button type="button" onClick={lookupCustomer} disabled={checkingPhone}>
                {checkingPhone ? <Loader2 className="animate-spin" size={18} /> : <Phone size={18} />}
                متابعة
              </button>
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

              {!knownCustomer && (
                <div className="self-checkin-two">
                  <label>
                    الاسم الأول
                    <input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required placeholder="مثال: أحمد" />
                  </label>
                  <label>
                    الاسم الأخير
                    <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} required placeholder="مثال: الحربي" />
                  </label>
                </div>
              )}

              <label>
                لوحة السيارة <span className="self-checkin-optional">اختياري</span>
                <input value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value })} placeholder="إذا كانت سهلة عليك" />
              </label>

              <div>
                <div className="self-checkin-service-head">
                  <strong>اختر الخدمة</strong>
                  <span>{services.length} خدمات متاحة</span>
                </div>
                <div className="self-checkin-services">
                  {services.map(service => {
                    const active = form.service_id === service.id
                    return (
                      <button
                        key={service.id}
                        type="button"
                        className={active ? 'active' : ''}
                        onClick={() => setForm({ ...form, service_id: service.id })}
                      >
                        <span>{service.name}</span>
                        <strong>{Number(service.price || 0).toFixed(0)} ر.س</strong>
                      </button>
                    )
                  })}
                </div>
              </div>

              {selectedService && (
                <div className="self-checkin-price">
                  <span>الإجمالي</span>
                  <strong>{vat.total_amount.toFixed(2)} ر.س</strong>
                  {company.tax_enabled && <small>حسب إعدادات ضريبة VAT في المغسلة</small>}
                </div>
              )}

              {submitError && <p className="self-checkin-error">{submitError}</p>}

              <button type="submit" disabled={submitting || services.length === 0 || !selectedService}>
                {submitting ? <Loader2 className="animate-spin" size={18} /> : null}
                تسجيل السيارة وإصدار الرقم
              </button>
            </>
          )}
        </form>
      </section>
    </main>
  )
}
