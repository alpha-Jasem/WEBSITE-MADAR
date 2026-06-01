import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase'

export const ResetPassword = () => {
  const navigate = useNavigate()
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
    window.setTimeout(() => navigate('/login', { replace: true }), 1800)
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#F0F4FA] px-4 py-8 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-[480px] flex-col justify-center">
        <Link to="/login" className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-tajawal text-slate-500 shadow-sm transition-colors hover:text-slate-900">
          <ArrowLeft size={15} />
          العودة لتسجيل الدخول
        </Link>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="mb-6">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-[#0099CC]">
              <Lock size={22} />
            </div>
            <p className="text-sm font-bold text-[#0099CC] font-cairo">تعيين كلمة مرور جديدة</p>
            <h1 className="mt-2 text-2xl font-black text-slate-950 font-cairo">اختر كلمة مرور قوية</h1>
            <p className="mt-2 text-sm leading-7 text-slate-500 font-tajawal">
              بعد الحفظ ستعود لصفحة الدخول وتستخدم كلمة المرور الجديدة.
            </p>
          </div>

          {!ready && !done ? (
            <div className={`rounded-2xl border p-4 ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-500'} font-tajawal text-sm`}>
              {error || 'جاري التحقق من رابط الاستعادة...'}
            </div>
          ) : done ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={20} className="mt-0.5 text-emerald-600" />
                <div>
                  <p className="text-sm font-bold text-emerald-800 font-cairo">تم تحديث كلمة المرور</p>
                  <p className="mt-1 text-xs leading-6 text-emerald-700 font-tajawal">سيتم تحويلك الآن لتسجيل الدخول.</p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {[
                { label: 'كلمة المرور الجديدة', value: password, setter: setPassword },
                { label: 'تأكيد كلمة المرور', value: confirm, setter: setConfirm },
              ].map(field => (
                <div key={field.label}>
                  <label className="mb-2 block text-sm font-bold text-slate-700 font-tajawal">{field.label}</label>
                  <div className="relative">
                    <Lock size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={field.value}
                      onChange={event => field.setter(event.target.value)}
                      required
                      minLength={8}
                      dir="ltr"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-11 py-3.5 text-left text-sm text-slate-950 outline-none transition-all placeholder:text-slate-400 focus:border-[#00BFFF] focus:bg-white focus:ring-4 focus:ring-sky-400/15 font-sora"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700">
                      {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
              ))}

              {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-tajawal">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-white transition-all disabled:opacity-60 font-cairo"
                style={{ background: 'linear-gradient(135deg, #00BFFF, #1565C0)', boxShadow: '0 16px 34px rgba(0,191,255,0.24)' }}
              >
                {loading && <Loader2 size={17} className="animate-spin" />}
                {loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور الجديدة'}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
