import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Phone, User, Building2, Eye, EyeOff, Lock, ArrowLeft, Loader2, KeyRound } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import './clinic-os-login.css'

const ERRORS: Record<string, string> = {
  email_already_registered: 'هذا البريد مسجّل مسبقًا. سجّل الدخول من صفحة الدخول.',
  missing_required_fields: 'يرجى تعبئة جميع الحقول.',
  company_create_failed: 'تعذّر إنشاء حسابك. حاول مرة أخرى بعد قليل.',
  otp_invalid: 'الرمز غير صحيح أو انتهت صلاحيته. اطلب رمزًا جديدًا.',
}

export const ClinicOSSignup = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [companyName, setCompanyName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    if (cooldown <= 0) return
    const t = window.setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => window.clearTimeout(t)
  }, [cooldown])

  const cleanEmail = email.trim().toLowerCase()

  const sendCode = async (createUser: boolean) => {
    let { error: err } = await supabase.auth.signInWithOtp({ email: cleanEmail, options: { shouldCreateUser: createUser } })
    if (err && createUser && /(already|duplicate|exists)/i.test(err.message || '')) {
      err = (await supabase.auth.signInWithOtp({ email: cleanEmail, options: { shouldCreateUser: false } })).error
    }
    if (err) throw err
  }

  const explain = (err: unknown) => {
    const raw = err instanceof Error ? err.message : String(err || '')
    if (ERRORS[raw]) return ERRORS[raw]
    const msg = raw.toLowerCase()
    if (msg.includes('rate limit') || msg.includes('security purposes')) return 'أرسلنا لك رمزًا قبل قليل. انتظر دقيقة ثم أعد المحاولة.'
    if (msg.includes('invalid email')) return 'اكتب بريدًا إلكترونيًا صحيحًا.'
    return 'حدث خطأ، حاول مجددًا.'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyName.trim() || !ownerName.trim() || !phone.trim() || !cleanEmail || !password) { setError('يرجى تعبئة جميع الحقول'); return }
    if (password.length < 8) { setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return }
    setLoading(true)
    setError('')
    try {
      await sendCode(true)
      setOtp('')
      setCooldown(60)
      setStep('otp')
    } catch (err) {
      setError(explain(err))
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = otp.replace(/\D/g, '')
    if (token.length < 6) { setError('اكتب الرمز الذي وصلك على البريد'); return }
    setLoading(true)
    setError('')
    try {
      let session = null
      for (const type of ['email', 'signup'] as const) {
        const { data, error: vErr } = await supabase.auth.verifyOtp({ email: cleanEmail, token, type })
        if (!vErr && data.session) { session = data.session; break }
      }
      if (!session) throw new Error('otp_invalid')

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trial-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          action: 'create_company',
          company_name: companyName.trim(),
          owner_name: ownerName.trim(),
          phone: phone.trim(),
          email: cleanEmail,
        }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result.error || 'company_create_failed')

      const { error: pwErr } = await supabase.auth.updateUser({ password })
      if (pwErr) console.warn('Password update failed (non-fatal):', pwErr.message)

      navigate('/dashboard?welcome=1', { replace: true })
    } catch (err) {
      setError(explain(err))
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    if (cooldown > 0) return
    setError('')
    try {
      await sendCode(false)
      setCooldown(60)
    } catch (err) {
      setError(explain(err))
    }
  }

  const field = (label: string, icon: React.ReactNode, input: React.ReactNode) => (
    <label>
      <span>{label}</span>
      <div className="clinic-login-input">{icon}{input}</div>
    </label>
  )

  return (
    <main className="clinic-login" dir="rtl">
      <section className="clinic-login-brand">
        <img className="clinic-login-hero" src="/clinic-os/login-hero.png" alt="" aria-hidden="true" />
        <button className="clinic-login-logo" onClick={() => navigate('/login')}>
          <img src="/logo-main.png" alt="Madar.software" />
          <span><strong>Madar.software</strong></span>
        </button>
        <div className="clinic-login-message">
          <h1>ابدأ مع وكيلك<br />على Madar.software</h1>
          <p>أنشئ حسابك وتابع محادثات ومكالمات وكلائك من لوحة واحدة.</p>
        </div>
      </section>

      <section className="clinic-login-panel">
        <motion.div className="clinic-login-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          {step === 'form' ? (
            <>
              <span className="clinic-login-label">إنشاء حساب</span>
              <h2>أنشئ حسابك</h2>
              <p>سنرسل رمز تحقق إلى بريدك الإلكتروني.</p>
              <form onSubmit={handleSubmit}>
                {field('اسم المنشأة', <Building2 />, <input value={companyName} onChange={e => { setCompanyName(e.target.value); setError('') }} placeholder="اسم شركتك" style={{ direction: 'rtl', textAlign: 'right' }} />)}
                {field('اسمك', <User />, <input value={ownerName} onChange={e => { setOwnerName(e.target.value); setError('') }} placeholder="الاسم الكريم" style={{ direction: 'rtl', textAlign: 'right' }} />)}
                {field('رقم الجوال', <Phone />, <input type="tel" value={phone} onChange={e => { setPhone(e.target.value); setError('') }} placeholder="05xxxxxxxx" />)}
                {field('البريد الإلكتروني', <Mail />, <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }} placeholder="name@company.com" autoComplete="email" />)}
                {field('كلمة المرور', <Lock />, <>
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError('') }} placeholder="8 أحرف على الأقل" autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPass(v => !v)} aria-label={showPass ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>{showPass ? <EyeOff /> : <Eye />}</button>
                </>)}
                {error && <div className="clinic-login-error" role="alert">{error}</div>}
                <button className="clinic-login-submit" type="submit" disabled={loading}>
                  {loading ? <><Loader2 className="animate-spin" /> جاري الإرسال...</> : <>إرسال رمز التحقق <ArrowLeft /></>}
                </button>
              </form>
              <div className="clinic-login-signup">لديك حساب؟ <button onClick={() => navigate('/login')}>سجّل الدخول</button></div>
            </>
          ) : (
            <>
              <span className="clinic-login-label">تحقق من البريد</span>
              <h2>أدخل رمز التحقق</h2>
              <p>أرسلنا رمزًا إلى <strong dir="ltr">{cleanEmail}</strong>. اكتبه هنا لإكمال إنشاء الحساب.</p>
              <form onSubmit={handleVerify}>
                {field('رمز التحقق', <KeyRound />, <input value={otp} onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 10)); setError('') }}
                  inputMode="numeric" autoComplete="one-time-code" placeholder="00000000" autoFocus maxLength={10}
                  style={{ letterSpacing: '0.3em', fontSize: 18, textAlign: 'center' }} />)}
                {error && <div className="clinic-login-error" role="alert">{error}</div>}
                <button className="clinic-login-submit" type="submit" disabled={loading}>
                  {loading ? <><Loader2 className="animate-spin" /> جاري التحقق...</> : <>تأكيد وإنشاء الحساب <ArrowLeft /></>}
                </button>
              </form>
              <div className="clinic-login-signup">
                لم يصلك الرمز؟ <button type="button" onClick={resend} disabled={cooldown > 0}>{cooldown > 0 ? `أعد الإرسال بعد ${cooldown} ثانية` : 'أرسل رمزًا جديدًا'}</button>
                <br /><button type="button" onClick={() => { setStep('form'); setError('') }}>تغيير البيانات</button>
              </div>
            </>
          )}
        </motion.div>
      </section>
    </main>
  )
}
