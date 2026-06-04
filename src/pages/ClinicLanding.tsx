import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Stethoscope, Calendar, Bot, Shield, BarChart3,
  ArrowRight, ArrowLeft, Check, TrendingUp, Clock, Users, Phone, MessageSquare,
  Sparkles,
} from 'lucide-react'
import { Navbar }           from '../components/public/Navbar'
import { Footer }           from '../components/public/Footer'
import { ClinicDashMockup } from '../components/public/ClinicDashMockup'
import { MadarAgentWidget } from '../components/dash/MadarAgentWidget'
import { useLanguage }      from '../context/LanguageContext'
import { openWhatsAppChat } from '../lib/whatsapp'

/* ── Design tokens ─────────────────────────────────────── */
const NAVY    = '#0F2044'
const NAVY2   = '#1B3A6B'
const PT_MID  = '#9B9B9B'   // platinum mid
const PT_LITE = '#E5E4E2'   // platinum light
const BG2     = '#F4F6F9'   // section alternate

/* ── Features ──────────────────────────────────────────── */
const features = [
  {
    icon: Bot,
    ar: { title: 'مساعد صوتي ذكي ٢٤/٧', desc: 'يستقبل المكالمات والواتساب، يحدد الخدمة المطلوبة، يتحقق من توفر الدكتور، ويحجز الموعد في ثوانٍ — بلهجة عربية طبيعية.' },
    en: { title: 'AI Voice Receptionist 24/7', desc: 'Handles calls and WhatsApp, identifies the service, checks doctor availability, and books the appointment in seconds — in natural Arabic.' },
  },
  {
    icon: Calendar,
    ar: { title: 'حجز بدون تعارض', desc: 'فهرس فريد على (دكتور، تاريخ، وقت) يمنع الحجز المزدوج تلقائياً — مهما كان عدد القنوات.' },
    en: { title: 'Zero Double-Booking', desc: 'A unique index on (doctor, date, time) prevents conflicts automatically — regardless of how many channels are used.' },
  },
  {
    icon: Shield,
    ar: { title: 'Supabase + Google Calendar', desc: 'Supabase هو مصدر الحقيقة الوحيد. Google Calendar مرآة مرنة — الحجز ينجح حتى لو التقويم فشل.' },
    en: { title: 'Supabase + Google Calendar', desc: 'Supabase is the single source of truth. Google Calendar is a resilient mirror — booking succeeds even if the calendar fails.' },
  },
  {
    icon: BarChart3,
    ar: { title: 'داشبورد إدارة المواعيد', desc: 'KPIs لحظية، تقويم شهري، قائمة المرضى، تقارير الأطباء — مع تحديث حي عبر Supabase Realtime.' },
    en: { title: 'Appointment Management Dashboard', desc: 'Live KPIs, monthly calendar, patient list, doctor reports — with real-time updates via Supabase Realtime.' },
  },
]

/* ── Metrics ────────────────────────────────────────────── */
const metrics = [
  { icon: Clock,  before: { ar: '٣+ ساعات', en: '3+ Hours' }, after: { ar: '< دقيقة', en: '< 1 Min' }, label: { ar: 'وقت تأكيد الحجز',   en: 'Booking confirmation' } },
  { icon: Users,  before: { ar: '٤٠٪',       en: '40%' },      after: { ar: '٠٪',       en: '0%' },       label: { ar: 'حجوزات ضائعة',      en: 'Missed bookings' } },
  { icon: Bot,    before: { ar: 'ساعات العمل', en: 'Work hours' }, after: { ar: '٢٤/٧',  en: '24/7' },    label: { ar: 'تغطية الاستقبال',   en: 'Reception coverage' } },
]

/* ── Component ──────────────────────────────────────────── */
export const ClinicLanding = () => {
  const { t, language } = useLanguage()
  const isAr    = language === 'ar'
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight

  const heroRef     = useRef(null)
  const featuresRef = useRef(null)
  const caseRef     = useRef(null)

  const heroInView     = useInView(heroRef,     { once: true })
  const featuresInView = useInView(featuresRef, { once: true, margin: '-60px' })
  const caseInView     = useInView(caseRef,     { once: true, margin: '-60px' })

  return (
    <div className="min-h-screen" style={{ background: '#FFFFFF', direction: isAr ? 'rtl' : 'ltr' }}>
      <Navbar />

      {/* ══════════════════════ HERO ══════════════════════ */}
      <section ref={heroRef} className="relative overflow-hidden pt-28 pb-16"
        style={{ background: '#FFFFFF' }}>

        {/* Subtle platinum grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(${PT_LITE}60 1px, transparent 1px), linear-gradient(90deg, ${PT_LITE}60 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }} />
        {/* Radial glow — navy tint center */}
        <div className="absolute top-0 inset-x-0 pointer-events-none"
          style={{ height: 480, background: `radial-gradient(ellipse 80% 60% at 50% -10%, ${NAVY}09 0%, transparent 70%)` }} />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -16 }} animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-7"
            style={{ background: `${PT_LITE}80`, border: `1px solid ${PT_MID}50` }}
          >
            <Sparkles size={11} style={{ color: NAVY }} />
            <span className={`text-xs font-semibold tracking-widest uppercase ${isAr ? 'font-cairo' : 'font-work'}`}
              style={{ color: NAVY }}>
              Clinic OS — Madar
            </span>
          </motion.div>

          {/* H1 */}
          <motion.h1
            className={`text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.12] tracking-tight mb-6 ${isAr ? 'font-cairo' : 'font-sora'}`}
            initial={{ opacity: 0, y: 28 }} animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            style={{ color: NAVY }}
          >
            {t(
              <>نظّم عيادتك.<br /><span style={{ background: `linear-gradient(135deg, ${PT_MID}, ${NAVY})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>دع الذكاء يحجز.</span></>,
              <>Manage Your Clinic.<br /><span style={{ background: `linear-gradient(135deg, ${PT_MID}, ${NAVY})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Let AI Book.</span></>
            )}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className={`text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed ${isAr ? 'font-tajawal' : 'font-work'}`}
            initial={{ opacity: 0, y: 18 }} animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ color: '#4B5563' }}
          >
            {t(
              'مساعد استقبال بالذكاء الاصطناعي يعمل ٢٤/٧ — يحجز المواعيد بدون تعارض، ويدير المرضى من لوحة واحدة. بدون موظف إضافي.',
              'An AI receptionist running 24/7 — books appointments without conflicts and manages patients from one dashboard. No extra staff needed.'
            )}
          </motion.p>

          {/* Chips */}
          <motion.div
            className="flex flex-wrap justify-center gap-2.5 mb-9"
            initial={{ opacity: 0 }} animate={heroInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.32 }}
          >
            {[
              { ar: 'حجز بدون تعارض', en: 'Zero double-booking' },
              { ar: 'تغطية ٢٤/٧', en: '24/7 coverage' },
              { ar: 'تأكيد فوري', en: 'Instant confirmation' },
              { ar: 'تقارير لحظية', en: 'Live reports' },
            ].map((c, i) => (
              <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: `${PT_LITE}70`, border: `1px solid ${PT_MID}40` }}>
                <Check size={9} strokeWidth={3} style={{ color: NAVY }} />
                <span className={`text-xs font-medium ${isAr ? 'font-tajawal' : 'font-work'}`} style={{ color: NAVY }}>
                  {isAr ? c.ar : c.en}
                </span>
              </div>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div
            className="flex flex-col sm:flex-row justify-center gap-3 mb-12"
            initial={{ opacity: 0, y: 12 }} animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: `0 8px 32px ${NAVY}30` }}
              whileTap={{ scale: 0.97 }}
              onClick={() => openWhatsAppChat()}
              className={`inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl text-white font-semibold text-base cursor-pointer ${isAr ? 'font-cairo' : 'font-work'}`}
              style={{ background: NAVY, boxShadow: `0 4px 20px ${NAVY}25` }}
            >
              <span>{t('احجز عرضاً توضيحياً', 'Book a Demo')}</span>
              <ArrowIcon size={16} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02, background: `${PT_LITE}` }}
              whileTap={{ scale: 0.97 }}
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className={`inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-medium text-base cursor-pointer ${isAr ? 'font-cairo' : 'font-work'}`}
              style={{ border: `1.5px solid ${PT_MID}60`, color: NAVY, background: 'transparent' }}
            >
              {t('اكتشف المزايا', 'Explore Features')}
            </motion.button>
          </motion.div>

          {/* Stats row */}
          <motion.div
            className="flex flex-wrap justify-center gap-0 mb-16"
            initial={{ opacity: 0 }} animate={heroInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.52 }}
          >
            {[
              { val: '٢٤/٧', label: { ar: 'بدون توقف', en: 'Always on' } },
              { val: '٧٨٪',  label: { ar: 'معدل التحويل', en: 'Conversion rate' } },
              { val: '٠',    label: { ar: 'حجز مزدوج', en: 'Double bookings' } },
              { val: '< ١ دق', label: { ar: 'تأكيد الحجز', en: 'Booking confirm' } },
            ].map((s, i) => (
              <div key={i} className="text-center px-7 py-2"
                style={{ borderInlineStart: i > 0 ? `1px solid ${PT_MID}30` : 'none' }}>
                <div className={`text-2xl font-bold ${isAr ? 'font-cairo' : 'font-sora'}`} style={{ color: NAVY }}>{s.val}</div>
                <div className={`text-xs mt-0.5 ${isAr ? 'font-tajawal' : 'font-work'}`} style={{ color: PT_MID }}>
                  {isAr ? s.label.ar : s.label.en}
                </div>
              </div>
            ))}
          </motion.div>

          {/* ── Dashboard screenshot ── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            {/* Browser chrome frame */}
            <div className="rounded-2xl overflow-hidden"
              style={{
                boxShadow: `0 32px 80px ${NAVY}18, 0 8px 24px ${NAVY}10`,
                border: `1px solid ${PT_MID}30`,
              }}>
              {/* Top bar */}
              <div className="flex items-center gap-2 px-4 py-3"
                style={{ background: BG2, borderBottom: `1px solid ${PT_LITE}` }}>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#E5E5E5' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#E5E5E5' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#E5E5E5' }} />
                </div>
                <div className="flex-1 mx-4 px-3 py-1 rounded-lg text-xs text-center"
                  style={{ background: '#FFFFFF', border: `1px solid ${PT_LITE}`, color: '#9B9B9B', fontFamily: 'monospace' }}>
                  app.madar.software/clinic
                </div>
              </div>
              <ClinicDashMockup />
            </div>
            {/* Fade gradient at bottom */}
            <div className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
              style={{ background: 'linear-gradient(to top, #FFFFFF, transparent)' }} />
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════ FEATURES ══════════════════════ */}
      <section id="features" ref={featuresRef} className="py-24" style={{ background: BG2 }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={featuresInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
              style={{ background: `${PT_LITE}80`, border: `1px solid ${PT_MID}40` }}>
              <span className={`text-[11px] font-semibold tracking-widest uppercase ${isAr ? 'font-cairo' : 'font-work'}`} style={{ color: NAVY }}>
                {t('المزايا', 'Features')}
              </span>
            </div>
            <h2 className={`text-3xl sm:text-4xl font-bold mb-3 ${isAr ? 'font-cairo' : 'font-sora'}`} style={{ color: NAVY }}>
              {t('نظام مبني خصيصاً للعيادات', 'Purpose-Built for Clinics')}
            </h2>
            <p className={`text-base max-w-md mx-auto ${isAr ? 'font-tajawal' : 'font-work'}`} style={{ color: '#6B7280' }}>
              {t('ليس بوت عام — كل ميزة مصممة لاحتياجات العيادة الخليجية.', 'Not a generic bot — every feature designed for Gulf clinic needs.')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f, i) => {
              const Icon = f.icon
              const c = isAr ? f.ar : f.en
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 28 }} animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: i * 0.09, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -3, boxShadow: `0 12px 40px ${NAVY}10`, transition: { duration: 0.2 } }}
                  className="p-6 rounded-2xl flex gap-4 bg-white"
                  style={{ border: `1px solid ${PT_LITE}`, boxShadow: `0 2px 8px ${NAVY}06` }}
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${PT_LITE}, ${PT_MID})` }}>
                    <Icon size={20} style={{ color: NAVY }} />
                  </div>
                  <div>
                    <h3 className={`font-bold mb-1.5 ${isAr ? 'font-cairo' : 'font-sora'}`} style={{ color: NAVY }}>{c.title}</h3>
                    <p className={`text-sm leading-relaxed ${isAr ? 'font-tajawal' : 'font-work'}`} style={{ color: '#6B7280' }}>{c.desc}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════ HOW IT WORKS ══════════════════════ */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
              style={{ background: `${PT_LITE}80`, border: `1px solid ${PT_MID}40` }}>
              <span className={`text-[11px] font-semibold tracking-widest uppercase ${isAr ? 'font-cairo' : 'font-work'}`} style={{ color: NAVY }}>
                {t('كيف يعمل', 'How It Works')}
              </span>
            </div>
            <h2 className={`text-3xl sm:text-4xl font-bold mb-3 ${isAr ? 'font-cairo' : 'font-sora'}`} style={{ color: NAVY }}>
              {t('ثلاث خطوات — وبعدها يشتغل لوحده', 'Three Steps — Then It Runs Itself')}
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Connector */}
            <div className="hidden md:block absolute top-[52px] pointer-events-none"
              style={{
                left: '18%', right: '18%', height: 1,
                backgroundImage: `repeating-linear-gradient(90deg, ${PT_MID}50 0, ${PT_MID}50 6px, transparent 6px, transparent 14px)`,
              }} />

            {[
              { num: '١', Icon: Phone,        title: { ar: 'مريض يتصل أو يواتس',       en: 'Patient Calls or WhatsApps' },    desc: { ar: 'في أي وقت — الليل أو العطلة. المساعد دائماً موجود.', en: 'Anytime — nights or weekends. The assistant is always available.' } },
              { num: '٢', Icon: Calendar,     title: { ar: 'النظام يحجز له موعد',       en: 'System Books the Appointment' },  desc: { ar: 'يفحص الجدول، يختار الدكتور، ويثبت الموعد فوراً.', en: 'Checks the schedule, picks the doctor, confirms instantly.' } },
              { num: '٣', Icon: MessageSquare,title: { ar: 'يوصله تأكيد فوري',           en: 'Instant Confirmation Sent' },    desc: { ar: 'رسالة واتساب تلقائية — الاسم، الدكتور، الوقت.', en: 'Auto WhatsApp — name, doctor, time. All set.' } },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex flex-col items-center text-center gap-4 p-7 rounded-2xl"
                style={{ background: '#FFFFFF', border: `1px solid ${PT_LITE}`, boxShadow: `0 4px 20px ${NAVY}06` }}
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${PT_LITE}, ${PT_MID})`, boxShadow: `0 6px 20px ${NAVY}12` }}>
                    <step.Icon size={22} style={{ color: NAVY }} />
                  </div>
                  <div className="absolute -top-2 -end-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-sora text-white"
                    style={{ background: NAVY }}>
                    {step.num}
                  </div>
                </div>
                <h3 className={`text-base font-bold ${isAr ? 'font-cairo' : 'font-sora'}`} style={{ color: NAVY }}>
                  {isAr ? step.title.ar : step.title.en}
                </h3>
                <p className={`text-sm leading-relaxed ${isAr ? 'font-tajawal' : 'font-work'}`} style={{ color: '#6B7280' }}>
                  {isAr ? step.desc.ar : step.desc.en}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ CASE STUDY ══════════════════════ */}
      <section ref={caseRef} className="py-24" style={{ background: BG2 }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={caseInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="rounded-3xl overflow-hidden bg-white"
            style={{ border: `1px solid ${PT_LITE}`, boxShadow: `0 8px 40px ${NAVY}08` }}
          >
            <div className="p-6 sm:p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Stethoscope size={13} style={{ color: NAVY }} />
                    <span className={`text-xs font-semibold ${isAr ? 'font-cairo' : 'font-work'}`} style={{ color: PT_MID }}>
                      {t('دراسة حالة', 'Case Study')}
                    </span>
                  </div>
                  <h3 className={`text-xl font-bold ${isAr ? 'font-cairo' : 'font-sora'}`} style={{ color: NAVY }}>
                    {t('عيادات نور للأسنان — جدة', 'Noor Dental Clinics — Jeddah')}
                  </h3>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{ background: `${NAVY}0F`, color: NAVY, border: `1px solid ${NAVY}20` }}>
                  {t('في الإنتاج', 'Live')}
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                {metrics.map((m, i) => {
                  const Icon = m.icon
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 16 }} animate={caseInView ? { opacity: 1, y: 0 } : {}}
                      transition={{ duration: 0.5, delay: 0.15 + i * 0.1 }}
                      className="flex items-center gap-3 p-4 rounded-xl"
                      style={{ background: BG2, border: `1px solid ${PT_LITE}` }}
                    >
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${PT_LITE}, ${PT_MID}60)` }}>
                        <Icon size={15} style={{ color: NAVY }} />
                      </div>
                      <div>
                        <p className={`text-[10px] mb-0.5 ${isAr ? 'font-tajawal' : 'font-work'}`} style={{ color: PT_MID }}>
                          {isAr ? m.label.ar : m.label.en}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs line-through ${isAr ? 'font-cairo' : 'font-work'}`} style={{ color: '#D1D5DB' }}>
                            {isAr ? m.before.ar : m.before.en}
                          </span>
                          <ArrowRight size={8} style={{ color: PT_MID }} />
                          <span className={`text-base font-bold ${isAr ? 'font-cairo' : 'font-sora'}`} style={{ color: NAVY }}>
                            {isAr ? m.after.ar : m.after.en}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Testimonial */}
              <div className="p-4 rounded-xl" style={{ background: BG2, border: `1px solid ${PT_LITE}` }}>
                <p className={`text-sm leading-relaxed italic mb-3 ${isAr ? 'font-tajawal' : 'font-work'}`} style={{ color: '#374151' }}>
                  {t(
                    '"المساعد الذكي يستقبل الحجوزات بالليل والعطل وأنا مرتاح. الداشبورد يعطيني كل شيء في مكان واحد — الأطباء، المرضى، التقارير."',
                    '"The AI assistant handles bookings at night and on weekends while I rest. The dashboard gives me everything in one place — doctors, patients, reports."'
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <TrendingUp size={11} style={{ color: NAVY }} />
                  <p className={`text-[11px] font-semibold ${isAr ? 'font-cairo' : 'font-work'}`} style={{ color: PT_MID }}>
                    {t('إدارة عيادات نور — جدة', 'Noor Clinics Management — Jeddah')}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════ CTA ══════════════════════ */}
      <section className="relative py-24 overflow-hidden" style={{ background: NAVY }}>
        {/* Platinum shimmer */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(${PT_LITE}08 1px, transparent 1px), linear-gradient(90deg, ${PT_LITE}08 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }} />
        <div className="absolute top-0 inset-x-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${PT_MID}50, transparent)` }} />

        <div className="relative max-w-2xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className={`text-3xl sm:text-4xl font-bold text-white mb-4 ${isAr ? 'font-cairo' : 'font-sora'}`}>
              {t(
                <>جاهز تشغّل عيادتك<br /><span style={{ background: `linear-gradient(135deg, ${PT_MID}, ${PT_LITE})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>بشكل احترافي؟</span></>,
                <>Ready to Run Your Clinic<br /><span style={{ background: `linear-gradient(135deg, ${PT_MID}, ${PT_LITE})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Like a Pro?</span></>
              )}
            </h2>
            <p className={`text-base mb-8 ${isAr ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.55)' }}>
              {t('تواصل معنا وتقدر تشوف Demo كامل للنظام والداشبورد خلال ٢٤ ساعة.', 'Contact us and see a full system and dashboard demo within 24 hours.')}
            </p>
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: `0 0 40px ${PT_LITE}30` }}
              whileTap={{ scale: 0.97 }}
              onClick={() => openWhatsAppChat()}
              className={`inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-semibold text-base cursor-pointer ${isAr ? 'font-cairo' : 'font-work'}`}
              style={{
                background: `linear-gradient(135deg, ${PT_MID}, ${PT_LITE})`,
                color: NAVY,
                boxShadow: `0 4px 24px ${PT_MID}40`,
              }}
            >
              <span>{t('احجز عرضاً توضيحياً', 'Book a Demo')}</span>
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
