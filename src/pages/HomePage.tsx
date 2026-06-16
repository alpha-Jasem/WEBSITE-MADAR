import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, MessageCircle, Calendar, BarChart3, Clock, Phone, Bot, Zap, Menu, X } from 'lucide-react'
import { Footer } from '../components/public/Footer'

/* ─── Constants ──────────────────────────────────────────────────── */
const PHONE = '966546666005'
const wa = (msg = 'مرحباً، أريد معرفة المزيد عن نظام الاستقبال الذكي لعيادتي') =>
  window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`, '_blank')

const CREAM = '#F5F1E7'
const DARK  = '#0D2416'
const FOREST = '#1B4332'
const GOLD  = '#B5820F'
const MUTED = '#6B7F6E'

const rv = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.6 } }

/* ─── Global CSS ─────────────────────────────────────────────────── */
const GlobalCSS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Arabic:wght@400;600;700&family=Tajawal:wght@400;500;700;900&display=swap');
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; background: ${CREAM}; }

    /* grids */
    .hp-hero      { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; }
    .hp-2col      { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: start; }
    .hp-4col      { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; }
    .hp-4timeline { display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; }

    /* nav */
    .hp-nav-links { display: flex; gap: 28px; align-items: center; }
    .hp-hamburger { display: none; }
    .hp-hero-phone { display: flex; justify-content: center; }
    .hp-float     { display: block; }

    @media (max-width: 900px) {
      .hp-hero      { grid-template-columns: 1fr; gap: 32px; }
      .hp-hero-phone { display: none; }
      .hp-2col      { grid-template-columns: 1fr; gap: 32px; }
      .hp-4col      { grid-template-columns: 1fr 1fr; }
      .hp-4timeline { grid-template-columns: 1fr 1fr; gap: 24px; }
      .hp-nav-links { display: none; }
      .hp-hamburger { display: flex; }
      .hp-hero-stats { gap: 24px !important; }
      .hp-section   { padding-top: 56px !important; padding-bottom: 56px !important; }
      .hp-section-inner { padding-top: 48px !important; }
    }

    @media (max-width: 480px) {
      .hp-4col      { grid-template-columns: 1fr; }
      .hp-4timeline { grid-template-columns: 1fr; }
      .hp-sticky-text { display: none !important; }
    }

    @media (max-width: 900px) {
      .hp-sticky-bar {
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        transform: none !important;
        border-radius: 0 !important;
        justify-content: center !important;
        padding: 12px 16px !important;
        gap: 10px !important;
      }
    }
  `}</style>
)

/* ─── Section Label ──────────────────────────────────────────────── */
const Label = ({ n, title }: { n: string; title: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36, direction: 'rtl' }}>
    <div style={{ width: 28, height: 1, background: GOLD }} />
    <span style={{ fontSize: 11, fontFamily: 'Tajawal, sans-serif', fontWeight: 700, letterSpacing: '0.12em', color: MUTED, textTransform: 'uppercase' }}>
      {n} — {title}
    </span>
    <div style={{ width: 28, height: 1, background: GOLD }} />
  </div>
)

/* ─── CTA Button ─────────────────────────────────────────────────── */
const BookBtn = ({
  label = 'احجز مكالمة مجانية ←',
  msg,
  dark = true,
  large = false,
  gold = false,
}: {
  label?: string; msg?: string; dark?: boolean; large?: boolean; gold?: boolean
}) => (
  <motion.button
    whileHover={{ opacity: 0.88 }}
    whileTap={{ scale: 0.97 }}
    onClick={() => wa(msg)}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
      padding: large ? '15px 32px' : '12px 24px',
      borderRadius: 8,
      background: gold ? GOLD : dark ? FOREST : CREAM,
      color: dark || gold ? '#fff' : DARK,
      border: dark || gold ? 'none' : `2px solid ${DARK}`,
      fontFamily: 'Tajawal, sans-serif', fontWeight: 700,
      fontSize: large ? 16 : 14,
      letterSpacing: '-0.01em', whiteSpace: 'nowrap',
    }}
  >
    {label}
  </motion.button>
)

/* ─── Navbar ─────────────────────────────────────────────────────── */
const Navbar = () => {
  const [open, setOpen] = useState(false)
  const links = [
    { label: 'المنهجية',    href: '#method' },
    { label: 'المساعد AI', href: '#ai' },
    { label: 'العملية',    href: '#process' },
    { label: 'البرامج',    href: '#programs' },
    { label: 'الأسئلة',   href: '#faq' },
  ]
  const go = (href: string) => {
    setOpen(false)
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
  }
  return (
    <header dir="rtl" style={{ position: 'fixed', top: 0, right: 0, left: 0, zIndex: 100, background: CREAM, borderBottom: `1px solid ${DARK}15` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: FOREST, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bot size={16} color="#fff" />
          </div>
          <span style={{ fontFamily: 'Tajawal, sans-serif', fontWeight: 900, fontSize: 16, color: DARK, letterSpacing: '-0.02em' }}>مدار AI</span>
        </div>

        {/* Desktop links */}
        <nav className="hp-nav-links">
          {links.map(l => (
            <button key={l.href} onClick={() => go(l.href)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontSize: 14, color: DARK, fontWeight: 500, opacity: 0.7, padding: '4px 0' }}>
              {l.label}
            </button>
          ))}
        </nav>

        {/* Right side: CTA + hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BookBtn label="احجز مكالمة ←" />
          <button className="hp-hamburger" onClick={() => setOpen(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: DARK }}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.nav dir="rtl" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            style={{ background: CREAM, borderTop: `1px solid ${DARK}12`, padding: '12px 20px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {links.map(l => (
              <button key={l.href} onClick={() => go(l.href)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontSize: 16, color: DARK, textAlign: 'right', padding: '10px 0', borderBottom: `1px solid ${DARK}08` }}>
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
  <section className="hp-section" style={{ background: CREAM, paddingTop: 110, paddingBottom: 72, direction: 'rtl' }}>
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>

      {/* Badge */}
      <motion.div {...rv} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28, background: `${FOREST}12`, border: `1px solid ${FOREST}28`, borderRadius: 99, padding: '5px 14px' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontFamily: 'Tajawal, sans-serif', fontWeight: 700, color: FOREST, letterSpacing: '0.06em' }}>
          عيادات الأسنان · السعودية
        </span>
      </motion.div>

      <div className="hp-hero">
        {/* Text */}
        <motion.div {...rv}>
          <h1 style={{ fontFamily: '"Noto Serif Arabic", Georgia, serif', fontSize: 'clamp(32px, 5vw, 58px)', fontWeight: 700, color: DARK, lineHeight: 1.22, margin: '0 0 20px', letterSpacing: '-0.02em' }}>
            نظام الاستقبال الذكي
            <br />
            <span style={{ color: FOREST, fontStyle: 'italic' }}>لعيادة الأسنان.</span>
          </h1>
          <p style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 17, color: DARK, opacity: 0.65, lineHeight: 1.8, margin: '0 0 32px', maxWidth: 460 }}>
            نبني ونشغّل نظاماً يستقبل مرضاك على واتساب، يحجز المواعيد، ويُذكّرهم تلقائياً — بدون موظف استقبال إضافي.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <BookBtn large label="احجز جلسة مجانية 30 دقيقة ←" msg="مرحباً، أريد حجز جلسة مجانية لمناقشة نظام الاستقبال الذكي لعيادتي" />
            <button onClick={() => document.querySelector('#method')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontSize: 14, color: DARK, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>
              كيف يعمل النظام
            </button>
          </div>

          {/* Stats */}
          <div className="hp-hero-stats" style={{ display: 'flex', gap: 36, marginTop: 44, paddingTop: 28, borderTop: `1px solid ${DARK}15` }}>
            {[{ n: '24/7', label: 'استقبال مستمر' }, { n: '<12ث', label: 'سرعة الرد' }, { n: '80%', label: 'تقليل المكالمات الفائتة' }].map(s => (
              <div key={s.n}>
                <div style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 24, fontWeight: 700, color: DARK, lineHeight: 1 }}>{s.n}</div>
                <div style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 12, color: MUTED, marginTop: 5 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Phone mockup — hidden on mobile via CSS */}
        <motion.div {...rv} transition={{ delay: 0.15 }} className="hp-hero-phone">
          <div style={{ position: 'relative', width: 300 }}>
            <div style={{ background: '#fff', borderRadius: 26, boxShadow: '0 28px 72px rgba(13,36,22,0.18)', overflow: 'hidden', border: `7px solid ${DARK}` }}>
              <div style={{ background: '#075E54', padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: FOREST, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={15} color="#fff" />
                </div>
                <div>
                  <div style={{ color: '#fff', fontFamily: 'Tajawal, sans-serif', fontWeight: 700, fontSize: 12 }}>مساعد عيادة د. أحمد</div>
                  <div style={{ color: '#A8D5A2', fontSize: 10, fontFamily: 'Tajawal, sans-serif' }}>● متصل الآن</div>
                </div>
              </div>
              <div style={{ background: '#ECE5DD', padding: '10px 9px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[
                  { from: 'user', text: 'أبي أحجز موعد تنظيف أسنان' },
                  { from: 'ai', text: 'أهلاً! 😊 متى يناسبك؟ عندنا الثلاثاء والأربعاء.' },
                  { from: 'user', text: 'الأربعاء عصراً' },
                  { from: 'ai', text: 'ممتاز ✅ عندي 4:30م. اسمك ورقم جوالك؟' },
                  { from: 'user', text: 'سارة — 0551234567' },
                  { from: 'ai', text: 'تم الحجز يا سارة 🎉 ستصلك رسالة تذكير.' },
                ].map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-start' : 'flex-end' }}>
                    <div style={{ background: m.from === 'user' ? '#fff' : '#DCF8C6', padding: '6px 9px', borderRadius: 10, maxWidth: 195, fontSize: 11, fontFamily: 'Tajawal, sans-serif', color: '#2C3E2D', lineHeight: 1.5 }}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Floating cards */}
            <div style={{ position: 'absolute', top: -16, left: -44, background: '#fff', borderRadius: 12, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: 11, fontFamily: 'Tajawal, sans-serif', minWidth: 120 }}>
              <div style={{ color: MUTED, fontSize: 10, marginBottom: 3 }}>اليوم</div>
              <div style={{ fontWeight: 900, fontSize: 20, color: DARK }}>14</div>
              <div style={{ color: FOREST, fontWeight: 600, fontSize: 12 }}>موعد محجوز</div>
            </div>
            <div style={{ position: 'absolute', bottom: 50, right: -44, background: FOREST, borderRadius: 12, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', fontSize: 11, fontFamily: 'Tajawal, sans-serif', minWidth: 130 }}>
              <div style={{ color: '#A8D5A2', fontSize: 10, marginBottom: 3 }}>مكالمات فائتة</div>
              <div style={{ fontWeight: 900, fontSize: 20, color: '#fff' }}>0</div>
              <div style={{ color: '#A8D5A2', fontWeight: 600, fontSize: 11 }}>كل شيء تحت السيطرة ✓</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
)

/* ─── Results ────────────────────────────────────────────────────── */
const Results = () => (
  <section className="hp-section" style={{ background: CREAM, paddingBottom: 72, direction: 'rtl' }}>
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
      <div className="hp-section-inner" style={{ borderTop: `1px solid ${DARK}15`, paddingTop: 64 }}>
        <Label n="01" title="النتائج" />
        <div className="hp-2col">
          <motion.div {...rv}>
            <h2 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(24px,3.2vw,38px)', fontWeight: 700, color: DARK, lineHeight: 1.3, margin: '0 0 18px' }}>
              ماذا يحصل عملاؤنا في أول 30 يوم؟
            </h2>
            <p style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 15, color: DARK, opacity: 0.65, lineHeight: 1.8, margin: '0 0 24px' }}>
              جلسة تعريفية لفهم وضع عيادتك — أفضل الحالات، أسوأ الحالات، وبالضبط ما الذي يمنع نموك. نشرح لك كيف نبني النظام كاملاً ونشغّله.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 9 }}>
              {['أرقام حقيقية من عيادات مشابهة', 'خطة مخصصة لعيادتك', 'ما الذي يجعل النتائج ممكنة'].map(item => (
                <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 9, fontFamily: 'Tajawal, sans-serif', fontSize: 14, color: DARK }}>
                  <Check size={13} color={FOREST} strokeWidth={2.5} />{item}
                </li>
              ))}
            </ul>
            <BookBtn msg="مرحباً، أريد حجز جلسة استراتيجية مجانية لعيادتي" />
          </motion.div>

          <motion.div {...rv} transition={{ delay: 0.15 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { metric: '+40%', label: 'زيادة في المواعيد المحجوزة', sub: 'متوسط أول 60 يوم' },
                { metric: '0', label: 'مكالمات فائتة خارج الدوام', sub: 'المساعد AI يعمل 24/7' },
                { metric: '3 أسابيع', label: 'للإطلاق الكامل', sub: 'من التعاقد حتى التشغيل' },
              ].map(({ metric, label, sub }) => (
                <div key={metric} style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', border: `1px solid ${DARK}10` }}>
                  <div style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 28, fontWeight: 700, color: FOREST, lineHeight: 1 }}>{metric}</div>
                  <div style={{ fontFamily: 'Tajawal, sans-serif', fontWeight: 700, fontSize: 14, color: DARK, margin: '5px 0 3px' }}>{label}</div>
                  <div style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 12, color: MUTED }}>{sub}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  </section>
)

/* ─── Method ─────────────────────────────────────────────────────── */
const Method = () => (
  <section id="method" className="hp-section" style={{ background: CREAM, paddingTop: 72, paddingBottom: 72, direction: 'rtl' }}>
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
      <div className="hp-section-inner" style={{ borderTop: `1px solid ${DARK}15`, paddingTop: 64 }}>
        <Label n="02" title="المنهجية" />
        <motion.h2 {...rv} style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(26px,3.8vw,46px)', fontWeight: 700, color: DARK, lineHeight: 1.25, margin: '0 0 52px', maxWidth: 520 }}>
          أربعة أنظمة،{' '}
          <span style={{ color: FOREST, fontStyle: 'italic' }}>عيادة واحدة.</span>
        </motion.h2>

        <div className="hp-4col">
          {[
            { icon: Bot,       num: '01', title: 'مساعد الاستقبال AI',   items: ['يرد في أقل من 12 ثانية', 'يفهم اللهجة السعودية', 'يعمل 24 ساعة 7 أيام', 'بدون تدخل موظف'] },
            { icon: Calendar,  num: '02', title: 'الحجز الذكي',          items: ['يحجز مباشرة في الجدول', 'يتحقق من التوافر فوراً', 'يرسل تأكيد تلقائي', 'يتصل بنظام المواعيد'] },
            { icon: Clock,     num: '03', title: 'متابعة المرضى',        items: ['تذكير قبل 24 و2 ساعة', 'استرداد المرضى الغائبين', 'متابعة ما بعد الزيارة', 'رسائل مخصصة'] },
            { icon: BarChart3, num: '04', title: 'التقارير والتحليل',    items: ['تقارير يومية أوتوماتيكية', 'مؤشرات الأداء الرئيسية', 'مصادر المرضى الجدد', 'معدل إلغاء المواعيد'] },
          ].map(({ icon: Icon, num, title, items }, idx) => (
            <motion.div key={num} {...rv} transition={{ delay: idx * 0.07 }}
              style={{ padding: '28px 22px', borderRight: `1px solid ${DARK}10` }}>
              <div style={{ fontSize: 10, fontFamily: 'Tajawal, sans-serif', color: MUTED, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 16 }}>{num}</div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${FOREST}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Icon size={18} color={FOREST} />
              </div>
              <h3 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 17, fontWeight: 700, color: DARK, margin: '0 0 16px', lineHeight: 1.3 }}>{title}</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(item => (
                  <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontFamily: 'Tajawal, sans-serif', fontSize: 13, color: DARK, opacity: 0.68, lineHeight: 1.45 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: GOLD, marginTop: 6, flexShrink: 0 }} />{item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
)

/* ─── AI (dark section) ──────────────────────────────────────────── */
const AiSection = () => (
  <section id="ai" className="hp-section" style={{ background: DARK, paddingTop: 80, paddingBottom: 80, direction: 'rtl' }}>
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
        <div style={{ width: 24, height: 1, background: GOLD }} />
        <span style={{ fontSize: 11, fontFamily: 'Tajawal, sans-serif', fontWeight: 700, letterSpacing: '0.12em', color: GOLD }}>03 — المساعد AI</span>
        <div style={{ width: 24, height: 1, background: GOLD }} />
      </div>

      <div className="hp-2col" style={{ gap: 56, alignItems: 'center' }}>
        <motion.div {...rv}>
          <h2 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(26px,3.5vw,44px)', fontWeight: 700, color: '#fff', lineHeight: 1.25, margin: '0 0 20px' }}>
            موظف الاستقبال الذي لا ينام{' '}
            <span style={{ color: GOLD, fontStyle: 'italic' }}>ولا يطلب علاوة.</span>
          </h2>
          <p style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, margin: '0 0 32px' }}>
            كل مريض يراسل عيادتك يحصل على رد فوري — في أقل من 12 ثانية، على واتساب، بالعربية. مدرّب على جدولك وأسعارك وبروتوكولاتك.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 36 }}>
            {[
              { icon: Zap,      label: 'رد في 12 ثانية',         desc: 'المرضى الذين يحصلون على رد سريع يحجزون بنسبة 4× أعلى' },
              { icon: Calendar, label: 'حجز مباشر في الجدول',   desc: 'يتحقق من التوافر ويؤكد الموعد بدون تدخل بشري' },
              { icon: Clock,    label: 'يعمل 24 ساعة',           desc: 'حتى في الإجازات والأعياد والأوقات خارج الدوام' },
              { icon: Phone,    label: 'يقلل المكالمات',         desc: '80% من الأسئلة تُحل عبر واتساب بدون مكالمة' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: `${GOLD}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={15} color={GOLD} />
                </div>
                <div>
                  <div style={{ fontFamily: 'Tajawal, sans-serif', fontWeight: 700, fontSize: 13, color: '#fff', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <BookBtn label="شوف كيف يعمل ←" dark={false} msg="مرحباً، أريد رؤية مساعد الاستقبال AI بشكل عملي" />
            <button onClick={() => wa('مرحباً، أريد تجربة المساعد AI مباشرة')}
              style={{ background: 'none', border: `1px solid rgba(255,255,255,0.25)`, borderRadius: 8, padding: '12px 20px', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontSize: 14, color: '#fff', fontWeight: 600 }}>
              تجربة مباشرة
            </button>
          </div>
        </motion.div>

        {/* Chat mockup */}
        <motion.div {...rv} transition={{ delay: 0.2 }} style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ background: '#1A3428', borderRadius: 20, padding: 20, maxWidth: 320, width: '100%' }}>
            <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.35)' }}>
              <div style={{ background: '#075E54', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: FOREST, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={13} color="#fff" />
                </div>
                <div>
                  <div style={{ color: '#fff', fontFamily: 'Tajawal, sans-serif', fontWeight: 700, fontSize: 12 }}>مساعد عيادة د. أحمد</div>
                  <div style={{ color: '#A8D5A2', fontSize: 9, fontFamily: 'Tajawal, sans-serif' }}>● يرد خلال ثوانٍ</div>
                </div>
              </div>
              <div style={{ background: '#ECE5DD', padding: '10px 9px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { from: 'user', text: 'وش أسعار تبييض الأسنان؟' },
                  { from: 'ai',   text: 'أهلاً! 😊 التبييض بالليزر من 800 ريال. فيه استشارة مجانية مع الدكتور. تبي أحجز؟' },
                  { from: 'user', text: 'إيه كويس' },
                  { from: 'ai',   text: 'عندي الأحد 4:30م متاح. يناسبك؟ ✅' },
                ].map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-start' : 'flex-end' }}>
                    <div style={{ background: m.from === 'user' ? '#fff' : '#DCF8C6', padding: '6px 9px', borderRadius: 9, maxWidth: 190, fontSize: 11, fontFamily: 'Tajawal, sans-serif', color: '#2C3E2D', lineHeight: 1.5 }}>
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
  <section id="process" className="hp-section" style={{ background: CREAM, paddingTop: 80, paddingBottom: 80, direction: 'rtl' }}>
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
      <div className="hp-section-inner" style={{ borderTop: `1px solid ${DARK}15`, paddingTop: 64 }}>
        <Label n="05" title="العملية" />
        <motion.h2 {...rv} style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(24px,3.5vw,44px)', fontWeight: 700, color: DARK, lineHeight: 1.3, margin: '0 0 64px', maxWidth: 480 }}>
          ثلاثون يوماً إلى نظام{' '}
          <span style={{ color: FOREST, fontStyle: 'italic' }}>يعمل بالكامل.</span>
        </motion.h2>

        <div style={{ position: 'relative' }}>
          <div className="hp-timeline-line" style={{ position: 'absolute', top: 13, right: '12.5%', left: '12.5%', height: 1, background: `${DARK}18` }} />
          <div className="hp-4timeline">
            {[
              { week: 'الأسبوع 01', phase: 'التأسيس', dot: FOREST, items: ['جلسة تعريفية كاملة', 'ربط واتساب Business', 'تدريب المساعد', 'إعداد نظام الحجز'] },
              { week: 'الأسبوع 02', phase: 'البناء',   dot: MUTED,  items: ['تخصيص ردود AI', 'ربط جدول المواعيد', 'إعداد التذكيرات', 'اختبار شامل'] },
              { week: 'الأسبوع 03', phase: 'الإطلاق', dot: GOLD,   items: ['تشغيل مباشر', 'تدريب الفريق', 'مراقبة يومية', 'تعديل وتحسين'] },
              { week: 'الأسبوع 04+', phase: 'التحسين', dot: MUTED, items: ['تقارير أسبوعية', 'استراتيجية النمو', 'إضافة ميزات', 'دعم مستمر'] },
            ].map(({ week, phase, dot, items }) => (
              <motion.div key={week} {...rv} style={{ paddingTop: 36 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: dot, marginBottom: 20, border: `3px solid ${CREAM}`, flexShrink: 0 }} />
                <div style={{ fontSize: 10, fontFamily: 'Tajawal, sans-serif', color: MUTED, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6 }}>
                  {week}
                </div>
                <h3 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 19, fontWeight: 700, color: DARK, margin: '0 0 14px' }}>{phase}</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {items.map(item => (
                    <li key={item} style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 13, color: DARK, opacity: 0.62, lineHeight: 1.5 }}>{item}</li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
)

/* ─── Programs ───────────────────────────────────────────────────── */
const Programs = () => (
  <section id="programs" className="hp-section" style={{ background: CREAM, paddingBottom: 80, direction: 'rtl' }}>
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
      <div className="hp-section-inner" style={{ borderTop: `1px solid ${DARK}15`, paddingTop: 64 }}>
        <Label n="06" title="البرامج" />
        <motion.h2 {...rv} style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(24px,3.5vw,44px)', fontWeight: 700, color: DARK, lineHeight: 1.3, margin: '0 0 48px' }}>
          طريقتان للبدء.{' '}
          <span style={{ color: FOREST, fontStyle: 'italic' }}>وجهة واحدة.</span>
        </motion.h2>

        <div className="hp-2col" style={{ gap: 20 }}>
          {/* Light card */}
          <motion.div {...rv} style={{ background: '#fff', borderRadius: 18, padding: '36px 30px', border: `1px solid ${DARK}10` }}>
            <div style={{ fontSize: 11, fontFamily: 'Tajawal, sans-serif', color: MUTED, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 14 }}>مناسب لـ · عيادة جديدة أو مبتدئة</div>
            <h3 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 24, fontWeight: 700, color: DARK, margin: '0 0 14px' }}>البداية الذكية</h3>
            <p style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 14, color: DARK, opacity: 0.62, lineHeight: 1.75, margin: '0 0 24px' }}>
              نظام استقبال AI + إدارة مواعيد + لوحة تحكم — كل ما تحتاجه لقياس النتائج من أول أسبوع.
            </p>
            <div style={{ borderTop: `1px solid ${DARK}10`, paddingTop: 20, marginBottom: 24 }}>
              {['مساعد واتساب AI مخصص', 'جدول مواعيد رقمي', 'تذكيرات تلقائية للمرضى', 'لوحة تحكم أساسية', 'تدريب الفريق (ساعتان)', 'دعم شهر كامل'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', fontFamily: 'Tajawal, sans-serif', fontSize: 13, color: DARK }}>
                  <Check size={13} color={FOREST} strokeWidth={2.5} />{f}
                </div>
              ))}
            </div>
            <BookBtn label="احجز جلسة اكتشاف ←" msg="مرحباً، أريد الاستفسار عن برنامج البداية الذكية لعيادتي" />
          </motion.div>

          {/* Dark card */}
          <motion.div {...rv} transition={{ delay: 0.12 }} style={{ background: DARK, borderRadius: 18, padding: '36px 30px' }}>
            <div style={{ fontSize: 11, fontFamily: 'Tajawal, sans-serif', color: GOLD, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 14 }}>مناسب لـ · عيادة تريد نمواً متسارعاً</div>
            <h3 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 14px' }}>النمو الكامل</h3>
            <p style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.75, margin: '0 0 24px' }}>
              كل شيء في البداية الذكية + مساعد صوتي AI + تقارير متقدمة + استرداد المرضى الغائبين + متابعة شهرية مستمرة.
            </p>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20, marginBottom: 24 }}>
              {['كل مزايا البداية الذكية', 'مساعد صوتي AI للمكالمات', 'تقارير تحليلية متقدمة', 'استرداد المرضى الغائبين', 'تكاملات خاصة بعيادتك', 'دعم أولوية + متابعة شهرية'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', fontFamily: 'Tajawal, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.82)' }}>
                  <Check size={13} color={GOLD} strokeWidth={2.5} />{f}
                </div>
              ))}
            </div>
            <BookBtn gold label="احجز جلسة اكتشاف ←" msg="مرحباً، أريد الاستفسار عن برنامج النمو الكامل لعيادتي" />
          </motion.div>
        </div>
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
    <section id="faq" className="hp-section" style={{ background: CREAM, paddingBottom: 80, direction: 'rtl' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 20px' }}>
        <div className="hp-section-inner" style={{ borderTop: `1px solid ${DARK}15`, paddingTop: 64 }}>
          <Label n="08" title="الأسئلة الشائعة" />
          <motion.h2 {...rv} style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(22px,3vw,34px)', fontWeight: 700, color: DARK, lineHeight: 1.35, margin: '0 0 40px' }}>
            أسئلة تخطر على بالك
          </motion.h2>
          {faqs.map((faq, i) => (
            <div key={i} style={{ borderBottom: `1px solid ${DARK}10` }}>
              <button onClick={() => setOpen(open === i ? null : i)}
                style={{ width: '100%', padding: '18px 0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, textAlign: 'right' }}>
                <span style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 16, fontWeight: 700, color: DARK, flex: 1 }}>{faq.q}</span>
                <motion.span animate={{ rotate: open === i ? 180 : 0 }} transition={{ duration: 0.22 }}>
                  <ChevronDown size={17} color={MUTED} />
                </motion.span>
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28 }} style={{ overflow: 'hidden' }}>
                    <p style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 14, color: DARK, opacity: 0.68, lineHeight: 1.8, paddingBottom: 18, margin: 0 }}>{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Final CTA ──────────────────────────────────────────────────── */
const FinalCTA = () => (
  <section style={{ background: DARK, paddingTop: 80, paddingBottom: 80, direction: 'rtl', textAlign: 'center' }}>
    <div style={{ maxWidth: 580, margin: '0 auto', padding: '0 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <div style={{ width: 24, height: 1, background: GOLD }} />
        <span style={{ fontSize: 11, fontFamily: 'Tajawal, sans-serif', fontWeight: 700, letterSpacing: '0.12em', color: GOLD }}>ابدأ الآن</span>
        <div style={{ width: 24, height: 1, background: GOLD }} />
      </div>
      <motion.h2 {...rv} style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(24px,3.8vw,44px)', fontWeight: 700, color: '#fff', lineHeight: 1.28, margin: '0 0 18px' }}>
        احجز محادثة 30 دقيقة{' '}
        <span style={{ color: GOLD, fontStyle: 'italic' }}>تستحق وقتك.</span>
      </motion.h2>
      <motion.p {...rv} style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 16, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, margin: '0 0 36px' }}>
        نفهم وضع عيادتك الآن، ونعطيك خطة واضحة — بدون أي التزام.
      </motion.p>
      <motion.button {...rv} whileHover={{ opacity: 0.86 }} whileTap={{ scale: 0.97 }}
        onClick={() => wa('مرحباً، أريد حجز جلسة تعريفية مجانية 30 دقيقة')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '15px 34px', borderRadius: 8, background: GOLD, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontWeight: 700, fontSize: 16 }}>
        <MessageCircle size={17} />
        احجز جلسة مجانية ←
      </motion.button>
    </div>
  </section>
)

/* ─── Sticky Bar ─────────────────────────────────────────────────── */
const StickyBar = () => {
  const [gone, setGone] = useState(false)
  if (gone) return null
  return (
    <motion.div className="hp-sticky-bar" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 2.5, duration: 0.45 }}
      style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: DARK, borderRadius: 99, padding: '11px 16px 11px 20px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.32)', direction: 'rtl' }}>
      <span className="hp-sticky-text" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
        <span style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.78)', fontWeight: 500, whiteSpace: 'nowrap' }}>
          جاهز تبدأ؟ احجز جلسة استراتيجية مجانية.
        </span>
      </span>
      <button onClick={() => wa('مرحباً، أريد حجز جلسة استراتيجية')}
        style={{ background: GOLD, border: 'none', borderRadius: 99, padding: '8px 18px', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontWeight: 700, fontSize: 13, color: '#fff', whiteSpace: 'nowrap' }}>
        احجز الآن ←
      </button>
      <button onClick={() => setGone(true)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>
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
