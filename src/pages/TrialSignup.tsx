import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, MapPin, Phone, Sparkles, User, Stethoscope, Car } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { sanitizeDigits, sanitizeNameText } from '../lib/formSanitizers'

type BusinessType = 'car_wash' | 'clinic'
type Step = 'type' | 'details' | 'email'

const FIELD_CLASS = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 pr-11 text-sm text-slate-950 outline-none transition-all placeholder:text-slate-400 focus:border-[#00BFFF] focus:ring-4 focus:ring-sky-400/15 font-tajawal'

function normalizeDigits(value: string) {
  return value.replace(/[^\d]/g, '')
}

function errorText(code: string) {
  const map: Record<string, string> = {
    invalid_saudi_phone: 'أدخل رقم جوال سعودي صحيح يبدأ بـ 05 أو 9665.',
    invalid_email: 'أدخل بريد إلكتروني صحيح.',
    company_already_exists: 'يوجد حساب مسجل مسبقاً بنفس البريد أو رقم الجوال.',
    email_already_registered: 'هذا البريد مسجل مسبقاً. استخدم تسجيل الدخول.',
    email_confirmation_send_failed: 'تم إنشاء الحساب، لكن تعذر إرسال بريد التأكيد. اضغط إعادة إرسال أو تواصل معنا.',
    auth_user_create_failed: 'تعذر إنشاء حساب الدخول. ربما البريد مستخدم مسبقاً.',
    company_create_failed: 'تعذر إنشاء المنشأة. تواصل معنا لإكمالها يدوياً.',
    missing_required_fields: 'أكمل البيانات المطلوبة.',
  }
  return map[code] || 'حدث خطأ غير متوقع، حاول مرة أخرى.'
}

const BUSINESS_OPTIONS: { id: BusinessType; icon: typeof Car; label: string; sub: string; color: string; bg: string; border: string; features: string[] }[] = [
  {
    id: 'car_wash',
    icon: Car,
    label: 'مغسلة سيارات',
    sub: 'غسيل، عناية، بولش، تلميع',
    color: '#00BFFF',
    bg: '#E0F7FF',
    border: '#BAE6FD',
    features: ['استقبال وتسليم بـ QR', 'تقارير مالية مع VAT', 'واتساب تلقائي للعملاء'],
  },
  {
    id: 'clinic',
    icon: Stethoscope,
    label: 'عيادة أسنان / طبية',
    sub: 'حجز مواعيد، مرضى، أطباء',
    color: '#4F46E5',
    bg: '#EEF2FF',
    border: '#C7D2FE',
    features: ['حجز مواعيد واتساب', 'إدارة المرضى والأطباء', 'مساعد ذكي 24/7 (Pro)'],
  },
]

export function TrialSignup() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('type')
  const [businessType, setBusinessType] = useState<BusinessType | null>(null)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    company_name: '',
    owner_name: '',
    city: '',
    phone: '',
    email: '',
    password: '',
  })

  const phone = useMemo(() => normalizeDigits(form.phone), [form.phone])

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setError('')
    const rawValue = event.target.value
    const value =
      key === 'phone' ? sanitizeDigits(rawValue, 12) :
      key === 'company_name' || key === 'owner_name' || key === 'city' ? sanitizeNameText(rawValue) :
      rawValue
    setForm(current => ({ ...current, [key]: value }))
  }

  const callTrialSignup = async (body: Record<string, unknown>) => {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trial-signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'request_failed')
    return data
  }

  const resendConfirmationEmail = async () => {
    const email = form.email.trim().toLowerCase()
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (resendError) throw new Error('email_confirmation_send_failed')
  }

  const submitSignup = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.company_name.trim() || !form.owner_name.trim() || !form.email.trim() || form.password.length < 8) {
      setError('أكمل اسم المنشأة، اسم المالك، البريد، وكلمة مرور من 8 أحرف على الأقل.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await callTrialSignup({
        action: 'create_email_signup',
        ...form,
        phone,
        email: form.email.trim().toLowerCase(),
        business_type: businessType,
      })

      // Save business_type locally as backup for post-confirmation routing
      localStorage.setItem('madar_signup_business_type', businessType || 'car_wash')

      // Try to update business_type directly (works if RLS allows anon update)
      await supabase
        .from('companies')
        .update({ business_type: businessType })
        .eq('owner_email', form.email.trim().toLowerCase())
        .then(() => {}) // ignore error — edge function may have already set it

      await resendConfirmationEmail()
      setStep('email')
    } catch (err: any) {
      setError(errorText(err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setError('')
    try {
      await resendConfirmationEmail()
    } catch (err: any) {
      setError(errorText(err.message))
    } finally {
      setResending(false)
    }
  }

  const selectedOption = BUSINESS_OPTIONS.find(o => o.id === businessType)

  const STEPS = [
    { key: 'type',    label: 'نوع المنشأة' },
    { key: 'details', label: 'البيانات' },
    { key: 'email',   label: 'تأكيد البريد' },
  ]
  const stepIndex = STEPS.findIndex(s => s.key === step)

  const sidebarFeatures = selectedOption?.features ?? [
    'مغاسل: استقبال وتسليم بـ QR + مالية',
    'عيادات: حجز مواعيد + مساعد ذكي',
    'تأكيد عبر البريد لحماية الحساب',
  ]

  return (
    <div dir="rtl" className="min-h-screen bg-[#F0F4FA] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[minmax(420px,0.9fr)_minmax(520px,1.1fr)]">
        <aside className="relative hidden overflow-hidden bg-[#0D1B3E] p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 opacity-35" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '42px 42px' }} />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 20% 20%, rgba(0,191,255,0.28), transparent 34%), radial-gradient(circle at 85% 78%, rgba(21,101,192,0.34), transparent 38%)' }} />
          <Link to="/" className="relative inline-flex items-center gap-3">
            <img src="/logo-main.png" alt="Madar" className="h-11 w-auto object-contain" />
            <div>
              <p className="font-sora text-xl font-bold text-white">Madar.software</p>
              <p className="mt-1 text-xs font-tajawal text-sky-100/60">مدار OS للمغاسل والعيادات</p>
            </div>
          </Link>

          <div className="relative max-w-md">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-xs font-tajawal text-sky-100">
              <Sparkles size={14} />
              {businessType === 'clinic' ? 'داشبورد عيادة كامل' : businessType === 'car_wash' ? 'تجربة مجانية 3 أيام' : 'ابدأ تجربتك مجاناً'}
            </div>
            <h1 className="font-cairo text-4xl font-bold leading-[1.25] text-white">
              {businessType === 'clinic'
                ? 'حوّل عيادتك إلى نظام حجز ذكي يعمل 24/7.'
                : businessType === 'car_wash'
                  ? 'ابدأ تشغيل مغسلتك اليوم بدون إعدادات معقدة.'
                  : 'اختر منشأتك وابدأ التشغيل فوراً.'}
            </h1>
            <p className="mt-5 font-tajawal text-base leading-8 text-sky-50/70">
              {businessType === 'clinic'
                ? 'نظام حجز المواعيد عبر واتساب، إدارة المرضى والأطباء، ومساعد ذكي يستقبل المكالمات ويحجز مباشرة.'
                  : businessType === 'car_wash'
                  ? 'الحساب يبدأ على باقة Pro التجريبية: QR تسجيل ذاتي، شاشة تشغيل، خدمات جاهزة، مالية، وتقارير.'
                  : 'أنشئ حساب مغسلة أو عيادة كامل، ثم أكد بريدك الإلكتروني للدخول للوحة التشغيل.'}
            </p>
          </div>

          <div className="relative grid gap-3">
            {sidebarFeatures.map(item => (
              <div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-4 py-3">
                <CheckCircle2 size={17} className="text-sky-300" />
                <span className="font-tajawal text-sm text-white/80">{item}</span>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-12">
          <div className="w-full max-w-[500px]">
            <div className="mb-7 flex items-center justify-between gap-4">
              <Link to="/login" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-tajawal text-slate-500 shadow-sm transition-colors hover:text-slate-900">
                <ArrowLeft size={15} />
                لدي حساب
              </Link>
              <div className="flex items-center gap-2 lg:hidden">
                <img src="/logo-main.png" alt="Madar" className="h-9 w-auto object-contain" />
                <span className="font-sora text-lg font-bold text-slate-950">Madar</span>
              </div>
            </div>

            <div className="mb-5">
              <p className="text-sm font-bold text-[#0099CC] font-cairo">ابدأ البيع والتشغيل</p>
              <h2 className="mt-2 text-3xl font-bold tracking-normal text-slate-950 font-cairo">
                إنشاء تجربة مجانية
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 font-tajawal">
                {step === 'type' ? 'اختر نوع منشأتك لنجهز لك اللوحة المناسبة.' : 'أنشئ حسابك ثم أكد بريدك الإلكتروني للدخول.'}
              </p>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
              {/* Steps progress */}
              <div className="mb-6 grid grid-cols-3 gap-2">
                {STEPS.map(({ key, label }, index) => {
                  const done = index < stepIndex
                  const active = index === stepIndex
                  return (
                    <div key={key} className="rounded-xl px-3 py-2 text-center text-xs font-bold font-tajawal flex items-center justify-center gap-1.5"
                      style={{ background: done ? '#ECFDF5' : active ? '#E0F7FF' : '#F8FAFC', color: done ? '#059669' : active ? '#0369A1' : '#94A3B8' }}>
                      {done && <CheckCircle2 size={12} />}
                      {label}
                    </div>
                  )
                })}
              </div>

              {/* Step 0: Business Type */}
              {step === 'type' && (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-slate-700 font-cairo mb-3">ما نوع منشأتك؟</p>
                  <div className="grid grid-cols-2 gap-3">
                    {BUSINESS_OPTIONS.map(opt => {
                      const Icon = opt.icon
                      const selected = businessType === opt.id
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setBusinessType(opt.id)}
                          className="relative flex flex-col items-center gap-3 rounded-2xl border-2 p-5 text-center transition-all duration-200"
                          style={{
                            borderColor: selected ? opt.color : '#E2E8F0',
                            background: selected ? opt.bg : '#FAFAFA',
                            boxShadow: selected ? `0 8px 24px ${opt.color}28` : 'none',
                          }}
                        >
                          {selected && (
                            <div className="absolute top-2.5 left-2.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: opt.color }}>
                              <CheckCircle2 size={12} color="white" />
                            </div>
                          )}
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: selected ? opt.color : '#F1F5F9' }}>
                            <Icon size={22} style={{ color: selected ? 'white' : '#94A3B8' }} />
                          </div>
                          <div>
                            <div className="text-sm font-bold font-cairo" style={{ color: selected ? opt.color : '#0F172A' }}>{opt.label}</div>
                            <div className="text-xs font-tajawal mt-0.5" style={{ color: '#94A3B8' }}>{opt.sub}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={!businessType}
                    onClick={() => setStep('details')}
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-white transition-all disabled:opacity-40 font-cairo mt-4"
                    style={{ background: businessType ? `linear-gradient(135deg, ${selectedOption?.color}, #1565C0)` : '#94A3B8' }}
                  >
                    متابعة
                    <ArrowLeft size={14} />
                  </button>
                </div>
              )}

              {/* Step 1: Details */}
              {step === 'details' && (
                <form onSubmit={submitSignup} className="space-y-4">
                  <div className="flex items-center gap-2 mb-4 p-3 rounded-xl" style={{ background: selectedOption?.bg, border: `1px solid ${selectedOption?.border}` }}>
                    {selectedOption && <selectedOption.icon size={15} style={{ color: selectedOption.color }} />}
                    <span className="text-xs font-bold font-cairo" style={{ color: selectedOption?.color }}>{selectedOption?.label}</span>
                    <button type="button" onClick={() => setStep('type')} className="mr-auto text-xs font-tajawal underline" style={{ color: '#94A3B8' }}>تغيير</button>
                  </div>
                  <Field icon={Building2} label={businessType === 'clinic' ? 'اسم العيادة' : 'اسم المغسلة'} value={form.company_name} onChange={set('company_name')} placeholder={businessType === 'clinic' ? 'مثال: عيادات نور للأسنان' : 'مثال: مغسلة مدار'} />
                  <Field icon={User} label="اسم المالك" value={form.owner_name} onChange={set('owner_name')} placeholder="الاسم الأول والأخير" />
                  <Field icon={MapPin} label="المدينة" value={form.city} onChange={set('city')} placeholder="جدة، الرياض، الدمام..." />
                  <Field icon={Phone} label="رقم الجوال السعودي" value={form.phone} onChange={set('phone')} placeholder="05xxxxxxxx" dir="ltr" inputMode="tel" />
                  <Field icon={Mail} label="البريد الإلكتروني" value={form.email} onChange={set('email')} placeholder="owner@example.com" dir="ltr" type="email" />

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700 font-tajawal">كلمة المرور</label>
                    <div className="relative">
                      <Lock size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={form.password}
                        onChange={set('password')}
                        placeholder="8 أحرف على الأقل"
                        required
                        minLength={8}
                        dir="ltr"
                        className={`${FIELD_CLASS} pl-11 text-left font-sora`}
                      />
                      <button type="button" onClick={() => setShowPass(v => !v)} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                        {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  <Submit loading={loading} text="إرسال رابط التأكيد عبر البريد" loadingText="جاري تجهيز الحساب..." color={selectedOption?.color} />
                </form>
              )}

              {/* Step 2: Email confirmation */}
              {step === 'email' && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                    <div className="flex items-start gap-3">
                      <Mail size={20} className="mt-0.5 text-sky-600" />
                      <div>
                        <p className="text-sm font-bold text-slate-900 font-cairo">أرسلنا رابط التأكيد إلى بريدك الإلكتروني</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500 font-tajawal">
                          افتح الرسالة على {form.email.trim().toLowerCase()} واضغط رابط التأكيد. بعدها سجل دخولك بنفس البريد وكلمة المرور.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep('details')} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-500 font-tajawal hover:text-slate-900">
                      تعديل البيانات
                    </button>
                    <button type="button" onClick={handleResend} disabled={resending} className="inline-flex items-center gap-2 rounded-xl border border-sky-100 px-5 py-3 text-sm font-bold text-sky-700 font-tajawal hover:bg-sky-50 disabled:opacity-60">
                      {resending && <Loader2 size={15} className="animate-spin" />}
                      إعادة إرسال الرابط
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate('/login?portal=client', { replace: true })}
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-white transition-all font-cairo"
                    style={{
                      background: `linear-gradient(135deg, ${selectedOption?.color || '#00BFFF'}, #1565C0)`,
                      boxShadow: '0 16px 34px rgba(0,191,255,0.24)',
                    }}
                  >
                    فتح صفحة الدخول
                  </button>
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-tajawal">
                  {error}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

function Field({ icon: Icon, label, ...props }: {
  icon: typeof Building2
  label: string
  value: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  placeholder: string
  dir?: 'rtl' | 'ltr'
  type?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700 font-tajawal">{label}</label>
      <div className="relative">
        <Icon size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          {...props}
          required
          className={`${FIELD_CLASS} ${props.dir === 'ltr' ? 'text-left font-sora' : ''}`}
        />
      </div>
    </div>
  )
}

function Submit({ loading, text, loadingText, color }: { loading: boolean; text: string; loadingText: string; color?: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-white transition-all disabled:opacity-60 font-cairo"
      style={{
        background: `linear-gradient(135deg, ${color || '#00BFFF'}, #1565C0)`,
        boxShadow: '0 16px 34px rgba(0,191,255,0.24)',
      }}
    >
      {loading && <Loader2 size={17} className="animate-spin" />}
      {loading ? loadingText : text}
    </button>
  )
}
