import { useRef, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import { Stethoscope, Calendar, Bot, Shield, BarChart3, ArrowRight, ArrowLeft, Check, TrendingUp, Clock, Users, Phone, MessageSquare } from 'lucide-react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Navbar }    from '../components/public/Navbar'
import { Footer }    from '../components/public/Footer'
import { ClinicDashMockup } from '../components/public/ClinicDashMockup'
import { MadarAgentWidget } from '../components/dash/MadarAgentWidget'
import { DottedSurface }    from '../components/ui/dotted-surface'
import { useLanguage }      from '../context/LanguageContext'
import { openWhatsAppChat } from '../lib/whatsapp'

gsap.registerPlugin(ScrollTrigger)

const ACCENT = '#10B981'

/* ── Features ────────────────────────────────────────── */
const features = [
  {
    icon: Bot,
    ar: { title: 'نورة — مساعد صوتي 24/7', desc: 'تستقبل المكالمات والواتساب، تحدد الخدمة المطلوبة، تتحقق من توفر الدكتور، وتحجز الموعد في ثوانٍ بلهجة جدة.' },
    en: { title: 'Nora — Voice AI 24/7', desc: 'Handles calls and WhatsApp, identifies the needed service, checks doctor availability, and books the appointment in seconds.' },
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
    ar: { title: 'داشبورد إدارة المواعيد', desc: 'KPIs لحظية، تقويم شهري، قائمة المرضى، تقارير الأطباء والخدمات — مع تحديث حي عبر Supabase Realtime.' },
    en: { title: 'Appointment Management Dashboard', desc: 'Live KPIs, monthly calendar, patient list, doctor and service reports — with real-time updates via Supabase Realtime.' },
  },
]

/* ── Case Study ──────────────────────────────────────── */
const metrics = [
  { icon: Clock,  before: { ar: '٣+ ساعات', en: '3+ Hours' }, after: { ar: '< دقيقة', en: '< 1 Min' }, label: { ar: 'وقت تأكيد الحجز', en: 'Booking confirmation time' } },
  { icon: Users,  before: { ar: '٤٠٪',       en: '40%' },      after: { ar: '٠٪',       en: '0%' },       label: { ar: 'حجوزات ضائعة',     en: 'Missed bookings' } },
  { icon: Bot,    before: { ar: 'ساعات العمل', en: 'Work hours' }, after: { ar: '٢٤/٧',  en: '24/7' },    label: { ar: 'تغطية الاستقبال',  en: 'Reception coverage' } },
]

/* ── Component ───────────────────────────────────────── */
export const ClinicLanding = () => {
  const { t, language } = useLanguage()
  const ArrowIcon = language === 'ar' ? ArrowLeft : ArrowRight

  const rootRef     = useRef<HTMLDivElement>(null)
  const heroRef     = useRef(null)
  const featuresRef = useRef(null)
  const caseRef     = useRef(null)
  const mockupRef   = useRef<HTMLDivElement>(null)
  const h1Ref       = useRef<HTMLHeadingElement>(null)

  const heroInView     = useInView(heroRef,     { once: true })
  const featuresInView = useInView(featuresRef, { once: true, margin: '-80px' })
  const caseInView     = useInView(caseRef,     { once: true, margin: '-80px' })

  /* ─── Mockup float + H1 split ─────────────────────── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      /* Float the dashboard mockup */
      gsap.to(mockupRef.current, {
        y: -12, duration: 3, repeat: -1, yoyo: true, ease: 'power1.inOut',
      })

      /* H1 split words entrance */
      const words = h1Ref.current?.querySelectorAll('.clinic-word')
      if (words?.length) {
        gsap.from(words, {
          y: 36, opacity: 0, stagger: 0.09, duration: 0.65, ease: 'power3.out', delay: 0.3,
        })
      }
    }, rootRef)
    return () => ctx.revert()
  }, [])

  /* ─── How Nora Works animations ───────────────────── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      /* Connector line draws on scroll */
      gsap.from('.nora-connector', {
        scaleX: 0,
        transformOrigin: language === 'ar' ? 'right center' : 'left center',
        duration: 1.1, ease: 'power2.inOut',
        scrollTrigger: { trigger: '.nora-steps', start: 'top 80%' },
      })

      /* Step cards: scale + fade + icon wiggle */
      gsap.utils.toArray<HTMLElement>('.nora-step').forEach((card, i) => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: card, start: 'top 88%' },
        })
        tl.from(card, { scale: 0.9, opacity: 0, duration: 0.55, ease: 'back.out(1.4)', delay: i * 0.13 })
          .from(card.querySelector('.nora-icon'), { rotation: -12, duration: 0.4, ease: 'back.out(2)' }, '-=0.3')
      })
    }, rootRef)
    return () => ctx.revert()
  }, [language])

  return (
    <div ref={rootRef} className="min-h-screen" style={{ background: '#050810' }}>
      <Navbar />

      {/* ── Hero ── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden" style={{ paddingTop: 88 }}>
        <div className="absolute inset-0 pointer-events-none">
          <DottedSurface className="opacity-20" />
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px]"
            style={{ background: `radial-gradient(ellipse at top, ${ACCENT}18 0%, transparent 70%)`, filter: 'blur(40px)' }} />
          <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(${ACCENT}05 1px, transparent 1px), linear-gradient(90deg, ${ACCENT}05 1px, transparent 1px)`, backgroundSize: '64px 64px' }} />
          <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${ACCENT}50, transparent)` }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center py-16 lg:min-h-[calc(100vh-88px)] lg:py-0">

            {/* Left */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-6"
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 w-fit px-4 py-2 rounded-full border"
                style={{ background: `${ACCENT}10`, borderColor: `${ACCENT}30` }}>
                <Stethoscope size={13} style={{ color: ACCENT }} />
                <span className={`text-xs font-semibold ${language === 'ar' ? 'font-cairo' : 'font-work'}`} style={{ color: ACCENT }}>
                  Clinic OS
                </span>
              </div>

              {/* Headline — split words for GSAP */}
              <h1 ref={h1Ref} className={`text-4xl sm:text-5xl xl:text-6xl font-bold leading-[1.15] tracking-tight text-white flex flex-wrap gap-x-3 gap-y-1 ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}>
                {language === 'ar' ? (
                  <>
                    <span className="clinic-word inline-block" style={{ color: ACCENT }}>نورة</span>
                    <span className="clinic-word inline-block">تحجز</span>
                    <span className="clinic-word inline-block w-full" />
                    <span className="clinic-word inline-block">وأنت</span>
                    <span className="clinic-word inline-block">مرتاح</span>
                  </>
                ) : (
                  <>
                    <span className="clinic-word inline-block" style={{ color: ACCENT }}>Nora</span>
                    <span className="clinic-word inline-block">Books</span>
                    <span className="clinic-word inline-block w-full" />
                    <span className="clinic-word inline-block">While</span>
                    <span className="clinic-word inline-block">You</span>
                    <span className="clinic-word inline-block">Rest</span>
                  </>
                )}
              </h1>

              <p className={`text-lg leading-relaxed max-w-lg ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
                style={{ color: 'rgba(255,255,255,0.62)' }}>
                {t(
                  'مساعد استقبال صوتي يعمل 24/7، يحجز المواعيد بدون تعارض، ويدير المرضى من لوحة واحدة — بدون موظف إضافي.',
                  'A voice receptionist running 24/7, books appointments without conflicts, and manages patients from one dashboard — without hiring extra staff.'
                )}
              </p>

              {/* Trust chips */}
              <div className="flex flex-wrap gap-2.5">
                {[
                  { ar: 'صوت عربي لهجة جدة', en: 'Jeddah dialect Arabic voice' },
                  { ar: 'حجز بدون تعارض', en: 'Zero double-booking' },
                  { ar: 'تحديث حي للداشبورد', en: 'Live dashboard updates' },
                ].map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                    style={{ background: `${ACCENT}0A`, border: `1px solid ${ACCENT}22` }}>
                    <Check size={10} style={{ color: ACCENT }} strokeWidth={3} />
                    <span className={`text-xs ${language === 'ar' ? 'font-cairo' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {language === 'ar' ? c.ar : c.en}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3">
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: `0 0 30px ${ACCENT}40` }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => openWhatsAppChat()}
                  className={`flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl text-white font-semibold text-base cursor-pointer ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
                  style={{ background: `linear-gradient(135deg, #0D2B1E, ${ACCENT})`, boxShadow: `0 4px 24px ${ACCENT}35` }}
                >
                  <span>{t('احجز عرضاً توضيحياً', 'Book a Demo')}</span>
                  <ArrowIcon size={16} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' })}
                  className={`flex items-center justify-center gap-2 px-7 py-4 rounded-xl font-medium text-base cursor-pointer border ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
                  style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.04)' }}
                >
                  <Bot size={14} style={{ color: ACCENT }} />
                  <span>{t('شاهد كيف تعمل نورة', 'See How Nora Works')}</span>
                </motion.button>
              </div>

              {/* Stats */}
              <div className="flex gap-6 pt-1">
                {[
                  { val: '٢٤/٧', label: { ar: 'تغطية بدون توقف', en: 'Continuous coverage' } },
                  { val: '٧٨٪',  label: { ar: 'معدل تحويل المرضى', en: 'Patient conversion' } },
                  { val: '٠',    label: { ar: 'حجز مزدوج', en: 'Double bookings' } },
                ].map((s, i) => (
                  <div key={i} className="flex flex-col gap-0.5">
                    <span className={`text-2xl font-bold ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: ACCENT }}>{s.val}</span>
                    <span className={`text-xs ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {language === 'ar' ? s.label.ar : s.label.en}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right — Clinic Dashboard Mockup (GSAP float) */}
            <motion.div
              ref={mockupRef}
              initial={{ opacity: 0, x: 40 }}
              animate={heroInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <ClinicDashMockup />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" ref={featuresRef} className="relative py-24 overflow-hidden"
        style={{ background: '#080E1C' }}>
        <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${ACCENT}25, transparent)` }} />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65 }}
            className="text-center mb-14"
          >
            <h2 className={`text-3xl sm:text-4xl font-bold text-white mb-3 ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}>
              {t(<>نورة + النظام<br /><span style={{ color: ACCENT }}>من الداخل</span></>, <>Nora + The System<br /><span style={{ color: ACCENT }}>Under the Hood</span></>)}
            </h2>
            <p className={`text-base max-w-md mx-auto ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.5)' }}>
              {t('مبني خصيصاً للعيادات — ليس بوت عام.', 'Purpose-built for clinics — not a generic bot.')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f, i) => {
              const Icon = f.icon
              const c = language === 'ar' ? f.ar : f.en
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 32 }}
                  animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="p-6 rounded-2xl flex gap-4"
                  style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${ACCENT}12` }}
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, #0D2B1E, ${ACCENT})` }}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className={`font-bold text-white mb-1.5 ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}>{c.title}</h3>
                    <p className={`text-sm leading-relaxed ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.55)' }}>{c.desc}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── How Nora Works ── */}
      <section className="relative py-24 overflow-hidden" style={{ background: '#050810' }}>
        <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${ACCENT}25, transparent)` }} />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.65 }}
            className="text-center mb-16"
          >
            <h2 className={`text-3xl sm:text-4xl font-bold text-white mb-3 ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}>
              {t(
                <>كيف تشتغل <span style={{ color: ACCENT }}>نورة</span>؟</>,
                <>How Does <span style={{ color: ACCENT }}>Nora</span> Work?</>
              )}
            </h2>
            <p className={`text-base max-w-sm mx-auto ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
              style={{ color: 'rgba(255,255,255,0.45)' }}>
              {t('بدون ما تتدخل — تشتغل لوحدها.', 'No intervention needed — runs completely on its own.')}
            </p>
          </motion.div>

          <div className="nora-steps grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Animated connector — drawn by GSAP on scroll */}
            <div className="nora-connector hidden md:block absolute top-[44px] pointer-events-none"
              style={{
                insetInlineStart: '16%', insetInlineEnd: '16%', height: 1,
                backgroundImage: `repeating-linear-gradient(90deg, ${ACCENT}40 0, ${ACCENT}40 7px, transparent 7px, transparent 16px)`,
              }} />

            {[
              {
                num: '١', Icon: Phone,
                title: { ar: 'مريض يتصل أو يواتس', en: 'Patient Calls or WhatsApps' },
                desc:  { ar: 'في أي وقت — الليل، العطلة، وقت الدوام. نورة دايماً موجودة.', en: 'Anytime — nights, weekends, working hours. Nora is always available.' },
              },
              {
                num: '٢', Icon: Calendar,
                title: { ar: 'نورة تحجز له موعد', en: 'Nora Books the Appointment' },
                desc:  { ar: 'تفحص الجدول، تختار الدكتور المناسب، وتثبت الموعد فوراً.', en: 'Checks the schedule, picks the right doctor, confirms instantly.' },
              },
              {
                num: '٣', Icon: MessageSquare,
                title: { ar: 'يوصله تأكيد فوري', en: 'Instant Confirmation Sent' },
                desc:  { ar: 'رسالة واتساب تلقائية — اسمه، الدكتور، الوقت. كل شيء جاهز.', en: 'Automatic WhatsApp message — name, doctor, time. All set.' },
              },
            ].map((step, i) => (
              <div
                key={i}
                className="nora-step relative flex flex-col items-center text-center gap-4 p-7 rounded-2xl"
                style={{ background: `${ACCENT}06`, border: `1px solid ${ACCENT}15` }}
              >
                <div className="relative">
                  <div className="nora-icon w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, #0D2B1E, ${ACCENT})`, boxShadow: `0 6px 24px ${ACCENT}35` }}>
                    <step.Icon size={22} className="text-white" />
                  </div>
                  <div className="absolute -top-2 -end-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-sora"
                    style={{ background: ACCENT, color: '#050810' }}>
                    {step.num}
                  </div>
                </div>
                <h3 className={`text-lg font-bold text-white ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}>
                  {language === 'ar' ? step.title.ar : step.title.en}
                </h3>
                <p className={`text-sm leading-relaxed ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
                  style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {language === 'ar' ? step.desc.ar : step.desc.en}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Case Study ── */}
      <section ref={caseRef} className="relative py-24 overflow-hidden" style={{ background: '#050810' }}>
        <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${ACCENT}25, transparent)` }} />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={caseInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65 }}
            className="rounded-3xl overflow-hidden"
            style={{ background: `linear-gradient(160deg, ${ACCENT}07 0%, rgba(5,8,16,0.95) 60%)`, border: `1px solid ${ACCENT}18` }}
          >
            <div className="p-6 sm:p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Stethoscope size={14} style={{ color: ACCENT }} />
                    <span className={`text-xs font-semibold ${language === 'ar' ? 'font-cairo' : 'font-work'}`} style={{ color: ACCENT }}>
                      {t('دراسة حالة', 'Case Study')}
                    </span>
                  </div>
                  <h3 className={`text-xl font-bold text-white ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}>
                    {t('عيادات نور للأسنان — جدة', 'Noor Dental Clinics — Jeddah')}
                  </h3>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}>
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
                      initial={{ opacity: 0, y: 16 }}
                      animate={caseInView ? { opacity: 1, y: 0 } : {}}
                      transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                      className="flex items-center gap-3 p-3.5 rounded-xl"
                      style={{ background: `${ACCENT}08`, border: `1px solid ${ACCENT}15` }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${ACCENT}18` }}>
                        <Icon size={14} style={{ color: ACCENT }} />
                      </div>
                      <div>
                        <p className={`text-[10px] mb-0.5 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {language === 'ar' ? m.label.ar : m.label.en}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs line-through ${language === 'ar' ? 'font-cairo' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.25)' }}>
                            {language === 'ar' ? m.before.ar : m.before.en}
                          </span>
                          <ArrowRight size={8} style={{ color: ACCENT }} />
                          <span className={`text-base font-bold ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: ACCENT }}>
                            {language === 'ar' ? m.after.ar : m.after.en}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Testimonial */}
              <div className="p-4 rounded-xl" style={{ background: `${ACCENT}06`, border: `1px solid ${ACCENT}12` }}>
                <p className={`text-sm leading-relaxed italic mb-3 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {t(
                    '"نورة تستقبل الحجوزات بالليل والعطل وأنا مرتاح. الداشبورد يعطيني كل شيء في مكان واحد — الأطباء، المرضى، التقارير."',
                    '"Nora handles bookings at night and on weekends while I rest. The dashboard gives me everything in one place — doctors, patients, reports."'
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <TrendingUp size={11} style={{ color: ACCENT }} />
                  <p className={`text-[11px] font-semibold ${language === 'ar' ? 'font-cairo' : 'font-work'}`} style={{ color: `${ACCENT}AA` }}>
                    {t('إدارة عيادات نور — جدة', 'Noor Clinics Management — Jeddah')}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative py-20 overflow-hidden" style={{ background: '#080E1C' }}>
        <div className="max-w-2xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className={`text-3xl sm:text-4xl font-bold text-white mb-4 ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}>
              {t(<>جاهز تشغّل عيادتك<br /><span style={{ color: ACCENT }}>بشكل أحترافي؟</span></>, <>Ready to Run Your Clinic<br /><span style={{ color: ACCENT }}>Like a Pro?</span></>)}
            </h2>
            <p className={`text-base mb-8 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.55)' }}>
              {t('تواصل معنا وتقدر تشوف Demo كامل لنورة والداشبورد خلال ٢٤ ساعة.', 'Contact us and see a full demo of Nora and the dashboard within 24 hours.')}
            </p>
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: `0 0 40px ${ACCENT}40` }}
              whileTap={{ scale: 0.97 }}
              onClick={() => openWhatsAppChat()}
              className={`inline-flex items-center gap-2.5 px-8 py-4 rounded-xl text-white font-semibold text-base cursor-pointer ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
              style={{ background: `linear-gradient(135deg, #0D2B1E, ${ACCENT})`, boxShadow: `0 4px 24px ${ACCENT}35` }}
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
