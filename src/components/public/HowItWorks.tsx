import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Search, Cpu, Rocket, Check } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { openWhatsAppChat } from '../../lib/whatsapp'

const steps = [
  {
    num: '01',
    icon: Search,
    gradient: 'linear-gradient(135deg, #0D1B3E, #00BFFF)',
    glow: 'rgba(0,191,255,0.25)',
    ar: {
      title: 'تحليل عملك',
      desc: 'نبدأ بجلسة استراتيجية عميقة نفهم فيها عمليات شركتك، نقاط الضعف، وأهدافك. نحدد أين يمكن للـ AI أن يحقق أكبر تأثير.',
      duration: '٣٠ دقيقة',
      checks: ['فهم العمليات الحالية', 'تحديد نقاط التحسين', 'وضع أهداف قابلة للقياس'],
    },
    en: {
      title: 'Business Analysis',
      desc: 'We start with a deep strategy session to understand your operations, pain points, and goals. We identify exactly where AI will have the most impact.',
      duration: '30 Minutes',
      checks: ['Map current processes', 'Identify improvement areas', 'Set measurable goals'],
    },
  },
  {
    num: '02',
    icon: Cpu,
    gradient: 'linear-gradient(135deg, #0D1B3E, #0099CC)',
    glow: 'rgba(0,153,204,0.25)',
    ar: {
      title: 'تصميم وبناء النظام',
      desc: 'فريقنا يصمم ويبني نظام AI مخصص لعملك — من الكود إلى الواجهات والتكاملات. كل شيء يُبنى ويُختبر قبل التسليم.',
      duration: '٧–١٤ يوم',
      checks: ['تصميم معمارية النظام', 'برمجة مخصصة', 'اختبار شامل'],
    },
    en: {
      title: 'Design & Build',
      desc: 'Our team designs and builds a custom AI system for your business — from code to interfaces and integrations. Everything is built and tested before delivery.',
      duration: '7–14 Days',
      checks: ['System architecture design', 'Custom development', 'Comprehensive testing'],
    },
  },
  {
    num: '03',
    icon: Rocket,
    gradient: 'linear-gradient(135deg, #00BFFF, #0D1B3E)',
    glow: 'rgba(0,191,255,0.25)',
    ar: {
      title: 'الإطلاق والأتمتة',
      desc: 'نطلق النظام ونتابع أداءه، ونُدرّب فريقك، ونوفر دعماً مستمراً لضمان أفضل النتائج. نظامك يشتغل حتى وأنت نايم.',
      duration: 'مستمر',
      checks: ['إطلاق تدريجي آمن', 'تدريب الفريق', 'دعم ومراقبة مستمرة'],
    },
    en: {
      title: 'Deploy & Automate',
      desc: 'We launch the system, monitor performance, train your team, and provide ongoing support. Your AI system works even while you sleep.',
      duration: 'Ongoing',
      checks: ['Safe gradual launch', 'Team training', 'Ongoing support & monitoring'],
    },
  },
]

export const HowItWorks = () => {
  const { t, language } = useLanguage()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="how-it-works" ref={ref} className="relative py-28 overflow-hidden" style={{ background: '#080E1C' }}>
      <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.3), transparent)' }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(0,191,255,0.04) 0%, transparent 70%)' }} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7 }} className="text-center mb-20">
          <p className={`text-xs font-semibold tracking-[0.25em] uppercase mb-3 ${language === 'ar' ? 'font-cairo' : 'font-work'}`} style={{ color: '#00BFFF' }}>
            {t('العملية', 'The Process')}
          </p>
          <h2 className={`text-4xl sm:text-5xl font-bold mb-4 ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: 'white' }}>
            {t(<>كيف نحوّل عملك<br /><span className="gradient-text-blue">في ٣ خطوات</span></>, <>How We Transform<br /><span className="gradient-text-blue">In 3 Steps</span></>)}
          </h2>
          <p className={`text-lg max-w-xl mx-auto ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.55)' }}>
            {t('عملية واضحة وشفافة من التحليل إلى التشغيل الكامل', 'A clear, transparent process from analysis to full operation')}
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-[52px] left-[16.67%] right-[16.67%] h-px" style={{ background: 'linear-gradient(90deg, rgba(0,191,255,0.4), rgba(13,27,62,0.4), rgba(6,182,212,0.4))' }} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6">
            {steps.map((step, i) => {
              const Icon = step.icon
              const content = language === 'ar' ? step.ar : step.en
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                  className="relative flex flex-col gap-5"
                >
                  {/* Step number + icon */}
                  <div className="flex flex-col items-center lg:items-start gap-3">
                    <div className="relative">
                      <motion.div
                        className="w-[104px] h-[104px] rounded-2xl flex items-center justify-center relative z-10"
                        style={{ background: step.gradient, boxShadow: `0 0 35px ${step.glow}` }}
                        whileHover={{ scale: 1.05 }}
                        animate={{ boxShadow: [`0 0 25px ${step.glow}`, `0 0 50px ${step.glow}`, `0 0 25px ${step.glow}`] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.8 }}
                      >
                        <Icon size={36} className="text-white" />
                      </motion.div>
                      {/* Number badge */}
                      <div className="absolute -top-2 -end-2 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold z-20"
                        style={{ background: '#0D1B3E', border: '1.5px solid rgba(0,191,255,0.3)', color: 'white' }}>
                        {step.num}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 rounded-2xl flex flex-col gap-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={`text-lg font-bold ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: 'white' }}>{content.title}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}>
                          {content.duration}
                        </span>
                      </div>
                      <p className={`text-sm leading-relaxed ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.55)' }}>{content.desc}</p>
                    </div>

                    <div className="flex flex-col gap-2">
                      {content.checks.map((c, ci) => (
                        <div key={ci} className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,191,255,0.15)' }}>
                            <Check size={9} style={{ color: '#00BFFF' }} />
                          </div>
                          <span className={`text-xs ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.55)' }}>{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.6 }} className="text-center mt-16">
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(0,191,255,0.35)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => openWhatsAppChat()}
            className={`inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-semibold text-base cursor-pointer ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
            style={{ background: 'linear-gradient(135deg, #0D1B3E, #0099CC)', boxShadow: '0 0 30px rgba(0,153,204,0.3)' }}
          >
            {t('ابدأ رحلتك مع AI', 'Start Your AI Journey')}
          </motion.button>
          <p className={`text-xs mt-3 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.38)' }}>
            {t('مكالمة مجانية بلا التزام', 'Free call, no commitment')}
          </p>
        </motion.div>
      </div>
    </section>
  )
}
