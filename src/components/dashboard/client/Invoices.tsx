import { motion } from 'framer-motion'
import { Download, CreditCard } from 'lucide-react'
import { useLanguage } from '../../../context/LanguageContext'

const invoices = [
  { id: '#INV-001', service: { ar: 'تطوير الموقع', en: 'Website Development' }, amount: 9999, status: 'paid', issue: '1 أبريل', issueEn: 'Apr 1', due: '1 أبريل', dueEn: 'Apr 1' },
  { id: '#INV-002', service: { ar: 'اشتراك شهري', en: 'Monthly Subscription' }, amount: 399, status: 'paid', issue: '1 أبريل', issueEn: 'Apr 1', due: '1 أبريل', dueEn: 'Apr 1' },
  { id: '#INV-003', service: { ar: 'اشتراك شهري', en: 'Monthly Subscription' }, amount: 399, status: 'pending', issue: '1 مايو', issueEn: 'May 1', due: '15 مايو', dueEn: 'May 15' },
]

const statusConfig = {
  paid: { ar: 'مدفوعة', en: 'Paid', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  pending: { ar: 'معلقة', en: 'Pending', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  overdue: { ar: 'متأخرة', en: 'Overdue', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
}

export const Invoices = () => {
  const { language, t } = useLanguage()

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className={`text-2xl font-bold text-white ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
          {t('الفواتير', 'Invoices')}
        </h1>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: { ar: 'المدفوع', en: 'Paid' }, value: '10,398', color: '#10B981' },
          { label: { ar: 'المعلق', en: 'Pending' }, value: '399', color: '#F59E0B' },
          { label: { ar: 'الإجمالي', en: 'Total' }, value: '10,797', color: '#4F6EF7' },
        ].map((s, i) => (
          <div key={i} className="glass rounded-2xl p-4 border border-white/8 text-center">
            <div className="text-xl font-bold font-outfit mb-1" style={{ color: s.color }}>
              {s.value} <span className={`text-xs text-slate-500 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>{t('ر.س', 'SAR')}</span>
            </div>
            <div className={`text-xs text-slate-500 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
              {language === 'ar' ? s.label.ar : s.label.en}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {invoices.map((inv, i) => {
          const status = statusConfig[inv.status as keyof typeof statusConfig]
          return (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="glass rounded-2xl p-5 border border-white/8 hover:border-white/15 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/15 border border-primary-500/30 flex items-center justify-center">
                    <CreditCard size={16} className="text-primary-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white font-outfit">{inv.id}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
                        style={{ background: status.bg, color: status.color }}
                      >
                        {language === 'ar' ? status.ar : status.en}
                      </span>
                    </div>
                    <p className={`text-xs text-slate-500 mt-0.5 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
                      {language === 'ar' ? inv.service.ar : inv.service.en} · {language === 'ar' ? inv.issue : inv.issueEn}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-base font-bold text-white font-outfit">
                    {inv.amount.toLocaleString()} <span className={`text-xs text-slate-500 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>{t('ر.س', 'SAR')}</span>
                  </span>
                  <div className="flex gap-1.5">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2 rounded-xl glass border border-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                      <Download size={13} />
                    </motion.button>
                    {inv.status === 'pending' && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-3 py-2 rounded-xl bg-primary-500/15 border border-primary-500/30 text-primary-400 text-xs font-medium hover:bg-primary-500/25 transition-all"
                      >
                        {t('دفع', 'Pay Now')}
                      </motion.button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
