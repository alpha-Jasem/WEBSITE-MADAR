import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, MessageCircle, Calendar, BarChart3, Clock, Phone, Bot, Zap, Menu, X } from 'lucide-react'
import { Footer } from '../components/public/Footer'

/* ─── Design tokens (exact from scale-your-clinic.com CSS) ──────── */
const PHONE = '966546666005'
const wa = (msg = 'مرحباً، أريد معرفة المزيد عن نظام الاستقبال الذكي لعيادتي') =>
  window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`, '_blank')

const C = {
  paper:     '#FBFAF7',
  paper2:    '#F4F1EA',
  paper3:    '#ECE7DB',
  ink:       '#0F1A15',
  ink2:      '#44524C',
  ink3:      '#5E6A64',
  rule:      '#E4DFD2',
  rule2:     '#D6CFBD',
  brand:     '#2BB573',
  accent:    '#0F3D2E',
  accent2:   '#1B6347',
  accentInk: '#07241B',
  gold:      '#BE9434',
  gold2:     '#8A6A22',
  goldTint:  '#F5EBC8',
  dark:      '#0A1B14',
  dark2:     '#0F261D',
  onDark:    '#EDE7D8',
  onDark2:   '#C2D0C7',
  onDarkRule:'#1F3329',
}

const rv = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.55 } }

/* ─── Global CSS ─────────────────────────────────────────────────── */
const GlobalCSS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Arabic:wght@300;400;500;700&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { font-size: 16px; }
    body { background: ${C.paper}; color: ${C.ink}; }

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
    .btn-ghost:hover { border-color: ${C.accent}; background: rgba(15,61,46,0.04); }
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
    .hp-section { padding: 88px 0; }
    .hp-section-sm { padding: 64px 0; }
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

    /* Sticky bar */
    .hp-sticky {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      z-index: 200;
      background: ${C.dark};
      border-radius: 99px;
      padding: 12px 16px 12px 22px;
      display: flex; align-items: center; gap: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.28);
      direction: rtl;
    }

    /* Mobile */
    @media (max-width: 900px) {
      .hp-nav-links { display: none !important; }
      .hp-hamburger { display: flex !important; }
      .hp-hero-grid { grid-template-columns: 1fr; gap: 0; }
      .hp-hero-phone { display: none; }
      .hp-2col { grid-template-columns: 1fr; }
      .hp-2col-wide { grid-template-columns: 1fr; gap: 36px; }
      .hp-4col { grid-template-columns: 1fr 1fr; }
      .hp-4timeline { grid-template-columns: 1fr 1fr; gap: 28px; }
      .hp-section { padding: 56px 0; }
      .hp-container { padding: 0 20px; }
      .hp-container-narrow { padding: 0 20px; }
      .hp-sticky {
        left: 0; right: 0; bottom: 0;
        transform: none;
        border-radius: 0;
        justify-content: space-between;
        padding: 14px 20px;
      }
    }
    @media (max-width: 480px) {
      .hp-4col { grid-template-columns: 1fr; }
      .hp-4timeline { grid-template-columns: 1fr; }
      .hp-sticky-text { display: none; }
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
          <div style={{ width: 34, height: 34, borderRadius: 8, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={17} color={C.paper} />
          </div>
          <span style={{ fontFamily: '"Noto Serif Arabic", serif', fontWeight: 500, fontSize: 18, color: C.accentInk, letterSpacing: '-0.01em' }}>مدار AI</span>
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
const Hero = () => (
  <section className="hp-section" style={{ background: C.paper, paddingTop: 130, position: 'relative', overflow: 'hidden' }} dir="rtl">
    {/* Background radial gradient — exact SYC pattern */}
    <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 60% 50% at 10% 10%, rgba(43,181,115,0.07), transparent 60%), radial-gradient(ellipse 50% 40% at 95% 80%, rgba(15,61,46,0.04), transparent 60%)`, pointerEvents: 'none' }} />

    <div className="hp-container" style={{ position: 'relative' }}>
      <div className="hp-hero-grid">
        <motion.div {...rv}>
          <div className="eyebrow" style={{ marginBottom: 24 }}>نظام الاستقبال الذكي</div>
          <h1 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(34px,5vw,60px)', fontWeight: 400, color: C.ink, lineHeight: 1.18, marginBottom: 22, letterSpacing: '-0.025em' }}>
            استقبال ذكي
            <br />
            <span className="hero-em">لعيادة الأسنان.</span>
          </h1>
          <p style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 18, color: C.ink2, lineHeight: 1.75, marginBottom: 34, maxWidth: 440 }}>
            نبني ونشغّل نظاماً يستقبل مرضاك على واتساب، يحجز المواعيد، ويُذكّرهم تلقائياً — بدون موظف استقبال إضافي.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 48 }}>
            <button className="btn btn-primary" style={{ fontSize: 16, padding: '15px 26px' }}
              onClick={() => wa('مرحباً، أريد حجز جلسة مجانية لمناقشة نظام الاستقبال الذكي لعيادتي')}>
              احجز جلسة مجانية 30 دقيقة ←
            </button>
            <button className="btn btn-ghost"
              onClick={() => document.querySelector('#method')?.scrollIntoView({ behavior: 'smooth' })}>
              كيف يعمل النظام
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 40, paddingTop: 28, borderTop: `1px solid ${C.rule}` }}>
            {[{ n: '24/7', label: 'استقبال مستمر' }, { n: '<12ث', label: 'سرعة الرد' }, { n: '80%', label: 'تقليل المكالمات الفائتة' }].map(s => (
              <div key={s.n}>
                <div style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 26, fontWeight: 500, color: C.ink, lineHeight: 1 }}>{s.n}</div>
                <div style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 12, color: C.ink3, marginTop: 5 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Phone mockup */}
        <motion.div {...rv} transition={{ delay: 0.15 }} className="hp-hero-phone">
          <div style={{ position: 'relative', width: 310 }}>
            <div style={{ background: '#fff', borderRadius: 24, boxShadow: `0 24px 64px rgba(10,27,20,0.14), 0 2px 8px rgba(10,27,20,0.08)`, overflow: 'hidden', border: `1.5px solid ${C.rule}` }}>
              <div style={{ background: '#075E54', padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={15} color={C.paper} />
                </div>
                <div>
                  <div style={{ color: '#fff', fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontWeight: 600, fontSize: 12 }}>مساعد عيادة د. أحمد</div>
                  <div style={{ color: '#A8D5A2', fontSize: 10, fontFamily: '"IBM Plex Sans Arabic", sans-serif' }}>● متصل الآن</div>
                </div>
              </div>
              <div style={{ background: '#ECE5DD', padding: '10px 9px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[
                  { from: 'user', text: 'أبي أحجز موعد تنظيف أسنان' },
                  { from: 'ai',   text: 'أهلاً! 😊 متى يناسبك؟ عندنا الثلاثاء والأربعاء.' },
                  { from: 'user', text: 'الأربعاء عصراً' },
                  { from: 'ai',   text: 'ممتاز ✅ عندي 4:30م. اسمك ورقم جوالك؟' },
                  { from: 'user', text: 'سارة — 0551234567' },
                  { from: 'ai',   text: 'تم الحجز يا سارة 🎉 ستصلك رسالة تذكير.' },
                ].map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-start' : 'flex-end' }}>
                    <div style={{ background: m.from === 'user' ? '#fff' : '#DCF8C6', padding: '6px 10px', borderRadius: 8, maxWidth: 200, fontSize: 11, fontFamily: '"IBM Plex Sans Arabic", sans-serif', color: '#1a1a1a', lineHeight: 1.5 }}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Floating stat card */}
            <div style={{ position: 'absolute', top: -18, left: -48, background: '#fff', borderRadius: 10, padding: '11px 15px', boxShadow: `0 6px 24px rgba(10,27,20,0.12)`, border: `1px solid ${C.rule}`, fontFamily: '"IBM Plex Sans Arabic", sans-serif', minWidth: 130 }}>
              <div style={{ color: C.ink3, fontSize: 10, marginBottom: 3 }}>اليوم</div>
              <div style={{ fontFamily: '"Noto Serif Arabic", serif', fontWeight: 600, fontSize: 22, color: C.ink }}>14</div>
              <div style={{ color: C.accent2, fontWeight: 600, fontSize: 12 }}>موعد محجوز</div>
            </div>
            <div style={{ position: 'absolute', bottom: 48, right: -48, background: C.accent, borderRadius: 10, padding: '11px 15px', boxShadow: `0 6px 24px rgba(10,27,20,0.18)`, fontFamily: '"IBM Plex Sans Arabic", sans-serif', minWidth: 140 }}>
              <div style={{ color: C.onDark2, fontSize: 10, marginBottom: 3 }}>مكالمات فائتة</div>
              <div style={{ fontFamily: '"Noto Serif Arabic", serif', fontWeight: 600, fontSize: 22, color: C.onDark }}>0</div>
              <div style={{ color: C.brand, fontWeight: 600, fontSize: 11 }}>كل شيء تحت السيطرة ✓</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
)

/* ─── Results ────────────────────────────────────────────────────── */
const Results = () => (
  <section className="hp-section" style={{ background: C.paper }} dir="rtl">
    <div className="hp-container hp-divider" style={{ paddingTop: 72 }}>
      <div className="eyebrow" style={{ marginBottom: 28 }}>01 — النتائج</div>
      <div className="hp-2col-wide">
        <motion.div {...rv}>
          <h2 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(24px,3vw,38px)', fontWeight: 400, color: C.ink, lineHeight: 1.3, marginBottom: 18 }}>
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
      <motion.h2 {...rv} style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(26px,3.5vw,44px)', fontWeight: 400, color: C.ink, lineHeight: 1.25, marginBottom: 56, maxWidth: 520 }}>
        أربعة أنظمة،{' '}
        <span className="hero-em">عيادة واحدة.</span>
      </motion.h2>

      <div className="hp-4col" style={{ borderTop: `1px solid ${C.rule}` }}>
        {[
          { icon: Bot,       n: '01', title: 'مساعد الاستقبال AI',  items: ['يرد في أقل من 12 ثانية', 'يفهم اللهجة السعودية', 'يعمل 24 ساعة 7 أيام', 'بدون تدخل موظف'] },
          { icon: Calendar,  n: '02', title: 'الحجز الذكي',         items: ['يحجز مباشرة في الجدول', 'يتحقق من التوافر فوراً', 'يرسل تأكيد تلقائي', 'يتصل بنظام المواعيد'] },
          { icon: Clock,     n: '03', title: 'متابعة المرضى',       items: ['تذكير قبل 24 و2 ساعة', 'استرداد الغائبين', 'متابعة بعد الزيارة', 'رسائل مخصصة'] },
          { icon: BarChart3, n: '04', title: 'التقارير والتحليل',   items: ['تقارير يومية أوتوماتيكية', 'مؤشرات الأداء', 'مصادر المرضى', 'معدل إلغاء المواعيد'] },
        ].map(({ icon: Icon, n, title, items }, idx) => (
          <motion.div key={n} {...rv} transition={{ delay: idx * 0.08 }}
            style={{ padding: '32px 24px', borderRight: `1px solid ${C.rule}` }}>
            <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: C.ink3, letterSpacing: '0.1em', marginBottom: 20 }}>{n}</div>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: `rgba(15,61,46,0.08)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
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
  <section id="ai" className="hp-section" style={{ background: C.dark }} dir="rtl">
    <div className="hp-container">
      <div className="eyebrow" style={{ marginBottom: 28, color: C.onDark2 }}>
        <span style={{ background: C.onDark2, display: 'inline-block', width: 22, height: 1, marginLeft: 10 }} />
        03 — المساعد AI
      </div>

      <div className="hp-2col-wide">
        <motion.div {...rv}>
          <h2 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(26px,3.5vw,44px)', fontWeight: 400, color: C.onDark, lineHeight: 1.25, marginBottom: 20 }}>
            موظف الاستقبال الذي لا ينام{' '}
            <span style={{ fontStyle: 'italic', color: C.gold }}> ولا يطلب علاوة.</span>
          </h2>
          <p style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 16, color: C.onDark2, lineHeight: 1.8, marginBottom: 32 }}>
            كل مريض يراسل عيادتك يحصل على رد فوري — في أقل من 12 ثانية، على واتساب، بالعربية. مدرّب على جدولك وأسعارك وبروتوكولاتك.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 36, paddingBottom: 36, borderBottom: `1px solid ${C.onDarkRule}` }}>
            {[
              { icon: Zap,      label: 'رد في 12 ثانية',       desc: 'المرضى الذين يحصلون على رد سريع يحجزون بنسبة 4× أعلى' },
              { icon: Calendar, label: 'حجز مباشر في الجدول', desc: 'يتحقق من التوافر ويؤكد الموعد بدون تدخل بشري' },
              { icon: Clock,    label: 'يعمل 24 ساعة',         desc: 'حتى في الإجازات والأعياد والأوقات خارج الدوام' },
              { icon: Phone,    label: 'يقلل المكالمات',       desc: '80% من الأسئلة تُحل عبر واتساب بدون مكالمة' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} style={{ display: 'flex', gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `rgba(190,148,52,0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={15} color={C.gold} />
                </div>
                <div>
                  <div style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontWeight: 600, fontSize: 14, color: C.onDark, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 13, color: C.onDark2, lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-on-dark" onClick={() => wa('مرحباً، أريد رؤية مساعد الاستقبال AI بشكل عملي')}>شوف كيف يعمل ←</button>
            <button className="btn" style={{ background: 'transparent', border: `1px solid ${C.onDarkRule}`, color: C.onDark2 }}
              onClick={() => wa('مرحباً، أريد تجربة المساعد AI مباشرة')}>تجربة مباشرة</button>
          </div>
        </motion.div>

        <motion.div {...rv} transition={{ delay: 0.2 }}>
          <div style={{ background: C.dark2, borderRadius: 16, padding: 20, border: `1px solid ${C.onDarkRule}` }}>
            <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ background: '#075E54', padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={13} color={C.paper} />
                </div>
                <div>
                  <div style={{ color: '#fff', fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontWeight: 600, fontSize: 12 }}>مساعد عيادة د. أحمد</div>
                  <div style={{ color: '#A8D5A2', fontSize: 9 }}>● يرد خلال ثوانٍ</div>
                </div>
              </div>
              <div style={{ background: '#ECE5DD', padding: '10px 9px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { from: 'user', text: 'وش أسعار تبييض الأسنان؟' },
                  { from: 'ai',   text: 'أهلاً! 😊 التبييض بالليزر من 800 ريال. فيه استشارة مجانية. تبي أحجز؟' },
                  { from: 'user', text: 'إيه كويس' },
                  { from: 'ai',   text: 'عندي الأحد 4:30م. يناسبك؟ ✅' },
                ].map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-start' : 'flex-end' }}>
                    <div style={{ background: m.from === 'user' ? '#fff' : '#DCF8C6', padding: '6px 9px', borderRadius: 8, maxWidth: 200, fontSize: 11, fontFamily: '"IBM Plex Sans Arabic", sans-serif', color: '#1a1a1a', lineHeight: 1.5 }}>
                      {m.text}
                    </div>
                  </div>
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
      <motion.h2 {...rv} style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(24px,3.5vw,44px)', fontWeight: 400, color: C.ink, lineHeight: 1.3, marginBottom: 64, maxWidth: 500 }}>
        ثلاثون يوماً إلى نظام{' '}
        <span className="hero-em">يعمل بالكامل.</span>
      </motion.h2>

      <div style={{ position: 'relative' }}>
        <div className="hp-4timeline">
          {[
            { w: '01', phase: 'التأسيس', dot: C.accent,  items: ['جلسة تعريفية كاملة', 'ربط واتساب Business', 'تدريب المساعد', 'إعداد نظام الحجز'] },
            { w: '02', phase: 'البناء',  dot: C.ink3,   items: ['تخصيص ردود AI', 'ربط جدول المواعيد', 'إعداد التذكيرات', 'اختبار شامل'] },
            { w: '03', phase: 'الإطلاق',dot: C.gold,   items: ['تشغيل مباشر', 'تدريب الفريق', 'مراقبة يومية', 'تعديل وتحسين'] },
            { w: '04+',phase: 'التحسين',dot: C.ink3,   items: ['تقارير أسبوعية', 'استراتيجية النمو', 'إضافة ميزات', 'دعم مستمر'] },
          ].map(({ w, phase, dot, items }) => (
            <motion.div key={w} {...rv} style={{ paddingTop: 8, borderTop: `2px solid ${C.rule}`, position: 'relative' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: dot, position: 'absolute', top: -6, right: 0, border: `2px solid ${C.paper}` }} />
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
      <motion.h2 {...rv} style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(24px,3.5vw,44px)', fontWeight: 400, color: C.ink, lineHeight: 1.3, marginBottom: 48 }}>
        طريقتان للبدء.{' '}
        <span className="hero-em">وجهة واحدة.</span>
      </motion.h2>

      <div className="hp-2col">
        <motion.div {...rv} style={{ background: C.paper, borderRadius: 10, padding: '36px 32px', border: `1px solid ${C.rule}` }}>
          <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: C.ink3, letterSpacing: '0.1em', marginBottom: 16 }}>مناسب لـ · عيادة جديدة أو مبتدئة</div>
          <h3 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 24, fontWeight: 500, color: C.ink, marginBottom: 12 }}>البداية الذكية</h3>
          <p style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 14, color: C.ink2, lineHeight: 1.75, marginBottom: 24 }}>
            نظام استقبال AI + إدارة مواعيد + لوحة تحكم — كل ما تحتاجه من أول أسبوع.
          </p>
          <div style={{ borderTop: `1px solid ${C.rule}`, paddingTop: 20, marginBottom: 28 }}>
            {['مساعد واتساب AI مخصص', 'جدول مواعيد رقمي', 'تذكيرات تلقائية للمرضى', 'لوحة تحكم أساسية', 'تدريب الفريق (ساعتان)', 'دعم شهر كامل'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', borderBottom: `1px solid ${C.rule}`, fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 13, color: C.ink2 }}>
                <Check size={12} color={C.brand} strokeWidth={2.5} />{f}
              </div>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => wa('مرحباً، أريد الاستفسار عن برنامج البداية الذكية لعيادتي')}>
            احجز جلسة اكتشاف ←
          </button>
        </motion.div>

        <motion.div {...rv} transition={{ delay: 0.12 }} style={{ background: C.dark, borderRadius: 10, padding: '36px 32px' }}>
          <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: C.gold, letterSpacing: '0.1em', marginBottom: 16 }}>مناسب لـ · عيادة تريد نمواً متسارعاً</div>
          <h3 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 24, fontWeight: 500, color: C.onDark, marginBottom: 12 }}>النمو الكامل</h3>
          <p style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 14, color: C.onDark2, lineHeight: 1.75, marginBottom: 24 }}>
            كل شيء في البداية الذكية + مساعد صوتي AI + تقارير متقدمة + استرداد المرضى الغائبين.
          </p>
          <div style={{ borderTop: `1px solid ${C.onDarkRule}`, paddingTop: 20, marginBottom: 28 }}>
            {['كل مزايا البداية الذكية', 'مساعد صوتي AI للمكالمات', 'تقارير تحليلية متقدمة', 'استرداد المرضى الغائبين', 'تكاملات خاصة بعيادتك', 'دعم أولوية + متابعة شهرية'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', borderBottom: `1px solid ${C.onDarkRule}`, fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 13, color: C.onDark2 }}>
                <Check size={12} color={C.gold} strokeWidth={2.5} />{f}
              </div>
            ))}
          </div>
          <button className="btn btn-gold" onClick={() => wa('مرحباً، أريد الاستفسار عن برنامج النمو الكامل لعيادتي')}>
            احجز جلسة اكتشاف ←
          </button>
        </motion.div>
      </div>
    </div>
  </section>
)

/* ─── FAQ ────────────────────────────────────────────────────────── */
const faqs = [
  { q: 'هل أحتاج خبرة تقنية لتشغيل النظام؟', a: 'لا على الإطلاق. نحن نبني كل شيء ونشغّله. دورك هو متابعة التقارير واستقبال المرضى فقط.' },
  { q: 'كم يستغرق التفعيل؟', a: 'من التعاقد حتى التشغيل الكامل: 3 أسابيع في المتوسط. الأسبوع الأول إعداد، الثاني بناء، الثالث إطلاق.' },
  { q: 'هل يعمل مع نظام المواعيد الحالي في العيادة؟', a: 'نعم في معظم الحالات. نقيّم نظامك الحالي في أول جلسة ونحدد أفضل طريقة للربط.' },
  { q: 'ماذا يحدث لو المريض طلب شيئاً خارج قدرة المساعد؟', a: 'يحول المحادثة تلقائياً لموظف بشري مع ملخص كامل حتى لا يضطر المريض للتكرار.' },
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
  <section style={{ background: C.dark, padding: '88px 0', textAlign: 'center' }} dir="rtl">
    <div className="hp-container-narrow">
      <div className="eyebrow" style={{ marginBottom: 24, color: C.onDark2, justifyContent: 'center' }}>ابدأ الآن</div>
      <motion.h2 {...rv} style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(26px,4vw,48px)', fontWeight: 400, color: C.onDark, lineHeight: 1.25, marginBottom: 18 }}>
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

/* ─── Sticky Bar ─────────────────────────────────────────────────── */
const StickyBar = () => {
  const [gone, setGone] = useState(false)
  if (gone) return null
  return (
    <motion.div className="hp-sticky" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 2.5, duration: 0.45 }}>
      <span className="hp-sticky-text" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.brand, flexShrink: 0 }} />
        <span style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 13, color: C.onDark2, fontWeight: 500, whiteSpace: 'nowrap' }}>
          جاهز تبدأ؟ احجز جلسة استراتيجية مجانية.
        </span>
      </span>
      <button className="btn btn-gold" style={{ padding: '9px 18px', fontSize: 13, borderRadius: 99 }}
        onClick={() => wa('مرحباً، أريد حجز جلسة استراتيجية')}>
        احجز الآن ←
      </button>
      <button onClick={() => setGone(true)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.onDark2, fontSize: 18, lineHeight: 1, padding: '0 4px', opacity: 0.5 }}>
        ×
      </button>
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
      <Results />
      <Method />
      <AiSection />
      <Process />
      <Programs />
      <FAQ />
      <FinalCTA />
    </main>
    <Footer />
    <StickyBar />
  </>
)
