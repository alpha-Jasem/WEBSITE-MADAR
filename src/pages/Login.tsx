import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Loader2, Lock, Mail, ArrowLeft, Shield, User } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { signInWithPassword, getCurrentUser, signOut } from '../lib/supabase'

type Portal = 'client' | 'admin'

export const Login = () => {
  const navigate = useNavigate()
  const [portal, setPortal]     = useState<Portal>('client')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const adminAccent  = '#F59E0B'
  const clientAccent = '#00BFFF'
  const accent = portal === 'admin' ? adminAccent : clientAccent

  const afterLogin = async () => {
    const profile = await getCurrentUser()
    const role = profile?.role ?? 'client'

    if (portal === 'admin' && role !== 'admin') {
      await signOut()
      setError('ليس لديك صلاحية الوصول للوحة الإدارة')
      return
    }

    if (portal === 'client' && role === 'admin') {
      await signOut()
      setError('حسابك مخصص للإدارة — استخدم بوابة الإدارة')
      return
    }

    navigate(role === 'admin' ? '/admin' : '/client')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: err } = await signInWithPassword(email, password)
      if (err) throw err
      await afterLogin()
    } catch (err: any) {
      const msg = err?.message || ''
      setError(
        msg.includes('Invalid') || msg.includes('credentials')
          ? 'بريد إلكتروني أو كلمة مرور غير صحيحة'
          : 'حدث خطأ، حاول مجدداً'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: '#050810' }}>

      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-[-15%] left-[-10%] w-[700px] h-[700px] rounded-full"
          animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          style={{ background: `radial-gradient(circle, ${accent}12 0%, transparent 65%)`, filter: 'blur(70px)', transition: 'background 0.5s' }}
        />
        <motion.div
          className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full"
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          style={{ background: 'radial-gradient(circle, rgba(13,27,62,0.8) 0%, transparent 65%)', filter: 'blur(60px)' }}
        />
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(0,191,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,191,255,0.025) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }} />
      </div>

      <div className="w-full max-w-lg relative z-10">

        {/* Back */}
        <Link to="/">
          <motion.div whileHover={{ x: -4 }}
            className="flex items-center gap-2 text-sm mb-8 w-fit font-tajawal transition-colors"
            style={{ color: 'rgba(255,255,255,0.35)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
          >
            <ArrowLeft size={14} />
            العودة للرئيسية
          </motion.div>
        </Link>

        {/* Portal Selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {([
            { id: 'client', label: 'بوابة العملاء', sub: 'تتبع مشروعك وأتمتتك', icon: User,   accent: clientAccent },
            { id: 'admin',  label: 'لوحة الإدارة',  sub: 'التحكم الكامل بالنظام', icon: Shield, accent: adminAccent  },
          ] as { id: Portal; label: string; sub: string; icon: typeof User; accent: string }[]).map(p => (
            <motion.button
              key={p.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setPortal(p.id); setError('') }}
              className="relative p-4 rounded-2xl text-right cursor-pointer transition-all overflow-hidden"
              style={{
                background: portal === p.id ? `${p.accent}10` : 'rgba(255,255,255,0.03)',
                border: portal === p.id ? `1px solid ${p.accent}40` : '1px solid rgba(255,255,255,0.07)',
                boxShadow: portal === p.id ? `0 0 24px ${p.accent}15` : 'none',
              }}
            >
              {portal === p.id && (
                <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${p.accent}80, transparent)` }} />
              )}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: portal === p.id ? `${p.accent}20` : 'rgba(255,255,255,0.05)', border: `1px solid ${portal === p.id ? p.accent + '30' : 'rgba(255,255,255,0.08)'}` }}>
                  <p.icon size={16} style={{ color: portal === p.id ? p.accent : 'rgba(255,255,255,0.3)' }} />
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold font-cairo" style={{ color: portal === p.id ? 'white' : 'rgba(255,255,255,0.45)' }}>
                    {p.label}
                  </p>
                  <p className="text-[11px] font-tajawal mt-0.5" style={{ color: portal === p.id ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.2)' }}>
                    {p.sub}
                  </p>
                </div>
              </div>
              {portal === p.id && (
                <div className="absolute top-3 left-3 w-2 h-2 rounded-full animate-pulse" style={{ background: p.accent }} />
              )}
            </motion.button>
          ))}
        </div>

        {/* Login Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={portal}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-3xl p-8"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${accent}20`,
              backdropFilter: 'blur(24px)',
              boxShadow: `0 0 0 1px ${accent}08, 0 32px 80px rgba(0,0,0,0.4), 0 0 60px ${accent}06`,
            }}
          >
            <div className="absolute top-0 inset-x-8 h-px rounded-full"
              style={{ background: `linear-gradient(90deg, transparent, ${accent}60, transparent)` }} />

            {/* Header */}
            <div className="flex flex-col items-center mb-8">
              <div className="flex items-center gap-2.5 mb-4">
                <img src="/logo-main.png" alt="Madar"
                  style={{ height: 42, width: 'auto', objectFit: 'contain', filter: `drop-shadow(0 0 12px ${accent}50)` }} />
                <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 21, fontWeight: 700, letterSpacing: '-0.3px', lineHeight: 1 }}>
                  <span className="shimmer-text">Madar</span>
                  <span className="shimmer-text-blue">.software</span>
                </span>
              </div>
              <div className="w-10 h-px mb-4" style={{ background: `linear-gradient(90deg, transparent, ${accent}60, transparent)` }} />
              <h1 className="text-xl font-bold text-white font-cairo mb-1">
                {portal === 'admin' ? 'دخول الإدارة' : 'دخول العملاء'}
              </h1>
              <p className="text-sm font-tajawal" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {portal === 'admin' ? 'صلاحيات كاملة للتحكم بالنظام' : 'تتبع مشاريعك وأتمتتك'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.25)' }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="البريد الإلكتروني" required dir="ltr"
                  className="w-full rounded-xl px-4 py-3.5 pr-10 text-sm text-white placeholder-slate-600 outline-none font-work transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  onFocus={e => (e.currentTarget.style.border = `1px solid ${accent}50`)}
                  onBlur={e => (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)')}
                />
              </div>

              <div className="relative">
                <Lock size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.25)' }} />
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required dir="ltr" minLength={6}
                  className="w-full rounded-xl px-4 py-3.5 pr-10 pl-11 text-sm text-white placeholder-slate-600 outline-none font-work transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  onFocus={e => (e.currentTarget.style.border = `1px solid ${accent}50`)}
                  onBlur={e => (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)')}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 cursor-pointer transition-colors"
                  style={{ color: 'rgba(255,255,255,0.25)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}>
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  <p className="text-xs text-red-400 font-tajawal">{error}</p>
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.02, boxShadow: `0 0 35px ${accent}40` }}
                whileTap={{ scale: 0.97 }}
                type="submit" disabled={loading}
                className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 mt-2 cursor-pointer font-cairo disabled:opacity-60 transition-all"
                style={{
                  background: portal === 'admin'
                    ? 'linear-gradient(135deg, #92400e, #F59E0B)'
                    : 'linear-gradient(135deg, #0D1B3E, #0099CC)',
                  color: 'white',
                  boxShadow: portal === 'admin' ? '0 4px 20px rgba(245,158,11,0.25)' : '0 4px 20px rgba(0,153,204,0.25)',
                }}
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                {loading ? 'جاري الدخول...' : portal === 'admin' ? 'دخول لوحة الإدارة' : 'دخول البوابة'}
              </motion.button>
            </form>

            <p className="text-center text-xs mt-6 font-tajawal" style={{ color: 'rgba(255,255,255,0.18)' }}>
              للدعم:{' '}
              <a href="mailto:info@madar.software" style={{ color: `${accent}70` }}
                onMouseEnter={e => (e.currentTarget.style.color = accent)}
                onMouseLeave={e => (e.currentTarget.style.color = `${accent}70`)}>
                info@madar.software
              </a>
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
