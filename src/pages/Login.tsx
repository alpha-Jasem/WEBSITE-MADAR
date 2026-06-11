import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Lock, Mail, ArrowLeft, Shield, User, CheckCircle2, Building2 } from 'lucide-react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { signInWithOtp, verifyOtp, getCurrentUser, signOut, supabase } from '../lib/supabase'

type Portal = 'client' | 'admin'

type LoginStep = 'email' | 'otp'

export const Login = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialPortal = searchParams.get('portal') === 'admin' ? 'admin' : 'client'
  const redirectTo = useMemo(() => {
    const redirect = searchParams.get('redirect')
    if (!redirect || !redirect.startsWith('/')) return null
    return redirect
  }, [searchParams])

  const [portal, setPortal] = useState<Portal>(initialPortal)
  const [step, setStep] = useState<LoginStep>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const adminAccent = '#0D1B3E'
  const clientAccent = '#00BFFF'
  const accent = portal === 'admin' ? adminAccent : clientAccent

  const afterLogin = async () => {
    const profile = await getCurrentUser()
    const role = profile?.role ?? 'client'

    if (portal === 'admin' && role !== 'admin') {
      await signOut()
      setError('ليس لديك صلاحية الوصول للوحة الإدارة')
      return
    }

    if (portal === 'client' && role === 'admin') {
      await signOut()
      setError('حسابك مخصص للإدارة، استخدم بوابة الإدارة')
      return
    }

    if (role === 'client') {
      const { data: company } = await supabase
        .from('companies')
        .select('business_type')
        .eq('auth_user_id', profile.id)
        .maybeSingle()

      // Check DB first, then localStorage backup (set during signup)
      const bt = company?.business_type || localStorage.getItem('madar_signup_business_type')
      if (bt === 'clinic') {
        localStorage.removeItem('madar_signup_business_type')
        navigate(redirectTo || '/clinic-os/dashboard', { replace: true })
        return
      }
    }

    navigate(redirectTo || (role === 'admin' ? '/admin' : '/client'), { replace: true })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (step === 'email') {
        const trimmedEmail = email.trim().toLowerCase()
        if (!trimmedEmail) throw new Error('invalid email')
        const { error: err } = await signInWithOtp(trimmedEmail)
        if (err) throw err
        setStep('otp')
        setOtp('')
      } else {
        const { data, error: err } = await verifyOtp(email.trim().toLowerCase(), otp.trim())
        if (err) throw err
        if (!data?.session) throw new Error('OTP login failed')
        await afterLogin()
      }
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase()
      if (msg.includes('invalid email')) setError('أدخل بريدًا إلكترونيًا صالحًا.')
      else if (msg.includes('not found') || msg.includes('invalid login credentials')) setError('هذا البريد غير مسجل.')
      else if (msg.includes('rate limit')) setError('حاول لاحقًا؛ تم تجاوز حدود إرسال الرموز.')
      else setError(err?.message || 'حدث خطأ، حاول مجدداً')
    } finally {
      setLoading(false)
    }
  }

  const resendOtp = async () => {
    setError('')
    setLoading(true)
    try {
      const trimmedEmail = email.trim().toLowerCase()
      if (!trimmedEmail) throw new Error('invalid email')
      const { error: err } = await signInWithOtp(trimmedEmail)
      if (err) throw err
      setOtp('')
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase()
      if (msg.includes('invalid email')) setError('أدخل بريدًا إلكترونيًا صالحًا.')
      else if (msg.includes('not found') || msg.includes('invalid login credentials')) setError('هذا البريد غير مسجل.')
      else if (msg.includes('rate limit')) setError('حاول لاحقًا؛ تم تجاوز حدود إرسال الرموز.')
      else setError(err?.message || 'حدث خطأ، حاول مجدداً')
    } finally {
      setLoading(false)
    }
  }

  const resetEmail = () => {
    setStep('email')
    setOtp('')
    setError('')
  }

  const portalOptions: { id: Portal; label: string; sub: string; icon: typeof User; accent: string }[] = [
    { id: 'client', label: 'بوابة العملاء', sub: 'مغاسل وعيادات', icon: User, accent: clientAccent },
    { id: 'admin', label: 'لوحة الإدارة', sub: 'إدارة مدار والاشتراكات', icon: Shield, accent: adminAccent },
  ]

  return (
    <div dir="rtl" className="min-h-screen bg-[#F0F4FA] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[minmax(420px,0.88fr)_minmax(520px,1.12fr)]">
        <aside className="relative hidden overflow-hidden bg-[#0D1B3E] p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 opacity-35" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '42px 42px' }} />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 22% 18%, rgba(0,191,255,0.28), transparent 34%), radial-gradient(circle at 88% 78%, rgba(21,101,192,0.34), transparent 38%)' }} />
          <div className="relative">
            <Link to="/" className="inline-flex items-center gap-3">
              <img src="/logo-main.png" alt="Madar" className="h-11 w-auto object-contain" />
              <div>
                <p className="font-sora text-xl font-bold text-white">Madar.software</p>
                <p className="mt-1 text-xs font-tajawal text-sky-100/60">نظام تشغيل للأعمال العربية</p>
              </div>
            </Link>
          </div>

          <div className="relative max-w-md">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-xs font-tajawal text-sky-100">
              <Building2 size={14} />
              مدار OS للمغاسل والعيادات
            </div>
            <h1 className="font-cairo text-4xl font-bold leading-[1.25] text-white">
              ادخل للوحة تشغيل مصممة لإدارة مشروعك بوضوح وبدون تعقيد.
            </h1>
            <p className="mt-5 font-tajawal text-base leading-8 text-sky-50/70">
              سواء كنت تدير مغسلة سيارات أو عيادة — لوحة واحدة تجمع التشغيل والمالية والعملاء تلقائياً.
            </p>
          </div>

          <div className="relative grid gap-3">
            {['تشغيل يومي واضح من أول تسليم', 'مالية وتقارير مع حساب VAT تلقائي', 'واتساب وحجوزات ذكية بدون موظف إضافي'].map(item => (
              <div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-4 py-3">
                <CheckCircle2 size={17} className="text-sky-300" />
                <span className="font-tajawal text-sm text-white/80">{item}</span>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-12">
          <div className="w-full max-w-[460px]">
            <div className="mb-8 flex items-center justify-between gap-4">
              <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-tajawal text-slate-500 shadow-sm transition-colors hover:text-slate-900">
                <ArrowLeft size={15} />
                العودة للرئيسية
              </Link>
              <div className="flex items-center gap-2 lg:hidden">
                <img src="/logo-main.png" alt="Madar" className="h-9 w-auto object-contain" />
                <span className="font-sora text-lg font-bold text-slate-950">Madar</span>
              </div>
            </div>

            <div className="mb-5">
              <p className="text-sm font-bold text-[#0099CC] font-cairo">تسجيل الدخول</p>
              <h2 className="mt-2 text-3xl font-bold tracking-normal text-slate-950 font-cairo">
                {portal === 'admin' ? 'مرحباً بك في الإدارة' : 'أهلاً — ادخل حسابك'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 font-tajawal">
                اختر البوابة المناسبة ثم أدخل بريدك. سنرسل لك رمز تحقق (OTP) على بريدك بدلًا من رابط الدخول.
              </p>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
              {portalOptions.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setPortal(p.id); setError('') }}
                  className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold font-tajawal transition-all"
                  style={{
                    background: portal === p.id ? p.accent : 'transparent',
                    color: portal === p.id && p.id === 'client' ? '#0D1B3E' : portal === p.id ? 'white' : '#64748B',
                    boxShadow: portal === p.id ? '0 10px 24px rgba(0,191,255,0.22)' : 'none',
                  }}
                >
                  <p.icon size={16} />
                  {p.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.section
                key={portal}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22 }}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]"
              >
                <div className="mb-6 flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl" style={{ background: accent + '12', color: accent }}>
                    {portal === 'admin' ? <Shield size={22} /> : <User size={22} />}
                  </div>
                  <div>
                    <h3 className="font-cairo text-lg font-bold text-slate-950">
                      {portal === 'admin' ? 'دخول لوحة الإدارة' : 'دخول بوابة العملاء'}
                    </h3>
                    <p className="mt-1 text-xs font-tajawal text-slate-500">
                      {portalOptions.find(p => p.id === portal)?.sub}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700 font-tajawal">البريد الإلكتروني</label>
                    <div className="relative">
                      <Mail size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        required
                        dir="ltr"
                        disabled={step === 'otp'}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-11 text-left text-sm text-slate-950 outline-none transition-all placeholder:text-slate-400 focus:border-[#00BFFF] focus:bg-white focus:ring-4 focus:ring-sky-400/15 font-sora disabled:cursor-not-allowed disabled:opacity-70"
                      />
                    </div>
                  </div>

                  {step === 'otp' && (
                    <>
                      <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-slate-700 font-tajawal">
                        رمز التحقق أرسلناه إلى البريد التالي:
                        <div className="mt-2 font-bold text-slate-900 break-all">{email}</div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700 font-tajawal">رمز التحقق (OTP)</label>
                        <div className="relative">
                          <Lock size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={otp}
                            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                            placeholder="12345678"
                            required
                            dir="ltr"
                            inputMode="numeric"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-11 py-3.5 text-left text-sm text-slate-950 outline-none transition-all placeholder:text-slate-400 focus:border-[#00BFFF] focus:bg-white focus:ring-4 focus:ring-sky-400/15 font-sora"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500 font-tajawal">
                        <button type="button" onClick={resendOtp} disabled={loading} className="text-[#0369A1] hover:text-[#0D1B3E] transition-colors">
                          إعادة إرسال الرمز
                        </button>
                        <button type="button" onClick={resetEmail} disabled={loading} className="text-[#9CA3AF] hover:text-slate-700 transition-colors">
                          تعديل البريد
                        </button>
                      </div>
                    </>
                  )}

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-tajawal"
                    >
                      {error}
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-white transition-all disabled:opacity-60 font-cairo"
                    style={{
                      background: portal === 'client' ? 'linear-gradient(135deg, #00BFFF, #1565C0)' : 'linear-gradient(135deg, #0D1B3E, #1565C0)',
                      boxShadow: '0 16px 34px rgba(0,191,255,0.24)',
                    }}
                  >
                    {loading && <Loader2 size={17} className="animate-spin" />}
                    {loading ? (step === 'email' ? 'جاري إرسال الرمز...' : 'جاري التحقق...') : (step === 'email' ? 'أرسل رمز التحقق' : 'تأكيد الرمز')}
                  </button>
                </form>

                {portal === 'client' && (
                  <p className="mt-5 text-center text-sm text-slate-500 font-tajawal">
                    مستخدم جديد؟{' '}
                    <Link to="/trial" className="font-bold text-[#0099CC] hover:text-[#0D1B3E] transition-colors">
                      ابدأ تجربتك المجانية
                    </Link>
                  </p>
                )}
                <p className="mt-3 text-center text-xs text-slate-400 font-tajawal">
                  للدعم: <a href="mailto:info@madar.software" className="font-bold text-[#0099CC] hover:text-[#0D1B3E]">info@madar.software</a>
                </p>
              </motion.section>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  )
}
