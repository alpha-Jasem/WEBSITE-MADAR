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
    ar: { title: 'ردود بطيئة على العملاء', desc: 'عملاؤك ينتظرون ساعات للحصول على رد بسيط — وفي هذا الوقت ينتقلون لمنافسيك.' },
    en: { title: 'Slow Customer Response', desc: 'Customers wait hours for simple answers — and move to competitors while waiting.' },
  },
  {
    icon: DollarSign,
    color: '#F59E0B',
    glowColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.2)',
    ar: { title: 'تكاليف موظفين مرتفعة', desc: 'توظيف فريق كبير للمهام المتكررة يستنزف ميزانيتك دون زيادة حقيقية في القيمة.' },
    en: { title: 'High Employee Costs', desc: 'Hiring large teams for repetitive tasks drains budget without adding real value.' },
  },
  {
    icon: UserX,
    color: '#8B5CF6',
    glowColor: 'rgba(139,92,246,0.12)',
    borderColor: 'rgba(139,92,246,0.2)',
    ar: { title: 'فرص مبيعات ضائعة', desc: 'العملاء المحتملون يصلون خارج ساعات العمل ولا أحد يرد عليهم — فرص تضيع يومياً.' },
    en: { title: 'Missed Sales Leads', desc: 'Prospects arrive after hours with no one to respond — opportunities lost daily.' },
  },
  {
    icon: RefreshCw,
    color: '#06B6D4',
    glowColor: 'rgba(6,182,212,0.12)',
    borderColor: 'rgba(6,182,212,0.2)',
    ar: { title: 'مهام يدوية متكررة', desc: 'فريقك يقضي وقته في إدخال البيانات، جدولة المواعيد، والمتابعة بدلاً من الإبداع والنمو.' },
    en: { title: 'Manual Repetitive Work', desc: 'Your team spends time on data entry, scheduling, and follow-ups instead of growth.' },
  },
  {
    icon: BarChart2,
    color: '#10B981',
    glowColor: 'rgba(16,185,129,0.12)',
    borderColor: 'rgba(16,185,129,0.2)',
    ar: { title: 'غياب الرؤية التشغيلية', desc: 'لا تعرف أين تتعثر عملياتك، ولا ماذا يريد عملاؤك حقاً — القرارات تُتخذ باجتهاد لا ببيانات.' },
    en: { title: 'No Operational Visibility', desc: 'You cannot see where operations break down or what customers truly want — decisions made by guessing.' },
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
            {t('التحديات الحقيقية', 'The Real Challenges')}
          </p>
          <h2 className={`text-4xl sm:text-5xl font-bold mb-5 ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: 'white' }}>
            {t(
              <>هل تواجه هذه<br /><span className="gradient-text">المشكلات؟</span></>,
              <>Are These Problems<br /><span className="gradient-text">Familiar?</span></>
            )}
          </h2>
          <p className={`text-lg max-w-2xl mx-auto ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.55)' }}>
            {t(
              'معظم الشركات تخسر وقتاً ومالاً في مهام يمكن للذكاء الاصطناعي أن يتولاها بشكل كامل وفوري.',
              'Most businesses lose time and money on tasks AI can handle completely and instantly.'
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
              {t('مدار تحل كل هذا بأنظمة الذكاء الاصطناعي', 'MADAR solves all of this with AI systems')}
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
        </motion.div>
      </div>
    </section>
  )
}
