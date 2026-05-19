import { motion } from 'framer-motion'
import { CheckCircle2, Loader2, Circle } from 'lucide-react'
import { useLanguage } from '../../../context/LanguageContext'

const milestones = [
  { ar: 'الاستشارة الأولية', en: 'Initial Consultation', date: '15 مارس', dateEn: 'Mar 15', status: 'completed', notes: { ar: 'تم مناقشة المتطلبات والأهداف بالتفصيل', en: 'Requirements and goals discussed in detail' } },
  { ar: 'جمع المتطلبات', en: 'Requirements Gathering', date: '18 مارس', dateEn: 'Mar 18', status: 'completed', notes: { ar: 'تم توثيق جميع المتطلبات التقنية', en: 'All technical requirements documented' } },
  { ar: 'التصميم المبدئي', en: 'Design Mockup', date: '25 مارس', dateEn: 'Mar 25', status: 'completed', notes: { ar: 'تم الاعتماد على التصاميم من قبل العميل', en: 'Designs approved by client' } },
  { ar: 'التطوير', en: 'Development', date: '1 أبريل', dateEn: 'Apr 1', status: 'in_progress', notes: { ar: 'جارٍ تطوير الواجهة الأمامية والخلفية', en: 'Frontend and backend development in progress' } },
  { ar: 'الاختبار', en: 'Testing', date: '20 أبريل', dateEn: 'Apr 20', status: 'pending', notes: null },
  { ar: 'الإطلاق', en: 'Launch', date: '25 أبريل', dateEn: 'Apr 25', status: 'pending', notes: null },
]

const statusIcon = (status: string) => {
  if (status === 'completed') return <CheckCircle2 size={18} className="text-emerald-400" />
  if (status === 'in_progress') return <Loader2 size={18} className="text-primary-400 animate-spin" />
  return <Circle size={18} className="text-slate-600" />
}

export const ProjectStatus = () => {
  const { language, t } = useLanguage()
  const completed = milestones.filter((m) => m.status === 'completed').length
  const progress = Math.round((completed / milestones.length) * 100)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className={`text-2xl font-bold text-white ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
          {t('حالة المشروع', 'Project Status')}
        </h1>
        <p className={`text-slate-500 text-sm mt-1 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
          {t('موقع عيادة الشاكرين', 'Al-Shakireen Clinic Website')}
        </p>
      </div>

      {/* Overall progress */}
      <div className="glass rounded-2xl p-5 border border-primary-500/20 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-sm text-slate-300 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
            {t('التقدم الإجمالي', 'Overall Progress')}
          </span>
          <span className="text-2xl font-bold text-primary-400 font-outfit">{progress}%</span>
        </div>
        <div className="w-full h-3 bg-navy-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.2 }}
            className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400"
          />
        </div>
        <div className="flex justify-between text-xs text-slate-600 mt-1.5">
          <span className={language === 'ar' ? 'font-tajawal' : 'font-work'}>
            {completed} {t('من أصل', 'of')} {milestones.length} {t('مراحل', 'milestones')}
          </span>
          <span className={language === 'ar' ? 'font-tajawal' : 'font-work'}>
            {t('الإطلاق المتوقع: 25 أبريل', 'Expected Launch: Apr 25')}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute start-[22px] top-4 bottom-4 w-px bg-gradient-to-b from-emerald-500/50 via-primary-500/50 to-slate-800" />

        <div className="space-y-4">
          {milestones.map((m, i) => {
            const title = language === 'ar' ? m.ar : m.en
            const date = language === 'ar' ? m.date : m.dateEn
            const note = m.notes ? (language === 'ar' ? m.notes.ar : m.notes.en) : null

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex gap-4"
              >
                <div className="w-11 flex-shrink-0 flex items-start pt-1 justify-center relative z-10">
                  <div className="bg-navy-900">{statusIcon(m.status)}</div>
                </div>
                <div className={`flex-1 glass rounded-xl p-4 border transition-all ${
                  m.status === 'completed' ? 'border-emerald-500/20' :
                  m.status === 'in_progress' ? 'border-primary-500/30 shadow-glow' :
                  'border-white/8 opacity-60'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`text-sm font-semibold text-white ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
                      {title}
                    </h4>
                    <span className="text-xs text-slate-500 font-work">{date}</span>
                  </div>
                  {note && (
                    <p className={`text-xs text-slate-400 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>{note}</p>
                  )}
                  {m.status === 'in_progress' && (
                    <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-400 border border-primary-500/30 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
                      {t('قيد التنفيذ الآن', 'Currently in progress')}
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
