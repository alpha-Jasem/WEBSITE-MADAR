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

  const rootRef    = useRef<HTMLDivElement>(null)
  const scanRef    = useRef<HTMLDivElement>(null)
  const orb1Ref    = useRef<HTMLDivElement>(null)
  const orb2Ref    = useRef<HTMLDivElement>(null)
  const gridRef    = useRef<HTMLDivElement>(null)
  const badgeRef   = useRef<HTMLDivElement>(null)
  const h1Ref      = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const ctasRef    = useRef<HTMLDivElement>(null)
  const statsRef   = useRef<HTMLDivElement>(null)

  const scrollToProducts = () =>
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })

  /* ─── Hero cinematic entrance ─────────────────────────── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      tl.from(gridRef.current, { opacity: 0, duration: 1 })
        .from(badgeRef.current, { y: -28, opacity: 0, duration: 0.55 }, '-=0.4')
        .from(h1Ref.current!.querySelectorAll('.word-split'),
          { y: 44, opacity: 0, stagger: 0.07, duration: 0.65 }, '-=0.2')
        .from(subtitleRef.current, { y: 20, opacity: 0, duration: 0.5 }, '-=0.3')
        .from(Array.from(ctasRef.current?.children ?? []),
          { y: 18, opacity: 0, stagger: 0.1, duration: 0.45, ease: 'back.out(1.6)' }, '-=0.25')
        .from(Array.from(statsRef.current?.children ?? []),
          { y: 14, opacity: 0, stagger: 0.1, duration: 0.4 }, '-=0.15')

      /* Scan line sweep */
      gsap.to(scanRef.current, {
        y: '100vh', duration: 4, repeat: -1, ease: 'none', delay: 0.8,
      })

      /* Orb drift */
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
      <section id="hero" className="relative flex flex-col items-center justify-center text-center overflow-hidden"
        style={{ minHeight: '100vh', paddingTop: 100 }}>

        {/* Animated grid */}
        <div ref={gridRef} className="absolute inset-0 pointer-events-none"
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

        <div className="relative z-10 max-w-4xl mx-auto px-4">
          {/* Badge */}
          <div ref={badgeRef}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-7"
            style={{ background: 'rgba(0,191,255,0.08)', border: '1px solid rgba(0,191,255,0.25)' }}
          >
            <Zap size={12} style={{ color: '#00BFFF' }} />
            <span className={`text-xs font-semibold tracking-widest uppercase ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
              style={{ color: '#00BFFF' }}>
              AI Operating Systems
            </span>
          </div>

          {/* H1 — split words */}
          <h1 ref={h1Ref}
            className={`text-4xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight flex flex-wrap justify-center gap-x-3 gap-y-1 ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}
          >
            {h1Text.split(' ').map((word, i) => (
              <span key={i} className="word-split inline-block"
                style={{ color: accentWords.has(word) ? '#00BFFF' : 'white' }}>
                {word}
              </span>
            ))}
          </h1>

          {/* Subtitle */}
          <p ref={subtitleRef}
            className={`text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
            style={{ color: 'rgba(255,255,255,0.5)' }}>
            {t(
              'منصة Madar OS — أنظمة تشغيل مبنية لكل قطاع. جاهزة للتشغيل الفوري. بدون تعقيد.',
              'Madar OS Platform — purpose-built operating systems for every sector. Ready to run. No complexity.'
            )}
          </p>

          {/* CTAs */}
          <div ref={ctasRef} className="flex flex-col sm:flex-row items-center justify-center gap-3">
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
          </div>

          {/* Stats */}
          <div ref={statsRef} className="flex flex-wrap items-center justify-center gap-0 mt-16">
            {[
              { value: t('٢ قطاعات', '2 Sectors'),        label: t('مغاسل، عيادات', 'Car Wash · Clinic') },
              { value: t('٢٤/٧', '24/7'),                  label: t('ذكاء اصطناعي لا ينام', 'AI that never sleeps') },
              { value: t('١١+ workflow', '11+ Workflows'),  label: t('أتمتة جاهزة', 'Automations ready') },
            ].map((s, i) => (
              <div key={i} className="text-center px-8 py-2"
                style={{ borderInlineStart: i > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                <div className={`text-2xl font-bold ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}
                  style={{ color: '#00BFFF' }}>{s.value}</div>
                <div className={`text-xs mt-1 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
                  style={{ color: 'rgba(255,255,255,0.32)' }}>{s.label}</div>
              </div>
            ))}
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
      <section className="trust-strip py-9"
        style={{ background: '#07080F', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-4xl mx-auto px-4 flex flex-col items-center gap-5">
          <p className={`text-[11px] font-semibold tracking-[0.22em] uppercase ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
            style={{ color: 'rgba(255,255,255,0.22)' }}>
            {t('يستخدمونه الآن', 'Live Right Now')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { name: t('مغسلة نايف', 'Nayef Car Wash'), product: 'Car Wash OS', accent: '#00BFFF', Icon: Car },
              { name: t('عيادات نور', 'Noor Clinics'),   product: 'Clinic OS',   accent: '#10B981', Icon: Stethoscope },
            ].map((client, i) => (
              <div key={i} className="trust-chip flex items-center gap-3 px-5 py-3 rounded-2xl cursor-default"
                style={{ background: `${client.accent}0A`, border: `1px solid ${client.accent}22` }}
                onMouseEnter={e => gsap.to(e.currentTarget, { borderColor: `${client.accent}55`, background: `${client.accent}14`, duration: 0.25 })}
                onMouseLeave={e => gsap.to(e.currentTarget, { borderColor: `${client.accent}22`, background: `${client.accent}0A`, duration: 0.25 })}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${client.accent}20` }}>
                  <client.Icon size={14} style={{ color: client.accent }} />
                </div>
                <div>
                  <p className={`text-sm font-bold text-white leading-none mb-0.5 ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}>{client.name}</p>
                  <p className="text-[10px] font-work" style={{ color: client.accent }}>{client.product}</p>
                </div>
                <div className="flex items-center gap-1.5 ms-2">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#4ADE80' }} />
                  <span className={`text-[10px] ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
                    style={{ color: 'rgba(255,255,255,0.32)' }}>
                    {t('نشط', 'Live')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════ HOW IT WORKS ════ */}
      <section className="relative py-24 overflow-hidden" style={{ background: '#05060A' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.01) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.01) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }} />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
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
            <div className="connector-line hidden md:block absolute top-[44px] pointer-events-none"
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
