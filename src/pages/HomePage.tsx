import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
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
  {
    icon: Gauge,
    title: 'لوحة تشغيل واضحة',
    text: 'استقبال، قيد الخدمة، جاهزة، وتم التسليم في مسار واحد يفهمه الموظف بسرعة.',
  },
  {
    icon: QrCode,
    title: 'تسجيل ذاتي عبر QR',
    text: 'خفف ضغط الاستقبال وخلي العميل يدخل بياناته بنفسه ويحصل على رقم انتظار واضح.',
  },
  {
    icon: Monitor,
    title: 'شاشة عرض مباشرة',
    text: 'اعرض أرقام الدور وحالة السيارات داخل المغسلة بطريقة احترافية أمام العملاء.',
  },
  {
    icon: Users,
    title: 'عملاء وولاء',
    text: 'اعرف العملاء المتكررين، عدد الزيارات، والمكافآت من مكان واحد بدون دفاتر.',
  },
  {
    icon: BarChart3,
    title: 'مالية وضريبة VAT',
    text: 'تابع الإيراد، طرق الدفع، الضريبة، وإغلاق اليوم بأرقام جاهزة للقرار.',
  },
  {
    icon: Bot,
    title: 'دعم مدار AI',
    text: 'مساعد متخصص يشرح الصفحات ويقترح خطوات عملية لصاحب المغسلة وفريقه.',
  },
]

const trustPoints = [
  {
    icon: ShieldCheck,
    title: 'جاهز للبيع اليوم',
    text: 'التشغيل الأساسي يعمل بدون انتظار تفعيل WhatsApp API أو بوابة الدفع.',
  },
  {
    icon: CreditCard,
    title: 'اشتراك بتحويل بنكي',
    text: 'ابدأ بالتحويل والتفعيل اليدوي الآن، وأضف الدفع الإلكتروني لاحقاً عند الجاهزية.',
  },
  {
    icon: TrendingUp,
    title: 'مصمم لزيادة السيطرة',
    text: 'النظام يوضح أين السيارات، أين الإيراد، ومن يحتاج متابعة في نفس اللحظة.',
  },
]

const outcomes = [
  'تقليل الزحام على موظف الاستقبال',
  'رفع ثقة العميل لأنه يرى حالة سيارته بوضوح',
  'تسريع التسليم وتقليل الأخطاء اليدوية',
  'معرفة الإيراد والضريبة وإغلاق اليوم بدون تخمين',
]

const flow = [
  'العميل يمسح QR أو الموظف يضيف السيارة',
  'مدار يصدر رقم انتظار واضح مثل A-014',
  'الفريق يحرك السيارة بين المراحل بزر واحد',
  'العميل يرى الحالة على شاشة العرض أو صفحة الحالة',
  'المالك يغلق اليوم بتقرير مالي مرتب',
]

const plans = [
  {
    name: 'Starter',
    price: '299',
    note: 'للمغسلة التي تريد ترتيب التشغيل الأساسي بسرعة وبتكلفة منخفضة.',
    cta: 'ابدأ Starter',
    points: [
      'لوحة تشغيل السيارات',
      'إضافة السيارات من الموظف',
      'سجل العملاء الأساسي',
      'مالية يومية مبسطة',
      'تقارير تشغيل مختصرة',
    ],
  },
  {
    name: 'Pro',
    price: '699',
    badge: 'الأفضل لمعظم المغاسل',
    note: 'للإدارة التي تريد تجربة عميل أسرع، شاشة عرض، وقرارات أوضح كل يوم.',
    cta: 'اطلب Pro',
    points: [
      'كل مزايا Starter',
      'QR للتسجيل الذاتي',
      'شاشة عرض مباشرة',
      'صفحة حالة للعميل',
      'العملاء والولاء',
      'VAT وإغلاق اليوم',
      'تقارير PDF وCSV',
      'مساعد مدار AI',
    ],
  },
  {
    name: 'Premium',
    price: '1,499',
    note: 'للمغاسل الجادة أو الفروع التي تحتاج متابعة أعمق وتجهيزات خاصة.',
    cta: 'ناقش Premium',
    points: [
      'كل مزايا Pro',
      'تحليل أداء الموظفين',
      'تقارير متقدمة',
      'دعم أولوية',
      'إعداد وتشغيل مخصص',
      'تجهيز مزايا اختيارية لاحقاً',
    ],
  },
]

const faqs = [
  {
    q: 'هل أقدر أبدأ بدون WhatsApp API؟',
    a: 'نعم. التشغيل، QR، العملاء، المالية، التقارير، ومساعد AI تعمل الآن. واتساب الرسمي يتفعل لاحقاً بعد اعتماد Meta وربط الرقم.',
  },
  {
    q: 'كيف يتم الدفع حالياً؟',
    a: 'حالياً الاشتراك يتم بتحويل بنكي، وبعد وصول الإيصال يتم تفعيل الحساب يدوياً من الإدارة. الدفع الإلكتروني يضاف لاحقاً عند تفعيل Moyasar.',
  },
  {
    q: 'هل التجربة مجانية؟',
    a: 'نعم، التجربة 3 أيام حتى يرى صاحب المغسلة طريقة التشغيل قبل الاشتراك.',
  },
  {
    q: 'هل QR إلزامي؟',
    a: 'لا. يمكن تشغيل النظام بإضافة السيارة من الموظف، وQR يكون خياراً لتقليل ضغط الاستقبال وتسريع دخول العملاء.',
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
      await supabase.from('leads').insert([
        {
          name: lead.name.trim(),
          phone: lead.phone.trim(),
          email: '',
          service: 'madar_os_car_wash_demo',
          message: `النشاط: ${lead.business || 'مغسلة سيارات'} | المدينة: ${lead.city || 'غير محددة'} | مهتم بتجربة مدار OS للمغاسل`,
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

  return (
    <div className="min-h-screen bg-[#F5FAFF] text-[#0D1B3E]" dir="rtl">
      <header className="sticky top-0 z-40 border-b border-sky-100 bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo-main.png" alt="Madar.software" className="h-12 w-auto object-contain" />
            <div>
              <p className="font-sora text-lg font-bold leading-none">
                Madar<span className="text-[#00BFFF]"> OS</span>
              </p>
              <p className="mt-1 text-[11px] font-bold text-slate-500 font-tajawal">
                نظام تشغيل للمغاسل والعيادات
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 font-cairo lg:flex">
            <a href="#features" className="hover:text-[#0099CC]">
              المميزات
            </a>
            <a href="#pricing" className="hover:text-[#0099CC]">
              الأسعار
            </a>
            <a href="#flow" className="hover:text-[#0099CC]">
              طريقة العمل
            </a>
            <a href="#faq" className="hover:text-[#0099CC]">
              الأسئلة
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden rounded-xl border border-sky-100 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm font-cairo sm:inline-flex"
            >
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
          <img
            src="/madar-os-hero-realistic.png"
            alt="Madar OS hero"
            className="block w-full object-cover"
            style={{ minHeight: 'calc(100vh - 80px)', objectPosition: 'center top' }}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
        </section>

        <section className="border-y border-sky-100 bg-white py-8">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
            {trustPoints.map(({ icon: Icon, title, text }) => (
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
          <div className="max-w-3xl">
            <p className="text-sm font-black text-[#0099CC] font-cairo">لماذا مدار OS؟</p>
            <h2 className="mt-3 text-3xl font-black leading-tight font-cairo sm:text-4xl">
              لأن صاحب المغسلة يحتاج نظام تشغيل، وليس مجرد برنامج تسجيل.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600 font-tajawal">
              مدار يجمع السيارات، العملاء، المالية، شاشة العرض، والتقارير في تجربة واحدة بسيطة. الهدف أن يعرف الفريق ماذا يعمل الآن، ويعرف المالك ماذا يحدث في نهاية اليوم.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-[#0099CC]">
                  <Icon size={22} />
                </div>
                <h3 className="mt-5 text-xl font-black font-cairo">{title}</h3>
                <p className="mt-3 leading-7 text-slate-600 font-tajawal">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#0D1B3E] py-20 text-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div>
              <p className="text-sm font-black text-[#00BFFF] font-cairo">الأثر التجاري</p>
              <h2 className="mt-3 text-3xl font-black leading-tight font-cairo sm:text-4xl">
                تجربة أهدأ للعميل، وتحكم أقوى لصاحب المغسلة.
              </h2>
              <p className="mt-4 leading-8 text-slate-300 font-tajawal">
                عندما يعرف العميل رقمه وحالة سيارته، تقل الأسئلة. وعندما يعرف المالك الإيراد والسيارات والموظفين، يصبح القرار أسرع.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {outcomes.map((item) => (
                <div key={item} className="rounded-3xl border border-white/10 bg-white/8 p-5">
                  <Check className="text-[#00BFFF]" size={22} />
                  <p className="mt-4 text-lg font-black leading-7 font-cairo">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="flow" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-sm font-black text-[#0099CC] font-cairo">طريقة العمل</p>
              <h2 className="mt-3 text-3xl font-black leading-tight font-cairo sm:text-4xl">
                من دخول السيارة إلى إغلاق اليوم، كل خطوة واضحة.
              </h2>
              <p className="mt-4 leading-8 text-slate-600 font-tajawal">
                الفكرة ليست أن يضغط الموظف كثيراً. الفكرة أن تكون الحركة اليومية مختصرة، مفهومة، وتنعكس مباشرة على الشاشة والتقارير.
              </p>
              <button
                onClick={requestDemo}
                className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-[#00BFFF] px-6 py-4 text-base font-black text-[#071322] shadow-[0_18px_38px_rgba(0,191,255,0.28)] font-cairo"
              >
                تحدث معنا عن مغسلتك
                <MessageCircle size={18} />
              </button>
            </div>

            <div className="rounded-[32px] border border-sky-100 bg-white p-5 shadow-sm">
              {flow.map((step, index) => (
                <div key={step} className="flex gap-4 border-b border-sky-50 py-5 last:border-b-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0D1B3E] font-sora text-sm font-black text-white">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-lg font-black font-cairo">{step}</p>
                    <p className="mt-1 text-sm text-slate-500 font-tajawal">
                      خطوة عملية داخل اليوم، بدون تعقيد أو شاشات مشتتة.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-black text-[#0099CC] font-cairo">الباقات</p>
              <h2 className="mt-3 text-3xl font-black leading-tight font-cairo sm:text-4xl">
                ابدأ بسيطاً، ثم افتح المزايا حسب نمو المغسلة.
              </h2>
              <p className="mt-4 leading-8 text-slate-600 font-tajawal">
                الدفع الإلكتروني وWhatsApp API إضافات يتم تفعيلها لاحقاً عند جاهزية الحسابات الرسمية. الأساس اليوم هو تشغيل المغسلة بثقة.
              </p>
            </div>

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-[32px] border p-6 shadow-sm ${
                    plan.badge
                      ? 'border-[#00BFFF] bg-[#F5FAFF] shadow-[0_24px_60px_rgba(0,153,204,0.16)]'
                      : 'border-sky-100 bg-white'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-4 right-6 rounded-full bg-[#00BFFF] px-4 py-2 text-xs font-black text-[#071322] font-cairo">
                      {plan.badge}
                    </div>
                  )}
                  <h3 className="text-2xl font-black font-cairo">{plan.name}</h3>
                  <p className="mt-2 min-h-[56px] leading-7 text-slate-600 font-tajawal">{plan.note}</p>
                  <div className="mt-6 flex items-end gap-2">
                    <span className="font-sora text-5xl font-black">{plan.price}</span>
                    <span className="mb-2 text-sm font-bold text-slate-500 font-tajawal">ر.س / شهر</span>
                  </div>
                  <button
                    onClick={requestDemo}
                    className={`mt-6 w-full rounded-2xl px-5 py-4 text-base font-black font-cairo ${
                      plan.badge ? 'bg-[#0D1B3E] text-white' : 'border border-sky-100 bg-white text-[#0D1B3E]'
                    }`}
                  >
                    {plan.cta}
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

        <section className="mx-auto grid max-w-7xl gap-6 px-4 py-20 sm:px-6 lg:grid-cols-3 lg:px-8">
          {[
            { icon: Zap, title: 'تركيب سريع', text: 'نجهز الحساب، الخدمات، الموظفين، وشعار المغسلة خلال وقت قصير.' },
            { icon: Wallet, title: 'مزايا اختيارية لاحقاً', text: 'المحفظة، اشتراكات العملاء، وApple Pay تبقى ميزات مدفوعة عند جاهزية مزود الدفع.' },
            { icon: Clock, title: 'مناسب للبيع الآن', text: 'ابدأ بالميزات التشغيلية التي تعطي قيمة مباشرة، ثم فعّل التكاملات الرسمية تدريجياً.' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-[#0099CC]">
                <Icon size={22} />
              </div>
              <h3 className="mt-5 text-xl font-black font-cairo">{title}</h3>
              <p className="mt-3 leading-7 text-slate-600 font-tajawal">{text}</p>
            </div>
          ))}
        </section>

        <section id="faq" className="bg-white py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
            <div>
              <p className="text-sm font-black text-[#0099CC] font-cairo">قبل الاشتراك</p>
              <h2 className="mt-3 text-3xl font-black leading-tight font-cairo sm:text-4xl">
                إجابات واضحة قبل قرار التجربة.
              </h2>
              <p className="mt-4 leading-8 text-slate-600 font-tajawal">
                لا نبيع وعوداً مبهمة. نوضح ما يعمل الآن، وما يتم تفعيله لاحقاً حسب جاهزية الحسابات الرسمية.
              </p>
            </div>
            <div className="space-y-4">
              {faqs.map((item) => (
                <div key={item.q} className="rounded-3xl border border-sky-100 bg-[#F5FAFF] p-6">
                  <h3 className="text-lg font-black font-cairo">{item.q}</h3>
                  <p className="mt-3 leading-7 text-slate-600 font-tajawal">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid overflow-hidden rounded-[36px] bg-[#0D1B3E] text-white lg:grid-cols-[0.95fr_1.05fr]">
            <div className="p-8 sm:p-10 lg:p-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black text-[#00BFFF] font-cairo">
                <Sparkles size={15} />
                تجربة 3 أيام
              </div>
              <h2 className="mt-6 text-3xl font-black leading-tight font-cairo sm:text-4xl">
                خل صاحب المغسلة يشوف النظام على بياناته، ثم يقرر.
              </h2>
              <p className="mt-4 leading-8 text-slate-300 font-tajawal">
                نأخذ بيانات التواصل، نجهز الحساب، ونرسل له رابط الدخول. التجربة قصيرة وواضحة: هل النظام رتب يوم العمل؟ هل قلل الفوضى؟ هل يستحق الاشتراك؟
              </p>
            </div>

            <form onSubmit={submitLead} className="bg-white p-8 text-[#0D1B3E] sm:p-10 lg:p-12">
              <h3 className="text-2xl font-black font-cairo">اطلب تجربة مدار OS</h3>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <input
                  value={lead.name}
                  onChange={(event) => setLead((prev) => ({ ...prev, name: event.target.value }))}
                  className="rounded-2xl border border-sky-100 bg-[#F5FAFF] px-4 py-4 font-tajawal outline-none focus:border-[#00BFFF]"
                  placeholder="اسمك"
                />
                <input
                  value={lead.phone}
                  onChange={(event) => setLead((prev) => ({ ...prev, phone: event.target.value }))}
                  className="rounded-2xl border border-sky-100 bg-[#F5FAFF] px-4 py-4 font-tajawal outline-none focus:border-[#00BFFF]"
                  placeholder="رقم الجوال"
                />
                <input
                  value={lead.business}
                  onChange={(event) => setLead((prev) => ({ ...prev, business: event.target.value }))}
                  className="rounded-2xl border border-sky-100 bg-[#F5FAFF] px-4 py-4 font-tajawal outline-none focus:border-[#00BFFF]"
                  placeholder="اسم المغسلة"
                />
                <input
                  value={lead.city}
                  onChange={(event) => setLead((prev) => ({ ...prev, city: event.target.value }))}
                  className="rounded-2xl border border-sky-100 bg-[#F5FAFF] px-4 py-4 font-tajawal outline-none focus:border-[#00BFFF]"
                  placeholder="المدينة"
                />
              </div>
              <button
                disabled={sending}
                className="mt-5 w-full rounded-2xl bg-[#00BFFF] px-6 py-4 text-base font-black text-[#071322] disabled:opacity-60 font-cairo"
              >
                {sending ? 'جار إرسال الطلب...' : 'أرسل طلب التجربة'}
              </button>
              {done && (
                <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 font-tajawal">
                  تم استلام طلبك. سنتواصل معك لتجهيز الحساب.
                </p>
              )}
              <button
                type="button"
                onClick={requestDemo}
                className="mt-3 w-full rounded-2xl border border-sky-100 bg-white px-6 py-4 text-base font-black text-[#0D1B3E] font-cairo"
              >
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
            <a href={`https://wa.me/${adminPhone}`} className="font-bold text-[#0099CC]">
              واتساب
            </a>
            <Link to="/login" className="font-bold text-slate-700">
              دخول العملاء
            </Link>
          </div>
        </div>
      </footer>

      <MadarAgentWidget agentType="sales_website" label="اسأل مدار AI" />
    </div>
  )
}
