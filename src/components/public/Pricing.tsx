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
    ar: { name: 'Starter', tagline: 'لبداية الردود الذكية', price: '٢,٩٩٩ ر.س', priceNote: 'يبدأ من', priceSubNote: 'دفعة واحدة + ٢٩٩ ر.س/شهر', desc: 'نظام رد ذكي يوقف ضياع الرسائل والمكالمات ويعطيك بداية واضحة', features: ['رد واتساب أو مكالمات AI', 'حتى ١٠٠٠ تفاعل شهرياً', 'تكامل مع منصة واحدة', 'لوحة تحليلات بسيطة', 'دعم تقني شهر واحد'], cta: 'ابدأ بإيقاف التسرب' },
    en: { name: 'Starter', tagline: 'Start Smart Replies', price: 'SAR 2,999', priceNote: 'Starting from', priceSubNote: 'One-time + SAR 299/month', desc: 'A smart response system that stops missed messages and calls and gives you a clear starting point', features: ['WhatsApp or AI call response', 'Up to 1,000 interactions/month', 'Single platform integration', 'Basic analytics dashboard', '1 month technical support'], cta: 'Stop the Leak' },
  },
  {
    key: 'growth',
    accent: CY,
    featured: true,
    ar: { name: 'Growth', tagline: 'لتحويل التواصل إلى حجوزات', price: '٧,٩٩٩ ر.س', priceNote: 'الأكثر شيوعاً', priceSubNote: 'دفعة واحدة + ٧٩٩ ر.س/شهر', desc: 'النظام الكامل للرد على الرسائل والمكالمات، الحجز، المتابعة، والتحليلات في مكان واحد', features: ['وكيل AI واتساب + مكالمات', 'نظام حجز مواعيد متكامل', 'أتمتة CRM كاملة', 'تفاعلات غير محدودة', 'تكامل مع ٣ منصات', 'لوحة تحليلات متقدمة', 'دعم تقني ٦ أشهر', 'تقارير أداء أسبوعية'], cta: 'ابنِ محرك النمو' },
    en: { name: 'Growth', tagline: 'Turn Contact Into Bookings', price: 'SAR 7,999', priceNote: 'Most Popular', priceSubNote: 'One-time + SAR 799/month', desc: 'The complete system for messages, calls, booking, follow-up, and analytics in one place', features: ['AI WhatsApp + voice agent', 'Integrated appointment booking', 'Full CRM automation', 'Unlimited interactions', 'Integration with 3 platforms', 'Advanced analytics dashboard', '6 months technical support', 'Weekly performance reports'], cta: 'Build the Growth Engine' },
  },
  {
    key: 'enterprise',
    accent: VI,
    featured: false,
    ar: { name: 'Enterprise', tagline: 'لمن يريد نظام تشغيل كامل', price: 'تسعير مخصص', priceNote: 'تواصل معنا', priceSubNote: 'حسب الحجم والتكاملات', desc: 'منظومة تشغيل ومبيعات متعددة الفروع مع دعم مخصص وتكاملات بلا حدود', features: ['جميع مزايا Growth', 'أنظمة AI غير محدودة', 'تكاملات مخصصة بلا حدود', 'مدير حساب مخصص', 'SLA مضمون ٩٩.٩٪', 'تدريب الفريق الكامل', 'دعم أولوية ٢٤/٧', 'تقارير تنفيذية متقدمة'], cta: 'ناقش التوسع' },
    en: { name: 'Enterprise', tagline: 'For a Full Operating System', price: 'Custom Pricing', priceNote: 'Contact Us', priceSubNote: 'Based on size and integrations', desc: 'Multi-branch sales and operations system with dedicated support and unlimited integrations', features: ['Everything in Growth', 'Unlimited AI systems', 'Unlimited custom integrations', 'Dedicated account manager', '99.9% guaranteed SLA', 'Full team training', '24/7 priority support', 'Advanced executive reports'], cta: 'Discuss Scale' },
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

                <div className="py-3 border-y" style={{ borderColor: '#E2EBF8' }}>
                  {!plan.featured && <p className={`text-[10px] mb-0.5 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: '#7A96BE' }}>{content.priceNote}</p>}
                  <p className={`text-2xl font-bold ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: '#0D1B3E' }}>{content.price}</p>
                  <p className={`text-[10px] mt-1 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: '#7A96BE' }}>{content.priceSubNote}</p>
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

        <motion.p initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.6 }}
          className={`text-center text-xs mt-8 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: '#7A96BE' }}>
          {t('السعر يشمل البناء والتركيب والاختبار — الاشتراك للدعم والتشغيل المستمر', 'Price includes build, setup, and testing — subscription covers support and ongoing operations')}
        </motion.p>
      </div>
    </section>
  )
}
