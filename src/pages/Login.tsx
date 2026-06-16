import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Loader2, Lock, Mail, ArrowLeft, Shield, User, Building2, UserPlus } from 'lucide-react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { signInWithPassword, getCurrentUser, signOut, supabase } from '../lib/supabase'

type Mode = 'login' | 'signup' | 'admin'

const FIELD = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#00BFFF] focus:bg-white focus:ring-4 focus:ring-sky-100 font-tajawal'
const FIELD_LTR = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#00BFFF] focus:bg-white focus:ring-4 focus:ring-sky-100 font-sora'

export const Login = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialMode: Mode = searchParams.get('portal') === 'admin' ? 'admin' : 'login'
  const redirectTo = useMemo(() => {
    const r = searchParams.get('redirect')
    return r?.startsWith('/') ? r : null
  }, [searchParams])

  const [mode, setMode] = useState<Mode>(initialMode)

  // ── Login state ──
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPass, setLoginPass]   = useState('')
  const [showLoginPass, setShowLoginPass] = useState(false)
  const [loginLoading, setLoginLoading]   = useState(false)
  const [loginError, setLoginError]       = useState('')

  // ── Signup state ──
  const [signupForm, setSignupForm] = useState({ clinic: '', owner: '', email: '', pass: '', confirm: '' })
  const [showSignupPass, setShowSignupPass] = useState(false)
  const [showConfirm, setShowConfirm]       = useState(false)
  const [signupLoading, setSignupLoading]   = useState(false)
  const [signupError, setSignupError]       = useState('')
  const [signupDone, setSignupDone]         = useState(false)

  // ── Admin state ──
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPass, setAdminPass]   = useState('')
  const [showAdminPass, setShowAdminPass] = useState(false)
  const [adminLoading, setAdminLoading]   = useState(false)
  const [adminError, setAdminError]       = useState('')

  // ── Helpers ──
  const sf = (k: keyof typeof signupForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignupError(''); setSignupForm(p => ({ ...p, [k]: e.target.value }))
  }

  const afterClientLogin = async () => {
    const profile = await getCurrentUser()
    if (!profile) { navigate(redirectTo || '/client', { replace: true }); return }
    const { data: company } = await supabase.from('companies').select('business_type').eq('auth_user_id', profile.id).maybeSingle()
    const bt = company?.business_type || localStorage.getItem('madar_signup_business_type')
    if (bt === 'clinic') {
      localStorage.removeItem('madar_signup_business_type')
      navigate(redirectTo || '/clinic-os/dashboard', { replace: true })
    } else {
      navigate(redirectTo || '/client', { replace: true })
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginError(''); setLoginLoading(true)
    try {
      const { error } = await signInWithPassword(loginEmail, loginPass)
      if (error) throw error
      const profile = await getCurrentUser()
      if (profile?.role === 'admin') { await signOut(); setLoginError('حسابك مخصص للإدارة — استخدم تبويب الإدارة'); return }
      await afterClientLogin()
    } catch (err: any) {
      const msg = err?.message || ''
      setLoginError(msg.includes('Invalid') || msg.includes('credentials') ? 'البريد أو كلمة المرور غير صحيحة' : 'حدث خطأ — حاول مجدداً')
    } finally { setLoginLoading(false) }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault(); setSignupError('')
    const { clinic, owner, email, pass, confirm } = signupForm
    if (!clinic.trim() || !owner.trim() || !email.trim()) { setSignupError('يرجى تعبئة جميع الحقول'); return }
    if (pass.length < 6) { setSignupError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return }
    if (pass !== confirm) { setSignupError('كلمة المرور وتأكيدها غير متطابقتين'); return }

    setSignupLoading(true)
    try {
      // 1. Create auth user
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: pass,
        options: { data: { full_name: owner.trim() } },
      })
      if (authErr) {
        const m = authErr.message?.toLowerCase() || ''
        if (m.includes('already') || m.includes('registered') || m.includes('duplicate')) {
          setSignupError('هذا البريد مسجل مسبقاً — استخدم تسجيل الدخول')
        } else {
          setSignupError(authErr.message || 'حدث خطأ أثناء إنشاء الحساب')
        }
        return
      }

      const userId = authData.user?.id
      if (!userId) { setSignupError('حدث خطأ — حاول مجدداً'); return }

      // 2. Create user record in users table
      await supabase.from('users').upsert({
        id: userId,
        email: email.trim().toLowerCase(),
        full_name: owner.trim(),
        role: 'client',
      }, { onConflict: 'id' })

      // 3. Create company record
      const { error: compErr } = await supabase.from('companies').insert({
        name: clinic.trim(),
        owner_name: owner.trim(),
        email: email.trim().toLowerCase(),
        business_type: 'clinic',
        plan: 'trial',
        status: 'active',
        auth_user_id: userId,
      })
      if (compErr && !compErr.message?.includes('duplicate')) {
        console.error('company insert error', compErr)
      }

      // 4. If session exists, redirect. If email confirmation needed, show success.
      if (authData.session) {
        localStorage.setItem('madar_signup_business_type', 'clinic')
        navigate('/clinic-os/dashboard?welcome=1', { replace: true })
      } else {
        setSignupDone(true)
      }
    } catch (err: any) {
      setSignupError(err?.message || 'حدث خطأ غير متوقع')
    } finally { setSignupLoading(false) }
  }

  const handleAdmin = async (e: React.FormEvent) => {
    e.preventDefault(); setAdminError(''); setAdminLoading(true)
    try {
      const { error } = await signInWithPassword(adminEmail, adminPass)
      if (error) throw error
      const profile = await getCurrentUser()
      if (profile?.role !== 'admin') { await signOut(); setAdminError('ليس لديك صلاحية الوصول للإدارة'); return }
      navigate(redirectTo || '/admin', { replace: true })
    } catch (err: any) {
      const msg = err?.message || ''
      setAdminError(msg.includes('Invalid') || msg.includes('credentials') ? 'البريد أو كلمة المرور غير صحيحة' : 'حدث خطأ — حاول مجدداً')
    } finally { setAdminLoading(false) }
  }

  const tabs: { id: Mode; label: string; icon: typeof User }[] = [
    { id: 'login',  label: 'تسجيل الدخول', icon: User },
    { id: 'signup', label: 'إنشاء حساب',   icon: UserPlus },
    { id: 'admin',  label: 'الإدارة',       icon: Shield },
  ]

  return (
    <div dir="rtl" className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg, #F0F6FF 0%, #F8FAFF 50%, #EFF4FB 100%)' }}>

      {/* Top bar */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-4">
        <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-sm font-tajawal text-slate-500 shadow-sm hover:text-slate-900 transition-colors">
          <ArrowLeft size={14} />
          الرئيسية
        </Link>
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo-main.png" alt="Madar" className="h-8 w-auto object-contain" />
          <span className="font-sora text-base font-black text-[#0D1B3E]">Madar<span className="text-[#00BFFF]">.software</span></span>
        </Link>
      </header>

      {/* Center content */}
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
            className="text-center mb-7"
          >
            <h1 className="font-cairo text-3xl font-black text-[#0D1B3E] mb-1">
              {mode === 'signup' ? 'أنشئ حساب عيادتك' : mode === 'admin' ? 'بوابة الإدارة' : 'أهلاً بعودتك'}
            </h1>
            <p className="font-tajawal text-sm text-slate-500">
              {mode === 'signup' ? 'أنشئ حسابك وابدأ تشغيل عيادتك خلال دقائق'
                : mode === 'admin' ? 'الدخول مخصص لفريق مدار فقط'
                : 'سجّل دخولك لمتابعة عيادتك'}
            </p>
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-2xl bg-white border border-slate-200 shadow-sm mb-5">
            {tabs.map(tab => {
              const Icon = tab.icon
              const active = mode === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => { setMode(tab.id); setLoginError(''); setSignupError(''); setAdminError('') }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold font-cairo transition-all"
                  style={{
                    background: active ? (tab.id === 'admin' ? '#0D1B3E' : tab.id === 'signup' ? '#10B981' : '#0099CC') : 'transparent',
                    color: active ? '#fff' : '#94A3B8',
                    boxShadow: active ? '0 4px 14px rgba(0,0,0,0.12)' : 'none',
                  }}
                >
                  <Icon size={14} />
                  <span className="hidden xs:inline">{tab.label}</span>
                  <span className="xs:hidden">{tab.id === 'login' ? 'دخول' : tab.id === 'signup' ? 'تسجيل' : 'إدارة'}</span>
                </button>
              )
            })}
          </div>

          {/* Form cards */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-[0_8px_40px_rgba(13,27,62,0.08)]"
            >

              {/* ── LOGIN ── */}
              {mode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                      <User size={18} className="text-[#0099CC]" />
                    </div>
                    <div>
                      <p className="font-cairo font-bold text-[#0D1B3E] text-sm">بوابة العملاء</p>
                      <p className="font-tajawal text-xs text-slate-400">عيادات مدار OS</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 font-tajawal mb-1.5">البريد الإلكتروني</label>
                    <div className="relative">
                      <Mail size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                        placeholder="name@clinic.com" required dir="ltr"
                        className={`${FIELD_LTR} pr-9 pl-4 py-3`} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-600 font-tajawal">كلمة المرور</label>
                      <Link to="/forgot-password" className="text-xs text-[#0099CC] hover:text-[#0D1B3E] font-tajawal transition-colors">نسيت كلمة المرور؟</Link>
                    </div>
                    <div className="relative">
                      <Lock size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type={showLoginPass ? 'text' : 'password'} value={loginPass} onChange={e => setLoginPass(e.target.value)}
                        placeholder="••••••••" required dir="ltr" minLength={6}
                        className={`${FIELD_LTR} pr-9 pl-10 py-3`} />
                      <button type="button" onClick={() => setShowLoginPass(p => !p)}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                        {showLoginPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {loginError && <Error>{loginError}</Error>}

                  <button type="submit" disabled={loginLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold font-cairo text-sm disabled:opacity-60 transition-all"
                    style={{ background: 'linear-gradient(135deg,#0099CC,#0D1B3E)', boxShadow: '0 6px 20px rgba(0,153,204,0.28)' }}>
                    {loginLoading ? <><Loader2 size={15} className="animate-spin" />جاري الدخول...</> : 'دخول لوحة التحكم ←'}
                  </button>

                  <p className="text-center text-xs text-slate-400 font-tajawal pt-1">
                    ليس لديك حساب؟{' '}
                    <button type="button" onClick={() => setMode('signup')} className="font-bold text-[#10B981] hover:underline">
                      أنشئ حساباً مجاناً
                    </button>
                  </p>
                </form>
              )}

              {/* ── SIGNUP ── */}
              {mode === 'signup' && (
                signupDone ? (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">✅</span>
                    </div>
                    <h3 className="font-cairo text-lg font-bold text-[#0D1B3E] mb-2">تم إنشاء حسابك!</h3>
                    <p className="font-tajawal text-sm text-slate-500 mb-5">
                      أرسلنا رابط تأكيد لبريدك الإلكتروني — تحقق من صندوق الوارد وانقر على الرابط لتفعيل الحساب.
                    </p>
                    <button onClick={() => { setMode('login'); setSignupDone(false) }}
                      className="font-cairo text-sm font-bold text-[#0099CC] hover:underline">
                      انتقل لتسجيل الدخول
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSignup} className="space-y-3.5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                        <UserPlus size={18} className="text-[#10B981]" />
                      </div>
                      <div>
                        <p className="font-cairo font-bold text-[#0D1B3E] text-sm">حساب جديد</p>
                        <p className="font-tajawal text-xs text-slate-400">عيادة — Clinic OS</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 font-tajawal mb-1.5">اسم العيادة</label>
                        <div className="relative">
                          <Building2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input value={signupForm.clinic} onChange={sf('clinic')} placeholder="عيادة الدكتور..."
                            required className={`${FIELD} text-right pr-8 py-2.5 text-xs`} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 font-tajawal mb-1.5">اسم المالك</label>
                        <div className="relative">
                          <User size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input value={signupForm.owner} onChange={sf('owner')} placeholder="د. محمد..."
                            required className={`${FIELD} text-right pr-8 py-2.5 text-xs`} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 font-tajawal mb-1.5">البريد الإلكتروني</label>
                      <div className="relative">
                        <Mail size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="email" value={signupForm.email} onChange={sf('email')}
                          placeholder="name@clinic.com" required dir="ltr"
                          className={`${FIELD_LTR} pr-8 pl-4 py-2.5 text-xs`} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 font-tajawal mb-1.5">كلمة المرور</label>
                        <div className="relative">
                          <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input type={showSignupPass ? 'text' : 'password'} value={signupForm.pass} onChange={sf('pass')}
                            placeholder="••••••" required minLength={6} dir="ltr"
                            className={`${FIELD_LTR} pr-8 pl-8 py-2.5 text-xs`} />
                          <button type="button" onClick={() => setShowSignupPass(p=>!p)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            {showSignupPass ? <EyeOff size={13}/> : <Eye size={13}/>}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 font-tajawal mb-1.5">تأكيد المرور</label>
                        <div className="relative">
                          <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input type={showConfirm ? 'text' : 'password'} value={signupForm.confirm} onChange={sf('confirm')}
                            placeholder="••••••" required minLength={6} dir="ltr"
                            className={`${FIELD_LTR} pr-8 pl-8 py-2.5 text-xs`} />
                          <button type="button" onClick={() => setShowConfirm(p=>!p)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            {showConfirm ? <EyeOff size={13}/> : <Eye size={13}/>}
                          </button>
                        </div>
                      </div>
                    </div>

                    {signupError && <Error>{signupError}</Error>}

                    <button type="submit" disabled={signupLoading}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold font-cairo text-sm disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg,#10B981,#059669)', boxShadow: '0 6px 20px rgba(16,185,129,0.28)' }}>
                      {signupLoading ? <><Loader2 size={15} className="animate-spin"/>جاري الإنشاء...</> : 'إنشاء الحساب ←'}
                    </button>

                    <p className="text-center text-xs text-slate-400 font-tajawal pt-1">
                      لديك حساب؟{' '}
                      <button type="button" onClick={() => setMode('login')} className="font-bold text-[#0099CC] hover:underline">
                        سجّل الدخول
                      </button>
                    </p>
                  </form>
                )
              )}

              {/* ── ADMIN ── */}
              {mode === 'admin' && (
                <form onSubmit={handleAdmin} className="space-y-4">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(13,27,62,0.08)' }}>
                      <Shield size={18} className="text-[#0D1B3E]" />
                    </div>
                    <div>
                      <p className="font-cairo font-bold text-[#0D1B3E] text-sm">لوحة إدارة مدار</p>
                      <p className="font-tajawal text-xs text-slate-400">مخصص لفريق مدار فقط</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 font-tajawal mb-1.5">البريد الإلكتروني</label>
                    <div className="relative">
                      <Mail size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)}
                        placeholder="admin@madar.software" required dir="ltr"
                        className={`${FIELD_LTR} pr-9 pl-4 py-3`} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 font-tajawal mb-1.5">كلمة المرور</label>
                    <div className="relative">
                      <Lock size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type={showAdminPass ? 'text' : 'password'} value={adminPass} onChange={e => setAdminPass(e.target.value)}
                        placeholder="••••••••" required dir="ltr" minLength={6}
                        className={`${FIELD_LTR} pr-9 pl-10 py-3`} />
                      <button type="button" onClick={() => setShowAdminPass(p=>!p)}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                        {showAdminPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                      </button>
                    </div>
                  </div>

                  {adminError && <Error>{adminError}</Error>}

                  <button type="submit" disabled={adminLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold font-cairo text-sm disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#0D1B3E,#1E3A5F)', boxShadow: '0 6px 20px rgba(13,27,62,0.3)' }}>
                    {adminLoading ? <><Loader2 size={15} className="animate-spin"/>جاري الدخول...</> : 'دخول لوحة الإدارة ←'}
                  </button>
                </form>
              )}

            </motion.div>
          </AnimatePresence>

          <p className="text-center text-xs text-slate-400 font-tajawal mt-4">
            للدعم:{' '}
            <a href="mailto:info@madar.software" className="text-[#0099CC] hover:underline font-bold">
              info@madar.software
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}

const Error = ({ children }: { children: string }) => (
  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
    className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600 font-tajawal">
    {children}
  </motion.div>
)
