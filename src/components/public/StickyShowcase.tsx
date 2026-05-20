import { useRef, useState } from 'react'
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion'
import { MessageSquare, Calendar, TrendingUp, Users, Bot, Check, Send, BarChart2 } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { openWhatsAppChat } from '../../lib/whatsapp'

const features = [
  {
    num: '01', icon: MessageSquare, color: '#00BFFF', bg: 'rgba(0,191,255,0.1)',
    tag: { ar: 'رد ذكي', en: 'Smart Reply' },
    title: { ar: 'كل رسالة أو مكالمة تتحول لخطوة بيع', en: 'Every Message or Call Becomes a Sales Step' },
    desc: { ar: 'النظام يرد فوراً، يفهم نية العميل في الرسالة أو الاتصال، ويسأله السؤال التالي الصحيح بدل ردود عامة لا تبيع.', en: 'The system replies instantly, understands intent in messages or calls, and asks the right next question instead of generic replies that do not sell.' },
    checks: {
      ar: ['رد خلال 0.8 ثانية في المتوسط', 'تأهيل العميل من أول تواصل', 'توجيه واضح للحجز أو العرض'],
      en: ['0.8s average response time', 'Qualifies customers from first contact', 'Clear path to booking or quote'],
    },
    stat: { val: '0.8s', label: { ar: 'متوسط الرد', en: 'Avg response' } },
  },
  {
    num: '02', icon: Calendar, color: '#4A9EFF', bg: 'rgba(74,158,255,0.1)',
    tag: { ar: 'حجز تلقائي', en: 'Auto Booking' },
    title: { ar: 'الحجز يتم قبل ما يتدخل موظفك', en: 'Booking Happens Before Staff Step In' },
    desc: { ar: 'العميل يختار الوقت المناسب، والنظام يؤكد الموعد ويرسل التذكيرات ويقلل الغياب.', en: 'Customers choose a time, then the system confirms, reminds, and reduces no-shows.' },
    checks: {
      ar: ['حجز 24/7 بدون انقطاع', 'تذكير تلقائي قبل الموعد', 'تقليل الغياب بنسبة 80%'],
      en: ['24/7 uninterrupted booking', 'Auto reminder before each appointment', '80% no-show reduction'],
    },
    stat: { val: '80%', label: { ar: 'تقليل الغياب', en: 'No-show reduction' } },
  },
  {
    num: '03', icon: TrendingUp, color: '#00BFFF', bg: 'rgba(0,191,255,0.1)',
    tag: { ar: 'تحليلات حية', en: 'Live Analytics' },
    title: { ar: 'تعرف أين تزيد الإيراد', en: 'Know Where Revenue Can Grow' },
    desc: { ar: 'لوحة توضح الرسائل، المكالمات، الحجوزات، التحويل، والخدمات الأقوى حتى تقرر بناءً على بيانات لا إحساس.', en: 'A dashboard shows messages, calls, bookings, conversion, and top services so decisions come from data, not instinct.' },
    checks: {
      ar: ['إحصاءات حية في الوقت الفعلي', 'تقارير أسبوعية تلقائية', 'نمو 172% في الإيرادات'],
      en: ['Real-time live statistics', 'Automatic weekly reports', '172% revenue growth tracked'],
    },
    stat: { val: '+172%', label: { ar: 'نمو الإيرادات', en: 'Revenue growth' } },
  },
  {
    num: '04', icon: Users, color: '#4A9EFF', bg: 'rgba(74,158,255,0.1)',
    tag: { ar: 'متابعة مبيعات', en: 'Sales Follow-up' },
    title: { ar: 'المهتم لا يبرد بعد أول رسالة', en: 'Interested Leads Do Not Go Cold' },
    desc: { ar: 'النظام يتابع كل مهتم برسائل مناسبة، عروض مخصصة، وتذكيرات ذكية حتى يعود للحجز أو الشراء.', en: 'The system follows up with interested leads using relevant messages, tailored offers, and smart reminders until they book or buy.' },
    checks: {
      ar: ['متابعة تلقائية بعد كل تفاعل', 'عروض مخصصة لكل عميل', 'معدل إغلاق 42%'],
      en: ['Auto follow-up after every interaction', 'Personalized offers per lead', '42% close rate achieved'],
    },
    stat: { val: '42%', label: { ar: 'معدل الإغلاق', en: 'Close rate' } },
  },
]

const ChatView = () => {
  const msgs = [
    { from: 'user', text: 'كم سعر الخدمة؟' },
    { from: 'ai', text: 'أهلاً! السعر يبدأ من 2,500 ريال/شهر. هل تريد تفاصيل؟' },
    { from: 'user', text: 'نعم، ما الذي يشمله؟' },
    { from: 'ai', text: 'يشمل: ردود تلقائية 24/7، حجز مواعيد، وتقارير أسبوعية. هل تريد عرضاً مجانياً؟' },
    { from: 'user', text: 'نعم أريد العرض' },
    { from: 'ai', text: '✅ تم الحجز! جلستك الثلاثاء 14 مايو 10:00ص. سأرسل التأكيد على واتساب.', success: true },
  ]
  return (
    <div className="flex flex-col h-full" dir="rtl">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#0D1B3E,#0099CC)' }}>
          <Bot size={14} className="text-white" />
        </div>
        <div>
          <div className="text-white text-xs font-bold font-cairo">MADAR AI Agent</div>
          <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-400" /><span className="text-[10px] font-work" style={{ color: 'rgba(255,255,255,0.4)' }}>مباشر الآن</span></div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden px-3 py-3 flex flex-col gap-2 justify-end">
        {msgs.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12, duration: 0.35 }}
            className={`flex ${m.from === 'user' ? 'justify-start' : 'justify-end'}`}>
            <div className="max-w-[78%] px-3 py-2 rounded-2xl text-[11px] font-tajawal leading-relaxed"
              style={{ background: m.from === 'ai' ? (m.success ? 'rgba(34,197,94,0.12)' : 'rgba(0,191,255,0.1)') : 'rgba(255,255,255,0.06)', border: `1px solid ${m.from === 'ai' ? (m.success ? 'rgba(34,197,94,0.22)' : 'rgba(0,191,255,0.18)') : 'rgba(255,255,255,0.08)'}`, color: m.success ? '#22C55E' : 'rgba(255,255,255,0.85)' }}>
              {m.text}
            </div>
          </motion.div>
        ))}
        <motion.div className="flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}>
          <div className="px-3 py-2 rounded-2xl flex items-center gap-1" style={{ background: 'rgba(0,191,255,0.07)', border: '1px solid rgba(0,191,255,0.14)' }}>
            {[0, 1, 2].map(i => (<motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: '#00BFFF' }} animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.22 }} />))}
          </div>
        </motion.div>
      </div>
      <div className="px-3 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <span className="flex-1 text-[10px] font-tajawal" style={{ color: 'rgba(255,255,255,0.2)' }}>اكتب رسالة...</span>
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0D1B3E,#0099CC)' }}><Send size={10} className="text-white" /></div>
        </div>
      </div>
    </div>
  )
}

const CalendarView = () => {
  const days = ['أح', 'اث', 'ثل', 'أر', 'خم', 'جم', 'سب']
  const bookings = [
    { day: 2, name: 'أحمد المالكي', time: '9:00', color: '#00BFFF' },
    { day: 4, name: 'سارة العمري', time: '10:30', color: '#4A9EFF' },
    { day: 5, name: 'خالد الدوسري', time: '14:00', color: '#00BFFF' },
    { day: 7, name: 'منيرة السبيعي', time: '11:00', color: '#4A9EFF' },
    { day: 9, name: 'فهد الشمري', time: '15:30', color: '#00BFFF' },
    { day: 11, name: 'ريم القحطاني', time: '9:30', color: '#4A9EFF' },
  ]
  const calDays = Array.from({ length: 14 }, (_, i) => i + 1)
  return (
    <div className="flex flex-col h-full" dir="rtl">
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <span className="text-white text-xs font-bold font-cairo">مايو ٢٠٢٦</span>
        <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /><span className="text-[10px] font-cairo" style={{ color: '#00BFFF' }}>٦ حجوزات هذا الأسبوع</span></div>
      </div>
      <div className="grid grid-cols-7 px-3 pt-2.5 pb-1">
        {days.map(d => (<div key={d} className="text-center text-[9px] font-cairo" style={{ color: 'rgba(255,255,255,0.3)' }}>{d}</div>))}
      </div>
      <div className="grid grid-cols-7 gap-1 px-3 pb-2">
        {calDays.map(d => {
          const b = bookings.find(b => b.day === d)
          const isToday = d === 17
          return (
            <motion.div key={d} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: d * 0.025 }}
              className="aspect-square flex items-center justify-center rounded-lg text-[10px] font-cairo relative"
              style={{ background: b ? b.color + '1A' : isToday ? 'rgba(0,191,255,0.14)' : 'rgba(255,255,255,0.02)', border: isToday ? '1px solid rgba(0,191,255,0.4)' : b ? `1px solid ${b.color}33` : '1px solid transparent', color: b ? b.color : isToday ? '#00BFFF' : 'rgba(255,255,255,0.55)' }}>
              {d}
              {b && <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: b.color }} />}
            </motion.div>
          )
        })}
      </div>
      <div className="flex-1 overflow-hidden px-3 pb-2">
        <div className="text-[9px] font-cairo mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>الحجوزات القادمة</div>
        <div className="flex flex-col gap-1.5">
          {bookings.slice(0, 4).map((b, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.08 }}
              className="flex items-center gap-2 px-2.5 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${b.color}1A` }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold font-cairo" style={{ background: b.color + '22', color: b.color }}>{b.day}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[9px] font-cairo text-white truncate">{b.name}</div>
                <div className="text-[8px] font-work" style={{ color: 'rgba(255,255,255,0.35)' }}>{b.time}</div>
              </div>
              <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.12)' }}><Check size={8} style={{ color: '#22C55E' }} /></div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

const AnalyticsView = () => {
  const bars = [35, 55, 42, 70, 58, 85, 65, 90, 75, 95, 80, 100]
  const months = ['ي', 'ف', 'م', 'أ', 'م', 'ي', 'ي', 'أ', 'س', 'أ', 'ن', 'د']
  const stats = [
    { label: 'المحادثات', value: '١٢,٤٨٠', delta: '+٢٣٪', color: '#00BFFF' },
    { label: 'التحويل', value: '٧٨٪', delta: '+١٢٪', color: '#4A9EFF' },
    { label: 'الإيرادات', value: '٨.٧م', delta: '+١٧٢٪', color: '#00BFFF' },
    { label: 'وقت الرد', value: '٠.٨ث', delta: '-٨٥٪', color: '#4A9EFF' },
  ]
  return (
    <div className="flex flex-col h-full p-3" dir="rtl">
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {stats.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="px-2.5 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="text-[9px] font-cairo mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</div>
            <div className="flex items-end gap-1.5">
              <div className="text-sm font-bold font-cairo" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[9px] font-work mb-0.5" style={{ color: '#22C55E' }}>{s.delta}</div>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="flex-1 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[9px] font-bold font-cairo text-white">نمو المحادثات</span>
          <span className="text-[9px] font-work" style={{ color: '#00BFFF' }}>+١٧٢٪</span>
        </div>
        <div className="flex items-end gap-1 pb-1" style={{ height: 80 }}>
          {bars.map((h, i) => (
            <motion.div key={i} className="flex-1 rounded-sm" initial={{ height: 0 }} animate={{ height: `${h}%` }}
              transition={{ duration: 0.55, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              style={{ background: h >= 80 ? 'linear-gradient(to top,#0099CC,#00BFFF)' : 'rgba(0,153,204,0.28)', alignSelf: 'flex-end' }} />
          ))}
        </div>
        <div className="flex gap-1 mt-1">
          {months.map((m, i) => (<div key={i} className="flex-1 text-center text-[7px] font-cairo" style={{ color: 'rgba(255,255,255,0.18)' }}>{m}</div>))}
        </div>
      </div>
    </div>
  )
}

const CRMView = () => {
  const leads = [
    { name: 'أحمد المالكي', stage: 'مؤهَّل', value: '٢٨ألف', color: '#00BFFF', pct: 35 },
    { name: 'سارة العمري', stage: 'عرض أُرسل', value: '١٥ألف', color: '#4A9EFF', pct: 60 },
    { name: 'خالد الدوسري', stage: 'متابعة', value: '٤٢ألف', color: '#00BFFF', pct: 75 },
    { name: 'منيرة السبيعي', stage: 'مُغلق ✓', value: '٣٥ألف', color: '#22C55E', pct: 100 },
    { name: 'فهد الشمري', stage: 'جديد', value: '٢٠ألف', color: '#4A9EFF', pct: 15 },
  ]
  return (
    <div className="flex flex-col h-full" dir="rtl">
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <span className="text-white text-xs font-bold font-cairo">خط المبيعات</span>
        <div className="px-2.5 py-0.5 rounded-full text-[9px] font-work" style={{ background: 'rgba(0,191,255,0.1)', color: '#00BFFF', border: '1px solid rgba(0,191,255,0.2)' }}>١٤٠ألف إجمالي</div>
      </div>
      <div className="flex-1 px-3 py-3 flex flex-col gap-2 overflow-hidden">
        {leads.map((l, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.09, duration: 0.38 }}
            className="flex flex-col gap-1.5 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold font-cairo text-white flex-shrink-0" style={{ background: l.color + '28', border: `1px solid ${l.color}44` }}>{l.name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-cairo text-white">{l.name}</div>
                <div className="text-[8px] font-work" style={{ color: 'rgba(255,255,255,0.35)' }}>{l.stage}</div>
              </div>
              <span className="text-[9px] font-work font-semibold" style={{ color: l.color }}>{l.value}</span>
            </div>
            <div className="w-full h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${l.pct}%` }} transition={{ delay: 0.2 + i * 0.09, duration: 0.55, ease: [0.22, 1, 0.36, 1] }} style={{ background: l.color }} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

const ViewComponents = [ChatView, CalendarView, AnalyticsView, CRMView]

const Dashboard = ({ activeIdx }: { activeIdx: number }) => {
  const CurrentView = ViewComponents[activeIdx]
  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden" style={{ background: '#07111F', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 0 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex gap-1.5">
          {['#FF5F57', '#FEBC2E', '#28C840'].map(c => <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />)}
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-4 py-0.5 rounded text-[9px] font-work" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.3)' }}>app.madar.software</div>
        </div>
        <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /><span className="text-[9px] font-work" style={{ color: '#22C55E' }}>Live</span></div>
      </div>
      <div style={{ height: 'calc(100% - 44px)' }}>
        <AnimatePresence mode="wait">
          <motion.div key={activeIdx} className="h-full" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
            <CurrentView />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

export const StickyShowcase = () => {
  const { language, t } = useLanguage()
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] })
  const [activeIdx, setActiveIdx] = useState(0)

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const idx = Math.min(Math.floor(v * features.length), features.length - 1)
    setActiveIdx(prev => prev !== idx ? idx : prev)
  })

  return (
    <section style={{ background: '#050810' }}>
      {/* Section header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-6">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5" style={{ background: 'rgba(0,191,255,0.08)', border: '1px solid rgba(0,191,255,0.2)' }}>
            <BarChart2 size={12} style={{ color: '#00BFFF' }} />
            <span className={`text-xs font-medium ${language === 'ar' ? 'font-cairo' : 'font-work'}`} style={{ color: '#00BFFF' }}>
            {t('محرك التحويل', 'Conversion Engine')}
            </span>
          </div>
          <h2 className={`text-4xl sm:text-5xl font-bold mb-4 ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: 'white' }}>
            {t(
              <><span style={{ background: 'linear-gradient(135deg,#00BFFF,#0099CC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>نظام واحد</span> يقوم بكل شيء</>,
              <>One System That Does <span style={{ background: 'linear-gradient(135deg,#00BFFF,#0099CC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Everything</span></>
            )}
          </h2>
          <p className={`hidden lg:block text-lg max-w-lg mx-auto ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.5)' }}>
            {t('مرر للأسفل لترى كيف تتحول الرسائل والمكالمات إلى مسار مبيعات', 'Scroll down to see how messages and calls turn into a sales flow')}
          </p>
          <p className={`lg:hidden text-base max-w-lg mx-auto ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.5)' }}>
            {t('٤ أجزاء تعمل معاً لتحويل التواصل إلى حجوزات', '4 parts working together to turn contact into bookings')}
          </p>
        </motion.div>
      </div>

      {/* Sticky scroll area — desktop only */}
      <div ref={containerRef} className="hidden lg:block" style={{ height: `${features.length * 80}vh` }}>
        <div className="sticky flex items-center overflow-hidden" style={{ top: 72, height: 'calc(100vh - 72px)' }}>
          {/* Ambient glow based on active feature */}
          <div className="absolute inset-0 pointer-events-none transition-all duration-700"
            style={{ background: `radial-gradient(ellipse 60% 50% at 70% 50%, ${features[activeIdx].color}08 0%, transparent 70%)` }} />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="flex items-center gap-12 xl:gap-20" dir="ltr">

              {/* Left: Feature content */}
              <div className="flex-1 min-w-0">
                {/* Progress dots */}
                <div className={`flex items-center gap-2 mb-8 ${language === 'ar' ? 'justify-end' : 'justify-start'}`}>
                  {features.map((_, i) => (
                    <motion.div key={i} animate={{ width: i === activeIdx ? 28 : 6 }} transition={{ duration: 0.3 }}
                      className="h-1.5 rounded-full" style={{ background: i === activeIdx ? '#00BFFF' : 'rgba(255,255,255,0.15)' }} />
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div key={activeIdx} initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -28 }}
                    transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                    className={language === 'ar' ? 'text-right' : 'text-left'}>
                    {(() => {
                      const f = features[activeIdx]
                      const Icon = f.icon
                      const checks = language === 'ar' ? f.checks.ar : f.checks.en
                      return (
                        <>
                          <div className={`flex items-center gap-3 mb-6 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                              style={{ background: f.bg, border: `1px solid ${f.color}30` }}>
                              <Icon size={22} style={{ color: f.color }} />
                            </div>
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
                              style={{ background: f.bg, color: f.color, border: `1px solid ${f.color}30` }}>
                              {f.num} — {language === 'ar' ? f.tag.ar : f.tag.en}
                            </span>
                          </div>

                          <h3 className={`text-3xl sm:text-4xl font-bold mb-4 leading-tight ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: 'white' }}>
                            {language === 'ar' ? f.title.ar : f.title.en}
                          </h3>

                          <p className={`text-base sm:text-lg mb-8 leading-relaxed max-w-md ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.52)' }}>
                            {language === 'ar' ? f.desc.ar : f.desc.en}
                          </p>

                          <div className="flex flex-col gap-3 mb-8">
                            {checks.map((check, ci) => (
                              <motion.div key={ci} initial={{ opacity: 0, x: language === 'ar' ? 14 : -14 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.18 + ci * 0.1 }}
                                className={`flex items-center gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{ background: f.bg, border: `1px solid ${f.color}30` }}>
                                  <Check size={10} style={{ color: f.color }} />
                                </div>
                                <span className={`text-sm ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.68)' }}>
                                  {check}
                                </span>
                              </motion.div>
                            ))}
                          </div>

                          <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl"
                              style={{ background: f.bg, border: `1px solid ${f.color}30` }}>
                              <span className={`text-2xl font-bold ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: f.color }}>{f.stat.val}</span>
                              <span className={`text-sm ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.45)' }}>
                                {language === 'ar' ? f.stat.label.ar : f.stat.label.en}
                              </span>
                            </div>
                            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                              onClick={() => openWhatsAppChat()}
                              className={`px-5 py-3 rounded-2xl text-sm font-semibold text-white cursor-pointer ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
                              style={{ background: 'linear-gradient(135deg,#0D1B3E,#0099CC)', boxShadow: '0 0 20px rgba(0,153,204,0.25)' }}>
                              {t('احصل على خريطة نمو', 'Get a Growth Map')}
                            </motion.button>
                          </div>
                        </>
                      )
                    })()}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Right: Dashboard */}
              <div className="w-[440px] xl:w-[500px] flex-shrink-0 hidden lg:block" style={{ height: 520 }}>
                <motion.div className="w-full h-full" initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  style={{ filter: `drop-shadow(0 30px 80px ${features[activeIdx].color}18)` }}>
                  <Dashboard activeIdx={activeIdx} />
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: stacked cards */}
      <div className="lg:hidden max-w-7xl mx-auto px-4 pb-16">
        {features.map((f, i) => {
          const Icon = f.icon
          const checks = language === 'ar' ? f.checks.ar : f.checks.en
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
              className="mb-6 p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${f.color}22` }}>
              <div className={`flex items-center gap-3 mb-4 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: f.bg }}><Icon size={18} style={{ color: f.color }} /></div>
                <span className={`text-xs font-semibold ${language === 'ar' ? 'font-cairo' : 'font-work'}`} style={{ color: f.color }}>{f.num} — {language === 'ar' ? f.tag.ar : f.tag.en}</span>
              </div>
              <h3 className={`text-xl font-bold mb-2 ${language === 'ar' ? 'font-cairo text-right' : 'font-sora'}`} style={{ color: 'white' }}>{language === 'ar' ? f.title.ar : f.title.en}</h3>
              <p className={`text-sm mb-4 leading-relaxed ${language === 'ar' ? 'font-tajawal text-right' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.5)' }}>{language === 'ar' ? f.desc.ar : f.desc.en}</p>
              {checks.map((c, ci) => (
                <div key={ci} className={`flex items-center gap-2 mb-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: f.bg }}><Check size={8} style={{ color: f.color }} /></div>
                  <span className={`text-xs ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.6)' }}>{c}</span>
                </div>
              ))}
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
