import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { calcVAT } from '../lib/vatUtils'
import { getDailyTicketCode } from '../lib/carWashTickets'
import type { Company, CWService } from '../types'

const N8N_REGISTER_WEBHOOK = 'https://keepcalm.app.n8n.cloud/webhook/cw-registration'

type CheckinCompany = Pick<Company,
  'id' | 'name' | 'business_type' | 'industry' | 'status' | 'webhook_token' |
  'tax_enabled' | 'vat_rate' | 'price_includes_vat' | 'cw_loyalty_threshold'
>

type QueueLite = {
  id: string
  created_at: string
}

const EMPTY_FORM = {
  customer_name: '',
  phone: '',
  car_type: '',
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

export function SelfCheckIn() {
  const { token = '' } = useParams()
  const [company, setCompany] = useState<CheckinCompany | null>(null)
  const [services, setServices] = useState<CWService[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [ticketCode, setTicketCode] = useState('')
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setLoadError('')

      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, name, business_type, industry, status, webhook_token, tax_enabled, vat_rate, price_includes_vat, cw_loyalty_threshold')
        .eq('webhook_token', token)
        .maybeSingle()

      if (companyError || !companyData) {
        setLoadError('رابط التسجيل غير صحيح أو غير مفعل.')
        setLoading(false)
        return
      }

      const co = companyData as CheckinCompany
      if (co.status === 'suspended' || (co.business_type !== 'car_wash' && co.industry !== 'car_wash')) {
        setLoadError('التسجيل الذاتي غير متاح لهذه المنشأة حالياً.')
        setLoading(false)
        return
      }

      const { data: serviceData } = await supabase
        .from('cw_services')
        .select('*')
        .eq('company_id', co.id)
        .eq('active', true)
        .order('created_at')

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

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!company || !selectedService || submitting) return

    const phone = normalizePhone(form.phone)
    if (!phone || phone.length < 12) {
      setSubmitError('اكتب رقم جوال صحيح يبدأ بـ 05 أو 966.')
      return
    }

    setSubmitting(true)
    setSubmitError('')

    const { data: existingCustomer } = await supabase
      .from('cw_customers')
      .select('id')
      .eq('company_id', company.id)
      .eq('phone', phone)
      .maybeSingle()

    if (existingCustomer?.id) {
      await supabase.from('cw_customers').update({ name: form.customer_name.trim() || null }).eq('id', existingCustomer.id)
    } else {
      await supabase.from('cw_customers').insert({
        company_id: company.id,
        phone,
        name: form.customer_name.trim() || null,
        total_visits: 0,
        welcome_sent: true,
      })
      fireRegistration({
        phone,
        customer_name: form.customer_name.trim(),
        company_name: company.name,
        company_id: company.id,
        is_new_customer: true,
      })
    }

    const { data: inserted, error } = await supabase
      .from('cw_queue')
      .insert({
        company_id: company.id,
        customer_name: form.customer_name.trim(),
        phone,
        car_type: form.car_type.trim() || null,
        plate: form.plate.trim() || null,
        service_id: selectedService.id,
        service_name: selectedService.name,
        price: selectedService.price,
        subtotal: vat.subtotal,
        vat_amount: vat.vat_amount,
        total_amount: vat.total_amount,
        status: 'received',
        payment_status: 'unpaid',
        notes: 'Self check-in QR',
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

    setTicketCode(getDailyTicketCode((queueData || []) as QueueLite[], inserted.id))
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
    const displayUrl = `${window.location.origin}/client/queue-display`
    return (
      <main className="self-checkin-page" dir="rtl">
        <section className="self-checkin-success">
          <img src="/logo-main.png" alt="Madar" />
          <CheckCircle2 size={52} />
          <span>{company.name}</span>
          <h1>تم تسجيل سيارتك</h1>
          <div className="self-checkin-ticket">{ticketCode}</div>
          <p>احتفظ بالرقم وتابع حالة سيارتك على شاشة المغسلة.</p>
          <img className="self-checkin-mini-qr" src={qrUrl(displayUrl, 150)} alt="QR" />
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
          <p>سجل سيارتك من الجوال، وخذ رقم تذكرة يظهر مباشرة في لوحة التشغيل وشاشة الانتظار.</p>
          <div className="self-checkin-points">
            <div><Sparkles size={16} /> بدون انتظار عند الكاونتر</div>
            <div><Sparkles size={16} /> رقم واضح لمتابعة السيارة</div>
            <div><Sparkles size={16} /> بياناتك محفوظة للولاء والواتساب</div>
          </div>
        </div>

        <form className="self-checkin-card" onSubmit={submit}>
          <div className="self-checkin-form-head">
            <span>بيانات السيارة</span>
            <strong>ابدأ التسجيل</strong>
          </div>

          <label>
            الاسم
            <input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} required placeholder="اسم العميل" />
          </label>

          <label>
            رقم الجوال
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required inputMode="tel" placeholder="05XXXXXXXX" dir="ltr" />
          </label>

          <div className="self-checkin-two">
            <label>
              نوع السيارة
              <input value={form.car_type} onChange={e => setForm({ ...form, car_type: e.target.value })} placeholder="مثال: كامري" />
            </label>
            <label>
              اللوحة
              <input value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value })} placeholder="اختياري" />
            </label>
          </div>

          <label>
            الخدمة
            <select value={form.service_id} onChange={e => setForm({ ...form, service_id: e.target.value })} required>
              <option value="">اختر الخدمة</option>
              {services.map(service => (
                <option key={service.id} value={service.id}>{service.name} - {service.price} ر.س</option>
              ))}
            </select>
          </label>

          {selectedService && (
            <div className="self-checkin-price">
              <span>الإجمالي</span>
              <strong>{vat.total_amount.toFixed(2)} ر.س</strong>
              {company.tax_enabled && <small>شامل ضريبة VAT حسب إعدادات المغسلة</small>}
            </div>
          )}

          {submitError && <p className="self-checkin-error">{submitError}</p>}

          <button type="submit" disabled={submitting || services.length === 0}>
            {submitting ? <Loader2 className="animate-spin" size={18} /> : null}
            تسجيل السيارة
          </button>
        </form>
      </section>
    </main>
  )
}
