import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowDown, Zap, Car, Stethoscope, LayoutGrid, Rocket, Bot } from 'lucide-react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Navbar } from '../components/public/Navbar'
import { ProductsSection } from '../components/public/ProductsSection'
import { Footer } from '../components/public/Footer'
import { useLanguage } from '../context/LanguageContext'

gsap.registerPlugin(ScrollTrigger)

export const PlatformHome = () => {
  const { t, language } = useLanguage()

  const rootRef  = useRef<HTMLDivElement>(null)
  const scanRef  = useRef<HTMLDivElement>(null)
  const orb1Ref  = useRef<HTMLDivElement>(null)
  const orb2Ref  = useRef<HTMLDivElement>(null)

  const scrollToProducts = () =>
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })

  /* ─── Scan line + orb drift (GSAP continuous — no opacity:0 risk) ── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(scanRef.current, { y: '100vh', duration: 4, repeat: -1, ease: 'none', delay: 0.8 })
      gsap.to(orb1Ref.current, { y: -28, x: 18, duration: 5.5, repeat: -1, yoyo: true, ease: 'power1.inOut' })
      gsap.to(orb2Ref.current, { y: 22, x: -14, duration: 6.5, repeat: -1, yoyo: true, ease: 'power1.inOut', delay: 1 })
    }, rootRef)
    return () => ctx.revert()
  }, [])

  /* ─── Trust strip ScrollTrigger ──────────────────────── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.trust-chip', {
        y: 28, opacity: 0, stagger: 0.15, duration: 0.6, ease: 'power2.out',
        scrollTrigger: { trigger: '.trust-strip', start: 'top 88%' },
      })
    }, rootRef)
    return () => ctx.revert()
  }, [])

  /* ─── How It Works ScrollTrigger ────────────────────── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      /* Connector line draws */
      gsap.from('.connector-line', {
        scaleX: 0,
        transformOrigin: language === 'ar' ? 'right center' : 'left center',
        duration: 1.1, ease: 'power2.inOut',
        scrollTrigger: { trigger: '.steps-grid', start: 'top 80%' },
      })

      /* Cards stagger in */
      gsap.from('.step-card', {
        y: 40, opacity: 0, stagger: 0.14, duration: 0.65, ease: 'power2.out',
        scrollTrigger: { trigger: '.steps-grid', start: 'top 82%' },
      })
    }, rootRef)
    return () => ctx.revert()
  }, [language])

  const h1Text = language === 'ar'
    ? 'نظّم عملك. اترك الذكاء الاصطناعي يشغّله.'
    : 'Run Your Business. Let AI Operate It.'

  const accentWords = new Set(['الذكاء', 'الاصطناعي', 'AI'])

  return (
    <div ref={rootRef} style={{ background: '#05060A', minHeight: '100vh', direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      <Navbar />

      {/* ════ HERO ════ */}
      <section id="hero" className="relative flex items-center overflow-hidden"
        style={{ minHeight: '100vh', paddingTop: 100, paddingBottom: 60 }}>

        {/* Animated grid */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9 }}
          style={{
            backgroundImage: 'linear-gradient(rgba(0,191,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,191,255,0.035) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />

        {/* Scan line */}
        <div ref={scanRef} className="absolute inset-x-0 top-0 pointer-events-none" style={{ zIndex: 1 }}>
          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(0,191,255,0.5) 40%, rgba(0,191,255,0.8) 50%, rgba(0,191,255,0.5) 60%, transparent 100%)' }} />
          <div style={{ height: 80, background: 'linear-gradient(180deg, rgba(0,191,255,0.04), transparent)' }} />
        </div>

        {/* Orbs */}
        <div ref={orb1Ref} className="absolute pointer-events-none"
          style={{ top: '12%', left: '8%', width: 520, height: 420, background: 'radial-gradient(ellipse, rgba(0,191,255,0.08) 0%, transparent 70%)', filter: 'blur(55px)', willChange: 'transform' }} />
        <div ref={orb2Ref} className="absolute pointer-events-none"
          style={{ bottom: '18%', right: '6%', width: 420, height: 360, background: 'radial-gradient(ellipse, rgba(16,185,129,0.07) 0%, transparent 70%)', filter: 'blur(55px)', willChange: 'transform' }} />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* Text column */}
            <div className="flex flex-col items-center lg:items-start">
              {/* Badge */}
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-7"
                initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                style={{ background: 'rgba(0,191,255,0.08)', border: '1px solid rgba(0,191,255,0.25)' }}
              >
                <Zap size={12} style={{ color: '#00BFFF' }} />
                <span className={`text-xs font-semibold tracking-widest uppercase ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
                  style={{ color: '#00BFFF' }}>
                  AI Operating Systems
                </span>
              </motion.div>

              {/* H1 — split words with Framer Motion stagger */}
              <motion.h1
                className={`text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight flex flex-wrap justify-center lg:justify-start gap-x-3 gap-y-1 ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}
                initial="hidden" animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.06, delayChildren: 0.35 } } }}
              >
                {h1Text.split(' ').map((word, i) => (
                  <motion.span
                    key={i}
                    className="inline-block"
                    variants={{ hidden: { opacity: 0, y: 32 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } } }}
                    style={{ color: accentWords.has(word) ? '#00BFFF' : 'white' }}
                  >
                    {word}
                  </motion.span>
                ))}
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                className={`text-lg sm:text-xl max-w-xl mb-10 leading-relaxed text-center lg:text-start ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.72, ease: [0.16, 1, 0.3, 1] }}
                style={{ color: 'rgba(255,255,255,0.5)' }}>
                {t(
                  'منصة Madar OS — أنظمة تشغيل مبنية لكل قطاع. جاهزة للتشغيل الفوري. بدون تعقيد.',
                  'Madar OS Platform — purpose-built operating systems for every sector. Ready to run. No complexity.'
                )}
              </motion.p>

              {/* CTAs */}
              <motion.div
                className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.88, ease: [0.16, 1, 0.3, 1] }}
              >
                <button
                  onClick={scrollToProducts}
                  className={`flex items-center gap-2.5 px-8 py-4 rounded-2xl text-base font-semibold text-white cursor-pointer ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
                  style={{ background: 'linear-gradient(135deg, #0D1B3E, #0099CC)', boxShadow: '0 4px 24px rgba(0,153,204,0.35)' }}
                  onMouseEnter={e => gsap.to(e.currentTarget, { boxShadow: '0 0 36px rgba(0,191,255,0.5)', scale: 1.03, duration: 0.25 })}
                  onMouseLeave={e => gsap.to(e.currentTarget, { boxShadow: '0 4px 24px rgba(0,153,204,0.35)', scale: 1, duration: 0.25 })}
                >
                  <span>{t('استكشف المنتجات', 'Explore Products')}</span>
                  <ArrowDown size={16} />
                </button>
                <button
                  onClick={() => window.open('https://wa.me/966546666005', '_blank')}
                  className={`flex items-center gap-2 px-7 py-4 rounded-2xl text-base font-medium cursor-pointer ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
                  style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.65)' }}
                  onMouseEnter={e => gsap.to(e.currentTarget, { borderColor: 'rgba(255,255,255,0.3)', color: 'white', duration: 0.2 })}
                  onMouseLeave={e => gsap.to(e.currentTarget, { borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.65)', duration: 0.2 })}
                >
                  {t('احجز جلسة مجانية', 'Book a Free Session')}
                </button>
              </motion.div>

              {/* Stats */}
              <motion.div
                className="flex flex-wrap items-center justify-center lg:justify-start gap-0 mt-8"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 1.05, ease: [0.16, 1, 0.3, 1] }}
              >
                {[
                  { value: t('٢ قطاعات', '2 Sectors'),        label: t('مغاسل، عيادات', 'Car Wash · Clinic') },
                  { value: t('٢٤/٧', '24/7'),                  label: t('ذكاء اصطناعي لا ينام', 'AI never sleeps') },
                  { value: t('١١+ workflow', '11+ Workflows'),  label: t('أتمتة جاهزة', 'Automations ready') },
                ].map((s, i) => (
                  <div key={i} className="text-center lg:text-start px-6 py-2"
                    style={{ borderInlineStart: i > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                    <div className={`text-2xl font-bold ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}
                      style={{ color: '#00BFFF' }}>{s.value}</div>
                    <div className={`text-xs mt-1 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
                      style={{ color: 'rgba(255,255,255,0.32)' }}>{s.label}</div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Visual column — floating product preview cards */}
            <div className="hidden lg:flex flex-col gap-5">
              {/* Clinic OS card */}
              <motion.div
                animate={{ y: [-8, 8, -8] }}
                transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut' }}
                className="rounded-2xl p-5"
                style={{
                  background: 'rgba(16,185,129,0.06)',
                  border: '1px solid rgba(16,185,129,0.22)',
                  boxShadow: '0 20px 60px rgba(16,185,129,0.12)',
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #0D2B1E, #10B981)' }}>
                      <Stethoscope size={15} className="text-white" />
                    </div>
                    <span className={`text-sm font-bold text-white ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}>Clinic OS</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#4ADE80' }} />
                    <span className={`text-[10px] ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.35)' }}>{t('نشط', 'Live')}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { val: '١٨', lbl: t('موعد اليوم', "Today's appts") },
                    { val: '٧٨٪', lbl: t('تحويل المرضى', 'Patient rate') },
                    { val: '٠', lbl: t('حجز مزدوج', 'Double bookings') },
                    { val: '٢٤/٧', lbl: t('تغطية نورة', 'Nora coverage') },
                  ].map((m, i) => (
                    <div key={i} className="rounded-xl px-3 py-2.5"
                      style={{ background: 'rgba(16,185,129,0.08)' }}>
                      <div className={`text-base font-bold ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: '#10B981' }}>{m.val}</div>
                      <div className={`text-[10px] ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.38)' }}>{m.lbl}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.12)' }}>
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10B981' }} />
                  <span className={`text-[11px] text-white ${language === 'ar' ? 'font-cairo' : 'font-work'}`}>
                    {t('نورة — آخر حجز منذ ٣ دقائق', 'Nora — last booking 3 min ago')}
                  </span>
                </div>
              </motion.div>

              {/* Car Wash OS card */}
              <motion.div
                animate={{ y: [8, -8, 8] }}
                transition={{ repeat: Infinity, duration: 5.5, ease: 'easeInOut', delay: 1.5 }}
                className="rounded-2xl p-5 ms-8"
                style={{
                  background: 'rgba(0,191,255,0.06)',
                  border: '1px solid rgba(0,191,255,0.22)',
                  boxShadow: '0 20px 60px rgba(0,191,255,0.10)',
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #0D1B3E, #00BFFF)' }}>
                      <Car size={15} className="text-white" />
                    </div>
                    <span className={`text-sm font-bold text-white ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}>Car Wash OS</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#4ADE80' }} />
                    <span className={`text-[10px] ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.35)' }}>{t('نشط', 'Live')}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { val: '١٢', lbl: t('في الطابور', 'In queue') },
                    { val: '+٤٠', lbl: t('دقيقة توفير', 'Min saved/day') },
                    { val: '١١', lbl: 'WhatsApp flows' },
                    { val: '٣', lbl: t('يُشطَف الآن', 'Being washed') },
                  ].map((m, i) => (
                    <div key={i} className="rounded-xl px-3 py-2.5"
                      style={{ background: 'rgba(0,191,255,0.08)' }}>
                      <div className={`text-base font-bold ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: '#00BFFF' }}>{m.val}</div>
                      <div className={`text-[10px] ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.38)' }}>{m.lbl}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(0,191,255,0.05)', border: '1px solid rgba(0,191,255,0.12)' }}>
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00BFFF' }} />
                  <span className={`text-[11px] text-white ${language === 'ar' ? 'font-cairo' : 'font-work'}`}>
                    {t('الطابور: BMW سوداء • ١٠ دق', 'Queue: Black BMW • 10 min')}
                  </span>
                </div>
              </motion.div>
            </div>

          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 cursor-pointer" onClick={scrollToProducts}>
          <motion.div animate={{ y: [0, 7, 0] }} transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}>
            <ArrowDown size={18} style={{ color: 'rgba(255,255,255,0.18)' }} />
          </motion.div>
        </div>
      </section>

      {/* ════ TRUST STRIP ════ */}
      <section className="trust-strip py-12"
        style={{ background: '#07080F', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-5xl mx-auto px-4 flex flex-col items-center gap-7">

          {/* Decorated title row */}
          <div className="flex items-center gap-4 w-full max-w-xs">
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, rgba(255,255,255,0.12), transparent)' }} />
            <p className={`text-[11px] font-semibold tracking-[0.22em] uppercase whitespace-nowrap ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
              style={{ color: 'rgba(255,255,255,0.35)' }}>
              {t('في الإنتاج الآن', 'Live in Production')}
            </p>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(255,255,255,0.12), transparent)' }} />
          </div>

          {/* Client chips */}
          <div className="flex flex-wrap justify-center gap-5">
            {[
              {
                name:    t('مغسلة نايف', 'Nayef Car Wash'),
                product: 'Car Wash OS',
                metric:  t('+٤٠ دقيقة توفير / يوم', '+40 min saved / day'),
                accent:  '#00BFFF',
                Icon:    Car,
              },
              {
                name:    t('عيادات نور', 'Noor Clinics'),
                product: 'Clinic OS',
                metric:  t('٧٨٪ تحويل المرضى', '78% patient conversion'),
                accent:  '#10B981',
                Icon:    Stethoscope,
              },
            ].map((client, i) => (
              <div key={i} className="trust-chip flex items-center gap-4 px-6 py-4 rounded-2xl cursor-default"
                style={{ background: `${client.accent}0A`, border: `1px solid ${client.accent}22` }}
                onMouseEnter={e => gsap.to(e.currentTarget, { borderColor: `${client.accent}55`, background: `${client.accent}14`, duration: 0.25 })}
                onMouseLeave={e => gsap.to(e.currentTarget, { borderColor: `${client.accent}22`, background: `${client.accent}0A`, duration: 0.25 })}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${client.accent}20`, boxShadow: `0 4px 16px ${client.accent}22` }}>
                  <client.Icon size={17} style={{ color: client.accent }} />
                </div>
                <div>
                  <p className={`text-sm font-bold text-white leading-none mb-1 ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}>{client.name}</p>
                  <p className={`text-[11px] mb-0.5 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: client.accent }}>{client.product}</p>
                  <p className={`text-[10px] ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.3)' }}>{client.metric}</p>
                </div>
                <div className="flex flex-col items-center gap-1 ms-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#4ADE80', boxShadow: '0 0 6px #4ADE80' }} />
                  <span className={`text-[9px] font-semibold tracking-wider ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
                    style={{ color: '#4ADE80' }}>
                    {t('نشط', 'LIVE')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════ HOW IT WORKS ════ */}
      <section className="relative py-16 overflow-hidden" style={{ background: '#05060A' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.01) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.01) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }} />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span className={`text-[11px] font-semibold tracking-widest uppercase ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
                style={{ color: 'rgba(255,255,255,0.4)' }}>
                {t('كيف يعمل', 'How It Works')}
              </span>
            </div>
            <h2 className={`text-3xl sm:text-4xl font-bold text-white mb-3 ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}>
              {t('شلون يشتغل النظام؟', 'How Does It Work?')}
            </h2>
            <p className={`text-base max-w-md mx-auto ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
              style={{ color: 'rgba(255,255,255,0.4)' }}>
              {t('ثلاث خطوات بس — وبعدها النظام يشتغل بدونك.', 'Just three steps — then it runs without you.')}
            </p>
          </div>

          <div className="steps-grid grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Animated connector line */}
            <div className="connector-line hidden md:block absolute top-[56px] pointer-events-none"
              style={{
                left: '16%', right: '16%', height: 1,
                backgroundImage: 'repeating-linear-gradient(90deg, rgba(0,191,255,0.35) 0, rgba(0,191,255,0.35) 7px, transparent 7px, transparent 16px)',
              }} />

            {[
              {
                num: '١', Icon: LayoutGrid,
                title: { ar: 'اختار نظامك',             en: 'Pick Your System' },
                desc:  { ar: 'مغسلة أو عيادة — كل واحد عنده نظامه الخاص اللي يناسبه.', en: 'Car wash or clinic — each gets a system built just for it.' },
              },
              {
                num: '٢', Icon: Rocket,
                title: { ar: 'نحن نجهّزه في 48 ساعة',   en: 'We Set It Up in 48 Hours' },
                desc:  { ar: 'فريقنا يجهّز كل شيء. ما تحتاج تعرف أي شيء تقني.', en: 'Our team handles everything. Zero tech knowledge needed.' },
              },
              {
                num: '٣', Icon: Bot,
                title: { ar: 'اتفرج كيف يشتغل بدونك',   en: 'Watch It Run Without You' },
                desc:  { ar: 'الذكاء الاصطناعي يشتغل ٢٤/٧. أنت ترتاح وتجمع الفلوس.', en: 'AI runs 24/7. You rest and collect revenue.' },
              },
            ].map((step, i) => (
              <div
                key={i}
                className="step-card relative flex flex-col items-center text-center gap-4 p-7 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', transition: 'border-color 0.3s, background 0.3s' }}
                onMouseEnter={e => gsap.to(e.currentTarget, { borderColor: 'rgba(0,191,255,0.35)', background: 'rgba(0,191,255,0.04)', duration: 0.3 })}
                onMouseLeave={e => gsap.to(e.currentTarget, { borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.025)', duration: 0.3 })}
              >
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #0D1B3E, #0099CC)', boxShadow: '0 6px 24px rgba(0,153,204,0.3)' }}>
                    <step.Icon size={22} className="text-white" />
                  </div>
                  <div className="absolute -top-2 -end-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-sora"
                    style={{ background: '#00BFFF', color: '#050810' }}>
                    {step.num}
                  </div>
                </div>
                <h3 className={`text-lg font-bold text-white ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}>
                  {language === 'ar' ? step.title.ar : step.title.en}
                </h3>
                <p className={`text-sm leading-relaxed ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
                  style={{ color: 'rgba(255,255,255,0.48)' }}>
                  {language === 'ar' ? step.desc.ar : step.desc.en}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <ProductsSection />

      <Footer />
    </div>
  )
}
