import { motion } from 'framer-motion'
import { ArrowRight, MessageSquare, Receipt, BarChart2, CheckCircle2, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../../context/LanguageContext'

export const ClientDashboard = () => {
  const { language, t } = useLanguage()

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className={`text-2xl font-bold text-white ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
          {t('أهلاً، محمد 👋', 'Welcome, Mohammed 👋')}
        </h1>
        <p className={`text-slate-500 text-sm mt-1 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
          {t('إليك آخر تحديثات مشروعك', 'Here\'s the latest on your project')}
        </p>
      </div>

      {/* Active project */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 border border-primary-500/20"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className={`text-xs text-primary-400 font-semibold mb-1 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
              {t('المشروع النشط', 'Active Project')}
            </p>
            <h3 className={`text-lg font-bold text-white ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
              {t('موقع عيادة الشاكرين', 'Al-Shakireen Clinic Website')}
            </h3>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-500/20 text-primary-400 border border-primary-500/30 font-work">
            {t('جارٍ', 'In Progress')}
          </span>
        </div>

        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1.5">
            <span className={`text-slate-400 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
              {t('تقدم المشروع', 'Progress')}
            </span>
            <span className="text-primary-400 font-work">65%</span>
          </div>
          <div className="w-full h-2 bg-navy-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '65%' }}
              transition={{ duration: 1.2 }}
              className="h-full rounded-full bg-primary-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className={`text-slate-500 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
            {t('المرحلة التالية: الاختبار (20 أبريل)', 'Next: Testing (Apr 20)')}
          </span>
          <Link to="/client/project">
            <button className={`flex items-center gap-1.5 text-primary-400 hover:text-primary-300 transition-colors ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
              {t('التفاصيل', 'Details')}
              <ArrowRight size={12} />
            </button>
          </Link>
        </div>
      </motion.div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: MessageSquare, ar: 'رسالة جديدة', en: 'New Message', to: '/client/messages', color: '#4F6EF7' },
          { icon: BarChart2, ar: 'تتبع المشروع', en: 'Track Project', to: '/client/project', color: '#D4A853' },
          { icon: Receipt, ar: 'الفواتير', en: 'Invoices', to: '/client/invoices', color: '#10B981' },
        ].map((action, i) => {
          const Icon = action.icon
          return (
            <Link key={i} to={action.to}>
              <motion.div
                whileHover={{ y: -2 }}
                className="glass rounded-xl p-4 border border-white/8 hover:border-white/20 text-center transition-all cursor-pointer"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2"
                  style={{ background: `${action.color}20` }}
                >
                  <Icon size={16} style={{ color: action.color }} />
                </div>
                <p className={`text-xs text-slate-300 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
                  {language === 'ar' ? action.ar : action.en}
                </p>
              </motion.div>
            </Link>
          )
        })}
      </div>

      {/* Recent messages */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass rounded-2xl p-5 border border-white/8"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-sm font-bold text-white ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
            {t('آخر الرسائل', 'Recent Messages')}
          </h3>
          <Link to="/client/messages">
            <button className={`text-xs text-primary-400 hover:text-primary-300 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
              {t('عرض الكل', 'View All')}
            </button>
          </Link>
        </div>
        {[
          { ar: 'تم الانتهاء من مرحلة التصميم، بدأنا التطوير', en: 'Design phase complete, development has started', time: '2h' },
          { ar: 'يرجى مراجعة التصاميم المرفقة والموافقة', en: 'Please review the attached designs and approve', time: '1d' },
        ].map((msg, i) => (
          <div key={i} className={`flex items-start gap-3 ${i > 0 ? 'mt-3 pt-3 border-t border-white/8' : ''}`}>
            <div className="w-7 h-7 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-primary-400 font-bold font-outfit">DM</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs text-slate-300 truncate ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
                {language === 'ar' ? msg.ar : msg.en}
              </p>
              <p className="text-xs text-slate-600 mt-0.5 font-work">{msg.time} {t('مضت', 'ago')}</p>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0 mt-1" />
          </div>
        ))}
      </motion.div>

      {/* Latest invoice */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-2xl p-5 border border-white/8"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-sm font-bold text-white ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
            {t('آخر فاتورة', 'Latest Invoice')}
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-work">
            {t('مدفوعة', 'Paid')}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-white font-outfit">9,999 <span className={`text-sm text-slate-400 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>{t('ر.س', 'SAR')}</span></p>
            <p className={`text-xs text-slate-500 mt-0.5 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
              #INV-001 — {t('تطوير الموقع', 'Website Development')}
            </p>
          </div>
          <Link to="/client/invoices">
            <button className={`text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
              {t('عرض الفواتير', 'View Invoices')} <ArrowRight size={11} />
            </button>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
