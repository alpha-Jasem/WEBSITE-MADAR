import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Car, Stethoscope, LayoutGrid, Rocket, Bot,
  ArrowLeft, ArrowRight, Zap,
} from 'lucide-react'
import { Navbar }           from '../components/public/Navbar'
import { ProductsSection }  from '../components/public/ProductsSection'
import { StickyOutcomes }   from '../components/public/StickyOutcomes'
import { Pricing }          from '../components/public/Pricing'
import { Footer }           from '../components/public/Footer'
import { useLanguage }      from '../context/LanguageContext'

const EM = '#10B981'
const CY = '#0099CC'
const VI = '#7C3AED'

const fadeUp = (delay = 0) => ({
  initial   : { opacity: 0, y: 32 },
  animate   : { opacity: 1, y: 0  },
  transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] },
})

export const PlatformHome = () => {
  const { t, language } = useLanguage()
  const isAr = language === 'ar'
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight

  const heroRef  = useRef(null)
  const stepsRef = useRef(null)
  const heroInView  = useInView(heroRef,  { once: true })
  const stepsInView = useInView(stepsRef, { once: true, margin: '-80px' })

  const stats = [
    { value: '٢٤/٧', label: { ar: 'ذكاء لا ينام',      en: 'AI never sleeps'  }, color: EM  },
    { value: '٢',    label: { ar: 'قطاعات في الإنتاج', en: 'Sectors live'     }, color: 'white' },
    { value: '١١+',  label: { ar: 'تدفق أتمتة جاهز',    en: 'Automation flows' }, color: CY  },
  ]

  const clients = [
    { name: t('مغسلة نايف', 'Nayef Car Wash'), product: 'Car Wash OS', metric: t('+٤٠ دق/يوم', '+40 min/day'), accent: CY, Icon: Car         },
    { name: t('عيادات نور',  'Noor Clinics'),   product: 'Clinic OS',   metric: t('٧٨٪ تحويل',  '78% rate'),   accent: EM, Icon: Stethoscope  },
  ]

  const steps = [
    { num: '01', numAr: '١', Icon: LayoutGrid, accent: CY,
      title: { ar: 'اختار نظامك',         en: 'Pick Your System'      },
      desc : { ar: 'مغسلة أو عيادة — نظام مبني خصيصاً لقطاعك.', en: 'Car wash or clinic — a system built exactly for your sector.' },
    },
    { num: '02', numAr: '٢', Icon: Rocket, accent: EM,
      title: { ar: 'نجهّزه في ٤٨ ساعة',  en: 'Live in 48 Hours'      },
      desc : { ar: 'فريقنا يجهّز كل شيء. ما تحتاج تعرف شيء تقني.', en: 'Our team handles everything. Zero tech knowledge required.' },
    },
    { num: '03', numAr: '٣', Icon: Bot, accent: VI,
      title: { ar: 'يشتغل بدونك ٢٤/٧',  en: 'Runs 24/7 Without You' },
      desc : { ar: 'الذكاء الاصطناعي يشتغل دائماً. أنت ترتاح.', en: 'AI runs always. You rest and collect revenue.' },
    },
  ]

  return (
    <div style={{ background: '#050810', minHeight: '100vh', direction: isAr ? 'rtl' : 'ltr', overflowX: 'hidden' }}>

      {/* ══ AURORA ══ */}
      <div aria-hidden className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div style={{ position:'absolute', top:'-15%', left:'-5%', right:'-5%', height:'80vh',
          background:'radial-gradient(ellipse 90% 65% at 50% 0%, rgba(0,210,110,0.48) 0%, rgba(0,191,255,0.22) 40%, rgba(0,120,80,0.12) 65%, transparent 80%)',
          filter:'blur(52px)', animation:'aur-a 22s ease-in-out infinite', willChange:'transform' }} />
        <div style={{ position:'absolute', top:'-8%', left:'0%', width:640, height:700,
          background:'radial-gradient(ellipse, rgba(16,185,129,0.38) 0%, transparent 62%)',
          filter:'blur(55px)', animation:'aur-c 19s ease-in-out infinite', willChange:'transform' }} />
        <div style={{ position:'absolute', top:'-5%', right:'0%', width:580, height:640,
          background:'radial-gradient(ellipse, rgba(0,191,255,0.30) 0%, transparent 62%)',
          filter:'blur(55px)', animation:'aur-b 28s ease-in-out infinite', willChange:'transform' }} />
        <div style={{ position:'absolute', bottom:'5%', left:'25%', width:600, height:400,
          background:'radial-gradient(ellipse, rgba(124,58,237,0.18) 0%, transparent 65%)',
          filter:'blur(70px)', animation:'aur-a 24s ease-in-out infinite 5s', willChange:'transform' }} />
        <div style={{ position:'absolute', inset:0,
          backgroundImage:'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)',
          backgroundSize:'64px 64px' }} />
      </div>

      <Navbar />

      {/* ════════════════════════ HERO ════════════════════════ */}
      <section ref={heroRef} className="relative z-10 flex flex-col items-center text-center px-4 sm:px-6 lg:px-8"
        style={{ paddingTop: '10rem', paddingBottom: '5rem' }}>

        {/* Badge */}
        <motion.div {...fadeUp(0.1)} animate={heroInView ? { opacity:1, y:0 } : { opacity:0, y:32 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-7"
          style={{ background:'rgba(0,191,255,0.10)', border:'1px solid rgba(0,191,255,0.28)' }}>
          <Zap size={11} style={{ color: CY }} />
          <span className={`text-xs font-semibold tracking-widest uppercase ${isAr ? 'font-cairo' : 'font-work'}`}
            style={{ color: CY }}>
            AI Operating Systems
          </span>
        </motion.div>

        {/* H1 */}
        <motion.h1
          {...fadeUp(0.18)} animate={heroInView ? { opacity:1, y:0 } : { opacity:0, y:32 }}
          className={`text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.06] mb-6 max-w-4xl ${isAr ? 'font-cairo' : 'font-sora'}`}
          style={{ color: 'white', letterSpacing: '-0.025em' }}
        >
          {t(
            <>{`نظّم عملك.`}<br /><span style={{ background:`linear-gradient(135deg, ${EM} 30%, ${CY})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>دع الذكاء يشغّله.</span></>,
            <>{`Run Your Business.`}<br /><span style={{ background:`linear-gradient(135deg, ${EM} 30%, ${CY})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Let AI Operate It.</span></>
          )}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          {...fadeUp(0.26)} animate={heroInView ? { opacity:1, y:0 } : { opacity:0, y:32 }}
          className={`text-lg sm:text-xl max-w-xl mb-10 leading-relaxed ${isAr ? 'font-tajawal' : 'font-work'}`}
          style={{ color: 'rgba(255,255,255,0.45)' }}>
          {t(
            'أنظمة تشغيل مبنية لكل قطاع. جاهزة للتشغيل الفوري. بدون تعقيد.',
            'Purpose-built operating systems for every sector. Ready to run. Zero complexity.'
          )}
        </motion.p>

        {/* CTAs */}
        <motion.div
          {...fadeUp(0.33)} animate={heroInView ? { opacity:1, y:0 } : { opacity:0, y:32 }}
          className="flex flex-col sm:flex-row items-center gap-3 mb-14">
          <motion.button
            whileHover={{ scale:1.03, boxShadow:`0 0 36px ${CY}50` }}
            whileTap={{ scale:0.97 }}
            onClick={() => document.getElementById('products')?.scrollIntoView({ behavior:'smooth' })}
            className={`inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-white font-bold text-sm cursor-pointer ${isAr ? 'font-cairo' : 'font-work'}`}
            style={{ background:`linear-gradient(135deg, #0D1B3E, ${CY})`, boxShadow:`0 4px 24px ${CY}35` }}>
            {t('استكشف المنتجات', 'Explore Products')}
            <ArrowIcon size={15} />
          </motion.button>
          <motion.button
            whileHover={{ scale:1.02, borderColor:'rgba(255,255,255,0.28)', color:'white' }}
            whileTap={{ scale:0.97 }}
            onClick={() => window.open('https://wa.me/966546666005', '_blank')}
            className={`inline-flex items-center gap-2 px-7 py-4 rounded-2xl font-medium text-sm cursor-pointer transition-colors ${isAr ? 'font-cairo' : 'font-work'}`}
            style={{ border:'1px solid rgba(255,255,255,0.14)', color:'rgba(255,255,255,0.6)', background:'transparent' }}>
            {t('احجز جلسة مجانية', 'Book a Free Session')}
          </motion.button>
        </motion.div>

        {/* Stats — no cards, just text with dividers */}
        <motion.div
          {...fadeUp(0.4)} animate={heroInView ? { opacity:1, y:0 } : { opacity:0, y:32 }}
          className="flex flex-wrap items-center justify-center mb-16">
          {stats.map((s, i) => (
            <div key={i} className="text-center px-8 py-3"
              style={{ borderInlineStart: i > 0 ? '1px solid rgba(255,255,255,0.09)' : 'none' }}>
              <div className={`text-3xl font-black ${isAr ? 'font-cairo' : 'font-sora'}`}
                style={{ color: s.color, letterSpacing: '-1px' }}>{s.value}</div>
              <div className={`text-xs mt-1 ${isAr ? 'font-tajawal' : 'font-work'}`}
                style={{ color: 'rgba(255,255,255,0.28)' }}>
                {isAr ? s.label.ar : s.label.en}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Floating product cards — no border box, just cards floating */}
        <motion.div
          {...fadeUp(0.5)} animate={heroInView ? { opacity:1, y:0 } : { opacity:0, y:32 }}
          className="w-full max-w-3xl flex flex-col sm:flex-row gap-4 justify-center">

          {/* Car Wash OS card */}
          <motion.div
            animate={{ y: [-6, 6, -6] }} transition={{ repeat: Infinity, duration: 5, ease:'easeInOut' }}
            className="flex-1 rounded-2xl p-5"
            style={{ background:'rgba(5,8,18,0.60)', border:`1px solid ${CY}28`, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', boxShadow:`0 24px 60px rgba(0,0,0,0.4), 0 0 40px ${CY}0F` }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background:`linear-gradient(135deg, #0D1B3E, ${CY})` }}>
                  <Car size={14} className="text-white" />
                </div>
                <span className={`text-sm font-bold text-white ${isAr ? 'font-cairo' : 'font-sora'}`}>Car Wash OS</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background:'#4ADE80', animation:'pulse-live 2s ease-in-out infinite' }} />
                <span className={`text-[10px] ${isAr ? 'font-tajawal' : 'font-work'}`} style={{ color:'rgba(255,255,255,0.35)' }}>{t('نشط','Live')}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val:'١٢', lbl:{ ar:'في الطابور',    en:'In queue'    } },
                { val:'+٤٠', lbl:{ ar:'دقيقة/يوم',    en:'Min saved'   } },
                { val:'١١',  lbl:{ ar:'تدفق أتمتة',   en:'Workflows'   } },
                { val:'٣',   lbl:{ ar:'يُشطَف الآن',  en:'Being washed'} },
              ].map((m,i) => (
                <div key={i} className="rounded-xl px-3 py-2" style={{ background:`${CY}0D` }}>
                  <div className={`text-base font-black ${isAr ? 'font-cairo' : 'font-sora'}`} style={{ color: CY }}>{m.val}</div>
                  <div className={`text-[10px] ${isAr ? 'font-tajawal' : 'font-work'}`} style={{ color:'rgba(255,255,255,0.32)' }}>
                    {isAr ? m.lbl.ar : m.lbl.en}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Clinic OS card */}
          <motion.div
            animate={{ y: [6, -6, 6] }} transition={{ repeat: Infinity, duration: 5.5, ease:'easeInOut', delay: 1 }}
            className="flex-1 rounded-2xl p-5"
            style={{ background:'rgba(4,8,14,0.60)', border:`1px solid ${EM}28`, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', boxShadow:`0 24px 60px rgba(0,0,0,0.4), 0 0 40px ${EM}0F` }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background:`linear-gradient(135deg, #0D2B1E, ${EM})` }}>
                  <Stethoscope size={14} className="text-white" />
                </div>
                <span className={`text-sm font-bold text-white ${isAr ? 'font-cairo' : 'font-sora'}`}>Clinic OS</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background:'#4ADE80', animation:'pulse-live 2s ease-in-out infinite' }} />
                <span className={`text-[10px] ${isAr ? 'font-tajawal' : 'font-work'}`} style={{ color:'rgba(255,255,255,0.35)' }}>{t('نشط','Live')}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val:'١٨', lbl:{ ar:'موعد اليوم',   en:"Today's appts" } },
                { val:'٧٨٪', lbl:{ ar:'تحويل',       en:'Conversion'   } },
                { val:'٠',  lbl:{ ar:'تعارض',        en:'Conflicts'    } },
                { val:'٢٤/٧', lbl:{ ar:'تغطية',      en:'Coverage'     } },
              ].map((m,i) => (
                <div key={i} className="rounded-xl px-3 py-2" style={{ background:`${EM}0D` }}>
                  <div className={`text-base font-black ${isAr ? 'font-cairo' : 'font-sora'}`} style={{ color: EM }}>{m.val}</div>
                  <div className={`text-[10px] ${isAr ? 'font-tajawal' : 'font-work'}`} style={{ color:'rgba(255,255,255,0.32)' }}>
                    {isAr ? m.lbl.ar : m.lbl.en}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

        </motion.div>
      </section>

      {/* ════════════════════════ LIVE CLIENTS ════════════════════════ */}
      <section className="relative z-10 py-10"
        style={{ borderTop:'1px solid rgba(255,255,255,0.06)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-4xl mx-auto px-4 flex flex-col items-center gap-6">
          <p className={`text-[11px] font-semibold tracking-[0.25em] uppercase ${isAr ? 'font-cairo' : 'font-work'}`}
            style={{ color:'rgba(255,255,255,0.22)' }}>
            {t('في الإنتاج الآن', 'Live in Production')}
          </p>
          <div className="flex flex-wrap justify-center gap-10">
            {clients.map((c, i) => (
              <motion.div
                key={i}
                initial={{ opacity:0, y:14 }} whileInView={{ opacity:1, y:0 }}
                viewport={{ once:true }}
                transition={{ duration:0.5, delay: i * 0.1 }}
                className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background:'#4ADE80', boxShadow:'0 0 8px #4ADE80', animation:'pulse-live 2s ease-in-out infinite' }} />
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0`}
                  style={{ background:`${c.accent}18`, border:`1px solid ${c.accent}28` }}>
                  <c.Icon size={14} style={{ color: c.accent }} />
                </div>
                <div>
                  <span className={`text-sm font-bold text-white ${isAr ? 'font-cairo' : 'font-sora'}`}>{c.name}</span>
                  <span className={`text-xs mx-2 ${isAr ? 'font-tajawal' : 'font-work'}`} style={{ color: c.accent }}>{c.product}</span>
                  <span className={`text-xs ${isAr ? 'font-tajawal' : 'font-work'}`} style={{ color:'rgba(255,255,255,0.28)' }}>{c.metric}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════ HOW IT WORKS ════════════════════════ */}
      <section ref={stepsRef} className="relative z-10 py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <motion.div
            initial={{ opacity:0, y:20 }} animate={stepsInView ? { opacity:1, y:0 } : {}}
            transition={{ duration:0.55 }}
            className="text-center mb-20">
            <p className={`text-[11px] font-semibold tracking-[0.25em] uppercase mb-4 ${isAr ? 'font-cairo' : 'font-work'}`}
              style={{ color: VI }}>
              {t('كيف يعمل', 'How It Works')}
            </p>
            <h2 className={`text-4xl sm:text-5xl font-black text-white ${isAr ? 'font-cairo' : 'font-sora'}`}
              style={{ letterSpacing:'-0.025em' }}>
              {t('٣ خطوات — وبعدها يشتغل', '3 Steps — Then It Runs')}
            </h2>
          </motion.div>

          {/* Steps — open layout, no card borders */}
          <div className="relative grid grid-cols-1 md:grid-cols-3">
            {/* Horizontal connector line on desktop */}
            <div className="hidden md:block absolute top-12 pointer-events-none"
              style={{
                left:'20%', right:'20%', height:1,
                background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.10) 20%, rgba(255,255,255,0.10) 80%, transparent)',
              }} />

            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity:0, y:28 }} animate={stepsInView ? { opacity:1, y:0 } : {}}
                transition={{ duration:0.65, delay: i * 0.12, ease:[0.16,1,0.3,1] }}
                className="flex flex-col items-center text-center gap-5 px-8 py-10"
              >
                {/* Icon circle */}
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background:`${step.accent}18`, border:`1px solid ${step.accent}35`, boxShadow:`0 0 30px ${step.accent}18` }}>
                    <step.Icon size={22} style={{ color: step.accent }} />
                  </div>
                  {/* Step number badge */}
                  <div className="absolute -top-2 -end-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                    style={{ background: step.accent, color: '#050810' }}>
                    {isAr ? step.numAr : i + 1}
                  </div>
                </div>

                <h3 className={`text-lg font-bold text-white ${isAr ? 'font-cairo' : 'font-sora'}`}>
                  {isAr ? step.title.ar : step.title.en}
                </h3>
                <p className={`text-sm leading-relaxed max-w-xs ${isAr ? 'font-tajawal' : 'font-work'}`}
                  style={{ color:'rgba(255,255,255,0.4)' }}>
                  {isAr ? step.desc.ar : step.desc.en}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════ STICKY OUTCOMES ════════════════════════ */}
      <div className="relative z-10">
        <StickyOutcomes />
      </div>

      {/* ════════════════════════ PRICING ════════════════════════ */}
      <div className="relative z-10">
        <Pricing />
      </div>

      {/* Products */}
      <div className="relative z-10">
        <ProductsSection />
      </div>

      <Footer />
    </div>
  )
}
