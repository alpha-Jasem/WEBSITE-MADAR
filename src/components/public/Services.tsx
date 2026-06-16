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
    ar: { tag: 'الأقوى للتحويل', title: 'موظف مبيعات AI للرسائل والمكالمات', desc: 'يرد على واتساب والاتصالات، يفهم احتياج المريض، يجاوب الاستفسارات، ويأخذه للخطوة التالية: حجز موعد أو تأكيد.', features: ['رد فوري', 'مكالمات 24/7', 'CRM متكامل', 'العيادات ✓'] },
    en: { tag: 'Best for Conversion', title: 'AI Sales Agent for Messages and Calls', desc: 'Handles WhatsApp and phone calls, understands patient needs, answers inquiries, and moves them to the next step: appointment booking or confirmation.', features: ['Instant response', '24/7 calls', 'CRM integrated', 'Clinics ✓'] },
  },
  {
    icon: MessageSquare,
    gradient: 'linear-gradient(135deg, #0099CC, #00BFFF)',
    glow: 'rgba(0,191,255,0.12)',
    glowHover: 'rgba(0,191,255,0.22)',
    featured: false,
    ar: { tag: 'قنوات التواصل', title: 'واتساب + Voice Agent في مسار واحد', desc: 'نحوّل الرسالة أو المكالمة إلى رحلة واضحة: ترحيب، أسئلة تأهيل، عرض مناسب، تأكيد حجز، ثم متابعة.', features: ['واتساب', 'Voice Agent', 'تحليلات حية'] },
    en: { tag: 'Channels', title: 'WhatsApp + Voice Agent in One Flow', desc: 'We turn a message or phone call into a clear journey: greeting, qualification, offer, booking confirmation, then follow-up.', features: ['WhatsApp', 'Voice Agent', 'Live analytics'] },
  },
  {
    icon: Calendar,
    gradient: 'linear-gradient(135deg, #1E40AF, #0099CC)',
    glow: 'rgba(0,153,204,0.12)',
    glowHover: 'rgba(0,153,204,0.22)',
    featured: false,
    ar: { tag: 'جدولة', title: 'حجوزات تلقائية بدون ضغط على الفريق', desc: 'العميل يختار الخدمة والوقت، والنظام يؤكد ويرسل التذكيرات ويقلل الغياب بدون مكالمات متكررة.', features: ['حجز 24/7', 'تذكير تلقائي', 'تقليل الغياب'] },
    en: { tag: 'Scheduling', title: 'Automatic Bookings Without Team Pressure', desc: 'Customers choose the service and time, then the system confirms, reminds, and reduces no-shows without repeated calls.', features: ['24/7 booking', 'Auto reminders', 'Fewer no-shows'] },
  },
  {
    icon: Database,
    gradient: 'linear-gradient(135deg, #0D1B3E, #1565C0)',
    glow: 'rgba(21,101,192,0.12)',
    glowHover: 'rgba(21,101,192,0.22)',
    featured: false,
    ar: { tag: 'CRM', title: 'CRM يعرف من يجب متابعته', desc: 'كل عميل يدخل تلقائياً مع حالته واهتمامه وآخر تواصل، حتى لا تضيع فرصة بسبب نسيان أو فوضى.', features: ['إدخال تلقائي', 'تقارير مبيعات', 'تقسيم العملاء'] },
    en: { tag: 'CRM', title: 'CRM That Knows Who Needs Follow-Up', desc: 'Every customer is captured with status, interest, and last touchpoint so opportunities do not disappear in messy handoffs.', features: ['Auto data entry', 'Sales reports', 'Segmentation'] },
  },
  {
    icon: TrendingUp,
    gradient: 'linear-gradient(135deg, #00BFFF, #0D1B3E)',
    glow: 'rgba(0,191,255,0.12)',
    glowHover: 'rgba(0,191,255,0.22)',
    featured: false,
    ar: { tag: 'نمو', title: 'محرك اقتراحات لزيادة الإيراد', desc: 'يكشف العملاء الخاملين، الأيام الضعيفة، والخدمات الأكثر طلباً، ثم يقترح حملة جاهزة بضغطة واحدة.', features: ['متابعة تلقائية', 'عروض مخصصة', 'تحليل pipeline'] },
    en: { tag: 'Growth', title: 'Revenue Suggestion Engine', desc: 'Detects inactive customers, weak booking days, and top services, then suggests a campaign you can launch in one click.', features: ['Auto follow-ups', 'Custom offers', 'Pipeline analysis'] },
  },
  {
    icon: Smartphone,
    gradient: 'linear-gradient(135deg, #1565C0, #0099CC)',
    glow: 'rgba(21,101,192,0.12)',
    glowHover: 'rgba(21,101,192,0.22)',
    featured: false,
    ar: { tag: 'تطبيقات', title: 'بوابات وتطبيقات متصلة بالنظام', desc: 'لوحة إدارة، بوابة عميل، أو تطبيق جوال مرتب ومربوط بالحجوزات والـ CRM وواتساب حسب احتياجك.', features: ['iOS & Android', 'UI/UX احترافي', 'ربط AI كامل'] },
    en: { tag: 'Apps', title: 'Dashboards and Apps Connected to the System', desc: 'Admin dashboard, customer portal, or mobile app connected to bookings, CRM, and WhatsApp based on your needs.', features: ['iOS & Android', 'Professional UI/UX', 'Full AI integration'] },
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
              {t('ما الذي يشتغل بدل فريقك', 'What Works Instead of Your Team')}
            </span>
          </div>
          <h2 className={`text-4xl sm:text-5xl font-bold mb-4 ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: 'white' }}>
            {t(<>نظام واحد يمسك<br /><span className="gradient-text-blue">الرسائل والمكالمات والحجوزات</span></>, <>One System Handles<br /><span className="gradient-text-blue">Messages, Calls, Bookings</span></>)}
          </h2>
          <p className={`text-lg max-w-xl mx-auto ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.55)' }}>
            {t('بدل ما تشتري أدوات كثيرة، نبني لك مسار تشغيل واحد يحوّل الرسائل والمكالمات إلى نتائج قابلة للقياس.', 'Instead of buying scattered tools, we build one operating flow that turns messages and calls into measurable outcomes.')}
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
            {t('نبدأ من هدفك التجاري، ثم نبني النظام الذي يحقق الرقم المطلوب', 'We start from your business goal, then build the system that moves the number')}
          </p>
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(0,191,255,0.35)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => openWhatsAppChat()}
            className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-white font-semibold cursor-pointer ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
            style={{ background: 'linear-gradient(135deg, #0D1B3E, #0099CC)', boxShadow: '0 0 25px rgba(0,153,204,0.3)' }}
          >
            {t('ابنِ نظام المبيعات الآلي', 'Build My Automated Sales System')}
            <ArrowUpRight size={16} />
          </motion.button>
        </motion.div>
      </div>
    </section>
  )
}
