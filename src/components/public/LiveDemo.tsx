import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { Bot, Calendar, Send, CheckCheck, Star, Sparkles } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

/* ── Chat Demo ──────────────────────────────────────── */
type Msg = { id: number; from: 'user' | 'ai'; text: string; time: string }

const chatScriptAr: Msg[] = [
  { id: 1, from: 'user', text: 'السلام عليكم، عندي عيادة وتجينا رسائل واتصالات كثيرة', time: '10:41' },
  { id: 2, from: 'ai',   text: 'وعليكم السلام! ممتاز. أقدر أساعدك بنظام يرد على المرضى في واتساب والمكالمات، يحدد الخدمة المطلوبة، ويحجز الموعد تلقائياً.\n\nكم متوسط التواصل اليومي تقريباً؟', time: '10:41' },
  { id: 3, from: 'user', text: 'تقريباً 40 إلى 60 تواصل يومياً وأغلبها عن المواعيد والأسعار', time: '10:42' },
  { id: 4, from: 'ai',   text: 'واضح عندك فرصة نمو قوية.\n\nالنظام المقترح:\n✅ رد فوري على الأسعار والخدمات\n✅ حجز تلقائي 24/7\n✅ تذكير قبل الموعد\n✅ متابعة المريض بعد الزيارة\n\nأرسل لك خريطة نمو مبدئية؟', time: '10:42' },
  { id: 5, from: 'user', text: 'نعم، متى تقدرون؟', time: '10:43' },
  { id: 6, from: 'ai',   text: 'أرسلت لك رابط مكالمة قصيرة. نطلع منها بتشخيص واضح: أين تضيع الحجوزات، وما أول مسار نؤتمته.', time: '10:43' },
]

const chatScriptEn: Msg[] = [
  { id: 1, from: 'user', text: 'Hi, I run a clinic and we get many WhatsApp messages and calls', time: '10:41' },
  { id: 2, from: 'ai',   text: 'Great. We can help with a system that answers patients on WhatsApp and phone calls, identifies the service they need, and books appointments automatically.\n\nHow many daily interactions do you get?', time: '10:41' },
  { id: 3, from: 'user', text: 'Around 40 to 60 daily, mostly about appointments and prices', time: '10:42' },
  { id: 4, from: 'ai',   text: 'That is a strong growth opportunity.\n\nRecommended system:\n✅ Instant price and service replies\n✅ 24/7 automatic booking\n✅ Appointment reminders\n✅ Post-visit follow-up\n\nWant a first growth map?', time: '10:42' },
  { id: 5, from: 'user', text: 'Yes, when can we talk?', time: '10:43' },
  { id: 6, from: 'ai',   text: 'I sent a short-call link. You will leave with a clear diagnosis: where bookings leak and what flow to automate first.', time: '10:43' },
]

const ChatDemo = ({ started }: { started: boolean }) => {
  const { language } = useLanguage()
  const [visibleCount, setVisibleCount] = useState(0)
  const [typing, setTyping] = useState(false)
  const script = language === 'ar' ? chatScriptAr : chatScriptEn
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!started) return
    setVisibleCount(0)
    setTyping(false)
    let count = 0
    const timers: ReturnType<typeof setTimeout>[] = []

    const showNext = () => {
      if (count >= script.length) return
      const msg = script[count]
      if (msg.from === 'ai') {
        setTyping(true)
        const t1 = setTimeout(() => {
          setTyping(false)
          setVisibleCount(c => c + 1)
          count++
          const t2 = setTimeout(showNext, 1200)
          timers.push(t2)
        }, 1500)
        timers.push(t1)
      } else {
        setVisibleCount(c => c + 1)
        count++
        const t = setTimeout(showNext, 800)
        timers.push(t)
      }
    }

    const init = setTimeout(showNext, 600)
    timers.push(init)
    return () => timers.forEach(clearTimeout)
  }, [language, started])

  // Scroll only inside the chat container — never the whole page
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [visibleCount, typing])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4F6EF7, #7C3AED)' }}>
          <Bot size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white font-work">MADAR AI Agent</p>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <p className="text-[10px] text-slate-400 font-work">Online · Responds instantly</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
        <AnimatePresence mode="popLayout">
          {script.slice(0, visibleCount).map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className={`flex gap-2 ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.from === 'ai' && (
                <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-1" style={{ background: 'linear-gradient(135deg, #4F6EF7, #7C3AED)' }}>
                  <Bot size={11} className="text-white" />
                </div>
              )}
              <div className="max-w-[80%]">
                <div
                  className="px-3 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap"
                  style={msg.from === 'ai'
                    ? { background: 'rgba(255,255,255,0.07)', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.08)' }
                    : { background: 'linear-gradient(135deg, #4F6EF7, #7C3AED)', color: 'white' }
                  }
                >
                  {msg.text}
                </div>
                <div className={`flex items-center gap-1 mt-0.5 ${msg.from === 'user' ? 'justify-end' : ''}`}>
                  <span className="text-[9px] text-slate-600 font-work">{msg.time}</span>
                  {msg.from === 'ai' && <CheckCheck size={9} className="text-primary-400" />}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {typing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4F6EF7, #7C3AED)' }}>
              <Bot size={11} className="text-white" />
            </div>
            <div className="px-3 py-2 rounded-2xl flex items-center gap-1" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {[0, 1, 2].map(i => (
                <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.18 }} />
              ))}
            </div>
          </motion.div>
        )}
        <div />
      </div>

      {/* Input */}
      <div className="p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="flex-1 text-xs text-slate-600 font-work">Ask anything...</span>
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4F6EF7, #7C3AED)' }}>
            <Send size={10} className="text-white" />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Booking Demo ────────────────────────────────────── */
const BookingDemo = () => {
  const { t, language } = useLanguage()
  const [selected, setSelected] = useState<number | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const days = ['Mon 19', 'Tue 20', 'Wed 21', 'Thu 22', 'Sun 25']
  const times = ['09:00', '10:30', '11:00', '14:00', '15:30', '16:00']

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}>
          <Calendar size={15} className="text-white" />
        </div>
        <div>
          <p className={`text-sm font-bold text-white ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}>
            {t('حجز موعد تلقائي', 'Auto Appointment Booking')}
          </p>
          <p className={`text-[10px] text-slate-500 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
            {t('اختر الوقت المناسب لك', 'Choose your preferred time')}
          </p>
        </div>
      </div>

      {!confirmed ? (
        <>
          <div>
            <p className={`text-[11px] text-slate-500 mb-2 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
              {t('الأسبوع القادم', 'Next Week')}
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {days.map((d, i) => (
                <button key={i} className={`px-3 py-1.5 rounded-lg text-xs font-work transition-all cursor-pointer ${selected !== null && Math.floor(selected / 6) === i ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                  style={{ background: selected !== null && Math.floor(selected / 6) === i ? 'linear-gradient(135deg, #7C3AED, #EC4899)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className={`text-[11px] text-slate-500 mb-2 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
              {t('الأوقات المتاحة', 'Available Times')}
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {times.map((time, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelected(i)}
                  className={`py-2 rounded-lg text-xs font-work text-center transition-all cursor-pointer ${selected === i ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                  style={{
                    background: selected === i ? 'linear-gradient(135deg, #7C3AED, #EC4899)' : 'rgba(255,255,255,0.05)',
                    border: selected === i ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: selected === i ? '0 0 15px rgba(139,92,246,0.3)' : 'none',
                  }}
                >
                  {time}
                </motion.button>
              ))}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => selected !== null && setConfirmed(true)}
            disabled={selected === null}
            className="w-full py-3 rounded-xl text-white text-sm font-semibold font-work cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)', boxShadow: selected !== null ? '0 0 20px rgba(139,92,246,0.35)' : 'none' }}
          >
            {t('تأكيد الحجز', 'Confirm Booking')}
          </motion.button>
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3 py-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #10B981, #06B6D4)' }}
          >
            <Star size={24} className="text-white fill-white" />
          </motion.div>
          <p className={`text-base font-bold text-white ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}>
            {t('تم الحجز! 🎉', 'Booked! 🎉')}
          </p>
          <p className={`text-xs text-slate-400 text-center ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
            {t('ستصلك رسالة تأكيد على واتساب الآن', 'You\'ll receive a WhatsApp confirmation now')}
          </p>
          <div className="flex items-center gap-2 text-green-400">
            <CheckCheck size={14} />
            <span className="text-xs font-work">{t('تم الإرسال', 'Sent')}</span>
          </div>
          <button onClick={() => { setConfirmed(false); setSelected(null) }}
            className="text-[11px] text-slate-600 hover:text-slate-400 font-work cursor-pointer mt-1">
            {t('حجز موعد آخر', 'Book another')}
          </button>
        </motion.div>
      )}
    </div>
  )
}

/* ── Main LiveDemo ────────────────────────────────────── */
const tabs = [
  { id: 'chat', icon: Bot, ar: 'وكيل AI', en: 'AI Agent' },
  { id: 'booking', icon: Calendar, ar: 'حجز ذكي', en: 'Smart Booking' },
]

export const LiveDemo = () => {
  const { t, language } = useLanguage()
  const [activeTab, setActiveTab] = useState('chat')
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="demo" ref={ref} className="relative py-28 overflow-hidden" style={{ background: 'linear-gradient(180deg, #080E26 0%, #0D1B3E 100%)' }}>
      <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.4), transparent)' }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0,191,255,0.07) 0%, transparent 70%)' }} />
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(rgba(0,191,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,191,255,0.3) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7 }} className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4" style={{ background: 'rgba(0,191,255,0.1)', border: '1px solid rgba(0,191,255,0.25)' }}>
            <Sparkles size={12} style={{ color: '#00BFFF' }} />
            <span className={`text-xs font-medium ${language === 'ar' ? 'font-cairo' : 'font-work'}`} style={{ color: '#7DD3FC' }}>
            {t('شاهد النتيجة', 'See the Outcome')}
            </span>
          </div>
          <h2 className={`text-4xl sm:text-5xl font-bold text-white mb-4 ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}>
            {t(<>من رسالة أو مكالمة<br /><span className="gradient-text-blue">إلى حجز مؤكد</span></>, <>From a Message or Call<br /><span className="gradient-text-blue">To a Confirmed Booking</span></>)}
          </h2>
          <p className={`text-slate-400 text-lg max-w-xl mx-auto ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
            {t('هذا هو الفرق بين بوت يرد ونظام يعرف كيف يحوّل العميل للخطوة التالية', 'This is the difference between a bot that replies and a system that moves customers to the next step')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="max-w-lg mx-auto"
        >
          {/* Tab switcher */}
          <div className="flex items-center gap-2 p-1.5 rounded-xl mb-4 w-fit mx-auto" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
                  style={{ color: activeTab === tab.id ? 'white' : 'rgba(148,163,184,0.7)' }}
                >
                  {activeTab === tab.id && (
                    <motion.div layoutId="tab-bg" className="absolute inset-0 rounded-lg"
                      style={{ background: 'linear-gradient(135deg, rgba(79,110,247,0.3), rgba(139,92,246,0.2))', border: '1px solid rgba(79,110,247,0.25)' }}
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />
                  )}
                  <Icon size={14} className="relative z-10" />
                  <span className="relative z-10">{language === 'ar' ? tab.ar : tab.en}</span>
                </button>
              )
            })}
          </div>

          {/* Demo window */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 0 60px rgba(79,110,247,0.12)', height: 440 }}>
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              {['#EF4444', '#F59E0B', '#10B981'].map(c => (
                <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c, opacity: 0.6 }} />
              ))}
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 rounded-md text-[10px] text-slate-600 font-work" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  madar.software
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="h-[calc(100%-42px)]">
                {activeTab === 'chat'    && <ChatDemo started={inView} />}
                {activeTab === 'booking' && <BookingDemo />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Note */}
          <p className={`text-center text-xs text-slate-600 mt-4 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
            {t('نفس المنطق يتخصص لقطاعك ورسائلك ومكالماتك وخدماتك', 'The same logic adapts to your industry, messages, calls, and services')}
          </p>
        </motion.div>
      </div>
    </section>
  )
}
