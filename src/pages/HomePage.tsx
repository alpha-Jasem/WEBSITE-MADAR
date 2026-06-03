import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  BarChart3,
  Bot,
  Check,
  ChevronLeft,
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
  Wallet,
  Zap,
} from 'lucide-react'

import { MadarAgentWidget } from '../components/dash/MadarAgentWidget'
import { supabase } from '../lib/supabase'
import { openWhatsAppChat } from '../lib/whatsapp'

const adminPhone = '966546666005'

const features = [
  { icon: Gauge, title: 'لوحة تشغيل السيارات', text: 'كل سيارة تتحرك بين الاستلام، قيد الخدمة، جاهزة، وتم التسليم بزر واحد.' },
  { icon: QrCode, title: 'QR تسجيل ذاتي', text: 'العميل يسجل نفسه ويأخذ رقم انتظار بدون ضغط على موظف الاستقبال.' },
  { icon: Monitor, title: 'شاشة عرض Live', text: 'اعرض أرقام الدور وحالة السيارات على شاشة كبيرة داخل المغسلة.' },
  { icon: Users, title: 'العملاء والولاء', text: 'سجل العملاء، الزيارات، المكافآت، وأفضل العملاء من مكان واحد.' },
  { icon: BarChart3, title: 'مالية وVAT', text: 'إيراد اليوم، طرق الدفع، ضريبة القيمة المضافة، وإغلاق اليوم.' },
  { icon: Bot, title: 'مساعد مدار AI', text: 'مساعد متخصص يشرح الصفحة ويقترح قرارات تشغيلية لصاحب المغسلة.' },
]

const problems = [
  { title: 'الزحمة عند الاستقبال', text: 'كل عميل يحتاج شرح وخدمة ورقم وانتظار. QR يقلل هذا الضغط من أول يوم.' },
  { title: 'السيارات تضيع بين المراحل', text: 'بدل السؤال كل مرة: وين السيارة؟ تصبح الحالة ظاهرة للموظف والمالك.' },
  { title: 'الإيراد آخر اليوم غير واضح', text: 'المالك يحتاج يعرف النقد، الشبكة، الضريبة، والتسليمات بدون دفاتر.' },
]

const flow = [
  'العميل يمسح QR أو الموظف يضيف السيارة',
  'النظام يصدر رقم انتظار واضح مثل A-014',
  'الموظف يحرك السيارة بين المراحل بزر واحد',
  'العميل يرى الحالة على شاشة العرض أو صفحة الحالة',
  'المالك يغلق اليوم بتقرير مالي واضح',
]

const plans = [
  {
    name: 'Starter',
    price: '299',
    note: 'للمغسلة الصغيرة التي تريد ترتيب التشغيل الأساسي.',
    cta: 'ابدأ Starter',
    points: [
      'لوحة تشغيل السيارات',
      'إضافة السيارات من الموظف',
      'العملاء الأساسيون',
      'مالية يومية بسيطة',
      'تقارير تشغيل مختصرة',
      'بدون QR ذاتي',
    ],
  },
  {
    name: 'Pro',
    price: '699',
    badge: 'الباقة التي نوصي بها',
    note: 'للمغسلة التي تريد تجربة عميل أسرع وواجهة تشغيل احترافية.',
    cta: 'اطلب Pro',
    points: [
      'كل مزايا Starter',
      'QR تسجيل ذاتي',
      'شاشة عرض Live',
      'صفحة حالة للعميل',
      'العملاء والولاء',
      'VAT وإغلاق اليوم',
      'تقارير PDF/CSV',
      'مساعد مدار AI',
    ],
  },
  {
    name: 'Premium',
    price: '1,499',
    note: 'للمغاسل الجادة أو التي تحتاج متابعة أداء أعمق.',
    cta: 'ناقش Premium',
    points: [
      'كل مزايا Pro',
      'أداء الموظفين والعمولات',
      'تقارير متقدمة',
      'دعم أولوية',
      'إعداد وتشغيل مخصص',
      'تجهيز ميزات اختيارية لاحقاً',
    ],
  },
]

const faqs = [
  {
    q: 'هل أقدر أبدأ بدون واتساب API؟',
    a: 'نعم. التشغيل، QR، العملاء، المالية، التقارير، ومساعد AI تعمل الآن. واتساب الرسمي يتفعل بعد اعتماد Meta وربط الرقم.',
  },
  {
    q: 'كيف يتم الدفع حالياً؟',
    a: 'حالياً الاشتراك يتم بتحويل بنكي، وبعد وصول الإيصال يتم تفعيل الحساب يدوياً من الإدارة. الدفع الإلكتروني يضاف لاحقاً عند تفعيل Moyasar.',
  },
  {
    q: 'هل التجربة مجانية؟',
    a: 'نعم، التجربة 3 أيام عشان صاحب المغسلة يشوف التشغيل الحقيقي قبل الاشتراك.',
  },
  {
    q: 'هل QR إلزامي؟',
    a: 'لا. يمكن تشغيل النظام بإضافة السيارة من الموظف، وQR يكون ميزة إضافية لتخفيف ضغط الاستقبال.',
  },
]

export const HomePage = () => {
  const [lead, setLead] = useState({ name: '', phone: '', business: '', city: '' })
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  const salesMessage =
    'مرحباً، أريد تجربة مدار OS لمغسلتي. أحتاج عرض سريع وخطة تشغيل، وأرغب بمعرفة العرض الافتتاحي لباقات المغاسل.'

  const requestDemo = () => openWhatsAppChat(salesMessage)

  const submitLead = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!lead.name.trim() || !lead.phone.trim()) return
    setSending(true)
    try {
      await supabase.from('leads').insert([{
        name: lead.name.trim(),
        phone: lead.phone.trim(),
        email: '',
        service: 'madar_os_car_wash_demo',
        message: `النشاط: ${lead.business || 'مغسلة سيارات'} | المدينة: ${lead.city || 'غير محددة'} | عرض افتتاحي Pro 499 لأول شهرين`,
        source: 'website',
        status: 'new',
      }])
      setDone(true)
      setLead({ name: '', phone: '', business: '', city: '' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5FAFF] text-[#0D1B3E]" dir="rtl">
      <header className="sticky top-0 z-40 border-b border-sky-100 bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo-main.png" alt="Madar.software" className="h-12 w-auto object-contain" />
            <div>
              <p className="font-sora text-lg font-bold leading-none">Madar<span className="text-[#00BFFF]"> OS</span></p>
              <p className="mt-1 text-[11px] font-bold text-slate-500 font-tajawal">نظام تشغيل للمغاسل والعيادات</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 font-cairo lg:flex">
            <a href="#features" className="hover:text-[#0099CC]">المميزات</a>
            <a href="#pricing" className="hover:text-[#0099CC]">الأسعار</a>
            <a href="#flow" className="hover:text-[#0099CC]">طريقة العمل</a>
            <a href="#faq" className="hover:text-[#0099CC]">الأسئلة</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden rounded-xl border border-sky-100 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm font-cairo sm:inline-flex">
              تسجيل الدخول
            </Link>
            <Link
              to="/trial"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0D1B3E] px-4 py-2.5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(13,27,62,0.18)] font-cairo"
            >
              ابدأ تجربتك
              <ChevronLeft size={16} />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-white">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,191,255,0.045)_1px,transparent_1px),linear-gradient(rgba(0,191,255,0.045)_1px,transparent_1px)] bg-[size:48px_48px]" />
          <div className="relative mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
            <div className="grid items-center gap-8 lg:grid-cols-[0.72fr_1.28fr]">
              <div className="z-10 py-8 lg:py-16">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 font-cairo">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  ركّب النظام خلال 24 ساعة، وابدأ بتجربة 3 أيام
                </div>
                <h1 className="text-4xl font-black leading-[1.16] tracking-normal text-[#0D1B3E] font-cairo sm:text-5xl lg:text-6xl">
                  إدارة أسهل.
                  <span className="block text-[#0099CC]">مبيعات أعلى.</span>
                </h1>
                <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 font-tajawal">
                  مدار OS ينقل المغسلة من الدفاتر والمتابعة اليدوية إلى نظام تشغيل واضح: سيارات، QR، عملاء، مالية، تقارير، وشاشة عرض من مكان واحد.
                </p>

                <div className="mt-8 rounded-2xl border border-sky-100 bg-sky-50/80 p-4">
                  <p className="text-sm font-black text-[#0D1B3E] font-cairo">العرض الافتتاحي لأول 10 مغاسل</p>
                  <p className="mt-1 text-sm leading-7 text-slate-600 font-tajawal">
                    باقة Pro بسعر <strong className="font-sora text-[#0099CC]">499 ر.س</strong> لأول شهرين، بعدها 699 ر.س شهرياً. الدفع حالياً بتحويل بنكي وتفعيل يدوي.
                  </p>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/trial"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#00BFFF] px-6 py-4 text-base font-black text-[#071322] shadow-[0_18px_38px_rgba(0,191,255,0.28)] font-cairo"
                  >
                    ابدأ تجربة 3 أيام
                    <ArrowLeft size={18} />
                  </Link>
                  <button
                    onClick={requestDemo}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-white px-6 py-4 text-base font-black text-[#0D1B3E] shadow-sm font-cairo"
                  >
                    كلمنا على واتساب
                    <MessageCircle size={18} />
                  </button>
                </div>

                <div className="mt-8 grid grid-cols-3 gap-3">
                  {[
                    ['24h', 'إعداد سريع'],
                    ['3', 'أيام تجربة'],
                    ['499', 'عرض Pro'],
                  ].map(([value, label]) => (
                    <div key={label} className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
                      <p className="font-sora text-2xl font-black text-[#0D1B3E]">{value}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500 font-tajawal">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <img
                  src="/madar-os-hero-realistic.png"
                  alt="مدار OS للمغاسل - لوحة تشغيل السيارات وQR"
                  className="w-full rounded-[28px] border border-sky-100 object-cover shadow-[0_30px_90px_rgba(13,27,62,0.18)]"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-sky-100 bg-white py-8">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
            {[
              { icon: ShieldCheck, title: 'يعمل بدون واتساب API الآن', text: 'الواتساب الرسمي إضافة لاحقة بعد اعتماد Meta.' },
              { icon: CreditCard, title: 'تحويل بنكي حالياً', text: 'نفعّل الحساب يدوياً بعد وصول الإيصال.' },
              { icon: TrendingUp, title: 'مصمم للبيع للمغاسل', text: 'يعالج التشغيل والزحمة والتقارير قبل أي إضافات.' },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-start gap-3 rounded-2xl bg-[#F5FAFF] p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#0099CC] shadow-sm">
                  <Icon size={20} />
                </div>
                <div>
                  <p className="font-black font-cairo">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600 font-tajawal">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-10 grid gap-5 lg:grid-cols-[0.8fr_1fr] lg:items-end">
            <div>
              <p className="text-sm font-black text-[#0099CC] font-cairo">ليش صاحب المغسلة يحتاجه؟</p>
              <h2 className="mt-2 text-3xl font-black leading-tight font-cairo sm:text-4xl">
                لا تبيع برنامج. بيع تشغيل مغسلة بدون فوضى.
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {problems.map(item => (
                <div key={item.title} className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
                  <p className="font-black font-cairo">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 font-tajawal">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-3xl border border-sky-100 bg-white p-6 shadow-[0_12px_32px_rgba(13,27,62,0.06)]">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F7FF] text-[#0099CC]">
                  <Icon size={22} />
                </div>
                <h3 className="text-lg font-black font-cairo">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600 font-tajawal">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="bg-[#071322] py-20 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center">
              <p className="text-sm font-black text-[#00BFFF] font-cairo">الباقات والأسعار</p>
              <h2 className="mt-2 text-3xl font-black font-cairo sm:text-4xl">سعر واضح، وتفعيل يدوي الآن بتحويل بنكي.</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-300 font-tajawal">
                لا ننتظر Moyasar ولا Meta عشان نبدأ البيع. التشغيل الأساسي جاهز، والدفع الإلكتروني وواتساب الرسمي إضافات لاحقة.
              </p>
            </div>

            <div className="mb-6 rounded-3xl border border-cyan-300/30 bg-cyan-400/10 p-5 text-center">
              <p className="text-lg font-black text-cyan-100 font-cairo">عرض افتتاحي: Pro بـ 499 ر.س لأول شهرين لأول 10 مغاسل</p>
              <p className="mt-2 text-sm text-cyan-50/80 font-tajawal">بعد الشهرين يرجع السعر إلى 699 ر.س شهرياً. رسوم التأسيس مجانية في العرض الافتتاحي.</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {plans.map(plan => (
                <div key={plan.name} className={`relative rounded-3xl border bg-white p-6 text-[#0D1B3E] shadow-[0_20px_60px_rgba(0,0,0,0.20)] ${plan.badge ? 'border-[#00BFFF] lg:scale-[1.03]' : 'border-white/10'}`}>
                  {plan.badge && (
                    <span className="absolute -top-3 right-6 rounded-full bg-[#00BFFF] px-4 py-1.5 text-xs font-black text-[#071322] font-cairo">{plan.badge}</span>
                  )}
                  <h3 className="font-sora text-2xl font-black">{plan.name}</h3>
                  <p className="mt-2 min-h-[56px] text-sm leading-7 text-slate-600 font-tajawal">{plan.note}</p>
                  <div className="my-6 border-y border-sky-100 py-5">
                    <span className="font-sora text-5xl font-black">{plan.price}</span>
                    <span className="mr-2 text-sm font-bold text-slate-500 font-cairo">ر.س / شهر</span>
                  </div>
                  <div className="space-y-3">
                    {plan.points.map(point => (
                      <div key={point} className="flex items-center gap-2 text-sm font-bold text-slate-700 font-tajawal">
                        <Check size={16} className="text-emerald-500" />
                        {point}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={requestDemo}
                    className={`mt-7 w-full rounded-2xl px-5 py-3.5 text-sm font-black font-cairo ${plan.badge ? 'bg-[#0D1B3E] text-white' : 'border border-sky-100 bg-sky-50 text-[#0D1B3E]'}`}
                  >
                    {plan.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="flow" className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1fr] lg:items-center lg:px-8">
          <div>
            <p className="text-sm font-black text-[#0099CC] font-cairo">طريقة البيع والتشغيل</p>
            <h2 className="mt-2 text-3xl font-black leading-tight font-cairo sm:text-4xl">من أول تجربة إلى أول تقرير يومي.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 font-tajawal">
              الهدف أن صاحب المغسلة يشوف قيمة النظام خلال أيام، وليس بعد شهر. لذلك نبدأ بتشغيل بسيط ثم نضيف الميزات حسب جاهزية كل عميل.
            </p>
          </div>
          <div className="space-y-3">
            {flow.map((item, index) => (
              <div key={item} className="flex items-center gap-4 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#00BFFF] font-sora text-sm font-black text-[#071322]">{index + 1}</span>
                <p className="font-bold font-cairo">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-4 lg:grid-cols-3">
              {[
                { icon: MessageCircle, title: 'واتساب الرسمي لاحقاً', text: 'حتى يكتمل اعتماد Meta، لا نبيع الواتساب كميزة جاهزة 100%. نبيعه كتفعيل لاحق.' },
                { icon: Wallet, title: 'المدفوعات لاحقاً', text: 'Moyasar وApple Pay والمحفظة الرقمية إضافات اختيارية بعد دخول أول مبيعات.' },
                { icon: Zap, title: 'ابدأ الآن', text: 'العميل يشتري التشغيل: QR، لوحة السيارات، العملاء، المالية، التقارير، والشاشة.' },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-3xl border border-sky-100 bg-[#F5FAFF] p-6">
                  <Icon size={24} className="text-[#0099CC]" />
                  <h3 className="mt-4 text-lg font-black font-cairo">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600 font-tajawal">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <p className="text-sm font-black text-[#0099CC] font-cairo">أسئلة البيع المهمة</p>
            <h2 className="mt-2 text-3xl font-black font-cairo sm:text-4xl">إجابات واضحة قبل الاشتراك.</h2>
          </div>
          <div className="space-y-3">
            {faqs.map(item => (
              <div key={item.q} className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
                <p className="font-black font-cairo">{item.q}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600 font-tajawal">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="demo" className="bg-[#0D1B3E] py-20 text-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1fr] lg:px-8">
            <div>
              <p className="text-sm font-black text-[#00BFFF] font-cairo">جاهز تبدأ البيع؟</p>
              <h2 className="mt-2 text-3xl font-black leading-tight font-cairo sm:text-4xl">
                خل صاحب المغسلة يشوف النظام، مو يسمع عنه فقط.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-300 font-tajawal">
                سجل بياناته، وابدأ معه تجربة قصيرة. إذا شاف السيارات، QR، المالية، وإغلاق اليوم بعينه، قرار الاشتراك يصير أسهل.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold font-cairo">
                <span className="rounded-full bg-white/10 px-4 py-2"><Clock size={14} className="ml-1 inline" /> إعداد خلال 24 ساعة</span>
                <span className="rounded-full bg-white/10 px-4 py-2"><Sparkles size={14} className="ml-1 inline" /> تجربة 3 أيام</span>
                <span className="rounded-full bg-white/10 px-4 py-2"><CreditCard size={14} className="ml-1 inline" /> تحويل بنكي مؤقت</span>
              </div>
            </div>

            <form onSubmit={submitLead} className="rounded-3xl border border-white/10 bg-white p-5 text-[#0D1B3E] shadow-[0_30px_80px_rgba(0,0,0,0.18)]">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={lead.name}
                  onChange={event => setLead({ ...lead, name: event.target.value })}
                  className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-bold outline-none font-tajawal"
                  placeholder="اسم صاحب المغسلة"
                />
                <input
                  value={lead.phone}
                  onChange={event => setLead({ ...lead, phone: event.target.value })}
                  className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-bold outline-none font-sora"
                  placeholder="05XXXXXXXX"
                  dir="ltr"
                />
                <input
                  value={lead.business}
                  onChange={event => setLead({ ...lead, business: event.target.value })}
                  className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-bold outline-none font-tajawal"
                  placeholder="اسم المغسلة"
                />
                <input
                  value={lead.city}
                  onChange={event => setLead({ ...lead, city: event.target.value })}
                  className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-bold outline-none font-tajawal"
                  placeholder="المدينة"
                />
              </div>
              <button
                disabled={sending}
                className="mt-4 w-full rounded-2xl bg-[#00BFFF] px-5 py-4 text-base font-black text-[#071322] disabled:opacity-60 font-cairo"
              >
                {sending ? 'جاري التسجيل...' : done ? 'تم تسجيل الطلب' : 'سجل طلب تجربة'}
              </button>
              <button
                type="button"
                onClick={() => openWhatsAppChat(`مرحباً، أريد تجربة مدار OS. الاسم: ${lead.name || 'غير محدد'}، الجوال: ${lead.phone || 'غير محدد'}`)}
                className="mt-3 w-full rounded-2xl border border-sky-100 bg-white px-5 py-3 text-sm font-black text-[#0D1B3E] font-cairo"
              >
                أو ابدأ مباشرة على واتساب
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-sky-100 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 text-sm text-slate-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p className="font-bold font-cairo">© 2026 Madar.software — نظام تشغيل للمغاسل والعيادات.</p>
          <div className="flex gap-4 font-bold font-cairo">
            <a href={`https://wa.me/${adminPhone}`} target="_blank" rel="noreferrer" className="text-[#0099CC]">واتساب</a>
            <Link to="/privacy">الخصوصية</Link>
            <Link to="/terms">الشروط</Link>
          </div>
        </div>
      </footer>

      <MadarAgentWidget agentType="sales_website" pageTitle="موقع مدار" />
    </div>
  )
}
