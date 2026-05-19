import { motion } from 'framer-motion'
import { useState } from 'react'
import { Search, Eye, Edit2, Trash2 } from 'lucide-react'
import { useLanguage } from '../../../context/LanguageContext'

const statusConfig = {
  not_started: { ar: 'لم يبدأ', en: 'Not Started', color: '#64748B', bg: 'rgba(100,116,139,0.15)' },
  in_progress: { ar: 'جارٍ', en: 'In Progress', color: '#4F6EF7', bg: 'rgba(79,110,247,0.15)' },
  testing: { ar: 'اختبار', en: 'Testing', color: '#D4A853', bg: 'rgba(212,168,83,0.15)' },
  completed: { ar: 'مكتمل', en: 'Completed', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  on_hold: { ar: 'موقوف', en: 'On Hold', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
}

type Status = keyof typeof statusConfig

const projects = [
  { id: '1', name: 'موقع عيادة الشاكرين', nameEn: 'Al-Shakireen Clinic Website', client: 'د. محمد', clientEn: 'Dr. Mohammed', type: 'website', status: 'in_progress' as Status, progress: 65, budget: 9999 },
  { id: '2', name: 'نظام CRM عقاري', nameEn: 'Real Estate CRM', client: 'ناصر العقارات', clientEn: 'Nasser Real Estate', type: 'automation', status: 'testing' as Status, progress: 90, budget: 25000 },
  { id: '3', name: 'روبوت واتساب', nameEn: 'WhatsApp Chatbot', client: 'عيادة الجمال', clientEn: 'Beauty Clinic', type: 'ai', status: 'completed' as Status, progress: 100, budget: 12000 },
  { id: '4', name: 'موقع مجموعة سدر', nameEn: 'Seder Group Website', client: 'مجموعة سدر', clientEn: 'Seder Group', type: 'website', status: 'in_progress' as Status, progress: 30, budget: 7500 },
]

export const Projects = () => {
  const { language, t } = useLanguage()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = projects.filter((p) => {
    const name = language === 'ar' ? p.name : p.nameEn
    const matchSearch = name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className={`text-2xl font-bold text-white ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
            {t('المشاريع', 'Projects')}
          </h1>
          <p className={`text-slate-500 text-sm mt-1 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
            {projects.length} {t('مشروع', 'projects')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('بحث...', 'Search...')}
              className={`bg-navy-800/60 border border-white/10 rounded-xl ps-9 pe-4 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary-500/60 w-48 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`bg-navy-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500/60 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
          >
            <option value="all">{t('الكل', 'All')}</option>
            {Object.entries(statusConfig).map(([key, val]) => (
              <option key={key} value={key} className="bg-navy-800">
                {language === 'ar' ? val.ar : val.en}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl border border-white/8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/8">
                {[
                  t('اسم المشروع', 'Project Name'),
                  t('العميل', 'Client'),
                  t('الحالة', 'Status'),
                  t('التقدم', 'Progress'),
                  t('الميزانية', 'Budget'),
                  t('الإجراءات', 'Actions'),
                ].map((col, i) => (
                  <th key={i} className={`px-5 py-3.5 text-xs font-semibold text-slate-500 text-start ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((project, i) => {
                const status = statusConfig[project.status]
                return (
                  <motion.tr
                    key={project.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-white/5 hover:bg-white/3 transition-colors"
                  >
                    <td className={`px-5 py-4 text-sm text-white font-medium ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
                      {language === 'ar' ? project.name : project.nameEn}
                    </td>
                    <td className={`px-5 py-4 text-sm text-slate-400 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
                      {language === 'ar' ? project.client : project.clientEn}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
                        style={{ background: status.bg, color: status.color }}
                      >
                        {language === 'ar' ? status.ar : status.en}
                      </span>
                    </td>
                    <td className="px-5 py-4 w-36">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-navy-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${project.progress}%`, background: status.color }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 font-work w-8">{project.progress}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-300 font-work">
                      {project.budget.toLocaleString()} {t('ر.س', 'SAR')}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 text-slate-500 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-all">
                          <Eye size={14} />
                        </button>
                        <button className="p-1.5 text-slate-500 hover:text-gold-400 hover:bg-gold-500/10 rounded-lg transition-all">
                          <Edit2 size={14} />
                        </button>
                        <button className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
