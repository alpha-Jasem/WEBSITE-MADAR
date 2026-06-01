import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react'
import { supabase } from '../lib/supabase'

export const ForgotPassword = () => {
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
      setError('تعذر إرسال رابط الاستعادة. تأكد من البريد وحاول مرة أخرى.')
      return
    }
    setSent(true)
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
              <Mail size={22} />
            </div>
            <p className="text-sm font-bold text-[#0099CC] font-cairo">استعادة كلمة المرور</p>
            <h1 className="mt-2 text-2xl font-black text-slate-950 font-cairo">هل نسيت كلمة المرور؟</h1>
            <p className="mt-2 text-sm leading-7 text-slate-500 font-tajawal">
              أدخل بريد حسابك وسنرسل لك رابطاً آمناً لتعيين كلمة مرور جديدة.
            </p>
          </div>

          {sent ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={20} className="mt-0.5 text-emerald-600" />
                <div>
                  <p className="text-sm font-bold text-emerald-800 font-cairo">تم إرسال رابط الاستعادة</p>
                  <p className="mt-1 text-xs leading-6 text-emerald-700 font-tajawal">
                    إذا كان البريد مسجلاً في مدار، ستصلك رسالة خلال لحظات. افتح الرابط من نفس الجهاز ثم عيّن كلمة مرور جديدة.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700 font-tajawal">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    required
                    placeholder="name@company.com"
                    dir="ltr"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-11 text-left text-sm text-slate-950 outline-none transition-all placeholder:text-slate-400 focus:border-[#00BFFF] focus:bg-white focus:ring-4 focus:ring-sky-400/15 font-sora"
                  />
                </div>
              </div>

              {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-tajawal">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-white transition-all disabled:opacity-60 font-cairo"
                style={{ background: 'linear-gradient(135deg, #00BFFF, #1565C0)', boxShadow: '0 16px 34px rgba(0,191,255,0.24)' }}
              >
                {loading && <Loader2 size={17} className="animate-spin" />}
                {loading ? 'جاري الإرسال...' : 'إرسال رابط الاستعادة'}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
