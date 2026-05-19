import { useRef, useState, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import { TrendingUp, Clock, DollarSign, Users, ArrowRight, Sparkles } from 'lucide-react'

const AnimatedStat = ({ value, inView }: { value: string; inView: boolean }) => {
  const num = parseFloat(value.replace(/[^0-9.]/g, ''))
  const suffix = value.replace(/[0-9.]/g, '').trim()
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    if (!inView || isNaN(num)) { setDisplay(value); return }
    let start = 0
    const steps = 40
    const step = num / steps
    const id = setInterval(() => {
      start = Math.min(start + step, num)
      setDisplay(`${Number.isInteger(num) ? Math.round(start) : start.toFixed(1)}${suffix}`)
      if (start >= num) clearInterval(id)
    }, 30)
    return () => clearInterval(id)
  }, [inView, num, suffix, value])

  return <span>{display}</span>
}
import { useLanguage } from '../../context/LanguageContext'
import { openWhatsAppChat } from '../../lib/whatsapp'

const cases = [
  {
    industry: { ar: 'عيادة طبية', en: 'Medical Clinic' },
    tag: { ar: 'واتساب + حجوزات', en: 'WhatsApp + Booking' },
    gradient: 'linear-gradient(135deg, #0D1B3E, #00BFFF)',
    glow: 'rgba(0,191,255,0.12)',
    metrics: [
      { icon: Clock,      before: { ar: '+٣ ساعات',  en: '3+ Hours' },   after: { ar: '< ١ دقيقة', en: '< 1 Min' },   label: { ar: 'وقت الاستجابة', en: 'Response Time' }, color: '#0D1B3E' },
      { icon: Users,      before: { ar: '٣٠%',        en: '30%' },         after: { ar: '٧٨%',        en: '78%' },       label: { ar: 'معدل التحويل',  en: 'Conversion Rate' }, color: '#00BFFF' },
      { icon: DollarSign, before: { ar: '٢٢٠٠٠ ر.س', en: 'SAR 22K' },     after: { ar: '٩٠٠٠ ر.س',  en: 'SAR 9K' },    label: { ar: 'تكلفة شهرية',  en: 'Monthly Cost' }, color: '#1565C0' },
    ],
    testimony: {
      ar: '"كنا نفقد عشرات المرضى شهرياً بسبب التأخر في الرد. الآن النظام يرد في ثوانٍ ويملأ جدولنا تلقائياً."',
      en: '"We were losing dozens of patients monthly due to slow responses. Now the system replies in seconds and fills our schedule automatically."',
    },
    author: { ar: 'د. فارس العمري — عيادة الأمل', en: 'Dr. Faris Al-Omari — Al-Amal Clinic' },
  },
  {
    industry: { ar: 'شركة عقارات', en: 'Real Estate Agency' },
    tag: { ar: 'CRM + مبيعات AI', en: 'CRM + AI Sales' },
    gradient: 'linear-gradient(135deg, #1565C0, #0099CC)',
    glow: 'rgba(21,101,192,0.12)',
    metrics: [
      { icon: TrendingUp,  before: { ar: '١٥%',        en: '15%' },         after: { ar: '٤٢%',        en: '42%' },       label: { ar: 'إغلاق الصفقات',  en: 'Deal Closure' }, color: '#1565C0' },
      { icon: Clock,       before: { ar: '٧٢ ساعة',    en: '72 Hours' },    after: { ar: '٢ ساعة',    en: '2 Hours' },   label: { ar: 'وقت المتابعة',   en: 'Follow-up Time' }, color: '#0099CC' },
      { icon: DollarSign,  before: { ar: '٣.٢م ر.س',   en: 'SAR 3.2M' },    after: { ar: '٨.٧م ر.س',  en: 'SAR 8.7M' },  label: { ar: 'المبيعات الشهرية', en: 'Monthly Sales' }, color: '#1565C0' },
    ],
    testimony: {
      ar: '"النظام يتابع المحتملين أفضل من أي موظف مبيعات. وفّرنا ٦٠٪ من تكاليف المبيعات ورفعنا الإيرادات ١٧٢٪."',
      en: '"The system follows up with prospects better than any salesperson. We saved 60% in sales costs and grew revenue by 172%."',
    },
    author: { ar: 'خالد الدوسري — مجموعة الدوسري العقارية', en: 'Khalid Al-Dosari — Al-Dosari Real Estate Group' },
  },
]

export const CaseStudies = () => {
  const { t, language } = useLanguage()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="case-studies" ref={ref} className="relative py-28 overflow-hidden" style={{ background: '#050810' }}>
      <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.3), transparent)' }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(0,191,255,0.03) 0%, transparent 70%)' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7 }} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4" style={{ background: 'rgba(0,191,255,0.08)', border: '1px solid rgba(0,191,255,0.2)' }}>
            <TrendingUp size={12} style={{ color: '#00BFFF' }} />
            <span className={`text-xs font-medium ${language === 'ar' ? 'font-cairo' : 'font-work'}`} style={{ color: 'white' }}>
              {t('نتائج حقيقية', 'Real Results')}
            </span>
          </div>
          <h2 className={`text-4xl sm:text-5xl font-bold mb-4 ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: 'white' }}>
            {t(<>تحولات حدثت<br /><span className="gradient-text-blue">مع عملائنا</span></>, <>Transformations That<br /><span className="gradient-text-blue">Actually Happened</span></>)}
          </h2>
          <p className={`text-lg max-w-xl mx-auto ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.55)' }}>
            {t('أرقام حقيقية من عملاء حقيقيين — لا وعود، نتائج فعلية قابلة للقياس', 'Real numbers from real clients — no promises, measurable actual results')}
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {cases.map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -5, boxShadow: `0 20px 60px ${c.glow}, 0 0 0 1px ${i === 0 ? 'rgba(0,191,255,0.25)' : 'rgba(21,101,192,0.3)'}`, transition: { duration: 0.22 } }}
              className="flex flex-col gap-0 rounded-2xl overflow-hidden"
              style={{
                background: i === 0
                  ? 'linear-gradient(160deg, rgba(0,191,255,0.07) 0%, rgba(5,8,16,0.95) 50%)'
                  : 'linear-gradient(160deg, rgba(21,101,192,0.1) 0%, rgba(5,8,16,0.95) 50%)',
                border: i === 0 ? '1px solid rgba(0,191,255,0.2)' : '1px solid rgba(21,101,192,0.25)',
                boxShadow: i === 0 ? '0 4px 32px rgba(0,191,255,0.06)' : '0 4px 32px rgba(21,101,192,0.08)',
              }}
            >
              {/* Header */}
              <div className="p-5 flex items-center justify-between"
                style={{
                  borderBottom: i === 0 ? '1px solid rgba(0,191,255,0.12)' : '1px solid rgba(21,101,192,0.18)',
                  background: i === 0 ? 'rgba(0,191,255,0.04)' : 'rgba(21,101,192,0.06)',
                }}>
                <div>
                  <h3 className={`text-base font-bold mb-1 ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: 'white' }}>
                    {language === 'ar' ? c.industry.ar : c.industry.en}
                  </h3>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
                    style={{
                      background: i === 0 ? 'rgba(0,191,255,0.12)' : 'rgba(21,101,192,0.18)',
                      color: i === 0 ? '#00BFFF' : '#4d9fff',
                      border: i === 0 ? '1px solid rgba(0,191,255,0.2)' : '1px solid rgba(77,159,255,0.25)',
                    }}>
                    {language === 'ar' ? c.tag.ar : c.tag.en}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: c.gradient, boxShadow: `0 4px 16px ${c.glow}` }} />
              </div>

              {/* Metrics: Before → After */}
              <div className="p-5 flex flex-col gap-3">
                {c.metrics.map((m, mi) => {
                  const Icon = m.icon
                  const accentColor = i === 0
                    ? ['#00BFFF', '#00e5ff', '#1565C0'][mi]
                    : ['#4d9fff', '#0099CC', '#3d7fd6'][mi]
                  return (
                    <div key={mi} className="flex items-center gap-3 p-3 rounded-xl"
                      style={{
                        background: `rgba(${i === 0 ? '0,191,255' : '21,101,192'},0.05)`,
                        border: `1px solid rgba(${i === 0 ? '0,191,255' : '21,101,192'},0.1)`,
                      }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${accentColor}22`, border: `1px solid ${accentColor}33` }}>
                        <Icon size={14} style={{ color: accentColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[10px] mb-0.5 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.45)' }}>
                          {language === 'ar' ? m.label.ar : m.label.en}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs line-through ${language === 'ar' ? 'font-cairo' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.3)' }}>
                            {language === 'ar' ? m.before.ar : m.before.en}
                          </span>
                          <ArrowRight size={10} style={{ color: accentColor }} />
                          <span className={`text-sm font-bold ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: accentColor, textShadow: `0 0 12px ${accentColor}66` }}>
                            {language === 'ar' ? m.after.ar : m.after.en}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Testimony */}
              <div className="px-5 pb-5 mt-auto">
                <div className="p-4 rounded-xl"
                  style={{
                    background: i === 0 ? 'rgba(0,191,255,0.05)' : 'rgba(21,101,192,0.08)',
                    border: i === 0 ? '1px solid rgba(0,191,255,0.12)' : '1px solid rgba(21,101,192,0.2)',
                  }}>
                  <p className={`text-xs leading-relaxed mb-3 italic ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {language === 'ar' ? c.testimony.ar : c.testimony.en}
                  </p>
                  <p className={`text-[10px] font-semibold ${language === 'ar' ? 'font-cairo' : 'font-work'}`} style={{ color: i === 0 ? 'rgba(0,191,255,0.7)' : 'rgba(77,159,255,0.75)' }}>
                    — {language === 'ar' ? c.author.ar : c.author.en}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.5 }} className="text-center mt-12">
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(0,191,255,0.35)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => openWhatsAppChat()}
            className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-white font-semibold cursor-pointer ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
            style={{ background: 'linear-gradient(135deg, #0D1B3E, #0099CC)', boxShadow: '0 0 25px rgba(0,153,204,0.3)' }}
          >
            <Sparkles size={15} />
            {t('أريد نتائج مثلهم', 'I Want Results Like These')}
          </motion.button>
        </motion.div>
      </div>
    </section>
  )
}
