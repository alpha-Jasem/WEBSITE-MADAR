import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Stethoscope, ArrowLeft, ArrowRight, Check, Clock, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'

const products = [
  {
    id: 'clinic',
    href: '/clinic-os',
    icon: Stethoscope,
    accent: '#10B981',
    glow: 'rgba(16,185,129,0.18)',
    gradient: 'linear-gradient(135deg, #0D2B1E 0%, #10B981 100%)',
    badge: null,
    ar: {
      tag: 'Clinic OS',
      name: 'نظام تشغيل العيادة',
      tagline: 'مها تحجز، تذكّر، وتدير — وأنت مرتاح',
      features: ['مساعد صوتي (مها) 24/7', 'حجز بدون تعارض', 'داشبورد + Google Calendar'],
      metric: { value: '٧٨٪', label: 'نسبة تحويل المرضى' },
      cta: 'اكتشف Clinic OS',
      ctaEn: 'Explore Clinic OS',
    },
    en: {
      tag: 'Clinic OS',
      name: 'Clinic Operating System',
      tagline: 'Maha Books, Reminds, and Manages — You Rest',
      features: ['Voice agent (Maha) 24/7', 'Zero double-booking', 'Dashboard + Google Calendar'],
      metric: { value: '78%', label: 'Patient conversion rate' },
      cta: 'Explore Clinic OS',
      ctaEn: 'Explore Clinic OS',
    },
  },
]

export const ProductsSection = () => {
  const { t, language } = useLanguage()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section id="products" ref={ref} className="relative py-20 sm:py-28 overflow-hidden"
      style={{ background: '#F1F5F9' }}>

      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      <div className="absolute top-0 inset-x-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.3), rgba(16,185,129,0.2), transparent)' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-14 sm:mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5"
            style={{ background: 'rgba(0,191,255,0.08)', border: '1px solid rgba(0,191,255,0.2)' }}>
            <Zap size={12} style={{ color: '#00BFFF' }} />
            <span className={`text-xs font-semibold tracking-widest uppercase ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
              style={{ color: '#00BFFF' }}>
              {t('منتجاتنا', 'Our Products')}
            </span>
          </div>
          <h2 className={`text-3xl sm:text-5xl font-bold mb-4 ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}
            style={{ color: '#0D1B3E' }}>
            {t(
              <><span className="gradient-text-blue">نظام تشغيل</span> مخصص لعملك<br />لا أداة عامة</>,
              <>A Dedicated <span className="gradient-text-blue">Operating System</span><br />Not a Generic Tool</>
            )}
          </h2>
          <p className={`text-base sm:text-lg max-w-xl mx-auto ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
            style={{ color: '#64748B' }}>
            {t(
              'كل منتج مبني خصيصاً لقطاعه — نفس البنية التحتية، لكن workflow وبيانات ولوحة تحكم مختلفة.',
              'Each product is purpose-built for its sector — same infrastructure, but different workflows, data, and dashboard.'
            )}
          </p>
        </motion.div>

        {/* Product cards */}
        <div className="grid grid-cols-1 gap-5 max-w-xl mx-auto">
          {products.map((p, i) => {
            const Icon = p.icon
            const content = language === 'ar' ? p.ar : p.en
            const ArrowIcon = language === 'ar' ? ArrowLeft : ArrowRight
            const isComingSoon = p.href === null
            const isExternal = (p as { external?: boolean }).external === true

            const CardInner = (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 40 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.65, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                whileHover={!isComingSoon ? { y: -6, boxShadow: `0 24px 60px ${p.glow}` } : {}}
                className={`relative flex flex-col gap-5 p-6 rounded-2xl overflow-hidden h-full ${isComingSoon ? 'opacity-60' : ''}`}
                style={{
                  background: '#FFFFFF',
                  border: `1px solid rgba(0,0,0,0.08)`,
                  transition: 'box-shadow 0.25s ease, transform 0.25s ease',
                  boxShadow: '0 2px 12px rgba(13,27,62,0.06)',
                }}
              >
                {/* Top accent bar */}
                <div className="absolute top-0 inset-x-0 h-[2px]" style={{ background: p.gradient }} />

                {/* Badge */}
                {p.badge && (
                  <div className="absolute top-4 end-4 px-2.5 py-1 rounded-full text-[10px] font-bold"
                    style={{ background: `${p.accent}22`, border: `1px solid ${p.accent}40`, color: p.accent }}>
                    {language === 'ar' ? p.badge.ar : p.badge.en}
                  </div>
                )}

                {/* Icon + tag */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: p.gradient, boxShadow: `0 6px 20px ${p.glow}` }}>
                    <Icon size={22} className="text-white" />
                  </div>
                  <span className="text-[11px] font-semibold font-work px-2.5 py-1 rounded-full"
                    style={{ background: `${p.accent}15`, color: p.accent, border: `1px solid ${p.accent}30` }}>
                    {content.tag}
                  </span>
                </div>

                {/* Name + tagline */}
                <div>
                  <h3 className={`text-lg font-bold mb-1 text-[#0D1B3E] ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}>
                    {content.name}
                  </h3>
                  <p className={`text-xs leading-relaxed ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
                    style={{ color: '#64748B' }}>
                    {content.tagline}
                  </p>
                </div>

                {/* Features */}
                <div className="flex flex-col gap-2 flex-1">
                  {content.features.map((f, fi) => (
                    <div key={fi} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: `${p.accent}18` }}>
                        <Check size={9} style={{ color: p.accent }} strokeWidth={3} />
                      </div>
                      <span className={`text-xs ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
                        style={{ color: '#475569' }}>
                        {f}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Metric */}
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl w-fit"
                  style={{ background: `${p.accent}10`, border: `1px solid ${p.accent}25` }}>
                  <Clock size={12} style={{ color: p.accent }} />
                  <div>
                    <span className={`text-sm font-bold ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}
                      style={{ color: p.accent }}>
                      {content.metric.value}
                    </span>
                    <span className={`text-[10px] ms-1.5 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
                      style={{ color: '#94A3B8' }}>
                      {content.metric.label}
                    </span>
                  </div>
                </div>

                {/* CTA */}
                <div
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${isComingSoon ? 'cursor-default' : 'cursor-pointer'} ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
                  style={isComingSoon
                    ? { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.08)' }
                    : { background: p.gradient, color: 'white', boxShadow: `0 4px 16px ${p.glow}` }
                  }
                >
                  <span>{language === 'ar' ? p.ar.cta : p.en.cta}</span>
                  {!isComingSoon && <ArrowIcon size={14} />}
                </div>
              </motion.div>
            )

            return isComingSoon ? (
              <div key={p.id}>{CardInner}</div>
            ) : isExternal ? (
              <a key={p.id} href={p.href!} target="_blank" rel="noopener noreferrer" className="block" style={{ textDecoration: 'none' }}>
                {CardInner}
              </a>
            ) : (
              <Link key={p.id} to={p.href!} className="block">
                {CardInner}
              </Link>
            )
          })}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8, duration: 0.5 }}
          className={`text-center text-sm mt-10 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
          style={{ color: '#94A3B8' }}
        >
          {t(
            'كل منتج مبني، مختبر، وشغّال في الإنتاج — مو نموذج تجريبي',
            'Every product is built, tested, and live in production — not a prototype'
          )}
        </motion.p>
      </div>
    </section>
  )
}
