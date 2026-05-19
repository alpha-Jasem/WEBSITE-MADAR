import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Calendar, ArrowRight, Sparkles } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { openWhatsAppChat } from '../../lib/whatsapp'

export const FinalCTA = () => {
  const { t, language } = useLanguage()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="contact" ref={ref} className="relative py-20 sm:py-32 overflow-hidden" style={{ background: '#0D1B3E' }}>
      {/* BG */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent, rgba(0,191,255,0.04) 30%, rgba(0,191,255,0.06) 70%, transparent)' }} />

        {/* Large blobs */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(0,191,255,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[500px] h-[300px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(0,191,255,0.05) 0%, transparent 70%)', filter: 'blur(50px)' }}
          animate={{ scale: [1, 1.15, 1], x: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />

        {/* Grid */}
        <div className="absolute inset-0 grid-bg opacity-30" />

        {/* Top + bottom lines */}
        <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.4), transparent)' }} />
        <div className="absolute bottom-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.2), transparent)' }} />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-6 sm:gap-8"
        >
          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full"
            style={{ background: 'rgba(0,191,255,0.1)', border: '1px solid rgba(0,191,255,0.25)' }}
            animate={{ boxShadow: ['0 0 0px rgba(0,191,255,0)', '0 0 30px rgba(0,191,255,0.3)', '0 0 0px rgba(0,191,255,0)'] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Sparkles size={14} style={{ color: '#00BFFF' }} />
            <span className={`text-sm font-medium ${language === 'ar' ? 'font-cairo' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.9)' }}>
              {t('استشارة مجانية — بلا التزام', 'Free Consultation — No Commitment')}
            </span>
          </motion.div>

          {/* Headline */}
          <div className="space-y-3">
            <h2 className={`text-3xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}>
              <span className="text-white">
                {t('عملك جاهز', 'Your Business')}
              </span>
              <br />
              <span style={{
                background: 'linear-gradient(135deg, #00BFFF 0%, #80dfff 50%, #00BFFF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: 'none',
                filter: 'drop-shadow(0 0 30px rgba(0,191,255,0.4))',
              }}>
                {t('للأتمتة الذكية', 'Is Ready for AI')}
              </span>
            </h2>
            <p className={`text-base sm:text-xl max-w-2xl mx-auto leading-relaxed ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.7)' }}>
              {t(
                'كل يوم بدون أتمتة هو يوم تخسر فيه وقتاً ومالاً وعملاء. ابدأ اليوم — مكالمة واحدة تغيّر كل شيء.',
                'Every day without automation is a day you lose time, money, and customers. Start today — one call changes everything.'
              )}
            </p>
          </div>

          {/* CTA */}
          <motion.button
            whileHover={{ scale: 1.03, boxShadow: '0 0 60px rgba(0,191,255,0.5)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => openWhatsAppChat()}
            className={`flex items-center justify-center gap-2 px-10 py-5 rounded-2xl font-bold text-lg cursor-pointer ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
            style={{ background: 'white', color: '#0D1B3E', boxShadow: '0 0 30px rgba(255,255,255,0.15)' }}
          >
            <Calendar size={20} />
            <span>{t('احجز استشارة مجانية', 'Book a Free Consultation')}</span>
            <ArrowRight size={18} className={language === 'ar' ? 'rotate-180' : ''} />
          </motion.button>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 pt-2 sm:pt-4">
            {[
              { ar: 'استجابة خلال ساعة', en: 'Response within 1 hour' },
              { ar: 'لا رسوم خفية', en: 'No hidden fees' },
              { ar: 'نتائج مضمونة', en: 'Guaranteed results' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#00BFFF' }} />
                <span className={`text-sm ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {language === 'ar' ? item.ar : item.en}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
