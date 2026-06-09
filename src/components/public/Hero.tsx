import { useRef, useState, useEffect, useLayoutEffect } from 'react'
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion'
import { ArrowRight, Play, Sparkles, Zap, Shield, TrendingUp, Car, Stethoscope } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { openWhatsAppChat } from '../../lib/whatsapp'
import { useTextScramble } from '../../hooks/useTextScramble'
import { DottedSurface } from '../ui/dotted-surface'

/* ── WhatsApp Chat Mockup ──────────────────────────── */
type Msg = { from: 'user' | 'ai'; text: string; delay: number }

const industries = [
  {
    id: 'car-wash',
    icon: Car,
    labelAr: 'المغسلة',
    labelEn: 'Car Wash',
    color: '#00BFFF',
    msgs: [
      { from: 'user', text: 'الغسيل خلص؟', delay: 0.2 },
      { from: 'ai',   text: 'نعم! سيارتك جاهزة 🚗✨\nتم إرسال فاتورتك على واتساب.', delay: 0.9 },
      { from: 'user', text: 'وصلتني الفاتورة، شكراً', delay: 1.6 },
      { from: 'ai',   text: 'الشكر لك! 🙏\nهل تودّ تقييمنا على قوقل؟ يساعدنا كثيراً ⭐', delay: 2.3 },
      { from: 'user', text: 'طبعاً', delay: 3.0 },
      { from: 'ai',   text: 'جزاك الله خيراً! تفضل رابط التقييم 🔗\nmadar.software/review', delay: 3.7 },
    ] as Msg[],
  },
  {
    id: 'clinic',
    icon: Stethoscope,
    labelAr: 'العيادات',
    labelEn: 'Clinics',
    color: '#10B981',
    msgs: [
      { from: 'user', text: 'مرحبا، أبغى أحجز موعد عند الدكتور', delay: 0.2 },
      { from: 'ai',   text: 'أهلاً! 👋 بكل سرور.\nما نوع التخصص المطلوب؟', delay: 0.9 },
      { from: 'user', text: 'طب أسنان', delay: 1.6 },
      { from: 'ai',   text: 'ممتاز! لدينا مواعيد متاحة هذا الأسبوع.\nما أنسب وقت لك؟ صباحاً أم مساءً؟', delay: 2.3 },
      { from: 'user', text: 'مساء الثلاثاء لو تكرمت', delay: 3.0 },
      { from: 'ai',   text: 'تم الحجز بنجاح! ✅\nسيصلك تأكيد على واتساب مع تفاصيل الموعد.', delay: 3.7 },
    ] as Msg[],
  },
]

const WaChatMockup = ({ language, t }: { language: string; t: (ar: string, en: string) => string }) => {
  const [active, setActive]   = useState(0)
  const [visible, setVisible] = useState(1)
  const [isRestarting, setIsRestarting] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const industry = industries[active]
  const nextMsg = industry.msgs[visible]
  const isAiTyping = Boolean(nextMsg && nextMsg.from === 'ai')

  useEffect(() => {
    setIsRestarting(true)
    setVisible(1)
    const timer = setTimeout(() => setIsRestarting(false), 120)
    return () => clearTimeout(timer)
  }, [active])

  useEffect(() => {
    if (visible >= industry.msgs.length) return
    const next = industry.msgs[visible]
    const previous = industry.msgs[visible - 1]
    const delay = Math.max(650, (next.delay - previous.delay) * 1000)
    const timer = setTimeout(() => setVisible(v => Math.min(v + 1, industry.msgs.length)), delay)
    return () => clearTimeout(timer)
  }, [visible, active, industry])

  useLayoutEffect(() => {
    const el = chatContainerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [visible])

  /* Auto-cycle only after the full script is visible, with a calm pause. */
  useEffect(() => {
    if (visible < industry.msgs.length) return
    const timer = setTimeout(() => setActive(a => (a + 1) % industries.length), 5200)
    return () => clearTimeout(timer)
  }, [visible, industry.msgs.length])

  return (
    <div className="w-full max-w-[340px]">
      {/* Industry tabs */}
      <div className="flex gap-2 mb-3">
        {industries.map((ind, i) => {
          const Icon = ind.icon
          return (
            <button
              key={ind.id}
              onClick={() => setActive(i)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border"
              style={active === i
                ? { background: ind.color + '22', borderColor: ind.color + '70', color: ind.color }
                : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.45)' }}
            >
              <Icon size={11} />
              {language === 'ar' ? ind.labelAr : ind.labelEn}
            </button>
          )
        })}
      </div>

      {/* Phone frame */}
      <div
        className="rounded-[28px] overflow-hidden border-4 shadow-[0_24px_60px_rgba(13,27,62,0.18)]"
        style={{ borderColor: '#0D1B3E' }}
      >
        {/* WhatsApp header */}
        <div className="px-4 py-3 flex items-center gap-3" style={{ background: '#0D1B3E' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #00BFFF22, #1565C033)', border: '1.5px solid rgba(0,191,255,0.4)' }}>
            <Sparkles size={15} style={{ color: '#00BFFF' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[13px] font-semibold font-cairo leading-none">MADAR AI</p>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <p className="text-green-400 text-[10px] font-work">{t('متصل الآن', 'Online now')}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-1 h-1 rounded-full bg-white/30" />
            <div className="w-1 h-1 rounded-full bg-white/30" />
            <div className="w-1 h-1 rounded-full bg-white/30" />
          </div>
        </div>

        {/* Chat area */}
        <div
          ref={chatContainerRef}
          className="px-3 pt-3 pb-5 flex flex-col gap-2 overflow-y-auto"
          style={{ background: '#ECE5DD', height: 360 }}
        >
          {/* Date chip */}
          <div className="flex justify-center">
            <span className="px-3 py-0.5 rounded-full text-[9px] text-[#667781] font-work"
              style={{ background: 'rgba(255,255,255,0.7)' }}>
              {t('اليوم', 'Today')}
            </span>
          </div>

          <AnimatePresence>
            {industry.msgs.slice(0, visible).map((msg, i) => (
              <motion.div
                key={`${industry.id}-${i}`}
                initial={isRestarting ? false : { opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className="px-3 py-2 rounded-xl text-[11px] leading-relaxed max-w-[82%] relative font-tajawal whitespace-pre-line"
                  style={msg.from === 'ai'
                    ? { background: '#fff', color: '#111B21', borderRadius: '0 12px 12px 12px', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }
                    : { background: '#D9FDD3', color: '#111B21', borderRadius: '12px 0 12px 12px', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }
                  }
                >
                  {msg.text}
                  <span className="block text-right text-[8px] mt-0.5 opacity-50">
                    {msg.from === 'user' ? '✓✓' : ''}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {isAiTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="px-3 py-2 rounded-xl bg-white flex items-center gap-1" style={{ borderRadius: '0 12px 12px 12px' }}>
                {[0, 1, 2].map(i => (
                  <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-[#8696A0]"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.18 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Input bar */}
        <div className="px-3 py-2 flex items-center gap-2" style={{ background: '#F0F2F5' }}>
          <div className="flex-1 rounded-full px-4 py-2 text-[11px] text-[#8696A0] font-work bg-white">
            {t('اكتب رسالة...', 'Type a message...')}
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: '#00A884' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Bottom badge */}
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-full border w-fit mx-auto"
        style={{ background: 'rgba(0,191,255,0.08)', borderColor: 'rgba(0,191,255,0.25)' }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <span className={`text-[10px] ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.55)' }}>
          {t('يرد خلال ثانية واحدة', 'Replies within 1 second')}
        </span>
      </motion.div>
    </div>
  )
}

/* ── Animated counter ──────────────────────────────── */
const Counter = ({ to, suffix = '' }: { to: number; suffix?: string }) => {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let start = 0
        const step = to / 40
        const interval = setInterval(() => {
          start = Math.min(start + step, to)
          setVal(Math.round(start))
          if (start >= to) clearInterval(interval)
        }, 35)
        observer.disconnect()
      }
    })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [to])

  return <span ref={ref}>{val}{suffix}</span>
}

/* ── Hero ──────────────────────────────────────────── */
export const Hero = () => {
  const { t, language } = useLanguage()
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 600], [0, 60])
  const opacity = useTransform(scrollY, [0, 400], [1, 0])
  const heroRef = useRef(null)
  const heroInView = useInView(heroRef, { once: true })
  const headlineAr = useTextScramble('حوّل رسائل ومكالمات شركتك', heroInView, 0.3)
  const headlineAr2 = useTextScramble('إلى موظف مبيعات', heroInView, 0.6)
  const headlineAr3 = useTextScramble('يعمل 24/7', heroInView, 0.9)

  const trustPoints = [
    { icon: Zap,       ar: 'رد وحجز خلال ثواني',        en: 'Replies and books in seconds' },
    { icon: TrendingUp, ar: 'متابعة تلقائية للمهتمين',  en: 'Automatic lead follow-up' },
    { icon: Shield,    ar: 'تشغيل بدون تعقيد',           en: 'Launched without complexity' },
  ]

  const stats = [
    { val: 10, suffix: 'x', ar: 'أسرع في الرد عن موظف', en: 'Faster than a human agent' },
    { val: 68, suffix: '%', ar: 'زيادة معدل التقييمات', en: 'More reviews collected' },
    { val: 24, suffix: '/7', ar: 'تغطية بدون موظف إضافي', en: 'Coverage without extra staff' },
  ]

  return (
    <section ref={heroRef} id="hero" className="relative min-h-screen flex items-center overflow-hidden" style={{ paddingTop: '88px' }}>

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <DottedSurface className="opacity-20" />

        {/* Big Quantix-style aurora at top center */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top, rgba(0,191,255,0.22) 0%, rgba(0,153,204,0.1) 35%, transparent 70%)', filter: 'blur(40px)' }} />

        {/* Secondary glow right */}
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(0,191,255,0.08) 0%, transparent 65%)', filter: 'blur(60px)' }} />

        {/* Grid pattern */}
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(0,191,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,191,255,0.04) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />

        {/* Top gradient bar */}
        <div className="absolute top-0 inset-x-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(0,191,255,0.6) 50%, transparent 100%)' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-8 items-center py-10 lg:min-h-[calc(100vh-88px)] lg:py-0">

          {/* Left: Content */}
          <motion.div style={{ y, opacity }} className="flex flex-col gap-5 sm:gap-7 lg:py-0">

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center gap-2 w-fit px-4 py-2 rounded-full border"
              style={{
                background: 'rgba(0,191,255,0.08)',
                borderColor: 'rgba(0,191,255,0.3)',
              }}
            >
              <Sparkles size={13} style={{ color: '#00BFFF' }} />
              <span className={`text-xs font-medium ${language === 'ar' ? 'font-cairo' : 'font-work'}`} style={{ color: '#0099CC' }}>
                {t('مساعد AI يرد على واتساب والمكالمات', 'AI Assistant for WhatsApp and Calls')}
              </span>
            </motion.div>

            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="space-y-2"
            >
              <h1 className={`text-4xl sm:text-5xl xl:text-6xl font-bold leading-[1.15] tracking-tight text-white ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}>
                {language === 'ar' ? (
                  <>
                    {headlineAr}<br />
                    <span className="gradient-text-blue">{headlineAr2}</span><br />
                    {headlineAr3}
                  </>
                ) : (
                  <><span className="gradient-text-blue">Turn Messages and Calls</span><br />Into a 24/7<br />Sales Agent</>
                )}
              </h1>
            </motion.div>

            {/* Sub */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className={`text-base sm:text-lg leading-relaxed max-w-lg ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.62)' }}
            >
              {t(
                'نركّب لك مساعد AI يرد على واتساب والمكالمات، يحجز المواعيد، يتابع المهتمين، ويحوّل كل تواصل يومي إلى حجوزات ومبيعات من لوحة واحدة — بدون توظيف موظف جديد.',
                'We install an AI assistant that handles WhatsApp and phone calls, books appointments, follows up with leads, and turns daily conversations into bookings and sales from one dashboard — without hiring another employee.'
              )}
            </motion.p>

            {/* Trust points */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="flex flex-wrap gap-3"
            >
              {trustPoints.map(({ icon: Icon, ar, en }, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(0,191,255,0.08)', border: '1px solid rgba(0,191,255,0.22)' }}
                >
                  <Icon size={13} style={{ color: '#00BFFF' }} />
                  <span className={`text-xs ${language === 'ar' ? 'font-cairo' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.75)' }}>
                    {language === 'ar' ? ar : en}
                  </span>
                </div>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(0,191,255,0.35)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => openWhatsAppChat()}
                className={`flex items-center justify-center gap-2.5 px-6 py-3.5 sm:px-7 sm:py-4 rounded-xl text-white font-semibold text-base cursor-pointer ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
                style={{ background: 'linear-gradient(135deg, #0D1B3E 0%, #0099CC 100%)', boxShadow: '0 4px 24px rgba(0,153,204,0.35)' }}
              >
                <span>{t('احصل على خطة نمو مجانية', 'Get a Free Growth Plan')}</span>
                <ArrowRight size={16} className={language === 'ar' ? 'rotate-180' : ''} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, borderColor: 'rgba(255,255,255,0.2)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => window.open('https://noor-clinic-dashboard.netlify.app', '_blank', 'noopener,noreferrer')}
                className={`flex items-center justify-center gap-2 px-7 py-4 rounded-xl font-medium text-base cursor-pointer border transition-all ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
                style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.04)' }}
              >
                <Play size={14} style={{ color: '#00BFFF' }} />
                <span>{t('شاهد الداشبورد', 'View Dashboard')}</span>
              </motion.button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="flex gap-5 sm:gap-8 pt-1"
            >
              {stats.map(({ val, suffix, ar, en }, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <span className={`text-2xl font-bold text-white ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}>
                    <Counter to={val} suffix={suffix} />
                  </span>
                  <span className={`text-xs ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {language === 'ar' ? ar : en}
                  </span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: WhatsApp Chat Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex items-center justify-center"
          >
            <WaChatMockup language={language} t={t} />
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="w-px h-10 rounded-full" style={{ background: 'linear-gradient(to bottom, rgba(0,191,255,0.5), transparent)' }} />
      </motion.div>
    </section>
  )
}
