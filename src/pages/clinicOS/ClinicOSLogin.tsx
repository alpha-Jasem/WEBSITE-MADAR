import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Check, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import './clinic-os-login.css'

export const ClinicOSLogin = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim() || !password) {
      setError('أدخل البريد الإلكتروني وكلمة المرور.')
      return
    }

    setLoading(true)
    setError('')
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (loginError) {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.')
      setLoading(false)
      return
    }

    navigate('/clinic-os/dashboard', { replace: true })
  }

  return (
    <main className="clinic-login" dir="rtl">
      <section className="clinic-login-brand">
        <button className="clinic-login-logo" onClick={() => navigate('/')}>
          <img src="/logo-main.png" alt="Madar.software" />
          <span><strong>Madar.software</strong><small>Clinic OS للعيادات</small></span>
        </button>
        <div className="clinic-login-message">
          <span className="clinic-login-kicker">نظام تشغيل يومي للعيادات</span>
          <h1>ابدأ يوم العيادة<br />من شاشة واحدة.</h1>
          <p>المواعيد والمرضى والأطباء والتقارير أمام فريقك بوضوح، من أول موعد حتى نهاية اليوم.</p>
          <div className="clinic-login-benefits">
            {['دخول آمن وسريع', 'صلاحيات مستقلة لكل مستخدم', 'يعمل على الكمبيوتر والجوال'].map(item => (
              <span key={item}><i><Check /></i>{item}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="clinic-login-panel">
        <motion.div className="clinic-login-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <button className="clinic-login-back" onClick={() => navigate('/')}><ArrowLeft /> العودة للموقع</button>
          <span className="clinic-login-label">تسجيل الدخول</span>
          <h2>مرحباً بعودتك</h2>
          <p>أدخل بيانات حساب العيادة للوصول إلى لوحة التشغيل.</p>

          <form onSubmit={handleLogin}>
            <label>
              <span>البريد الإلكتروني</span>
              <div className="clinic-login-input"><Mail /><input type="email" value={email} onChange={event => { setEmail(event.target.value); setError('') }} placeholder="email@clinic.sa" autoComplete="email" autoFocus /></div>
            </label>
            <label>
              <span>كلمة المرور</span>
              <div className="clinic-login-input"><LockKeyhole /><input type={showPassword ? 'text' : 'password'} value={password} onChange={event => { setPassword(event.target.value); setError('') }} placeholder="أدخل كلمة المرور" autoComplete="current-password" /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>{showPassword ? <EyeOff /> : <Eye />}</button></div>
            </label>

            <div className="clinic-login-help"><button type="button" onClick={() => navigate('/forgot-password')}>هل نسيت كلمة المرور؟</button></div>
            {error && <div className="clinic-login-error" role="alert">{error}</div>}
            <button className="clinic-login-submit" type="submit" disabled={loading}>{loading ? 'جاري الدخول...' : <>دخول لوحة العيادة <ArrowLeft /></>}</button>
          </form>

          <div className="clinic-login-signup">ليس لديك حساب؟ <button onClick={() => navigate('/trial')}>أنشئ حساب عيادة</button></div>
        </motion.div>
      </section>
    </main>
  )
}
