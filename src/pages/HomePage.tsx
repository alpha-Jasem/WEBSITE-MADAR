import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useScroll, useSpring, useInView } from 'framer-motion'
import { Check, ChevronDown, MessageCircle, Calendar, BarChart3, Clock, Phone, Bot, Zap, Menu, X } from 'lucide-react'
import { Footer } from '../components/public/Footer'
import { useLanguage } from '../context/LanguageContext'

/* ─── Design tokens (exact from scale-your-clinic.com CSS) ──────── */
const PHONE = '966546666005'
const wa = (msg = 'مرحباً، أريد معرفة المزيد عن نظام الاستقبال الذكي لعيادتي') =>
  window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`, '_blank')

const C = {
  paper:     '#F4F5F8',
  paper2:    '#EEF0F5',
  paper3:    '#E4E8F0',
  ink:       '#1B2740',
  ink2:      '#3D4F6A',
  ink3:      '#5A6880',
  rule:      '#DDE2EC',
  rule2:     '#C8D0DF',
  brand:     '#2563EB',
  accent:    '#1E3A6E',
  accent2:   '#1A4FA0',
  accentInk: '#0D2452',
  gold:      '#8899B4',
  gold2:     '#5F7290',
  goldTint:  '#E8ECF5',
  dark:      '#0C1A2E',
  dark2:     '#111F38',
  onDark:    '#E8EEF8',
  onDark2:   '#A8BACC',
  onDarkRule:'#1A2E4A',
}

const rv = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.55 } }
// Hero elements are visible on mount — use animate directly, not whileInView
const ha = { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6 } }

/* ─── Scroll Progress Bar ─────────────────────────────────────────── */
const ScrollProgressBar = () => {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 })
  return (
    <motion.div
      style={{ scaleX, transformOrigin: 'left', position: 'fixed', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #2563EB, #60A5FA, #2563EB)', zIndex: 9999, backgroundSize: '200% 100%' }}
    />
  )
}

/* ─── Animated Counter ────────────────────────────────────────────── */
const AnimCounter = ({ to, suffix = '' }: { to: number; suffix?: string }) => {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  useEffect(() => {
    if (!inView) return
    let raf: number
    const duration = 1400
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(ease * to))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, to])
  return <span ref={ref}>{val}{suffix}</span>
}

/* ─── Global CSS ─────────────────────────────────────────────────── */
const GlobalCSS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Arabic:wght@300;400;500;700&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { font-size: 17px; scroll-behavior: smooth; overflow-x: clip; }
    body { background: ${C.paper}; color: ${C.ink}; font-size: 17px; line-height: 1.55; overflow-x: clip; }

    .hp-container { max-width: 1240px; margin: 0 auto; padding: 0 28px; }
    .hp-container-narrow { max-width: 980px; margin: 0 auto; padding: 0 28px; }

    /* Eyebrow labels — editorial with accent border */
    .eyebrow {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 11px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: ${C.accent2};
      display: inline-flex;
      align-items: center;
      gap: 10px;
      border-inline-start: 3px solid ${C.brand};
      padding-inline-start: 10px;
    }
    .eyebrow::after {
      content: "";
      width: 22px; height: 1px;
      background: ${C.accent2};
      display: inline-block;
    }

    /* Buttons */
    .btn {
      display: inline-flex; align-items: center; gap: 8px;
      font-family: 'IBM Plex Sans Arabic', sans-serif;
      font-size: 15px; font-weight: 500;
      padding: 13px 22px;
      border-radius: 4px;
      border: 1px solid transparent;
      cursor: pointer; white-space: nowrap;
      transition: all .18s ease;
      letter-spacing: -0.01em;
    }
    .btn-primary { background: ${C.accent}; color: ${C.paper}; border-color: ${C.accent}; }
    .btn-primary:hover { background: ${C.accentInk}; }
    .btn-ghost { background: transparent; color: ${C.accentInk}; border-color: ${C.rule2}; }
    .btn-ghost:hover { border-color: ${C.accent}; background: rgba(30,58,110,0.04); }
    .btn-on-dark { background: ${C.onDark}; color: ${C.accentInk}; border-color: ${C.onDark}; }
    .btn-on-dark:hover { background: #fff; }
    .btn-gold { background: ${C.gold}; color: #fff; border-color: ${C.gold}; }
    .btn-gold:hover { background: ${C.gold2}; }

    /* Nav */
    .hp-nav {
      position: fixed; top: 0; right: 0; left: 0; z-index: 100;
      background: rgba(251,250,247,0.92);
      backdrop-filter: saturate(160%) blur(18px);
      -webkit-backdrop-filter: saturate(160%) blur(18px);
      border-bottom: 1px solid ${C.rule};
      box-shadow: 0 1px 0 rgba(255,255,255,0.9), 0 4px 20px rgba(12,26,46,0.06);
    }
    .hp-nav-inner {
      display: flex; align-items: center; justify-content: space-between;
      height: 72px;
    }
    .hp-nav-links { display: flex; gap: 30px; align-items: center; }
    .hp-nav-link {
      font-family: 'IBM Plex Sans Arabic', sans-serif;
      font-size: 14px; font-weight: 400; color: ${C.ink2};
      background: none; border: none; cursor: pointer;
      transition: color .15s;
    }
    .hp-nav-link:hover { color: ${C.accent}; }
    .hp-hamburger { display: none !important; }

    /* Sections */
    .hp-section { padding: 80px 0; }
    .hp-section-sm { padding: 56px 0; }
    .hp-divider { border-top: 1px solid ${C.rule}; }

    /* Hero */
    .hp-hero-grid {
      display: grid;
      grid-template-columns: 1.05fr 0.95fr;
      gap: 80px; align-items: center;
    }
    .hp-hero-phone { display: flex; justify-content: center; }

    /* Grids */
    .hp-4col { display: grid; grid-template-columns: repeat(4,1fr); gap: 0; }
    .hp-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }

    .hp-2col-wide { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
    .hp-4timeline { display: grid; grid-template-columns: repeat(4,1fr); gap: 40px; }

    /* Hero italic em pattern */
    .hero-em {
      font-style: italic;
      color: ${C.accent2};
      font-weight: 400;
    }
    .hero-em::after {
      content: "";
      display: inline-block;
      width: 6px; height: 6px;
      background: ${C.brand};
      border-radius: 50%;
      vertical-align: super;
      margin-right: 4px;
      margin-top: -8px;
    }

    /* Rotating hero word — exact SYC values from site.css + JS */
    .hero-rot {
      display: inline-block;
      position: relative;
      vertical-align: baseline;
      height: 1.04em;
      min-width: 5.2ch;
      transition: min-width 0.3s ease;
    }
    .hero-rot-word {
      position: absolute;
      left: 0; top: 0;
      font-style: italic;
      background: linear-gradient(90deg, #60A5FA, #2563EB 40%, #93C5FD 80%, #60A5FA);
      background-size: 200% 100%;
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent;
      white-space: nowrap;
      opacity: 0;
      transform: translateY(0.25em);
      transition: opacity .45s ease, transform .55s cubic-bezier(.2,.8,.2,1);
      animation: shimmer 3s linear infinite;
    }
    .hero-rot-word.is-active {
      opacity: 1;
      transform: translateY(0);
    }

    /* Sticky thin strip */
    .hp-sticky {
      position: fixed;
      left: 0; top: 50%;
      transform: translateY(-50%);
      z-index: 200;
      background: ${C.dark};
      border-radius: 0 8px 8px 0;
      width: 34px;
      display: flex; flex-direction: column; align-items: center;
      padding: 14px 0 10px;
      gap: 10px;
      box-shadow: 3px 0 20px rgba(0,0,0,0.20);
      cursor: pointer;
      transition: width 0.25s ease, padding 0.25s ease;
      overflow: hidden;
    }
    .hp-sticky:hover { width: 36px; }
    .hp-sticky-pulse {
      width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
      background: #60A5FA;
      animation: pulse-ring 1.8s ease-out infinite;
    }
    @keyframes pulse-ring {
      0%   { box-shadow: 0 0 0 0 rgba(96,165,250,0.7); }
      70%  { box-shadow: 0 0 0 8px rgba(96,165,250,0); }
      100% { box-shadow: 0 0 0 0 rgba(96,165,250,0); }
    }
    .hp-sticky-text {
      writing-mode: vertical-rl;
      text-orientation: mixed;
      transform: rotate(180deg);
      font-family: 'IBM Plex Sans Arabic', sans-serif;
      font-size: 11px; font-weight: 600;
      color: ${C.onDark};
      white-space: nowrap;
      letter-spacing: 0.04em;
    }
    .hp-sticky-close {
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      background: none; border: none; cursor: pointer;
      color: ${C.onDark2}; font-size: 13px;
      opacity: 0.4; padding: 0; transition: opacity 0.2s;
      line-height: 1;
    }
    .hp-sticky-close:hover { opacity: 0.85; }

    /* Card hover lift */
    .hp-card {
      transition: transform 0.22s ease, box-shadow 0.22s ease;
      cursor: default;
    }
    .hp-card:hover {
      transform: translateY(-3px);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 24px rgba(37,99,235,0.08), 0 16px 48px rgba(12,26,46,0.13), 0 0 0 1px rgba(37,99,235,0.2);
    }
    .hp-card-dark:hover {
      transform: translateY(-3px);
      box-shadow: 0 20px 56px rgba(0,0,0,0.4), 0 0 0 1px rgba(37,99,235,0.35), 0 0 40px rgba(37,99,235,0.12);
    }

    /* Nav link underline slide */
    .hp-nav-link { position: relative; }
    .hp-nav-link::after {
      content: '';
      position: absolute;
      bottom: -2px; right: 0; left: 0;
      height: 1px;
      background: ${C.accent};
      transform: scaleX(0);
      transform-origin: right;
      transition: transform 0.2s ease;
    }
    .hp-nav-link:hover::after { transform: scaleX(1); }

    /* Button lift on hover */
    .btn:hover { transform: translateY(-1px); }
    .btn:active { transform: translateY(0); }

    /* Feature list item hover */
    .hp-feature-item {
      border-radius: 6px;
      margin: 0 -8px;
      padding: 6px 8px;
      transition: background 0.15s ease;
    }
    .hp-feature-item:hover { background: rgba(37,99,235,0.05); }
    .hp-feature-item-dark:hover { background: rgba(255,255,255,0.04); }

    /* Typing indicator */
    @keyframes typing {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-4px); opacity: 1; }
    }

    /* Float orbs */
    @keyframes orb-drift-a {
      0%,100% { transform: translate(0,0) scale(1); }
      33%      { transform: translate(-28px,22px) scale(1.08); }
      66%      { transform: translate(18px,-14px) scale(0.94); }
    }
    @keyframes orb-drift-b {
      0%,100% { transform: translate(0,0) scale(1); }
      40%      { transform: translate(22px,18px) scale(0.92); }
      70%      { transform: translate(-12px,-22px) scale(1.06); }
    }
    @keyframes orb-drift-c {
      0%,100% { transform: translate(0,0) scale(1); }
      50%      { transform: translate(14px,28px) scale(1.04); }
    }
    .orb-a { animation: orb-drift-a 14s ease-in-out infinite; }
    .orb-b { animation: orb-drift-b 18s ease-in-out infinite; }
    .orb-c { animation: orb-drift-c 22s ease-in-out infinite; }

    /* Shimmer button */
    @keyframes shimmer {
      0%   { background-position: 200% center; }
      100% { background-position: -200% center; }
    }
    .btn-shimmer {
      background-size: 200% auto !important;
      animation: shimmer 3.5s linear infinite;
    }

    /* Glow pulse border */
    @keyframes glow-border {
      0%,100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); }
      50%      { box-shadow: 0 0 0 6px rgba(37,99,235,0.18), 0 0 32px rgba(37,99,235,0.12); }
    }
    .glow-card { animation: glow-border 3.5s ease-in-out infinite; }

    /* Floating badge pop */
    @keyframes badge-float {
      0%,100% { transform: translateY(0); }
      50%      { transform: translateY(-6px); }
    }
    .float-badge { animation: badge-float 3s ease-in-out infinite; }

    /* Number pop in */
    @keyframes num-pop {
      from { opacity:0; transform: scale(0.85) translateY(10px); }
      to   { opacity:1; transform: scale(1) translateY(0); }
    }
    .num-pop { animation: num-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }

    /* Horizontal scroll marquee for trust strip */
    @keyframes marquee {
      from { transform: translateX(0); }
      to   { transform: translateX(-50%); }
    }

    /* Gradient text animation */
    @keyframes grad-shift {
      0%   { background-position: 0% 50%; }
      50%  { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    .grad-anim {
      background: linear-gradient(135deg, #1E3A6E, #2563EB, #60A5FA, #1E3A6E);
      background-size: 300% 300%;
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: grad-shift 6s ease infinite;
    }

    /* Stagger children */
    .stagger-children > * { opacity: 0; animation: num-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) both; }
    .stagger-children.is-visible > *:nth-child(1) { animation-delay: 0.05s; opacity: 1; }
    .stagger-children.is-visible > *:nth-child(2) { animation-delay: 0.15s; opacity: 1; }
    .stagger-children.is-visible > *:nth-child(3) { animation-delay: 0.25s; opacity: 1; }
    .stagger-children.is-visible > *:nth-child(4) { animation-delay: 0.35s; opacity: 1; }

    /* Timeline step hover */
    .hp-timeline-step { transition: opacity 0.2s ease; }
    .hp-4timeline:hover .hp-timeline-step { opacity: 0.5; }
    .hp-4timeline:hover .hp-timeline-step:hover { opacity: 1; }

    /* Mobile */
    @media (max-width: 900px) {
      .hp-nav-links { display: none !important; }
      .hp-hamburger { display: flex !important; }
      /* Hero: compact on mobile */
      .hp-hero-section { padding-top: 96px !important; padding-bottom: 48px !important; }
      .hp-hero-grid { grid-template-columns: 1fr; gap: 32px; }
      .hp-hero-phone { display: flex; }
      .hp-hero-float { display: none !important; }
      /* Show only first 4 hero chat messages on mobile */
      .hp-hero-chat-msg:nth-child(n+5) { display: none; }
      .hp-hero-phone-inner { width: 100% !important; max-width: 300px; margin: 0 auto; }
      /* 2col */
      .hp-2col { grid-template-columns: 1fr; }
      .hp-2col-wide { grid-template-columns: 1fr; gap: 36px; }
      /* 4col */
      .hp-4col { grid-template-columns: 1fr 1fr; gap: 0; }
      .hp-4col > div { padding: 20px 14px !important; }
      /* Timeline: 1 col, vertical border guide */
      .hp-4timeline { grid-template-columns: 1fr; gap: 0; }
      .hp-timeline-connector { display: none; }
      .hp-timeline-step {
        border-top: none !important;
        border-right: 2px solid ${C.rule2};
        padding: 0 18px 32px !important;
        margin-right: 8px;
      }
      .hp-timeline-step:first-child { border-right-color: ${C.brand}; }
      .hp-tl-dot { display: none; }
      /* Section padding */
      .hp-section { padding: 52px 0; }
      .hp-container { padding: 0 20px; }
      .hp-container-narrow { padding: 0 20px; }
      .hp-sticky { width: 30px; }
      /* AI section buttons — stack vertically */
      .hp-ai-btns { flex-direction: column !important; }
      .hp-ai-btns .btn { width: 100%; justify-content: center; }
    }
    @media (max-width: 480px) {
      .hp-4col { grid-template-columns: 1fr; }
    }
  `}</style>
)

/* ─── Navbar ─────────────────────────────────────────────────────── */
const Navbar = () => {
  const [open, setOpen] = useState(false)
  const { t, dir, toggleLanguage, language } = useLanguage()
  const links = [
    { label: t('المنهجية',   'Methodology'), href: '#method' },
    { label: t('المساعد AI', 'AI Assistant'), href: '#ai' },
    { label: t('العملية',   'Process'),      href: '#process' },
    { label: t('البرامج',   'Plans'),        href: '#programs' },
    { label: t('الأسئلة',  'FAQ'),          href: '#faq' },
  ]
  const go = (href: string) => {
    setOpen(false)
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
  }
  return (
    <header className="hp-nav" dir={dir}>
      <div className="hp-container hp-nav-inner">
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo-main.png" alt="مدار" style={{ height: 32, width: 'auto' }} />
          <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, letterSpacing: '-0.3px', lineHeight: 1 }}>
            <span style={{ color: C.accentInk }}>Madar</span>
            <span style={{ color: C.brand }}>.software</span>
          </span>
        </div>

        {/* Desktop links */}
        <nav className="hp-nav-links">
          {links.map(l => (
            <button key={l.href as string} className="hp-nav-link" onClick={() => go(l.href)}>{l.label}</button>
          ))}
        </nav>

        {/* Lang Toggle + CTA + Hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={toggleLanguage}
            style={{
              fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, fontWeight: 600,
              letterSpacing: '0.1em', padding: '6px 12px',
              border: `1px solid ${C.rule2}`, borderRadius: 4,
              background: 'transparent', color: C.ink3,
              cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.rule2; e.currentTarget.style.color = C.ink3 }}
          >
            {language === 'ar' ? 'EN' : 'AR'}
          </button>
          <button className="btn btn-primary" onClick={() => wa()}>{t('احجز مكالمة ←', 'Book a Call →')}</button>
          <button className="hp-hamburger" onClick={() => setOpen(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.ink, padding: 4, display: 'flex', alignItems: 'center' }}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav dir={dir} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            style={{ background: C.paper, borderTop: `1px solid ${C.rule}`, padding: '12px 20px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {links.map(l => (
              <button key={l.href as string} className="hp-nav-link" onClick={() => go(l.href)}
                style={{ textAlign: dir === 'rtl' ? 'right' : 'left', padding: '10px 0', fontSize: 16, borderBottom: `1px solid ${C.rule}` }}>
                {l.label}
              </button>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}

/* ─── Hero ───────────────────────────────────────────────────────── */
const ROT_WORDS_AR = ['الأسنان', 'العظام', 'العيون', 'الجلدية', 'الأطفال']
const ROT_WORDS_EN = ['Dental', 'Orthopedic', 'Eye Care', 'Dermatology', 'Pediatric']

const Hero = () => {
  const { t, dir, language } = useLanguage()
  const ROT_WORDS = language === 'ar' ? ROT_WORDS_AR : ROT_WORDS_EN
  const [activeIdx, setActiveIdx] = useState(0)
  const rotRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const fitActiveWord = () => {
      if (!rotRef.current) return
      const words = rotRef.current.querySelectorAll<HTMLElement>('.hero-rot-word')
      const active = words[activeIdx]
      if (active) rotRef.current.style.minWidth = active.offsetWidth + 'px'
    }
    fitActiveWord()
    window.addEventListener('resize', fitActiveWord)

    let i = activeIdx
    const timer = setInterval(() => {
      i = (i + 1) % ROT_WORDS.length
      setActiveIdx(i)
      setTimeout(() => {
        if (!rotRef.current) return
        const words = rotRef.current.querySelectorAll<HTMLElement>('.hero-rot-word')
        if (words[i]) rotRef.current.style.minWidth = words[i].offsetWidth + 'px'
      }, 50)
    }, 2200)

    return () => { clearInterval(timer); window.removeEventListener('resize', fitActiveWord) }
  }, [])

  return (
  <section className="hp-section hp-hero-section" style={{ background: C.dark, paddingTop: 130, paddingBottom: 80, position: 'relative', overflow: 'hidden' }} dir={dir}>
    {/* Animated dot grid */}
    <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(circle, rgba(37,99,235,0.2) 1px, transparent 1px)`, backgroundSize: '28px 28px', opacity: 0.3, pointerEvents: 'none' }} />
    <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 70% 60% at 60% 20%, rgba(37,99,235,0.1), transparent 65%), radial-gradient(ellipse 50% 40% at 5% 80%, rgba(30,58,110,0.2), transparent 60%)`, pointerEvents: 'none' }} />
    {/* Animated orbs — vivid on dark bg */}
    <div className="orb-a" style={{ position: 'absolute', width: 700, height: 700, top: -200, right: -60, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.22), transparent 70%)', filter: 'blur(80px)', opacity: 0.8, pointerEvents: 'none' }} />
    <div className="orb-b" style={{ position: 'absolute', width: 420, height: 420, bottom: -100, left: '15%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.16), transparent 70%)', filter: 'blur(60px)', opacity: 0.6, pointerEvents: 'none' }} />
    <div className="orb-c" style={{ position: 'absolute', width: 300, height: 300, top: '30%', left: '5%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(96,165,250,0.1), transparent 70%)', filter: 'blur(40px)', opacity: 0.5, pointerEvents: 'none' }} />

    <div className="hp-container" style={{ position: 'relative' }}>
      <div className="hp-hero-grid">

        {/* ── Text side ── */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '7px 14px 7px 12px', background: 'rgba(37,99,235,0.18)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 999, fontFamily: '"IBM Plex Mono", monospace', fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#93C5FD', marginBottom: 22, width: 'fit-content' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.brand, boxShadow: '0 0 0 4px rgba(37,99,235,0.18)', flexShrink: 0 }} />
            {t('استقبال ذكي · ٢٤/٧ · بدون انقطاع', 'Smart Reception · 24/7 · Always On')}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
            style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(48px,5.6vw,82px)', fontWeight: 400, color: C.onDark, lineHeight: 1.0, marginBottom: 24, letterSpacing: '-0.025em' }}>
            {t('استقبال ذكي', 'Smart Reception')}
            <br />
            {t('لعيادة', 'for a')}{' '}
            <span className="hero-rot" ref={rotRef} aria-live="polite">
              {ROT_WORDS.map((word, i) => (
                <span key={word} className={`hero-rot-word${i === activeIdx ? ' is-active' : ''}`}>{word}</span>
              ))}
            </span>
            {t('', ' Clinic')}.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.28 }}
            style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 18, color: C.onDark2, lineHeight: 1.75, marginBottom: 38, maxWidth: 420 }}>
            {t(
              'نظام يستقبل عملائك على واتساب، يحجز المواعيد، ويُذكّرهم تلقائياً — بدون موظف استقبال إضافي.',
              'An AI system that handles patient inquiries on WhatsApp, books appointments, and sends automatic reminders — no extra receptionist needed.'
            )}
          </motion.p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 48 }}>
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: '0 8px 32px rgba(37,99,235,0.35)' }}
              whileTap={{ scale: 0.97 }}
              className="btn btn-shimmer"
              style={{ fontSize: 16, padding: '15px 28px', background: 'linear-gradient(90deg, #1E3A6E, #2563EB, #60A5FA, #2563EB, #1E3A6E)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              onClick={() => wa('مرحباً، أريد حجز جلسة مجانية لمناقشة نظام الاستقبال الذكي لعيادتي')}>
              {t('احجز جلسة مجانية 30 دقيقة ←', 'Book a Free 30-Min Session →')}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02, borderColor: '#60A5FA' }}
              whileTap={{ scale: 0.98 }}
              className="btn"
              style={{ background: 'transparent', color: C.onDark, borderColor: C.onDarkRule }}
              onClick={() => document.querySelector('#method')?.scrollIntoView({ behavior: 'smooth' })}>
              {t('كيف يعمل النظام', 'How It Works')}
            </motion.button>
          </div>

          <div style={{ display: 'flex', paddingTop: 28, borderTop: `1px solid ${C.onDarkRule}` }}>
            {[
              { to: 80, suffix: '%', label: t('تقليل المكالمات الفائتة', 'Fewer Missed Calls') },
              { to: 5,  suffix: language === 'ar' ? 'ث' : 's', prefix: '<', label: t('سرعة الرد', 'Response Speed') },
              { to: 24, suffix: '/7', label: t('استقبال مستمر', 'Always On') },
            ].map((s, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                style={{ padding: '0 20px', borderRight: i > 0 && dir === 'rtl' ? `1px solid ${C.onDarkRule}` : 'none', borderLeft: i > 0 && dir === 'ltr' ? `1px solid ${C.onDarkRule}` : 'none' }}>
                <div style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 30, fontWeight: 400, color: '#60A5FA', lineHeight: 1 }}>
                  {(s as any).prefix || ''}<AnimCounter to={s.to} suffix={s.suffix} />
                </div>
                <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, letterSpacing: '0.11em', textTransform: 'uppercase', color: C.gold2, marginTop: 8 }}>{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Visual side: dark card ── */}
        <motion.div {...ha} transition={{ delay: 0.18 }} className="hp-hero-phone">
          <div className="hp-hero-phone-inner" style={{ position: 'relative', width: '100%', maxWidth: 420, paddingBottom: 44, paddingLeft: 28 }}>
            <div style={{ background: '#0B1830', borderRadius: 20, padding: '28px 24px 24px', boxShadow: '0 0 60px rgba(37,99,235,0.18), 0 20px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(37,99,235,0.25)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -80, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.28), transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, zIndex: 2 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 0 3px rgba(74,222,128,0.25)' }} />
                <span style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{t('مساعد متصل الآن', 'AI Agent Online')}</span>
              </div>
              <div style={{ borderRadius: 14, overflow: 'hidden', position: 'relative', zIndex: 1, marginTop: 8 }}>
                <div style={{ background: '#075E54', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Bot size={14} color={C.paper} />
                  </div>
                  <div>
                    <div style={{ color: '#fff', fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontWeight: 600, fontSize: 12 }}>{t('مساعد عيادة د. أحمد', "Dr. Ahmed's Clinic AI")}</div>
                    <div style={{ color: '#A8D5A2', fontSize: 10, fontFamily: '"IBM Plex Sans Arabic", sans-serif' }}>● {t('متصل الآن', 'Online now')}</div>
                  </div>
                </div>
                <div style={{ background: '#ECE5DD', padding: '10px 9px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ textAlign: 'center', marginBottom: 4 }}>
                    <span style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 6, padding: '2px 10px', fontSize: 10, color: '#6B7280', fontFamily: '"IBM Plex Sans Arabic", sans-serif' }}>{t('اليوم', 'Today')}</span>
                  </div>
                  {(language === 'ar' ? [
                    { from: 'user', text: 'أبي أحجز موعد تنظيف أسنان', time: '9:41 ص' },
                    { from: 'ai',   text: 'أهلاً! 😊 متى يناسبك؟ عندنا الثلاثاء والأربعاء.', time: '9:41 ص' },
                    { from: 'user', text: 'الأربعاء عصراً', time: '9:42 ص' },
                    { from: 'ai',   text: 'ممتاز ✅ عندي 4:30م. اسمك ورقم جوالك؟', time: '9:42 ص' },
                    { from: 'user', text: 'سارة — 0551234567', time: '9:43 ص' },
                    { from: 'ai',   text: 'تم الحجز يا سارة 🎉 ستصلك رسالة تذكير.', time: '9:43 ص' },
                  ] : [
                    { from: 'user', text: "I'd like to book a dental cleaning", time: '9:41 AM' },
                    { from: 'ai',   text: 'Hello! 😊 When works for you? We have Tue & Wed available.', time: '9:41 AM' },
                    { from: 'user', text: 'Wednesday afternoon', time: '9:42 AM' },
                    { from: 'ai',   text: 'Perfect ✅ I have 4:30 PM. Your name and number?', time: '9:42 AM' },
                    { from: 'user', text: 'Sara — 0551234567', time: '9:43 AM' },
                    { from: 'ai',   text: "Booked, Sara 🎉 You'll get a reminder before your visit.", time: '9:43 AM' },
                  ]).map((m, i) => (
                    <div key={i} className="hp-hero-chat-msg" style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-start' : 'flex-end' }}>
                      <div style={{ background: m.from === 'user' ? '#fff' : '#DCF8C6', padding: '5px 8px 4px', borderRadius: m.from === 'user' ? '8px 8px 8px 2px' : '8px 8px 2px 8px', maxWidth: '75%', fontSize: 11.5, fontFamily: '"IBM Plex Sans Arabic", sans-serif', color: '#1a1a1a', lineHeight: 1.5 }}>
                        <div>{m.text}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 2 }}>
                          <span style={{ fontSize: 9.5, color: '#8B9EA8' }}>{m.time}</span>
                          {m.from === 'user' && <span style={{ fontSize: 11, color: '#53BDEB', lineHeight: 1 }}>✓✓</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                    <div style={{ background: '#DCF8C6', padding: '7px 12px', borderRadius: '8px 8px 2px 8px', display: 'flex', gap: 3, alignItems: 'center' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8B9EA8', display: 'inline-block', animation: 'typing 1.2s ease infinite' }} />
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8B9EA8', display: 'inline-block', animation: 'typing 1.2s ease 0.2s infinite' }} />
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8B9EA8', display: 'inline-block', animation: 'typing 1.2s ease 0.4s infinite' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Floating stat card — bottom left */}
            <motion.div className="hp-hero-float float-badge"
              initial={{ opacity: 0, x: -20, y: 10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: 1.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: 'absolute', bottom: 0, left: 0, background: '#fff', borderRadius: 14, padding: '12px 18px', boxShadow: '0 12px 36px rgba(12,26,46,0.16)', border: `1px solid ${C.rule}`, fontFamily: '"IBM Plex Sans Arabic", sans-serif', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(37,99,235,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={16} color={C.accent2} />
              </div>
              <div>
                <div style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 20, fontWeight: 600, color: C.ink, lineHeight: 1 }}>{t('14 موعد', '14 Appts')}</div>
                <div style={{ fontSize: 11, color: C.ink3, marginTop: 3, fontFamily: '"IBM Plex Mono", monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t('محجوز اليوم', 'Booked Today')}</div>
              </div>
            </motion.div>
            {/* Floating notification — top right */}
            <motion.div className="hp-hero-float"
              initial={{ opacity: 0, x: 20, y: -10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: 1.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: 'absolute', top: -18, right: -12, background: '#fff', borderRadius: 12, padding: '10px 14px', boxShadow: '0 8px 28px rgba(12,26,46,0.14)', border: `1px solid ${C.rule}`, display: 'flex', alignItems: 'center', gap: 10, maxWidth: 210 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Check size={14} color="#16a34a" strokeWidth={2.5} />
              </div>
              <div>
                <div style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 11, fontWeight: 600, color: C.ink }}>{t('تم تأكيد الموعد', 'Appointment Confirmed')}</div>
                <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, color: C.ink3, marginTop: 2, letterSpacing: '0.04em' }}>{t('سارة — الثلاثاء 4:30م', 'Sara — Tue 4:30 PM')}</div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
  )
}

/* ─── TrustStrip ─────────────────────────────────────────────────── */
const WaIcon = () => (
  <svg viewBox="0 0 32 32" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 2C8.268 2 2 8.268 2 16c0 2.444.658 4.733 1.806 6.7L2 30l7.494-1.772A13.94 13.94 0 0 0 16 30c7.732 0 14-6.268 14-14S23.732 2 16 2Z" fill="#25D366"/>
    <path d="M22.5 19.394c-.306-.153-1.81-.894-2.09-.994-.28-.1-.484-.153-.687.153-.204.306-.789.994-.967 1.198-.178.204-.356.229-.662.076-.306-.153-1.291-.476-2.459-1.517-.909-.81-1.523-1.811-1.701-2.117-.178-.306-.019-.471.134-.623.137-.137.306-.357.459-.536.153-.178.204-.306.306-.51.102-.204.051-.382-.026-.536-.076-.153-.687-1.657-.941-2.27-.248-.595-.5-.514-.687-.524-.178-.009-.382-.011-.586-.011-.204 0-.535.076-.815.382-.28.306-1.07 1.046-1.07 2.55 0 1.504 1.096 2.958 1.249 3.162.153.204 2.157 3.294 5.228 4.622.731.315 1.301.503 1.746.644.734.233 1.402.2 1.929.121.588-.088 1.81-.74 2.066-1.455.255-.714.255-1.327.178-1.455-.076-.127-.28-.204-.586-.357Z" fill="#fff"/>
  </svg>
)

const GovBadges = () => {
  const { t, dir } = useLanguage()
  return (
    <>

      {/* ── Logos strip ── */}
      <div style={{ background: '#fff', borderTop: `1px solid ${C.rule}`, borderBottom: `1px solid ${C.rule}`, padding: '44px 0 40px' }} dir={dir}>
        <div className="hp-container">
          <p style={{
            fontFamily: '"IBM Plex Mono", monospace', fontSize: 11,
            color: C.ink3, letterSpacing: '0.18em', textTransform: 'uppercase',
            textAlign: 'center', marginBottom: 36,
          }}>
            {t('ضمن المنظومة التقنية السعودية', 'Within the Saudi Tech Ecosystem')}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '32px 64px' }}>
            <img src="/sdaia-logo.png"            alt="SDAIA" style={{ height: 64, width: 'auto', objectFit: 'contain' }} />
            <img src="/cst-logo.svg"              alt="هيئة الاتصالات والفضاء والتقنية" style={{ height: 58, width: 'auto', objectFit: 'contain' }} />
            <img src="/monshaat-logo.png"         alt="منشآت" style={{ height: 64, width: 'auto', objectFit: 'contain' }} />
            <img src="/saudi-business-center.png" alt="المركز السعودي للأعمال" style={{ height: 58, width: 'auto', objectFit: 'contain' }} />
            <img src="/saudi-tech-logo.png"       alt="تقنية سعودية" style={{ height: 64, width: 'auto', objectFit: 'contain' }} />
          </div>
        </div>
      </div>

      {/* ── Registration info strip ── */}
      <div style={{ background: C.dark, padding: '32px 0' }} dir={dir}>
        <div className="hp-container">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '20px 0' }}>

            {/* رقم موحد */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 40px', borderLeft: `1px solid ${C.onDarkRule}` }}>
              <span style={{ fontFamily: '"IBM Plex Sans Arabic", Cairo, sans-serif', fontSize: 11, color: C.onDark2, opacity: 0.55, marginBottom: 6, letterSpacing: '0.06em' }}>
                {t('الرقم الموحد', 'Unified Number')}
              </span>
              <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 22, fontWeight: 500, color: '#fff', letterSpacing: '0.06em', direction: 'ltr' }}>
                7030652643
              </span>
            </div>

            {/* رقم المنشأة */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 40px', borderLeft: `1px solid ${C.onDarkRule}` }}>
              <span style={{ fontFamily: '"IBM Plex Sans Arabic", Cairo, sans-serif', fontSize: 11, color: C.onDark2, opacity: 0.55, marginBottom: 6, letterSpacing: '0.06em' }}>
                {t('رقم المنشأة', 'Entity Number')}
              </span>
              <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 22, fontWeight: 500, color: '#fff', letterSpacing: '0.06em', direction: 'ltr' }}>
                4030483621
              </span>
            </div>

            {/* زر السجل التجاري */}
            <div style={{ padding: '0 40px' }}>
              <a
                href="/commercial-registration.pdf"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: '"IBM Plex Sans Arabic", Cairo, sans-serif',
                  fontSize: 14, fontWeight: 600,
                  padding: '12px 28px',
                  border: '1.5px solid rgba(255,255,255,0.22)',
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  letterSpacing: '0.02em',
                  textDecoration: 'none',
                  transition: 'background 0.18s, border-color 0.18s',
                }}
                onMouseEnter={e => { const b = e.currentTarget; b.style.background = 'rgba(255,255,255,0.12)'; b.style.borderColor = 'rgba(255,255,255,0.5)' }}
                onMouseLeave={e => { const b = e.currentTarget; b.style.background = 'rgba(255,255,255,0.06)'; b.style.borderColor = 'rgba(255,255,255,0.22)' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                {t('السجل التجاري', 'Commercial Registration')}
              </a>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}

const TrustStrip = () => {
  const { t, dir } = useLanguage()
  const badges = [
    { icon: '🔐', label: t('SSL مشفّر', 'SSL Encrypted') },
    { icon: '🇸🇦', label: t('خوادم المملكة', 'KSA Servers') },
    { icon: '🛡️', label: t('حماية البيانات PDPL', 'PDPL Data Protection') },
    { icon: '🤖', label: t('مدعوم بـ AI متقدم', 'Advanced AI Powered') },
  ]
  return (
    <div style={{ background: '#fff', borderTop: '1px solid rgba(15,27,61,0.06)', borderBottom: '1px solid rgba(15,27,61,0.06)', padding: '22px 0' }} dir={dir}>
      <div className="hp-container">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px 44px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(37,211,102,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <WaIcon />
            </div>
            <span style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 14, fontWeight: 500, color: '#0F1A15' }}>WhatsApp Business API</span>
          </div>
          {badges.map(b => (
            <div key={b.icon} style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{b.icon}</div>
              <span style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 14, fontWeight: 500, color: '#0F1A15' }}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Results ────────────────────────────────────────────────────── */
const Results = () => {
  const { t, dir, language } = useLanguage()
  const checkItems = [
    t('أرقام حقيقية من عيادات مشابهة', 'Real numbers from similar clinics'),
    t('خطة مخصصة لعيادتك', 'A plan tailored to your clinic'),
    t('ما الذي يجعل النتائج ممكنة', 'What makes these results possible'),
  ]
  const metrics = [
    { to: 40, prefix: '+', suffix: '%', label: t('زيادة في المواعيد المحجوزة', 'Increase in Booked Appointments'), sub: t('متوسط أول 60 يوم', 'Average first 60 days') },
    { to: 0,  prefix: '',  suffix: '',  label: t('مكالمات فائتة خارج الدوام',  'Missed Calls After Hours'),        sub: t('المساعد يعمل 24/7', 'AI runs 24/7') },
    { to: 3,  prefix: '',  suffix: language === 'ar' ? ' أسابيع' : ' Weeks', label: t('للإطلاق الكامل', 'To Full Launch'), sub: t('من التعاقد حتى التشغيل', 'From contract to go-live') },
  ]
  return (
    <section className="hp-section" style={{ background: C.paper }} dir={dir}>
      <div className="hp-container hp-divider" style={{ paddingTop: 72 }}>
        <div className="eyebrow" style={{ marginBottom: 28 }}>{t('01 — النتائج', '01 — Results')}</div>
        <div className="hp-2col-wide">
          <motion.div {...rv}>
            <h2 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(32px,3.4vw,50px)', fontWeight: 400, color: C.ink, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 18 }}>
              {t('ماذا يحصل عملاؤنا في أول', 'What do our clients achieve in the first')}{' '}
              <span className="hero-em">{t('30 يوم؟', '30 days?')}</span>
            </h2>
            <p style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 16, color: C.ink2, lineHeight: 1.8, marginBottom: 24 }}>
              {t(
                'جلسة تعريفية لفهم وضع عيادتك — أفضل الحالات، أسوأ الحالات، وبالضبط ما الذي يمنع نموك. نشرح لك كيف نبني النظام كاملاً ونشغّله.',
                'A discovery session to understand your clinic — best cases, worst cases, and exactly what\'s blocking growth. We show you how we build and run the entire system.'
              )}
            </p>
            {checkItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', borderBottom: `1px solid ${C.rule}`, fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 14, color: C.ink2 }}>
                <Check size={13} color={C.brand} strokeWidth={2.5} />{item}
              </div>
            ))}
            <button className="btn btn-primary" style={{ marginTop: 28 }}
              onClick={() => wa('مرحباً، أريد حجز جلسة استراتيجية مجانية لعيادتي')}>
              {t('احجز جلسة اكتشاف ←', 'Book a Discovery Session →')}
            </button>
          </motion.div>

          <motion.div {...rv} transition={{ delay: 0.15 }}>
            {metrics.map(({ to, prefix, suffix, label, sub }, idx) => (
              <motion.div key={label as string}
                initial={{ opacity: 0, x: dir === 'rtl' ? 20 : -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.12, duration: 0.5 }}
                style={{ padding: '22px 0', borderBottom: `1px solid ${C.rule}` }}>
                <div style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 34, fontWeight: 400, color: C.accent2, lineHeight: 1 }}>
                  {prefix}<AnimCounter to={to} suffix={suffix} />
                </div>
                <div style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontWeight: 600, fontSize: 15, color: C.ink, margin: '6px 0 3px' }}>{label}</div>
                <div style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 13, color: C.ink3 }}>{sub}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ─── Method ─────────────────────────────────────────────────────── */
const Method = () => {
  const { t, dir } = useLanguage()
  const cards = [
    { icon: Bot,       n: '01', title: t('مساعد الاستقبال AI', 'AI Reception Agent'),  items: [t('يرد في أقل من 12 ثانية','Responds in under 12 seconds'), t('يفهم اللهجة السعودية','Understands Saudi dialect'), t('يعمل 24 ساعة 7 أيام','Works 24/7'), t('بدون تدخل موظف','No human intervention')] },
    { icon: Calendar,  n: '02', title: t('الحجز الذكي', 'Smart Booking'),              items: [t('يحجز مباشرة في الجدول','Books directly in the schedule'), t('يتحقق من التوافر فوراً','Checks availability instantly'), t('يرسل تأكيد تلقائي','Sends automatic confirmation'), t('يتصل بنظام المواعيد','Integrates with your calendar')] },
    { icon: Clock,     n: '03', title: t('متابعة العملاء', 'Patient Follow-up'),        items: [t('تذكير قبل 24 و2 ساعة','Reminders 24h & 2h before'), t('استرداد الغائبين','Re-engages no-shows'), t('متابعة بعد الزيارة','Post-visit follow-up'), t('رسائل مخصصة','Personalized messages')] },
    { icon: BarChart3, n: '04', title: t('التقارير والتحليل', 'Reports & Analytics'),  items: [t('تقارير يومية أوتوماتيكية','Automatic daily reports'), t('مؤشرات الأداء','Performance KPIs'), t('مصادر العملاء','Patient sources'), t('معدل إلغاء المواعيد','Cancellation rate')] },
  ]
  return (
    <section id="method" className="hp-section" style={{ background: C.paper2 }} dir={dir}>
      <div className="hp-container">
        <div className="eyebrow" style={{ marginBottom: 28 }}>{t('02 — المنهجية', '02 — Methodology')}</div>
        <motion.h2 {...rv} style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(32px,3.4vw,50px)', fontWeight: 400, color: C.ink, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 56, maxWidth: 520 }}>
          {t('أربعة أنظمة،', 'Four systems.')}{' '}
          <span className="hero-em">{t('عيادة واحدة.', 'One clinic.')}</span>
        </motion.h2>
        <div className="hp-4col" style={{ borderTop: `1px solid ${C.rule}` }}>
          {cards.map(({ icon: Icon, n, title, items }, idx) => (
            <motion.div key={n}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: idx * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ backgroundColor: `${C.paper}`, boxShadow: `inset 0 0 0 1px ${C.rule2}` }}
              style={{ padding: '32px 24px', borderRight: dir === 'rtl' ? `1px solid ${C.rule}` : 'none', borderLeft: dir === 'ltr' ? `1px solid ${C.rule}` : 'none', transition: 'background 0.2s' }}>
              <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: C.ink3, letterSpacing: '0.1em', marginBottom: 20 }}>{n}</div>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: `rgba(37,99,235,0.08)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <Icon size={18} color={C.accent} />
              </div>
              <h3 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 17, fontWeight: 500, color: C.ink, marginBottom: 16, lineHeight: 1.3 }}>{title}</h3>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((item, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 13, color: C.ink3, lineHeight: 1.5 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: C.gold, marginTop: 6, flexShrink: 0 }} />{item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── AI Section (dark) ──────────────────────────────────────────── */
const AiSection = () => {
  const { t, dir } = useLanguage()
  return (
  <section id="ai" className="hp-section" style={{ background: C.dark, position: 'relative', overflow: 'hidden' }} dir={dir}>
    {/* SYC ai-band::before radial overlays */}
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 50% at 80% 20%, rgba(37,99,235,0.08), transparent 60%), radial-gradient(ellipse 50% 40% at 10% 90%, rgba(37,99,235,0.04), transparent 60%)', pointerEvents: 'none' }} />
    <div className="hp-container" style={{ position: 'relative' }}>
      <div className="eyebrow" style={{ marginBottom: 28, color: C.onDark2 }}>
        <span style={{ background: C.onDark2, display: 'inline-block', width: 22, height: 1, marginLeft: 10 }} />
        {t('03 — المساعد AI', '03 — AI Assistant')}
      </div>

      <div className="hp-2col-wide">
        <motion.div {...rv}>
          <h2 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(32px,3.4vw,50px)', fontWeight: 400, color: C.onDark, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 20 }}>
            {t('موظف الاستقبال الذي لا ينام', 'The receptionist who never sleeps')}{' '}
            <span style={{ fontStyle: 'italic', color: C.gold }}>{t('ولا يطلب علاوة.', 'and never asks for a raise.')}</span>
          </h2>
          <p style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 16, color: C.onDark2, lineHeight: 1.8, marginBottom: 32 }}>
            {t(
              'كل عميل يراسل عيادتك يحصل على رد فوري — في أقل من 12 ثانية، على واتساب، بالعربية. مدرّب على جدولك وأسعارك وبروتوكولاتك.',
              'Every patient who messages your clinic gets an instant reply — in under 12 seconds, on WhatsApp. Trained on your schedule, prices, and protocols.'
            )}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 36, paddingBottom: 36, borderBottom: `1px solid ${C.onDarkRule}` }}>
            {[
              { icon: Zap,      label: t('رد في 12 ثانية','Responds in 12 Seconds'),       desc: t('العملاء الذين يحصلون على رد سريع يحجزون بنسبة 4× أعلى','Patients who get a fast reply book at 4× higher rates') },
              { icon: Calendar, label: t('حجز مباشر في الجدول','Direct Schedule Booking'), desc: t('يتحقق من التوافر ويؤكد الموعد بدون تدخل بشري','Checks availability and confirms without human intervention') },
              { icon: Clock,    label: t('يعمل 24 ساعة','Works 24 Hours'),                 desc: t('حتى في الإجازات والأعياد والأوقات خارج الدوام','Even on holidays, weekends, and after hours') },
              { icon: Phone,    label: t('يقلل المكالمات','Reduces Calls'),                desc: t('80% من الأسئلة تُحل عبر واتساب بدون مكالمة','80% of questions resolved on WhatsApp without a call') },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label as string} className="hp-feature-item hp-feature-item-dark" style={{ display: 'flex', gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `rgba(37,99,235,0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={15} color={C.gold} />
                </div>
                <div>
                  <div style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontWeight: 600, fontSize: 14, color: C.onDark, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 13, color: C.onDark2, lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="hp-ai-btns" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-on-dark" onClick={() => wa('مرحباً، أريد رؤية مساعد الاستقبال AI بشكل عملي')}>{t('شوف كيف يعمل ←', 'See How It Works →')}</button>
            <button className="btn" style={{ background: 'transparent', border: `1px solid ${C.onDarkRule}`, color: C.onDark2 }}
              onClick={() => wa('مرحباً، أريد تجربة المساعد AI مباشرة')}>{t('تجربة مباشرة', 'Live Demo')}</button>
          </div>
        </motion.div>

        <motion.div {...rv} transition={{ delay: 0.2 }} style={{ alignSelf: 'start' }}>
          {/* AI System Interface — professional dashboard mockup */}
          <div className="glow-card" style={{ background: '#070F1E', borderRadius: 16, border: '1px solid rgba(37,99,235,0.25)', overflow: 'hidden', fontFamily: '"IBM Plex Sans Arabic", sans-serif' }}>

            {/* Top bar */}
            <div style={{ background: '#0B1628', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 0 3px rgba(74,222,128,0.2)' }} />
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, letterSpacing: '0.08em', fontFamily: '"IBM Plex Mono", monospace' }}>MADAR AI · نشط</span>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, fontFamily: '"IBM Plex Mono", monospace' }}>14:14</span>
            </div>

            {/* Caller info strip */}
            <div style={{ background: 'rgba(37,99,235,0.07)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(37,99,235,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Phone size={14} color="#60A5FA" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, marginBottom: 1 }}>محمد العمري</div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontFamily: '"IBM Plex Mono", monospace' }}>0551234567 · آخر زيارة: 14 مارس</div>
              </div>
              <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.22)', borderRadius: 6, padding: '3px 9px' }}>
                <span style={{ color: '#4ADE80', fontSize: 10, fontFamily: '"IBM Plex Mono", monospace' }}>● واردة</span>
              </div>
            </div>

            {/* Transcript */}
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { role: 'ai',   text: 'أهلاً بك في عيادة د. أحمد! كيف أقدر أساعدك؟',           time: '14:10' },
                { role: 'user', text: 'أبي أحجز موعد كشف أسنان',                               time: '14:11' },
                { role: 'ai',   text: 'عندنا الأربعاء 5م أو الخميس 10ص. أيهما يناسبك؟',        time: '14:11' },
                { role: 'user', text: 'الأربعاء',                                               time: '14:12' },
                { role: 'ai',   text: 'تم تأكيد موعدك الأربعاء 5م ✓ ستصلك رسالة تذكير.',       time: '14:12' },
              ].map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: m.role === 'ai' ? 'rgba(37,99,235,0.18)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    {m.role === 'ai' ? <Bot size={12} color="#60A5FA" /> : <span style={{ fontSize: 10 }}>👤</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, marginBottom: 3, fontFamily: '"IBM Plex Mono", monospace', textAlign: m.role === 'user' ? 'left' : 'right' }}>
                      {m.role === 'ai' ? 'MADAR AI' : 'عميل'} · {m.time}
                    </div>
                    <div style={{
                      background: m.role === 'ai' ? 'rgba(37,99,235,0.1)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${m.role === 'ai' ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.07)'}`,
                      borderRadius: m.role === 'ai' ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
                      padding: '8px 12px',
                      color: m.role === 'ai' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.6)',
                      fontSize: 12.5, lineHeight: 1.6,
                    }}>{m.text}</div>
                  </div>
                </div>
              ))}

              {/* Typing */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(37,99,235,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={12} color="#60A5FA" />
                </div>
                <div style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: '4px 12px 12px 12px', padding: '10px 14px', display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#60A5FA', display: 'inline-block', animation: 'typing 1.2s ease infinite' }} />
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#60A5FA', display: 'inline-block', animation: 'typing 1.2s ease 0.2s infinite' }} />
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#60A5FA', display: 'inline-block', animation: 'typing 1.2s ease 0.4s infinite' }} />
                </div>
              </div>
            </div>

            {/* AI Actions footer */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '10px 16px' }}>
              <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9, marginBottom: 7, fontFamily: '"IBM Plex Mono", monospace', letterSpacing: '0.1em' }}>AI ACTIONS</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['✓ تأكيد الموعد', '📩 إرسال تذكير', '📋 عرض السجل'].map(tag => (
                  <span key={tag} style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 20, padding: '4px 11px', fontSize: 11, color: '#60A5FA', cursor: 'default' }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
  )
}

/* ─── Process ────────────────────────────────────────────────────── */
const Process = () => {
  const { t, dir } = useLanguage()
  const steps = [
    { w: '01', phase: t('التأسيس','Setup'),    dot: C.brand, items: [t('جلسة تعريفية كاملة','Full onboarding session'), t('ربط واتساب Business','WhatsApp Business connection'), t('تدريب المساعد','AI assistant training'), t('إعداد نظام الحجز','Booking system setup')] },
    { w: '02', phase: t('البناء','Build'),     dot: C.ink3,  items: [t('تخصيص ردود AI','Custom AI responses'), t('ربط جدول المواعيد','Calendar integration'), t('إعداد التذكيرات','Reminders setup'), t('اختبار شامل','Full testing')] },
    { w: '03', phase: t('الإطلاق','Launch'),  dot: C.gold,  items: [t('تشغيل مباشر','Go live'), t('تدريب الفريق','Team training'), t('مراقبة يومية','Daily monitoring'), t('تعديل وتحسين','Tune & optimize')] },
    { w: '04+',phase: t('التحسين','Optimize'),dot: C.ink3,  items: [t('تقارير أسبوعية','Weekly reports'), t('استراتيجية النمو','Growth strategy'), t('إضافة ميزات','Feature additions'), t('دعم مستمر','Ongoing support')] },
  ]
  return (
    <section id="process" className="hp-section" style={{ background: C.paper }} dir={dir}>
      <div className="hp-container hp-divider" style={{ paddingTop: 72 }}>
        <div className="eyebrow" style={{ marginBottom: 28 }}>{t('05 — العملية', '05 — Process')}</div>
        <motion.h2 {...rv} style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(32px,3.4vw,50px)', fontWeight: 400, color: C.ink, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 64, maxWidth: 500 }}>
          {t('ثلاثون يوماً إلى نظام', 'Thirty days to a system')}{' '}
          <span className="hero-em">{t('يعمل بالكامل.', 'fully up and running.')}</span>
        </motion.h2>
        <div style={{ position: 'relative' }}>
          <div className="hp-timeline-connector" style={{ position: 'absolute', top: 0, right: 0, left: 0, height: 2, background: `linear-gradient(to left, ${C.rule}, ${C.brand} 50%, ${C.rule})`, opacity: 0.5, pointerEvents: 'none' }} />
          <div className="hp-4timeline">
            {steps.map(({ w, phase, dot, items }) => (
              <motion.div key={w} {...rv} className="hp-timeline-step" style={{ paddingTop: 8, borderTop: `2px solid ${C.rule}`, position: 'relative' }}>
                <div className="hp-tl-dot" style={{ width: 10, height: 10, borderRadius: '50%', background: dot, position: 'absolute', top: -6, right: 0, border: `2px solid ${C.paper}` }} />
                <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: C.ink3, letterSpacing: '0.1em', marginBottom: 16, marginTop: 20 }}>
                  WEEK {w} · {(phase as string).toUpperCase()}
                </div>
                <h3 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 19, fontWeight: 500, color: C.ink, marginBottom: 14 }}>{phase}</h3>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {items.map((item, i) => (
                    <li key={i} style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 13, color: C.ink3, lineHeight: 1.5 }}>{item}</li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── Programs ───────────────────────────────────────────────────── */
const Programs = () => {
  const { t, dir } = useLanguage()
  const f1 = [t('مساعد واتساب AI مخصص','Custom AI WhatsApp Assistant'), t('جدول مواعيد رقمي','Digital appointment calendar'), t('تذكيرات تلقائية للعملاء','Automatic patient reminders'), t('لوحة تحكم أساسية','Basic dashboard'), t('تدريب الفريق (ساعتان)','Team training (2 hours)'), t('دعم شهر كامل','1-month support')]
  const f2 = [t('كل مزايا البداية الذكية','All Smart Start features'), t('مساعد صوتي AI للمكالمات','AI voice assistant for calls'), t('تقارير تحليلية متقدمة','Advanced analytics reports'), t('استرداد العملاء الغائبين','No-show re-engagement'), t('تكاملات خاصة بعيادتك','Custom clinic integrations'), t('دعم أولوية + متابعة شهرية','Priority support + monthly review')]
  return (
    <section id="programs" className="hp-section" style={{ background: C.paper2 }} dir={dir}>
      <div className="hp-container">
        <div className="eyebrow" style={{ marginBottom: 28 }}>{t('06 — البرامج', '06 — Plans')}</div>
        <motion.h2 {...rv} style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(32px,3.4vw,50px)', fontWeight: 400, color: C.ink, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 48 }}>
          {t('طريقتان للبدء.', 'Two ways to start.')}{' '}
          <span className="hero-em">{t('وجهة واحدة.', 'One destination.')}</span>
        </motion.h2>
        <div className="hp-2col">
          <motion.div {...rv} className="hp-card" style={{ background: C.paper, borderRadius: 10, padding: '36px 32px', border: `1px solid ${C.rule}` }}>
            <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: C.ink3, letterSpacing: '0.1em', marginBottom: 16 }}>{t('مناسب لـ · عيادة جديدة أو مبتدئة', 'Best for · New or early-stage clinics')}</div>
            <h3 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 24, fontWeight: 500, color: C.ink, marginBottom: 12 }}>{t('البداية الذكية', 'Smart Start')}</h3>
            <p style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 14, color: C.ink2, lineHeight: 1.75, marginBottom: 24 }}>
              {t('نظام استقبال AI + إدارة مواعيد + لوحة تحكم — كل ما تحتاجه من أول أسبوع.', 'AI reception + appointment management + dashboard — everything you need from week one.')}
            </p>
            <div style={{ borderTop: `1px solid ${C.rule}`, paddingTop: 20, marginBottom: 28 }}>
              {f1.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', borderBottom: `1px solid ${C.rule}`, fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 13, color: C.ink2 }}>
                  <Check size={12} color={C.brand} strokeWidth={2.5} />{f}
                </div>
              ))}
            </div>
            <button className="btn btn-primary" onClick={() => wa('مرحباً، أريد الاستفسار عن برنامج البداية الذكية لعيادتي')}>
              {t('احجز جلسة اكتشاف ←', 'Book a Discovery Session →')}
            </button>
          </motion.div>

          <motion.div {...rv} transition={{ delay: 0.12 }} className="hp-card hp-card-dark glow-card" style={{ background: C.dark, borderRadius: 10, padding: '36px 32px', borderTop: `4px solid ${C.brand}`, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.15), transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: C.gold, letterSpacing: '0.1em', marginBottom: 16 }}>{t('مناسب لـ · عيادة تريد نمواً متسارعاً', 'Best for · Clinics pursuing fast growth')}</div>
            <h3 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 24, fontWeight: 500, color: C.onDark, marginBottom: 12 }}>{t('النمو الكامل', 'Full Growth')}</h3>
            <p style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 14, color: C.onDark2, lineHeight: 1.75, marginBottom: 24 }}>
              {t('كل شيء في البداية الذكية + مساعد صوتي AI + تقارير متقدمة + استرداد العملاء الغائبين.', 'Everything in Smart Start + AI voice assistant + advanced analytics + no-show recovery.')}
            </p>
            <div style={{ borderTop: `1px solid ${C.onDarkRule}`, paddingTop: 20, marginBottom: 28 }}>
              {f2.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', borderBottom: `1px solid ${C.onDarkRule}`, fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 13, color: C.onDark2 }}>
                  <Check size={12} color={C.gold} strokeWidth={2.5} />{f}
                </div>
              ))}
            </div>
            <button className="btn" style={{ background: C.brand, color: '#fff', borderColor: C.brand, width: '100%', justifyContent: 'center' }}
              onClick={() => wa('مرحباً، أريد الاستفسار عن برنامج النمو الكامل لعيادتي')}>
              {t('احجز جلسة اكتشاف ←', 'Book a Discovery Session →')}
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ─── FAQ ────────────────────────────────────────────────────────── */
const FAQ = () => {
  const { t, dir } = useLanguage()
  const [open, setOpen] = useState<number | null>(null)
  const faqs = [
    { q: t('هل أحتاج خبرة تقنية لتشغيل النظام؟', 'Do I need technical experience to run the system?'), a: t('لا على الإطلاق. نحن نبني كل شيء ونشغّله. دورك هو متابعة التقارير واستقبال العملاء فقط.', 'Not at all. We build and run everything. Your role is simply to review reports and serve your patients.') },
    { q: t('كم يستغرق التفعيل؟', 'How long does activation take?'), a: t('من التعاقد حتى التشغيل الكامل: 3 أسابيع في المتوسط. الأسبوع الأول إعداد، الثاني بناء، الثالث إطلاق.', 'From contract to full go-live: 3 weeks on average. Week 1 is setup, week 2 is build, week 3 is launch.') },
    { q: t('هل يعمل مع نظام المواعيد الحالي في العيادة؟', 'Does it work with our existing appointment system?'), a: t('نعم في معظم الحالات. نقيّم نظامك الحالي في أول جلسة ونحدد أفضل طريقة للربط.', 'Yes, in most cases. We evaluate your current system in the first session and determine the best integration approach.') },
    { q: t('ماذا يحدث لو العميل طلب شيئاً خارج قدرة المساعد؟', 'What happens if a patient asks something beyond the AI\'s capability?'), a: t('يحول المحادثة تلقائياً لموظف بشري مع ملخص كامل حتى لا يضطر العميل للتكرار.', 'It automatically transfers to a human agent with a full summary, so the patient never has to repeat themselves.') },
    { q: t('هل يفهم اللهجة السعودية والخليجية؟', 'Does it understand Saudi and Gulf dialects?'), a: t('نعم — المساعد مدرّب خصيصاً على اللهجة الخليجية السعودية. يفهم "أبي أحجز" و"متى فراغكم" وغيرها.', 'Yes — the assistant is specifically trained on Saudi Gulf dialect. It understands natural, everyday expressions.') },
    { q: t('ما هي آلية الدفع؟', 'How does pricing work?'), a: t('رسوم شهرية ثابتة بدون عقود طويلة. تفاصيل الأسعار تُناقش في جلسة الاكتشاف بناءً على حجم عيادتك.', 'Fixed monthly fee with no long-term contracts. Pricing details are discussed in the discovery session based on your clinic size.') },
  ]
  return (
    <section id="faq" className="hp-section" style={{ background: C.paper }} dir={dir}>
      <div className="hp-container-narrow hp-divider" style={{ paddingTop: 64 }}>
        <div className="eyebrow" style={{ marginBottom: 28 }}>{t('08 — الأسئلة الشائعة', '08 — FAQ')}</div>
        <motion.h2 {...rv} style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(22px,3vw,34px)', fontWeight: 400, color: C.ink, lineHeight: 1.35, marginBottom: 40 }}>
          {t('أسئلة تخطر على بالك', 'Questions on your mind')}
        </motion.h2>
        {faqs.map((faq, i) => (
          <div key={i} style={{ borderBottom: `1px solid ${C.rule}` }}>
            <button onClick={() => setOpen(open === i ? null : i)}
              style={{ width: '100%', padding: '20px 0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, textAlign: dir === 'rtl' ? 'right' : 'left' }}>
              <span style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 16, fontWeight: 500, color: C.ink, flex: 1 }}>{faq.q}</span>
              <motion.span animate={{ rotate: open === i ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={16} color={C.ink3} />
              </motion.span>
            </button>
            <AnimatePresence>
              {open === i && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
                  <p style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 14, color: C.ink2, lineHeight: 1.8, paddingBottom: 20, margin: 0 }}>{faq.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ─── Final CTA ──────────────────────────────────────────────────── */
const FinalCTA = () => {
  const { t, dir } = useLanguage()
  return (
  <section style={{ background: C.dark, padding: '110px 0 70px', textAlign: 'center', position: 'relative', overflow: 'hidden', isolation: 'isolate' }} dir={dir}>
    {/* Top accent gradient line */}
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent 10%, ${C.brand} 35%, #60A5FA 65%, transparent 90%)`, pointerEvents: 'none' }} />
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(37,99,235,0.25), transparent 60%), radial-gradient(ellipse 50% 40% at 90% 100%, rgba(37,99,235,0.08), transparent 60%)', pointerEvents: 'none' }} />
    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)', backgroundSize: '28px 28px', opacity: 0.6, pointerEvents: 'none' }} />
    <div className="hp-container-narrow" style={{ position: 'relative' }}>
      <div className="eyebrow" style={{ marginBottom: 24, color: C.onDark2, justifyContent: 'center' }}>{t('ابدأ الآن', 'Start Now')}</div>
      <motion.h2 {...rv} style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(32px,3.4vw,50px)', fontWeight: 400, color: C.onDark, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 18 }}>
        {t('احجز محادثة 30 دقيقة', 'Book a 30-minute call')}{' '}
        <span style={{ fontStyle: 'italic', color: C.gold }}>{t('تستحق وقتك.', 'worth your time.')}</span>
      </motion.h2>
      <motion.p {...rv} style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 17, color: C.onDark2, lineHeight: 1.8, marginBottom: 36 }}>
        {t('نفهم وضع عيادتك الآن، ونعطيك خطة واضحة — بدون أي التزام.', "We understand your clinic's current situation and give you a clear plan — with no commitment.")}
      </motion.p>
      <motion.button
        whileHover={{ scale: 1.04, boxShadow: '0 0 48px rgba(255,255,255,0.25)' }}
        whileTap={{ scale: 0.97 }}
        className="btn btn-on-dark"
        style={{ fontSize: 16, padding: '15px 30px', display: 'inline-flex', alignItems: 'center', gap: 8 }}
        onClick={() => wa('مرحباً، أريد حجز جلسة تعريفية مجانية 30 دقيقة')}>
        <MessageCircle size={17} />
        {t('احجز جلسة مجانية ←', 'Book a Free Session →')}
      </motion.button>
    </div>
  </section>
  )
}

/* ─── Sticky Sidebar ─────────────────────────────────────────────── */
const StickyBar = () => {
  const [gone, setGone] = useState(false)
  const { t } = useLanguage()
  if (gone) return null
  return (
    <motion.div
      className="hp-sticky"
      initial={{ x: -60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 2.5, duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <div className="hp-sticky-pulse" />
      <span className="hp-sticky-text" onClick={() => wa('مرحباً، أريد حجز جلسة استراتيجية')}>
        {t('احجز استشارة مجانية', 'Free Consultation')}
      </span>
      <button className="hp-sticky-close" onClick={e => { e.stopPropagation(); setGone(true) }}>×</button>
    </motion.div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────── */
export const HomePage = () => (
  <>
    <GlobalCSS />
    <ScrollProgressBar />
    <Navbar />
    <main>
      <Hero />
      <TrustStrip />
      <Results />
      <Method />
      <AiSection />
      <Process />
      <Programs />
      <FAQ />
      <FinalCTA />
      <GovBadges />
    </main>
    <Footer />
    <StickyBar />
  </>
)
