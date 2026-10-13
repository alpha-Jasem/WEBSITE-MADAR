import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Phone, User, Building2, Eye, EyeOff, Lock, ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import './clinic-os-login.css'

export const ClinicOSSignup = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const pkgParam = searchParams.get('pkg') === 'ai_pro' ? 'ai_pro' : 'whatsapp'

  const [step, setStep]           = useState<'form' | 'sent'>('form')
  const [companyName, setCompanyName] = useState('')
  const [ownerName, setOwnerName]   = useState('')
  const [phone, setPhone]           = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [showPass, setShowPass]     = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyName.trim() || !ownerName.trim() || !phone.trim() || !email.trim() || !password) {
      setError('يرجى تعبئة جميع الحقول')
      return
    }
    if (password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      return
    }
    setLoading(true)
    setError('')
    try {
      // Save clinic data — AuthCallback will create the company after email confirmation
      const { error: signUpErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: 'https://madar.software/auth/callback',
          data: {
            full_name: ownerName.trim(),
            account_type: 'clinic',
            business_type: 'clinic',
            clinic_name: companyName.trim(),
            owner_phone: phone.trim(),
            package_type: pkgParam,
          },
        },
      })
      if (signUpErr) throw signUpErr
      setStep('sent')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already been registered')) {
        setError('هذا البريد الإلكتروني مسجّل مسبقاً. يمكنك الدخول من صفحة تسجيل الدخول.')
      } else {
        setError(msg || 'حدث خطأ، حاول مجدداً')
      }
    } finally {
      setLoading(false)
    }
  }

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
              <p>سنرسل لك رابط تفعيل على بريدك الإلكتروني.</p>
              <form onSubmit={handleSubmit}>
            <label>
              <span>اسم المنشأة</span>
              <div className="clinic-login-input"><Building2 /><input value={companyName} onChange={e => { setCompanyName(e.target.value); setError('') }} placeholder="اسم شركتك" style={{ direction: 'rtl', textAlign: 'right' }} /></div>
            </label>
            <label>
              <span>اسمك</span>
              <div className="clinic-login-input"><User /><input value={ownerName} onChange={e => { setOwnerName(e.target.value); setError('') }} placeholder="الاسم الكريم" style={{ direction: 'rtl', textAlign: 'right' }} /></div>
            </label>
            <label>
              <span>رقم الجوال</span>
              <div className="clinic-login-input"><Phone /><input type="tel" value={phone} onChange={e => { setPhone(e.target.value); setError('') }} placeholder="05xxxxxxxx" /></div>
            </label>
            <label>
              <span>البريد الإلكتروني</span>
              <div className="clinic-login-input"><Mail /><input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }} placeholder="name@company.com" autoComplete="email" /></div>
            </label>
            <label>
              <span>كلمة المرور</span>
              <div className="clinic-login-input"><Lock /><input type={showPass ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError('') }} placeholder="8 أحرف على الأقل" autoComplete="new-password" /><button type="button" onClick={() => setShowPass(v => !v)} aria-label={showPass ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>{showPass ? <EyeOff /> : <Eye />}</button></div>
            </label>
                {error && <div className="clinic-login-error" role="alert">{error}</div>}
                <button className="clinic-login-submit" type="submit" disabled={loading}>{loading ? 'جاري إنشاء الحساب...' : <>إنشاء الحساب <ArrowLeft /></>}</button>
              </form>
              <div className="clinic-login-signup">لديك حساب؟ <button onClick={() => navigate('/login')}>سجّل الدخول</button></div>
            </>
          ) : (
            <>
              <span className="clinic-login-label">تفعيل الحساب</span>
              <h2>تحقق من بريدك</h2>
              <p>أرسلنا رابط التفعيل إلى <strong dir="ltr">{email}</strong>. افتح الرسالة واضغط على الرابط، وبعدها يفتح لك الداشبورد تلقائيًا. الدخول لاحقًا من madar.software/login.</p>
              <button className="clinic-login-submit" type="button" onClick={() => { setStep('form'); setError('') }}>تغيير البيانات</button>
            </>
          )}
        </motion.div>
      </section>
    </main>
  )
}
