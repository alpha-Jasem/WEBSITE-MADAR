import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, ArrowLeft } from 'lucide-react'
import { supabase, signOut } from '../../lib/supabase'
import './clinic-os-login.css'

export const MfaChallenge = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = useMemo(() => {
    const r = searchParams.get('redirect')
    return r?.startsWith('/clinic-os/') ? r : '/clinic-os/dashboard'
  }, [searchParams])

  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    (async () => {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal?.currentLevel === 'aal2') {
        navigate(redirectTo, { replace: true })
        return
      }
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totp = factors?.totp?.find((f) => f.status === 'verified')
      if (!totp) {
        navigate(redirectTo, { replace: true })
        return
      }
      setFactorId(totp.id)
      setChecking(false)
    })()
  }, [navigate, redirectTo])

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault()
    if (!factorId || code.trim().length !== 6) {
      setError('أدخل رمز التحقق المكوّن من 6 أرقام.')
      return
    }
    setLoading(true)
    setError('')
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeError || !challenge) {
      setError('تعذّر بدء التحقق. حاول مرة أخرى.')
      setLoading(false)
      return
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.trim(),
    })
    if (verifyError) {
      setError('رمز التحقق غير صحيح.')
      setLoading(false)
      return
    }
    navigate(redirectTo, { replace: true })
  }

  const cancel = async () => {
    await signOut()
    navigate('/clinic-os/login', { replace: true })
  }

  if (checking) return null

  return (
    <main className="clinic-login" dir="rtl">
      <section className="clinic-login-brand">
        <button className="clinic-login-logo" onClick={() => navigate('/')}>
          <img src="/logo-main.png" alt="Madar.software" />
          <span><strong>Madar.software</strong><small>Clinic OS للعيادات</small></span>
        </button>
        <div className="clinic-login-message">
          <span className="clinic-login-kicker">تحقق إضافي</span>
          <h1>خطوة أخيرة<br />قبل الدخول.</h1>
          <p>هذا الحساب مفعّل عليه التحقق بخطوتين لحماية بيانات عملك.</p>
        </div>
      </section>

      <section className="clinic-login-panel">
        <motion.div className="clinic-login-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <button className="clinic-login-back" onClick={cancel}><ArrowLeft /> تسجيل خروج</button>
          <span className="clinic-login-label"><ShieldCheck size={14} style={{ verticalAlign: 'middle', marginLeft: 4 }} /> التحقق بخطوتين</span>
          <h2>أدخل رمز التطبيق</h2>
          <p>افتح تطبيق المصادقة (Google Authenticator أو ما شابه) وأدخل الرمز المكوّن من 6 أرقام.</p>

          <form onSubmit={handleVerify}>
            <label>
              <span>رمز التحقق</span>
              <div className="clinic-login-input">
                <input
                  type="text" inputMode="numeric" maxLength={6} value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError('') }}
                  placeholder="000000" autoFocus
                  style={{ textAlign: 'center', letterSpacing: 6, fontSize: 20 }}
                />
              </div>
            </label>
            {error && <div className="clinic-login-error" role="alert">{error}</div>}
            <button className="clinic-login-submit" type="submit" disabled={loading}>{loading ? 'جارِ التحقق...' : <>تأكيد <ArrowLeft /></>}</button>
          </form>
        </motion.div>
      </section>
    </main>
  )
}
