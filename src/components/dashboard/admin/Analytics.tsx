import { motion } from 'framer-motion'
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useLanguage } from '../../../context/LanguageContext'

const revenueData = [
  { month: 'يناير', en: 'Jan', value: 45000 },
  { month: 'فبراير', en: 'Feb', value: 52000 },
  { month: 'مارس', en: 'Mar', value: 48000 },
  { month: 'أبريل', en: 'Apr', value: 67000 },
  { month: 'مايو', en: 'May', value: 71000 },
  { month: 'يونيو', en: 'Jun', value: 85000 },
]

const servicesData = [
  { ar: 'تطوير مواقع', en: 'Websites', value: 45, color: '#4F6EF7' },
  { ar: 'استشارات AI', en: 'AI Consulting', value: 30, color: '#D4A853' },
  { ar: 'الأتمتة', en: 'Automation', value: 25, color: '#10B981' },
]

const leadsData = [
  { ar: 'واتساب', en: 'WhatsApp', value: 40, color: '#4F6EF7' },
  { ar: 'الموقع', en: 'Website', value: 35, color: '#D4A853' },
  { ar: 'الإحالة', en: 'Referral', value: 15, color: '#10B981' },
  { ar: 'التواصل', en: 'Social', value: 10, color: '#8B5CF6' },
]

const customTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass border border-white/10 rounded-xl px-4 py-2.5 text-sm">
        <span className="text-white font-outfit">{payload[0].value?.toLocaleString()} {payload[0].name === 'value' ? 'ر.س' : '%'}</span>
      </div>
    )
  }
  return null
}

export const Analytics = () => {
  const { language, t } = useLanguage()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className={`text-2xl font-bold text-white ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
          {t('التحليلات', 'Analytics')}
        </h1>
        <p className={`text-slate-500 text-sm mt-1 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
          {t('آخر 6 أشهر', 'Last 6 months')}
        </p>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: { ar: 'معدل التحويل', en: 'Conversion Rate' }, value: '18.5%', color: '#4F6EF7' },
          { label: { ar: 'متوسط الصفقة', en: 'Avg Deal Size' }, value: '15,200 ر.س', color: '#D4A853' },
          { label: { ar: 'وقت الإغلاق', en: 'Time to Close' }, value: '12 يوم', color: '#10B981' },
          { label: { ar: 'الإيراد الإجمالي', en: 'Total Revenue' }, value: '368K', color: '#8B5CF6' },
        ].map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass rounded-2xl p-4 border border-white/8"
          >
            <div className="text-2xl font-bold text-white mb-1 font-outfit" style={{ color: kpi.color }}>
              {kpi.value}
            </div>
            <div className={`text-xs text-slate-500 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
              {language === 'ar' ? kpi.label.ar : kpi.label.en}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Revenue chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-2xl p-6 border border-white/8"
      >
        <h3 className={`text-base font-bold text-white mb-4 ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
          {t('الإيرادات الشهرية', 'Monthly Revenue')}
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={revenueData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey={language === 'ar' ? 'month' : 'en'}
              tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'Work Sans' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'Work Sans' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v / 1000}K`}
            />
            <Tooltip content={customTooltip} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#4F6EF7"
              strokeWidth={2.5}
              dot={{ fill: '#4F6EF7', r: 4 }}
              activeDot={{ r: 6, fill: '#4F6EF7' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Services pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-6 border border-white/8"
        >
          <h3 className={`text-base font-bold text-white mb-4 ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
            {t('توزيع الخدمات', 'Services Distribution')}
          </h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="60%" height={140}>
              <PieChart>
                <Pie data={servicesData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                  {servicesData.map((_, i) => (
                    <Cell key={i} fill={servicesData[i].color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {servicesData.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                  <span className={`text-xs text-slate-400 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
                    {language === 'ar' ? item.ar : item.en}
                  </span>
                  <span className="text-xs text-white font-work ms-auto">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Leads bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-2xl p-6 border border-white/8"
        >
          <h3 className={`text-base font-bold text-white mb-4 ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
            {t('مصادر العملاء', 'Lead Sources')}
          </h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={leadsData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey={language === 'ar' ? 'ar' : 'en'}
                tick={{ fill: '#64748B', fontSize: 10, fontFamily: 'Work Sans' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={customTooltip} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {leadsData.map((item, i) => (
                  <Cell key={i} fill={item.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  )
}
