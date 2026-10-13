import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AuthShell } from './AuthShell'

export const ForgotPassword = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (resetError) {
      setError('تعذّر إرسال رابط الاستعادة. تأكد من البريد وحاول مرة أخرى.')
      return
    }
    setSent(true)
  }

  return (
    <AuthShell title={<>استعد وصولك<br />إلى حسابك</>} lead="نرسل لك رابطًا آمنًا على بريدك لتعيين كلمة مرور جديدة.">
      <span className="clinic-login-label">استعادة كلمة المرور</span>
      <h2>نسيت كلمة المرور؟</h2>
      <p>اكتب بريد حسابك وسنرسل لك الرابط.</p>

      {sent ? (
        <div className="clinic-login-ok" role="status">
          <CheckCircle2 />
          <div>
            <strong>تم إرسال الرابط</strong>
            <span>إذا كان البريد مسجلًا ستصلك رسالة خلال لحظات. افتح الرابط من نفس الجهاز، وتأكد من مجلد الرسائل غير المرغوبة.</span>
          </div>
        </div>
      ) : (
        <form onSubmit={submit}>
          <label>
            <span>البريد الإلكتروني</span>
            <div className="clinic-login-input"><Mail />
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }} placeholder="name@company.com" autoComplete="email" required autoFocus />
            </div>
          </label>
          {error && <div className="clinic-login-error" role="alert">{error}</div>}
          <button className="clinic-login-submit" type="submit" disabled={loading}>
            {loading ? <><Loader2 className="animate-spin" /> جاري الإرسال...</> : <>إرسال رابط الاستعادة <ArrowLeft /></>}
          </button>
        </form>
      )}

      <div className="clinic-login-signup">تذكرت كلمة المرور؟ <button onClick={() => navigate('/login')}>سجّل الدخول</button></div>
    </AuthShell>
  )
}
