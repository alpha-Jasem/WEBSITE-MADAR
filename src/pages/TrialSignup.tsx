import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, MapPin, Phone, ShieldCheck, Sparkles, User } from 'lucide-react'
import { signInWithPassword } from '../lib/supabase'
import { sanitizeDigits, sanitizeNameText } from '../lib/formSanitizers'

type Step = 'details' | 'otp' | 'done'

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
    otp_send_failed: 'تعذر إرسال رمز التحقق. حاول مرة أخرى.',
    otp_not_approved: 'رمز التحقق غير صحيح أو انتهت صلاحيته.',
    otp_failed: 'تعذر التحقق من الرمز. حاول مرة أخرى.',
    auth_user_create_failed: 'تعذر إنشاء حساب الدخول. ربما البريد مستخدم مسبقاً.',
    company_create_failed: 'تعذر إنشاء المنشأة. تواصل معنا لإكمالها يدوياً.',
    missing_required_fields: 'أكمل البيانات المطلوبة.',
  }
  return map[code] || 'حدث خطأ غير متوقع، حاول مرة أخرى.'
}

export function TrialSignup() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('details')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [otp, setOtp] = useState('')
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

  const sendOtp = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.company_name.trim() || !form.owner_name.trim() || !form.email.trim() || form.password.length < 8) {
      setError('أكمل اسم المغسلة، اسم المالك، البريد، وكلمة مرور من 8 أحرف على الأقل.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await callTrialSignup({
        action: 'send_otp',
        phone,
        email: form.email,
      })
      setStep('otp')
    } catch (err: any) {
      setError(errorText(err.message))
    } finally {
      setLoading(false)
    }
  }

  const verifySignup = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await callTrialSignup({
        action: 'verify_signup',
        ...form,
        phone,
        otp,
      })
      const { error: loginError } = await signInWithPassword(form.email, form.password)
      if (loginError) throw new Error('login_failed')
      setStep('done')
      navigate(data.redirect_to || '/client?welcome=trial', { replace: true })
    } catch (err: any) {
      setError(err.message === 'login_failed' ? 'تم إنشاء الحساب، لكن تعذر الدخول التلقائي. سجل دخولك من صفحة الدخول.' : errorText(err.message))
    } finally {
      setLoading(false)
    }
  }

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
              تجربة مجانية 3 أيام
            </div>
            <h1 className="font-cairo text-4xl font-bold leading-[1.25] text-white">
              ابدأ تجربة مغسلتك اليوم بدون إعدادات معقدة.
            </h1>
            <p className="mt-5 font-tajawal text-base leading-8 text-sky-50/70">
              الحساب يبدأ على باقة Pro التجريبية: QR تسجيل ذاتي، شاشة تشغيل، خدمات جاهزة، مالية، تقارير، وخطوات إرشادية من أول دخول.
            </p>
          </div>

          <div className="relative grid gap-3">
            {['OTP برسالة SMS لحماية حساب المالك', 'خدمات مغسلة جاهزة للتعديل', 'ترقية مدفوعة بعد التجربة عند الجاهزية'].map(item => (
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
                أنشئ حساب مغسلة كامل، تحقق من رقم الجوال، وادخل للوحة التشغيل مباشرة.
              </p>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
              <div className="mb-6 grid grid-cols-3 gap-2">
                {[
                  ['details', 'البيانات'],
                  ['otp', 'التحقق'],
                  ['done', 'الدخول'],
                ].map(([key, label], index) => {
                  const active = step === key || (step === 'otp' && index === 0) || (step === 'done' && index < 3)
                  return (
                    <div key={key} className="rounded-xl px-3 py-2 text-center text-xs font-bold font-tajawal" style={{ background: active ? '#E0F7FF' : '#F8FAFC', color: active ? '#0369A1' : '#94A3B8' }}>
                      {label}
                    </div>
                  )
                })}
              </div>

              {step === 'details' && (
                <form onSubmit={sendOtp} className="space-y-4">
                  <Field icon={Building2} label="اسم المغسلة" value={form.company_name} onChange={set('company_name')} placeholder="مثال: مغسلة مدار" />
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
                      <button type="button" onClick={() => setShowPass(value => !value)} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                        {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  <Submit loading={loading} text="إرسال رمز التحقق" loadingText="جاري إرسال الرمز..." />
                </form>
              )}

              {step === 'otp' && (
                <form onSubmit={verifySignup} className="space-y-5">
                  <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheck size={20} className="mt-0.5 text-sky-600" />
                      <div>
                        <p className="text-sm font-bold text-slate-900 font-cairo">أرسلنا رمز تحقق SMS</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500 font-tajawal">أدخل الرمز المرسل إلى +{phone}. بعد التحقق سننشئ الحساب وندخلك للوحة التشغيل.</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700 font-tajawal">رمز التحقق</label>
                    <input
                      value={otp}
                      onChange={event => { setError(''); setOtp(normalizeDigits(event.target.value).slice(0, 8)) }}
                      placeholder="123456"
                      required
                      dir="ltr"
                      inputMode="numeric"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-4 text-center text-2xl font-bold tracking-[0.35em] text-slate-950 outline-none transition-all focus:border-[#00BFFF] focus:ring-4 focus:ring-sky-400/15 font-sora"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep('details')} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-500 font-tajawal hover:text-slate-900">
                      تعديل البيانات
                    </button>
                    <button type="button" onClick={() => sendOtp({ preventDefault: () => {} } as React.FormEvent)} disabled={loading} className="rounded-xl border border-sky-100 px-5 py-3 text-sm font-bold text-sky-700 font-tajawal hover:bg-sky-50 disabled:opacity-60">
                      إعادة إرسال
                    </button>
                  </div>

                  <Submit loading={loading} text="إنشاء الحساب والدخول" loadingText="جاري تجهيز اللوحة..." />
                </form>
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

function Submit({ loading, text, loadingText }: { loading: boolean; text: string; loadingText: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-white transition-all disabled:opacity-60 font-cairo"
      style={{
        background: 'linear-gradient(135deg, #00BFFF, #1565C0)',
        boxShadow: '0 16px 34px rgba(0,191,255,0.24)',
      }}
    >
      {loading && <Loader2 size={17} className="animate-spin" />}
      {loading ? loadingText : text}
    </button>
  )
}
