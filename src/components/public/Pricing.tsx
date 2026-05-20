import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Check, Sparkles, ArrowRight, Zap } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { openWhatsAppChat } from '../../lib/whatsapp'

const plans = [
  {
    key: 'starter',
    gradient: 'linear-gradient(135deg, rgba(13,27,62,0.03), rgba(0,191,255,0.03))',
    border: '#E2EBF8',
    featured: false,
    ar: { name: 'Starter', tagline: 'لبداية الردود الذكية', price: 'حسب المشروع', priceNote: 'يبدأ من', desc: 'نظام رد ذكي يوقف ضياع الرسائل والمكالمات ويعطيك بداية واضحة', features: ['رد واتساب أو مكالمات AI', 'حتى ١٠٠٠ تفاعل شهرياً', 'تكامل مع منصة واحدة', 'لوحة تحليلات بسيطة', 'دعم تقني شهر واحد'], cta: 'ابدأ بإيقاف التسرب' },
    en: { name: 'Starter', tagline: 'Start Smart Replies', price: 'Project-Based', priceNote: 'Starting from', desc: 'A smart response system that stops missed messages and calls and gives you a clear starting point', features: ['WhatsApp or AI call response', 'Up to 1,000 interactions/month', 'Single platform integration', 'Basic analytics dashboard', '1 month technical support'], cta: 'Stop the Leak' },
  },
  {
    key: 'growth',
    gradient: 'linear-gradient(135deg, rgba(13,27,62,0.03), rgba(0,191,255,0.05))',
    border: '#00BFFF',
    featured: true,
    ar: { name: 'Growth', tagline: 'لتحويل التواصل إلى حجوزات', price: 'حسب المشروع', priceNote: 'الأكثر شيوعاً', desc: 'النظام الكامل للرد على الرسائل والمكالمات، الحجز، المتابعة، والتحليلات في مكان واحد', features: ['وكيل AI واتساب + مكالمات', 'نظام حجز مواعيد متكامل', 'أتمتة CRM كاملة', 'تفاعلات غير محدودة', 'تكامل مع ٣ منصات', 'لوحة تحليلات متقدمة', 'دعم تقني ٦ أشهر', 'تقارير أداء أسبوعية'], cta: 'ابنِ محرك النمو' },
    en: { name: 'Growth', tagline: 'Turn Contact Into Bookings', price: 'Project-Based', priceNote: 'Most Popular', desc: 'The complete system for messages, calls, booking, follow-up, and analytics in one place', features: ['AI WhatsApp + voice agent', 'Integrated appointment booking', 'Full CRM automation', 'Unlimited interactions', 'Integration with 3 platforms', 'Advanced analytics dashboard', '6 months technical support', 'Weekly performance reports'], cta: 'Build the Growth Engine' },
  },
  {
    key: 'enterprise',
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.05), rgba(239,68,68,0.03))',
    border: '#E2EBF8',
    featured: false,
    ar: { name: 'Enterprise', tagline: 'لمن يريد نظام تشغيل كامل', price: 'تسعير مخصص', priceNote: 'تواصل معنا', desc: 'منظومة تشغيل ومبيعات متعددة الفروع مع دعم مخصص وتكاملات بلا حدود', features: ['جميع مزايا Growth', 'أنظمة AI غير محدودة', 'تكاملات مخصصة بلا حدود', 'مدير حساب مخصص', 'SLA مضمون ٩٩.٩٪', 'تدريب الفريق الكامل', 'دعم أولوية ٢٤/٧', 'تقارير تنفيذية متقدمة'], cta: 'ناقش التوسع' },
    en: { name: 'Enterprise', tagline: 'For a Full Operating System', price: 'Custom Pricing', priceNote: 'Contact Us', desc: 'Multi-branch sales and operations system with dedicated support and unlimited integrations', features: ['Everything in Growth', 'Unlimited AI systems', 'Unlimited custom integrations', 'Dedicated account manager', '99.9% guaranteed SLA', 'Full team training', '24/7 priority support', 'Advanced executive reports'], cta: 'Discuss Scale' },
  },
]

export const Pricing = () => {
  const { t, language } = useLanguage()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="pricing" ref={ref} className="relative py-28 overflow-hidden" style={{ background: '#F7FAFF' }}>
      <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.3), transparent)' }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,191,255,0.04) 0%, transparent 70%)' }} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7 }} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4" style={{ background: 'rgba(0,191,255,0.08)', border: '1px solid rgba(0,191,255,0.2)' }}>
            <Zap size={12} style={{ color: '#00BFFF' }} />
            <span className={`text-xs font-medium ${language === 'ar' ? 'font-cairo' : 'font-work'}`} style={{ color: '#0D1B3E' }}>
              {t('استثمار مبني على العائد', 'ROI-Based Investment')}
            </span>
          </div>
          <h2 className={`text-4xl sm:text-5xl font-bold mb-4 ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: '#0D1B3E' }}>
            {t(<>لا تشتري تقنية<br /><span className="gradient-text-blue">اشترِ نظام يجلب حجوزات</span></>, <>Do Not Buy Technology<br /><span className="gradient-text-blue">Buy a System That Brings Bookings</span></>)}
          </h2>
          <p className={`text-lg max-w-xl mx-auto ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: '#3B5280' }}>
            {t('نحدد السعر بعد فهم حجم الرسائل والمكالمات، مسار البيع، وعدد التكاملات المطلوبة حتى يكون المشروع واضح العائد.', 'Pricing is defined after we understand message and call volume, sales flow, and required integrations so the project has a clear return.')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {plans.map((plan, i) => {
            const content = language === 'ar' ? plan.ar : plan.en
            return (
              <motion.div
                key={plan.key}
                initial={{ opacity: 0, y: 40 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -5, transition: { duration: 0.22 } }}
                className={`relative flex flex-col gap-5 p-6 rounded-2xl overflow-hidden bg-white ${plan.featured ? 'lg:scale-105' : ''}`}
                style={{ background: plan.gradient, border: `1px solid ${plan.border}`, boxShadow: plan.featured ? '0 0 40px rgba(0,191,255,0.12)' : '0 4px 16px rgba(13,27,62,0.07)' }}
              >
                {plan.featured && <div className="absolute top-0 inset-x-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #0D1B3E, #00BFFF, #1565C0)' }} />}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`text-xl font-bold ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: '#0D1B3E' }}>{content.name}</h3>
                    {plan.featured && (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: 'linear-gradient(135deg, #0D1B3E, #1565C0)' }}>
                        <Sparkles size={10} className="text-white" />
                        <span className="text-[10px] text-white font-work font-medium">{content.priceNote}</span>
                      </div>
                    )}
                  </div>
                  <p className={`text-xs ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: '#7A96BE' }}>{content.tagline}</p>
                </div>

                <div className="py-3 border-y" style={{ borderColor: '#E2EBF8' }}>
                  {!plan.featured && <p className={`text-[10px] mb-0.5 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: '#7A96BE' }}>{content.priceNote}</p>}
                  <p className={`text-2xl font-bold ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: '#0D1B3E' }}>{content.price}</p>
                </div>

                <p className={`text-sm ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: '#3B5280' }}>{content.desc}</p>

                <div className="flex flex-col gap-2.5 flex-1">
                  {content.features.map((f, fi) => (
                    <div key={fi} className="flex items-start gap-2">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: plan.featured ? 'rgba(0,191,255,0.15)' : '#F0F4FA' }}>
                        <Check size={9} style={{ color: '#00BFFF' }} />
                      </div>
                      <span className={`text-xs ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: '#3B5280' }}>{f}</span>
                    </div>
                  ))}
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => openWhatsAppChat()}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold cursor-pointer transition-all ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
                  style={plan.featured
                    ? { background: 'linear-gradient(135deg, #0D1B3E, #1565C0)', color: 'white', boxShadow: '0 0 20px rgba(13,27,62,0.25)' }
                    : { background: 'white', color: '#0D1B3E', border: '1.5px solid #0D1B3E' }
                  }
                >
                  {content.cta}
                  <ArrowRight size={14} className={language === 'ar' ? 'rotate-180' : ''} />
                </motion.button>
              </motion.div>
            )
          })}
        </div>

        <motion.p initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.6 }}
          className={`text-center text-xs mt-8 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: '#7A96BE' }}>
          {t('جميع المشاريع تشمل: تحليل تسرب مجاني، بناء مخصص، اختبار قبل الإطلاق، وخطة تحسين بعد التشغيل', 'All projects include: free leakage analysis, custom build, pre-launch testing, and a post-launch optimization plan')}
        </motion.p>
      </div>
    </section>
  )
}
