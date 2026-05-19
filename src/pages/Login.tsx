import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Loader2, Lock, Mail, ArrowLeft, Sparkles, Send } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { signInWithPassword, signInWithMagicLink, getCurrentUser } from '../lib/supabase'

type Mode = 'password' | 'magic'

export const Login = () => {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const afterLogin = async () => {
    const profile = await getCurrentUser()
    navigate(profile?.role === 'admin' ? '/admin' : '/client')
  }

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { error: err } = await signInWithPassword(email, password)
      if (err) throw err
      await afterLogin()
    } catch (err: any) {
      const msg = err?.message || ''
      setError(msg.includes('Invalid') || msg.includes('credentials')
        ? 'بريد إلكتروني أو كلمة مرور غير صحيحة'
        : 'حدث خطأ، حاول مجدداً')
    } finally { setLoading(false) }
  }

  const handleMagic = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { setError('أدخل بريدك الإلكتروني'); return }
    setError(''); setLoading(true)
    try {
      const { error: err } = await signInWithMagicLink(email)
      if (err) throw err
      setSuccess(`تم إرسال رابط الدخول إلى ${email}`)
    } catch (err: any) {
      setError('فشل إرسال رابط الدخول، حاول مجدداً')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: '#05060A' }}>
      {/* BG */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, #4F6EF7, transparent)' }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-10"
          style={{ background: 'radial-gradient(circle, #8B5CF6, transparent)' }} />
        <div className="absolute inset-0 grid-bg opacity-20" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <Link to="/">
          <motion.div whileHover={{ x: -3 }}
            className="flex items-center gap-2 text-slate-500 hover:text-white text-sm mb-8 transition-colors cursor-pointer font-tajawal">
            <ArrowLeft size={14} />
            العودة للرئيسية
          </motion.div>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-8"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(20px)' }}>

          {/* Logo */}
          <div className="text-center mb-7">
            <div style={{ background: 'white', borderRadius: 10, padding: '4px 12px', display: 'inline-flex', marginBottom: 12 }}>
              <img src="/logo.jpeg" alt="MADAR" style={{ height: 36, width: 'auto' }} />
            </div>
            <h1 className="text-2xl font-bold text-white font-cairo mb-1">أهلاً بك في MADAR</h1>
            <p className="text-sm text-slate-500 font-tajawal">سجّل دخولك للوصول للوحة التحكم</p>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-1.5 p-1 rounded-xl mb-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {([
              { id: 'password', label: 'كلمة المرور', icon: Lock },
              { id: 'magic',    label: 'رابط سريع',   icon: Sparkles },
            ] as { id: Mode; label: string; icon: typeof Lock }[]).map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => { setMode(id); setError(''); setSuccess('') }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-tajawal cursor-pointer transition-all ${
                  mode === id ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
                style={mode === id ? { background: 'linear-gradient(135deg, #4F6EF7, #7C3AED)' } : {}}>
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {mode === 'password' ? (
              <motion.form key="password"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                onSubmit={handlePassword} className="space-y-3">

                <div className="relative">
                  <Mail size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="البريد الإلكتروني" required dir="ltr"
                    className="w-full rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-slate-600 outline-none font-work transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                </div>

                <div className="relative">
                  <Lock size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required dir="ltr" minLength={6}
                    className="w-full rounded-xl px-4 py-3 pr-10 pl-10 text-sm text-white placeholder-slate-600 outline-none font-work transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer">
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-400 text-center font-tajawal">{error}</motion.p>}

                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 mt-1 disabled:opacity-60 cursor-pointer font-cairo"
                  style={{ background: 'linear-gradient(135deg, #4F6EF7, #7C3AED)', boxShadow: '0 0 25px rgba(79,110,247,0.35)' }}>
                  {loading && <Loader2 size={15} className="animate-spin" />}
                  {loading ? 'جاري الدخول...' : 'دخول'}
                </motion.button>
              </motion.form>
            ) : (
              <motion.form key="magic"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                onSubmit={handleMagic} className="space-y-4">
                <p className="text-xs text-slate-500 font-tajawal text-center leading-relaxed">
                  أدخل بريدك الإلكتروني وسنرسل لك رابط دخول فوري — بدون كلمة مرور
                </p>

                <div className="relative">
                  <Mail size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="البريد الإلكتروني" dir="ltr"
                    className="w-full rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-slate-600 outline-none font-work transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                </div>

                {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-400 text-center font-tajawal">{error}</motion.p>}
                {success && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-xl text-center"
                    style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <p className="text-sm text-emerald-400 font-tajawal">{success}</p>
                  </motion.div>
                )}

                {!success && (
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    type="submit" disabled={loading}
                    className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer font-cairo"
                    style={{ background: 'linear-gradient(135deg, #4F6EF7, #7C3AED)', boxShadow: '0 0 25px rgba(79,110,247,0.35)' }}>
                    {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    {loading ? 'جاري الإرسال...' : 'إرسال رابط الدخول'}
                  </motion.button>
                )}
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
