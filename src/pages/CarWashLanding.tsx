import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Car,
  Check,
  CheckCircle2,
  MessageSquare,
  QrCode,
  ShieldCheck,
  Sparkles,
  WalletCards,
  Zap,
} from 'lucide-react'
import { Footer } from '../components/public/Footer'
import { useNavigate } from 'react-router-dom'
import { CarWashDashMockup } from '../components/public/CarWashDashMockup'
import { MadarAgentWidget } from '../components/dash/MadarAgentWidget'
import { useLanguage } from '../context/LanguageContext'
import { openWhatsAppChat } from '../lib/whatsapp'

const ACCENT = '#0B74FF'
const NAVY = '#071739'

const valueCards = [
  {
    icon: QrCode,
    ar: { title: 'دخول ذاتي بالـ QR', desc: 'العميل يسجل نفسه، يحصل على رقم انتظار، والموظف يشوف السيارة فوراً بدون زحمة على الكاشير.' },
    en: { title: 'Self Check-in by QR', desc: 'Customers register themselves, receive a queue number, and your team sees the car instantly.' },
  },
  {
    icon: Car,
    ar: { title: 'مسار سيارات مباشر', desc: 'استلام، قيد الخدمة، جاهزة، تم التسليم. حركة واضحة وسريعة تناسب شاشة تشغيل يومية.' },
    en: { title: 'Live Car Flow', desc: 'Intake, in service, ready, delivered. A fast operating screen built for daily use.' },
  },
  {
    icon: MessageSquare,
    ar: { title: 'رسائل واتساب تشغيلية', desc: 'إشعار جاهزية، إيصال، ولاء، متابعة وتقييم. لا حاجة لموظف يتذكر كل رسالة.' },
    en: { title: 'Operational WhatsApp', desc: 'Ready alerts, receipts, loyalty, follow-ups, and reviews without manual reminders.' },
  },
  {
    icon: BarChart3,
    ar: { title: 'مالية وإغلاق يومي', desc: 'إيراد اليوم، الضريبة، متوسط الفاتورة، وأرقام التسليم في لوحة واحدة واضحة للمالك.' },
    en: { title: 'Finance and Closing', desc: 'Daily revenue, VAT, average ticket, and delivered cars in one owner-ready dashboard.' },
  },
]

const journey = [
  { icon: QrCode, ar: 'مسح QR', en: 'Scan QR' },
  { icon: WalletCards, ar: 'اختيار الخدمة', en: 'Choose Service' },
  { icon: Car, ar: 'رقم انتظار', en: 'Queue Number' },
  { icon: CheckCircle2, ar: 'تحديث مباشر', en: 'Live Updates' },
]

const metrics = [
  { before: 'يدوي', after: '< ثانية', labelAr: 'وقت إشعار العميل', labelEn: 'Customer alert time' },
  { before: '0%', after: '68%', labelAr: 'تحصيل التقييمات', labelEn: 'Reviews collected' },
  { before: '+40 ساعة', after: '4 ساعات', labelAr: 'عمل يدوي شهري', labelEn: 'Monthly manual work' },
]

const packages = [
  {
    name: 'Pro',
    launchPrice: '٥٠٠ ر.س/شهر',
    regularPrice: '٧٩٩ ر.س/شهر',
    ar: 'تشغيل كامل للمغسلة: QR، لوحة تشغيل، عملاء، مالية، تقارير، وواتساب تشغيلي.',
    en: 'Complete car wash operations: QR, live queue, customers, finance, reports, and operational WhatsApp.',
  },
  {
    name: 'Platinum',
    launchPrice: '١,٠٠٠ ر.س/شهر',
    regularPrice: '١,٩٩٩ ر.س/شهر',
    ar: 'للمغاسل الجادة: كل مزايا Pro مع إعداد أعمق، أولوية دعم، وتوسعة جاهزة للفروع والإضافات.',
    en: 'For serious operators: everything in Pro, deeper setup, priority support, and expansion-ready features.',
  },
]

const CwNavbar = () => {
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const navLinks = [
    { ar: 'طريقة QR', en: 'QR Flow', href: '#car-wash-dashboard' },
    { ar: 'الدليل',   en: 'Guide',    href: '#how' },
    { ar: 'الباقات',  en: 'Packages', href: '#packages' },
    { ar: 'الأسئلة',  en: 'FAQ',      href: '#faq' },
    { ar: 'واتساب',   en: 'WhatsApp', href: '#', onClick: openWhatsAppChat },
  ]
  return (
    <nav style={{
      position: 'fixed', top: 0, right: 0, left: 0, zIndex: 100, height: 64,
      background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(7,23,57,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px', direction: 'rtl',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #071739, #0B74FF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Car size={18} color="white" />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, color: '#071739', fontFamily: 'Cairo, sans-serif', lineHeight: 1 }}>Madar OS</div>
          <div style={{ fontSize: 10, color: '#6B7A99', fontFamily: 'Tajawal, sans-serif' }}>نظام تشغيل للمغاسل</div>
        </div>
      </div>

      {/* Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        {navLinks.map(l => (
          <a key={l.ar} href={l.href}
            onClick={e => { if (l.onClick) { e.preventDefault(); l.onClick() } }}
            style={{ fontSize: 13, fontWeight: 600, color: '#3B4F6F', textDecoration: 'none', fontFamily: 'Cairo, sans-serif', cursor: 'pointer' }}>
            {language === 'ar' ? l.ar : l.en}
          </a>
        ))}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => navigate('/login')} style={{ padding: '7px 16px', borderRadius: 8, background: 'transparent', color: '#3B4F6F', border: '1px solid rgba(7,23,57,0.15)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
          {t('تسجيل الدخول', 'Sign In')}
        </button>
        <button onClick={() => navigate('/trial')} style={{ padding: '7px 18px', borderRadius: 8, background: 'linear-gradient(135deg, #071739, #0B74FF)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
          {t('ابدأ تجربتك', 'Start Trial')} <ArrowLeft size={13} />
        </button>
      </div>
    </nav>
  )
}

export const CarWashLanding = () => {
  const { t, language } = useLanguage()
  const ArrowIcon = language === 'ar' ? ArrowLeft : ArrowRight
  const heroRef = useRef(null)
  const flowRef = useRef(null)
  const proofRef = useRef(null)
  const heroInView = useInView(heroRef, { once: true })
  const flowInView = useInView(flowRef, { once: true, margin: '-80px' })
  const proofInView = useInView(proofRef, { once: true, margin: '-80px' })

  return (
    <div className="min-h-screen overflow-hidden" style={{ background: '#F6FAFF' }}>
      <CwNavbar />

      <section ref={heroRef} className="relative flex min-h-screen items-center overflow-hidden" style={{ paddingTop: 88 }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{ background: 'linear-gradient(120deg, rgba(255,255,255,0.98) 0%, rgba(242,248,255,0.94) 42%, rgba(222,239,255,0.76) 100%)' }} />
          <div className="absolute -left-32 top-20 h-[520px] w-[520px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(11,116,255,0.18), transparent 65%)', filter: 'blur(20px)' }} />
          <div className="absolute bottom-0 right-0 h-[360px] w-[680px]" style={{ background: 'linear-gradient(135deg, transparent, rgba(11,116,255,0.12))', clipPath: 'polygon(24% 0, 100% 0, 100% 100%, 0 100%)' }} />
          <div className="absolute inset-0 opacity-[0.36]" style={{ backgroundImage: 'linear-gradient(rgba(7,23,57,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(7,23,57,0.05) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
        </div>

        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-10 py-12 lg:min-h-[calc(100vh-88px)] lg:grid-cols-[0.82fr_1.18fr] lg:py-0">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-6"
            >
              <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-white px-4 py-2 shadow-sm" style={{ borderColor: 'rgba(11,116,255,0.18)' }}>
                <span className="h-2 w-2 rounded-full" style={{ background: ACCENT, boxShadow: `0 0 0 6px ${ACCENT}14` }} />
                <span className={`text-xs font-bold ${language === 'ar' ? 'font-cairo' : 'font-work'}`} style={{ color: NAVY }}>
                  {t('نظام تشغيل متكامل للمغاسل', 'Operating System for Car Washes')}
                </span>
              </div>

              <h1 className={`text-5xl font-black leading-[1.08] sm:text-6xl xl:text-7xl ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: NAVY }}>
                {t(
                  <>إدارة أسهل.<br /><span style={{ color: ACCENT }}>تشغيل أسرع.</span><br />مبيعات أوضح.</>,
                  <>Simpler Ops.<br /><span style={{ color: ACCENT }}>Faster Flow.</span><br />Clearer Sales.</>
                )}
              </h1>

              <p className={`max-w-xl text-lg leading-relaxed ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: '#4B5E7E' }}>
                {t(
                  'مدار OS ينظم استقبال السيارات، أرقام الانتظار، حالة الخدمة، العملاء، المالية، والتقارير من مكان واحد مصمم ليوم العمل داخل المغسلة.',
                  'Madar OS organizes intake, queue numbers, service status, customers, finance, and reporting from one daily operating hub built for car washes.'
                )}
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: `0 18px 40px ${ACCENT}28` }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => openWhatsAppChat()}
                  className={`flex items-center justify-center gap-2.5 rounded-2xl px-7 py-4 text-base font-bold text-white ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
                  style={{ background: `linear-gradient(135deg, ${NAVY}, ${ACCENT})` }}
                >
                  {t('ابدأ تجربة المغسلة', 'Start Car Wash Trial')}
                  <ArrowIcon size={17} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => document.querySelector('#car-wash-dashboard')?.scrollIntoView({ behavior: 'smooth' })}
                  className={`flex items-center justify-center gap-2 rounded-2xl border bg-white px-7 py-4 text-base font-bold ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
                  style={{ borderColor: 'rgba(7,23,57,0.12)', color: NAVY }}
                >
                  <Zap size={16} style={{ color: ACCENT }} />
                  {t('شاهد الداشبورد', 'View Dashboard')}
                </motion.button>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  ['10x', t('أسرع في الرد', 'Faster replies')],
                  ['68%', t('تقييمات أكثر', 'More reviews')],
                  ['24/7', t('متابعة مستمرة', 'Always on')],
                ].map(([value, label]) => (
                  <div key={String(value)} className="rounded-2xl bg-white p-3 shadow-sm" style={{ border: '1px solid rgba(7,23,57,0.08)' }}>
                    <p className="text-2xl font-black" style={{ color: ACCENT, fontFamily: 'Sora, Cairo, sans-serif' }}>{value}</p>
                    <p className={`mt-1 text-[11px] ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: '#6B7A99' }}>{label}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 36, scale: 0.98 }}
              animate={heroInView ? { opacity: 1, x: 0, scale: 1 } : {}}
              transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
              id="car-wash-dashboard"
            >
              <div className="absolute -inset-5 rounded-[36px]" style={{ background: 'linear-gradient(135deg, rgba(11,116,255,0.16), rgba(16,185,129,0.08))', filter: 'blur(24px)' }} />
              <div className="relative">
                <CarWashDashMockup />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section ref={flowRef} className="relative py-20" style={{ background: '#FFFFFF' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={false}
            animate={flowInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65 }}
            className="mb-12 text-center"
          >
            <p className={`mb-3 text-xs font-black tracking-[0.22em] ${language === 'ar' ? 'font-cairo' : 'font-work'}`} style={{ color: ACCENT }}>
              {t('من أول سيارة إلى نهاية اليوم', 'FROM FIRST CAR TO CLOSING')}
            </p>
            <h2 className={`text-3xl font-black sm:text-5xl ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: NAVY }}>
              {t('رحلة تشغيل قصيرة وواضحة', 'A Short, Clear Operating Journey')}
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {journey.map((step, index) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.en}
                  initial={false}
                  animate={flowInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  className="relative rounded-3xl p-6 text-center"
                  style={{ background: '#F6FAFF', border: '1px solid rgba(7,23,57,0.08)' }}
                >
                  {index < journey.length - 1 && <div className="absolute -left-2 top-1/2 hidden h-px w-4 md:block" style={{ background: 'rgba(11,116,255,0.35)' }} />}
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: `linear-gradient(135deg, ${NAVY}, ${ACCENT})` }}>
                    <Icon size={23} className="text-white" />
                  </div>
                  <p className={`text-lg font-black ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: NAVY }}>
                    {language === 'ar' ? step.ar : step.en}
                  </p>
                </motion.div>
              )
            })}
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-4">
            {valueCards.map((card, index) => {
              const Icon = card.icon
              const content = language === 'ar' ? card.ar : card.en
              return (
                <motion.div
                  key={content.title}
                  initial={false}
                  animate={flowInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.55, delay: 0.22 + index * 0.08 }}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  className="rounded-3xl bg-white p-6 shadow-sm"
                  style={{ border: '1px solid rgba(7,23,57,0.08)' }}
                >
                  <Icon size={25} className="mb-4" style={{ color: ACCENT }} />
                  <h3 className={`mb-2 text-lg font-black ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: NAVY }}>{content.title}</h3>
                  <p className={`text-sm leading-relaxed ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: '#5C6D89' }}>{content.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      <section ref={proofRef} className="relative py-20" style={{ background: 'linear-gradient(180deg, #F6FAFF, #FFFFFF)' }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <motion.div
              initial={false}
              animate={proofInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.65 }}
              className="rounded-[32px] p-7 text-white"
              style={{ background: `linear-gradient(145deg, ${NAVY}, #0B2D66 72%, ${ACCENT})`, boxShadow: '0 30px 80px rgba(7,23,57,0.20)' }}
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <ShieldCheck size={24} />
              </div>
              <h2 className={`mb-4 text-3xl font-black ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}>
                {t('مغسلة نايف رتبت التشغيل بدون زيادة موظفين', 'Nayef Car Wash Organized Operations Without More Staff')}
              </h2>
              <p className={`text-base leading-relaxed text-white/72 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
                {t(
                  'قبل مدار كانت الزيارات تضيع بين المكالمات والدفاتر. الآن كل زيارة محفوظة، الرسائل تلقائية، والتقارير تظهر للمالك بدون انتظار نهاية الأسبوع.',
                  'Before Madar, visits were lost between calls and notebooks. Now every visit is logged, messages are automatic, and reports are visible to the owner without waiting.'
                )}
              </p>
              <div className="mt-7 grid grid-cols-3 gap-3">
                {metrics.map(metric => (
                  <div key={metric.labelEn} className="rounded-2xl bg-white/10 p-3">
                    <p className="text-xs line-through text-white/40">{metric.before}</p>
                    <p className="mt-1 text-2xl font-black">{metric.after}</p>
                    <p className={`mt-1 text-[11px] text-white/60 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
                      {language === 'ar' ? metric.labelAr : metric.labelEn}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={false}
              animate={proofInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.65, delay: 0.12 }}
              className="rounded-[32px] bg-white p-7"
              style={{ border: '1px solid rgba(7,23,57,0.08)', boxShadow: '0 24px 70px rgba(7,23,57,0.08)' }}
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className={`text-xs font-black tracking-[0.18em] ${language === 'ar' ? 'font-cairo' : 'font-work'}`} style={{ color: ACCENT }}>
                    {t('الباقات', 'PACKAGES')}
                  </p>
                  <h3 className={`mt-2 text-2xl font-black ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: NAVY }}>
                    {t('ابدأ بالتشغيل ثم وسّع المزايا', 'Start With Operations, Then Scale Features')}
                  </h3>
                </div>
                <Sparkles size={24} style={{ color: ACCENT }} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {packages.map((plan, index) => (
                  <div key={plan.name} className="rounded-2xl p-4" style={{ background: index === 0 ? 'rgba(11,116,255,0.08)' : '#F6FAFF', border: index === 0 ? '1px solid rgba(11,116,255,0.22)' : '1px solid rgba(7,23,57,0.08)' }}>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-lg font-black" style={{ color: NAVY }}>{plan.name}</p>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${language === 'ar' ? 'font-cairo' : 'font-work'}`} style={{ background: 'rgba(16,185,129,0.12)', color: '#059669' }}>
                        {t('أول 5 مغاسل', 'First 5 car washes')}
                      </span>
                    </div>
                    <div className="mb-3">
                      <p className="text-2xl font-black" style={{ color: index === 0 ? ACCENT : NAVY, fontFamily: 'Sora, Cairo, sans-serif' }}>{plan.launchPrice}</p>
                      <p className={`mt-1 text-[11px] ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: '#7A8AA6' }}>
                        {t('بعد أول 5 مغاسل:', 'After the first 5:')} <span className="line-through">{plan.regularPrice}</span>
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs leading-relaxed ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: '#6B7A99' }}>
                        {language === 'ar' ? plan.ar : plan.en}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => openWhatsAppChat()}
                className={`mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-black text-white ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
                style={{ background: `linear-gradient(135deg, ${NAVY}, ${ACCENT})` }}
              >
                {t('احجز عرضاً توضيحياً', 'Book a Demo')}
                <ArrowIcon size={16} />
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="relative py-20" style={{ background: NAVY }}>
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className={`mb-4 text-3xl font-black text-white sm:text-5xl ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}>
            {t('جاهز تشوف مغسلتك على نظام مرتب؟', 'Ready to See Your Car Wash on a Cleaner System?')}
          </h2>
          <p className={`mx-auto mb-8 max-w-xl text-base leading-relaxed text-white/65 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
            {t('نجهز لك تجربة قصيرة على بيانات قريبة من واقعك، وتشوف هل النظام يقلل الفوضى ويزيد وضوح التشغيل.', 'We prepare a short demo close to your real workflow so you can judge whether it reduces chaos and clarifies operations.')}
          </p>
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 0 42px rgba(11,116,255,0.45)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => openWhatsAppChat()}
            className={`inline-flex items-center gap-2.5 rounded-2xl px-8 py-4 text-base font-black text-white ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
            style={{ background: `linear-gradient(135deg, ${ACCENT}, #2BD4FF)` }}
          >
            {t('أبغى Demo للمغسلة', 'I Want a Car Wash Demo')}
            <ArrowIcon size={17} />
          </motion.button>
        </div>
      </section>

      <Footer />
      <MadarAgentWidget agentType="sales_website" pageTitle="Car Wash OS" />
    </div>
  )
}
