import { useEffect, useState } from 'react'
import { Search, Plus, Building2, MessageSquare, Users2, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { StatusBadge } from '../shared/StatusBadge'
import { fetchCompanies } from '../../../lib/supabase'
import { mockCompanies } from '../../../lib/mockData'
import type { Company } from '../../../types'

const planColors: Record<string, string> = {
  starter: '#06B6D4',
  growth: '#4F6EF7',
  enterprise: '#F59E0B',
}

export const AdminCompanies = () => {
  const [companies, setCompanies] = useState<Company[]>(mockCompanies)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'trial' | 'suspended'>('all')

  useEffect(() => {
    fetchCompanies().then(d => { if (d.length) setCompanies(d) })
  }, [])

  const filtered = companies.filter(c => {
    const matchSearch = c.name.includes(search) || c.owner_name.includes(search) || c.industry.includes(search)
    const matchFilter = filter === 'all' || c.status === filter
    return matchSearch && matchFilter
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-cairo">الشركات</h1>
          <p className="text-sm text-slate-500 font-tajawal">{companies.length} شركة مسجلة</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer font-cairo"
          style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)' }}>
          <Plus size={15} />
          إضافة شركة
        </motion.button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ابحث عن شركة أو مالك..."
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-2.5 pr-9 text-sm text-white placeholder-slate-600 outline-none focus:border-yellow-500/40 font-tajawal"
            dir="rtl"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'trial', 'suspended'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-tajawal cursor-pointer transition-all ${filter === f ? 'bg-yellow-500/20 text-yellow-400' : 'text-slate-500 hover:text-white bg-white/[0.03]'}`}>
              {f === 'all' ? 'الكل' : f === 'active' ? 'نشط' : f === 'trial' ? 'تجريبي' : 'موقوف'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['الشركة', 'القطاع', 'الباقة', 'الحالة', 'الرسائل', 'العملاء', 'الأتمتة'].map(h => (
                <th key={h} className="px-4 py-3 text-right text-xs text-slate-500 font-tajawal font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <motion.tr key={c.id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #4F6EF7, #8B5CF6)' }}>
                      {c.name[0]}
                    </div>
                    <div>
                      <p className="text-sm text-white font-tajawal">{c.name}</p>
                      <p className="text-xs text-slate-600 font-tajawal">{c.owner_name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400 font-tajawal">{c.industry}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-medium px-2 py-1 rounded-full font-work"
                    style={{ color: planColors[c.plan], background: `${planColors[c.plan]}18` }}>
                    {c.plan}
                  </span>
                </td>
                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <MessageSquare size={11} className="text-slate-600" />
                    {c.monthly_messages.toLocaleString()}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Users2 size={11} className="text-slate-600" />
                    {c.monthly_leads}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Zap size={11} className="text-slate-600" />
                    {c.automations_count}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <Building2 size={32} className="text-slate-700 mx-auto mb-2" />
            <p className="text-slate-600 font-tajawal text-sm">لا توجد نتائج</p>
          </div>
        )}
      </div>
    </div>
  )
}
