import { FormEvent, useEffect, useRef, useState } from 'react'
import {
  BarChart3,
  Bot,
  Calendar,
  Check,
  ChevronLeft,
  ChevronDown,
  Clock,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
  AlertCircle,
  Stethoscope,
  Heart,
  Activity,
  Scissors,
  Apple,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { MadarNavbar } from '../components/public/MadarNavbar'
import { supabase } from '../lib/supabase'
import { openWhatsAppChat } from '../lib/whatsapp'

gsap.registerPlugin(ScrollTrigger)

const navLinks = [
  { href: '#pain', label: 'المشكلة' },
  { href: '#solution', label: 'الحل' },
  { href: '#how-it-works', label: 'كيف نبدأ' },
  { href: '#pricing', label: 'الباقات' },
  { href: '#contact', label: 'تواصل' },
]

const painPoints = [
  'العميل المهتم أرسل على واتساب — والرد تأخر — فذهب لعيادة ثانية',
  'مكالمة فائتة = موعد ضائع لن يعود للمتابعة بنفسه',
  'رسائل بدون إغلاق تتراكم وتتحول إلى فرص ميتة',
  'الإعلانات تجلب اهتماماً — وضعف المتابعة يهدر كل ريال أنفقته',
]

const solutionFeatures = [
  {
    icon: MessageCircle,
    title: 'رد فوري على واتساب',
    text: 'يستقبل الرسائل ويقود العميل نحو الحجز مباشرة — بدون تأخير.',
  },
  {
    icon: Calendar,
    title: 'حجز مواعيد تلقائي',
    text: 'يتحقق من الجدول ويؤكد الموعد مع العميل بدون تدخل بشري.',
  },
  {
    icon: Users,
    title: 'متابعة العملاء المحتملين',
    text: 'لا يترك عميلاً مهتماً بدون رد أو متابعة — حتى خارج الدوام.',
  },
  {
    icon: Bot,
    title: 'تذكير بالمواعيد',
    text: 'يقلل نسبة الغياب ويحمي إيراد اليوم بتذكيرات تلقائية للعملاء.',
  },
]

const steps = [
  {
    icon: BarChart3,
    title: 'نحلل',
    text: 'أين تضيع حجوزات عيادتك — مكالمات، رسائل، أو متابعة.',
  },
  {
    icon: Sparkles,
    title: 'نبني',
    text: 'موظف AI حسب خدماتك وأسئلة عملائك وطريقة الحجز عندك.',
  },
  {
    icon: Zap,
    title: 'نطلقه',
    text: 'على واتساب والمكالمات ونقيس النتائج معك من اليوم الأول.',
  },
]

const whoItFits = [
  { icon: Stethoscope, specialty: 'عيادات الأسنان', benefit: 'متابعة الاستفسارات وتحويلها إلى مواعيد' },
  { icon: Heart, specialty: 'الجلدية والتجميل', benefit: 'متابعة المهتمين قبل أن يذهبوا لمركز آخر' },
  { icon: Sparkles, specialty: 'مراكز الليزر', benefit: 'رد سريع على الأسئلة المتكررة وحجز الجلسات' },
  { icon: Activity, specialty: 'العلاج الطبيعي', benefit: 'تنظيم الجلسات وتقليل الغياب' },
  { icon: Apple, specialty: 'التغذية', benefit: 'متابعة المراجعين وتذكيرهم بالمواعيد' },
  { icon: Clock, specialty: 'العيادات العامة', benefit: 'استقبال أكثر بدون موظف إضافي' },
]

const plans = [
  {
    name: 'تشغيل الحجوزات',
    badge: 'للعيادة التي تستقبل معظم استفساراتها عبر واتساب',
    result: 'رسائل واتساب تتحول إلى مواعيد منظمة بدون جهد يدوي',
    cta: 'ابدأ بتشغيل حجوزات واتساب',
    points: [
      'مساعد AI يرد على واتساب ويحجز المواعيد',
      'إجابات فورية للأسئلة المتكررة',
      'متابعة العملاء المحتملين',
      'تذكير تلقائي بالمواعيد',
      'لوحة لمتابعة الاستفسارات والحجوزات',
    ],
    highlight: false,
  },
  {
    name: 'موظف استقبال AI كامل',
    badge: 'للعيادة التي تخسر حجوزات من المكالمات والرسائل معاً',
    result: 'استقبال ذكي على واتساب والمكالمات — لا يفلت عميل مهتم بدون متابعة',
    cta: 'ركّب موظف استقبال AI كامل',
    points: [
      'كل مزايا باقة تشغيل الحجوزات',
      'AI Voice Agent يرد على المكالمات ويحجز مباشرة',
      'متابعة المكالمات الفائتة بدون تأخير',
      'تقليل الضغط على موظف الاستقبال في كل القنوات',
      'أولوية دعم وإعداد مخصص',
    ],
    highlight: true,
  },
]

const faq = [
  {
    q: 'هل النظام يحجز فعلاً؟',
    a: 'نعم. يتحقق من الجدول ويؤكد الموعد مع العميل مباشرة — بدون تدخل بشري.',
  },
  {
    q: 'هل يعمل على واتساب؟',
    a: 'نعم. واتساب هو القناة الرئيسية، مع إمكانية إضافة المكالمات في الباقة الكاملة.',
  },
  {
    q: 'هل يستبدل موظف الاستقبال؟',
    a: 'لا. يساعده ويخفف ضغطه — خاصة في أوقات الزحمة وخارج الدوام.',
  },
  {
    q: 'هل يناسب عيادتي إذا كان عندي نظام حجز حالي؟',
    a: 'نعم. يتكيف مع طريقة عملك الحالية دون الحاجة لتغيير أي شيء.',
  },
]

const mockAppointments = [
  { time: '09:00', patient: 'سارة المطيري', service: 'تنظيف الأسنان', doctor: 'د. أحمد', status: 'confirmed' },
  { time: '09:45', patient: 'محمد العتيبي', service: 'استشارة تقويم', doctor: 'د. نورة', status: 'checked_in' },
  { time: '10:30', patient: 'فاطمة القحطاني', service: 'فحص دوري', doctor: 'د. أحمد', status: 'pending' },
  { time: '11:15', patient: 'خالد الزهراني', service: 'جراحة الفم', doctor: 'د. خالد', status: 'confirmed' },
]

const statusColor: Record<string, string> = {
  confirmed: 'bg-emerald-100 text-emerald-700',
  checked_in: 'bg-sky-100 text-sky-700',
  pending: 'bg-amber-100 text-amber-700',
}

const statusLabel: Record<string, string> = {
  confirmed: 'مؤكد',
  checked_in: 'حاضر',
  pending: 'انتظار',
}

export const ClinicOSLanding = () => {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [lead, setLead] = useState({ name: '', phone: '', clinicName: '', city: '' })
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.clinic-hero-copy > *', {
        y: 34,
        autoAlpha: 0,
        duration: 0.85,
        stagger: 0.12,
        ease: 'power3.out',
        delay: 0.15,
      })
      gsap.from('.clinic-orb', {
        scale: 0.7,
        autoAlpha: 0,
        duration: 1.4,
        ease: 'power3.out',
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
      gsap.from('.step-card', {
        y: 24,
        autoAlpha: 0,
        stagger: 0.12,
        duration: 0.65,
        ease: 'power3.out',
        scrollTrigger: { trigger: '#how-it-works', start: 'top 70%' },
      })
      gsap.from('.feature-card', {
        y: 22,
        autoAlpha: 0,
        stagger: 0.08,
        duration: 0.65,
        ease: 'power3.out',
        scrollTrigger: { trigger: '#solution', start: 'top 68%' },
      })
    }, rootRef)

    return () => ctx.revert()
  }, [])

  const submitLead = async (e: FormEvent) => {
    e.preventDefault()
    if (!lead.name.trim() || !lead.phone.trim()) return
    setSending(true)
    setFormError('')
    try {
      const { error } = await supabase.from('leads').insert([
        {
          name: lead.name.trim(),
          phone: lead.phone.trim(),
          email: '',
          service: 'madar_os_clinic_demo',
          message: `العيادة: ${lead.clinicName || 'عيادة'} | المدينة: ${lead.city || 'غير محددة'} | طلب تحليل مجاني`,
          source: 'website',
          status: 'new',
        },
      ])
      if (error) throw error
      setDone(true)
      setLead({ name: '', phone: '', clinicName: '', city: '' })
    } catch {
      setFormError('حدث خطأ، تواصل معنا مباشرة عبر واتساب.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div ref={rootRef} className="min-h-screen bg-[#F5FAFF] text-[#071322]" dir="rtl">
      <MadarNavbar navLinks={navLinks} subtitle="نظام تشغيل للعيادات" />

      <main>
        {/* ── Hero ── */}
        <section className="relative min-h-[760px] overflow-hidden sm:min-h-[820px] lg:min-h-[700px]">
          <div className="absolute inset-0 bg-gradient-to-bl from-sky-50 via-[#F5FAFF] to-white" />
          <div className="clinic-orb absolute right-[-80px] top-[120px] h-[480px] w-[480px] rounded-full bg-[#00BFFF]/8 blur-[120px]" />
          <div className="clinic-orb absolute bottom-[-60px] left-[10%] h-[320px] w-[320px] rounded-full bg-[#007BFF]/6 blur-[90px]" />
          <div className="clinic-orb absolute left-[40%] top-[20%] h-[200px] w-[200px] rounded-full border border-[#00BFFF]/20 bg-[#00BFFF]/5" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/80 to-transparent" />

          <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-4 pt-36 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:pt-40">
            <div className="clinic-hero-copy w-full max-w-[580px] text-center lg:text-right">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/70 px-4 py-2 text-xs font-black text-[#0D1B3E] shadow-sm backdrop-blur-xl font-cairo sm:text-sm">
                <span className="h-2 w-2 rounded-full bg-[#00BFFF]" />
                مساعد استقبال ذكي للعيادات
              </div>
              <h1 className="mt-4 text-[1.9rem] font-black leading-[1.15] text-[#0D1B3E] font-cairo sm:text-5xl lg:text-[3.25rem]">
                موظف AI يحوّل رسائل<br />
                <span className="text-[#00BFFF]">عملائك إلى مواعيد مؤكدة</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-500 font-tajawal sm:text-lg">
                عيادتك ترد وتحجز وتتابع — حتى في أوقات الزحمة وخارج الدوام.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <button
                  onClick={() => openWhatsAppChat('مرحباً، أريد تحليلاً مجانياً لحجوزات عيادتي.')}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#007BFF] px-6 py-3.5 text-sm font-black text-white shadow-[0_18px_38px_rgba(0,123,255,0.28)] font-cairo"
                >
                  احصل على تحليل مجاني
                  <ChevronLeft size={16} />
                </button>
                <a
                  href="#solution"
                  className="inline-flex items-center gap-2 rounded-2xl border border-sky-100 bg-white px-6 py-3.5 text-sm font-black text-[#0D1B3E] shadow-sm font-cairo"
                >
                  كيف يعمل؟
                </a>
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400 font-tajawal lg:justify-start">
                {['رد فوري على العملاء', 'حجز ومتابعة تلقائية', 'ضغط أقل على الاستقبال'].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <Check size={14} className="text-[#00BFFF]" />
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* mockup preview */}
            <div className="mt-12 w-full max-w-[400px] lg:mt-8 lg:w-auto">
              <div className="rounded-[24px] border border-sky-100 bg-white p-5 shadow-[0_24px_64px_rgba(0,123,255,0.10)]">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-black text-[#0D1B3E] font-cairo">مواعيد اليوم</p>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-700">4 مواعيد</span>
                </div>
                <div className="grid gap-2.5">
                  {mockAppointments.map((apt) => (
                    <div key={apt.time} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                      <span className="w-11 text-center text-xs font-black text-slate-400 font-cairo">{apt.time}</span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-black text-[#0D1B3E] font-cairo">{apt.patient}</p>
                        <p className="truncate text-xs text-slate-400 font-tajawal">{apt.service} · {apt.doctor}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black ${statusColor[apt.status]}`}>
                        {statusLabel[apt.status]}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#00BFFF]/8 px-3 py-2">
                  <div className="h-2 w-2 rounded-full bg-[#00BFFF] animate-pulse" />
                  <p className="text-xs font-black text-[#0099CC] font-cairo">مساعد AI نشط — ردّ على ٣ عملاء الساعة الماضية</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pain ── */}
        <section id="pain" className="bg-[#071322] py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="gsap-reveal mb-10 text-center">
              <h2 className="text-2xl font-black leading-snug text-white font-cairo sm:text-3xl lg:text-4xl">
                المشكلة ليست في قلة العملاء.<br />
                <span className="text-[#00BFFF]">المشكلة أن كثيراً منهم لا يتم إغلاقهم.</span>
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {painPoints.map((pt, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/5 p-5"
                >
                  <AlertCircle size={18} className="mt-0.5 shrink-0 text-[#00BFFF]" />
                  <p className="text-sm leading-relaxed text-slate-300 font-tajawal">{pt}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Solution ── */}
        <section id="solution" className="bg-white py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="gsap-reveal mb-14 text-center">
              <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#00BFFF] font-cairo">الحل</p>
              <h2 className="text-3xl font-black text-[#071322] font-cairo sm:text-4xl">
                موظف AI للاستقبال والحجوزات<br />داخل عيادتك
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-slate-500 font-tajawal">
                يرد على عملائك، يجاوب أسئلتهم المتكررة، يحجز المواعيد، ويتابع المهتمين — حتى لا تضيع فرصة واحدة.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {solutionFeatures.map((f, i) => (
                <div key={i} className="feature-card rounded-3xl border border-sky-100 bg-[#F5FAFF] p-6">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00BFFF]/10">
                    <f.icon size={22} className="text-[#00BFFF]" />
                  </div>
                  <h3 className="mb-2 text-base font-black text-[#071322] font-cairo">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500 font-tajawal">{f.text}</p>
                </div>
              ))}
            </div>

            <div className="gsap-reveal mt-12 grid grid-cols-3 divide-x divide-x-reverse divide-sky-100 rounded-3xl border border-sky-100 bg-[#F5FAFF] p-8">
              {[
                { val: 'أسرع رد', label: 'قبل أن يفكر العميل في مكان آخر' },
                { val: 'أقل غياب', label: 'تذكيرات تلقائية تحمي إيراد اليوم' },
                { val: '24/7', label: 'يعمل حتى بعد انتهاء الدوام' },
              ].map((s, i) => (
                <div key={i} className="px-6 text-center first:pr-0 last:pl-0">
                  <p className="text-3xl font-black text-[#007BFF] font-cairo sm:text-4xl">{s.val}</p>
                  <p className="mt-1 text-sm text-slate-500 font-tajawal">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Who It Fits ── */}
        <section id="who-fits" className="bg-[#F5FAFF] py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="gsap-reveal mb-12 text-center">
              <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#00BFFF] font-cairo">لمن هذا النظام؟</p>
              <h2 className="text-3xl font-black text-[#071322] font-cairo sm:text-4xl">
                مصمم للعيادات التي تعتمد على سرعة الرد
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {whoItFits.map((w, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className="flex items-start gap-4 rounded-2xl border border-white bg-white p-5 shadow-sm"
                >
                  <div className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00BFFF]/10">
                    <w.icon size={18} className="text-[#00BFFF]" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#071322] font-cairo">{w.specialty}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400 font-tajawal">{w.benefit}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works (3 steps) ── */}
        <section id="how-it-works" className="bg-white py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="gsap-reveal mb-14 text-center">
              <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#00BFFF] font-cairo">كيف نبدأ</p>
              <h2 className="text-3xl font-black text-[#071322] font-cairo sm:text-4xl">
                ٣ خطوات فقط
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {steps.map((s, i) => (
                <div key={i} className="step-card relative rounded-3xl border border-sky-100 bg-[#F5FAFF] p-7 text-center">
                  <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00BFFF]/10">
                    <s.icon size={24} className="text-[#00BFFF]" />
                  </span>
                  <div className="absolute left-5 top-5 text-[11px] font-black text-slate-300 font-cairo">0{i + 1}</div>
                  <h3 className="mt-2 text-xl font-black text-[#071322] font-cairo">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500 font-tajawal">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Trust ── */}
        <section className="bg-[#F5FAFF] py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="gsap-reveal mb-12 text-center">
              <h2 className="text-3xl font-black text-[#071322] font-cairo sm:text-4xl">
                مبني حسب طريقة عمل عيادتك
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Sparkles, title: 'لا نموذج عام', text: 'ندرس خدماتك وأسئلة عملائك — ونبني حسب طريقة عملك.' },
                { icon: Users, title: 'يدعم الفريق', text: 'يساعد موظف الاستقبال ولا يستبدل جودة التعامل البشري.' },
                { icon: ShieldCheck, title: 'بدون مخاطرة', text: 'نبدأ بتحليل مجاني قبل أي تنفيذ — هدفنا النتيجة أولاً.' },
                { icon: TrendingUp, title: 'قياس من اليوم الأول', text: 'نقيس معك تقليل الحجوزات الضائعة وتحسين سرعة الرد.' },
              ].map((w, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-3xl border border-white bg-white p-6 shadow-sm"
                >
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00BFFF]/10">
                    <w.icon size={22} className="text-[#00BFFF]" />
                  </div>
                  <h3 className="mb-2 text-base font-black text-[#071322] font-cairo">{w.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500 font-tajawal">{w.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="bg-white py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="gsap-reveal mb-14 text-center">
              <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#00BFFF] font-cairo">الباقات</p>
              <h2 className="text-3xl font-black text-[#071322] font-cairo sm:text-4xl">اختر الباقة المناسبة لعيادتك</h2>
              <p className="mt-3 text-slate-500 font-tajawal">تواصل معنا لمعرفة التفاصيل والأسعار المناسبة لحجم عيادتك</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {plans.map((plan, i) => (
                <div
                  key={i}
                  className={`relative rounded-3xl p-7 ${
                    plan.highlight
                      ? 'bg-[#071322] text-white shadow-[0_24px_60px_rgba(0,123,255,0.22)]'
                      : 'border border-sky-100 bg-[#F5FAFF]'
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#00BFFF] px-4 py-1 text-xs font-black text-white font-cairo">
                      الأكثر طلباً
                    </div>
                  )}
                  <div className="mb-3 inline-block rounded-full bg-[#00BFFF]/15 px-3 py-1 text-xs font-black text-[#00BFFF] font-cairo">
                    {plan.badge}
                  </div>
                  <h3 className={`mt-2 text-xl font-black font-cairo ${plan.highlight ? 'text-white' : 'text-[#071322]'}`}>
                    {plan.name}
                  </h3>
                  <ul className="mt-5 grid gap-2.5">
                    {plan.points.map((pt, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm font-tajawal">
                        <Check size={15} className="shrink-0 text-[#00BFFF]" />
                        <span className={plan.highlight ? 'text-slate-200' : 'text-slate-600'}>{pt}</span>
                      </li>
                    ))}
                  </ul>
                  <div className={`mt-5 rounded-2xl p-4 ${plan.highlight ? 'bg-white/8' : 'bg-white'}`}>
                    <p className={`text-xs font-black font-cairo ${plan.highlight ? 'text-[#00BFFF]' : 'text-[#007BFF]'}`}>
                      النتيجة المتوقعة
                    </p>
                    <p className={`mt-1 text-sm font-tajawal ${plan.highlight ? 'text-slate-300' : 'text-slate-600'}`}>
                      {plan.result}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      openWhatsAppChat(`مرحباً، أريد الاستفسار عن باقة ${plan.name} لنظام العيادات.`)
                    }
                    className={`mt-6 w-full rounded-2xl py-3.5 text-sm font-black font-cairo flex items-center justify-center gap-2 ${
                      plan.highlight
                        ? 'bg-[#007BFF] text-white shadow-[0_12px_28px_rgba(0,123,255,0.38)]'
                        : 'bg-white border border-sky-100 text-[#071322]'
                    }`}
                  >
                    {plan.cta}
                    <ChevronLeft size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="bg-[#F5FAFF] py-20">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
            <div className="gsap-reveal mb-12 text-center">
              <h2 className="text-3xl font-black text-[#071322] font-cairo sm:text-4xl">أسئلة شائعة</h2>
            </div>
            <div className="grid gap-3">
              {faq.map((item, i) => (
                <div key={i} className="rounded-2xl border border-white bg-white shadow-sm">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between px-5 py-4 text-right"
                  >
                    <span className="text-sm font-black text-[#071322] font-cairo">{item.q}</span>
                    <ChevronDown
                      size={18}
                      className={`shrink-0 text-slate-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-5 text-sm leading-relaxed text-slate-500 font-tajawal">{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA + Contact ── */}
        <section id="contact" className="bg-[#071322] py-24">
          <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
            <div className="gsap-reveal mb-10 text-center">
              <h2 className="text-3xl font-black text-white font-cairo sm:text-4xl">
                كل عميل ينتظر الرد…<br />
                <span className="text-[#00BFFF]">قد يحجز عند عيادة ثانية.</span>
              </h2>
              <p className="mt-4 text-slate-400 font-tajawal leading-relaxed">
                دعنا نحلل رحلة الحجز في عيادتك ونوضح أين تضيع الفرص — وكيف يمكن لموظف AI أن يساعدك في استرجاعها.
              </p>
            </div>

            {done ? (
              <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-10 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                  <Check size={28} className="text-emerald-400" />
                </div>
                <p className="text-lg font-black text-emerald-400 font-cairo">تم! سنتواصل معك قريباً</p>
                <p className="mt-2 text-sm text-slate-400 font-tajawal">أو تواصل مباشرة عبر واتساب</p>
                <button
                  onClick={() => openWhatsAppChat('مرحباً، أريد تحليلاً مجانياً لحجوزات عيادتي.')}
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#25D366] px-6 py-3 text-sm font-black text-white font-cairo"
                >
                  <MessageCircle size={16} />
                  واتساب مباشر
                </button>
              </div>
            ) : (
              <form onSubmit={submitLead} className="rounded-3xl border border-white/10 bg-white/5 p-7">
                <div className="grid gap-4">
                  {[
                    { key: 'name', placeholder: 'اسمك الكريم *', type: 'text' },
                    { key: 'phone', placeholder: 'رقم الجوال *', type: 'tel' },
                    { key: 'clinicName', placeholder: 'اسم العيادة', type: 'text' },
                    { key: 'city', placeholder: 'المدينة', type: 'text' },
                  ].map(({ key, placeholder, type }) => (
                    <input
                      key={key}
                      type={type}
                      placeholder={placeholder}
                      value={lead[key as keyof typeof lead]}
                      onChange={(e) => setLead((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-white/8 px-4 py-3.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#00BFFF] font-tajawal"
                    />
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="mt-5 w-full rounded-2xl bg-[#007BFF] py-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(0,123,255,0.38)] disabled:opacity-60 font-cairo"
                >
                  {sending ? 'جارٍ الإرسال...' : 'احصل على تحليل مجاني لحجوزات عيادتك'}
                </button>
                {formError && <p className="mt-3 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400 font-tajawal">{formError}</p>}
                <p className="mt-3 text-center text-xs text-slate-500 font-tajawal">
                  أو تواصل مباشرة على{' '}
                  <button
                    type="button"
                    onClick={() => openWhatsAppChat('مرحباً، أريد تحليلاً مجانياً لحجوزات عيادتي.')}
                    className="font-black text-[#25D366]"
                  >
                    واتساب
                  </button>
                </p>
              </form>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 bg-[#050810] py-10">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-black text-white font-cairo">
            Madar <span className="text-[#00BFFF]">OS</span> — نظام تشغيل ذكي للعيادات
          </p>
          <p className="mt-2 text-xs text-slate-500 font-tajawal">
            جميع الحقوق محفوظة © {new Date().getFullYear()} مدار
          </p>
          <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-500 font-tajawal">
            <a href="/privacy" className="hover:text-slate-300">سياسة الخصوصية</a>
            <a href="/terms" className="hover:text-slate-300">الشروط والأحكام</a>
            <button onClick={() => openWhatsAppChat('مرحباً')} className="hover:text-slate-300">واتساب</button>
          </div>
        </div>
      </footer>
    </div>
  )
}
