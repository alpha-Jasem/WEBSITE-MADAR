import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Building2, Car, CheckCircle2, Eye, EyeOff,
  Loader2, Lock, Mail, MapPin, Phone, ShieldCheck, Stethoscope, User,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { sanitizeDigits, sanitizeNameText } from '../lib/formSanitizers'

type Step = 'details' | 'otp'
type BusinessType = 'car_wash' | 'clinic'

const FIELD_CLASS =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 pr-11 text-sm text-slate-950 outline-none transition-all placeholder:text-slate-400 focus:border-[#00BFFF] focus:ring-4 focus:ring-sky-400/15 font-tajawal'

function errorCode(msg: string) {
  const map: Record<string, string> = {
    otp_invalid: 'الرمز غير صحيح أو انتهت صلاحيته. اضغط "إعادة إرسال".',
    email_already_registered: 'هذا البريد مسجل مسبقاً — استخدم تسجيل الدخول.',
    company_create_failed: 'تعذر إنشاء الحساب. تواصل معنا على info@madar.software.',
    password_mismatch: 'كلمة المرور وتأكيدها غير متطابقتين.',
    password_short: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.',
  }
  return map[msg] || 'حدث خطأ غير متوقع — حاول مرة أخرى.'
}

const SIDEBAR_CONTENT = {
  car_wash: {
    badge: 'مدار OS للمغاسل',
    heading: 'ابدأ تشغيل مغسلتك اليوم. بدون إعدادات معقدة.',
    body: 'شاشة تشغيل واضحة لكل سيارة من الاستقبال للتسليم — مع مالية، تقارير، وواتساب تلقائي.',
    features: ['QR تسجيل ذاتي وتتبع السيارات', 'حسابات مالية مع VAT وتقارير فورية', 'رمز تحقق آمن على بريدك الإلكتروني'],
  },
  clinic: {
    badge: 'مدار OS للعيادات',
    heading: 'عيادتك تستحق نظاماً يحجز ويذكّر ويتابع بدلاً عنك.',
    body: 'نورا تحجز المواعيد على واتساب ٢٤/٧، ترسل تذكيرات تلقائية، وتعطيك تقارير يومية عن كل شيء.',
    features: ['حجز تلقائي بدون موظف استقبال ٢٤/٧', 'تذكيرات واتساب تقلّل الغياب ٧٨٪', 'رمز تحقق آمن على بريدك الإلكتروني'],
  },
}

export function TrialSignup() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('details')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [otp, setOtp] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [form, setForm] = useState({
    business_type: 'car_wash' as BusinessType,
    company_name: '',
    owner_name: '',
    city: '',
    phone: '',
    email: '',
    password: '',
    confirm_password: '',
  })

  const sidebar = SIDEBAR_CONTENT[form.business_type]
  const accentColor = form.business_type === 'clinic' ? '#7C3AED' : '#00BFFF'
  const accentDark  = form.business_type === 'clinic' ? '#5B21B6' : '#1565C0'
  const gradientBg  = form.business_type === 'clinic'
    ? 'radial-gradient(circle at 22% 18%, rgba(124,58,237,0.28), transparent 34%), radial-gradient(circle at 88% 78%, rgba(139,92,246,0.22), transparent 38%)'
    : 'radial-gradient(circle at 22% 18%, rgba(0,191,255,0.28), transparent 34%), radial-gradient(circle at 88% 78%, rgba(21,101,192,0.34), transparent 38%)'

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('')
    const raw = e.target.value
    const value =
      key === 'phone' ? sanitizeDigits(raw, 12)
      : key === 'company_name' || key === 'owner_name' || key === 'city' ? sanitizeNameText(raw)
      : raw
    setForm(cur => ({ ...cur, [key]: value }))
  }

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = form.email.trim().toLowerCase()
    if (!form.company_name.trim() || !form.owner_name.trim() || !email) {
      setError('يرجى تعبئة اسم المنشأة واسم المالك والبريد الإلكتروني.'); return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('أدخل بريدًا إلكترونيًا صالحًا.'); return
    }
    if (form.password.length < 6) { setError(errorCode('password_short')); return }
    if (form.password !== form.confirm_password) { setError(errorCode('password_mismatch')); return }

    setLoading(true)
    setError('')
    try {
      const sendOtpRequest = async (createUser: boolean) =>
        supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: createUser },
        })

      let { error: otpErr } = await sendOtpRequest(true)
      if (otpErr && /(already|duplicate|exists)/i.test(otpErr.message || '')) {
        const retry = await sendOtpRequest(false)
        otpErr = retry.error
      }

      if (otpErr) throw otpErr
      setStep('otp')
    } catch (err: any) {
      console.error('TrialSignup sendOtp error', err)
      const msg = (err?.message || '').toLowerCase()
      if (msg.includes('invalid email')) setError('أدخل بريدًا إلكترونيًا صالحًا.')
      else if (msg.includes('rate limit')) setError('حاول لاحقًا؛ تم تجاوز حدود إرسال الرموز.')
      else if (msg.includes('already') || msg.includes('duplicate')) setError('هذا البريد مسجّل مسبقاً. حاول تسجيل الدخول.')
      else if (msg.includes('not allowed') || msg.includes('disabled')) setError('تم تعطيل إرسال البريد في الإعدادات. راجع إعدادات Supabase.')
      else setError(err?.message || 'تعذر إرسال الرمز. تأكد من البريد الإلكتروني وأعد المحاولة.')
    } finally {
      setLoading(false)
    }
  }

  const verifyAndCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length < 8) { setError('أدخل الرمز المكوّن من 8 أرقام.'); return }
    setLoading(true)
    setError('')
    try {
      const { data: authData, error: verifyErr } = await supabase.auth.verifyOtp({
        email: form.email.trim(),
        token: otp.trim(),
        type: 'email',
      })
      if (verifyErr) throw new Error('otp_invalid')

      const session = authData.session
      if (!session) throw new Error('otp_invalid')

      // set password after OTP login
      await supabase.auth.updateUser({ password: form.password })

      // create company
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trial-signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            action: 'create_company',
            business_type: form.business_type,
            company_name: form.company_name,
            owner_name: form.owner_name,
            city: form.city,
            phone: form.phone,
            email: form.email,
          }),
        },
      )
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result.error || 'company_create_failed')

      navigate(result.redirect_to || '/client?welcome=trial', { replace: true })
    } catch (err: any) {
      setError(errorCode(err.message))
    } finally {
      setLoading(false)
    }
  }

  const resendOtp = async () => {
    const email = form.email.trim().toLowerCase()
    if (!email) {
      setError('أدخل بريدًا إلكترونيًا صالحًا لإعادة إرسال الرمز.'); return
    }

    setLoading(true)
    setError('')
    setOtp('')
    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      })
      if (otpErr) throw otpErr
    } catch (err: any) {
      console.error('TrialSignup resendOtp error', err)
      const msg = (err?.message || '').toLowerCase()
      if (msg.includes('rate limit')) setError('حاول لاحقًا؛ تم تجاوز حدود إرسال الرموز.')
      else if (msg.includes('not found') || msg.includes('not registered')) setError('لم يتم العثور على هذا البريد. اعد تعبئة البيانات من جديد.')
      else setError(err?.message || 'تعذر إعادة إرسال الرمز. حاول بعد دقيقة.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#F0F4FA] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[minmax(420px,0.9fr)_minmax(520px,1.1fr)]">

        {/* ── Left Sidebar ── */}
        <aside className="relative hidden overflow-hidden bg-[#0D1B3E] p-10 lg:flex lg:flex-col lg:justify-between transition-all duration-500">
          <div className="absolute inset-0 opacity-35" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '42px 42px' }} />
          <div className="absolute inset-0 transition-all duration-700" style={{ background: gradientBg }} />

          <Link to="/" className="relative inline-flex items-center gap-3">
            <img src="/logo-main.png" alt="Madar" className="h-11 w-auto object-contain" />
            <div>
              <p className="font-sora text-xl font-bold text-white">Madar.software</p>
              <p className="mt-1 text-xs font-tajawal text-sky-100/60">نظام تشغيل للأعمال العربية</p>
            </div>
          </Link>

          <AnimatePresence mode="wait">
            <motion.div
              key={form.business_type}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.3 }}
              className="relative max-w-md"
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-tajawal text-sky-100">
                {form.business_type === 'clinic' ? <Stethoscope size={13} /> : <Car size={13} />}
                {sidebar.badge}
              </div>
              <h1 className="font-cairo text-4xl font-bold leading-[1.25] text-white">
                {sidebar.heading}
              </h1>
              <p className="mt-5 font-tajawal text-base leading-8 text-sky-50/70">
                {sidebar.body}
              </p>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={form.business_type + '-features'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative grid gap-3"
            >
              {sidebar.features.map(item => (
                <div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-4 py-3">
                  <CheckCircle2 size={17} className="text-sky-300 shrink-0" />
                  <span className="font-tajawal text-sm text-white/80">{item}</span>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </aside>

        {/* ── Right Form ── */}
        <main className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-12">
          <div className="w-full max-w-[500px]">

            {/* Top Nav */}
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

            {/* Page heading */}
            <div className="mb-5">
              <p className="text-sm font-bold font-cairo" style={{ color: accentColor }}>تجربة مجانية — 3 أيام</p>
              <h2 className="mt-2 text-3xl font-bold tracking-normal text-slate-950 font-cairo">
                أنشئ حسابك الآن
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 font-tajawal">
                اختر مجالك، أدخل بياناتك، وادخل لوحة التشغيل فور التحقق من بريدك.
              </p>
            </div>

            {/* Progress */}
            <div className="mb-5 grid grid-cols-2 gap-2">
              {(['details', 'otp'] as Step[]).map((s, i) => {
                const labels = ['البيانات', 'التحقق بالبريد']
                const active = step === s || (step === 'otp' && i === 0)
                return (
                  <div key={s} className="rounded-xl px-3 py-2 text-center text-xs font-bold font-tajawal transition-all"
                    style={{ background: active ? '#E0F7FF' : '#F8FAFC', color: active ? '#0369A1' : '#94A3B8' }}>
                    {labels[i]}
                  </div>
                )
              })}
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
              <AnimatePresence mode="wait">

                {/* ── Step 1: Details ── */}
                {step === 'details' && (
                  <motion.form
                    key="details"
                    onSubmit={sendOtp}
                    className="space-y-4"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.22 }}
                  >
                    {/* Business type selector */}
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700 font-tajawal">نوع النشاط *</label>
                      <div className="grid grid-cols-2 gap-3">
                        {([
                          { type: 'car_wash' as BusinessType, icon: Car,         label: 'مغسلة سيارات', sub: 'مغاسل، ديتيلنج' },
                          { type: 'clinic'   as BusinessType, icon: Stethoscope, label: 'عيادة',        sub: 'طب أسنان، عام' },
                        ]).map(({ type, icon: Icon, label, sub }) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, business_type: type }))}
                            className="flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition-all"
                            style={{
                              borderColor: form.business_type === type ? accentColor : '#E2E8F0',
                              background: form.business_type === type ? `${accentColor}10` : '#FAFAFA',
                            }}
                          >
                            <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: form.business_type === type ? `${accentColor}20` : '#F1F5F9' }}>
                              <Icon size={20} style={{ color: form.business_type === type ? accentColor : '#94A3B8' }} />
                            </div>
                            <div>
                              <p className="text-sm font-bold font-cairo" style={{ color: form.business_type === type ? '#0F172A' : '#64748B' }}>{label}</p>
                              <p className="text-[11px] font-tajawal text-slate-400">{sub}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <Field icon={Building2} label="اسم المنشأة *"      value={form.company_name}     onChange={set('company_name')}     placeholder={form.business_type === 'clinic' ? 'مثال: عيادة نور للأسنان' : 'مثال: مغسلة النجمة'} />
                    <Field icon={User}      label="اسم المالك *"        value={form.owner_name}       onChange={set('owner_name')}       placeholder="الاسم الأول والأخير" />
                    <Field icon={MapPin}    label="المدينة"              value={form.city}             onChange={set('city')}             placeholder="جدة، الرياض، الدمام..." />
                    <Field icon={Phone}     label="رقم الجوال"           value={form.phone}            onChange={set('phone')}            placeholder="05xxxxxxxx" dir="ltr" inputMode="tel" />
                    <Field icon={Mail}      label="البريد الإلكتروني *"  value={form.email}            onChange={set('email')}            placeholder="owner@example.com" dir="ltr" type="email" />

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700 font-tajawal">كلمة المرور * <span className="font-normal text-slate-400">(6 أحرف على الأقل)</span></label>
                      <div className="relative">
                        <Lock size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showPass ? 'text' : 'password'}
                          value={form.password}
                          onChange={set('password')}
                          placeholder="••••••••"
                          required
                          dir="ltr"
                          minLength={6}
                          className={`${FIELD_CLASS} pl-11 text-left font-sora`}
                        />
                        <button type="button" onClick={() => setShowPass(v => !v)} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors">
                          {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700 font-tajawal">تأكيد كلمة المرور *</label>
                      <div className="relative">
                        <Lock size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showConfirm ? 'text' : 'password'}
                          value={form.confirm_password}
                          onChange={set('confirm_password')}
                          placeholder="••••••••"
                          required
                          dir="ltr"
                          minLength={6}
                          className={`${FIELD_CLASS} pl-11 text-left font-sora`}
                        />
                        <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors">
                          {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </div>

                    {error && <ErrorBox text={error} />}

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-white transition-all disabled:opacity-60 font-cairo"
                      style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentDark})`, boxShadow: `0 16px 34px ${accentColor}40` }}
                    >
                      {loading && <Loader2 size={17} className="animate-spin" />}
                      {loading ? 'جاري إرسال الرمز...' : 'إرسال رمز التحقق على بريدك'}
                    </button>
                  </motion.form>
                )}

                {/* ── Step 2: OTP ── */}
                {step === 'otp' && (
                  <motion.form
                    key="otp"
                    onSubmit={verifyAndCreate}
                    className="space-y-5"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.22 }}
                  >
                    <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                      <div className="flex items-start gap-3">
                        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-sky-600" />
                        <div>
                          <p className="text-sm font-bold text-slate-900 font-cairo">تحقق من بريدك الإلكتروني</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500 font-tajawal">
                            أرسلنا رمزاً مكوّناً من 8 أرقام إلى{' '}
                            <span className="font-bold text-slate-700 break-all">{form.email}</span>.
                            <br />
                            تحقق من صندوق الوارد أو مجلد Spam.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700 font-tajawal">رمز التحقق</label>
                      <input
                        value={otp}
                        onChange={e => { setError(''); setOtp(e.target.value.replace(/\D/g, '').slice(0, 8)) }}
                        placeholder="• • • • • • • •"
                        required
                        dir="ltr"
                        inputMode="numeric"
                        autoFocus
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-4 text-center text-3xl font-bold tracking-[0.45em] text-slate-950 outline-none transition-all focus:border-[#00BFFF] focus:ring-4 focus:ring-sky-400/15 font-sora"
                      />
                    </div>

                    {error && <ErrorBox text={error} />}

                    <button
                      type="submit"
                      disabled={loading || otp.length < 8}
                      className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-white transition-all disabled:opacity-50 font-cairo"
                      style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentDark})`, boxShadow: `0 16px 34px ${accentColor}40` }}
                    >
                      {loading
                        ? <><Loader2 size={17} className="animate-spin" /> جاري تجهيز الحساب...</>
                        : <><CheckCircle2 size={17} /> تأكيد وإنشاء الحساب</>
                      }
                    </button>

                    <div className="flex items-center justify-between pt-1 text-xs text-slate-400 font-tajawal">
                      <button type="button" onClick={() => { setStep('details'); setOtp(''); setError('') }} className="hover:text-slate-700 transition-colors">
                        تعديل البيانات
                      </button>
                      <button type="button" onClick={resendOtp} disabled={loading} className="text-sky-600 hover:text-sky-800 disabled:opacity-50 transition-colors">
                        إعادة إرسال الرمز
                      </button>
                    </div>
                  </motion.form>
                )}

              </AnimatePresence>
            </section>

            <p className="mt-5 text-center text-xs text-slate-400 font-tajawal">
              بالتسجيل أنت توافق على{' '}
              <a href="mailto:info@madar.software" className="font-bold text-[#0099CC] hover:text-slate-700 transition-colors">شروط الاستخدام</a>
              {' '}وسياسة الخصوصية.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}

function Field({
  icon: Icon, label, ...props
}: {
  icon: typeof Building2
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder: string
  dir?: 'rtl' | 'ltr'
  type?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  maxLength?: number
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700 font-tajawal">{label}</label>
      <div className="relative">
        <Icon size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input {...props} required={label.includes('*')} className={`${FIELD_CLASS} ${props.dir === 'ltr' ? 'text-left font-sora' : ''}`} />
      </div>
    </div>
  )
}

function ErrorBox({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-tajawal"
    >
      {text}
    </motion.div>
  )
}
