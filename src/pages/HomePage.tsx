import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, MessageCircle, Calendar, BarChart3, Clock, Phone, Bot, Zap } from 'lucide-react'
import { Footer } from '../components/public/Footer'

/* ─── Constants ──────────────────────────────────────────────────── */
const PHONE = '966546666005'
const wa = (msg = 'مرحباً، أريد معرفة المزيد عن نظام الاستقبال الذكي لعيادتي') =>
  window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`, '_blank')

const CREAM = '#F5F1E7'
const DARK = '#0D2416'
const FOREST = '#1B4332'
const GOLD = '#B5820F'
const MUTED = '#6B7F6E'

const rv = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.6 } }

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
const BookBtn = ({ label = 'احجز مكالمة مجانية ←', msg, dark = true, large = false }: { label?: string; msg?: string; dark?: boolean; large?: boolean }) => (
  <motion.button
    whileHover={{ opacity: 0.88 }}
    whileTap={{ scale: 0.97 }}
    onClick={() => wa(msg)}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
      padding: large ? '16px 38px' : '13px 28px',
      borderRadius: 8,
      background: dark ? FOREST : CREAM,
      color: dark ? '#fff' : DARK,
      border: dark ? 'none' : `2px solid ${DARK}`,
      fontFamily: 'Tajawal, sans-serif', fontWeight: 700, fontSize: large ? 17 : 15,
      letterSpacing: '-0.01em',
    }}
  >
    {label}
  </motion.button>
)

/* ─── Navbar ─────────────────────────────────────────────────────── */
const Navbar = () => {
  const [open, setOpen] = useState(false)
  const links = [
    { label: 'المنهجية', href: '#method' },
    { label: 'المساعد AI', href: '#ai' },
    { label: 'العملية', href: '#process' },
    { label: 'البرامج', href: '#programs' },
    { label: 'الأسئلة الشائعة', href: '#faq' },
  ]
  const scroll = (href: string) => {
    setOpen(false)
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }
  return (
    <header style={{ position: 'fixed', top: 0, right: 0, left: 0, zIndex: 100, background: CREAM, borderBottom: `1px solid rgba(13,36,22,0.1)` }} dir="rtl">
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: FOREST, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={18} color="#fff" />
          </div>
          <span style={{ fontFamily: 'Tajawal, sans-serif', fontWeight: 900, fontSize: 17, color: DARK, letterSpacing: '-0.02em' }}>مدار AI</span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          {links.map(l => (
            <button key={l.href} onClick={() => scroll(l.href)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontSize: 14, color: DARK, fontWeight: 500, opacity: 0.75 }}>
              {l.label}
            </button>
          ))}
        </nav>

        {/* CTA */}
        <BookBtn label="احجز مكالمة ←" />
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{ background: CREAM, borderTop: `1px solid rgba(13,36,22,0.1)`, padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {links.map(l => (
              <button key={l.href} onClick={() => scroll(l.href)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontSize: 15, color: DARK, textAlign: 'right', padding: '8px 0' }}>
                {l.label}
              </button>
            ))}
            <BookBtn />
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

/* ─── Hero ───────────────────────────────────────────────────────── */
const Hero = () => (
  <section style={{ background: CREAM, paddingTop: 120, paddingBottom: 80, direction: 'rtl' }}>
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
      {/* Badge */}
      <motion.div {...rv} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 32, background: `${FOREST}14`, border: `1px solid ${FOREST}30`, borderRadius: 99, padding: '6px 16px' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
        <span style={{ fontSize: 12, fontFamily: 'Tajawal, sans-serif', fontWeight: 700, color: FOREST, letterSpacing: '0.08em' }}>
          عيادات الأسنان · جدة · السعودية
        </span>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }} className="grid-hero">
        {/* Left: copy */}
        <motion.div {...rv}>
          <h1 style={{ fontFamily: '"Noto Serif Arabic", Georgia, serif', fontSize: 'clamp(36px, 5vw, 62px)', fontWeight: 700, color: DARK, lineHeight: 1.2, margin: '0 0 24px', letterSpacing: '-0.02em' }}>
            نظام الاستقبال الذكي
            <br />
            <span style={{ color: FOREST, fontStyle: 'italic' }}>لعيادتك في جدة.</span>
          </h1>
          <p style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 18, color: DARK, opacity: 0.65, lineHeight: 1.75, margin: '0 0 36px', maxWidth: 480 }}>
            نبني ونشغّل نظاماً يستقبل مرضاك على واتساب، يحجز المواعيد، ويُذكّرهم تلقائياً — بدون موظف استقبال إضافي.
          </p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <BookBtn label="احجز جلسة مجانية 30 دقيقة ←" large msg="مرحباً، أريد حجز جلسة مجانية لمناقشة نظام الاستقبال الذكي لعيادتي" />
            <button
              onClick={() => document.querySelector('#method')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontSize: 15, color: DARK, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>
              كيف يعمل النظام
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 40, marginTop: 52, paddingTop: 32, borderTop: `1px solid ${DARK}18` }}>
            {[
              { n: '24/7', label: 'استقبال مستمر' },
              { n: '<12ث', label: 'سرعة الرد' },
              { n: '80%', label: 'تقليل المكالمات الفائتة' },
            ].map(s => (
              <div key={s.n}>
                <div style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 26, fontWeight: 700, color: DARK, lineHeight: 1 }}>{s.n}</div>
                <div style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 12, color: MUTED, marginTop: 6 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right: WhatsApp mockup */}
        <motion.div {...rv} transition={{ delay: 0.15 }} style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: 320 }}>
            {/* Phone shell */}
            <div style={{ background: '#fff', borderRadius: 28, boxShadow: '0 32px 80px rgba(13,36,22,0.18)', overflow: 'hidden', border: `8px solid ${DARK}`, width: 300 }}>
              {/* WA header */}
              <div style={{ background: '#075E54', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: FOREST, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={16} color="#fff" />
                </div>
                <div>
                  <div style={{ color: '#fff', fontFamily: 'Tajawal, sans-serif', fontWeight: 700, fontSize: 13 }}>مساعد عيادة د. أحمد</div>
                  <div style={{ color: '#A8D5A2', fontSize: 10, fontFamily: 'Tajawal, sans-serif' }}>متصل الآن ●</div>
                </div>
              </div>
              {/* Chat */}
              <div style={{ background: '#ECE5DD', padding: '12px 10px', minHeight: 280, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { from: 'user', text: 'السلام عليكم، أبي أحجز موعد تنظيف' },
                  { from: 'ai', text: 'وعليكم السلام! 😊 يسعدنا. متى يناسبك؟ عندنا خانات الثلاثاء والأربعاء.' },
                  { from: 'user', text: 'الأربعاء عصراً لو أمكن' },
                  { from: 'ai', text: 'ممتاز! ✅ عندي 4:30م الأربعاء. اسمك ورقم الجوال للتأكيد؟' },
                  { from: 'user', text: 'سارة العمري — 0551234567' },
                  { from: 'ai', text: 'تم الحجز يا سارة 🎉 ستصلك رسالة تذكير قبل 24 ساعة.' },
                ].map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-start' : 'flex-end' }}>
                    <div style={{ background: m.from === 'user' ? '#fff' : '#DCF8C6', padding: '7px 10px', borderRadius: m.from === 'user' ? '12px 12px 12px 2px' : '12px 12px 2px 12px', maxWidth: 200, fontSize: 11, fontFamily: 'Tajawal, sans-serif', color: '#2C3E2D', lineHeight: 1.5 }}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating cards */}
            <div style={{ position: 'absolute', top: -20, left: -50, background: '#fff', borderRadius: 14, padding: '12px 16px', boxShadow: '0 8px 28px rgba(0,0,0,0.12)', fontSize: 12, fontFamily: 'Tajawal, sans-serif', minWidth: 130 }}>
              <div style={{ color: MUTED, fontSize: 10, marginBottom: 4 }}>اليوم</div>
              <div style={{ fontWeight: 900, fontSize: 22, color: DARK }}>14</div>
              <div style={{ color: FOREST, fontWeight: 600 }}>موعد محجوز</div>
            </div>
            <div style={{ position: 'absolute', bottom: 40, right: -50, background: FOREST, borderRadius: 14, padding: '12px 16px', boxShadow: '0 8px 28px rgba(0,0,0,0.15)', fontSize: 12, fontFamily: 'Tajawal, sans-serif', minWidth: 140 }}>
              <div style={{ color: '#A8D5A2', fontSize: 10, marginBottom: 4 }}>مكالمات فائتة</div>
              <div style={{ fontWeight: 900, fontSize: 22, color: '#fff' }}>0</div>
              <div style={{ color: '#A8D5A2', fontWeight: 600, fontSize: 11 }}>كل شيء تحت السيطرة ✓</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>

    <style>{`
      @media (max-width: 768px) {
        .grid-hero { grid-template-columns: 1fr !important; }
      }
    `}</style>
  </section>
)

/* ─── Results Teaser ─────────────────────────────────────────────── */
const Results = () => (
  <section style={{ background: CREAM, paddingBottom: 80, direction: 'rtl' }}>
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
      <div style={{ borderTop: `1px solid ${DARK}15`, paddingTop: 64 }}>
        <Label n="01" title="النتائج" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'start' }} className="grid-2">
          <motion.div {...rv}>
            <h2 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 700, color: DARK, lineHeight: 1.3, margin: '0 0 20px' }}>
              ماذا يحصل عملاؤنا في أول 30 يوم؟
            </h2>
            <p style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 16, color: DARK, opacity: 0.65, lineHeight: 1.8, margin: '0 0 28px' }}>
              جلسة تعريفية لفهم وضع عيادتك الحالي — أفضل الحالات، أسوأ الحالات، وبالضبط ما الذي يمنع نموك. نشرح لك كيف نبني النظام كاملاً ونشغّله.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'أرقام حقيقية من عيادات مشابهة',
                'خطة مخصصة لعيادتك',
                'ما الذي يجعل النتائج ممكنة',
              ].map(item => (
                <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'Tajawal, sans-serif', fontSize: 15, color: DARK }}>
                  <Check size={14} color={FOREST} strokeWidth={2.5} /> {item}
                </li>
              ))}
            </ul>
            <BookBtn msg="مرحباً، أريد حجز جلسة استراتيجية مجانية لعيادتي" />
          </motion.div>

          <motion.div {...rv} transition={{ delay: 0.15 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { metric: '+40%', label: 'زيادة في المواعيد المحجوزة', sub: 'متوسط أول 60 يوم' },
                { metric: '0', label: 'مكالمات فائتة خارج الدوام', sub: 'المساعد AI يعمل 24/7' },
                { metric: '3 أسابيع', label: 'للإطلاق الكامل', sub: 'من التعاقد حتى التشغيل' },
              ].map(({ metric, label, sub }) => (
                <div key={metric} style={{ background: '#fff', borderRadius: 16, padding: '22px 24px', border: `1px solid ${DARK}10` }}>
                  <div style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 32, fontWeight: 700, color: FOREST, lineHeight: 1 }}>{metric}</div>
                  <div style={{ fontFamily: 'Tajawal, sans-serif', fontWeight: 700, fontSize: 15, color: DARK, margin: '6px 0 4px' }}>{label}</div>
                  <div style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 13, color: MUTED }}>{sub}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
    <style>{`.grid-2 { } @media (max-width: 768px) { .grid-2 { grid-template-columns: 1fr !important; } }`}</style>
  </section>
)

/* ─── Method (4 systems) ─────────────────────────────────────────── */
const Method = () => (
  <section id="method" style={{ background: CREAM, paddingTop: 80, paddingBottom: 80, direction: 'rtl' }}>
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', borderTop: `1px solid ${DARK}15`, paddingTop: 64 }}>
      <Label n="02" title="المنهجية" />
      <motion.h2 {...rv} style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(30px,4vw,50px)', fontWeight: 700, color: DARK, lineHeight: 1.25, margin: '0 0 60px', maxWidth: 600 }}>
        أربعة أنظمة،{' '}
        <span style={{ color: FOREST, fontStyle: 'italic' }}>عيادة واحدة.</span>
      </motion.h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }} className="grid-4">
        {[
          { icon: Bot, num: '01', title: 'مساعد الاستقبال AI', items: ['يرد في أقل من 12 ثانية', 'يفهم اللهجة السعودية', 'يعمل 24 ساعة 7 أيام', 'بدون تدخل موظف'] },
          { icon: Calendar, num: '02', title: 'الحجز الذكي', items: ['يحجز مباشرة في الجدول', 'يتحقق من التوافر فوراً', 'يرسل تأكيد تلقائي', 'يتصل بنظام المواعيد'] },
          { icon: Clock, num: '03', title: 'متابعة المرضى', items: ['تذكير قبل 24 و2 ساعة', 'استرداد المرضى الغائبين', 'متابعة ما بعد الزيارة', 'رسائل مخصصة لكل مريض'] },
          { icon: BarChart3, num: '04', title: 'التقارير والتحليل', items: ['تقارير يومية أوتوماتيكية', 'مؤشرات الأداء الرئيسية', 'مصادر المرضى الجدد', 'معدل إلغاء المواعيد'] },
        ].map(({ icon: Icon, num, title, items }) => (
          <motion.div key={num} {...rv} style={{ padding: '36px 28px', borderRight: `1px solid ${DARK}12` }}>
            <div style={{ fontSize: 11, fontFamily: 'Tajawal, sans-serif', color: MUTED, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 20 }}>{num}</div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${FOREST}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <Icon size={20} color={FOREST} />
            </div>
            <h3 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 18, fontWeight: 700, color: DARK, margin: '0 0 20px', lineHeight: 1.3 }}>{title}</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map(item => (
                <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontFamily: 'Tajawal, sans-serif', fontSize: 13, color: DARK, opacity: 0.7, lineHeight: 1.4 }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: GOLD, marginTop: 6, flexShrink: 0 }} />{item}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
    <style>{`@media (max-width: 768px) { .grid-4 { grid-template-columns: 1fr 1fr !important; } }`}</style>
  </section>
)

/* ─── AI Demo (dark section) ─────────────────────────────────────── */
const AiSection = () => (
  <section id="ai" style={{ background: DARK, paddingTop: 96, paddingBottom: 96, direction: 'rtl' }}>
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
        <div style={{ width: 28, height: 1, background: GOLD }} />
        <span style={{ fontSize: 11, fontFamily: 'Tajawal, sans-serif', fontWeight: 700, letterSpacing: '0.12em', color: GOLD, textTransform: 'uppercase' }}>03 — المساعد AI</span>
        <div style={{ width: 28, height: 1, background: GOLD }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center' }} className="grid-2b">
        <motion.div {...rv}>
          <h2 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(28px,3.5vw,46px)', fontWeight: 700, color: '#fff', lineHeight: 1.25, margin: '0 0 24px' }}>
            موظف الاستقبال الذي لا ينام{' '}
            <span style={{ color: GOLD, fontStyle: 'italic' }}>ولا يطلب علاوة.</span>
          </h2>
          <p style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 16, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, margin: '0 0 36px' }}>
            كل مريض يراسل عيادتك يحصل على رد فوري — في أقل من 12 ثانية، على واتساب، بالعربية. مدرّب على جدولك وأسعارك وبروتوكولاتك. يحجز، يؤكد، ويذكّر.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 40 }}>
            {[
              { icon: Zap, label: 'رد في 12 ثانية', desc: 'المرضى الذين يحصلون على رد سريع يحجزون بنسبة 4× أعلى' },
              { icon: Calendar, label: 'حجز مباشر في الجدول', desc: 'يتحقق من التوافر ويؤكد الموعد بدون تدخل بشري' },
              { icon: Clock, label: 'يعمل 24 ساعة', desc: 'حتى في الإجازات والأعياد والأوقات خارج الدوام' },
              { icon: Phone, label: 'يقلل المكالمات', desc: '80% من الأسئلة تُحل عبر واتساب بدون مكالمة' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} style={{ display: 'flex', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${GOLD}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} color={GOLD} />
                </div>
                <div>
                  <div style={{ fontFamily: 'Tajawal, sans-serif', fontWeight: 700, fontSize: 14, color: '#fff', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <BookBtn label="شوف كيف يعمل ←" dark={false} msg="مرحباً، أريد رؤية مساعد الاستقبال AI بشكل عملي" />
            <button onClick={() => wa('مرحباً، أريد رؤية تجربة المساعد AI مباشرة')} style={{ background: 'none', border: `1px solid rgba(255,255,255,0.3)`, borderRadius: 8, padding: '13px 24px', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontSize: 15, color: '#fff', fontWeight: 600 }}>
              تجربة مباشرة
            </button>
          </div>
        </motion.div>

        {/* Phone mockup */}
        <motion.div {...rv} transition={{ delay: 0.2 }} style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ background: '#1A3428', borderRadius: 24, padding: 24, maxWidth: 360 }}>
            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
              <div style={{ background: '#075E54', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: FOREST, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={14} color="#fff" />
                </div>
                <div>
                  <div style={{ color: '#fff', fontFamily: 'Tajawal, sans-serif', fontWeight: 700, fontSize: 12 }}>مساعد عيادة د. أحمد</div>
                  <div style={{ color: '#A8D5A2', fontSize: 9, fontFamily: 'Tajawal, sans-serif' }}>● متصل — يرد خلال ثوانٍ</div>
                </div>
              </div>
              <div style={{ background: '#ECE5DD', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[
                  { from: 'user', text: 'وش أسعار تبييض الأسنان عندكم؟' },
                  { from: 'ai', text: 'أهلاً! 😊 تبييض الأسنان بالليزر يبدأ من 800 ريال. كمان عندنا جلسة استشارية مجانية مع الدكتور. تبي أحجز لك؟' },
                  { from: 'user', text: 'إيه كويس، متى أقرب موعد؟' },
                  { from: 'ai', text: 'عندي يوم الأحد الساعة 4:30م متاح. يناسبك؟ ✅' },
                ].map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-start' : 'flex-end' }}>
                    <div style={{ background: m.from === 'user' ? '#fff' : '#DCF8C6', padding: '6px 10px', borderRadius: 10, maxWidth: 200, fontSize: 11, fontFamily: 'Tajawal, sans-serif', color: '#2C3E2D', lineHeight: 1.5 }}>
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
    <style>{`@media (max-width: 768px) { .grid-2b { grid-template-columns: 1fr !important; } }`}</style>
  </section>
)

/* ─── Process ────────────────────────────────────────────────────── */
const Process = () => (
  <section id="process" style={{ background: CREAM, paddingTop: 96, paddingBottom: 96, direction: 'rtl' }}>
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', borderTop: `1px solid ${DARK}15`, paddingTop: 72 }}>
      <Label n="05" title="العملية" />
      <motion.h2 {...rv} style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(28px,3.5vw,46px)', fontWeight: 700, color: DARK, lineHeight: 1.3, margin: '0 0 72px', maxWidth: 500 }}>
        ثلاثون يوماً إلى نظام{' '}
        <span style={{ color: FOREST, fontStyle: 'italic' }}>يعمل بالكامل.</span>
      </motion.h2>

      <div style={{ position: 'relative' }}>
        {/* Horizontal line */}
        <div style={{ position: 'absolute', top: 14, right: '12.5%', left: '12.5%', height: 1, background: `${DARK}20` }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32 }} className="grid-4b">
          {[
            { week: 'الأسبوع 01', phase: 'التأسيس', dot: FOREST, items: ['جلسة تعريفية كاملة', 'ربط واتساب Business', 'تدريب المساعد على عيادتك', 'إعداد نظام الحجز'] },
            { week: 'الأسبوع 02', phase: 'البناء', dot: MUTED, items: ['تخصيص ردود AI', 'ربط جدول المواعيد', 'إعداد التذكيرات', 'اختبار شامل'] },
            { week: 'الأسبوع 03', phase: 'الإطلاق', dot: GOLD, items: ['تشغيل مباشر', 'تدريب فريق العيادة', 'مراقبة يومية', 'تعديل وتحسين'] },
            { week: 'الأسبوع 04+', phase: 'التحسين', dot: MUTED, items: ['تقارير أسبوعية', 'استراتيجية النمو', 'إضافة ميزات جديدة', 'دعم مستمر'] },
          ].map(({ week, phase, dot, items }) => (
            <motion.div key={week} {...rv} style={{ paddingTop: 40 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: dot, margin: '0 0 24px', border: `3px solid ${CREAM}`, boxSizing: 'content-box', position: 'relative' }} />
              <div style={{ fontSize: 10, fontFamily: 'Tajawal, sans-serif', color: MUTED, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>
                {week} · {phase.toUpperCase()}
              </div>
              <h3 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 20, fontWeight: 700, color: DARK, margin: '0 0 16px' }}>{phase}</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(item => (
                  <li key={item} style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 13, color: DARK, opacity: 0.65, lineHeight: 1.5 }}>{item}</li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
    <style>{`@media (max-width: 768px) { .grid-4b { grid-template-columns: 1fr 1fr !important; } }`}</style>
  </section>
)

/* ─── Programs ───────────────────────────────────────────────────── */
const Programs = () => (
  <section id="programs" style={{ background: CREAM, paddingBottom: 96, direction: 'rtl' }}>
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', borderTop: `1px solid ${DARK}15`, paddingTop: 72 }}>
      <Label n="06" title="البرامج" />
      <motion.h2 {...rv} style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(28px,3.5vw,46px)', fontWeight: 700, color: DARK, lineHeight: 1.3, margin: '0 0 56px' }}>
        طريقتان للبدء.{' '}
        <span style={{ color: FOREST, fontStyle: 'italic' }}>وجهة واحدة.</span>
      </motion.h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="grid-2c">
        {/* Card 1: Light */}
        <motion.div {...rv} style={{ background: '#fff', borderRadius: 20, padding: '40px 36px', border: `1px solid ${DARK}10` }}>
          <div style={{ fontSize: 11, fontFamily: 'Tajawal, sans-serif', color: MUTED, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 16 }}>مناسب لـ · عيادة جديدة أو مبتدئة</div>
          <h3 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 26, fontWeight: 700, color: DARK, margin: '0 0 16px' }}>البداية الذكية</h3>
          <p style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 15, color: DARK, opacity: 0.65, lineHeight: 1.7, margin: '0 0 28px' }}>
            نظام استقبال AI + إدارة مواعيد + لوحة تحكم — كل ما تحتاجه للبدء وقياس النتائج من أول أسبوع.
          </p>
          <div style={{ borderTop: `1px solid ${DARK}10`, paddingTop: 24, marginBottom: 28 }}>
            {['مساعد واتساب AI مخصص', 'جدول مواعيد رقمي', 'تذكيرات تلقائية للمرضى', 'لوحة تحكم أساسية', 'تدريب الفريق (ساعتان)', 'دعم شهر كامل'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', fontFamily: 'Tajawal, sans-serif', fontSize: 14, color: DARK }}>
                <Check size={14} color={FOREST} strokeWidth={2.5} />{f}
              </div>
            ))}
          </div>
          <BookBtn label="احجز جلسة اكتشاف ←" msg="مرحباً، أريد الاستفسار عن برنامج البداية الذكية لعيادتي" />
        </motion.div>

        {/* Card 2: Dark */}
        <motion.div {...rv} transition={{ delay: 0.15 }} style={{ background: DARK, borderRadius: 20, padding: '40px 36px' }}>
          <div style={{ fontSize: 11, fontFamily: 'Tajawal, sans-serif', color: GOLD, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 16 }}>مناسب لـ · عيادة تريد نمواً متسارعاً</div>
          <h3 style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 26, fontWeight: 700, color: '#fff', margin: '0 0 16px' }}>النمو الكامل</h3>
          <p style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: '0 0 28px' }}>
            كل شيء في البداية الذكية + مساعد صوتي AI + تقارير متقدمة + استرداد المرضى الغائبين + متابعة شهرية مستمرة.
          </p>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 24, marginBottom: 28 }}>
            {['كل مزايا البداية الذكية', 'مساعد صوتي AI للمكالمات', 'تقارير تحليلية متقدمة', 'استرداد المرضى الغائبين', 'تكاملات خاصة بعيادتك', 'دعم أولوية + متابعة شهرية'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', fontFamily: 'Tajawal, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>
                <Check size={14} color={GOLD} strokeWidth={2.5} />{f}
              </div>
            ))}
          </div>
          <motion.button
            whileHover={{ opacity: 0.85 }}
            onClick={() => wa('مرحباً، أريد الاستفسار عن برنامج النمو الكامل لعيادتي')}
            style={{ background: GOLD, color: '#fff', border: 'none', borderRadius: 8, padding: '13px 28px', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontWeight: 700, fontSize: 15 }}>
            احجز جلسة اكتشاف ←
          </motion.button>
        </motion.div>
      </div>
    </div>
    <style>{`@media (max-width: 768px) { .grid-2c { grid-template-columns: 1fr !important; } }`}</style>
  </section>
)

/* ─── FAQ ────────────────────────────────────────────────────────── */
const faqs = [
  { q: 'هل أحتاج خبرة تقنية لتشغيل النظام؟', a: 'لا على الإطلاق. نحن نبني كل شيء ونشغّله. دورك هو متابعة التقارير واستقبال المرضى فقط.' },
  { q: 'كم يستغرق التفعيل؟', a: 'من التعاقد حتى التشغيل الكامل: 3 أسابيع في المتوسط. الأسبوع الأول إعداد، الثاني بناء، الثالث إطلاق.' },
  { q: 'هل يعمل مع نظام المواعيد الحالي في العيادة؟', a: 'نعم في معظم الحالات. نقيّم نظامك الحالي في أول جلسة ونحدد أفضل طريقة للربط.' },
  { q: 'ماذا يحدث لو المريض طلب شيئاً خارج قدرة المساعد؟', a: 'يحول المحادثة تلقائياً لموظف بشري مع ملخص كامل للمحادثة حتى لا يضطر المريض للتكرار.' },
  { q: 'هل يفهم اللهجة السعودية والخليجية؟', a: 'نعم — المساعد مدرّب خصيصاً على اللهجة الخليجية السعودية. يفهم "أبي أحجز" و"متى فراغكم" وغيرها.' },
  { q: 'ما هي آلية الدفع؟', a: 'رسوم شهرية ثابتة بدون عقود طويلة. تفاصيل الأسعار تُناقش في جلسة الاكتشاف بناءً على حجم عيادتك واحتياجاتك.' },
]

const FAQ = () => {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <section id="faq" style={{ background: CREAM, paddingBottom: 96, direction: 'rtl' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px', borderTop: `1px solid ${DARK}15`, paddingTop: 72 }}>
        <Label n="08" title="الأسئلة الشائعة" />
        <motion.h2 {...rv} style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(24px,3vw,36px)', fontWeight: 700, color: DARK, lineHeight: 1.35, margin: '0 0 48px' }}>
          أسئلة تخطر على بالك
        </motion.h2>
        {faqs.map((faq, i) => (
          <motion.div key={i} {...rv} style={{ borderBottom: `1px solid ${DARK}12` }}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{ width: '100%', padding: '22px 0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, textAlign: 'right' }}>
              <span style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 17, fontWeight: 700, color: DARK, flex: 1 }}>{faq.q}</span>
              <motion.span animate={{ rotate: open === i ? 180 : 0 }} transition={{ duration: 0.25 }}>
                <ChevronDown size={18} color={MUTED} />
              </motion.span>
            </button>
            <AnimatePresence>
              {open === i && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} style={{ overflow: 'hidden' }}>
                  <p style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 15, color: DARK, opacity: 0.7, lineHeight: 1.8, paddingBottom: 22, margin: 0 }}>{faq.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

/* ─── Final CTA ──────────────────────────────────────────────────── */
const FinalCTA = () => (
  <section style={{ background: DARK, paddingTop: 96, paddingBottom: 96, direction: 'rtl', textAlign: 'center' }}>
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 36 }}>
        <div style={{ width: 28, height: 1, background: GOLD }} />
        <span style={{ fontSize: 11, fontFamily: 'Tajawal, sans-serif', fontWeight: 700, letterSpacing: '0.12em', color: GOLD }}>ابدأ الآن</span>
        <div style={{ width: 28, height: 1, background: GOLD }} />
      </div>
      <motion.h2 {...rv} style={{ fontFamily: '"Noto Serif Arabic", serif', fontSize: 'clamp(28px,4vw,48px)', fontWeight: 700, color: '#fff', lineHeight: 1.25, margin: '0 0 20px' }}>
        احجز محادثة 30 دقيقة{' '}
        <span style={{ color: GOLD, fontStyle: 'italic' }}>تستحق وقتك.</span>
      </motion.h2>
      <motion.p {...rv} style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 17, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, margin: '0 0 40px' }}>
        نفهم وضع عيادتك الآن، ونعطيك خطة واضحة — بدون أي التزام.
      </motion.p>
      <motion.div {...rv} style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
        <motion.button
          whileHover={{ opacity: 0.88 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => wa('مرحباً، أريد حجز جلسة تعريفية مجانية 30 دقيقة')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 36px', borderRadius: 8, background: GOLD, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontWeight: 700, fontSize: 17 }}>
          <MessageCircle size={18} />
          احجز جلسة مجانية ←
        </motion.button>
      </motion.div>
    </div>
  </section>
)

/* ─── Sticky Bar ─────────────────────────────────────────────────── */
const StickyBar = () => {
  const [visible, setVisible] = useState(false)
  if (typeof window !== 'undefined') {
    // Only show after scroll
  }
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 2, duration: 0.5 }}
      style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: DARK, borderRadius: 99, padding: '14px 20px 14px 28px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 16px 48px rgba(0,0,0,0.35)', whiteSpace: 'nowrap', direction: 'rtl' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
        <span style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>جاهز تبدأ؟ احجز جلسة استراتيجية مجانية 30 دقيقة.</span>
      </span>
      <button
        onClick={() => wa('مرحباً، أريد حجز جلسة استراتيجية')}
        style={{ background: GOLD, border: 'none', borderRadius: 99, padding: '9px 20px', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontWeight: 700, fontSize: 13, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
        احجز الآن ←
      </button>
      <button onClick={() => {}} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 18, lineHeight: 1 }}>×</button>
    </motion.div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────── */
export const HomePage = () => {
  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Arabic:wght@400;600;700&family=Tajawal:wght@400;500;700;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; background: ${CREAM}; }
      `}</style>

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
}
