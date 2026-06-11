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

import { MadarNavbar } from '../components/public/MadarNavbar'
import { MadarAgentWidget } from '../components/dash/MadarAgentWidget'
import { supabase } from '../lib/supabase'
import { openWhatsAppChat } from '../lib/whatsapp'

gsap.registerPlugin(ScrollTrigger)

const adminPhone = import.meta.env.VITE_ADMIN_WHATSAPP || '966546666005'

const navLinks = [
  { href: '#experience', label: 'طريقة QR' },
  { href: '#dashboard', label: 'الدليل' },
  { href: '#pricing', label: 'الباقات' },
  { href: '#faq', label: 'الأسئلة' },
  { href: '#contact', label: 'واتساب' },
]

const flow = [
  { icon: QrCode, title: 'يمسح QR', text: 'العميل يسجل نفسه من المدخل بدون انتظار الكاشير.' },
  { icon: Car, title: 'يحصل على رقم', text: 'مدار يصدر كود واضح مثل A-014 يعرفه العميل والموظف.' },
  { icon: Gauge, title: 'الفريق يحرّك الحالة', text: 'استلام، قيد الخدمة، جاهزة، تم التسليم بزر واحد.' },
  { icon: CircleDollarSign, title: 'تسليم وإغلاق', text: 'الفاتورة، الإيراد، وضريبة VAT تدخل في إغلاق اليوم.' },
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
    q: 'ماذا أستلم عند تفعيل مدار OS؟',
    a: 'نجهز لك حساب مغسلة كامل: لوحة تشغيل السيارات، QR للتسجيل الذاتي، شاشة عرض، العملاء والولاء، المالية، التقارير، وإغلاق اليوم.',
  },
  {
    q: 'كيف أبدأ الاشتراك الآن؟',
    a: 'تختار الباقة المناسبة، يتم الدفع بتحويل بنكي، ثم نفعّل الحساب يدوياً ونرسل لك بيانات الدخول. الدفع الإلكتروني والرسائل الرسمية إضافات يمكن تفعيلها لاحقاً عند الحاجة.',
  },
  {
    q: 'هل أقدر أجرب قبل الاشتراك؟',
    a: 'نعم. التجربة 3 أيام حتى تشاهد النظام على سيناريو قريب من تشغيل مغسلتك: دخول سيارة، انتقال المراحل، تسليم، وتقارير اليوم.',
  },
  {
    q: 'هل لازم أستخدم QR من أول يوم؟',
    a: 'لا. تقدر تبدأ بإضافة السيارات من الموظف، ثم تفعّل QR عندما تريد تقليل الزحام وتسريع تسجيل العملاء عند المدخل.',
  },
]

export const CarWashPage = () => {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const heroImageRef = useRef<HTMLImageElement | null>(null)
  const [closingOpen, setClosingOpen] = useState(false)
  const [lead, setLead] = useState({ name: '', phone: '', business: '', city: '' })
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [formError, setFormError] = useState('')

  const requestDemo = () =>
    openWhatsAppChat('مرحباً، أريد تجربة مدار OS لمغسلتي ومعرفة أفضل باقة مناسبة للتشغيل.')

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
    setFormError('')
    try {
      const { error } = await supabase.from('leads').insert([
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
      if (error) throw error
      setDone(true)
      setLead({ name: '', phone: '', business: '', city: '' })
    } catch {
      setFormError('حدث خطأ، تواصل معنا مباشرة عبر واتساب.')
    } finally {
      setSending(false)
    }
  }


  return (
    <div ref={rootRef} className="min-h-screen bg-[#F5FAFF] text-[#071322]" dir="rtl">
      <MadarNavbar navLinks={navLinks} subtitle="نظام تشغيل للمغاسل" />

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
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-black text-[#0099CC] font-cairo">كيف يعمل QR داخل المغسلة؟</p>
              <h2 className="mt-3 text-3xl font-black leading-tight font-cairo sm:text-5xl">
                العميل يدخل أسرع، والموظف يشوف السيارة مباشرة.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl leading-8 text-slate-600 font-tajawal">
                لا تطبيق، ولا تسجيل طويل. مسح QR، اختيار الخدمة، رقم انتظار، ثم متابعة مباشرة في لوحة التشغيل.
              </p>
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
            <div className="mx-auto max-w-4xl text-center">
              <p className="text-sm font-black text-[#0099CC] font-cairo">الدليل داخل المنتج</p>
              <h2 className="mt-3 text-3xl font-black leading-tight font-cairo sm:text-5xl">
                الداشبورد يثبت لصاحب المغسلة أن اليوم صار تحت السيطرة.
              </h2>
              <p className="mx-auto mt-5 max-w-3xl text-lg leading-9 text-slate-600 font-tajawal">
                حركة السيارات، العملاء، الإيراد، VAT، وإغلاق اليوم تظهر في مكان واحد. هذا هو الفرق بين برنامج "يسجل بيانات" ونظام يشغّل المغسلة.
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
              {/* Browser chrome bar */}
              <div className="flex items-center gap-2 px-4 pb-3 pt-2">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-yellow-400" />
                <span className="h-3 w-3 rounded-full bg-green-400" />
                <div className="mr-3 flex-1 rounded-lg bg-slate-100 px-3 py-1 text-center text-xs text-slate-400 font-tajawal">
                  madar.software/client
                </div>
              </div>
              <div className="overflow-hidden rounded-[28px] border border-sky-100">
                <img
                  src="/assets/cw-dashboard.png"
                  alt="لوحة تحكم مغسلة مدار"
                  className="w-full object-cover object-top"
                  style={{ maxHeight: 620 }}
                />
              </div>
            </div>
          </div>
        </section>


        <section className="bg-[#071322] py-20 text-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div>
              <p className="text-sm font-black text-[#00BFFF] font-cairo">لماذا يشتريها صاحب المغسلة؟</p>
              <h2 className="mt-3 text-3xl font-black leading-tight font-cairo sm:text-5xl">
                لأن مدار يحل ثلاث لحظات تسبب الفوضى كل يوم.
              </h2>
              <p className="mt-5 text-lg leading-9 text-white/72 font-tajawal">
                الاستقبال، متابعة السيارة، وإغلاق الإيراد. إذا هذه اللحظات صارت واضحة، المغسلة تشتغل أسرع والمالك يثق بالأرقام.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ['01', 'الدخول يصير ذاتي: العميل يسجل نفسه ويأخذ رقم انتظار واضح.'],
                ['02', 'التشغيل يصير مرئي: كل سيارة لها مرحلة ومسؤولية واضحة.'],
                ['03', 'الإغلاق يصير أسرع: الإيراد وVAT وعدد السيارات جاهزة آخر اليوم.'],
              ].map(([title, text]) => (
                <div key={title} className="rounded-[30px] border border-white/10 bg-white/8 p-6">
                  <p className="font-sora text-sm font-black text-[#00BFFF]">{title}</p>
                  <p className="mt-4 text-xl font-black leading-8 font-cairo">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-black text-[#0099CC] font-cairo">الباقات</p>
              <h2 className="mt-3 text-3xl font-black leading-tight font-cairo sm:text-5xl">
                اختر الباقة وابدأ تشغيل المغسلة بدون تعقيد.
              </h2>
              <p className="mt-5 leading-8 text-slate-600 font-tajawal">
                عرض الإطلاق لأول 5 مغاسل فقط. نفعّل الحساب يدوياً بعد التحويل، ثم نضيف أي تكاملات اختيارية عند الحاجة.
              </p>
            </div>

            <div className="mx-auto mt-12 grid max-w-5xl gap-5 lg:grid-cols-2">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-[32px] border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
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
                    احجز {plan.name} على واتساب
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
            <div>
              <p className="text-sm font-black text-[#0099CC] font-cairo">قرار الاشتراك</p>
              <h2 className="mt-3 text-3xl font-black leading-tight font-cairo sm:text-5xl">كل ما يحتاجه صاحب المغسلة قبل البدء.</h2>
              <p className="mt-5 leading-8 text-slate-600 font-tajawal">
                ابدأ بتشغيل واضح ومباشر، ثم أضف المزايا الاختيارية حسب احتياج المغسلة ونموها.
              </p>
            </div>
            <div className="space-y-4">
              {faq.map((item) => (
                <div key={item.q} className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-black font-cairo">{item.q}</h3>
                  <p className="mt-3 leading-7 text-slate-600 font-tajawal">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[36px] bg-[#071B35] text-white lg:grid-cols-[0.95fr_1.05fr]">
            <div className="p-8 sm:p-10 lg:p-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black text-[#00BFFF] font-cairo">
                <Sparkles size={15} />
                الخطوة التالية
              </div>
              <h2 className="mt-6 text-3xl font-black leading-tight font-cairo sm:text-5xl">
                احجز مكانك ضمن أول 5 مغاسل بسعر الإطلاق.
              </h2>
              <p className="mt-5 leading-8 text-white/72 font-tajawal">
                أرسل لنا اسم المغسلة والمدينة على واتساب، ونجهز لك تجربة 3 أيام على مسار تشغيل واضح: QR، طابور السيارات، العملاء، المالية، وإغلاق اليوم.
              </p>
              <button
                type="button"
                onClick={requestDemo}
                className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#00BFFF] px-7 py-4 text-base font-black text-[#071322] shadow-[0_18px_45px_rgba(0,191,255,0.28)] font-cairo"
              >
                تواصل واتساب الآن
                <MessageCircle size={18} />
              </button>
            </div>

            <form onSubmit={submitLead} className="bg-white p-8 text-[#071322] sm:p-10 lg:p-12">
              <h3 className="text-2xl font-black font-cairo">أو اترك بياناتك ونجهز التواصل</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500 font-tajawal">
                الواتساب أسرع. النموذج مناسب إذا تبي نرجع لك بتفاصيل الباقة والتفعيل.
              </p>
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
              {formError && <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600 font-tajawal">{formError}</p>}
              <button type="button" onClick={requestDemo} className="mt-3 w-full rounded-2xl border border-sky-100 bg-white px-6 py-4 text-base font-black text-[#071B35] font-cairo">
                تواصل واتساب بدلاً من النموذج
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
