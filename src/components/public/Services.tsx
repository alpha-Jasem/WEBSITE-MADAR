import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Bot, MessageSquare, Calendar, Database, TrendingUp, Sparkles, ArrowUpRight, Smartphone } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { openWhatsAppChat } from '../../lib/whatsapp'

const services = [
  {
    icon: Bot,
    gradient: 'linear-gradient(135deg, #0D1B3E, #00BFFF)',
    glow: 'rgba(0,191,255,0.12)',
    glowHover: 'rgba(0,191,255,0.22)',
    featured: true,
    ar: { tag: 'الأكثر طلباً', title: 'وكلاء ذكاء اصطناعي للعملاء', desc: 'ردود فورية، ذكية، وشخصية على مدار الساعة. وكيل AI يرد على كل استفسار، ويتعامل مع الاعتراضات، ويوجّه العميل نحو الشراء.', features: ['رد < 1 ثانية', 'عربي وإنجليزي', 'CRM متكامل'] },
    en: { tag: 'Most Popular', title: 'AI Customer Support Agents', desc: 'Instant, intelligent, personalized responses 24/7. An AI agent that handles inquiries, overcomes objections, and guides customers to purchase.', features: ['< 1s response', 'AR & EN support', 'CRM integrated'] },
  },
  {
    icon: MessageSquare,
    gradient: 'linear-gradient(135deg, #0284C7, #06B6D4)',
    glow: 'rgba(6,182,212,0.12)',
    glowHover: 'rgba(6,182,212,0.22)',
    featured: false,
    ar: { tag: 'واتساب', title: 'أتمتة واتساب الذكية', desc: 'نردّ على عملائك في واتساب تلقائياً — من أول رسالة وحتى إتمام الحجز والمتابعة.', features: ['ردود تلقائية', 'متابعة مبيعات', 'تحليلات حية'] },
    en: { tag: 'WhatsApp', title: 'Smart WhatsApp Automation', desc: 'Automatically respond on WhatsApp — from the first message all the way to booking confirmation and follow-up.', features: ['Auto responses', 'Sales follow-ups', 'Live analytics'] },
  },
  {
    icon: Calendar,
    gradient: 'linear-gradient(135deg, #1E40AF, #0099CC)',
    glow: 'rgba(0,153,204,0.12)',
    glowHover: 'rgba(0,153,204,0.22)',
    featured: false,
    ar: { tag: 'جدولة', title: 'نظام حجز المواعيد AI', desc: 'عملاؤك يحجزون مواعيدهم تلقائياً — التذكير، إعادة الجدولة، والتأكيد يحدث بلا موظفين.', features: ['حجز 24/7', 'تذكير تلقائي', 'تقليل الغياب 80%'] },
    en: { tag: 'Scheduling', title: 'AI Appointment Booking', desc: 'Customers book automatically — reminders, rescheduling, and confirmations happen without staff involvement.', features: ['24/7 booking', 'Auto reminders', '80% less no-shows'] },
  },
  {
    icon: Database,
    gradient: 'linear-gradient(135deg, #0D1B3E, #1565C0)',
    glow: 'rgba(21,101,192,0.12)',
    glowHover: 'rgba(21,101,192,0.22)',
    featured: false,
    ar: { tag: 'CRM', title: 'أتمتة إدارة العلاقات', desc: 'تسجيل تلقائي للعملاء، متابعة المبيعات، وتحليل سلوك العملاء في لوحة واحدة.', features: ['إدخال تلقائي', 'تقارير مبيعات', 'تقسيم العملاء'] },
    en: { tag: 'CRM', title: 'CRM Automation', desc: 'Automatic customer registration, sales tracking, and behavior analysis in one unified dashboard.', features: ['Auto data entry', 'Sales reports', 'Segmentation'] },
  },
  {
    icon: TrendingUp,
    gradient: 'linear-gradient(135deg, #06B6D4, #0D1B3E)',
    glow: 'rgba(6,182,212,0.12)',
    glowHover: 'rgba(6,182,212,0.22)',
    featured: false,
    ar: { tag: 'مبيعات AI', title: 'مساعد المبيعات الذكي', desc: 'وكيل AI يتابع المحتملين، يرسل عروضاً مخصصة، ويغلق الصفقات — موظف مبيعات لا يتعب.', features: ['متابعة تلقائية', 'عروض مخصصة', 'تحليل pipeline'] },
    en: { tag: 'AI Sales', title: 'AI Sales Assistant', desc: 'An AI agent that follows up with prospects, sends personalized offers, and closes deals — a sales rep that never sleeps.', features: ['Auto follow-ups', 'Custom offers', 'Pipeline analysis'] },
  },
  {
    icon: Smartphone,
    gradient: 'linear-gradient(135deg, #7C3AED, #0D1B3E)',
    glow: 'rgba(124,58,237,0.12)',
    glowHover: 'rgba(124,58,237,0.22)',
    featured: false,
    ar: { tag: 'تطبيقات', title: 'تطبيقات الجوال iOS & Android', desc: 'نبني تطبيقات احترافية لعملك على iOS وAndroid — سريعة، جميلة، ومتكاملة مع أنظمة AI وواتساب.', features: ['iOS & Android', 'UI/UX احترافي', 'ربط AI كامل'] },
    en: { tag: 'Mobile Apps', title: 'iOS & Android Mobile Apps', desc: 'We build professional mobile apps for your business on iOS & Android — fast, beautiful, and fully integrated with AI systems and WhatsApp.', features: ['iOS & Android', 'Professional UI/UX', 'Full AI integration'] },
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 40, scale: 0.97 },
  visible: (i: number) => ({ opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] } }),
}

export const Services = () => {
  const { t, language } = useLanguage()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '0px' })

  return (
    <section id="services" ref={ref} className="relative py-28 overflow-hidden" style={{ background: '#050810' }}>
      <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.3), transparent)' }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,191,255,0.04) 0%, transparent 70%)' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7 }} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4" style={{ background: 'rgba(0,191,255,0.08)', border: '1px solid rgba(0,191,255,0.2)' }}>
            <Sparkles size={12} style={{ color: '#00BFFF' }} />
            <span className={`text-xs font-medium ${language === 'ar' ? 'font-cairo' : 'font-work'}`} style={{ color: 'white' }}>
              {t('حلول مدار AI', 'MADAR AI Solutions')}
            </span>
          </div>
          <h2 className={`text-4xl sm:text-5xl font-bold mb-4 ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: 'white' }}>
            {t(<>ما نبنيه لك<br /><span className="gradient-text-blue">من أنظمة AI</span></>, <>What We Build<br /><span className="gradient-text-blue">For Your Business</span></>)}
          </h2>
          <p className={`text-lg max-w-xl mx-auto ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.55)' }}>
            {t('أنظمة جاهزة للتشغيل، مخصصة لعملك، ومُتكاملة مع أدواتك الحالية.', 'Production-ready systems, customized for your business, integrated with your existing tools.')}
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((svc, i) => {
            const Icon = svc.icon
            const content = language === 'ar' ? svc.ar : svc.en
            return (
              <motion.div
                key={i}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate={inView ? 'visible' : 'hidden'}
                whileHover={{ y: -5, boxShadow: `0 20px 55px ${svc.glowHover}`, transition: { duration: 0.22 } }}
                className={`relative group p-6 rounded-2xl cursor-pointer overflow-hidden flex flex-col gap-4 ${i === 0 ? 'lg:col-span-2' : ''}`}
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${svc.featured ? 'rgba(0,191,255,0.4)' : 'rgba(255,255,255,0.07)'}`, boxShadow: svc.featured ? `0 4px 20px rgba(0,191,255,0.12)` : 'none' }}
              >
                <div className="absolute top-0 inset-x-0 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: svc.gradient }} />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl" style={{ background: `radial-gradient(ellipse at top left, ${svc.glow} 0%, transparent 55%)` }} />

                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: svc.gradient }}>
                      <Icon size={18} className="text-white" />
                    </div>
                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
                      style={{ background: 'rgba(0,191,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
                      {content.tag}
                    </span>
                  </div>
                  <ArrowUpRight size={15} style={{ color: '#7A96BE' }} className="group-hover:text-[#0D1B3E] transition-colors duration-200" />
                </div>

                <div className="flex-1">
                  <h3 className={`text-base font-bold mb-2 ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: 'white' }}>{content.title}</h3>
                  <p className={`text-sm leading-relaxed ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.55)' }}>{content.desc}</p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {content.features.map((f, fi) => (
                    <span key={fi} className={`text-[11px] px-2.5 py-1 rounded-lg ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {f}
                    </span>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.5 }} className="text-center mt-12">
          <p className={`text-sm mb-4 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: '#7A96BE' }}>
            {t('كل هذه الأنظمة مخصصة لعملك — لا حلول جاهزة عامة', 'All systems are custom-built — no generic templates')}
          </p>
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(0,191,255,0.35)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => openWhatsAppChat()}
            className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-white font-semibold cursor-pointer ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
            style={{ background: 'linear-gradient(135deg, #0D1B3E, #0099CC)', boxShadow: '0 0 25px rgba(0,153,204,0.3)' }}
          >
            {t('ناقش مشروعك معنا', 'Discuss Your Project')}
            <ArrowUpRight size={16} />
          </motion.button>
        </motion.div>
      </div>
    </section>
  )
}
