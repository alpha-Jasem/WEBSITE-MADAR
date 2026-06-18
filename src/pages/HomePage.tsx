import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, MessageCircle, Calendar, BarChart3, Clock, Phone, Bot, Zap, Menu, X } from 'lucide-react'
import { Footer } from '../components/public/Footer'
import { AiChatWidget } from '../components/public/AiChatWidget'

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

/* ─── Global CSS ─────────────────────────────────────────────────── */
const GlobalCSS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Arabic:wght@300;400;500;700&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { font-size: 17px; scroll-behavior: smooth; overflow-x: clip; }
    body { background: ${C.paper}; color: ${C.ink}; font-size: 17px; line-height: 1.55; overflow-x: clip; }

    .hp-container { max-width: 1240px; margin: 0 auto; padding: 0 28px; }
    .hp-container-narrow { max-width: 980px; margin: 0 auto; padding: 0 28px; }

    /* Eyebrow labels — exact SYC pattern */
    .eyebrow {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 11px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: ${C.accent2};
      display: inline-flex;
      align-items: center;
      gap: 10px;
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
      background: rgba(251,250,247,0.88);
      backdrop-filter: saturate(140%) blur(14px);
      -webkit-backdrop-filter: saturate(140%) blur(14px);
      border-bottom: 1px solid ${C.rule};
    }
    .hp-nav-inner {
      display: flex; align-items: center; justify-content: space-between;
      height: 66px;
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
      background: linear-gradient(90deg, #1E3A6E, #2563EB 60%, #60A5FA);
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent;
      white-space: nowrap;
      opacity: 0;
      transform: translateY(0.25em);
      transition: opacity .45s ease, transform .55s cubic-bezier(.2,.8,.2,1);
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
      background: ${C.brand};
      animation: pulse-ring 1.8s ease-out infinite;
    }
    @keyframes pulse-ring {
      0%   { box-shadow: 0 0 0 0 rgba(37,99,235,0.55); }
      70%  { box-shadow: 0 0 0 6px rgba(37,99,235,0); }
      100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); }
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
      box-shadow: 0 16px 48px rgba(12,26,46,0.11);
    }
    .hp-card-dark:hover {
      transform: translateY(-3px);
      box-shadow: 0 20px 56px rgba(0,0,0,0.32);
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
  const links = [
    { label: 'المنهجية',   href: '#method' },
    { label: 'المساعد AI', href: '#ai' },
    { label: 'العملية',   href: '#process' },
    { label: 'البرامج',   href: '#programs' },
    { label: 'الأسئلة',  href: '#faq' },
  ]
  const go = (href: string) => {
    setOpen(false)
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
  }
  return (
    <header className="hp-nav" dir="rtl">
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
            <button key={l.href} className="hp-nav-link" onClick={() => go(l.href)}>{l.label}</button>
          ))}
        </nav>

        {/* CTA + Hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => wa()}>احجز مكالمة ←</button>
          <button className="hp-hamburger" onClick={() => setOpen(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.ink, padding: 4, display: 'flex', alignItems: 'center' }}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav dir="rtl" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            style={{ background: C.paper, borderTop: `1px solid ${C.rule}`, padding: '12px 20px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {links.map(l => (
              <button key={l.href} className="hp-nav-link" onClick={() => go(l.href)}
                style={{ textAlign: 'right', padding: '10px 0', fontSize: 16, borderBottom: `1px solid ${C.rule}` }}>
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
const ROT_WORDS = ['الأسنان', 'العظام', 'العيون', 'الجلدية', 'الأطفال']

const Hero = () => {
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
  <section className="hp-section hp-hero-section" style={{ background: C.paper, paddingTop: 130, paddingBottom: 80, position: 'relative', overflow: 'hidden' }} dir="rtl">
    {/* Background glows */}
    <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 60% 50% at 90% 10%, rgba(37,99,235,0.06), transparent 60%), radial-gradient(ellipse 50% 40% at 5% 80%, rgba(30,58,110,0.04), transparent 60%)`, pointerEvents: 'none' }} />
    <div style={{ position: 'absolute', width: 600, height: 600, top: -180, right: -100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.18), transparent 70%)', filter: 'blur(80px)', opacity: 0.5, pointerEvents: 'none' }} />

    <div className="hp-container" style={{ position: 'relative' }}>
      <div className="hp-hero-grid">

        {/* ── Text side ── */}
        <motion.div {...ha} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {/* Hero pill */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '7px 14px 7px 12px', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.22)', borderRadius: 999, fontFamily: '"IBM Plex Mono", monospace', fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.accent2, marginBottom: 22 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.brand, boxShadow: '0 0 0 4px rgba(37,99,235,0.18)', flexShrink: 0 }} />
            استقبال ذكي · ٢٤/٧ · بدون انقطاع
          </div>

          <h1 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(48px,5.6vw,82px)', fontWeight: 400, color: C.ink, lineHeight: 1.0, marginBottom: 24, letterSpacing: '-0.025em' }}>
            استقبال ذكي
            <br />
            لعيادة{' '}
            <span className="hero-rot" ref={rotRef} aria-live="polite">
              {ROT_WORDS.map((word, i) => (
                <span key={word} className={`hero-rot-word${i === activeIdx ? ' is-active' : ''}`}>{word}</span>
              ))}
            </span>
            .
          </h1>

          <p style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 18, color: C.ink2, lineHeight: 1.75, marginBottom: 38, maxWidth: 420 }}>
            نظام يستقبل عملائك على واتساب، يحجز المواعيد، ويُذكّرهم تلقائياً — بدون موظف استقبال إضافي.
          </p>

          {/* Single primary CTA */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 48 }}>
            <button className="btn btn-primary" style={{ fontSize: 16, padding: '15px 28px' }}
              onClick={() => wa('مرحباً، أريد حجز جلسة مجانية لمناقشة نظام الاستقبال الذكي لعيادتي')}>
              احجز جلسة مجانية 30 دقيقة ←
            </button>
            <button className="btn btn-ghost"
              onClick={() => document.querySelector('#method')?.scrollIntoView({ behavior: 'smooth' })}>
              كيف يعمل النظام
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', paddingTop: 28, borderTop: `1px solid ${C.rule}` }}>
            {[
              { n: '80%', label: 'تقليل المكالمات الفائتة' },
              { n: '<5ث', label: 'سرعة الرد' },
              { n: '24/7', label: 'استقبال مستمر' },
            ].map((s, i) => (
              <div key={s.n} style={{ padding: '0 20px', borderRight: i > 0 ? `1px solid ${C.rule}` : 'none' }}>
                <div style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 30, fontWeight: 400, color: C.ink, lineHeight: 1 }}>{s.n}</div>
                <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, letterSpacing: '0.11em', textTransform: 'uppercase', color: C.ink3, marginTop: 8 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Visual side: dark card ── */}
        <motion.div {...ha} transition={{ delay: 0.18 }} className="hp-hero-phone">
          <div className="hp-hero-phone-inner" style={{ position: 'relative', width: '100%', maxWidth: 420, paddingBottom: 44, paddingLeft: 28 }}>

            {/* Dark card — the main visual container */}
            <div style={{
              background: C.dark,
              borderRadius: 20,
              padding: '28px 24px 24px',
              boxShadow: '0 40px 100px rgba(12,26,46,0.28), 0 4px 16px rgba(12,26,46,0.14)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Inner glow on dark card */}
              <div style={{ position: 'absolute', top: -80, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.28), transparent 70%)', pointerEvents: 'none' }} />

              {/* Badge top-right on card */}
              <div style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, zIndex: 2 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 0 3px rgba(74,222,128,0.25)' }} />
                <span style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>مساعد متصل الآن</span>
              </div>

              {/* WhatsApp chat inside card */}
              <div style={{ borderRadius: 14, overflow: 'hidden', position: 'relative', zIndex: 1, marginTop: 8 }}>
                {/* WA header */}
                <div style={{ background: '#075E54', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Bot size={14} color={C.paper} />
                  </div>
                  <div>
                    <div style={{ color: '#fff', fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontWeight: 600, fontSize: 12 }}>مساعد عيادة د. أحمد</div>
                    <div style={{ color: '#A8D5A2', fontSize: 10, fontFamily: '"IBM Plex Sans Arabic", sans-serif' }}>● متصل الآن</div>
                  </div>
                </div>
                {/* Chat body */}
                <div style={{ background: '#ECE5DD', padding: '10px 9px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ textAlign: 'center', marginBottom: 4 }}>
                    <span style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 6, padding: '2px 10px', fontSize: 10, color: '#6B7280', fontFamily: '"IBM Plex Sans Arabic", sans-serif' }}>اليوم</span>
                  </div>
                  {[
                    { from: 'user', text: 'أبي أحجز موعد تنظيف أسنان', time: '9:41 ص' },
                    { from: 'ai',   text: 'أهلاً! 😊 متى يناسبك؟ عندنا الثلاثاء والأربعاء.', time: '9:41 ص' },
                    { from: 'user', text: 'الأربعاء عصراً', time: '9:42 ص' },
                    { from: 'ai',   text: 'ممتاز ✅ عندي 4:30م. اسمك ورقم جوالك؟', time: '9:42 ص' },
                    { from: 'user', text: 'سارة — 0551234567', time: '9:43 ص' },
                    { from: 'ai',   text: 'تم الحجز يا سارة 🎉 ستصلك رسالة تذكير.', time: '9:43 ص' },
                  ].map((m, i) => (
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
                  {/* Typing indicator */}
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

            {/* Badge bottom — floats clearly below-right of the dark card */}
            <div className="hp-hero-float" style={{ position: 'absolute', bottom: 0, left: 0, background: '#fff', borderRadius: 14, padding: '12px 18px', boxShadow: '0 12px 36px rgba(12,26,46,0.16)', border: `1px solid ${C.rule}`, fontFamily: '"IBM Plex Sans Arabic", sans-serif', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(37,99,235,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={16} color={C.accent2} />
              </div>
              <div>
                <div style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 20, fontWeight: 600, color: C.ink, lineHeight: 1 }}>14 موعد</div>
                <div style={{ fontSize: 11, color: C.ink3, marginTop: 3, fontFamily: '"IBM Plex Mono", monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}>محجوز اليوم</div>
              </div>
            </div>

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

const GovBadges = () => (
  <div style={{ background: C.dark, borderTop: `1px solid ${C.onDarkRule}`, padding: '36px 0 32px' }} dir="rtl">
    <div className="hp-container">
      <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: C.onDark2, letterSpacing: '0.16em', textTransform: 'uppercase', textAlign: 'center', marginBottom: 28 }}>
        ضمن المنظومة التقنية السعودية
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '20px 64px' }}>
        <img
          src="/saudinic-logo.svg"
          alt="SDAIA — الهيئة السعودية للبيانات والذكاء الاصطناعي"
          style={{ height: 44, width: 'auto', objectFit: 'contain', opacity: 0.9 }}
        />
        <img
          src="/cst-logo.svg"
          alt="هيئة الاتصالات والفضاء والتقنية"
          style={{ height: 48, width: 'auto', objectFit: 'contain', opacity: 0.9, filter: 'brightness(0) invert(1)' }}
        />
      </div>
    </div>
  </div>
)

const TrustStrip = () => (
  <div style={{ background: '#fff', borderTop: '1px solid rgba(15,27,61,0.06)', borderBottom: '1px solid rgba(15,27,61,0.06)', padding: '22px 0' }} dir="rtl">
    <div className="hp-container">
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px 44px' }}>
        {/* WhatsApp — SVG icon */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(37,211,102,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <WaIcon />
          </div>
          <span style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 14, fontWeight: 500, color: '#0F1A15' }}>واتساب Business API</span>
        </div>
        {[
          { icon: '🔐', label: 'SSL مشفّر' },
          { icon: '🇸🇦', label: 'خوادم المملكة' },
          { icon: '🛡️', label: 'حماية البيانات PDPL' },
          { icon: '🤖', label: 'مدعوم بـ AI متقدم' },
        ].map(b => (
          <div key={b.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{b.icon}</div>
            <span style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 14, fontWeight: 500, color: '#0F1A15' }}>{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
)

/* ─── Results ────────────────────────────────────────────────────── */
const Results = () => (
  <section className="hp-section" style={{ background: C.paper }} dir="rtl">
    <div className="hp-container hp-divider" style={{ paddingTop: 72 }}>
      <div className="eyebrow" style={{ marginBottom: 28 }}>01 — النتائج</div>
      <div className="hp-2col-wide">
        <motion.div {...rv}>
          <h2 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(32px,3.4vw,50px)', fontWeight: 400, color: C.ink, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 18 }}>
            ماذا يحصل عملاؤنا في أول{' '}
            <span className="hero-em">30 يوم؟</span>
          </h2>
          <p style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 16, color: C.ink2, lineHeight: 1.8, marginBottom: 24 }}>
            جلسة تعريفية لفهم وضع عيادتك — أفضل الحالات، أسوأ الحالات، وبالضبط ما الذي يمنع نموك. نشرح لك كيف نبني النظام كاملاً ونشغّله.
          </p>
          {['أرقام حقيقية من عيادات مشابهة', 'خطة مخصصة لعيادتك', 'ما الذي يجعل النتائج ممكنة'].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', borderBottom: `1px solid ${C.rule}`, fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 14, color: C.ink2 }}>
              <Check size={13} color={C.brand} strokeWidth={2.5} />{item}
            </div>
          ))}
          <button className="btn btn-primary" style={{ marginTop: 28 }}
            onClick={() => wa('مرحباً، أريد حجز جلسة استراتيجية مجانية لعيادتي')}>
            احجز جلسة اكتشاف ←
          </button>
        </motion.div>

        <motion.div {...rv} transition={{ delay: 0.15 }}>
          {[
            { metric: '+40%', label: 'زيادة في المواعيد المحجوزة', sub: 'متوسط أول 60 يوم' },
            { metric: '0',   label: 'مكالمات فائتة خارج الدوام',  sub: 'المساعد يعمل 24/7' },
            { metric: '3 أسابيع', label: 'للإطلاق الكامل',       sub: 'من التعاقد حتى التشغيل' },
          ].map(({ metric, label, sub }) => (
            <div key={metric} style={{ padding: '22px 0', borderBottom: `1px solid ${C.rule}` }}>
              <div style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 34, fontWeight: 400, color: C.accent2, lineHeight: 1 }}>{metric}</div>
              <div style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontWeight: 600, fontSize: 15, color: C.ink, margin: '6px 0 3px' }}>{label}</div>
              <div style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 13, color: C.ink3 }}>{sub}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  </section>
)

/* ─── Method ─────────────────────────────────────────────────────── */
const Method = () => (
  <section id="method" className="hp-section" style={{ background: C.paper2 }} dir="rtl">
    <div className="hp-container">
      <div className="eyebrow" style={{ marginBottom: 28 }}>02 — المنهجية</div>
      <motion.h2 {...rv} style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(32px,3.4vw,50px)', fontWeight: 400, color: C.ink, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 56, maxWidth: 520 }}>
        أربعة أنظمة،{' '}
        <span className="hero-em">عيادة واحدة.</span>
      </motion.h2>

      <div className="hp-4col" style={{ borderTop: `1px solid ${C.rule}` }}>
        {[
          { icon: Bot,       n: '01', title: 'مساعد الاستقبال AI',  items: ['يرد في أقل من 12 ثانية', 'يفهم اللهجة السعودية', 'يعمل 24 ساعة 7 أيام', 'بدون تدخل موظف'] },
          { icon: Calendar,  n: '02', title: 'الحجز الذكي',         items: ['يحجز مباشرة في الجدول', 'يتحقق من التوافر فوراً', 'يرسل تأكيد تلقائي', 'يتصل بنظام المواعيد'] },
          { icon: Clock,     n: '03', title: 'متابعة العملاء',       items: ['تذكير قبل 24 و2 ساعة', 'استرداد الغائبين', 'متابعة بعد الزيارة', 'رسائل مخصصة'] },
          { icon: BarChart3, n: '04', title: 'التقارير والتحليل',   items: ['تقارير يومية أوتوماتيكية', 'مؤشرات الأداء', 'مصادر العملاء', 'معدل إلغاء المواعيد'] },
        ].map(({ icon: Icon, n, title, items }, idx) => (
          <motion.div key={n} {...rv} transition={{ delay: idx * 0.08 }}
            style={{ padding: '32px 24px', borderRight: `1px solid ${C.rule}` }}>
            <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: C.ink3, letterSpacing: '0.1em', marginBottom: 20 }}>{n}</div>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: `rgba(37,99,235,0.08)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <Icon size={18} color={C.accent} />
            </div>
            <h3 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 17, fontWeight: 500, color: C.ink, marginBottom: 16, lineHeight: 1.3 }}>{title}</h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(item => (
                <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 13, color: C.ink3, lineHeight: 1.5 }}>
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

/* ─── AI Section (dark) ──────────────────────────────────────────── */
const AiSection = () => (
  <section id="ai" className="hp-section" style={{ background: C.dark, position: 'relative', overflow: 'hidden' }} dir="rtl">
    {/* SYC ai-band::before radial overlays */}
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 50% at 80% 20%, rgba(37,99,235,0.08), transparent 60%), radial-gradient(ellipse 50% 40% at 10% 90%, rgba(37,99,235,0.04), transparent 60%)', pointerEvents: 'none' }} />
    <div className="hp-container" style={{ position: 'relative' }}>
      <div className="eyebrow" style={{ marginBottom: 28, color: C.onDark2 }}>
        <span style={{ background: C.onDark2, display: 'inline-block', width: 22, height: 1, marginLeft: 10 }} />
        03 — المساعد AI
      </div>

      <div className="hp-2col-wide">
        <motion.div {...rv}>
          <h2 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(32px,3.4vw,50px)', fontWeight: 400, color: C.onDark, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 20 }}>
            موظف الاستقبال الذي لا ينام{' '}
            <span style={{ fontStyle: 'italic', color: C.gold }}> ولا يطلب علاوة.</span>
          </h2>
          <p style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 16, color: C.onDark2, lineHeight: 1.8, marginBottom: 32 }}>
            كل عميل يراسل عيادتك يحصل على رد فوري — في أقل من 12 ثانية، على واتساب، بالعربية. مدرّب على جدولك وأسعارك وبروتوكولاتك.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 36, paddingBottom: 36, borderBottom: `1px solid ${C.onDarkRule}` }}>
            {[
              { icon: Zap,      label: 'رد في 12 ثانية',       desc: 'العملاء الذين يحصلون على رد سريع يحجزون بنسبة 4× أعلى' },
              { icon: Calendar, label: 'حجز مباشر في الجدول', desc: 'يتحقق من التوافر ويؤكد الموعد بدون تدخل بشري' },
              { icon: Clock,    label: 'يعمل 24 ساعة',         desc: 'حتى في الإجازات والأعياد والأوقات خارج الدوام' },
              { icon: Phone,    label: 'يقلل المكالمات',       desc: '80% من الأسئلة تُحل عبر واتساب بدون مكالمة' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="hp-feature-item hp-feature-item-dark" style={{ display: 'flex', gap: 14 }}>
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
            <button className="btn btn-on-dark" onClick={() => wa('مرحباً، أريد رؤية مساعد الاستقبال AI بشكل عملي')}>شوف كيف يعمل ←</button>
            <button className="btn" style={{ background: 'transparent', border: `1px solid ${C.onDarkRule}`, color: C.onDark2 }}
              onClick={() => wa('مرحباً، أريد تجربة المساعد AI مباشرة')}>تجربة مباشرة</button>
          </div>
        </motion.div>

        <motion.div {...rv} transition={{ delay: 0.2 }} style={{ alignSelf: 'start' }}>
          {/* AI System Interface — professional dashboard mockup */}
          <div style={{ background: '#070F1E', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', fontFamily: '"IBM Plex Sans Arabic", sans-serif' }}>

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

/* ─── Process ────────────────────────────────────────────────────── */
const Process = () => (
  <section id="process" className="hp-section" style={{ background: C.paper }} dir="rtl">
    <div className="hp-container hp-divider" style={{ paddingTop: 72 }}>
      <div className="eyebrow" style={{ marginBottom: 28 }}>05 — العملية</div>
      <motion.h2 {...rv} style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(32px,3.4vw,50px)', fontWeight: 400, color: C.ink, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 64, maxWidth: 500 }}>
        ثلاثون يوماً إلى نظام{' '}
        <span className="hero-em">يعمل بالكامل.</span>
      </motion.h2>

      <div style={{ position: 'relative' }}>
        {/* Timeline connector line */}
        <div className="hp-timeline-connector" style={{ position: 'absolute', top: 0, right: 0, left: 0, height: 2, background: `linear-gradient(to left, ${C.rule}, ${C.brand} 50%, ${C.rule})`, opacity: 0.5, pointerEvents: 'none' }} />
        <div className="hp-4timeline">
          {[
            { w: '01', phase: 'التأسيس', dot: C.brand,  items: ['جلسة تعريفية كاملة', 'ربط واتساب Business', 'تدريب المساعد', 'إعداد نظام الحجز'] },
            { w: '02', phase: 'البناء',  dot: C.ink3,   items: ['تخصيص ردود AI', 'ربط جدول المواعيد', 'إعداد التذكيرات', 'اختبار شامل'] },
            { w: '03', phase: 'الإطلاق',dot: C.gold,   items: ['تشغيل مباشر', 'تدريب الفريق', 'مراقبة يومية', 'تعديل وتحسين'] },
            { w: '04+',phase: 'التحسين',dot: C.ink3,   items: ['تقارير أسبوعية', 'استراتيجية النمو', 'إضافة ميزات', 'دعم مستمر'] },
          ].map(({ w, phase, dot, items }) => (
            <motion.div key={w} {...rv} className="hp-timeline-step" style={{ paddingTop: 8, borderTop: `2px solid ${C.rule}`, position: 'relative' }}>
              <div className="hp-tl-dot" style={{ width: 10, height: 10, borderRadius: '50%', background: dot, position: 'absolute', top: -6, right: 0, border: `2px solid ${C.paper}` }} />
              <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: C.ink3, letterSpacing: '0.1em', marginBottom: 16, marginTop: 20 }}>
                WEEK {w} · {phase.toUpperCase()}
              </div>
              <h3 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 19, fontWeight: 500, color: C.ink, marginBottom: 14 }}>{phase}</h3>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
                {items.map(item => (
                  <li key={item} style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 13, color: C.ink3, lineHeight: 1.5 }}>{item}</li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
)

/* ─── Programs ───────────────────────────────────────────────────── */
const Programs = () => (
  <section id="programs" className="hp-section" style={{ background: C.paper2 }} dir="rtl">
    <div className="hp-container">
      <div className="eyebrow" style={{ marginBottom: 28 }}>06 — البرامج</div>
      <motion.h2 {...rv} style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(32px,3.4vw,50px)', fontWeight: 400, color: C.ink, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 48 }}>
        طريقتان للبدء.{' '}
        <span className="hero-em">وجهة واحدة.</span>
      </motion.h2>

      <div className="hp-2col">
        <motion.div {...rv} className="hp-card" style={{ background: C.paper, borderRadius: 10, padding: '36px 32px', border: `1px solid ${C.rule}` }}>
          <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: C.ink3, letterSpacing: '0.1em', marginBottom: 16 }}>مناسب لـ · عيادة جديدة أو مبتدئة</div>
          <h3 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 24, fontWeight: 500, color: C.ink, marginBottom: 12 }}>البداية الذكية</h3>
          <p style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 14, color: C.ink2, lineHeight: 1.75, marginBottom: 24 }}>
            نظام استقبال AI + إدارة مواعيد + لوحة تحكم — كل ما تحتاجه من أول أسبوع.
          </p>
          <div style={{ borderTop: `1px solid ${C.rule}`, paddingTop: 20, marginBottom: 28 }}>
            {['مساعد واتساب AI مخصص', 'جدول مواعيد رقمي', 'تذكيرات تلقائية للعملاء', 'لوحة تحكم أساسية', 'تدريب الفريق (ساعتان)', 'دعم شهر كامل'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', borderBottom: `1px solid ${C.rule}`, fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 13, color: C.ink2 }}>
                <Check size={12} color={C.brand} strokeWidth={2.5} />{f}
              </div>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => wa('مرحباً، أريد الاستفسار عن برنامج البداية الذكية لعيادتي')}>
            احجز جلسة اكتشاف ←
          </button>
        </motion.div>

        <motion.div {...rv} transition={{ delay: 0.12 }} className="hp-card hp-card-dark" style={{ background: C.dark, borderRadius: 10, padding: '36px 32px', borderTop: `4px solid ${C.gold}` }}>
          <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: C.gold, letterSpacing: '0.1em', marginBottom: 16 }}>مناسب لـ · عيادة تريد نمواً متسارعاً</div>
          <h3 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 24, fontWeight: 500, color: C.onDark, marginBottom: 12 }}>النمو الكامل</h3>
          <p style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 14, color: C.onDark2, lineHeight: 1.75, marginBottom: 24 }}>
            كل شيء في البداية الذكية + مساعد صوتي AI + تقارير متقدمة + استرداد العملاء الغائبين.
          </p>
          <div style={{ borderTop: `1px solid ${C.onDarkRule}`, paddingTop: 20, marginBottom: 28 }}>
            {['كل مزايا البداية الذكية', 'مساعد صوتي AI للمكالمات', 'تقارير تحليلية متقدمة', 'استرداد العملاء الغائبين', 'تكاملات خاصة بعيادتك', 'دعم أولوية + متابعة شهرية'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', borderBottom: `1px solid ${C.onDarkRule}`, fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 13, color: C.onDark2 }}>
                <Check size={12} color={C.gold} strokeWidth={2.5} />{f}
              </div>
            ))}
          </div>
          <button className="btn" style={{ background: C.brand, color: '#fff', borderColor: C.brand, width: '100%', justifyContent: 'center' }}
            onClick={() => wa('مرحباً، أريد الاستفسار عن برنامج النمو الكامل لعيادتي')}>
            احجز جلسة اكتشاف ←
          </button>
        </motion.div>
      </div>
    </div>
  </section>
)

/* ─── FAQ ────────────────────────────────────────────────────────── */
const faqs = [
  { q: 'هل أحتاج خبرة تقنية لتشغيل النظام؟', a: 'لا على الإطلاق. نحن نبني كل شيء ونشغّله. دورك هو متابعة التقارير واستقبال العملاء فقط.' },
  { q: 'كم يستغرق التفعيل؟', a: 'من التعاقد حتى التشغيل الكامل: 3 أسابيع في المتوسط. الأسبوع الأول إعداد، الثاني بناء، الثالث إطلاق.' },
  { q: 'هل يعمل مع نظام المواعيد الحالي في العيادة؟', a: 'نعم في معظم الحالات. نقيّم نظامك الحالي في أول جلسة ونحدد أفضل طريقة للربط.' },
  { q: 'ماذا يحدث لو العميل طلب شيئاً خارج قدرة المساعد؟', a: 'يحول المحادثة تلقائياً لموظف بشري مع ملخص كامل حتى لا يضطر العميل للتكرار.' },
  { q: 'هل يفهم اللهجة السعودية والخليجية؟', a: 'نعم — المساعد مدرّب خصيصاً على اللهجة الخليجية السعودية. يفهم "أبي أحجز" و"متى فراغكم" وغيرها.' },
  { q: 'ما هي آلية الدفع؟', a: 'رسوم شهرية ثابتة بدون عقود طويلة. تفاصيل الأسعار تُناقش في جلسة الاكتشاف بناءً على حجم عيادتك.' },
]

const FAQ = () => {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <section id="faq" className="hp-section" style={{ background: C.paper }} dir="rtl">
      <div className="hp-container-narrow hp-divider" style={{ paddingTop: 64 }}>
        <div className="eyebrow" style={{ marginBottom: 28 }}>08 — الأسئلة الشائعة</div>
        <motion.h2 {...rv} style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(22px,3vw,34px)', fontWeight: 400, color: C.ink, lineHeight: 1.35, marginBottom: 40 }}>
          أسئلة تخطر على بالك
        </motion.h2>
        {faqs.map((faq, i) => (
          <div key={i} style={{ borderBottom: `1px solid ${C.rule}` }}>
            <button onClick={() => setOpen(open === i ? null : i)}
              style={{ width: '100%', padding: '20px 0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, textAlign: 'right' }}>
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
const FinalCTA = () => (
  <section style={{ background: C.dark, padding: '110px 0 70px', textAlign: 'center', position: 'relative', overflow: 'hidden', isolation: 'isolate' }} dir="rtl">
    {/* SYC cta-final::before radial + ::after grain */}
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 40% at 50% 100%, rgba(37,99,235,0.14), transparent 65%), radial-gradient(ellipse 50% 40% at 90% 0%, rgba(37,99,235,0.06), transparent 60%)', pointerEvents: 'none' }} />
    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.025) 1px, transparent 0)', backgroundSize: '28px 28px', opacity: 0.5, pointerEvents: 'none' }} />
    <div className="hp-container-narrow" style={{ position: 'relative' }}>
      <div className="eyebrow" style={{ marginBottom: 24, color: C.onDark2, justifyContent: 'center' }}>ابدأ الآن</div>
      <motion.h2 {...rv} style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(32px,3.4vw,50px)', fontWeight: 400, color: C.onDark, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 18 }}>
        احجز محادثة 30 دقيقة{' '}
        <span style={{ fontStyle: 'italic', color: C.gold }}>تستحق وقتك.</span>
      </motion.h2>
      <motion.p {...rv} style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 17, color: C.onDark2, lineHeight: 1.8, marginBottom: 36 }}>
        نفهم وضع عيادتك الآن، ونعطيك خطة واضحة — بدون أي التزام.
      </motion.p>
      <button className="btn btn-on-dark" style={{ fontSize: 16, padding: '15px 30px' }}
        onClick={() => wa('مرحباً، أريد حجز جلسة تعريفية مجانية 30 دقيقة')}>
        <MessageCircle size={17} />
        احجز جلسة مجانية ←
      </button>
    </div>
  </section>
)

/* ─── Sticky Sidebar ─────────────────────────────────────────────── */
const StickyBar = () => {
  const [gone, setGone] = useState(false)
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
        احجز استشارة مجانية
      </span>
      <button className="hp-sticky-close" onClick={e => { e.stopPropagation(); setGone(true) }}>×</button>
    </motion.div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────── */
export const HomePage = () => (
  <>
    <GlobalCSS />
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
    <AiChatWidget route="clinic-landing" accentColor="#2563EB" productName="Madar" />
  </>
)
