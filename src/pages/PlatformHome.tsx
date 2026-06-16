import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  Stethoscope, Bot, Zap, Phone, MessageCircle,
  ArrowLeft, CheckCircle2, TrendingUp, Clock,
  X, Send, Sparkles, BarChart2, Users,
} from 'lucide-react'
import { Navbar } from '../components/public/Navbar'
import { Footer } from '../components/public/Footer'
import { useLanguage } from '../context/LanguageContext'
import { openWhatsAppChat } from '../lib/whatsapp'

gsap.registerPlugin(ScrollTrigger)

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const BG       = '#09090B'
const GOLD     = '#D4A853'
const GOLD_LT  = '#E8C47A'
const CW       = '#38BDF8'
const CL       = '#34D399'
const TEXT     = '#FAFAFA'
const MUTED    = 'rgba(250,250,250,0.42)'
const FAINT    = 'rgba(250,250,250,0.08)'
const BORDER   = 'rgba(255,255,255,0.08)'
const CARD     = 'rgba(255,255,255,0.028)'

const WA = '966546666005'
function goTop() { window.scrollTo({ top: 0, behavior: 'instant' }) }

// ─── FadeUp helper ──────────────────────────────────────────────────────────────
function FadeUp({ children, delay = 0, className = '', style = {} }: {
  children: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-30px' })
  return (
    <motion.div ref={ref} className={className} style={style}
      initial={{ opacity: 0, y: 22 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  )
}

// ─── Dashboard Mockup ────────────────────────────────────────────────────────────
function DashMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
      style={{ position: 'relative', width: '100%', maxWidth: 460 }}>

      {/* Main card */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 20, padding: 22,
        backdropFilter: 'blur(24px)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }}>
        {/* Topbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span style={{ color: MUTED, fontSize: 11, fontFamily: 'Cairo, sans-serif', letterSpacing: '0.05em' }}>Clinic OS · لوحة التحكم</span>
          <div style={{ display: 'flex', gap: 5 }}>
            {['#EF4444', '#F59E0B', '#22C55E'].map((c, i) => (
              <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: c, opacity: 0.7 }} />
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
          {[
            { label: 'اليوم', value: '٢٤', color: CW },
            { label: 'الإيراد', value: '١٢٠٠', color: GOLD },
            { label: 'أُنجزوا', value: '١٩', color: CL },
          ].map((s, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 11, padding: '11px 8px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: 'Cairo, sans-serif', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', fontFamily: 'Tajawal, sans-serif', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Appointments list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { patient: 'أ. محمد العمري',  badge: 'قيد الانتظار', time: '٩:٠٠', color: CW },
            { patient: 'أ. سارة الحربي',  badge: 'مكتمل',        time: '٩:٣٠', color: CL },
            { patient: 'أ. خالد المطيري', badge: 'قادم',          time: '١٠:٠٠', color: GOLD },
          ].map((item, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 + i * 0.12 }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 0',
                borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Stethoscope size={12} color="rgba(255,255,255,0.25)" />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontFamily: 'Tajawal, sans-serif' }}>{item.patient}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'Cairo, sans-serif' }}>{item.time}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, color: item.color,
                  background: `${item.color}14`, border: `1px solid ${item.color}25`,
                  padding: '2px 7px', borderRadius: 999, fontFamily: 'Cairo, sans-serif',
                }}>{item.badge}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Floating WhatsApp notification */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: [0, -5, 0] }}
        transition={{ opacity: { delay: 1.4, duration: 0.4 }, scale: { delay: 1.4, duration: 0.4 }, y: { repeat: Infinity, duration: 3.5, ease: 'easeInOut', delay: 2 } }}
        style={{
          position: 'absolute', bottom: -22, right: -16,
          background: 'rgba(37,211,102,0.12)',
          border: '1px solid rgba(37,211,102,0.28)',
          borderRadius: 13, padding: '9px 13px',
          backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', gap: 7,
          boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
          zIndex: 10,
        }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#25D366', boxShadow: '0 0 6px #25D366', flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', fontFamily: 'Tajawal, sans-serif', whiteSpace: 'nowrap' }}>
          تم إشعار العميل عبر واتساب ✓
        </span>
      </motion.div>

      {/* Floating AI card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: [0, 6, 0] }}
        transition={{ opacity: { delay: 1.7, duration: 0.4 }, scale: { delay: 1.7, duration: 0.4 }, y: { repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 2.5 } }}
        style={{
          position: 'absolute', top: -22, left: -16,
          background: `rgba(212,168,83,0.1)`,
          border: `1px solid rgba(212,168,83,0.25)`,
          borderRadius: 13, padding: '9px 13px',
          backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', gap: 7,
          boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
          zIndex: 10,
        }}>
        <Bot size={12} color={GOLD} />
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', fontFamily: 'Tajawal, sans-serif', whiteSpace: 'nowrap' }}>
          AI حجز ٣ مواعيد تلقائياً
        </span>
      </motion.div>
    </motion.div>
  )
}

// ─── Floating chat widget ─────────────────────────────────────────────────────
function ContactFloat() {
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState('')

  const sendWA = () => {
    const text = msg.trim() || 'مرحباً، أريد معرفة المزيد عن مدار OS'
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(text)}`, '_blank')
    setOpen(false); setMsg('')
  }

  return (
    <div style={{ position: 'fixed', bottom: 28, left: 24, zIndex: 1000 }} dir="rtl">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.94 }}
            transition={{ duration: 0.22 }}
            style={{
              position: 'absolute', bottom: 68, left: 0,
              width: 296, borderRadius: 18,
              background: '#141418', border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
              overflow: 'hidden',
            }}>
            <div style={{ padding: '13px 15px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#25D366', boxShadow: '0 0 5px #25D366' }} />
                <span style={{ color: TEXT, fontSize: 12, fontWeight: 700, fontFamily: 'Cairo, sans-serif' }}>تحدث مع فريقنا</span>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0 }}>
                <X size={13} />
              </button>
            </div>
            <div style={{ padding: 13 }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'Tajawal, sans-serif', lineHeight: 1.7, marginBottom: 10 }}>
                اكتب سؤالك وسيرد فريقنا عبر واتساب.
              </p>
              <textarea value={msg} onChange={e => setMsg(e.target.value)}
                placeholder="اكتب رسالتك هنا..." rows={3}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, padding: '9px 11px', color: TEXT, fontSize: 12,
                  fontFamily: 'Tajawal, sans-serif', resize: 'none', outline: 'none', boxSizing: 'border-box',
                }} />
              <button onClick={sendWA} style={{
                width: '100%', marginTop: 9, padding: '10px', borderRadius: 10,
                background: '#25D366', border: 'none', cursor: 'pointer',
                color: 'white', fontSize: 12, fontWeight: 700, fontFamily: 'Cairo, sans-serif',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}>
                <Send size={11} /> أرسل عبر واتساب
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
        onClick={() => setOpen(v => !v)}
        style={{
          width: 52, height: 52, borderRadius: '50%',
          background: open ? '#141418' : '#25D366',
          border: open ? '1px solid rgba(255,255,255,0.1)' : 'none',
          cursor: 'pointer',
          boxShadow: open ? 'none' : '0 4px 20px rgba(37,211,102,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}>
        {open ? <X size={18} color={TEXT} /> : <MessageCircle size={20} color="white" />}
      </motion.button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export const PlatformHome = () => {
  const { t, language } = useLanguage()
  const isAr = language === 'ar'

  const heroRef    = useRef<HTMLElement>(null)
  const numbersRef = useRef<HTMLDivElement>(null)
  const stepsSecRef = useRef<HTMLDivElement>(null)
  const counted    = useRef(false)

  // GSAP stats counter
  useEffect(() => {
    if (!numbersRef.current) return
    const targets = numbersRef.current.querySelectorAll<HTMLElement>('[data-count]')
    const trigger = ScrollTrigger.create({
      trigger: numbersRef.current, start: 'top 80%', once: true,
      onEnter: () => {
        if (counted.current) return
        counted.current = true
        targets.forEach(el => {
          const end = Number(el.dataset.count)
          gsap.fromTo(el, { textContent: 0 }, {
            textContent: end, duration: 2, ease: 'power2.out',
            snap: { textContent: 1 },
            onUpdate() { el.textContent = Math.ceil(Number(el.textContent)).toLocaleString('ar-SA') },
          })
        })
      },
    })
    return () => trigger.kill()
  }, [])

  // Hero words entrance
  useEffect(() => {
    if (!heroRef.current) return
    const ctx = gsap.context(() => {
      gsap.from('.hero-word', { y: 55, opacity: 0, duration: 0.85, stagger: 0.07, ease: 'power4.out', delay: 0.15 })
    }, heroRef.current)
    return () => ctx.revert()
  }, [])

  // Steps section: connector line draws + cards sequentially glow
  useEffect(() => {
    if (!stepsSecRef.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo('.step-connector',
        { scaleX: 0, transformOrigin: isAr ? 'right center' : 'left center' },
        {
          scaleX: 1, duration: 1.4, ease: 'power2.inOut',
          scrollTrigger: { trigger: '.step-connector', start: 'top 78%', once: true },
        },
      )
      stepsSecRef.current!.querySelectorAll<HTMLElement>('.step-card-inner').forEach((card, i) => {
        const color = steps[i]?.color ?? CW
        gsap.fromTo(card,
          { borderColor: BORDER, boxShadow: '0 2px 20px rgba(0,0,0,0.18)' },
          {
            borderColor: color + '55',
            boxShadow: `0 8px 40px ${color}18`,
            duration: 0.55, delay: i * 0.18,
            scrollTrigger: { trigger: card, start: 'top 82%', once: true },
          },
        )
      })
    }, stepsSecRef.current)
    return () => ctx.revert()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const goals = [
    { icon: Zap,       title: 'تشغيل بدون توقف',     body: 'كل حجز، قائمة انتظار، وتذكير يتم تلقائياً — لا تدخل يدوي.',     color: GOLD },
    { icon: Bot,       title: 'ذكاء اصطناعي حقيقي',   body: 'وكلاء AI يحجزون ويردون بالعربية بدون انتظار وبدون موظف إضافي.', color: CW },
    { icon: TrendingUp, title: 'نمو قابل للقياس',     body: 'كل عميل وإيراد يُسجَّل ويُحلَّل. قرارك مبني على أرقام.',      color: CL },
    { icon: Clock,     title: 'إعداد في ٤٨ ساعة',    body: 'فريقنا يجهز الحساب والأتمتة والاختبار. تبدأ خلال يومين.',        color: '#A78BFA' },
  ]

  const steps = [
    { num: '١', title: 'سجّل عيادتك',  body: 'نظام Clinic OS مبني خصيصاً للعيادات ومتطلباتها الكاملة.', color: CW },
    { num: '٢', title: 'نجهزه معك',    body: 'فريقنا يعدّ الحساب، يدخل بياناتك، ويجري اختبار تشغيل حقيقي.',  color: GOLD },
    { num: '٣', title: 'يشتغل بدونك',  body: 'الذكاء الاصطناعي يعمل ٢٤/٧ — حجز وتأكيد وإشعارات وتقارير.',    color: CL },
  ]

  const proof = [
    { value: 40, suffix: 'دق',  label: 'توفير يومي لكل عيادة',  color: CW   },
    { value: 78, suffix: '٪',   label: 'نسبة تحويل مكالمات AI', color: CL   },
    { value: 24, suffix: '/٧',  label: 'ذكاء لا ينام أبداً',    color: GOLD },
    { value: 48, suffix: 'س',   label: 'إعداد وتشغيل كامل',     color: '#A78BFA' },
  ]

  return (
    <div dir={isAr ? 'rtl' : 'ltr'}
      style={{ background: BG, minHeight: '100vh', overflowX: 'hidden', color: TEXT }}>

      {/* ── Noise + grid overlay ──────────────────────────────────────────────── */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        {/* Subtle grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }} />
        {/* Gold orb */}
        <div style={{
          position: 'absolute', top: '-10%', right: '20%', width: 640, height: 640,
          background: 'radial-gradient(ellipse, rgba(212,168,83,0.11) 0%, transparent 62%)',
          filter: 'blur(80px)', animation: 'orb-a 22s ease-in-out infinite',
        }} />
        {/* Blue orb */}
        <div style={{
          position: 'absolute', top: '35%', left: '-8%', width: 520, height: 520,
          background: 'radial-gradient(ellipse, rgba(56,189,248,0.08) 0%, transparent 62%)',
          filter: 'blur(90px)', animation: 'orb-b 28s ease-in-out infinite',
        }} />
        {/* Green orb */}
        <div style={{
          position: 'absolute', bottom: '5%', right: '8%', width: 480, height: 480,
          background: 'radial-gradient(ellipse, rgba(52,211,153,0.07) 0%, transparent 62%)',
          filter: 'blur(80px)', animation: 'orb-a 24s ease-in-out infinite 5s',
        }} />
        {/* Top gradient fade */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${GOLD}40, transparent)`,
        }} />
      </div>

      <style>{`
        @keyframes orb-a { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-30px)} }
        @keyframes orb-b { 0%,100%{transform:translateY(0)} 50%{transform:translateY(24px)} }
        .hero-word { display:inline-block }
        .card-hover { transition: transform 0.28s ease, border-color 0.28s ease, box-shadow 0.28s ease }
        .card-hover:hover { transform: translateY(-5px) !important; box-shadow: 0 20px 60px rgba(0,0,0,0.45) !important }
        @media (max-width: 768px) {
          .hero-grid { flex-direction: column !important; gap: 28px !important }
          .hero-text { max-width: 100% !important; text-align: center !important; align-items: center !important }
          .mock-wrap { width: 100% !important; max-width: 360px !important; margin: 0 auto }
          .proof-grid { flex-wrap: wrap !important; justify-content: center !important; gap: 12px 0 !important }
          .proof-item { padding: 6px 16px !important }
          .prod-grid { flex-direction: column !important }
          .goals-grid { grid-template-columns: 1fr 1fr !important }
          .steps-grid { grid-template-columns: 1fr !important }
          .step-connector { display: none !important }
          .cta-grid { grid-template-columns: 1fr !important }
        }
        @media (max-width: 480px) {
          .goals-grid { grid-template-columns: 1fr 1fr !important }
          .proof-item { padding: 6px 12px !important }
        }
      `}</style>

      <Navbar />

      {/* ══════════════════════════ HERO ════════════════════════════════════════ */}
      <section ref={heroRef} style={{
        position: 'relative', zIndex: 10,
        padding: 'clamp(5rem,7vw,7rem) clamp(1.5rem,5vw,4rem) clamp(2.5rem,4vw,4rem)',
        maxWidth: 1280, margin: '0 auto',
      }}>
        <div className="hero-grid" style={{
          display: 'flex', alignItems: 'center',
          gap: 'clamp(2rem,5vw,5rem)',
          flexDirection: isAr ? 'row' : 'row-reverse',
        }}>

          {/* Text column */}
          <div className="hero-text" style={{
            flex: '1 1 500px', maxWidth: 600,
            display: 'flex', flexDirection: 'column',
            alignItems: isAr ? 'flex-start' : 'flex-start',
          }}>

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '5px 14px', borderRadius: 999, marginBottom: 20,
                background: 'rgba(212,168,83,0.07)', border: '1px solid rgba(212,168,83,0.2)',
              }}>
              <Sparkles size={10} color={GOLD} />
              <span style={{ fontSize: 10, fontWeight: 700, color: GOLD, letterSpacing: '0.14em', fontFamily: 'Cairo, sans-serif', textTransform: 'uppercase' }}>
                {t('نظم ذكاء اصطناعي للأعمال السعودية', 'AI Systems for Saudi Business')}
              </span>
            </motion.div>

            {/* Headline */}
            <h1 style={{
              fontSize: 'clamp(2.6rem,5.5vw,4.75rem)',
              fontWeight: 900, lineHeight: 1.07,
              fontFamily: 'Cairo, sans-serif', letterSpacing: '-0.02em',
              margin: '0 0 20px',
            }}>
              {isAr ? (
                <>
                  <span className="hero-word" style={{ color: TEXT, display: 'block' }}>أتمتة أعمالك</span>
                  <span className="hero-word" style={{
                    display: 'block',
                    background: `linear-gradient(125deg, ${GOLD_LT} 0%, ${GOLD} 55%, #B8860B 100%)`,
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>بذكاء حقيقي</span>
                </>
              ) : (
                <>
                  <span className="hero-word" style={{ color: TEXT, display: 'block' }}>Automate Your</span>
                  <span className="hero-word" style={{
                    display: 'block',
                    background: `linear-gradient(125deg, ${GOLD_LT} 0%, ${GOLD} 55%, #B8860B 100%)`,
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>Business with AI</span>
                </>
              )}
            </h1>

            {/* Sub */}
            <motion.p
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.5 }}
              style={{ fontSize: 15, color: MUTED, maxWidth: 480, lineHeight: 1.75, margin: '0 0 24px', fontFamily: 'Tajawal, sans-serif' }}>
              {t(
                'مدار OS يدير عيادتك بالكامل — حجز، إشعارات، تذكيرات، وتقارير — ٢٤/٧ بدون توقف.',
                'Madar OS fully manages your clinic — bookings, notifications, reminders, and reports — 24/7 without stopping.'
              )}
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.65 }}
              style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 32 }}>
              <motion.button
                whileHover={{ scale: 1.03, boxShadow: `0 0 40px rgba(212,168,83,0.3)` }}
                whileTap={{ scale: 0.96 }}
                onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
                style={{
                  padding: '12px 26px', borderRadius: 12,
                  background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_LT} 100%)`,
                  border: 'none', cursor: 'pointer',
                  color: BG, fontSize: 13, fontWeight: 800, fontFamily: 'Cairo, sans-serif',
                  display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: `0 4px 20px rgba(212,168,83,0.2)`,
                }}>
                {t('اكتشف Clinic OS', 'Explore Clinic OS')}
                <ArrowLeft size={14} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02, borderColor: 'rgba(255,255,255,0.22)' }}
                whileTap={{ scale: 0.96 }}
                onClick={() => openWhatsAppChat(t('مرحباً، أريد تجربة مدار OS ومعرفة أفضل نظام لأعمالي.', 'Hi, I want to try Madar OS for my business.'))}
                style={{
                  padding: '12px 26px', borderRadius: 12,
                  background: 'transparent', border: `1px solid rgba(255,255,255,0.11)`,
                  cursor: 'pointer', color: 'rgba(255,255,255,0.55)',
                  fontSize: 13, fontWeight: 600, fontFamily: 'Cairo, sans-serif',
                  display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'border-color 0.2s',
                }}>
                <MessageCircle size={13} />
                {t('جلسة مجانية', 'Free Session')}
              </motion.button>
            </motion.div>

            {/* Proof strip */}
            <motion.div
              ref={numbersRef}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.85 }}
              className="proof-grid"
              style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
              {proof.map((p, i) => (
                <div key={i} className="proof-item" style={{
                  padding: '0 20px',
                  borderInlineEnd: i < proof.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 'clamp(18px,2.2vw,24px)', fontWeight: 900, fontFamily: 'Cairo, sans-serif', color: p.color, letterSpacing: '-0.5px', lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: 2, justifyContent: 'center' }}>
                    <span data-count={p.value}>٠</span>
                    <span style={{ fontSize: '0.55em' }}>{p.suffix}</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'Tajawal, sans-serif', marginTop: 4, whiteSpace: 'nowrap' }}>{t(p.label, p.label)}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Visual column */}
          <div className="mock-wrap" style={{ flex: '1 1 400px', maxWidth: 500, display: 'flex', justifyContent: 'center' }}>
            <DashMockup />
          </div>
        </div>
      </section>

      {/* ══════════════════════ PRODUCTS ════════════════════════════════════════ */}
      <section id="products" style={{ position: 'relative', zIndex: 10, padding: 'clamp(2rem,3.5vw,3.5rem) clamp(1.5rem,5vw,4rem)', background: 'linear-gradient(180deg, #09090B 0%, #07101E 100%)', overflow: 'hidden' }}>
        {/* Section glows */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '0%', left: '5%', width: 560, height: 480, background: 'radial-gradient(ellipse, rgba(56,189,248,0.08) 0%, transparent 65%)', filter: 'blur(70px)' }} />
          <div style={{ position: 'absolute', top: '0%', right: '5%', width: 560, height: 480, background: 'radial-gradient(ellipse, rgba(52,211,153,0.08) 0%, transparent 65%)', filter: 'blur(70px)' }} />
        </div>
        {/* Divider — cyan + green */}
        <div style={{ width: '100%', maxWidth: 900, margin: '0 auto 28px', height: 1, background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.4) 35%, rgba(52,211,153,0.4) 65%, transparent)' }} />

        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeUp style={{ textAlign: 'center', marginBottom: 36 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: GOLD, letterSpacing: '0.18em', fontFamily: 'Cairo, sans-serif', display: 'block', marginBottom: 14, textTransform: 'uppercase' }}>
              {t('منتجنا', 'Our Product')}
            </span>
            <h2 style={{ fontSize: 'clamp(1.9rem,3.8vw,3rem)', fontWeight: 900, color: TEXT, fontFamily: 'Cairo, sans-serif', margin: '0 0 12px', lineHeight: 1.12 }}>
              {t('Clinic OS — نظام العيادات الذكي', 'Clinic OS — The Smart Clinic System')}
            </h2>
            <p style={{ color: MUTED, fontSize: 15, fontFamily: 'Tajawal, sans-serif', maxWidth: 440, margin: '0 auto' }}>
              {t('نظام مبني للعيادات تحديداً — لا حلول عامة، لا تكييف اضطراري', 'Built specifically for clinics — no generic solutions, no forced adaptation')}
            </p>
          </FadeUp>

          <div className="prod-grid" style={{ display: 'flex', gap: 20 }}>

            {/* ── Clinic ────────────────────────────────────────────── */}
            <FadeUp delay={0.06} style={{ flex: 1 }}>
              <div className="card-hover" style={{
                background: CARD, border: `1px solid ${BORDER}`,
                borderRadius: 22, padding: 30, position: 'relative', overflow: 'hidden',
                boxShadow: '0 4px 30px rgba(0,0,0,0.25)',
                height: '100%', boxSizing: 'border-box',
              }}>
                <div style={{ position: 'absolute', top: 0, insetInlineStart: 0, insetInlineEnd: 0, height: 2, background: `linear-gradient(90deg, transparent, ${CL}55, transparent)` }} />
                <div style={{ width: 50, height: 50, borderRadius: 15, background: `rgba(52,211,153,0.09)`, border: `1px solid rgba(52,211,153,0.18)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                  <Stethoscope size={21} color={CL} />
                </div>
                <div style={{ fontSize: 9, fontWeight: 700, color: CL, letterSpacing: '0.15em', fontFamily: 'Cairo, sans-serif', marginBottom: 12, textTransform: 'uppercase' }}>
                  Clinic OS
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 900, color: TEXT, fontFamily: 'Cairo, sans-serif', margin: '0 0 10px', lineHeight: 1.2 }}>
                  {t('نظام تشغيل العيادات', 'Clinic Operating System')}
                </h3>
                <p style={{ color: MUTED, fontSize: 13, fontFamily: 'Tajawal, sans-serif', lineHeight: 1.8, margin: '0 0 22px' }}>
                  {t(
                    'إدارة مواعيد ذكية، مرضى، أطباء، وخدمات — مع مساعد AI يحجز ويرد على المرضى واتساب ٢٤/٧.',
                    'Smart appointment management, patients, doctors, and services — with an AI assistant that books and responds on WhatsApp 24/7.'
                  )}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 26 }}>
                  {[
                    t('حجز مواعيد واتساب تلقائي', 'Automatic WhatsApp appointment booking'),
                    t('إدارة المرضى والأطباء', 'Patient and doctor management'),
                    t('وكيل AI يحجز ٢٤/٧', 'AI agent that books 24/7'),
                    t('تذكيرات تلقائية للمرضى', 'Automatic patient reminders'),
                    t('تقارير وإحصاءات الأداء', 'Performance reports and analytics'),
                  ].map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <CheckCircle2 size={12} color={CL} />
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontFamily: 'Tajawal, sans-serif' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <Link to="/clinic-os" onClick={goTop} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  padding: '10px 22px', borderRadius: 11, width: '100%',
                  background: `rgba(52,211,153,0.09)`, border: `1px solid rgba(52,211,153,0.22)`,
                  color: CL, fontSize: 12, fontWeight: 700, fontFamily: 'Cairo, sans-serif',
                  textDecoration: 'none', transition: 'background 0.2s', boxSizing: 'border-box',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = `rgba(52,211,153,0.17)`)}
                  onMouseLeave={e => (e.currentTarget.style.background = `rgba(52,211,153,0.09)`)}>
                  {t('اعرف أكثر', 'Learn More')}
                </Link>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ══════════════════════ GOALS ════════════════════════════════════════════ */}
      <section style={{ position: 'relative', zIndex: 10, padding: 'clamp(2rem,3.5vw,3.5rem) clamp(1.5rem,5vw,4rem)', background: 'linear-gradient(180deg, #07101E 0%, #110D06 100%)', overflow: 'hidden' }}>
        {/* Section glow — gold from center top */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: 800, height: 500, background: 'radial-gradient(ellipse, rgba(212,168,83,0.10) 0%, transparent 60%)', filter: 'blur(80px)' }} />
        </div>
        {/* Divider — gold */}
        <div style={{ width: '100%', maxWidth: 900, margin: '0 auto 28px', height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,168,83,0.5), transparent)' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeUp style={{ textAlign: 'center', marginBottom: 36 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: GOLD, letterSpacing: '0.18em', fontFamily: 'Cairo, sans-serif', display: 'block', marginBottom: 14, textTransform: 'uppercase' }}>
              {t('رسالتنا', 'Our Mission')}
            </span>
            <h2 style={{ fontSize: 'clamp(1.9rem,3.8vw,3rem)', fontWeight: 900, color: TEXT, fontFamily: 'Cairo, sans-serif', margin: '0 0 12px', lineHeight: 1.12 }}>
              {t('لماذا بنينا مدار؟', 'Why We Built Madar?')}
            </h2>
            <p style={{ color: MUTED, fontSize: 15, fontFamily: 'Tajawal, sans-serif', maxWidth: 440, margin: '0 auto' }}>
              {t(
                'الأعمال السعودية الصغيرة تستحق نفس مستوى التقنية التي تملكها الشركات الكبرى.',
                'Small Saudi businesses deserve the same level of technology that large companies have.'
              )}
            </p>
          </FadeUp>

          <div className="goals-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            {goals.map((g, i) => {
              const Icon = g.icon
              return (
                <FadeUp key={i} delay={i * 0.07}>
                  <div className="card-hover" style={{
                    background: CARD, border: `1px solid ${BORDER}`,
                    borderRadius: 18, padding: 22,
                    boxShadow: '0 2px 20px rgba(0,0,0,0.18)',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${g.color}28` }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = BORDER }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: `${g.color}10`, border: `1px solid ${g.color}1E`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                      <Icon size={17} color={g.color} />
                    </div>
                    <h4 style={{ fontSize: 14, fontWeight: 800, color: TEXT, fontFamily: 'Cairo, sans-serif', margin: '0 0 7px' }}>{t(g.title, g.title)}</h4>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.7, margin: 0 }}>{t(g.body, g.body)}</p>
                  </div>
                </FadeUp>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════ HOW IT WORKS ════════════════════════════════════ */}
      <section style={{ position: 'relative', zIndex: 10, padding: 'clamp(2rem,3.5vw,3.5rem) clamp(1.5rem,5vw,4rem)', background: 'linear-gradient(180deg, #110D06 0%, #060B11 100%)', overflow: 'hidden' }}>
        {/* Section glow — cyan from top center */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-5%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 420, background: 'radial-gradient(ellipse, rgba(56,189,248,0.09) 0%, transparent 60%)', filter: 'blur(70px)' }} />
        </div>
        {/* Divider — cyan */}
        <div style={{ width: '100%', maxWidth: 900, margin: '0 auto 28px', height: 1, background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.45), transparent)' }} />
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <FadeUp style={{ textAlign: 'center', marginBottom: 36 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: GOLD, letterSpacing: '0.18em', fontFamily: 'Cairo, sans-serif', display: 'block', marginBottom: 14, textTransform: 'uppercase' }}>
              {t('طريقة العمل', 'How It Works')}
            </span>
            <h2 style={{ fontSize: 'clamp(1.9rem,3.8vw,3rem)', fontWeight: 900, color: TEXT, fontFamily: 'Cairo, sans-serif', margin: 0, lineHeight: 1.12 }}>
              {t('ثلاث خطوات للتشغيل', 'Three Steps to Go Live')}
            </h2>
          </FadeUp>

          <div ref={stepsSecRef} className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, position: 'relative' }}>
            {/* Connector line */}
            <div aria-hidden className="step-connector" style={{
              position: 'absolute', top: 28, insetInlineStart: '17%', insetInlineEnd: '17%',
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12) 15%, rgba(255,255,255,0.12) 85%, transparent)',
              zIndex: 0, pointerEvents: 'none',
            }} />

            {steps.map((s, i) => (
              <FadeUp key={i} delay={i * 0.1}>
                <div className="card-hover step-card-inner" style={{
                  textAlign: 'center', padding: '28px 20px',
                  background: CARD, border: `1px solid ${BORDER}`,
                  borderRadius: 18, position: 'relative', zIndex: 1,
                  boxShadow: '0 2px 20px rgba(0,0,0,0.18)',
                }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%', margin: '0 auto 18px',
                    background: `${s.color}0E`, border: `1px solid ${s.color}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, fontWeight: 900, color: s.color, fontFamily: 'Cairo, sans-serif',
                  }}>{s.num}</div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: TEXT, fontFamily: 'Cairo, sans-serif', margin: '0 0 8px' }}>{t(s.title, s.title)}</h3>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.36)', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.75, margin: 0 }}>{t(s.body, s.body)}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ CTA SECTION ═════════════════════════════════════ */}
      <section style={{ position: 'relative', zIndex: 10, padding: 'clamp(2.5rem,4vw,4rem) clamp(1.5rem,5vw,4rem) clamp(4rem,6vw,6rem)', background: 'linear-gradient(180deg, #060B11 0%, #0E0A05 50%, #09090B 100%)', overflow: 'hidden' }}>
        {/* Section glow — twin gold + green behind cards */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', bottom: '0%', left: '20%', width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(212,168,83,0.11) 0%, transparent 60%)', filter: 'blur(80px)' }} />
          <div style={{ position: 'absolute', bottom: '0%', right: '20%', width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(52,211,153,0.09) 0%, transparent 60%)', filter: 'blur(80px)' }} />
        </div>
        {/* Divider — strong gold */}
        <div style={{ width: '100%', maxWidth: 900, margin: '0 auto 28px', height: 2, background: 'linear-gradient(90deg, transparent, rgba(212,168,83,0.6), transparent)' }} />

        {/* Full-width CTA banner */}
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <FadeUp style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2 style={{ fontSize: 'clamp(1.9rem,3.8vw,3rem)', fontWeight: 900, color: TEXT, fontFamily: 'Cairo, sans-serif', margin: '0 0 12px', lineHeight: 1.12 }}>
              {isAr
                ? <>ابدأ الحجز الآن <span style={{ color: GOLD }}>بطريقتك</span></>
                : <>Book Now <span style={{ color: GOLD }}>Your Way</span></>}
            </h2>
            <p style={{ color: MUTED, fontSize: 15, fontFamily: 'Tajawal, sans-serif' }}>
              {t(
                'تحدث معنا مباشرة عبر واتساب أو اتصل بوكيل الذكاء الاصطناعي لحجز تجربتك فوراً',
                'Talk to us directly on WhatsApp or call our AI agent to book your demo right now'
              )}
            </p>
          </FadeUp>

          <div className="cta-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>

            {/* WhatsApp */}
            <FadeUp delay={0.06}>
              <div className="card-hover" style={{
                background: 'rgba(37,211,102,0.04)', border: '1px solid rgba(37,211,102,0.15)',
                borderRadius: 20, padding: '30px 24px', textAlign: 'center',
                position: 'relative', overflow: 'hidden',
                boxShadow: '0 4px 30px rgba(0,0,0,0.2)',
              }}>
                <div style={{ position: 'absolute', top: 0, insetInlineStart: 0, insetInlineEnd: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(37,211,102,0.4), transparent)' }} />
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(37,211,102,0.09)', border: '1px solid rgba(37,211,102,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <MessageCircle size={22} color="#25D366" />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: TEXT, fontFamily: 'Cairo, sans-serif', margin: '0 0 7px' }}>
                  {t('واتساب مباشر', 'Direct WhatsApp')}
                </h3>
                <p style={{ fontSize: 12, color: MUTED, fontFamily: 'Tajawal, sans-serif', lineHeight: 1.75, margin: '0 0 20px' }}>
                  {t(
                    'تحدث مع فريق مدار مباشرة. نرد خلال دقائق ونجاوب على كل أسئلتك.',
                    'Talk directly with the Madar team. We reply within minutes and answer all your questions.'
                  )}
                </p>
                <motion.button
                  whileHover={{ scale: 1.03, boxShadow: '0 0 28px rgba(37,211,102,0.25)' }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => openWhatsAppChat(t('مرحباً، أريد تجربة مدار OS ومعرفة أفضل نظام لأعمالي.', 'Hi, I want to try Madar OS for my business.'))}
                  style={{
                    width: '100%', padding: '11px', borderRadius: 11,
                    background: '#25D366', border: 'none', cursor: 'pointer',
                    color: 'white', fontSize: 12, fontWeight: 700, fontFamily: 'Cairo, sans-serif',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                  <MessageCircle size={13} />
                  {t('ابدأ المحادثة', 'Start Chat')}
                </motion.button>
              </div>
            </FadeUp>

            {/* AI Agent */}
            <FadeUp delay={0.13}>
              <div className="card-hover" style={{
                background: `rgba(212,168,83,0.04)`, border: `1px solid rgba(212,168,83,0.15)`,
                borderRadius: 20, padding: '30px 24px', textAlign: 'center',
                position: 'relative', overflow: 'hidden',
                boxShadow: '0 4px 30px rgba(0,0,0,0.2)',
              }}>
                <div style={{ position: 'absolute', top: 0, insetInlineStart: 0, insetInlineEnd: 0, height: 2, background: `linear-gradient(90deg, transparent, ${GOLD}55, transparent)` }} />
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: `rgba(212,168,83,0.09)`, border: `1px solid rgba(212,168,83,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Bot size={22} color={GOLD} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: TEXT, fontFamily: 'Cairo, sans-serif', margin: '0 0 7px' }}>
                  {t('وكيل الحجز الذكي', 'AI Booking Agent')}
                </h3>
                <p style={{ fontSize: 12, color: MUTED, fontFamily: 'Tajawal, sans-serif', lineHeight: 1.75, margin: '0 0 20px' }}>
                  {t(
                    'تحدث مع وكيل الذكاء الاصطناعي مباشرة. يجيب ويحجز تجربتك فورياً بالعربية.',
                    'Talk directly with our AI agent. It answers your questions and books your demo instantly in Arabic.'
                  )}
                </p>
                <motion.button
                  whileHover={{ scale: 1.03, boxShadow: `0 0 28px rgba(212,168,83,0.2)` }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => window.open(`tel:+${WA}`, '_self')}
                  style={{
                    width: '100%', padding: '11px', borderRadius: 11,
                    background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_LT} 100%)`,
                    border: 'none', cursor: 'pointer',
                    color: BG, fontSize: 12, fontWeight: 800, fontFamily: 'Cairo, sans-serif',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                  <Phone size={13} />
                  {t('اتصل بالوكيل الذكي', 'Call AI Agent')}
                </motion.button>
              </div>
            </FadeUp>
          </div>

          <FadeUp delay={0.22} style={{ textAlign: 'center', marginTop: 28 }}>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, fontFamily: 'Tajawal, sans-serif' }}>
              {t('✦ تجربة مجانية ٣ أيام — لا بطاقة ائتمانية مطلوبة', '✦ 3-day free trial — no credit card required')}
            </p>
          </FadeUp>
        </div>
      </section>

      <ContactFloat />
      <Footer />
    </div>
  )
}
