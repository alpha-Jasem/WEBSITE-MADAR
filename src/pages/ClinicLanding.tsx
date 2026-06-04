import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Stethoscope, Calendar, Bot, Shield, BarChart3,
  ArrowLeft, ArrowRight, Check, Clock, Users, Phone, MessageSquare,
  Sparkles, TrendingUp,
} from 'lucide-react'
import { Navbar }           from '../components/public/Navbar'
import { Footer }           from '../components/public/Footer'
import { ClinicDashMockup } from '../components/public/ClinicDashMockup'
import { MadarAgentWidget } from '../components/dash/MadarAgentWidget'
import { useLanguage }      from '../context/LanguageContext'
import { openWhatsAppChat } from '../lib/whatsapp'

/* ── Design tokens ─────────────────────────────── */
const BG  = '#04080C'
const EM  = '#10B981'  // emerald — clinic theme
const EM2 = '#059669'  // darker emerald
const CY  = '#0099CC'  // Madar blue accent
const VI  = '#6366F1'  // violet accent

/* ── Glass card helper ─────────────────────────── */
const glassCard = (accent?: string): React.CSSProperties => ({
  background : 'rgba(4,8,14,0.58)',
  border     : `1px solid ${accent ? accent + '35' : 'rgba(255,255,255,0.10)'}`,
  boxShadow  : accent
    ? `inset 0 1px 0 ${accent}20, 0 4px 40px rgba(0,0,0,0.4)`
    : 'inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 40px rgba(0,0,0,0.35)',
  backdropFilter       : 'blur(20px)',
  WebkitBackdropFilter : 'blur(20px)',
})

/* ── Features ──────────────────────────────────── */
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
    icon: Shield, accent: VI,
    ar: { title: 'تكامل ذكي مع التقويم', desc: 'مصدر حقيقة واحد يدير جميع القنوات — الحجز ينجح تلقائياً ودائماً، بغض النظر عن أي خلل خارجي.' },
    en: { title: 'Smart Calendar Sync',   desc: 'A single source of truth manages all channels — booking succeeds reliably even if any external service fails.' },
  },
  {
    icon: BarChart3, accent: EM,
    ar: { title: 'داشبورد إدارة المواعيد', desc: 'KPIs لحظية، تقويم شهري، قائمة المرضى، تقارير الأطباء — كل شيء يتحدث فورياً في مكان واحد.' },
    en: { title: 'Appointment Dashboard',  desc: 'Live KPIs, monthly calendar, patient list, doctor reports — everything updates instantly in one place.' },
  },
]

/* ── Metrics ────────────────────────────────────── */
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

  return (
    <div style={{ background: BG, minHeight:'100vh', direction: isAr ? 'rtl' : 'ltr', position:'relative', overflowX:'hidden' }}>

      {/* ══ AURORA LAYER (emerald-dominant for clinic) ══ */}
      <div aria-hidden className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        {/* Wide emerald curtain — main aurora */}
        <div style={{ position:'absolute', top:'-15%', left:'-5%', right:'-5%', height:'80vh',
          background:'radial-gradient(ellipse 92% 68% at 50% 0%, rgba(16,185,129,0.52) 0%, rgba(0,180,100,0.28) 35%, rgba(0,100,70,0.12) 62%, transparent 80%)',
          filter:'blur(50px)', animation:'aur-a 20s ease-in-out infinite', willChange:'transform' }} />
        {/* Left emerald column */}
        <div style={{ position:'absolute', top:'-8%', left:'0%', width:660, height:720,
          background:'radial-gradient(ellipse, rgba(16,185,129,0.42) 0%, transparent 60%)',
          filter:'blur(52px)', animation:'aur-c 17s ease-in-out infinite', willChange:'transform' }} />
        {/* Right cyan column */}
        <div style={{ position:'absolute', top:'-5%', right:'0%', width:560, height:640,
          background:'radial-gradient(ellipse, rgba(0,191,255,0.26) 0%, transparent 62%)',
          filter:'blur(52px)', animation:'aur-b 26s ease-in-out infinite', willChange:'transform' }} />
        {/* Violet bottom */}
        <div style={{ position:'absolute', bottom:'5%', left:'30%', width:560, height:400,
          background:'radial-gradient(ellipse, rgba(99,102,241,0.16) 0%, transparent 65%)',
          filter:'blur(70px)', animation:'aur-a 22s ease-in-out infinite 4s', willChange:'transform' }} />
        <div style={{ position:'absolute', inset:0,
          backgroundImage:'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)',
          backgroundSize:'64px 64px' }} />
      </div>

      <Navbar />

      {/* ════════════════════════ BENTO HERO ════════════════════════ */}
      <section ref={heroRef} className="relative z-10 pt-28 pb-10 min-h-screen flex items-center">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-5 lg:px-8">

          {/* ── 12-col bento grid ── */}
          <div className="grid grid-cols-2 lg:grid-cols-12 gap-3 items-start">

            {/* ┌── CARD 1: Hero text (7 col × 2 rows) ─────────────────┐ */}
            <motion.div
              initial={{ opacity:0, y:28 }} animate={heroInView ? { opacity:1, y:0 } : {}}
              transition={{ duration:0.65, ease:[0.16,1,0.3,1] }}
              className="col-span-2 lg:col-span-7 lg:row-span-2 rounded-3xl p-8 sm:p-10 flex flex-col justify-center"
              style={{ ...glassCard(), minHeight: 340 }}
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-6 self-start"
                style={{ background:`${EM}12`, border:`1px solid ${EM}35` }}>
                <Sparkles size={11} style={{ color: EM }} />
                <span className={`text-[11px] font-semibold tracking-widest uppercase ${isAr ? 'font-cairo' : 'font-work'}`}
                  style={{ color: EM }}>
                  Clinic OS — Madar
                </span>
              </div>

              {/* H1 */}
              <h1 className={`text-4xl sm:text-5xl xl:text-6xl font-black leading-[1.08] mb-5 ${isAr ? 'font-cairo' : 'font-sora'}`}
                style={{ color:'white', letterSpacing:'-0.02em' }}>
                {t(
                  <>{`نظّم عيادتك.`}<br /><span style={{ background:`linear-gradient(135deg, ${EM}, ${CY})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>دع الذكاء يحجز.</span></>,
                  <>{`Manage Your Clinic.`}<br /><span style={{ background:`linear-gradient(135deg, ${EM}, ${CY})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Let AI Book.</span></>
                )}
              </h1>

              {/* Subtitle */}
              <p className={`text-base sm:text-lg max-w-xl mb-8 leading-relaxed ${isAr ? 'font-tajawal' : 'font-work'}`}
                style={{ color:'rgba(255,255,255,0.42)' }}>
                {t(
                  'مساعد استقبال بالذكاء الاصطناعي يعمل ٢٤/٧ — يحجز المواعيد بدون تعارض، ويدير المرضى من لوحة واحدة. بدون موظف إضافي.',
                  'An AI receptionist running 24/7 — books appointments without conflicts and manages patients from one dashboard. No extra staff needed.'
                )}
              </p>

              {/* Chips */}
              <div className="flex flex-wrap gap-2 mb-8">
                {[
                  { ar:'حجز بدون تعارض', en:'Zero double-booking' },
                  { ar:'تغطية ٢٤/٧',     en:'24/7 coverage'       },
                  { ar:'تأكيد فوري',      en:'Instant confirmation' },
                  { ar:'تقارير لحظية',    en:'Live reports'         },
                ].map((c,i) => (
                  <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{ background:`${EM}0F`, border:`1px solid ${EM}28` }}>
                    <Check size={9} strokeWidth={3} style={{ color: EM }} />
                    <span className={`text-xs font-medium ${isAr ? 'font-tajawal' : 'font-work'}`}
                      style={{ color:'rgba(255,255,255,0.65)' }}>
                      {isAr ? c.ar : c.en}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3">
                <motion.button
                  whileHover={{ scale:1.02, boxShadow:`0 0 32px ${EM}45` }}
                  whileTap={{ scale:0.97 }}
                  onClick={() => openWhatsAppChat()}
                  className={`inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-white font-semibold text-sm cursor-pointer ${isAr ? 'font-cairo' : 'font-work'}`}
                  style={{ background:`linear-gradient(135deg, ${EM2}, ${EM})`, boxShadow:`0 4px 20px ${EM}30` }}
                >
                  {t('احجز عرضاً توضيحياً', 'Book a Demo')}
                  <ArrowIcon size={14} />
                </motion.button>
                <motion.button
                  whileHover={{ scale:1.02 }}
                  whileTap={{ scale:0.97 }}
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior:'smooth' })}
                  className={`inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl font-medium text-sm cursor-pointer ${isAr ? 'font-cairo' : 'font-work'}`}
                  style={{ border:'1px solid rgba(255,255,255,0.13)', color:'rgba(255,255,255,0.58)', background:'transparent' }}
                >
                  {t('اكتشف المزايا', 'Explore Features')}
                </motion.button>
              </div>
            </motion.div>

            {/* ┌── CARD 2: Stat ٢٤/٧ (3 col) ──────────────────────────┐ */}
            <motion.div
              initial={{ opacity:0, y:28 }} animate={heroInView ? { opacity:1, y:0 } : {}}
              transition={{ duration:0.6, delay:0.12, ease:[0.16,1,0.3,1] }}
              className="col-span-1 lg:col-span-3 rounded-3xl p-6 flex flex-col justify-between"
              style={{ ...glassCard(EM), minHeight: 160 }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background:`${EM}20` }}>
                <Stethoscope size={16} style={{ color: EM }} />
              </div>
              <div>
                <div className={`text-4xl sm:text-5xl font-black ${isAr ? 'font-cairo' : 'font-sora'}`}
                  style={{ color: EM, letterSpacing:'-2px' }}>٢٤/٧</div>
                <div className={`text-xs mt-1 ${isAr ? 'font-tajawal' : 'font-work'}`}
                  style={{ color:'rgba(255,255,255,0.3)' }}>
                  {t('استقبال بلا توقف', 'Always Receiving')}
                </div>
              </div>
            </motion.div>

            {/* ┌── CARD 3: Zero bookings (2 col) ───────────────────────┐ */}
            <motion.div
              initial={{ opacity:0, y:28 }} animate={heroInView ? { opacity:1, y:0 } : {}}
              transition={{ duration:0.6, delay:0.18, ease:[0.16,1,0.3,1] }}
              className="col-span-1 lg:col-span-2 rounded-3xl p-6 flex flex-col justify-between"
              style={{ ...glassCard(CY), minHeight: 160 }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background:`${CY}20` }}>
                <Calendar size={16} style={{ color: CY }} />
              </div>
              <div>
                <div className={`text-4xl sm:text-5xl font-black ${isAr ? 'font-cairo' : 'font-sora'}`}
                  style={{ color:'white', letterSpacing:'-2px' }}>٠</div>
                <div className={`text-xs mt-1 ${isAr ? 'font-tajawal' : 'font-work'}`}
                  style={{ color:'rgba(255,255,255,0.3)' }}>
                  {t('حجز مزدوج', 'Double bookings')}
                </div>
              </div>
            </motion.div>

            {/* ┌── CARD 4: Live badge (5 col) ──────────────────────────┐ */}
            <motion.div
              initial={{ opacity:0, y:28 }} animate={heroInView ? { opacity:1, y:0 } : {}}
              transition={{ duration:0.6, delay:0.26, ease:[0.16,1,0.3,1] }}
              className="col-span-2 lg:col-span-5 rounded-3xl p-5"
              style={glassCard()}
            >
              <div className="flex items-center justify-between mb-3">
                <p className={`text-[10px] font-semibold tracking-[0.2em] uppercase ${isAr ? 'font-cairo' : 'font-work'}`}
                  style={{ color:'rgba(255,255,255,0.22)' }}>
                  {t('عيادات نور — جدة', 'Noor Clinics — Jeddah')}
                </p>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{ background:`${EM}15`, border:`1px solid ${EM}30` }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background:'#4ADE80', animation:'pulse-live 2s ease-in-out infinite' }} />
                  <span className={`text-[9px] font-bold ${isAr ? 'font-cairo' : 'font-work'}`}
                    style={{ color:'#4ADE80' }}>{t('نشط','LIVE')}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val:'١٨', lbl:{ ar:'موعد اليوم',  en:"Today's appts" }, color: EM  },
                  { val:'٧٨٪', lbl:{ ar:'معدل التحويل', en:'Conversion'   }, color: CY  },
                  { val:'٠',  lbl:{ ar:'تعارض',       en:'Conflicts'     }, color:'white' },
                ].map((s,i) => (
                  <div key={i} className="rounded-xl px-3 py-2.5" style={{ background:'rgba(255,255,255,0.04)' }}>
                    <div className={`text-lg font-black ${isAr ? 'font-cairo' : 'font-sora'}`}
                      style={{ color: s.color }}>{s.val}</div>
                    <div className={`text-[9px] ${isAr ? 'font-tajawal' : 'font-work'}`}
                      style={{ color:'rgba(255,255,255,0.28)' }}>
                      {isAr ? s.lbl.ar : s.lbl.en}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

          </div>{/* end hero bento */}

          {/* ── Dashboard browser frame (below bento) ── */}
          <motion.div
            initial={{ opacity:0, y:48 }} animate={heroInView ? { opacity:1, y:0 } : {}}
            transition={{ duration:0.8, delay:0.35, ease:[0.16,1,0.3,1] }}
            className="mt-4 rounded-3xl overflow-hidden"
            style={{ boxShadow:`0 40px 100px ${EM}15, 0 8px 24px rgba(0,0,0,0.4)`, border:`1px solid ${EM}22` }}
          >
            {/* Browser chrome bar */}
            <div className="flex items-center gap-2 px-4 py-3"
              style={{ background:'rgba(255,255,255,0.04)', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex gap-1.5">
                {['rgba(255,255,255,0.12)','rgba(255,255,255,0.12)','rgba(255,255,255,0.12)'].map((c,i) => (
                  <div key={i} className="w-3 h-3 rounded-full" style={{ background: c }} />
                ))}
              </div>
              <div className="flex-1 mx-4 px-3 py-1 rounded-lg text-xs text-center"
                style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.35)', fontFamily:'monospace' }}>
                app.madar.software/clinic
              </div>
            </div>
            <ClinicDashMockup />
          </motion.div>

        </div>
      </section>

      {/* ════════════════════════ FEATURES ════════════════════════ */}
      <section id="features" ref={featuresRef} className="relative z-10 py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 lg:px-8">
          <motion.div
            initial={{ opacity:0, y:20 }} animate={featuresInView ? { opacity:1, y:0 } : {}}
            transition={{ duration:0.55 }}
            className="text-center mb-14"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
              style={{ background:`${EM}15`, border:`1px solid ${EM}30` }}>
              <span className={`text-[11px] font-semibold tracking-widest uppercase ${isAr ? 'font-cairo' : 'font-work'}`}
                style={{ color: EM }}>
                {t('المزايا', 'Features')}
              </span>
            </div>
            <h2 className={`text-3xl sm:text-4xl font-black text-white mb-3 ${isAr ? 'font-cairo' : 'font-sora'}`}
              style={{ letterSpacing:'-0.02em' }}>
              {t('نظام مبني خصيصاً للعيادات', 'Purpose-Built for Clinics')}
            </h2>
            <p className={`text-base max-w-md mx-auto ${isAr ? 'font-tajawal' : 'font-work'}`}
              style={{ color:'rgba(255,255,255,0.32)' }}>
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
                  initial={{ opacity:0, y:28 }} animate={featuresInView ? { opacity:1, y:0 } : {}}
                  transition={{ duration:0.55, delay: i * 0.08, ease:[0.16,1,0.3,1] }}
                  whileHover={{ y:-4, transition:{ duration:0.2 } }}
                  className="relative overflow-hidden rounded-3xl p-6 flex gap-4"
                  style={glassCard(f.accent)}
                >
                  {/* Top accent */}
                  <div className="absolute top-0 inset-x-0 h-px"
                    style={{ background:`linear-gradient(90deg, transparent, ${f.accent}55, transparent)` }} />
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background:`${f.accent}20`, boxShadow:`0 4px 16px ${f.accent}18` }}>
                    <Icon size={20} style={{ color: f.accent }} />
                  </div>
                  <div>
                    <h3 className={`font-bold text-white mb-1.5 ${isAr ? 'font-cairo' : 'font-sora'}`}>{c.title}</h3>
                    <p className={`text-sm leading-relaxed ${isAr ? 'font-tajawal' : 'font-work'}`}
                      style={{ color:'rgba(255,255,255,0.42)' }}>{c.desc}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════ HOW IT WORKS ════════════════════════ */}
      <section ref={stepsRef} className="relative z-10 py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-5 lg:px-8">
          <motion.div
            initial={{ opacity:0, y:20 }} animate={stepsInView ? { opacity:1, y:0 } : {}}
            transition={{ duration:0.55 }}
            className="text-center mb-14"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
              style={{ background:`${CY}15`, border:`1px solid ${CY}30` }}>
              <TrendingUp size={10} style={{ color: CY }} />
              <span className={`text-[11px] font-semibold tracking-widest uppercase ${isAr ? 'font-cairo' : 'font-work'}`}
                style={{ color: CY }}>
                {t('كيف يعمل', 'How It Works')}
              </span>
            </div>
            <h2 className={`text-3xl sm:text-4xl font-black text-white mb-3 ${isAr ? 'font-cairo' : 'font-sora'}`}
              style={{ letterSpacing:'-0.02em' }}>
              {t('ثلاث خطوات — وبعدها يشتغل لوحده', 'Three Steps — Then It Runs Itself')}
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { num:'01', numAr:'١', Icon: Phone,         accent: EM,
                title:{ ar:'مريض يتصل أو يواتس',    en:'Patient Calls or WhatsApps'  },
                desc :{ ar:'في أي وقت — الليل أو العطلة. المساعد دائماً موجود.', en:'Anytime — nights or weekends. The assistant is always available.' },
              },
              { num:'02', numAr:'٢', Icon: Calendar,      accent: CY,
                title:{ ar:'النظام يحجز له موعد',    en:'System Books the Appointment' },
                desc :{ ar:'يفحص الجدول، يختار الدكتور، ويثبت الموعد فوراً.',      en:'Checks the schedule, picks the doctor, confirms instantly.' },
              },
              { num:'03', numAr:'٣', Icon: MessageSquare, accent: VI,
                title:{ ar:'يوصله تأكيد فوري',       en:'Instant Confirmation Sent'   },
                desc :{ ar:'رسالة واتساب تلقائية — الاسم، الدكتور، الوقت.',        en:'Auto WhatsApp — name, doctor, time. All set.' },
              },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity:0, y:32 }} animate={stepsInView ? { opacity:1, y:0 } : {}}
                transition={{ duration:0.6, delay: i * 0.1, ease:[0.16,1,0.3,1] }}
                whileHover={{ y:-5, transition:{ duration:0.2 } }}
                className="relative overflow-hidden rounded-3xl p-7 flex flex-col gap-5 text-center items-center"
                style={glassCard(step.accent)}
              >
                {/* Accent line top */}
                <div className="absolute top-0 inset-x-0 h-px"
                  style={{ background:`linear-gradient(90deg, transparent, ${step.accent}60, transparent)` }} />

                {/* Big background number */}
                <div aria-hidden className="absolute bottom-0 end-3 pointer-events-none select-none leading-none"
                  style={{ fontSize:130, fontWeight:900, color:`${step.accent}07`, fontFamily:'Sora, sans-serif', lineHeight:0.85 }}>
                  {isAr ? step.numAr : step.num}
                </div>

                {/* Icon */}
                <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background:`${step.accent}20`, boxShadow:`0 6px 20px ${step.accent}22` }}>
                  <step.Icon size={22} style={{ color: step.accent }} />
                </div>

                <div className="relative">
                  <h3 className={`text-base font-bold text-white mb-2 ${isAr ? 'font-cairo' : 'font-sora'}`}>
                    {isAr ? step.title.ar : step.title.en}
                  </h3>
                  <p className={`text-sm leading-relaxed ${isAr ? 'font-tajawal' : 'font-work'}`}
                    style={{ color:'rgba(255,255,255,0.42)' }}>
                    {isAr ? step.desc.ar : step.desc.en}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════ CASE STUDY ════════════════════════ */}
      <section ref={caseRef} className="relative z-10 py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-5 lg:px-8">
          <motion.div
            initial={{ opacity:0, y:28 }} animate={caseInView ? { opacity:1, y:0 } : {}}
            transition={{ duration:0.65 }}
            className="relative overflow-hidden rounded-3xl p-6 sm:p-8"
            style={glassCard(EM)}
          >
            {/* Top accent */}
            <div className="absolute top-0 inset-x-0 h-px"
              style={{ background:`linear-gradient(90deg, transparent, ${EM}80, transparent)` }} />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Stethoscope size={13} style={{ color: EM }} />
                  <span className={`text-xs font-semibold ${isAr ? 'font-cairo' : 'font-work'}`}
                    style={{ color: EM }}>{t('دراسة حالة', 'Case Study')}</span>
                </div>
                <h3 className={`text-xl font-black text-white ${isAr ? 'font-cairo' : 'font-sora'}`}>
                  {t('عيادات نور للأسنان — جدة', 'Noor Dental Clinics — Jeddah')}
                </h3>
              </div>
              <div className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5"
                style={{ background:`${EM}18`, color: EM, border:`1px solid ${EM}35` }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background:'#4ADE80', animation:'pulse-live 2s ease-in-out infinite' }} />
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
                    initial={{ opacity:0, y:16 }} animate={caseInView ? { opacity:1, y:0 } : {}}
                    transition={{ duration:0.5, delay: 0.15 + i * 0.1 }}
                    className="flex items-center gap-3 p-4 rounded-2xl"
                    style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background:`${EM}20` }}>
                      <Icon size={15} style={{ color: EM }} />
                    </div>
                    <div>
                      <p className={`text-[10px] mb-0.5 ${isAr ? 'font-tajawal' : 'font-work'}`}
                        style={{ color:'rgba(255,255,255,0.28)' }}>
                        {isAr ? m.label.ar : m.label.en}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs line-through ${isAr ? 'font-cairo' : 'font-work'}`}
                          style={{ color:'rgba(255,255,255,0.22)' }}>
                          {isAr ? m.before.ar : m.before.en}
                        </span>
                        <ArrowRight size={8} style={{ color:'rgba(255,255,255,0.22)' }} />
                        <span className={`text-base font-black ${isAr ? 'font-cairo' : 'font-sora'}`}
                          style={{ color: EM }}>
                          {isAr ? m.after.ar : m.after.en}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Testimonial */}
            <div className="p-4 rounded-2xl" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
              <p className={`text-sm leading-relaxed italic mb-3 ${isAr ? 'font-tajawal' : 'font-work'}`}
                style={{ color:'rgba(255,255,255,0.6)' }}>
                {t(
                  '"المساعد الذكي يستقبل الحجوزات بالليل والعطل وأنا مرتاح. الداشبورد يعطيني كل شيء في مكان واحد — الأطباء، المرضى، التقارير."',
                  '"The AI assistant handles bookings at night and on weekends while I rest. The dashboard gives me everything in one place — doctors, patients, reports."'
                )}
              </p>
              <div className="flex items-center gap-2">
                <TrendingUp size={11} style={{ color: EM }} />
                <p className={`text-[11px] font-semibold ${isAr ? 'font-cairo' : 'font-work'}`}
                  style={{ color:'rgba(255,255,255,0.32)' }}>
                  {t('إدارة عيادات نور — جدة', 'Noor Clinics Management — Jeddah')}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════ CTA ════════════════════════ */}
      <section className="relative z-10 py-24">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity:0, y:24 }} whileInView={{ opacity:1, y:0 }}
            viewport={{ once:true }}
            transition={{ duration:0.6 }}
            className="relative overflow-hidden rounded-3xl p-10 sm:p-14"
            style={{
              background:`linear-gradient(135deg, ${EM}18 0%, transparent 50%, ${CY}12 100%)`,
              border:`1px solid ${EM}30`,
              boxShadow:`0 40px 100px ${EM}20`,
            }}
          >
            {/* Accent lines */}
            <div className="absolute top-0 inset-x-0 h-px"
              style={{ background:`linear-gradient(90deg, transparent, ${EM}80, transparent)` }} />
            <div className="absolute bottom-0 inset-x-0 h-px"
              style={{ background:`linear-gradient(90deg, transparent, ${CY}50, transparent)` }} />

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
              style={{ background:`${EM}15`, border:`1px solid ${EM}30` }}>
              <Sparkles size={10} style={{ color: EM }} />
              <span className={`text-[10px] font-semibold tracking-widest uppercase ${isAr ? 'font-cairo' : 'font-work'}`}
                style={{ color: EM }}>
                {t('ابدأ اليوم', 'Get Started')}
              </span>
            </div>

            <h2 className={`text-3xl sm:text-4xl font-black text-white mb-4 ${isAr ? 'font-cairo' : 'font-sora'}`}
              style={{ letterSpacing:'-0.02em' }}>
              {t(
                <>جاهز تشغّل عيادتك<br /><span style={{ background:`linear-gradient(135deg, ${EM}, ${CY})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>بشكل احترافي؟</span></>,
                <>Ready to Run Your Clinic<br /><span style={{ background:`linear-gradient(135deg, ${EM}, ${CY})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Like a Pro?</span></>
              )}
            </h2>
            <p className={`text-base mb-8 ${isAr ? 'font-tajawal' : 'font-work'}`}
              style={{ color:'rgba(255,255,255,0.45)' }}>
              {t('تواصل معنا وتقدر تشوف Demo كامل للنظام خلال ٢٤ ساعة.', 'Contact us and see a full system demo within 24 hours.')}
            </p>
            <motion.button
              whileHover={{ scale:1.02, boxShadow:`0 0 50px ${EM}55` }}
              whileTap={{ scale:0.97 }}
              onClick={() => openWhatsAppChat()}
              className={`inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-base cursor-pointer ${isAr ? 'font-cairo' : 'font-work'}`}
              style={{ background:`linear-gradient(135deg, ${EM2}, ${EM})`, color:'white', boxShadow:`0 4px 24px ${EM}40` }}
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
