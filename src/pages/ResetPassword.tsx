import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AuthShell } from './AuthShell'

export const ResetPassword = () => {
  const navigate = useNavigate()
  const isClinicOSPortal = new URLSearchParams(window.location.search).get('portal') === 'clinic-os'
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const prepareSession = async () => {
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) await supabase.auth.exchangeCodeForSession(code)
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        window.history.replaceState({}, '', window.location.pathname)
      }
      const { data } = await supabase.auth.getSession()
      setReady(Boolean(data.session))
      if (!data.session) setError('رابط الاستعادة غير صالح أو انتهت صلاحيته. اطلب رابطاً جديداً.')
    }
    prepareSession()
  }, [])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل.')
      return
    }
    if (password !== confirm) {
      setError('كلمتا المرور غير متطابقتين.')
      return
    }
    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateError) {
      setError('تعذر تحديث كلمة المرور. اطلب رابط استعادة جديد وحاول مرة أخرى.')
      return
    }
    setDone(true)
    window.setTimeout(() => navigate(isClinicOSPortal ? '/login' : '/admin/login', { replace: true }), 1800)
  }

  return (
    <AuthShell title={<>اختر كلمة مرور<br />جديدة</>} lead="بعد الحفظ تعود لصفحة الدخول وتستخدم كلمتك الجديدة.">
      <span className="clinic-login-label">تعيين كلمة مرور جديدة</span>
      <h2>كلمة مرور قوية</h2>
      <p>8 أحرف على الأقل.</p>

      {!ready && !done ? (
        <div className={error ? 'clinic-login-error' : 'clinic-login-note'} role={error ? 'alert' : 'status'}>
          {error || 'جاري التحقق من رابط الاستعادة...'}
        </div>
      ) : done ? (
        <div className="clinic-login-ok" role="status">
          <CheckCircle2 />
          <div><strong>تم تحديث كلمة المرور</strong><span>سيتم تحويلك الآن لتسجيل الدخول.</span></div>
        </div>
      ) : (
        <form onSubmit={submit}>
          {[
            { label: 'كلمة المرور الجديدة', value: password, setter: setPassword, auto: 'new-password' },
            { label: 'تأكيد كلمة المرور', value: confirm, setter: setConfirm, auto: 'new-password' },
          ].map(field => (
            <label key={field.label}>
              <span>{field.label}</span>
              <div className="clinic-login-input"><Lock />
                <input type={showPass ? 'text' : 'password'} value={field.value} onChange={e => { field.setter(e.target.value); setError('') }} required minLength={8} autoComplete={field.auto} />
                <button type="button" onClick={() => setShowPass(v => !v)} aria-label={showPass ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>{showPass ? <EyeOff /> : <Eye />}</button>
              </div>
            </label>
          ))}
          {error && <div className="clinic-login-error" role="alert">{error}</div>}
          <button className="clinic-login-submit" type="submit" disabled={loading}>
            {loading ? <><Loader2 className="animate-spin" /> جاري الحفظ...</> : <>حفظ كلمة المرور <ArrowLeft /></>}
          </button>
        </form>
      )}

      <div className="clinic-login-signup"><button onClick={() => navigate(isClinicOSPortal ? '/login' : '/admin/login')}>العودة لتسجيل الدخول</button></div>
    </AuthShell>
  )
}
