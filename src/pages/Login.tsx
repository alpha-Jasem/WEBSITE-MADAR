import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useSystemChrome } from '../hooks/useSystemChrome'
import { signInWithPassword, getCurrentUser, signOut } from '../lib/supabase'

const css = `
.al,.al *{box-sizing:border-box;font-family:'IBM Plex Sans Arabic',system-ui,sans-serif}
.al{min-height:100vh;min-height:100dvh;display:grid;grid-template-columns:minmax(0,1fr);place-items:center;padding:24px;position:relative;overflow:hidden;color:#e8eefc;
  background:radial-gradient(ellipse 80% 60% at 92% -10%,oklch(.40 .28 252) 0%,transparent 55%),radial-gradient(ellipse 55% 55% at -8% 98%,oklch(.36 .26 265) 0%,transparent 55%),#050a18}
.al-orb{position:absolute;border-radius:50%;filter:blur(70px);pointer-events:none;opacity:.55}
.al-orb.a{width:380px;height:380px;background:rgba(48,120,255,.35);top:-120px;right:-80px}
.al-orb.b{width:320px;height:320px;background:rgba(110,80,255,.30);bottom:-110px;left:-60px}
.al-aurora{position:absolute;inset:-30%;pointer-events:none;opacity:.55;filter:blur(60px);background:conic-gradient(from 0deg at 50% 50%,rgba(58,120,255,.55),rgba(122,92,255,.5),rgba(40,200,230,.4),rgba(58,120,255,.55));animation:alspin 24s linear infinite}
@keyframes alspin{to{transform:rotate(360deg)}}
@keyframes aldrift{to{background-position:44px 44px}}
@keyframes alfloat{50%{transform:translateY(-6px)}}
@keyframes alborder{to{--ang:360deg}}
@keyframes alshine{0%{transform:translateX(120%)}60%,100%{transform:translateX(-120%)}}
@property --ang{syntax:'<angle>';initial-value:0deg;inherits:false}
.al-grid{position:absolute;inset:0;pointer-events:none;opacity:.5;animation:aldrift 6s linear infinite;
  background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);
  background-size:44px 44px;mask-image:radial-gradient(ellipse 70% 60% at 50% 45%,#000 30%,transparent 75%);-webkit-mask-image:radial-gradient(ellipse 70% 60% at 50% 45%,#000 30%,transparent 75%)}
.al-card::before{content:'';position:absolute;inset:-1px;border-radius:21px;padding:1px;pointer-events:none;background:conic-gradient(from var(--ang),transparent 0 70%,rgba(122,162,255,.9) 85%,transparent 100%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:alborder 6s linear infinite}
.al-card{position:relative;z-index:1;width:100%;padding:34px 30px 28px;border-radius:20px;
  background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.10);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
  box-shadow:0 24px 64px rgba(0,0,0,.6),0 0 80px rgba(40,100,255,.12)}
.al-brand{display:flex;align-items:center;gap:10px;margin-bottom:26px;direction:ltr;width:max-content}
.al-brand img{width:36px;height:36px;object-fit:contain}
.al-brand b{font-size:16px;font-weight:700;letter-spacing:.01em}
.al-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;font-size:11px;font-weight:600;color:#9bbcff;background:rgba(48,120,255,.16);border:1px solid rgba(48,120,255,.32)}
.al-card h1{margin:14px 0 6px;font-size:27px;font-weight:700;line-height:1.35}
.al-card .sub{margin:0 0 26px;font-size:13px;line-height:1.8;color:rgba(232,238,252,.62)}
.al-form{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}.al-field{min-width:0}
.al-field>span{display:block;margin-bottom:7px;font-size:12px;font-weight:600;color:rgba(232,238,252,.78)}
.al-input{height:48px;padding:0 13px;display:flex;align-items:center;gap:10px;border-radius:11px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);transition:border-color .18s,box-shadow .18s,background .18s}
.al-input:focus-within{border-color:#5b8cff;background:rgba(255,255,255,.08);box-shadow:0 0 0 3px rgba(91,140,255,.22)}
.al-input>svg{width:17px;height:17px;flex:none;color:rgba(232,238,252,.45)}
.al-input input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:#fff;font-size:14px;direction:ltr;text-align:left}
.al-input input::placeholder{color:rgba(232,238,252,.32)}
.al-input input:-webkit-autofill{-webkit-text-fill-color:#fff;transition:background-color 9999s}
.al-eye{width:44px;height:44px;margin-inline-end:-10px;display:grid;place-items:center;border:0;background:none;color:rgba(232,238,252,.5);cursor:pointer;border-radius:10px;transition:color .15s}
.al-eye:hover{color:#fff}.al-eye:focus-visible,.al-submit:focus-visible{outline:2px solid #7aa2ff;outline-offset:2px}
.al-eye svg{width:17px;height:17px}
.al-error{padding:10px 13px;border-radius:10px;font-size:12.5px;line-height:1.7;color:#ffb4a8;background:rgba(240,80,60,.14);border:1px solid rgba(240,80,60,.3)}
.al-submit{position:relative;overflow:hidden;height:50px;border:0;border-radius:11px;color:#fff;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;
  background:linear-gradient(135deg,#3a78ff,#6b4dff);box-shadow:0 10px 28px rgba(58,120,255,.38);transition:filter .18s,box-shadow .18s}
.al-submit:hover:not(:disabled){filter:brightness(1.1);box-shadow:0 12px 34px rgba(58,120,255,.5)}
.al-submit::after{content:'';position:absolute;inset:0;width:45%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.28),transparent);animation:alshine 4.5s ease-in-out infinite}
.al-submit:disabled{opacity:.7;cursor:wait}.al-submit svg{width:17px;height:17px}
.al-forgot{justify-self:start;font-size:12px;color:#9bbcff;text-decoration:none;margin-top:-6px}.al-forgot:hover{text-decoration:underline}.al-forgot:focus-visible{outline:2px solid #7aa2ff;outline-offset:3px;border-radius:4px}
.al-foot{margin:20px 0 0;text-align:center;font-size:11.5px;color:rgba(232,238,252,.42)}
@media (prefers-reduced-motion:reduce){.al *,.al *::before,.al *::after{transition:none!important;animation:none!important}}
`

export const Login = () => {
  useSystemChrome('#050a18')
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const [searchParams] = useSearchParams()
  const redirectTo = useMemo(() => {
    const r = searchParams.get('redirect')
    return r?.startsWith('/') ? r : null
  }, [searchParams])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(0)

  const fail = (msg: string) => { setError(msg); setShake(n => n + 1) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: authErr } = await signInWithPassword(email, password)
      if (authErr) throw authErr
      const profile = await getCurrentUser()
      if (profile?.role !== 'admin') { await signOut(); fail('ليس لديك صلاحية الوصول للإدارة'); return }
      navigate(redirectTo || '/admin', { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      fail(msg.includes('Invalid') || msg.includes('credentials') ? 'البريد أو كلمة المرور غير صحيحة' : 'حدث خطأ، حاول مجددًا')
    } finally {
      setLoading(false)
    }
  }

  const item = (i: number) => reduce
    ? {}
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, delay: 0.12 + i * 0.07, ease: [0.22, 1, 0.36, 1] as const } }

  return (
    <main className="al" dir="rtl">
      <style>{css}</style>
      <motion.div className="al-orb a" aria-hidden="true"
        animate={reduce ? undefined : { x: [0, -90, 20, 0], y: [0, 70, -20, 0], scale: [1, 1.2, 0.95, 1] }} transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="al-orb b" aria-hidden="true"
        animate={reduce ? undefined : { x: [0, 80, -20, 0], y: [0, -60, 20, 0], scale: [1, 0.9, 1.15, 1] }} transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }} />
      <div className="al-aurora" aria-hidden="true" />
      <div className="al-grid" aria-hidden="true" />

      <motion.div className="al-float" style={{ position: 'relative', zIndex: 1, width: 'min(100%,420px)' }}>
      <motion.section className="al-card"
        initial={reduce ? false : { opacity: 0, y: 22, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        <motion.div className="al-brand" {...item(0)}>
          <img src="/logo-main.png" alt="" />
          <b>Madar.software</b>
        </motion.div>

        <motion.span className="al-badge" {...item(1)}><ShieldCheck size={13} /> بوابة الإدارة</motion.span>
        <motion.h1 {...item(2)}>تسجيل دخول الإدارة</motion.h1>
        <motion.p className="sub" {...item(3)}>الدخول مخصص لفريق مدار فقط.</motion.p>

        <motion.form className="al-form" onSubmit={handleSubmit} {...item(4)}>
          <label className="al-field">
            <span>البريد الإلكتروني</span>
            <div className="al-input"><Mail />
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="name@madar.software" autoComplete="username" required autoFocus />
            </div>
          </label>

          <label className="al-field">
            <span>كلمة المرور</span>
            <div className="al-input"><Lock />
              <input type={show ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="كلمة المرور" autoComplete="current-password" required minLength={6} />
              <button type="button" className="al-eye" onClick={() => setShow(v => !v)} aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>
                {show ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </label>

          <Link to="/forgot-password" className="al-forgot">نسيت كلمة المرور؟</Link>

          {error && (
            <motion.div key={shake} className="al-error" role="alert"
              initial={reduce ? false : { opacity: 0, x: 0 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, x: [0, -8, 8, -6, 6, 0] }}
              transition={{ duration: 0.4 }}>
              {error}
            </motion.div>
          )}

          <motion.button className="al-submit" type="submit" disabled={loading}
            whileHover={reduce || loading ? undefined : { y: -1 }} whileTap={reduce || loading ? undefined : { scale: 0.98 }}>
            {loading ? <><Loader2 className="animate-spin" /> جاري الدخول...</> : <>دخول لوحة الإدارة <ArrowLeft /></>}
          </motion.button>
        </motion.form>

        <motion.p className="al-foot" {...item(5)}>للدعم: info@madar.software</motion.p>
      </motion.section>
      </motion.div>
    </main>
  )
}
