import { motion, useInView } from 'framer-motion'
import { ArrowUpRight, CheckCircle2, Clock3, PhoneCall, Target, Zap } from 'lucide-react'
import { useRef } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { openWhatsAppChat } from '../../lib/whatsapp'

const proofPoints = [
  {
    icon: PhoneCall,
    ar: 'يرد على واتساب والمكالمات',
    en: 'Handles WhatsApp and calls',
  },
  {
    icon: Clock3,
    ar: 'أول مسار تشغيل خلال 7 أيام',
    en: 'First live flow within 7 days',
  },
  {
    icon: Target,
    ar: 'قياس واضح: تواصل > حجز > متابعة',
    en: 'Clear tracking: contact > booking > follow-up',
  },
]

const deliverables = [
  {
    ar: 'تشخيص أين تضيع الرسائل والمكالمات حالياً',
    en: 'Diagnosis of where messages and calls currently leak',
  },
  {
    ar: 'تصميم سكربت واتساب وVoice Agent حسب خدماتك',
    en: 'WhatsApp and voice-agent scripts designed around your services',
  },
  {
    ar: 'ربط الحجز والمتابعة والـ CRM في مسار واحد',
    en: 'Booking, follow-up, and CRM connected in one flow',
  },
  {
    ar: 'لوحة توضح عدد التفاعلات والحجوزات والفرص الضائعة',
    en: 'Dashboard showing interactions, bookings, and missed opportunities',
  },
]

export const ConversionOffer = () => {
  const { t, language } = useLanguage()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-90px' })

  return (
    <section ref={ref} className="relative overflow-hidden py-20 sm:py-28" style={{ background: '#050810' }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.45), transparent)' }} />
        <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(0,191,255,0.09) 0%, transparent 68%)', filter: 'blur(45px)' }} />
        <div className="absolute inset-0 opacity-[0.18]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '56px 56px' }} />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className={language === 'ar' ? 'text-right' : 'text-left'}
          >
            <div className={`mb-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
              style={{ background: 'rgba(0,191,255,0.09)', border: '1px solid rgba(0,191,255,0.24)', color: '#00BFFF' }}>
              <Zap size={13} />
              {t('العرض الأقوى للبداية', 'Strongest Starting Offer')}
            </div>

            <h2 className={`max-w-3xl text-3xl font-bold leading-tight text-white sm:text-5xl ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}>
              {t(
                <>نركّب أول مسار AI يرد ويحجز <span className="gradient-text-blue">خلال 7 أيام</span></>,
                <>Launch your first AI reply-and-booking flow <span className="gradient-text-blue">within 7 days</span></>
              )}
            </h2>

            <p className={`mt-5 max-w-2xl text-base leading-relaxed sm:text-lg ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.62)' }}>
              {t(
                'نبدأ من قناة واحدة عالية الأثر: واتساب أو المكالمات. نبني المسار، نربطه بالحجز والمتابعة، ثم نقيس كم فرصة تحولت إلى موعد أو عميل.',
                'We start with one high-impact channel: WhatsApp or calls. We build the flow, connect booking and follow-up, then track how many opportunities become appointments or customers.'
              )}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 0 36px rgba(0,191,255,0.34)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => openWhatsAppChat(t('مرحباً، أريد عرض أول مسار AI خلال 7 أيام للرسائل والمكالمات والحجوزات', 'Hello, I want the 7-day first AI flow offer for messages, calls, and bookings'))}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-7 py-4 text-sm font-bold text-white ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
                style={{ background: 'linear-gradient(135deg, #0D1B3E, #0099CC)', boxShadow: '0 0 24px rgba(0,153,204,0.28)' }}
              >
                {t('ابدأ أول مسار خلال 7 أيام', 'Start the 7-Day Flow')}
                <ArrowUpRight size={16} />
              </motion.button>
              <a
                href="#contact"
                className={`inline-flex items-center justify-center rounded-xl border px-7 py-4 text-sm font-semibold ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
                style={{ borderColor: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.78)', background: 'rgba(255,255,255,0.035)' }}
              >
                {t('أرسل تفاصيل عملك', 'Send Business Details')}
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-3xl p-5 sm:p-6"
            style={{ background: 'linear-gradient(160deg, rgba(0,191,255,0.12), rgba(255,255,255,0.035))', border: '1px solid rgba(0,191,255,0.22)', boxShadow: '0 24px 80px rgba(0,0,0,0.36)' }}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {proofPoints.map((item, i) => {
                const Icon = item.icon
                return (
                  <div key={i} className="rounded-2xl p-4" style={{ background: 'rgba(5,8,16,0.58)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Icon size={18} style={{ color: '#00BFFF' }} />
                    <p className={`mt-3 text-xs font-semibold leading-relaxed text-white ${language === 'ar' ? 'font-cairo' : 'font-work'}`}>
                      {language === 'ar' ? item.ar : item.en}
                    </p>
                  </div>
                )
              })}
            </div>

            <div className="mt-5 rounded-2xl p-5" style={{ background: 'rgba(5,8,16,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className={`mb-4 text-sm font-bold text-white ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}>
                {t('ما الذي تستلمه فعلياً؟', 'What do you actually receive?')}
              </p>
              <div className="space-y-3">
                {deliverables.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0" style={{ color: '#22C55E' }} />
                    <span className={`text-sm leading-relaxed ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.68)' }}>
                      {language === 'ar' ? item.ar : item.en}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
