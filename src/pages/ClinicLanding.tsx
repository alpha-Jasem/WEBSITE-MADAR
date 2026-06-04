import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Stethoscope, Calendar, Bot, Shield, BarChart3,
  ArrowLeft, ArrowRight, Check, Clock, Users, Phone, MessageSquare,
  Sparkles, TrendingUp, Zap,
} from 'lucide-react'
import { Navbar }           from '../components/public/Navbar'
import { Footer }           from '../components/public/Footer'
import { ClinicDashMockup } from '../components/public/ClinicDashMockup'
import { MadarAgentWidget } from '../components/dash/MadarAgentWidget'
import { useLanguage }      from '../context/LanguageContext'
import { openWhatsAppChat } from '../lib/whatsapp'

/* ── Design tokens ─────────────────────────────── */
const BG     = '#F8FAFC'
const WHITE  = '#FFFFFF'
const EM     = '#10B981'
const EM2    = '#059669'
const EM_LT  = '#F0FDF8'  // emerald-50 tint
const CY     = '#0099CC'
const DARK   = '#0F172A'
const MID    = '#475569'
const BORDER = '#E2E8F0'
const EM_BORDER = '#A7F3D0'

const fadeUp = (delay = 0) => ({
  initial   : { opacity: 0, y: 28 },
  animate   : { opacity: 1, y: 0 },
  transition: { duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] },
})

const features = [
  {
    icon: Bot, accent: EM,
    ar: { title: 'مساعد استقبال ذكي ٢٤/٧', desc: 'يستقبل المكالمات والواتساب، يحدد الخدمة، يتحقق من توفر الدكتور، ويحجز في ثوانٍ — بلهجة عربية طبيعية.' },
    en: { title: 'AI Receptionist 24/7',    desc: 'Handles calls and WhatsApp, identifies service, checks availability, books in seconds — in natural Arabic.' },
  },
  {
    icon: Calendar, accent: CY,
    ar: { title: 'حجز بدون تعارض',   desc: 'فهرس فريد على (دكتور، تاريخ، وقت) يمنع الحجز المزدوج تلقائياً — مهما كان عدد القنوات.' },
    en: { title: 'Zero Double-Booking', desc: 'A unique index on (doctor, date, time) prevents conflicts automatically — regardless of how many channels.' },
  },
  {
    icon: Shield, accent: '#8B5CF6',
    ar: { title: 'تكامل ذكي مع التقويم', desc: 'مصدر حقيقة واحد يدير جميع القنوات — الحجز ينجح تلقائياً ودائماً، بغض النظر عن أي خلل خارجي.' },
    en: { title: 'Smart Calendar Sync',   desc: 'A single source of truth manages all channels — booking succeeds reliably even if any external service fails.' },
  },
  {
    icon: BarChart3, accent: EM,
    ar: { title: 'داشبورد إدارة المواعيد', desc: 'KPIs لحظية، تقويم شهري، قائمة المرضى، تقارير الأطباء — كل شيء يتحدث فورياً في مكان واحد.' },
    en: { title: 'Appointment Dashboard',  desc: 'Live KPIs, monthly calendar, patient list, doctor reports — everything updates instantly in one place.' },
  },
]

const metrics = [
  { icon: Clock,  before:{ ar:'٣+ ساعات',    en:'3+ Hours'    }, after:{ ar:'< دقيقة', en:'< 1 Min' }, label:{ ar:'وقت تأكيد الحجز', en:'Booking confirm' } },
  { icon: Users,  before:{ ar:'٤٠٪',          en:'40%'         }, after:{ ar:'٠٪',      en:'0%'      }, label:{ ar:'حجوزات ضائعة',   en:'Missed bookings' } },
  { icon: Bot,    before:{ ar:'ساعات العمل',  en:'Work hours'  }, after:{ ar:'٢٤/٧',    en:'24/7'    }, label:{ ar:'تغطية الاستقبال', en:'Reception cover' } },
]

export const ClinicLanding = () => {
  const { t, language } = useLanguage()
  const isAr    = language === 'ar'
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight

  const heroRef     = useRef(null)
  const featuresRef = useRef(null)
  const stepsRef    = useRef(null)
  const caseRef     = useRef(null)

  const heroInView     = useInView(heroRef,     { once: true })
  const featuresInView = useInView(featuresRef, { once: true, margin: '-60px' })
  const stepsInView    = useInView(stepsRef,    { once: true, margin: '-60px' })
  const caseInView     = useInView(caseRef,     { once: true, margin: '-60px' })

  const stats = [
    { value: '٢٤/٧',  label: { ar: 'استقبال بلا توقف',  en: 'Always receiving'  }, color: EM    },
    { value: '٧٨٪',   label: { ar: 'معدل التحويل',       en: 'Conversion rate'   }, color: DARK  },
    { value: '٠',     label: { ar: 'حجوزات متعارضة',     en: 'Double bookings'   }, color: CY   },
  ]

  const chips = [
    { ar:'حجز بدون تعارض', en:'Zero double-booking' },
    { ar:'تغطية ٢٤/٧',     en:'24/7 coverage'       },
    { ar:'تأكيد فوري',      en:'Instant confirmation' },
    { ar:'تقارير لحظية',    en:'Live reports'         },
  ]

  return (
    <div style={{ background: BG, minHeight:'100vh', direction: isAr ? 'rtl' : 'ltr', overflowX:'hidden' }}>

      {/* Subtle top accent */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: 0, left: '-10%', right: '-10%', height: '55vh',
          background: 'radial-gradient(ellipse 80% 60% at 50% -5%, rgba(16,185,129,0.09) 0%, rgba(0,153,204,0.05) 50%, transparent 75%)',
        }} />
      </div>

      <Navbar />

      {/* ════════════════════════ HERO ════════════════════════ */}
      <section ref={heroRef} className="relative z-10 flex flex-col items-center text-center px-4 sm:px-6 lg:px-8"
        style={{ paddingTop: '10rem', paddingBottom: '4rem' }}>

        {/* Badge */}
        <motion.div {...fadeUp(0.1)} animate={heroInView ? { opacity:1, y:0 } : { opacity:0, y:28 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-7"
          style={{ background: EM_LT, border: `1px solid ${EM_BORDER}` }}>
          <Zap size={11} style={{ color: EM }} />
          <span className={`text-xs font-semibold tracking-widest uppercase ${isAr ? 'font-cairo' : 'font-work'}`}
            style={{ color: EM }}>
            Clinic OS — Madar
          </span>
        </motion.div>

        {/* H1 */}
        <motion.h1
          {...fadeUp(0.18)} animate={heroInView ? { opacity:1, y:0 } : { opacity:0, y:28 }}
          className={`text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.06] mb-6 max-w-4xl ${isAr ? 'font-cairo' : 'font-sora'}`}
          style={{ color: DARK, letterSpacing: '-0.025em' }}
        >
          {t(
            <>{`نظّم عيادتك.`}<br /><span style={{ background:`linear-gradient(135deg, ${EM} 30%, ${CY})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>دع الذكاء يحجز.</span></>,
            <>{`Manage Your Clinic.`}<br /><span style={{ background:`linear-gradient(135deg, ${EM} 30%, ${CY})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Let AI Book.</span></>
          )}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          {...fadeUp(0.26)} animate={heroInView ? { opacity:1, y:0 } : { opacity:0, y:28 }}
          className={`text-lg sm:text-xl max-w-xl mb-8 leading-relaxed ${isAr ? 'font-tajawal' : 'font-work'}`}
          style={{ color: MID }}>
          {t(
            'مساعد استقبال بالذكاء الاصطناعي يعمل ٢٤/٧ — يحجز المواعيد بدون تعارض، ويدير المرضى من لوحة واحدة. بدون موظف إضافي.',
            'An AI receptionist running 24/7 — books appointments without conflicts and manages patients from one dashboard. No extra staff needed.'
          )}
        </motion.p>

        {/* Chips */}
        <motion.div
          {...fadeUp(0.3)} animate={heroInView ? { opacity:1, y:0 } : { opacity:0, y:28 }}
          className="flex flex-wrap justify-center gap-2 mb-9">
          {chips.map((c, i) => (
            <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: EM_LT, border: `1px solid ${EM_BORDER}` }}>
              <Check size={9} strokeWidth={3} style={{ color: EM }} />
              <span className={`text-xs font-medium ${isAr ? 'font-tajawal' : 'font-work'}`}
                style={{ color: '#065F46' }}>
                {isAr ? c.ar : c.en}
              </span>
            </div>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div
          {...fadeUp(0.36)} animate={heroInView ? { opacity:1, y:0 } : { opacity:0, y:28 }}
          className="flex flex-col sm:flex-row items-center gap-3 mb-14">
          <motion.button
            whileHover={{ scale:1.03, boxShadow:`0 8px 32px ${EM}40` }}
            whileTap={{ scale:0.97 }}
            onClick={() => openWhatsAppChat()}
            className={`inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-white font-bold text-sm cursor-pointer ${isAr ? 'font-cairo' : 'font-work'}`}
            style={{ background:`linear-gradient(135deg, ${EM2}, ${EM})`, boxShadow:`0 4px 20px ${EM}35` }}>
            {t('احجز عرضاً توضيحياً', 'Book a Demo')}
            <ArrowIcon size={15} />
          </motion.button>
          <motion.button
            whileHover={{ scale:1.02, borderColor: EM, color: EM }}
            whileTap={{ scale:0.97 }}
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior:'smooth' })}
            className={`inline-flex items-center gap-2 px-7 py-4 rounded-2xl font-medium text-sm cursor-pointer transition-colors ${isAr ? 'font-cairo' : 'font-work'}`}
            style={{ border:`1px solid ${BORDER}`, color: MID, background:'transparent' }}>
            {t('اكتشف المزايا', 'Explore Features')}
          </motion.button>
        </motion.div>

        {/* Stats — no cards, dividers */}
        <motion.div
          {...fadeUp(0.42)} animate={heroInView ? { opacity:1, y:0 } : { opacity:0, y:28 }}
          className="flex flex-wrap items-center justify-center mb-16">
          {stats.map((s, i) => (
            <div key={i} className="text-center px-8 py-3"
              style={{ borderInlineStart: i > 0 ? `1px solid ${BORDER}` : 'none' }}>
              <div className={`text-3xl font-black ${isAr ? 'font-cairo' : 'font-sora'}`}
                style={{ color: s.color, letterSpacing: '-1px' }}>{s.value}</div>
              <div className={`text-xs mt-1 ${isAr ? 'font-tajawal' : 'font-work'}`}
                style={{ color: '#94A3B8' }}>
                {isAr ? s.label.ar : s.label.en}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Dashboard mockup — full width browser frame */}
        <motion.div
          {...fadeUp(0.52)} animate={heroInView ? { opacity:1, y:0 } : { opacity:0, y:28 }}
          className="w-full max-w-5xl rounded-3xl overflow-hidden"
          style={{
            boxShadow: `0 40px 80px rgba(15,23,42,0.12), 0 8px 24px rgba(15,23,42,0.06)`,
            border: `1px solid ${BORDER}`,
          }}>
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-4 py-3"
            style={{ background: '#F1F5F9', borderBottom: `1px solid ${BORDER}` }}>
            <div className="flex gap-1.5">
              {['#FCA5A5','#FCD34D','#6EE7B7'].map((c,i) => (
                <div key={i} className="w-3 h-3 rounded-full" style={{ background: c }} />
              ))}
            </div>
            <div className="flex-1 mx-4 px-3 py-1 rounded-lg text-xs text-center"
              style={{ background: WHITE, border: `1px solid ${BORDER}`, color: '#94A3B8', fontFamily:'monospace' }}>
              app.madar.software/clinic
            </div>
          </div>
          <ClinicDashMockup />
        </motion.div>
      </section>

      {/* ════════════════════════ FEATURES ════════════════════════ */}
      <section id="features" ref={featuresRef} className="relative z-10 py-28"
        style={{ background: WHITE, borderTop:`1px solid ${BORDER}`, borderBottom:`1px solid ${BORDER}` }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          <motion.div
            initial={{ opacity:0, y:20 }} animate={featuresInView ? { opacity:1, y:0 } : {}}
            transition={{ duration:0.55 }}
            className="text-center mb-20">
            <p className={`text-[11px] font-semibold tracking-[0.25em] uppercase mb-4 ${isAr ? 'font-cairo' : 'font-work'}`}
              style={{ color: EM }}>
              {t('المزايا', 'Features')}
            </p>
            <h2 className={`text-4xl sm:text-5xl font-black mb-4 ${isAr ? 'font-cairo' : 'font-sora'}`}
              style={{ color: DARK, letterSpacing:'-0.025em' }}>
              {t('نظام مبني خصيصاً للعيادات', 'Purpose-Built for Clinics')}
            </h2>
            <p className={`text-base max-w-md mx-auto ${isAr ? 'font-tajawal' : 'font-work'}`}
              style={{ color: MID }}>
              {t('ليس بوت عام — كل ميزة مصممة لاحتياجات العيادة الخليجية.', 'Not a generic bot — every feature designed for Gulf clinic needs.')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
            {features.map((f, i) => {
              const Icon = f.icon
              const c = isAr ? f.ar : f.en
              return (
                <motion.div
                  key={i}
                  initial={{ opacity:0, y:28 }} animate={featuresInView ? { opacity:1, y:0 } : {}}
                  transition={{ duration:0.6, delay: i * 0.09, ease:[0.16,1,0.3,1] }}
                  className="flex gap-5 items-start">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      background: `${f.accent}12`,
                      border: `1px solid ${f.accent}28`,
                      boxShadow: `0 4px 16px ${f.accent}10`,
                    }}>
                    <Icon size={20} style={{ color: f.accent }} />
                  </div>
                  <div>
                    <h3 className={`font-bold mb-2 text-lg ${isAr ? 'font-cairo' : 'font-sora'}`}
                      style={{ color: DARK }}>{c.title}</h3>
                    <p className={`text-sm leading-relaxed ${isAr ? 'font-tajawal' : 'font-work'}`}
                      style={{ color: MID }}>{c.desc}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════ HOW IT WORKS ════════════════════════ */}
      <section ref={stepsRef} className="relative z-10 py-28"
        style={{ background: EM_LT }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          <motion.div
            initial={{ opacity:0, y:20 }} animate={stepsInView ? { opacity:1, y:0 } : {}}
            transition={{ duration:0.55 }}
            className="text-center mb-20">
            <p className={`text-[11px] font-semibold tracking-[0.25em] uppercase mb-4 ${isAr ? 'font-cairo' : 'font-work'}`}
              style={{ color: EM }}>
              {t('كيف يعمل', 'How It Works')}
            </p>
            <h2 className={`text-4xl sm:text-5xl font-black ${isAr ? 'font-cairo' : 'font-sora'}`}
              style={{ color: DARK, letterSpacing:'-0.025em' }}>
              {t('٣ خطوات — وبعدها يشتغل لوحده', '3 Steps — Then It Runs Itself')}
            </h2>
          </motion.div>

          <div className="relative grid grid-cols-1 md:grid-cols-3">
            {/* Connector line */}
            <div className="hidden md:block absolute top-12 pointer-events-none"
              style={{ left:'20%', right:'20%', height:1, background:`linear-gradient(90deg, transparent, ${EM}40 20%, ${EM}40 80%, transparent)` }} />

            {[
              { num:'01', numAr:'١', Icon: Phone,         accent: EM,
                title:{ ar:'مريض يتصل أو يواتس',    en:'Patient Calls or WhatsApps'   },
                desc :{ ar:'في أي وقت — الليل أو العطلة. المساعد دائماً موجود.', en:'Anytime — nights or weekends. The assistant is always available.' },
              },
              { num:'02', numAr:'٢', Icon: Calendar,      accent: CY,
                title:{ ar:'النظام يحجز له موعد',    en:'System Books the Appointment' },
                desc :{ ar:'يفحص الجدول، يختار الدكتور، ويثبت الموعد فوراً.', en:'Checks the schedule, picks the doctor, confirms instantly.' },
              },
              { num:'03', numAr:'٣', Icon: MessageSquare, accent: '#8B5CF6',
                title:{ ar:'يوصله تأكيد فوري',       en:'Instant Confirmation Sent'    },
                desc :{ ar:'رسالة واتساب تلقائية — الاسم، الدكتور، الوقت.', en:'Auto WhatsApp — name, doctor, time. All set.' },
              },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity:0, y:28 }} animate={stepsInView ? { opacity:1, y:0 } : {}}
                transition={{ duration:0.65, delay: i * 0.12, ease:[0.16,1,0.3,1] }}
                className="flex flex-col items-center text-center gap-5 px-8 py-10"
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: WHITE, border:`1px solid ${BORDER}`, boxShadow:`0 8px 24px rgba(15,23,42,0.08)` }}>
                    <step.Icon size={22} style={{ color: step.accent }} />
                  </div>
                  <div className="absolute -top-2 -end-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                    style={{ background: step.accent }}>
                    {isAr ? step.numAr : i + 1}
                  </div>
                </div>
                <h3 className={`text-lg font-bold ${isAr ? 'font-cairo' : 'font-sora'}`}
                  style={{ color: DARK }}>
                  {isAr ? step.title.ar : step.title.en}
                </h3>
                <p className={`text-sm leading-relaxed max-w-xs ${isAr ? 'font-tajawal' : 'font-work'}`}
                  style={{ color: MID }}>
                  {isAr ? step.desc.ar : step.desc.en}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════ CASE STUDY ════════════════════════ */}
      <section ref={caseRef} className="relative z-10 py-28"
        style={{ background: WHITE, borderTop:`1px solid ${BORDER}` }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          <motion.div
            initial={{ opacity:0, y:20 }} animate={caseInView ? { opacity:1, y:0 } : {}}
            transition={{ duration:0.55 }}
            className="text-center mb-16">
            <p className={`text-[11px] font-semibold tracking-[0.25em] uppercase mb-4 ${isAr ? 'font-cairo' : 'font-work'}`}
              style={{ color: EM }}>
              {t('دراسة حالة', 'Case Study')}
            </p>
            <h2 className={`text-4xl sm:text-5xl font-black ${isAr ? 'font-cairo' : 'font-sora'}`}
              style={{ color: DARK, letterSpacing:'-0.025em' }}>
              {t('عيادات نور للأسنان — جدة', 'Noor Dental Clinics — Jeddah')}
            </h2>
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="w-2 h-2 rounded-full" style={{ background:'#4ADE80', animation:'pulse-live 2s ease-in-out infinite' }} />
              <span className={`text-sm ${isAr ? 'font-tajawal' : 'font-work'}`}
                style={{ color: MID }}>
                {t('في الإنتاج الآن', 'Live in Production')}
              </span>
            </div>
          </motion.div>

          {/* Metrics row */}
          <motion.div
            initial={{ opacity:0, y:24 }} animate={caseInView ? { opacity:1, y:0 } : {}}
            transition={{ duration:0.6, delay:0.12 }}
            className="flex flex-col sm:flex-row items-stretch justify-center mb-14"
            style={{ background: WHITE, border:`1px solid ${BORDER}`, borderRadius: 20, overflow:'hidden', boxShadow:'0 8px 32px rgba(15,23,42,0.07)' }}>
            {metrics.map((m, i) => {
              const Icon = m.icon
              return (
                <div key={i} className="flex-1 flex flex-col items-center text-center gap-3 px-8 py-8"
                  style={{ borderInlineStart: i > 0 ? `1px solid ${BORDER}` : 'none' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${EM}12` }}>
                    <Icon size={16} style={{ color: EM }} />
                  </div>
                  <div className={`text-xs ${isAr ? 'font-tajawal' : 'font-work'}`}
                    style={{ color: '#94A3B8' }}>
                    {isAr ? m.label.ar : m.label.en}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm line-through ${isAr ? 'font-cairo' : 'font-work'}`}
                      style={{ color: '#CBD5E1' }}>
                      {isAr ? m.before.ar : m.before.en}
                    </span>
                    <ArrowRight size={10} style={{ color: '#CBD5E1' }} />
                    <span className={`text-2xl font-black ${isAr ? 'font-cairo' : 'font-sora'}`}
                      style={{ color: EM, letterSpacing:'-1px' }}>
                      {isAr ? m.after.ar : m.after.en}
                    </span>
                  </div>
                </div>
              )
            })}
          </motion.div>

          {/* Testimonial */}
          <motion.div
            initial={{ opacity:0, y:20 }} animate={caseInView ? { opacity:1, y:0 } : {}}
            transition={{ duration:0.6, delay:0.24 }}
            className="text-center max-w-2xl mx-auto">
            <div className="text-3xl mb-4" style={{ color: '#CBD5E1' }}>"</div>
            <p className={`text-lg leading-relaxed mb-5 ${isAr ? 'font-tajawal' : 'font-work'}`}
              style={{ color: MID, fontStyle:'italic' }}>
              {t(
                'المساعد الذكي يستقبل الحجوزات بالليل والعطل وأنا مرتاح. الداشبورد يعطيني كل شيء في مكان واحد — الأطباء، المرضى، التقارير.',
                'The AI assistant handles bookings at night and on weekends while I rest. The dashboard gives me everything in one place — doctors, patients, reports.'
              )}
            </p>
            <div className="flex items-center justify-center gap-2">
              <TrendingUp size={12} style={{ color: EM }} />
              <p className={`text-xs font-semibold ${isAr ? 'font-cairo' : 'font-work'}`}
                style={{ color: '#94A3B8' }}>
                {t('إدارة عيادات نور — جدة', 'Noor Clinics Management — Jeddah')}
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════ PRICING ════════════════════════ */}
      <section className="relative z-10 py-28" style={{ background: BG, borderTop:`1px solid ${BORDER}` }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          <motion.div
            initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }}
            viewport={{ once:true }} transition={{ duration:0.55 }}
            className="text-center mb-16">
            <p className={`text-[11px] font-semibold tracking-[0.25em] uppercase mb-4 ${isAr ? 'font-cairo' : 'font-work'}`}
              style={{ color: EM }}>
              {t('الأسعار', 'Pricing')}
            </p>
            <h2 className={`text-4xl sm:text-5xl font-black mb-4 ${isAr ? 'font-cairo' : 'font-sora'}`}
              style={{ color: DARK, letterSpacing:'-0.025em' }}>
              {t('خطط واضحة — بدون رسوم خفية', 'Clear Plans — No Hidden Fees')}
            </h2>
            <p className={`text-base max-w-md mx-auto ${isAr ? 'font-tajawal' : 'font-work'}`}
              style={{ color: MID }}>
              {t('اشتراك سنوي شامل — لا عمولة على الحجوزات', 'Annual subscription — no commission per booking')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Growth */}
            <motion.div
              initial={{ opacity:0, y:28 }} whileInView={{ opacity:1, y:0 }}
              viewport={{ once:true }} transition={{ duration:0.6, delay:0.05 }}
              className="rounded-3xl p-8 flex flex-col"
              style={{ background: WHITE, border:`1px solid ${BORDER}`, boxShadow:'0 4px 24px rgba(15,23,42,0.06)' }}>
              <div className="inline-flex px-3 py-1 rounded-full mb-5 self-start"
                style={{ background:'#ECFDF5', border:'1px solid #A7F3D0' }}>
                <span className={`text-xs font-bold ${isAr ? 'font-cairo' : 'font-work'}`}
                  style={{ color:'#059669' }}>
                  {t('عرض إطلاق', 'Launch Offer')}
                </span>
              </div>
              <h3 className={`text-xl font-black mb-2 ${isAr ? 'font-cairo' : 'font-sora'}`}
                style={{ color: DARK }}>
                {t('باقة نمو الحجوزات', 'Booking Growth Plan')}
              </h3>
              <p className={`text-sm mb-6 ${isAr ? 'font-tajawal' : 'font-work'}`}
                style={{ color: MID }}>
                {t('حجز واتساب تلقائي ٢٤/٧', 'Automated WhatsApp booking 24/7')}
              </p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className={`text-4xl font-black ${isAr ? 'font-cairo' : 'font-sora'}`}
                  style={{ color: EM, letterSpacing:'-1px' }}>
                  {t('٦,٩٠٠', '6,900')}
                </span>
                <span className={`text-base ${isAr ? 'font-tajawal' : 'font-work'}`}
                  style={{ color: MID }}>
                  {t('ريال / سنة', 'SAR / year')}
                </span>
              </div>
              <ul className="flex flex-col gap-3 mb-8 flex-1">
                {(isAr ? [
                  'حجز مباشر عبر واتساب ٢٤/٧','تأكيدات وتذكيرات تلقائية',
                  'داشبورد المواعيد والمرضى','جدول الأطباء وقائمة الانتظار',
                  'تقارير أسبوعية','دعم إعداد كامل',
                ] : [
                  '24/7 WhatsApp booking','Auto confirmations & reminders',
                  'Appointments & patients dashboard','Doctor schedule & waitlist',
                  'Weekly reports','Full onboarding support',
                ]).map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check size={13} strokeWidth={3} className="mt-0.5 flex-shrink-0" style={{ color: EM }} />
                    <span className={`text-sm ${isAr ? 'font-tajawal' : 'font-work'}`}
                      style={{ color: DARK }}>{f}</span>
                  </li>
                ))}
              </ul>
              <motion.button
                whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
                onClick={() => openWhatsAppChat()}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm cursor-pointer ${isAr ? 'font-cairo' : 'font-work'}`}
                style={{ background:`${EM}15`, color: EM2, border:`1px solid ${EM_BORDER}` }}>
                {t('تواصل معنا', 'Contact Us')}
              </motion.button>
            </motion.div>

            {/* AI Pro */}
            <motion.div
              initial={{ opacity:0, y:28 }} whileInView={{ opacity:1, y:0 }}
              viewport={{ once:true }} transition={{ duration:0.6, delay:0.14 }}
              className="rounded-3xl p-8 flex flex-col relative"
              style={{ background:`linear-gradient(145deg, #0F172A, #1E293B)`, border:`1px solid rgba(255,255,255,0.08)`, boxShadow:`0 20px 60px rgba(16,185,129,0.15)` }}>
              <div className="absolute -top-3.5 right-6 px-4 py-1.5 rounded-full text-xs font-black text-white"
                style={{ background:`linear-gradient(135deg, ${EM2}, ${CY})`, fontFamily: isAr ? 'Cairo, sans-serif' : 'inherit' }}>
                ⭐ {t('الأكثر طلباً', 'Most Popular')}
              </div>
              <div className="inline-flex px-3 py-1 rounded-full mb-5 self-start"
                style={{ background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)' }}>
                <span className={`text-xs font-bold ${isAr ? 'font-cairo' : 'font-work'}`}
                  style={{ color:'#6EE7B7' }}>
                  {t('عرض إطلاق', 'Launch Offer')}
                </span>
              </div>
              <h3 className={`text-xl font-black mb-2 ${isAr ? 'font-cairo' : 'font-sora'}`}
                style={{ color:'#FFFFFF' }}>
                {t('باقة الحجز الذكي ٢٤/٧', 'AI Booking 24/7 Plan')}
              </h3>
              <p className={`text-sm mb-6 ${isAr ? 'font-tajawal' : 'font-work'}`}
                style={{ color:'rgba(255,255,255,0.6)' }}>
                {t('كل شيء + وكيل AI للمكالمات', 'Everything + AI call agent')}
              </p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className={`text-4xl font-black ${isAr ? 'font-cairo' : 'font-sora'}`}
                  style={{ color: EM, letterSpacing:'-1px' }}>
                  {t('١٩,٩٠٠', '19,900')}
                </span>
                <span className={`text-base ${isAr ? 'font-tajawal' : 'font-work'}`}
                  style={{ color:'rgba(255,255,255,0.5)' }}>
                  {t('ريال / سنة', 'SAR / year')}
                </span>
              </div>
              <ul className="flex flex-col gap-3 mb-8 flex-1">
                {(isAr ? [
                  'كل مزايا باقة النمو','وكيل AI يستقبل ويحجز بالمكالمات',
                  'نسخ وتحليل المحادثات تلقائياً','تحليلات AI وتقارير ذكية',
                  'قائمة انتظار ذكية بأولوية AI','اكتشاف تعارضات المواعيد تلقائياً',
                ] : [
                  'Everything in Growth','AI agent handles & books via calls',
                  'Auto call transcription & analysis','AI analytics & smart reports',
                  'AI-priority smart waitlist','Automatic conflict detection',
                ]).map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check size={13} strokeWidth={3} className="mt-0.5 flex-shrink-0" style={{ color: EM }} />
                    <span className={`text-sm ${isAr ? 'font-tajawal' : 'font-work'}`}
                      style={{ color:'rgba(255,255,255,0.85)' }}>{f}</span>
                  </li>
                ))}
              </ul>
              <motion.button
                whileHover={{ scale:1.02, boxShadow:`0 8px 32px ${EM}40` }} whileTap={{ scale:0.97 }}
                onClick={() => openWhatsAppChat()}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm cursor-pointer text-white ${isAr ? 'font-cairo' : 'font-work'}`}
                style={{ background:`linear-gradient(135deg, ${EM2}, ${EM})`, boxShadow:`0 4px 16px ${EM}30` }}>
                {t('تواصل معنا', 'Contact Us')}
              </motion.button>
            </motion.div>
          </div>

          <motion.p
            initial={{ opacity:0 }} whileInView={{ opacity:1 }} viewport={{ once:true }} transition={{ delay:0.3 }}
            className={`text-center text-xs mt-10 ${isAr ? 'font-tajawal' : 'font-work'}`}
            style={{ color:'#94A3B8' }}>
            {t('الأسعار لا تشمل ضريبة القيمة المضافة · للاستفسار: info@madar.software', 'Prices exclude VAT · Inquiries: info@madar.software')}
          </motion.p>
        </div>
      </section>

      {/* ════════════════════════ CTA ════════════════════════ */}
      <section className="relative z-10 py-24"
        style={{ background: `linear-gradient(135deg, #ECFDF5 0%, #F0F9FF 100%)`, borderTop:`1px solid ${EM_BORDER}` }}>
        <div className="max-w-2xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity:0, y:24 }} whileInView={{ opacity:1, y:0 }}
            viewport={{ once:true }}
            transition={{ duration:0.6 }}>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
              style={{ background: EM_LT, border:`1px solid ${EM_BORDER}` }}>
              <Sparkles size={10} style={{ color: EM }} />
              <span className={`text-[10px] font-semibold tracking-widest uppercase ${isAr ? 'font-cairo' : 'font-work'}`}
                style={{ color: EM }}>
                {t('ابدأ اليوم', 'Get Started')}
              </span>
            </div>

            <h2 className={`text-3xl sm:text-4xl font-black mb-4 ${isAr ? 'font-cairo' : 'font-sora'}`}
              style={{ color: DARK, letterSpacing:'-0.02em' }}>
              {t(
                <>جاهز تشغّل عيادتك<br /><span style={{ background:`linear-gradient(135deg, ${EM}, ${CY})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>بشكل احترافي؟</span></>,
                <>Ready to Run Your Clinic<br /><span style={{ background:`linear-gradient(135deg, ${EM}, ${CY})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Like a Pro?</span></>
              )}
            </h2>
            <p className={`text-base mb-8 ${isAr ? 'font-tajawal' : 'font-work'}`}
              style={{ color: MID }}>
              {t('تواصل معنا وتقدر تشوف Demo كامل للنظام خلال ٢٤ ساعة.', 'Contact us and see a full system demo within 24 hours.')}
            </p>
            <motion.button
              whileHover={{ scale:1.02, boxShadow:`0 8px 40px ${EM}45` }}
              whileTap={{ scale:0.97 }}
              onClick={() => openWhatsAppChat()}
              className={`inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-base cursor-pointer text-white ${isAr ? 'font-cairo' : 'font-work'}`}
              style={{ background:`linear-gradient(135deg, ${EM2}, ${EM})`, boxShadow:`0 4px 20px ${EM}35` }}
            >
              {t('احجز عرضاً توضيحياً', 'Book a Demo')}
              <ArrowIcon size={16} />
            </motion.button>
          </motion.div>
        </div>
      </section>

      <Footer />
      <MadarAgentWidget agentType="sales_website" pageTitle="Clinic OS" />
    </div>
  )
}
