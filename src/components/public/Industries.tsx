import { useRef, useState } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Stethoscope, Building2, Check, CalendarCheck, MessageCircle, Bell, BarChart3, Users, Star, TrendingUp, Clock, Zap } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

const industries = [
  {
    id: 'clinic',
    icon: Stethoscope,
    gradient: 'linear-gradient(135deg, #00BFFF 0%, #0D7FBF 100%)',
    glowColor: 'rgba(0,191,255,0.25)',
    accentColor: '#00BFFF',
    bgPattern: 'radial-gradient(ellipse 80% 60% at 20% 30%, rgba(0,191,255,0.08) 0%, transparent 60%)',
    ar: {
      label: 'العيادات',
      name: 'العيادات والمستشفيات',
      tagline: 'رعاية ذكية، حجز تلقائي',
      desc: 'نحوّل عيادتك إلى منظومة ذكية تعمل على مدار الساعة — من أول رسالة للمريض حتى المتابعة بعد الزيارة.',
      features: [
        { icon: CalendarCheck, text: 'حجز مواعيد تلقائي ٢٤/٧ عبر واتساب' },
        { icon: MessageCircle, text: 'ردود فورية على استفسارات المرضى' },
        { icon: Bell, text: 'تذكيرات تلقائية قبل الموعد بـ ٢٤ ساعة' },
        { icon: BarChart3, text: 'تقارير ومتابعة الحالات الصحية' },
      ],
      metrics: [
        { value: '٣×', label: 'حجوزات أكثر', icon: TrendingUp },
        { value: '↓٨٠٪', label: 'مكالمات يدوية', icon: Clock },
      ],
    },
    en: {
      label: 'Healthcare',
      name: 'Clinics & Hospitals',
      tagline: 'Smart Care, Auto Booking',
      desc: 'Transform your clinic into a 24/7 smart system — from the first patient message to post-visit follow-up.',
      features: [
        { icon: CalendarCheck, text: '24/7 automatic appointment booking via WhatsApp' },
        { icon: MessageCircle, text: 'Instant responses to patient inquiries' },
        { icon: Bell, text: 'Automated reminders 24 hours before appointment' },
        { icon: BarChart3, text: 'Health case tracking and reporting' },
      ],
      metrics: [
        { value: '3×', label: 'More Bookings', icon: TrendingUp },
        { value: '↓80%', label: 'Manual Calls', icon: Clock },
      ],
    },
  },
  {
    id: 'realestate',
    icon: Building2,
    gradient: 'linear-gradient(135deg, #1565C0 0%, #0099CC 100%)',
    glowColor: 'rgba(21,101,192,0.25)',
    accentColor: '#4A9EFF',
    bgPattern: 'radial-gradient(ellipse 80% 60% at 80% 30%, rgba(74,158,255,0.08) 0%, transparent 60%)',
    ar: {
      label: 'العقارات',
      name: 'العقارات والتطوير',
      tagline: 'عملاء مؤهَّلون، جولات مجدولة',
      desc: 'وكيلك العقاري الذكي يعمل طوال اليوم — يستقبل المحتملين، يؤهّلهم، ويجدول الجولات تلقائياً.',
      features: [
        { icon: Users, text: 'متابعة العملاء المحتملين فوراً تلقائياً' },
        { icon: Star, text: 'تصنيف وتأهيل العملاء بدقة' },
        { icon: CalendarCheck, text: 'جدولة جولات العقارات أوتوماتيكياً' },
        { icon: MessageCircle, text: 'إرسال عروض مخصصة لكل عميل' },
      ],
      metrics: [
        { value: '↑٦٠٪', label: 'تحويل أعلى', icon: TrendingUp },
        { value: '↓٧٠٪', label: 'وقت متابعة', icon: Zap },
      ],
    },
    en: {
      label: 'Real Estate',
      name: 'Real Estate & Development',
      tagline: 'Qualified Leads, Scheduled Tours',
      desc: 'Your smart real estate agent works all day — receives prospects, qualifies them, and schedules tours automatically.',
      features: [
        { icon: Users, text: 'Instant automatic lead follow-up' },
        { icon: Star, text: 'Accurate client qualification and scoring' },
        { icon: CalendarCheck, text: 'Automatic property tour scheduling' },
        { icon: MessageCircle, text: 'Personalized offer delivery per client' },
      ],
      metrics: [
        { value: '↑60%', label: 'Higher Conversion', icon: TrendingUp },
        { value: '↓70%', label: 'Follow-up Time', icon: Zap },
      ],
    },
  },
]

const FeatureItem = ({ icon: Icon, text, delay, inView, accentColor }: { icon: any; text: string; delay: number; inView: boolean; accentColor: string }) => (
  <motion.div
    initial={{ opacity: 0, x: -16 }}
    animate={inView ? { opacity: 1, x: 0 } : {}}
    transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    className="flex items-start gap-3"
  >
    <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
      style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}30` }}>
      <Check size={12} style={{ color: accentColor }} strokeWidth={3} />
    </div>
    <span className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>{text}</span>
  </motion.div>
)

const MetricBadge = ({ value, label, icon: Icon, delay, inView, accentColor }: { value: string; label: string; icon: any; delay: number; inView: boolean; accentColor: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 12, scale: 0.9 }}
    animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
    transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
    style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${accentColor}25`, backdropFilter: 'blur(8px)' }}
  >
    <Icon size={14} style={{ color: accentColor }} />
    <div>
      <div className="text-base font-bold leading-none" style={{ color: accentColor }}>{value}</div>
      <div className="text-[10px] mt-0.5 font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</div>
    </div>
  </motion.div>
)

export const Industries = () => {
  const { t, language } = useLanguage()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <section id="industries" ref={ref} className="relative py-20 sm:py-28 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #05060A 0%, #080E1C 100%)' }}>

      {/* Background grid */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Glow blobs */}
      <motion.div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[300px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(0,191,255,0.06) 0%, transparent 70%)', filter: 'blur(60px)' }}
        animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[400px] h-[300px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(245,158,11,0.06) 0%, transparent 70%)', filter: 'blur(60px)' }}
        animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }} />

      {/* Top border glow */}
      <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.3), rgba(245,158,11,0.3), transparent)' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-14 sm:mb-20"
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5"
            style={{ background: 'rgba(0,191,255,0.08)', border: '1px solid rgba(0,191,255,0.2)' }}
            animate={{ boxShadow: ['0 0 0px rgba(0,191,255,0)', '0 0 20px rgba(0,191,255,0.2)', '0 0 0px rgba(0,191,255,0)'] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Zap size={12} style={{ color: '#00BFFF' }} />
            <span className={`text-xs font-semibold tracking-widest uppercase ${language === 'ar' ? 'font-cairo' : 'font-work'}`} style={{ color: '#00BFFF' }}>
              {t('القطاعات المدعومة', 'Supported Industries')}
            </span>
          </motion.div>

          <h2 className={`text-3xl sm:text-5xl font-bold mb-4 ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: 'white' }}>
            {t(
              <><span className="gradient-text-blue">حلول مخصصة</span> لقطاعَين رائدَين</>,
              <>Tailored Solutions for <span className="gradient-text-blue">Two Leading</span> Industries</>
            )}
          </h2>
          <p className={`text-base sm:text-lg max-w-xl mx-auto ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.5)' }}>
            {t(
              'صمّمنا منظومة ذكاء اصطناعي متكاملة خصيصاً للعيادات والعقارات — بعمق في كل تفصيلة.',
              'We built a complete AI system specifically for healthcare and real estate — deep in every detail.'
            )}
          </p>
        </motion.div>

        {/* Two Industry Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
          {industries.map((ind, i) => {
            const Icon = ind.icon
            const content = language === 'ar' ? ind.ar : ind.en
            const isHovered = hovered === ind.id
            const cardDelay = i * 0.15

            return (
              <motion.div
                key={ind.id}
                initial={{ opacity: 0, y: 40 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.7, delay: cardDelay, ease: [0.22, 1, 0.36, 1] }}
                onHoverStart={() => setHovered(ind.id)}
                onHoverEnd={() => setHovered(null)}
                whileHover={{ y: -6 }}
                className="relative rounded-3xl overflow-hidden cursor-default"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isHovered ? ind.accentColor + '40' : 'rgba(255,255,255,0.07)'}`,
                  boxShadow: isHovered ? `0 20px 60px ${ind.glowColor}` : '0 4px 20px rgba(0,0,0,0.3)',
                  transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
                }}
              >
                {/* Card background pattern */}
                <div className="absolute inset-0 pointer-events-none" style={{ background: ind.bgPattern }} />

                {/* Animated gradient top bar */}
                <motion.div
                  className="absolute top-0 inset-x-0 h-0.5"
                  style={{ background: ind.gradient }}
                  animate={{ opacity: isHovered ? 1 : 0.4 }}
                  transition={{ duration: 0.3 }}
                />

                <div className="relative z-10 p-6 sm:p-8">
                  {/* Label chip */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={inView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ delay: cardDelay + 0.1, duration: 0.4 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-5"
                    style={{ background: `${ind.accentColor}15`, border: `1px solid ${ind.accentColor}30` }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: ind.accentColor }} />
                    <span className={`text-xs font-semibold ${language === 'ar' ? 'font-cairo' : 'font-work'}`} style={{ color: ind.accentColor }}>
                      {content.label}
                    </span>
                  </motion.div>

                  {/* Icon + Title row */}
                  <div className="flex items-start gap-4 mb-3">
                    <motion.div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: ind.gradient, boxShadow: `0 8px 24px ${ind.glowColor}` }}
                      animate={{ boxShadow: isHovered ? `0 12px 32px ${ind.glowColor}` : `0 8px 24px ${ind.glowColor}40` }}
                      transition={{ duration: 0.3 }}
                    >
                      <Icon size={26} color="white" />
                    </motion.div>

                    <div>
                      <h3 className={`text-xl sm:text-2xl font-bold leading-snug text-white ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}>
                        {content.name}
                      </h3>
                      <p className={`text-sm mt-0.5 font-medium ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: ind.accentColor }}>
                        {content.tagline}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={inView ? { opacity: 1 } : {}}
                    transition={{ delay: cardDelay + 0.25 }}
                    className={`text-sm leading-relaxed mb-6 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
                    style={{ color: 'rgba(255,255,255,0.55)' }}
                  >
                    {content.desc}
                  </motion.p>

                  {/* Features */}
                  <div className="space-y-3 mb-7">
                    {content.features.map((feat, fi) => (
                      <FeatureItem
                        key={fi}
                        icon={feat.icon}
                        text={feat.text}
                        delay={cardDelay + 0.3 + fi * 0.08}
                        inView={inView}
                        accentColor={ind.accentColor}
                      />
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="h-px mb-5" style={{ background: 'rgba(255,255,255,0.06)' }} />

                  {/* Metric badges */}
                  <div className="flex gap-3 flex-wrap">
                    {content.metrics.map((m, mi) => (
                      <MetricBadge
                        key={mi}
                        value={m.value}
                        label={m.label}
                        icon={m.icon}
                        delay={cardDelay + 0.55 + mi * 0.08}
                        inView={inView}
                        accentColor={ind.accentColor}
                      />
                    ))}
                  </div>
                </div>

                {/* Corner glow on hover */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      key="glow"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="absolute bottom-0 right-0 w-40 h-40 rounded-full pointer-events-none"
                      style={{ background: `radial-gradient(circle, ${ind.glowColor} 0%, transparent 70%)`, filter: 'blur(20px)' }}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.9, duration: 0.5 }}
          className={`text-center text-sm mt-10 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
          style={{ color: 'rgba(255,255,255,0.28)' }}
        >
          {t('قطاعك مختلف؟ نبني حلولاً مخصصة لأي عمل — تواصل معنا', "Different industry? We build custom solutions for any business — contact us")}
        </motion.p>
      </div>
    </section>
  )
}
