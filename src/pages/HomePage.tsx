import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  Bot,
  Car,
  Check,
  ChevronLeft,
  CircleDollarSign,
  Clock,
  CreditCard,
  Gauge,
  Menu,
  MessageCircle,
  Monitor,
  QrCode,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { MadarAgentWidget } from '../components/dash/MadarAgentWidget'
import { supabase } from '../lib/supabase'
import { openWhatsAppChat } from '../lib/whatsapp'

gsap.registerPlugin(ScrollTrigger)

const adminPhone = '966546666005'

const navLinks = [
  { href: '#experience', label: 'التجربة' },
  { href: '#dashboard', label: 'الديمو' },
  { href: '#pricing', label: 'الباقات' },
  { href: '#faq', label: 'الأسئلة' },
]

const flow = [
  { icon: QrCode, title: 'مسح QR', text: 'العميل يبدأ بنفسه من مدخل المغسلة.' },
  { icon: Car, title: 'رقم انتظار', text: 'مدار يصدر كود واضح مثل A-014.' },
  { icon: Gauge, title: 'تحديث الحالة', text: 'الفريق يحرك السيارة بين المراحل بزر واحد.' },
  { icon: CircleDollarSign, title: 'تسليم وإغلاق', text: 'الفاتورة والإيراد وإغلاق اليوم في مسار واحد.' },
]

const features = [
  {
    icon: Monitor,
    title: 'مركز تشغيل واضح',
    text: 'كل سيارة، مرحلة، وتسليم تظهر في شاشة واحدة يفهمها الفريق بسرعة.',
  },
  {
    icon: Users,
    title: 'عملاء وولاء',
    text: 'اعرف العميل المتكرر، زياراته، ومكافآته بدون دفاتر أو متابعة يدوية.',
  },
  {
    icon: BarChart3,
    title: 'مالية يومية',
    text: 'إيراد اليوم، متوسط الفاتورة، VAT، وطرق الدفع تظهر لصاحب المغسلة مباشرة.',
  },
  {
    icon: Bot,
    title: 'دعم مدار AI',
    text: 'مساعد متخصص يشرح الصفحة ويقترح قرارات تشغيلية داخل نطاق المغاسل.',
  },
]

const plans = [
  {
    name: 'Pro',
    launchPrice: '500',
    regularPrice: '799',
    badge: 'عرض إطلاق لأول 5 مغاسل',
    note: 'للمغسلة التي تريد نظام تشغيل كامل بسرعة: QR، شاشة عرض، عملاء، مالية، تقارير، ومساعد مدار AI.',
    points: ['QR للتسجيل الذاتي', 'لوحة تشغيل السيارات', 'شاشة عرض مباشرة', 'العملاء والولاء', 'VAT وإغلاق اليوم', 'مساعد مدار AI'],
  },
  {
    name: 'Platinum',
    launchPrice: '1,000',
    regularPrice: '1,999',
    badge: 'للمغاسل الجادة',
    note: 'للمغسلة التي تريد إعداد أعمق، أولوية دعم، وتقارير وتوسعة جاهزة للفروع والإضافات.',
    points: ['كل مزايا Pro', 'تحليل أداء الموظفين', 'تقارير متقدمة', 'دعم أولوية', 'تجهيز توسعة الفروع', 'إعداد وتشغيل مخصص'],
  },
]

const faq = [
  {
    q: 'هل أقدر أبدأ بدون WhatsApp API؟',
    a: 'نعم. التشغيل، QR، العملاء، المالية، التقارير، وشاشة العرض تعمل الآن. واتساب الرسمي يتفعل لاحقاً بعد اعتماد Meta.',
  },
  {
    q: 'هل الدفع الإلكتروني ضروري للبداية؟',
    a: 'لا. نبدأ بتحويل بنكي وتفعيل يدوي، ثم نضيف Moyasar وApple Pay عند جاهزية الحسابات الرسمية.',
  },
  {
    q: 'هل التجربة مجانية؟',
    a: 'نعم، التجربة 3 أيام حتى يشاهد صاحب المغسلة النظام على تشغيله الحقيقي قبل الاشتراك.',
  },
  {
    q: 'هل QR إلزامي؟',
    a: 'لا. يمكن للموظف إضافة السيارة، وQR يكون خياراً لتقليل الزحام وتسريع دخول العملاء.',
  },
]

const dashboardTabs = [
  { id: 'operations', label: 'التشغيل', icon: Gauge },
  { id: 'customers', label: 'العملاء', icon: Users },
  { id: 'finance', label: 'المالية', icon: BarChart3 },
] as const

const stageLabels = ['استلام', 'قيد الخدمة', 'جاهزة', 'تم التسليم']

export const HomePage = () => {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const navRef = useRef<HTMLElement | null>(null)
  const heroImageRef = useRef<HTMLImageElement | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [activeTab, setActiveTab] = useState<(typeof dashboardTabs)[number]['id']>('operations')
  const [carStage, setCarStage] = useState(0)
  const [closingOpen, setClosingOpen] = useState(false)
  const [lead, setLead] = useState({ name: '', phone: '', business: '', city: '' })
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  const requestDemo = () =>
    openWhatsAppChat('مرحباً، أريد تجربة مدار OS لمغسلتي ومعرفة أفضل باقة مناسبة للتشغيل.')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 70)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        heroImageRef.current,
        { autoAlpha: 0.92 },
        { autoAlpha: 1, duration: 1.2, ease: 'power3.out' },
      )
      gsap.from('.hero-copy > *', {
        y: 34,
        autoAlpha: 0,
        duration: 0.85,
        stagger: 0.12,
        ease: 'power3.out',
        delay: 0.15,
      })
      gsap.from('.hero-pulse', {
        scale: 0.7,
        autoAlpha: 0,
        duration: 1,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })
      gsap.utils.toArray<HTMLElement>('.gsap-reveal').forEach((el) => {
        gsap.fromTo(
          el,
          { y: 42, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 84%' },
          },
        )
      })
      gsap.from('.flow-step', {
        y: 24,
        autoAlpha: 0,
        stagger: 0.12,
        duration: 0.65,
        ease: 'power3.out',
        scrollTrigger: { trigger: '#experience', start: 'top 70%' },
      })
      gsap.from('.dashboard-card', {
        y: 22,
        autoAlpha: 0,
        stagger: 0.08,
        duration: 0.65,
        ease: 'power3.out',
        scrollTrigger: { trigger: '#dashboard', start: 'top 68%' },
      })
    }, rootRef)

    return () => ctx.revert()
  }, [])

  const submitLead = async (event: FormEvent) => {
    event.preventDefault()
    if (!lead.name.trim() || !lead.phone.trim()) return
    setSending(true)
    try {
      await supabase.from('leads').insert([
        {
          name: lead.name.trim(),
          phone: lead.phone.trim(),
          email: '',
          service: 'madar_os_car_wash_demo',
          message: `النشاط: ${lead.business || 'مغسلة سيارات'} | المدينة: ${lead.city || 'غير محددة'} | طلب تجربة مدار OS`,
          source: 'website',
          status: 'new',
        },
      ])
      setDone(true)
      setLead({ name: '', phone: '', business: '', city: '' })
    } finally {
      setSending(false)
    }
  }

  const moveCar = () => setCarStage((current) => (current + 1) % stageLabels.length)

  return (
    <div ref={rootRef} className="min-h-screen bg-[#F5FAFF] text-[#071322]" dir="rtl">
      <header
        ref={navRef}
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'border-b border-sky-100 bg-white/94 shadow-[0_18px_45px_rgba(13,27,62,0.08)] backdrop-blur-xl'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className={`flex items-center gap-3 rounded-2xl px-3 py-2 transition ${
              scrolled ? 'bg-transparent' : 'bg-white/72 shadow-sm backdrop-blur-xl'
            }`}
          >
            <img src="/logo-main.png" alt="Madar.software" className="h-11 w-auto object-contain" />
            <div>
              <p className="font-sora text-lg font-black leading-none">
                Madar<span className="text-[#00BFFF]"> OS</span>
              </p>
              <p className="mt-1 text-[11px] font-bold text-slate-500 font-tajawal">نظام تشغيل للمغاسل</p>
            </div>
          </Link>

          <nav
            className={`hidden items-center gap-1 rounded-2xl px-2 py-2 text-sm font-black font-cairo lg:flex ${
              scrolled ? 'bg-slate-50 text-slate-700' : 'bg-white/72 text-[#0D1B3E] shadow-sm backdrop-blur-xl'
            }`}
          >
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="rounded-xl px-4 py-2 transition hover:bg-white hover:text-[#0099CC]">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className={`hidden rounded-2xl px-4 py-3 text-sm font-black shadow-sm font-cairo sm:inline-flex ${
                scrolled ? 'border border-sky-100 bg-white text-[#0D1B3E]' : 'bg-white/78 text-[#0D1B3E] backdrop-blur-xl'
              }`}
            >
              تسجيل الدخول
            </Link>
            <Link
              to="/trial"
              className="hidden items-center gap-2 rounded-2xl bg-[#007BFF] px-5 py-3 text-sm font-black text-white shadow-[0_18px_38px_rgba(0,123,255,0.28)] font-cairo sm:inline-flex"
            >
              ابدأ تجربتك
              <ChevronLeft size={16} />
            </Link>
            <button
              onClick={() => setMobileMenu(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/82 text-[#0D1B3E] shadow-sm backdrop-blur-xl lg:hidden"
              aria-label="فتح القائمة"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {mobileMenu && (
          <motion.div className="fixed inset-0 z-[60] bg-[#071322]/50 p-4 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              initial={{ x: 80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 80, opacity: 0 }}
              className="mr-auto h-full w-[82vw] max-w-sm rounded-[28px] bg-white p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <img src="/logo-main.png" alt="Madar.software" className="h-12" />
                <button onClick={() => setMobileMenu(false)} className="rounded-2xl bg-slate-100 p-3">
                  <X size={18} />
                </button>
              </div>
              <div className="mt-8 grid gap-2 font-cairo">
                {navLinks.map((link) => (
                  <a key={link.href} href={link.href} onClick={() => setMobileMenu(false)} className="rounded-2xl bg-sky-50 px-4 py-4 font-black">
                    {link.label}
                  </a>
                ))}
                <Link to="/trial" className="mt-4 rounded-2xl bg-[#007BFF] px-4 py-4 text-center font-black text-white">
                  ابدأ تجربة 3 أيام
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main>
        <section className="relative min-h-[760px] overflow-hidden bg-white sm:min-h-[820px] lg:min-h-0">
          <img
            ref={heroImageRef}
            src="/madar-carwash-hero-real.png"
            alt="Madar OS car wash hero"
            className="absolute inset-0 h-full w-full object-cover object-[35%_center] lg:static lg:block lg:h-auto lg:object-contain"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(255,255,255,0.66)_34%,rgba(255,255,255,0.18)_66%,rgba(255,255,255,0.02)_100%)] sm:bg-[linear-gradient(270deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.90)_24%,rgba(255,255,255,0.48)_45%,rgba(255,255,255,0.04)_68%)]" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/90 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white/70 to-transparent" />
          <div className="hero-pulse absolute bottom-[24%] left-[26%] hidden h-20 w-20 rounded-full border-2 border-[#00BFFF]/70 bg-[#00BFFF]/10 shadow-[0_0_55px_rgba(0,191,255,0.55)] lg:block" />

          <div className="absolute inset-0 z-10 mx-auto flex max-w-7xl items-start px-4 pt-28 sm:items-center sm:px-6 sm:pt-16 lg:px-8">
            <div className="hero-copy ml-auto w-full max-w-[580px] text-[#0D1B3E] lg:ml-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/70 px-3.5 py-2 text-xs font-black text-[#0D1B3E] shadow-sm backdrop-blur-xl font-cairo sm:px-5 sm:py-2.5 sm:text-sm">
                <span className="h-2 w-2 rounded-full bg-[#00BFFF]" />
                نظام تشغيل ذكي للمغاسل
              </div>
              <h1 className="mt-5 text-[2rem] font-black leading-[1.08] tracking-normal drop-shadow-[0_2px_0_rgba(255,255,255,0.85)] font-cairo sm:mt-7 sm:text-6xl lg:text-7xl">
                إدارة أسهل.
                <span className="block text-[#008FE8]">مبيعات أعلى.</span>
              </h1>
              <p className="mt-3 max-w-[300px] rounded-xl border border-white/50 bg-white/50 px-3 py-2.5 text-[13px] font-bold leading-6 text-slate-800 shadow-sm backdrop-blur-md font-tajawal sm:mt-5 sm:max-w-xl sm:rounded-2xl sm:bg-white/75 sm:px-5 sm:py-4 sm:text-xl sm:leading-8">
                من استقبال السيارة إلى التسليم والدفع والتقارير، كل شيء في نظام واحد ذكي وسهل الاستخدام.
              </p>
              <div className="mt-5 flex flex-col items-start gap-2.5 sm:mt-7 sm:flex-row sm:items-center sm:gap-3">
                <Link
                  to="/trial"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00BFFF] px-4 py-3 text-sm font-black text-[#071322] shadow-[0_14px_32px_rgba(0,191,255,0.30)] font-cairo sm:rounded-2xl sm:px-6 sm:py-4 sm:text-base sm:shadow-[0_18px_45px_rgba(0,191,255,0.36)]"
                >
                  ابدأ تجربة 3 أيام
                  <ChevronLeft size={18} />
                </Link>
                <a
                  href="#dashboard"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white/74 px-4 py-3 text-sm font-black text-[#0D1B3E] shadow-sm backdrop-blur-xl font-cairo sm:rounded-2xl sm:bg-white/82 sm:px-6 sm:py-4 sm:text-base"
                >
                  شاهد الديمو الحي
                  <Monitor size={18} />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="experience" className="relative overflow-hidden bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="gsap-reveal mx-auto max-w-3xl text-center">
              <p className="text-sm font-black text-[#0099CC] font-cairo">من لحظة الدخول إلى التسليم</p>
              <h2 className="mt-3 text-3xl font-black leading-tight font-cairo sm:text-5xl">
                كل خطوة في يوم المغسلة تصبح واضحة، سريعة، وقابلة للقياس.
              </h2>
            </div>
            <div className="relative mt-14 grid gap-4 lg:grid-cols-4">
              <div className="absolute left-12 right-12 top-[52px] hidden h-0.5 bg-sky-100 lg:block" />
              {flow.map(({ icon: Icon, title, text }, index) => (
                <div key={title} className="flow-step relative rounded-[28px] border border-sky-100 bg-[#F5FAFF] p-6 shadow-sm">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#007BFF] shadow-sm">
                    <Icon size={24} />
                  </div>
                  <div className="mt-6 inline-flex rounded-full bg-[#0D1B3E] px-3 py-1 font-sora text-xs font-black text-white">
                    0{index + 1}
                  </div>
                  <h3 className="mt-4 text-xl font-black font-cairo">{title}</h3>
                  <p className="mt-3 leading-7 text-slate-600 font-tajawal">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="dashboard" className="overflow-hidden bg-[#F5FAFF] py-20">
          <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
            <div className="gsap-reveal mx-auto max-w-4xl text-center">
              <p className="text-sm font-black text-[#0099CC] font-cairo">ديمو حي قابل للضغط</p>
              <h2 className="mt-3 text-3xl font-black leading-tight font-cairo sm:text-5xl">
                شاهد كيف تتحول المغسلة إلى مركز تشغيل واضح.
              </h2>
              <p className="mx-auto mt-5 max-w-3xl text-lg leading-9 text-slate-600 font-tajawal">
                اضغط على مراحل السيارة، غيّر التبويبات، وافتح إغلاق اليوم. هذا ليس صورة ثابتة، هذه تجربة مصغرة من المنتج.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {features.map(({ icon: Icon, title, text }) => (
                  <div key={title} className="dashboard-card rounded-3xl border border-sky-100 bg-white p-5 text-right shadow-sm">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-[#007BFF]">
                      <Icon size={21} />
                    </div>
                    <p className="mt-4 font-black font-cairo">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600 font-tajawal">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="dashboard-card mt-12 rounded-[38px] border border-sky-100 bg-white p-3 shadow-[0_38px_110px_rgba(13,27,62,0.16)] sm:p-4">
              <div className="grid min-h-[720px] overflow-hidden rounded-[32px] border border-sky-100 bg-[#F7FBFF] lg:grid-cols-[210px_1fr]">
                <aside className="hidden bg-[#071B35] p-5 text-white lg:block">
                  <img src="/logo-main.png" alt="Madar.software" className="h-16 w-auto" />
                  <div className="mt-10 space-y-2 font-cairo">
                    {dashboardTabs.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-sm font-black transition ${
                          activeTab === id ? 'bg-[#007BFF]' : 'text-white/72 hover:bg-white/10'
                        }`}
                      >
                        <Icon size={18} />
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-12 rounded-3xl border border-white/10 bg-white/8 p-4">
                    <p className="text-xs font-bold text-white/55 font-tajawal">ترقية أعلى</p>
                    <p className="mt-2 text-lg font-black font-cairo">مزايا متقدمة ودعم خاص</p>
                    <button onClick={requestDemo} className="mt-4 w-full rounded-2xl bg-[#00BFFF] px-4 py-3 text-sm font-black text-[#071322] font-cairo">
                      ترقية الآن
                    </button>
                  </div>
                </aside>

                <div className="p-4 sm:p-7 lg:p-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-black text-[#0099CC] font-cairo">مركز تشغيل اليوم</p>
                      <h3 className="mt-1 text-3xl font-black font-cairo">مغسلة المدار</h3>
                    </div>
                    <div className="flex rounded-2xl bg-white p-1 shadow-sm lg:hidden">
                      {dashboardTabs.map(({ id, label }) => (
                        <button
                          key={id}
                          onClick={() => setActiveTab(id)}
                          className={`rounded-xl px-3 py-2 text-xs font-black font-cairo ${activeTab === id ? 'bg-[#007BFF] text-white' : 'text-slate-500'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {activeTab === 'operations' && (
                      <motion.div key="operations" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="mt-6">
                        <div className="grid gap-4 sm:grid-cols-4">
                          {[
                            ['12,540', 'إيراد اليوم'],
                            ['86', 'السيارات'],
                            ['145', 'متوسط الفاتورة'],
                            ['23', 'عميل جديد'],
                          ].map(([value, label]) => (
                            <div key={label} className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
                              <p className="font-sora text-3xl font-black">{value}</p>
                              <p className="mt-1 text-xs font-bold text-slate-500 font-tajawal">{label}</p>
                              <span className="mt-4 inline-flex rounded-full bg-emerald-50 px-3 py-1 font-sora text-xs font-black text-emerald-600">+12%</span>
                            </div>
                          ))}
                        </div>

                        <div className="mt-6 rounded-[30px] border border-sky-100 bg-white p-6 shadow-sm">
                          <div className="flex items-center justify-between">
                            <h4 className="text-2xl font-black font-cairo">مسار السيارات</h4>
                            <button onClick={moveCar} className="rounded-2xl bg-[#00BFFF] px-4 py-2 text-sm font-black text-[#071322] font-cairo">
                              حرّك السيارة
                            </button>
                          </div>
                          <div className="mt-6 grid gap-4 md:grid-cols-4">
                            {stageLabels.map((stage, index) => (
                              <button
                                key={stage}
                                onClick={() => setCarStage(index)}
                                className={`relative min-h-[168px] rounded-3xl border p-5 text-center transition ${
                                  carStage === index ? 'border-[#007BFF] bg-blue-50 shadow-lg' : 'border-sky-100 bg-white hover:border-sky-300'
                                }`}
                              >
                                <Car className="mx-auto text-[#007BFF]" size={24} />
                                <p className="mt-3 font-black font-cairo">{stage}</p>
                                <p className="mt-2 font-sora text-3xl font-black">{index === carStage ? 'A-014' : index === 3 ? '49' : index * 6 + 12}</p>
                                <p className="mt-1 text-xs font-bold text-slate-500 font-tajawal">{index === carStage ? 'السيارة الحالية' : 'سيارة'}</p>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="mt-6 grid gap-4 lg:grid-cols-3">
                          <div className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-sm">
                            <h5 className="text-lg font-black font-cairo">تقرير ضريبة القيمة المضافة</h5>
                            <div className="mt-5 space-y-3 text-sm font-bold text-slate-500 font-tajawal">
                              <div className="flex items-center justify-between"><span>المبيعات الخاضعة</span><strong className="font-sora text-[#071322]">10,478</strong></div>
                              <div className="flex items-center justify-between"><span>VAT (15%)</span><strong className="font-sora text-[#071322]">1,572</strong></div>
                              <div className="flex items-center justify-between"><span>الإجمالي</span><strong className="font-sora text-[#071322]">12,540</strong></div>
                            </div>
                            <div className="mt-5 h-12 rounded-2xl bg-[linear-gradient(110deg,#e0f2fe,#ffffff,#dbeafe)]" />
                          </div>

                          <div className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-sm">
                            <h5 className="text-lg font-black font-cairo">أفضل العملاء</h5>
                            <div className="mt-5 space-y-3">
                              {['محمد خالد', 'أحمد السبيعي', 'عبدالله الشهري'].map((name, index) => (
                                <div key={name} className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 font-sora text-xs font-black text-[#007BFF]">{index + 1}</div>
                                    <div>
                                      <p className="text-sm font-black font-cairo">{name}</p>
                                      <p className="text-xs font-bold text-slate-500 font-tajawal">{120 - index * 22} نقطة</p>
                                    </div>
                                  </div>
                                  <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-black text-amber-500">VIP</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-sm">
                            <h5 className="text-lg font-black font-cairo">إغلاق اليوم</h5>
                            <div className="mt-5 space-y-3 text-sm font-bold text-slate-500 font-tajawal">
                              <div className="flex items-center justify-between"><span>إجمالي الإيراد</span><strong className="font-sora text-[#071322]">12,540</strong></div>
                              <div className="flex items-center justify-between"><span>عدد السيارات</span><strong className="font-sora text-[#071322]">86</strong></div>
                              <div className="flex items-center justify-between"><span>متوسط الفاتورة</span><strong className="font-sora text-[#071322]">145</strong></div>
                            </div>
                            <button
                              onClick={() => setClosingOpen(true)}
                              className="mt-5 w-full rounded-2xl bg-[#007BFF] px-5 py-4 text-base font-black text-white font-cairo"
                            >
                              إغلاق اليوم
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'customers' && (
                      <motion.div key="customers" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="mt-6 grid gap-4">
                        {['محمد خالد', 'أحمد السبيعي', 'عبدالله الشهري'].map((name, index) => (
                          <div key={name} className="flex items-center justify-between rounded-3xl border border-sky-100 bg-white p-5">
                            <div>
                              <p className="font-black font-cairo">{name}</p>
                              <p className="mt-1 text-sm text-slate-500 font-tajawal">{120 - index * 22} نقطة ولاء</p>
                            </div>
                            <div className="rounded-2xl bg-amber-50 px-4 py-2 text-sm font-black text-amber-600 font-cairo">عميل مميز</div>
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {activeTab === 'finance' && (
                      <motion.div key="finance" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="mt-6 grid gap-4 sm:grid-cols-2">
                        {[
                          ['10,478', 'المبيعات الخاضعة'],
                          ['1,572', 'ضريبة القيمة المضافة'],
                          ['12,540', 'الإجمالي'],
                          ['86', 'عدد السيارات'],
                        ].map(([value, label]) => (
                          <div key={label} className="rounded-3xl border border-sky-100 bg-white p-6">
                            <p className="font-sora text-3xl font-black">{value}</p>
                            <p className="mt-2 font-bold text-slate-500 font-tajawal">{label}</p>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#071322] py-20 text-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div className="gsap-reveal">
              <p className="text-sm font-black text-[#00BFFF] font-cairo">قبل وبعد مدار</p>
              <h2 className="mt-3 text-3xl font-black leading-tight font-cairo sm:text-5xl">
                حوّل يوم المغسلة من متابعة عشوائية إلى مركز تشغيل.
              </h2>
              <p className="mt-5 text-lg leading-9 text-white/72 font-tajawal">
                العميل يعرف دوره، الموظف يعرف الخطوة التالية، والمالك يعرف الإيراد قبل نهاية اليوم.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['قبل', 'زحمة استقبال، أسئلة كثيرة، وتسليم غير واضح.'],
                ['بعد', 'QR، شاشة عرض، مسار سيارات، وإغلاق مالي واضح.'],
              ].map(([title, text]) => (
                <div key={title} className="gsap-reveal rounded-[30px] border border-white/10 bg-white/8 p-6">
                  <p className="font-sora text-sm font-black text-[#00BFFF]">{title}</p>
                  <p className="mt-4 text-xl font-black leading-8 font-cairo">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="gsap-reveal mx-auto max-w-3xl text-center">
              <p className="text-sm font-black text-[#0099CC] font-cairo">الباقات</p>
              <h2 className="mt-3 text-3xl font-black leading-tight font-cairo sm:text-5xl">
                ابدأ بسيطاً، ثم افتح المزايا حسب نمو المغسلة.
              </h2>
              <p className="mt-5 leading-8 text-slate-600 font-tajawal">
                ابدأ بتشغيل المغسلة من اليوم الأول، ثم فعّل الرسائل والدفع الرقمي كخيارات توسع حسب احتياجك وخطة النمو.
              </p>
            </div>

            <div className="mx-auto mt-12 grid max-w-5xl gap-5 lg:grid-cols-2">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`gsap-reveal relative rounded-[32px] border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
                    plan.badge ? 'border-[#00BFFF] bg-[#F5FAFF]' : 'border-sky-100 bg-white'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-4 right-6 rounded-full bg-[#00BFFF] px-4 py-2 text-xs font-black text-[#071322] font-cairo">
                      {plan.badge}
                    </div>
                  )}
                  <h3 className="text-2xl font-black font-cairo">{plan.name}</h3>
                  <p className="mt-3 min-h-[56px] leading-7 text-slate-600 font-tajawal">{plan.note}</p>
                  <div className="mt-6 rounded-3xl border border-sky-100 bg-white p-4">
                    <div className="flex items-end gap-2">
                      <span className="font-sora text-5xl font-black">{plan.launchPrice}</span>
                      <span className="mb-2 text-sm font-bold text-slate-500 font-tajawal">ر.س / شهر</span>
                    </div>
                    <p className="mt-2 text-xs font-bold text-emerald-600 font-tajawal">
                      سعر الإطلاق لأول 5 مغاسل
                    </p>
                    <p className="mt-1 text-xs text-slate-500 font-tajawal">
                      بعد أول 5 مغاسل: <span className="font-sora line-through">{plan.regularPrice}</span> ر.س / شهر
                    </p>
                  </div>
                  <button
                    onClick={requestDemo}
                    className={`mt-6 w-full rounded-2xl px-5 py-4 text-base font-black font-cairo ${
                      plan.badge ? 'bg-[#071B35] text-white' : 'border border-sky-100 bg-white text-[#071B35]'
                    }`}
                  >
                    اطلب الباقة
                  </button>
                  <div className="mt-6 space-y-3">
                    {plan.points.map((point) => (
                      <div key={point} className="flex items-center gap-2 text-sm font-bold text-slate-700 font-tajawal">
                        <Check size={17} className="text-emerald-500" />
                        {point}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="bg-[#F5FAFF] py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
            <div className="gsap-reveal">
              <p className="text-sm font-black text-[#0099CC] font-cairo">قبل الاشتراك</p>
              <h2 className="mt-3 text-3xl font-black leading-tight font-cairo sm:text-5xl">إجابات واضحة قبل قرار التجربة.</h2>
              <p className="mt-5 leading-8 text-slate-600 font-tajawal">
                نوضح ما يعمل الآن، وما يتم تفعيله لاحقاً، حتى يكون قرار الاشتراك مبني على ثقة.
              </p>
            </div>
            <div className="space-y-4">
              {faq.map((item) => (
                <div key={item.q} className="gsap-reveal rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-black font-cairo">{item.q}</h3>
                  <p className="mt-3 leading-7 text-slate-600 font-tajawal">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[36px] bg-[#071B35] text-white lg:grid-cols-[0.95fr_1.05fr]">
            <div className="gsap-reveal p-8 sm:p-10 lg:p-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black text-[#00BFFF] font-cairo">
                <Sparkles size={15} />
                تجربة 3 أيام
              </div>
              <h2 className="mt-6 text-3xl font-black leading-tight font-cairo sm:text-5xl">
                ابدأ تجربة مدار OS لمغسلتك خلال دقائق.
              </h2>
              <p className="mt-5 leading-8 text-white/72 font-tajawal">
                سجل بياناتك، وسيتم تجهيز حساب تجريبي يوضح طريقة استقبال السيارات، متابعة التشغيل، العملاء، المالية، وإغلاق اليوم من لوحة واحدة.
              </p>
            </div>

            <form onSubmit={submitLead} className="bg-white p-8 text-[#071322] sm:p-10 lg:p-12">
              <h3 className="text-2xl font-black font-cairo">اطلب تجربة مدار OS</h3>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <input value={lead.name} onChange={(event) => setLead((prev) => ({ ...prev, name: event.target.value }))} className="rounded-2xl border border-sky-100 bg-[#F5FAFF] px-4 py-4 font-tajawal outline-none focus:border-[#00BFFF]" placeholder="اسمك" />
                <input value={lead.phone} onChange={(event) => setLead((prev) => ({ ...prev, phone: event.target.value }))} className="rounded-2xl border border-sky-100 bg-[#F5FAFF] px-4 py-4 font-tajawal outline-none focus:border-[#00BFFF]" placeholder="رقم الجوال" />
                <input value={lead.business} onChange={(event) => setLead((prev) => ({ ...prev, business: event.target.value }))} className="rounded-2xl border border-sky-100 bg-[#F5FAFF] px-4 py-4 font-tajawal outline-none focus:border-[#00BFFF]" placeholder="اسم المغسلة" />
                <input value={lead.city} onChange={(event) => setLead((prev) => ({ ...prev, city: event.target.value }))} className="rounded-2xl border border-sky-100 bg-[#F5FAFF] px-4 py-4 font-tajawal outline-none focus:border-[#00BFFF]" placeholder="المدينة" />
              </div>
              <button disabled={sending} className="mt-5 w-full rounded-2xl bg-[#00BFFF] px-6 py-4 text-base font-black text-[#071322] disabled:opacity-60 font-cairo">
                {sending ? 'جار إرسال الطلب...' : 'أرسل طلب التجربة'}
              </button>
              {done && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 font-tajawal">تم استلام طلبك. سنتواصل معك لتجهيز الحساب.</p>}
              <button type="button" onClick={requestDemo} className="mt-3 w-full rounded-2xl border border-sky-100 bg-white px-6 py-4 text-base font-black text-[#071B35] font-cairo">
                أو تواصل واتساب مباشرة
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-sky-100 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 text-sm text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>© 2026 Madar.software — نظام تشغيل للمغاسل والعيادات.</p>
          <div className="flex items-center gap-4">
            <a href={`https://wa.me/${adminPhone}`} className="font-bold text-[#0099CC]">واتساب</a>
            <Link to="/login" className="font-bold text-slate-700">دخول العملاء</Link>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {closingOpen && (
          <motion.div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#071322]/55 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 20 }} className="w-full max-w-md rounded-[30px] bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black font-cairo">إغلاق اليوم</h3>
                <button onClick={() => setClosingOpen(false)} className="rounded-2xl bg-slate-100 p-3"><X size={18} /></button>
              </div>
              <div className="mt-6 grid gap-3">
                {[
                  ['إجمالي الإيراد', '12,540 ر.س'],
                  ['عدد السيارات', '86'],
                  ['VAT', '1,572 ر.س'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-2xl bg-[#F5FAFF] p-4">
                    <span className="font-bold text-slate-500 font-tajawal">{label}</span>
                    <span className="font-sora text-xl font-black">{value}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setClosingOpen(false)} className="mt-5 w-full rounded-2xl bg-[#00BFFF] px-5 py-4 font-black text-[#071322] font-cairo">
                تم
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <MadarAgentWidget agentType="sales_website" label="اسأل مدار AI" />
    </div>
  )
}
