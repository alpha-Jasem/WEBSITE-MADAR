import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { BarChart2, FolderKanban, MessageCircle, TrendingUp, ArrowUpRight, Users, DollarSign, Activity } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { openWhatsAppChat } from '../../lib/whatsapp'

const features = [
  { icon: BarChart2, color: '#4F6EF7', ar: 'تتبع العملاء المحتملين', en: 'Lead Tracking' },
  { icon: FolderKanban, color: '#D4A853', ar: 'إدارة المشاريع', en: 'Project Management' },
  { icon: MessageCircle, color: '#10B981', ar: 'تواصل فوري', en: 'Real-time Chat' },
  { icon: TrendingUp, color: '#8B5CF6', ar: 'تحليلات وتقارير', en: 'Analytics & Reports' },
]

const mockStats = [
  { icon: Users, label: { ar: 'عميل نشط', en: 'Active Clients' }, value: '47', change: '+12%', color: '#4F6EF7' },
  { icon: FolderKanban, label: { ar: 'مشروع جارٍ', en: 'Active Projects' }, value: '12', change: '+3', color: '#D4A853' },
  { icon: DollarSign, label: { ar: 'إيرادات الشهر', en: 'Monthly Revenue' }, value: '85K', change: '+18%', color: '#10B981' },
  { icon: Activity, label: { ar: 'معدل الإنجاز', en: 'Completion Rate' }, value: '94%', change: '+2%', color: '#8B5CF6' },
]

export const DashboardPreview = () => {
  const { language, t } = useLanguage()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="dashboard" className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden" ref={ref}>
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary-500/20 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary-500/20 to-transparent" />
        <div className="absolute inset-0 grid-bg opacity-20" />
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7 }}
          >
            <span className={`inline-block text-sm text-primary-400 font-semibold tracking-widest uppercase mb-3 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
              {t('لوحة التحكم', 'Dashboard')}
            </span>
            <h2 className={`text-4xl sm:text-5xl font-bold text-white mb-5 leading-tight ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
              {t('تابع مشاريعك من', 'Manage Everything')}
              <br />
              <span className="gradient-text">
                {t('لوحة تحكم واحدة', 'From One Dashboard')}
              </span>
            </h2>
            <p className={`text-slate-400 text-lg mb-8 leading-relaxed ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
              {t(
                'لوحات تحكم احترافية للعملاء والإداريين. تتبع مشاريعك، تواصل مع فريقك، وراجع فواتيرك من مكان واحد.',
                'Professional dashboards for clients and admins. Track projects, communicate with your team, and review invoices all in one place.'
              )}
            </p>

            {/* Features grid */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              {features.map((feat, i) => {
                const Icon = feat.icon
                const label = language === 'ar' ? feat.ar : feat.en
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    className="flex items-center gap-3 glass rounded-xl p-3 border border-white/8"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${feat.color}20` }}
                    >
                      <Icon size={15} style={{ color: feat.color }} />
                    </div>
                    <span className={`text-sm text-slate-300 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
                      {label}
                    </span>
                  </motion.div>
                )
              })}
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => openWhatsAppChat(t('مرحباً، أرغب بطلب نسخة تجريبية من لوحة التحكم', 'Hello, I\'d like to request a dashboard demo'))}
              className={`flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-semibold shadow-glow transition-all ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}
            >
              {t('اطلب نسخة تجريبية', 'Request Demo')}
              <ArrowUpRight size={16} />
            </motion.button>
          </motion.div>

          {/* Right: Mock dashboard */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            {/* Browser chrome */}
            <div className="glass rounded-2xl border border-white/10 overflow-hidden shadow-glass">
              {/* Browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-navy-800/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                </div>
                <div className="flex-1 mx-4 bg-navy-900/80 rounded-lg px-3 py-1.5 text-xs text-slate-600 font-work">
                  dashboard.digital-meridian.com
                </div>
              </div>

              {/* Dashboard content */}
              <div className="p-4 bg-navy-900/60">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-slate-500 font-work">
                      {t('مرحباً،', 'Welcome back,')}
                    </p>
                    <p className={`text-sm font-bold text-white ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
                      {t('محمد الأحمدي', 'Mohammed Al-Ahmadi')}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary-500/20 border border-primary-500/40 flex items-center justify-center">
                    <span className="text-xs text-primary-400 font-bold font-outfit">MA</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {mockStats.map((stat, si) => {
                    const Icon = stat.icon
                    const label = language === 'ar' ? stat.label.ar : stat.label.en
                    return (
                      <div key={si} className="glass rounded-xl p-3 border border-white/8">
                        <div className="flex items-center justify-between mb-1.5">
                          <Icon size={13} style={{ color: stat.color }} />
                          <span className="text-xs text-emerald-400 font-work">{stat.change}</span>
                        </div>
                        <div className="text-lg font-bold text-white font-outfit">{stat.value}</div>
                        <div className={`text-xs text-slate-500 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>{label}</div>
                      </div>
                    )
                  })}
                </div>

                {/* Progress bar */}
                <div className="glass rounded-xl p-3 border border-white/8">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs text-slate-300 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
                      {t('تقدم المشروع', 'Project Progress')}
                    </span>
                    <span className="text-xs text-primary-400 font-work">65%</span>
                  </div>
                  <div className="w-full h-1.5 bg-navy-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={inView ? { width: '65%' } : {}}
                      transition={{ duration: 1.2, delay: 0.8 }}
                      className="h-full rounded-full bg-primary-500"
                    />
                  </div>
                  <p className={`text-xs text-slate-600 mt-1.5 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
                    {t('موقع عيادة الشاكرين - مرحلة التطوير', 'Al-Shakireen Clinic - Development Phase')}
                  </p>
                </div>
              </div>
            </div>

            {/* Floating accent */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-4 -end-4 glass rounded-2xl px-4 py-2.5 border border-primary-500/30 shadow-glow"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-slate-300 font-work">Live Updates</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
