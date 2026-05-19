import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { ShieldCheck, TimerReset, MessagesSquare, LayoutDashboard, ArrowUpLeft } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { openWhatsAppChat } from '../../lib/whatsapp'

const proofStats = [
  {
    valueAr: '24/7',
    valueEn: '24/7',
    labelAr: 'تغطية للرد على الاستفسارات',
    labelEn: 'Inquiry Coverage',
    noteAr: 'حتى خارج أوقات الدوام',
    noteEn: 'Even outside business hours',
  },
  {
    valueAr: '14',
    valueEn: '14',
    labelAr: 'يوم ضمان على التنفيذ',
    labelEn: 'Day Delivery Guarantee',
    noteAr: 'ضمن ما يتم الاتفاق عليه',
    noteEn: 'On the agreed scope',
  },
  {
    valueAr: '1',
    valueEn: '1',
    labelAr: 'لوحة تشغيل أوضح للفريق',
    labelEn: 'Unified Operations View',
    noteAr: 'متابعة أسهل للحجوزات والطلبات',
    noteEn: 'Cleaner visibility across requests',
  },
]

const promiseCards = [
  {
    icon: MessagesSquare,
    color: '#4F6EF7',
    ar: {
      title: 'رسالة أوضح للعميل',
      desc: 'نرتب المحتوى والصفحات بحيث يعرف الزائر سريعًا ماذا تقدم له ولماذا يختارك.',
    },
    en: {
      title: 'Sharper Offer Messaging',
      desc: 'We structure the page so prospects quickly understand what you do and why they should choose you.',
    },
  },
  {
    icon: TimerReset,
    color: '#D4A853',
    ar: {
      title: 'تأخر أقل في الرد والمتابعة',
      desc: 'نبني تدفقات متابعة وتذكير تقلل فقدان الفرص وتخفف الضغط على الفريق.',
    },
    en: {
      title: 'Less Delay in Follow-Up',
      desc: 'We build response and reminder flows that reduce drop-off and ease pressure on the team.',
    },
  },
  {
    icon: LayoutDashboard,
    color: '#10B981',
    ar: {
      title: 'تشغيل يمكن قياسه',
      desc: 'الهدف ليس مجرد أتمتة، بل تشغيل مرتب يمكن مراجعته وتحسينه بمرور الوقت.',
    },
    en: {
      title: 'A Workflow You Can Measure',
      desc: 'The goal is not automation for its own sake, but a setup your team can review and improve over time.',
    },
  },
]

const deliveryPoints = [
  {
    ar: 'بناء المحتوى حول العرض الحقيقي وليس كلامًا عامًا.',
    en: 'Messaging built around your real offer, not generic copy.',
  },
  {
    ar: 'تصميم واجهات تدفع الزائر لإجراء واضح ومباشر.',
    en: 'Interfaces designed around clear next actions and conversion.',
  },
  {
    ar: 'ربط بين الاستفسار، واتساب، والمتابعة بدل العمل المتشتت.',
    en: 'A connected flow from inquiry to WhatsApp to follow-up.',
  },
  {
    ar: 'تسليم يمكن استخدامه فعليًا وليس مجرد شكل جميل.',
    en: 'A delivery your team can actually use, not just admire.',
  },
]

export const Portfolio = () => {
  const { language, t } = useLanguage()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="portfolio" className="py-24 px-4 sm:px-6 lg:px-8 relative" ref={ref}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary-500/20 to-transparent" />
        <div className="absolute inset-0 grid-bg opacity-10" />
      </div>

      <div className="max-w-6xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className={`inline-block text-sm text-primary-400 font-semibold tracking-widest uppercase mb-3 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
            {t('لماذا يبدو التنفيذ احترافيًا', 'Why the Delivery Feels Premium')}
          </span>
          <h2 className={`text-4xl sm:text-5xl font-bold text-white mb-4 ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
            {t('الثقة لا تأتي من التصميم فقط', 'Trust Comes From More Than Visual Design')}
          </h2>
          <p className={`text-slate-400 text-lg max-w-3xl mx-auto ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
            {t(
              'رفع جودة الموقع لا يعني إضافة مؤثرات أكثر، بل بناء رسالة أقوى، عرض أوضح، ومسار استخدام يجعل العميل يعرف ماذا يفعل بعد كل قسم.',
              'A premium website is not about more effects. It is about clearer positioning, a stronger offer, and a user flow that always points to the next step.'
            )}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {proofStats.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="glass rounded-3xl border border-white/8 p-6 text-center"
            >
              <div className="text-4xl font-bold gradient-text font-outfit mb-2">
                {language === 'ar' ? item.valueAr : item.valueEn}
              </div>
              <p className={`text-sm text-white mb-1 ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
                {language === 'ar' ? item.labelAr : item.labelEn}
              </p>
              <p className={`text-xs text-slate-500 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
                {language === 'ar' ? item.noteAr : item.noteEn}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 items-stretch">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="glass rounded-[28px] border border-white/8 p-7 sm:p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <ShieldCheck size={20} className="text-emerald-400" />
              </div>
              <div>
                <h3 className={`text-xl text-white font-bold ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
                  {t('المعيار الذي نشتغل عليه', 'The Standard We Build Against')}
                </h3>
                <p className={`text-sm text-slate-500 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
                  {t('كل قسم في الصفحة يجب أن يجيب على سؤال عند العميل', 'Every section should answer a real buyer question')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {promiseCards.map((card, index) => {
                const Icon = card.icon
                const content = language === 'ar' ? card.ar : card.en
                return (
                  <div key={index} className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: `${card.color}16`, border: `1px solid ${card.color}35` }}
                    >
                      <Icon size={18} style={{ color: card.color }} />
                    </div>
                    <p className={`text-sm text-white font-semibold mb-2 ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
                      {content.title}
                    </p>
                    <p className={`text-xs leading-relaxed text-slate-500 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
                      {content.desc}
                    </p>
                  </div>
                )
              })}
            </div>

            <div className="rounded-2xl border border-primary-500/20 bg-primary-500/[0.06] p-5">
              <p className={`text-sm text-white mb-3 ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
                {t('ما الذي يفرق النسخة القوية عن النسخة العادية؟', 'What Separates a Strong Site From an Average One?')}
              </p>
              <ul className="space-y-3">
                {deliveryPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-primary-400 flex-shrink-0" />
                    <span className={`text-sm text-slate-300 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
                      {language === 'ar' ? point.ar : point.en}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="rounded-[28px] border border-white/8 bg-gradient-to-br from-[#111B34] via-[#0D1526] to-[#08111F] p-7 sm:p-8"
          >
            <p className={`text-xs text-primary-400 uppercase tracking-[0.25em] mb-3 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
              {t('جاهز للتنفيذ', 'Ready for Deployment')}
            </p>
            <h3 className={`text-2xl text-white font-bold mb-4 leading-tight ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
              {t('إذا أردت نسخة تبيع أكثر، فالمطلوب ليس التجميل فقط', 'If You Want Better Conversion, Design Alone Is Not Enough')}
            </h3>
            <p className={`text-sm text-slate-400 leading-relaxed mb-6 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
              {t(
                'النسخة الأقوى هي التي توضح القيمة بسرعة، تطمئن العميل، وتجعل التواصل أسهل من التردد. لهذا ركزنا على الرسالة، الثقة، والـ CTA في كل جزء.',
                'The best version is the one that explains value fast, builds confidence, and makes action easier than hesitation. That is why the messaging, trust, and CTA structure matter.'
              )}
            </p>

            <div className="rounded-2xl border border-white/8 bg-black/20 p-5 mb-6">
              <p className={`text-sm text-white mb-2 ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
                {t('مناسب إذا كان هدفك:', 'Best Fit If Your Goal Is:')}
              </p>
              <div className="space-y-2">
                {[
                  t('رفع عدد الرسائل الجادة الواردة من الموقع', 'Increase high-intent inquiries from the site'),
                  t('تقليل ضياع الاستفسارات خارج أوقات العمل', 'Reduce lost inquiries outside working hours'),
                  t('تقديم صورة احترافية تليق بخدمة أو باقة مرتفعة القيمة', 'Present a premium brand worthy of high-value offers'),
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
                    <span className={`text-sm text-slate-300 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => openWhatsAppChat(t('مرحباً، أريد نسخة تنفيذ قوية لموقعي مع تدفق واتساب وحجز أوضح', 'Hello, I want a stronger website setup with a clearer WhatsApp and booking flow'))}
              className={`inline-flex items-center gap-2 rounded-2xl bg-primary-500 px-6 py-3.5 text-sm font-semibold text-white shadow-glow transition-all hover:bg-primary-600 ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}
            >
              {t('ابدأ تحسين النسخة', 'Start the Upgrade')}
              <ArrowUpLeft size={16} />
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
