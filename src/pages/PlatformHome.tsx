import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Car, Stethoscope, LayoutGrid, Rocket, Bot,
  ArrowLeft, ArrowRight, Zap, TrendingUp,
} from 'lucide-react'
import { Navbar }          from '../components/public/Navbar'
import { ProductsSection } from '../components/public/ProductsSection'
import { Footer }          from '../components/public/Footer'
import { useLanguage }     from '../context/LanguageContext'

/* ── Design tokens ─────────────────────────────── */
const BG   = '#050810'
const EM   = '#10B981'  // emerald
const CY   = '#0099CC'  // cyan / Madar blue
const VI   = '#7C3AED'  // violet

/* ── Glass card helper ─────────────────────────── */
const glassCard = (accent?: string): React.CSSProperties => ({
  background : 'rgba(255,255,255,0.035)',
  border     : `1px solid ${accent ? accent + '28' : 'rgba(255,255,255,0.07)'}`,
  boxShadow  : accent
    ? `inset 0 1px 0 ${accent}15, 0 1px 40px ${accent}08`
    : 'inset 0 1px 0 rgba(255,255,255,0.06)',
  backdropFilter       : 'blur(12px)',
  WebkitBackdropFilter : 'blur(12px)',
})

/* ── Framer variants ───────────────────────────── */
const fadeUp = (delay = 0) => ({
  initial   : { opacity: 0, y: 28 },
  animate   : { opacity: 1, y: 0  },
  transition: { duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] },
})

export const PlatformHome = () => {
  const { t, language } = useLanguage()
  const isAr = language === 'ar'
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight

  const heroRef  = useRef(null)
  const stepsRef = useRef(null)
  const heroInView  = useInView(heroRef,  { once: true })
  const stepsInView = useInView(stepsRef, { once: true, margin: '-80px' })

  /* ── Step data ─────────────────────────────── */
  const steps = [
    {
      num: '01', numAr: '١', Icon: LayoutGrid, accent: CY,
      title: { ar: 'اختار نظامك',          en: 'Pick Your System'       },
      desc : { ar: 'مغسلة أو عيادة — كل واحد عنده نظامه الخاص اللي يناسبه تماماً.', en: 'Car wash or clinic — each gets a system built exactly for it.' },
    },
    {
      num: '02', numAr: '٢', Icon: Rocket, accent: EM,
      title: { ar: 'نجهّزه في ٤٨ ساعة',    en: 'Live in 48 Hours'       },
      desc : { ar: 'فريقنا يجهّز كل شيء. ما تحتاج تعرف أي شيء تقني.', en: 'Our team handles everything. Zero tech knowledge needed.' },
    },
    {
      num: '03', numAr: '٣', Icon: Bot, accent: VI,
      title: { ar: 'يشتغل بدونك ٢٤/٧',     en: 'Runs 24/7 Without You'  },
      desc : { ar: 'الذكاء الاصطناعي يشتغل دائماً. أنت ترتاح وتجمع الفلوس.', en: 'AI runs always. You rest and collect revenue.' },
    },
  ]

  return (
    <div style={{ background: BG, minHeight: '100vh', direction: isAr ? 'rtl' : 'ltr', position: 'relative', overflowX: 'hidden' }}>

      {/* ══ AURORA LAYER (fixed, behind everything) ══ */}
      <div aria-hidden className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div style={{ position:'absolute', top:'2%', left:'2%', width:780, height:650,
          background:`radial-gradient(ellipse, ${EM}1C 0%, transparent 65%)`,
          filter:'blur(90px)', animation:'aur-a 22s ease-in-out infinite', willChange:'transform' }} />
        <div style={{ position:'absolute', top:'25%', right:'0%', width:680, height:580,
          background:`radial-gradient(ellipse, ${CY}18 0%, transparent 65%)`,
          filter:'blur(90px)', animation:'aur-b 28s ease-in-out infinite', willChange:'transform' }} />
        <div style={{ position:'absolute', bottom:'8%', left:'22%', width:560, height:440,
          background:`radial-gradient(ellipse, ${VI}14 0%, transparent 65%)`,
          filter:'blur(90px)', animation:'aur-c 19s ease-in-out infinite', willChange:'transform' }} />
        {/* Subtle noise-like grid */}
        <div style={{ position:'absolute', inset:0,
          backgroundImage:'linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)',
          backgroundSize:'64px 64px' }} />
      </div>

      <Navbar />

      {/* ════════════════════════ BENTO HERO ════════════════════════ */}
      <section ref={heroRef} className="relative z-10 pt-28 pb-10 min-h-screen flex items-center">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-5 lg:px-8">

          {/* ── 12-column bento grid ── */}
          <div className="grid grid-cols-2 lg:grid-cols-12 gap-3 items-start">

            {/* ┌── CARD 1: Main hero (7 col × 2 rows on desktop) ─────┐ */}
            <motion.div
              {...fadeUp(0)} animate={heroInView ? { opacity:1, y:0 } : { opacity:0, y:28 }}
              className="col-span-2 lg:col-span-7 lg:row-span-2 rounded-3xl p-8 sm:p-10 flex flex-col justify-center gap-0"
              style={{ ...glassCard(), minHeight: 340 }}
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-6 self-start"
                style={{ background:`${CY}12`, border:`1px solid ${CY}30` }}>
                <Zap size={11} style={{ color: CY }} />
                <span className={`text-[11px] font-semibold tracking-widest uppercase ${isAr ? 'font-cairo' : 'font-work'}`}
                  style={{ color: CY }}>
                  AI Operating Systems
                </span>
              </div>

              {/* H1 */}
              <h1 className={`text-4xl sm:text-5xl xl:text-6xl font-black leading-[1.08] mb-5 ${isAr ? 'font-cairo' : 'font-sora'}`}
                style={{ color: 'white', letterSpacing: '-0.02em' }}>
                {t(
                  <>{`نظّم عملك.`}<br /><span style={{ background:`linear-gradient(135deg, ${EM}, ${CY})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>دع الذكاء يشغّله.</span></>,
                  <>{`Run Your Business.`}<br /><span style={{ background:`linear-gradient(135deg, ${EM}, ${CY})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Let AI Operate It.</span></>
                )}
              </h1>

              {/* Subtitle */}
              <p className={`text-base sm:text-lg max-w-xl mb-8 leading-relaxed ${isAr ? 'font-tajawal' : 'font-work'}`}
                style={{ color: 'rgba(255,255,255,0.42)' }}>
                {t(
                  'Madar OS — أنظمة تشغيل مبنية لكل قطاع. جاهزة للتشغيل الفوري. بدون تعقيد.',
                  'Madar OS — purpose-built operating systems for every sector. Ready to run. Zero complexity.'
                )}
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3">
                <motion.button
                  whileHover={{ scale:1.02, boxShadow:`0 0 32px ${CY}45` }}
                  whileTap={{ scale:0.97 }}
                  onClick={() => document.getElementById('products')?.scrollIntoView({ behavior:'smooth' })}
                  className={`inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-white font-semibold text-sm cursor-pointer ${isAr ? 'font-cairo' : 'font-work'}`}
                  style={{ background:`linear-gradient(135deg, #0D1B3E, ${CY})`, boxShadow:`0 4px 20px ${CY}30` }}
                >
                  {t('استكشف المنتجات', 'Explore Products')}
                  <ArrowIcon size={14} />
                </motion.button>
                <motion.button
                  whileHover={{ scale:1.02 }}
                  whileTap={{ scale:0.97 }}
                  onClick={() => window.open('https://wa.me/966546666005', '_blank')}
                  className={`inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl font-medium text-sm cursor-pointer ${isAr ? 'font-cairo' : 'font-work'}`}
                  style={{ border:'1px solid rgba(255,255,255,0.13)', color:'rgba(255,255,255,0.58)', background:'transparent' }}
                >
                  {t('احجز جلسة مجانية', 'Book a Free Session')}
                </motion.button>
              </div>
            </motion.div>

            {/* ┌── CARD 2: Stat 24/7 (3 col) ─────────────────────────┐ */}
            <motion.div
              {...fadeUp(0.12)} animate={heroInView ? { opacity:1, y:0 } : { opacity:0, y:28 }}
              className="col-span-1 lg:col-span-3 rounded-3xl p-6 flex flex-col justify-between"
              style={{ ...glassCard(EM), minHeight: 160 }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background:`${EM}20` }}>
                <Bot size={16} style={{ color: EM }} />
              </div>
              <div>
                <div className={`text-4xl sm:text-5xl font-black ${isAr ? 'font-cairo' : 'font-sora'}`}
                  style={{ color: EM, letterSpacing: '-2px' }}>
                  ٢٤/٧
                </div>
                <div className={`text-xs mt-1 ${isAr ? 'font-tajawal' : 'font-work'}`}
                  style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {t('ذكاء لا ينام', 'AI Never Sleeps')}
                </div>
              </div>
            </motion.div>

            {/* ┌── CARD 3: Sectors (2 col) ────────────────────────────┐ */}
            <motion.div
              {...fadeUp(0.18)} animate={heroInView ? { opacity:1, y:0 } : { opacity:0, y:28 }}
              className="col-span-1 lg:col-span-2 rounded-3xl p-6 flex flex-col justify-between"
              style={{ ...glassCard(CY), minHeight: 160 }}
            >
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background:`${CY}20` }}>
                  <Car size={13} style={{ color: CY }} />
                </div>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background:`${EM}20` }}>
                  <Stethoscope size={13} style={{ color: EM }} />
                </div>
              </div>
              <div>
                <div className={`text-4xl sm:text-5xl font-black ${isAr ? 'font-cairo' : 'font-sora'}`}
                  style={{ color: 'white', letterSpacing: '-2px' }}>
                  ٢
                </div>
                <div className={`text-xs mt-1 ${isAr ? 'font-tajawal' : 'font-work'}`}
                  style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {t('قطاعات نشطة', 'Active Sectors')}
                </div>
              </div>
            </motion.div>

            {/* ┌── CARD 4: Live clients (5 col) ────────────────────────┐ */}
            <motion.div
              {...fadeUp(0.25)} animate={heroInView ? { opacity:1, y:0 } : { opacity:0, y:28 }}
              className="col-span-2 lg:col-span-5 rounded-3xl p-5"
              style={glassCard()}
            >
              <p className={`text-[10px] font-semibold tracking-[0.2em] uppercase mb-3 ${isAr ? 'font-cairo' : 'font-work'}`}
                style={{ color: 'rgba(255,255,255,0.22)' }}>
                {t('في الإنتاج الآن', 'Live in Production')}
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5">
                {[
                  { name: t('مغسلة نايف', 'Nayef Car Wash'), product: 'Car Wash OS', metric: t('+٤٠ دق / يوم', '+40 min/day'), accent: CY, Icon: Car   },
                  { name: t('عيادات نور', 'Noor Clinics'),   product: 'Clinic OS',   metric: t('٧٨٪ تحويل',   '78% rate'),    accent: EM, Icon: Stethoscope },
                ].map((c, i) => (
                  <div key={i} className="flex-1 flex items-center gap-3 p-3.5 rounded-2xl"
                    style={{ background:`${c.accent}0A`, border:`1px solid ${c.accent}20` }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background:`${c.accent}20` }}>
                      <c.Icon size={15} style={{ color: c.accent }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold text-white truncate ${isAr ? 'font-cairo' : 'font-sora'}`}>{c.name}</p>
                      <p className={`text-[10px] ${isAr ? 'font-tajawal' : 'font-work'}`} style={{ color: c.accent }}>{c.product}</p>
                      <p className={`text-[10px] ${isAr ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.28)' }}>{c.metric}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <div className="w-2 h-2 rounded-full" style={{ background:'#4ADE80', boxShadow:'0 0 6px #4ADE80', animation:'pulse-live 2s ease-in-out infinite' }} />
                      <span className={`text-[9px] font-bold ${isAr ? 'font-cairo' : 'font-work'}`} style={{ color:'#4ADE80' }}>
                        {t('نشط', 'LIVE')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

          </div>{/* end bento grid */}
        </div>
      </section>

      {/* ════════════════════════ HOW IT WORKS ════════════════════════ */}
      <section ref={stepsRef} className="relative z-10 py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 lg:px-8">

          {/* Header */}
          <motion.div
            initial={{ opacity:0, y:20 }} animate={stepsInView ? { opacity:1, y:0 } : {}}
            transition={{ duration:0.55 }}
            className="text-center mb-14"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
              style={{ background:`${VI}18`, border:`1px solid ${VI}35` }}>
              <TrendingUp size={10} style={{ color: VI }} />
              <span className={`text-[11px] font-semibold tracking-widest uppercase ${isAr ? 'font-cairo' : 'font-work'}`}
                style={{ color: VI }}>
                {t('كيف يعمل', 'How It Works')}
              </span>
            </div>
            <h2 className={`text-3xl sm:text-4xl font-black text-white mb-3 ${isAr ? 'font-cairo' : 'font-sora'}`}
              style={{ letterSpacing: '-0.02em' }}>
              {t('٣ خطوات — وبعدها يشتغل', '3 Steps — Then It Runs')}
            </h2>
            <p className={`text-base max-w-sm mx-auto ${isAr ? 'font-tajawal' : 'font-work'}`}
              style={{ color: 'rgba(255,255,255,0.32)' }}>
              {t('ما تحتاج تعرف أي شيء تقني.', 'Zero tech knowledge needed.')}
            </p>
          </motion.div>

          {/* Step bento cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity:0, y:36 }} animate={stepsInView ? { opacity:1, y:0 } : {}}
                transition={{ duration:0.6, delay: i * 0.1, ease:[0.16,1,0.3,1] }}
                whileHover={{ y:-5, transition:{ duration:0.2 } }}
                className="relative overflow-hidden rounded-3xl p-7 flex flex-col gap-5"
                style={glassCard(step.accent)}
              >
                {/* Giant background number */}
                <div aria-hidden className="absolute bottom-0 end-3 pointer-events-none select-none leading-none"
                  style={{
                    fontSize: 130, fontWeight: 900,
                    color: `${step.accent}07`,
                    fontFamily: 'Sora, sans-serif',
                    lineHeight: 0.85,
                  }}>
                  {isAr ? step.numAr : step.num}
                </div>

                {/* Top accent line */}
                <div className="absolute top-0 inset-x-0 h-px"
                  style={{ background:`linear-gradient(90deg, transparent, ${step.accent}60, transparent)` }} />

                {/* Icon */}
                <div className="relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background:`${step.accent}20`, boxShadow:`0 6px 20px ${step.accent}20` }}>
                  <step.Icon size={20} style={{ color: step.accent }} />
                </div>

                <div className="relative z-10">
                  <h3 className={`text-lg font-bold text-white mb-2 ${isAr ? 'font-cairo' : 'font-sora'}`}>
                    {isAr ? step.title.ar : step.title.en}
                  </h3>
                  <p className={`text-sm leading-relaxed ${isAr ? 'font-tajawal' : 'font-work'}`}
                    style={{ color: 'rgba(255,255,255,0.42)' }}>
                    {isAr ? step.desc.ar : step.desc.en}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════ PRODUCTS ════════════════════════ */}
      <div className="relative z-10">
        <ProductsSection />
      </div>

      <Footer />
    </div>
  )
}
