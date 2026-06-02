import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  BarChart3,
  Bot,
  Check,
  ChevronLeft,
  Clock,
  Gauge,
  MessageCircle,
  Monitor,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'

import { MadarAgentWidget } from '../components/dash/MadarAgentWidget'
import { supabase } from '../lib/supabase'
import { openWhatsAppChat } from '../lib/whatsapp'

const phone = '966546666005'

const features = [
  { icon: Gauge, title: 'لوحة تشغيل السيارات', text: 'استلام، خدمة، جاهزة، وتسليم من شاشة واحدة سريعة للموظف.' },
  { icon: QrCode, title: 'تسجيل ذاتي عبر QR', text: 'العميل يسجل نفسه من الجوال ويأخذ رقم انتظار واضح.' },
  { icon: Monitor, title: 'شاشة عرض للمغسلة', text: 'عرض أرقام الدور والحالة على شاشة كبيرة داخل الفرع.' },
  { icon: Users, title: 'العملاء والولاء', text: 'سجل عملاء، زيارات، مكافآت، وتنشيط العملاء الراجعين.' },
  { icon: BarChart3, title: 'مالية وتقارير', text: 'إيراد اليوم، VAT، إغلاق اليوم، CSV/PDF، ومؤشرات تشغيل.' },
  { icon: Bot, title: 'مساعد مدار AI', text: 'مساعد متخصص يشرح الصفحات ويقترح قرارات تشغيلية داخل النظام.' },
]

const flow = [
  'العميل يمسح QR عند الدخول',
  'يختار الخدمة ويسجل رقم الجوال',
  'يظهر رقمه وحالة سيارته مباشرة',
  'الموظف يحرك السيارة بزر واحد',
  'المالك يشوف الإيراد والتقارير آخر اليوم',
]

const plans = [
  {
    name: 'Starter',
    price: '299',
    note: 'للمغسلة الصغيرة التي تريد ترتيب التشغيل',
    points: ['لوحة التشغيل', 'تسجيل السيارات من الموظف', 'العملاء الأساسيون', 'مالية يومية بسيطة'],
  },
  {
    name: 'Pro',
    price: '799',
    badge: 'الأفضل للبيع الآن',
    note: 'للمغسلة التي تريد QR وتشغيل أسرع وتجربة عميل أفضل',
    points: ['كل مزايا Starter', 'QR تسجيل ذاتي', 'شاشة عرض Live', 'تقارير وVAT', 'مساعد مدار AI'],
  },
  {
    name: 'Premium',
    price: '1,999',
    note: 'للمغاسل الكبيرة أو متعددة الفروع',
    points: ['كل مزايا Pro', 'دعم أولوية', 'تقارير أعمق', 'تجهيز فروع', 'تخصيصات حسب التشغيل'],
  },
]

export const HomePage = () => {
  const [lead, setLead] = useState({ name: '', phone: '', business: '', city: '' })
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  const requestDemo = () => {
    openWhatsAppChat('مرحباً، أريد تجربة نظام مدار OS لمغسلتي. أحتاج عرض سريع وخطة تشغيل.')
  }

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
        message: `النشاط: ${lead.business || 'مغسلة سيارات'} | المدينة: ${lead.city || 'غير محددة'}`,
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
      <header className="sticky top-0 z-40 border-b border-sky-100 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo-main.png" alt="Madar.software" className="h-12 w-auto object-contain" />
            <div>
              <p className="font-sora text-lg font-bold leading-none">Madar<span className="text-[#00BFFF]">.software</span></p>
              <p className="mt-1 text-[11px] font-bold text-slate-500 font-tajawal">مدار OS للمغاسل والعيادات</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 font-cairo lg:flex">
            <a href="#features" className="hover:text-[#0099CC]">المزايا</a>
            <a href="#flow" className="hover:text-[#0099CC]">طريقة العمل</a>
            <a href="#pricing" className="hover:text-[#0099CC]">الباقات</a>
            <a href="#demo" className="hover:text-[#0099CC]">اطلب تجربة</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden rounded-xl border border-sky-100 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm font-cairo sm:inline-flex">
              دخول المنصة
            </Link>
            <button
              onClick={requestDemo}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0D1B3E] px-4 py-2.5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(13,27,62,0.18)] font-cairo"
            >
              احجز عرض
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-sky-100 bg-white">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,191,255,0.05)_1px,transparent_1px),linear-gradient(rgba(0,191,255,0.05)_1px,transparent_1px)] bg-[size:44px_44px]" />
          <div className="relative mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_0.92fr] lg:px-8">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 font-cairo">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                جاهز لتشغيل المغسلة الآن، واتساب API يتفعل بعد اعتماد Meta
              </div>
              <h1 className="text-4xl font-black leading-[1.18] tracking-normal text-[#0D1B3E] font-cairo sm:text-5xl lg:text-6xl">
                نظام تشغيل فاخر للمغاسل
                <span className="block text-[#0099CC]">يرتب السيارات، العملاء، والمالية من أول يوم.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 font-tajawal">
                مدار OS يحوّل المغسلة من دفاتر واتساب ومتابعة يدوية إلى لوحة تشغيل واضحة: QR للعميل، مسار سيارات Live، شاشة عرض، تقارير، ولاء، ومساعد AI متخصص.
              </p>

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

              <div className="mt-8 grid grid-cols-3 gap-3 max-w-xl">
                {[
                  ['4', 'مراحل تشغيل'],
                  ['Live', 'حالة السيارة'],
                  ['VAT', 'مالية وضريبة'],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
                    <p className="font-sora text-2xl font-black text-[#0D1B3E]">{value}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500 font-tajawal">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-sky-100 bg-[#071322] p-4 shadow-[0_30px_90px_rgba(13,27,62,0.22)]">
              <div className="rounded-3xl bg-[#F8FBFF] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#0099CC] font-cairo">مركز تشغيل اليوم</p>
                    <h2 className="mt-1 text-2xl font-black font-cairo">مسار السيارات السريع</h2>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700 font-cairo">Live</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['A-014', 'استلام', '#0EA5E9'],
                    ['A-015', 'قيد الخدمة', '#7C3AED'],
                    ['A-016', 'جاهزة', '#059669'],
                    ['12,450', 'إيراد الشهر', '#F59E0B'],
                  ].map(([value, label, color]) => (
                    <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                      <span className="block h-2 w-2 rounded-full" style={{ background: color }} />
                      <p className="mt-4 font-sora text-2xl font-black">{value}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500 font-tajawal">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-3">
                  {['اعتمد تسجيل QR', 'سلّم السيارة الجاهزة', 'راجع إغلاق اليوم'].map((item, index) => (
                    <div key={item} className="flex items-center justify-between rounded-2xl border border-sky-100 bg-white p-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 font-sora text-xs font-black text-[#0099CC]">{index + 1}</span>
                        <p className="text-sm font-bold font-cairo">{item}</p>
                      </div>
                      <Check size={16} className="text-emerald-500" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-black text-[#0099CC] font-cairo">ما الذي يبيعه مدار؟</p>
              <h2 className="mt-2 text-3xl font-black font-cairo sm:text-4xl">أهم شيء لصاحب المغسلة: تشغيل أسرع وقرارات أوضح.</h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-slate-600 font-tajawal">
              الواجهة مصممة لموظف مشغول، ومالك يريد يعرف هل اليوم ماشي صح أو فيه زحام، تأخير، أو فرصة مبيعات.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-sky-100 bg-white p-6 shadow-[0_12px_32px_rgba(13,27,62,0.06)]">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F7FF] text-[#0099CC]">
                  <Icon size={22} />
                </div>
                <h3 className="text-lg font-black font-cairo">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600 font-tajawal">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="flow" className="bg-[#071322] py-20 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1fr] lg:items-center">
              <div>
                <p className="text-sm font-black text-[#00BFFF] font-cairo">رحلة تشغيل بسيطة</p>
                <h2 className="mt-2 text-3xl font-black leading-tight font-cairo sm:text-4xl">من دخول السيارة إلى إغلاق اليوم بدون فوضى.</h2>
                <p className="mt-4 text-sm leading-7 text-slate-300 font-tajawal">
                  كل خطوة لها شاشة واضحة، وكل حركة تنعكس على حالة العميل والمالك. لا نحتاج تفاصيل كثيرة وقت الزحمة.
                </p>
              </div>
              <div className="space-y-3">
                {flow.map((item, index) => (
                  <div key={item} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#00BFFF] font-sora text-sm font-black text-[#071322]">{index + 1}</span>
                    <p className="font-bold font-cairo">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-sm font-black text-[#0099CC] font-cairo">باقات واضحة للمغاسل</p>
            <h2 className="mt-2 text-3xl font-black font-cairo sm:text-4xl">ابدأ بالتشغيل، ثم فعّل الإضافات عند الحاجة.</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600 font-tajawal">
              المدفوعات، المحفظة، وواتساب API الرسمي تبقى إضافات اختيارية حسب جاهزية العميل واعتماد مزودي الخدمة.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {plans.map(plan => (
              <div key={plan.name} className={`relative rounded-3xl border bg-white p-6 shadow-[0_16px_42px_rgba(13,27,62,0.07)] ${plan.badge ? 'border-[#00BFFF]' : 'border-sky-100'}`}>
                {plan.badge && (
                  <span className="absolute -top-3 right-6 rounded-full bg-[#00BFFF] px-4 py-1.5 text-xs font-black text-[#071322] font-cairo">{plan.badge}</span>
                )}
                <h3 className="font-sora text-2xl font-black">{plan.name}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600 font-tajawal">{plan.note}</p>
                <div className="my-6 border-y border-sky-100 py-5">
                  <span className="font-sora text-4xl font-black">{plan.price}</span>
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
                  اطلب تفعيل الباقة
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              { icon: ShieldCheck, title: 'بيع صادق', text: 'واتساب API الرسمي لا نعد به قبل اعتماد Meta، ونفعله عند الجاهزية.' },
              { icon: Wallet, title: 'المدفوعات لاحقاً', text: 'Apple Pay، Google Pay، والمحفظة الرقمية تظل إضافات مدفوعة اختيارية.' },
              { icon: Zap, title: 'تشغيل الآن', text: 'المنصة تخدم المغسلة حتى بدون واتساب API: تشغيل، QR، تقارير، ومالية.' },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-3xl border border-sky-100 bg-white p-6">
                <Icon size={24} className="text-[#0099CC]" />
                <h3 className="mt-4 text-lg font-black font-cairo">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600 font-tajawal">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="demo" className="bg-[#0D1B3E] py-20 text-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1fr] lg:px-8">
            <div>
              <p className="text-sm font-black text-[#00BFFF] font-cairo">جاهز تعرضه على مغسلة؟</p>
              <h2 className="mt-2 text-3xl font-black leading-tight font-cairo sm:text-4xl">خل العميل يشوف النظام، مو يسمع عنه فقط.</h2>
              <p className="mt-4 text-sm leading-7 text-slate-300 font-tajawal">
                سجل بيانات العميل، ونبدأ معه تجربة تشغيل قصيرة. الهدف: يشوف السيارات، QR، التقارير، والمالية بعينه.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold font-cairo">
                <span className="rounded-full bg-white/10 px-4 py-2"><Clock size={14} className="ml-1 inline" /> إعداد سريع</span>
                <span className="rounded-full bg-white/10 px-4 py-2"><Sparkles size={14} className="ml-1 inline" /> تجربة 3 أيام</span>
                <span className="rounded-full bg-white/10 px-4 py-2"><MessageCircle size={14} className="ml-1 inline" /> متابعة واتساب يدوية حالياً</span>
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
            <a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer" className="text-[#0099CC]">واتساب</a>
            <Link to="/privacy">الخصوصية</Link>
            <Link to="/terms">الشروط</Link>
          </div>
        </div>
      </footer>

      <MadarAgentWidget agentType="sales_website" pageTitle="موقع مدار" />
    </div>
  )
}
