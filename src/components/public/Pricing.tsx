import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Check, Sparkles, ArrowLeft, ArrowRight, Zap, TrendingUp, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import { openWhatsAppChat } from '../../lib/whatsapp'

const CY = '#0099CC'
const EM = '#10B981'
const VI = '#7C3AED'

const plans = [
  {
    key: 'starter',
    accent: CY,
    featured: false,
    ar: {
      name: 'Starter',
      tagline: 'لبداية قوية',
      outcome: 'أوقف تسرب العملاء من أول أسبوع',
      price: '٢,٩٩٩',
      period: 'ر.س مرة واحدة',
      monthly: '+ ٢٩٩ ر.س/شهر',
      features: [
        'رد واتساب أو مكالمات AI',
        'حتى ١٠٠٠ تفاعل شهرياً',
        'تكامل مع منصة واحدة',
        'لوحة تحليلات بسيطة',
        'دعم تقني شهر واحد',
      ],
      cta: 'ابدأ الآن',
    },
    en: {
      name: 'Starter',
      tagline: 'For a Strong Start',
      outcome: 'Stop customer loss from day one',
      price: '2,999',
      period: 'SAR one-time',
      monthly: '+ SAR 299/month',
      features: [
        'WhatsApp or AI call response',
        'Up to 1,000 interactions/month',
        'Single platform integration',
        'Basic analytics dashboard',
        '1 month technical support',
      ],
      cta: 'Start Now',
    },
  },
  {
    key: 'growth',
    accent: CY,
    featured: true,
    ar: {
      name: 'Growth',
      tagline: 'الأكثر شيوعاً',
      outcome: 'حوّل كل تواصل إلى حجز — تلقائياً',
      price: '٧,٩٩٩',
      period: 'ر.س مرة واحدة',
      monthly: '+ ٧٩٩ ر.س/شهر',
      features: [
        'وكيل AI واتساب + مكالمات',
        'نظام حجز مواعيد متكامل',
        'أتمتة CRM كاملة',
        'تفاعلات غير محدودة',
        'تكامل مع ٣ منصات',
        'لوحة تحليلات متقدمة',
        'دعم تقني ٦ أشهر',
        'تقارير أداء أسبوعية',
      ],
      cta: 'ابنِ محرك النمو',
    },
    en: {
      name: 'Growth',
      tagline: 'Most Popular',
      outcome: 'Turn every contact into a booking — automatically',
      price: '7,999',
      period: 'SAR one-time',
      monthly: '+ SAR 799/month',
      features: [
        'AI WhatsApp + voice agent',
        'Integrated appointment booking',
        'Full CRM automation',
        'Unlimited interactions',
        'Integration with 3 platforms',
        'Advanced analytics dashboard',
        '6 months technical support',
        'Weekly performance reports',
      ],
      cta: 'Build the Growth Engine',
    },
  },
  {
    key: 'enterprise',
    accent: VI,
    featured: false,
    ar: {
      name: 'Enterprise',
      tagline: 'للتوسع الكامل',
      outcome: 'نظام تشغيل كامل لعدة فروع',
      price: 'مخصص',
      period: 'حسب الحجم',
      monthly: 'تكاملات بلا حدود',
      features: [
        'جميع مزايا Growth',
        'أنظمة AI غير محدودة',
        'تكاملات مخصصة بلا حدود',
        'مدير حساب مخصص',
        'SLA مضمون ٩٩.٩٪',
        'تدريب الفريق الكامل',
        'دعم أولوية ٢٤/٧',
        'تقارير تنفيذية متقدمة',
      ],
      cta: 'ناقش التوسع',
    },
    en: {
      name: 'Enterprise',
      tagline: 'For Full Scale',
      outcome: 'A complete OS for multiple branches',
      price: 'Custom',
      period: 'Based on size',
      monthly: 'Unlimited integrations',
      features: [
        'Everything in Growth',
        'Unlimited AI systems',
        'Unlimited custom integrations',
        'Dedicated account manager',
        '99.9% guaranteed SLA',
        'Full team training',
        '24/7 priority support',
        'Advanced executive reports',
      ],
      cta: 'Discuss Scale',
    },
  },
]

export const Pricing = () => {
  const { t, language } = useLanguage()
  const isAr = language === 'ar'
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="pricing" ref={ref} className="relative py-28 overflow-hidden"
      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>

      {/* Accent glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 60% 50% at 50% 0%, ${CY}10 0%, transparent 65%)` }} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16">

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5"
            style={{ background: `${CY}12`, border: `1px solid ${CY}30` }}>
            <Zap size={11} style={{ color: CY }} />
            <span className={`text-xs font-semibold tracking-widest uppercase ${isAr ? 'font-cairo' : 'font-work'}`}
              style={{ color: CY }}>
              {t('الباقات', 'Pricing')}
            </span>
          </div>

          <h2 className={`text-4xl sm:text-5xl font-black text-white mb-4 ${isAr ? 'font-cairo' : 'font-sora'}`}
            style={{ letterSpacing: '-0.025em' }}>
            {t(
              <>لا تشترِ تقنية<br /><span style={{ background: `linear-gradient(135deg, ${CY}, ${EM})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>اشترِ نتيجة واضحة</span></>,
              <>Don't Buy Technology<br /><span style={{ background: `linear-gradient(135deg, ${CY}, ${EM})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Buy a Clear Outcome</span></>,
            )}
          </h2>
          <p className={`text-base max-w-xl mx-auto ${isAr ? 'font-tajawal' : 'font-work'}`}
            style={{ color: 'rgba(255,255,255,0.38)' }}>
            {t(
              'السعر يشمل البناء والتركيب والاختبار. الاشتراك للدعم والتشغيل المستمر.',
              'Price includes build, setup, and testing. Subscription covers support and ongoing operations.',
            )}
          </p>
        </motion.div>

        {/* ── Plans grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start mb-8">
          {plans.map((plan, i) => {
            const c = isAr ? plan.ar : plan.en
            return (
              <motion.div
                key={plan.key}
                initial={{ opacity: 0, y: 40 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.65, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6, transition: { duration: 0.22 } }}
                className={`relative flex flex-col gap-0 rounded-3xl overflow-hidden ${plan.featured ? 'lg:scale-[1.04]' : ''}`}
                style={{
                  background: plan.featured
                    ? `linear-gradient(160deg, rgba(5,8,24,0.95), rgba(0,20,45,0.95))`
                    : 'rgba(5,8,18,0.65)',
                  border: plan.featured
                    ? `1px solid ${plan.accent}45`
                    : `1px solid rgba(255,255,255,0.09)`,
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: plan.featured
                    ? `0 0 60px ${plan.accent}18, 0 24px 60px rgba(0,0,0,0.4)`
                    : '0 8px 32px rgba(0,0,0,0.3)',
                }}
              >
                {/* Top gradient bar */}
                <div className="h-[2px] w-full"
                  style={{
                    background: plan.featured
                      ? `linear-gradient(90deg, transparent 0%, ${plan.accent} 50%, transparent 100%)`
                      : `linear-gradient(90deg, transparent 0%, ${plan.accent}60 50%, transparent 100%)`,
                  }} />

                {/* Header */}
                <div className="px-6 pt-6 pb-4">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className={`text-xl font-black text-white ${isAr ? 'font-cairo' : 'font-sora'}`}>{c.name}</h3>
                    {plan.featured && (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                        style={{ background: `${plan.accent}20`, border: `1px solid ${plan.accent}40` }}>
                        <Sparkles size={9} style={{ color: plan.accent }} />
                        <span className={`text-[10px] font-bold ${isAr ? 'font-cairo' : 'font-work'}`}
                          style={{ color: plan.accent }}>
                          {c.tagline}
                        </span>
                      </div>
                    )}
                    {!plan.featured && (
                      <span className={`text-[10px] font-medium ${isAr ? 'font-tajawal' : 'font-work'}`}
                        style={{ color: 'rgba(255,255,255,0.28)' }}>
                        {c.tagline}
                      </span>
                    )}
                  </div>

                  {/* Outcome callout */}
                  <div className="mt-3 flex items-start gap-2 p-3 rounded-xl"
                    style={{ background: `${plan.accent}0C`, border: `1px solid ${plan.accent}20` }}>
                    <TrendingUp size={12} style={{ color: plan.accent, marginTop: 2, flexShrink: 0 }} />
                    <p className={`text-xs leading-relaxed ${isAr ? 'font-tajawal' : 'font-work'}`}
                      style={{ color: 'rgba(255,255,255,0.6)' }}>
                      {c.outcome}
                    </p>
                  </div>
                </div>

                {/* Price */}
                <div className="px-6 py-4"
                  style={{ borderTop: `1px solid rgba(255,255,255,0.07)`, borderBottom: `1px solid rgba(255,255,255,0.07)` }}>
                  <div className={`text-3xl font-black text-white ${isAr ? 'font-cairo' : 'font-sora'}`}
                    style={{ letterSpacing: '-1px' }}>
                    {c.price}
                  </div>
                  <div className={`text-xs mt-1 ${isAr ? 'font-tajawal' : 'font-work'}`}
                    style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {c.period}
                  </div>
                  <div className={`text-xs mt-0.5 ${isAr ? 'font-tajawal' : 'font-work'}`}
                    style={{ color: plan.accent }}>
                    {c.monthly}
                  </div>
                </div>

                {/* Features */}
                <div className="px-6 py-5 flex flex-col gap-3 flex-1">
                  {c.features.map((f, fi) => (
                    <div key={fi} className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: `${plan.accent}20` }}>
                        <Check size={9} style={{ color: plan.accent }} strokeWidth={3} />
                      </div>
                      <span className={`text-xs leading-relaxed ${isAr ? 'font-tajawal' : 'font-work'}`}
                        style={{ color: 'rgba(255,255,255,0.52)' }}>
                        {f}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="px-6 pb-6">
                  <motion.button
                    whileHover={{ scale: 1.02, boxShadow: plan.featured ? `0 0 40px ${plan.accent}40` : undefined }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => openWhatsAppChat()}
                    className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold cursor-pointer ${isAr ? 'font-cairo' : 'font-work'}`}
                    style={plan.featured
                      ? { background: `linear-gradient(135deg, #0D1B3E, ${plan.accent})`, color: 'white', boxShadow: `0 4px 20px ${plan.accent}30` }
                      : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }
                    }
                  >
                    {c.cta}
                    <ArrowIcon size={14} />
                  </motion.button>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* ── Guarantee strip ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="flex flex-wrap justify-center gap-6 mb-8">
          {[
            { icon: Shield, text: { ar: 'بدون عقود طويلة', en: 'No long contracts' } },
            { icon: Zap,    text: { ar: 'تشغيل في ٤٨ ساعة', en: 'Live in 48 hours' } },
            { icon: Check,  text: { ar: 'دعم عربي كامل', en: 'Full Arabic support' } },
          ].map((item, i) => {
            const Icon = item.icon
            return (
              <div key={i} className="flex items-center gap-2">
                <Icon size={13} style={{ color: EM }} />
                <span className={`text-xs ${isAr ? 'font-tajawal' : 'font-work'}`}
                  style={{ color: 'rgba(255,255,255,0.38)' }}>
                  {isAr ? item.text.ar : item.text.en}
                </span>
              </div>
            )
          })}
        </motion.div>

        {/* ── Free trial banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl p-6 sm:p-8"
          style={{
            background: `linear-gradient(135deg, rgba(0,153,204,0.12) 0%, transparent 50%, rgba(16,185,129,0.10) 100%)`,
            border: `1px solid ${CY}30`,
            boxShadow: `0 0 60px ${CY}10`,
          }}
        >
          <div className="absolute top-0 inset-x-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${CY}60, transparent)` }} />

          <div className="flex flex-col md:flex-row items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#4ADE80', animation: 'pulse-live 2s ease-in-out infinite' }} />
                <span className={`text-[11px] font-bold tracking-widest uppercase ${isAr ? 'font-cairo' : 'font-work'}`}
                  style={{ color: EM }}>
                  {t('تجربة مجانية', 'Free Trial')}
                </span>
              </div>
              <h3 className={`text-xl font-black text-white mb-1 ${isAr ? 'font-cairo' : 'font-sora'}`}>
                {t('جرّب Car Wash OS كامل — ١٤ يوم مجاناً', 'Try the full Car Wash OS — 14 days free')}
              </h3>
              <p className={`text-sm ${isAr ? 'font-tajawal' : 'font-work'}`}
                style={{ color: 'rgba(255,255,255,0.38)' }}>
                {t('حساب فوري + QR تسجيل ذاتي + خطوات تشغيل جاهزة. ما تحتاج تعطي بطاقة.', 'Instant account + self check-in QR + guided setup steps. No card required.')}
              </p>
            </div>
            <Link to="/trial"
              className={`flex-shrink-0 inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl font-bold text-sm text-white ${isAr ? 'font-cairo' : 'font-work'}`}
              style={{ background: `linear-gradient(135deg, #0D1B3E, ${CY})`, boxShadow: `0 4px 24px ${CY}35`, whiteSpace: 'nowrap' }}
            >
              {t('ابدأ تجربة مجانية', 'Start Free Trial')}
              <ArrowIcon size={14} />
            </Link>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.65 }}
          className={`text-center text-xs mt-7 ${isAr ? 'font-tajawal' : 'font-work'}`}
          style={{ color: 'rgba(255,255,255,0.18)' }}>
          {t('السعر يشمل البناء والتركيب والاختبار — الاشتراك للدعم والتشغيل المستمر', 'Price includes build, setup, and testing — subscription covers support and ongoing operations')}
        </motion.p>
      </div>
    </section>
  )
}
