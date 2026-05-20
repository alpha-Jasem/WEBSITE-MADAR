import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { Clock, DollarSign, UserX, RefreshCw, BarChart2, ArrowRight } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

const problems = [
  {
    icon: Clock,
    color: '#EF4444',
    glowColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.2)',
    ar: { title: 'كل تأخير يسرّب عميل', desc: 'العميل الذي لا يجد رد سريع في واتساب أو الاتصال غالباً ينتقل لمنافسك قبل أن ينتظر موظفك.' },
    en: { title: 'Every Delay Leaks Revenue', desc: 'A customer who does not get a fast WhatsApp or call response often moves to your competitor before your team responds.' },
  },
  {
    icon: DollarSign,
    color: '#F59E0B',
    glowColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.2)',
    ar: { title: 'فريقك عالق في التكرار', desc: 'وقت الموظفين يضيع في أسئلة متكررة وتأكيدات ومتابعات بدل إغلاق فرص أعلى قيمة.' },
    en: { title: 'Your Team Is Stuck Repeating', desc: 'Staff time disappears into repeated questions, confirmations, and follow-ups instead of closing higher-value opportunities.' },
  },
  {
    icon: UserX,
    color: '#8B5CF6',
    glowColor: 'rgba(139,92,246,0.12)',
    borderColor: 'rgba(139,92,246,0.2)',
    ar: { title: 'رسائل ومكالمات خارج الدوام', desc: 'أكثر العملاء جدية يتواصلون في وقتهم هم، وليس وقت دوامك. النظام لازم يرد ويحجز حتى وأنت مغلق.' },
    en: { title: 'After-Hours Messages and Calls', desc: 'Serious buyers contact you on their schedule, not yours. Your system should answer and book even when the office is closed.' },
  },
  {
    icon: RefreshCw,
    color: '#06B6D4',
    glowColor: 'rgba(6,182,212,0.12)',
    borderColor: 'rgba(6,182,212,0.2)',
    ar: { title: 'متابعة ضعيفة بعد أول رسالة', desc: 'العميل المهتم يحتاج تذكير، عرض، وسؤال ذكي. بدون متابعة منظمة تختفي الفرصة.' },
    en: { title: 'Weak Follow-Up After First Contact', desc: 'Interested customers need reminders, offers, and smart questions. Without structured follow-up, the opportunity fades.' },
  },
  {
    icon: BarChart2,
    color: '#10B981',
    glowColor: 'rgba(16,185,129,0.12)',
    borderColor: 'rgba(16,185,129,0.2)',
    ar: { title: 'لا تعرف أين يضيع المال', desc: 'كم رسالة أو مكالمة تحولت لحجز؟ من أفضل خدمة؟ أي يوم ضعيف؟ بدون لوحة واضحة أنت تقرر بالحدس.' },
    en: { title: 'You Cannot See Where Money Leaks', desc: 'How many messages or calls became bookings? Which service sells best? Which day is weak? Without a clear dashboard, decisions are guesses.' },
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }
  }),
}

export const Problem = () => {
  const { t, language } = useLanguage()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="problem" ref={ref} className="relative py-28 overflow-hidden" style={{ background: '#080E1C' }}>

      {/* BG */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to bottom, transparent, rgba(0,191,255,0.03) 40%, rgba(13,27,62,0.03) 60%, transparent)',
        }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <p className={`text-xs font-semibold tracking-[0.25em] uppercase mb-3 ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
            style={{ color: '#EF4444' }}>
            {t('المشكلة التي تكلفك يومياً', 'The Daily Revenue Leak')}
          </p>
          <h2 className={`text-4xl sm:text-5xl font-bold mb-5 ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: 'white' }}>
            {t(
              <>العملاء لا يضيعون فجأة<br /><span className="gradient-text">يضيعون في الردود والمكالمات</span></>,
              <>Customers Do Not Vanish<br /><span className="gradient-text">They Leak in Replies and Calls</span></>
            )}
          </h2>
          <p className={`text-lg max-w-2xl mx-auto ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.55)' }}>
            {t(
              'إذا كانت الرسائل والمكالمات هي باب البيع عندك، فكل رد متأخر وكل اتصال فائت وكل متابعة منسية تعني حجز ضائع.',
              'If messages and calls are your sales front door, every late reply, missed call, and forgotten follow-up means a lost booking.'
            )}
          </p>
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {problems.map((p, i) => {
            const Icon = p.icon
            const content = language === 'ar' ? p.ar : p.en
            return (
              <motion.div
                key={i}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate={inView ? 'visible' : 'hidden'}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="relative p-5 rounded-2xl cursor-default"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${p.borderColor}`,
                  backdropFilter: 'blur(8px)',
                }}
              >
                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: p.glowColor, border: `1px solid ${p.borderColor}` }}
                >
                  <Icon size={20} style={{ color: p.color }} />
                </div>

                <h3 className={`text-sm font-bold mb-2 ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: 'white' }}>
                  {content.title}
                </h3>
                <p className={`text-xs leading-relaxed ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
                  style={{ color: 'rgba(255,255,255,0.38)' }}>
                  {content.desc}
                </p>

                {/* Corner dot */}
                <div className="absolute top-4 end-4 w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
              </motion.div>
            )
          })}
        </div>

        {/* Transition arrow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="text-center mt-14"
        >
          <div className="inline-flex flex-col items-center gap-3">
            <p className={`text-base ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.55)' }}>
              {t('مدار يحوّل هذا الفوضى إلى نظام بيع وحجز واضح — ', 'MADAR turns this chaos into a clear sales and booking system — ')}
              <a href="#services" className={`underline underline-offset-2 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: '#00BFFF' }}>
                {t('اكتشف خدماتنا', 'Explore our services')}
              </a>
            </p>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="flex items-center gap-2"
              style={{ color: 'white' }}
            >
              <ArrowRight size={18} className="rotate-90" />
            </motion.div>
          </div>

          {/* External citations */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.9 }}
            className={`mt-8 text-xs max-w-2xl mx-auto leading-relaxed ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
            style={{ color: 'rgba(255,255,255,0.28)' }}
          >
            {t(
              <>
                وفقاً لـ{' '}
                <a href="https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights/the-economic-potential-of-generative-ai" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(0,191,255,0.5)' }}>McKinsey Global Institute</a>
                {' '}، يمكن للأتمتة توفير ما يصل إلى 30% من تكاليف التشغيل. وتُشير{' '}
                <a href="https://www.gartner.com/en/information-technology/insights/artificial-intelligence" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(0,191,255,0.5)' }}>Gartner</a>
                {' '}إلى أن 80% من الشركات ستعتمد الذكاء الاصطناعي بحلول 2026.
              </>,
              <>
                According to{' '}
                <a href="https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights/the-economic-potential-of-generative-ai" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(0,191,255,0.5)' }}>McKinsey Global Institute</a>
                , automation can save up to 30% of operating costs. {' '}
                <a href="https://www.gartner.com/en/information-technology/insights/artificial-intelligence" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(0,191,255,0.5)' }}>Gartner</a>
                {' '}reports that 80% of companies will adopt AI by 2026.
              </>
            )}
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}
