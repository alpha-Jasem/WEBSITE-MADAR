import { motion } from 'framer-motion'
import { Users, Briefcase, Eye, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react'
import { useLanguage } from '../../../context/LanguageContext'

const metrics = [
  {
    icon: Briefcase,
    color: '#4F6EF7',
    value: '28',
    change: '+3',
    positive: true,
    ar: { label: 'قيد التنفيذ', sublabel: 'مشروع نشط' },
    en: { label: 'Active Projects', sublabel: 'In Progress' },
  },
  {
    icon: Users,
    color: '#D4A853',
    value: '47',
    change: '+12',
    positive: true,
    ar: { label: 'عملاء محتملون', sublabel: 'طلب جديد' },
    en: { label: 'Open Leads', sublabel: 'New Request' },
  },
  {
    icon: Eye,
    color: '#10B981',
    value: '18',
    change: '-2',
    positive: false,
    ar: { label: 'زيارات هذا الأسبوع', sublabel: 'عرض منزل' },
    en: { label: 'Viewings This Week', sublabel: 'Property Show' },
  },
  {
    icon: TrendingUp,
    color: '#8B5CF6',
    value: '3',
    change: '8.4M ر.س',
    positive: true,
    ar: { label: 'مغلقة هذا الشهر', sublabel: 'صفقة' },
    en: { label: 'Closed (MTD)', sublabel: 'SAR 8.4M' },
  },
]

export const Overview = () => {
  const { language, t } = useLanguage()

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className={`text-2xl font-bold text-white ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
          {t('نظرة عامة', 'Overview')}
        </h1>
        <p className={`text-slate-500 text-sm mt-1 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
          {t('أبريل 2026', 'April 2026')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((metric, i) => {
          const Icon = metric.icon
          const content = language === 'ar' ? metric.ar : metric.en

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass rounded-2xl p-5 border border-white/8 hover:border-white/15 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${metric.color}20` }}
                >
                  <Icon size={18} style={{ color: metric.color }} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${metric.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {metric.positive ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                  <span className="font-work">{metric.change}</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1 font-outfit">{metric.value}</div>
              <div className={`text-xs text-slate-500 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
                {content.label}
              </div>
              <div
                className={`text-xs font-medium mt-0.5 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
                style={{ color: metric.color }}
              >
                {content.sublabel}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
