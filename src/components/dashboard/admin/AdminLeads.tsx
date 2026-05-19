import { useEffect, useState } from 'react'
import { Search, Users2, Phone, Mail } from 'lucide-react'
import { motion } from 'framer-motion'
import { StatusBadge } from '../shared/StatusBadge'
import { fetchAllLeads, updateLeadStatus } from '../../../lib/supabase'
import { mockLeads } from '../../../lib/mockData'
import type { Lead, LeadStatus } from '../../../types'

const statuses: LeadStatus[] = ['new', 'contacted', 'qualified', 'converted', 'lost']

export const AdminLeads = () => {
  const [leads, setLeads] = useState<Lead[]>(mockLeads)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all')

  useEffect(() => {
    fetchAllLeads().then(d => { if (d.length) setLeads(d) })
  }, [])

  const handleStatus = async (id: string, status: LeadStatus) => {
    await updateLeadStatus(id, status)
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
  }

  const filtered = leads.filter(l => {
    const matchSearch = l.name.includes(search) || l.phone.includes(search)
    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-cairo">العملاء المحتملون</h1>
        <p className="text-sm text-slate-500 font-tajawal">{leads.length} عميل محتمل من جميع الشركات</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ابحث باسم أو رقم..."
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-2.5 pr-9 text-sm text-white placeholder-slate-600 outline-none focus:border-primary-400/40 font-tajawal"
            dir="rtl" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setStatusFilter('all')}
            className={`px-3 py-2 rounded-lg text-xs font-tajawal cursor-pointer transition-all ${statusFilter === 'all' ? 'bg-primary-400/20 text-primary-300' : 'text-slate-500 hover:text-white bg-white/[0.03]'}`}>
            الكل
          </button>
          {statuses.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg cursor-pointer transition-all ${statusFilter === s ? 'bg-white/10' : 'bg-white/[0.03] hover:bg-white/[0.05]'}`}>
              <StatusBadge status={s} />
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['العميل', 'المصدر', 'القيمة', 'الحالة', 'آخر تواصل', 'إجراء'].map(h => (
                <th key={h} className="px-4 py-3 text-right text-xs text-slate-500 font-tajawal font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((l, i) => (
              <motion.tr key={l.id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #10B981, #06B6D4)' }}>
                      {l.name[0]}
                    </div>
                    <div>
                      <p className="text-sm text-white font-tajawal">{l.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 text-[10px] text-slate-600">
                          <Phone size={9} /><span dir="ltr">{l.phone}</span>
                        </span>
                        {l.email && <span className="flex items-center gap-1 text-[10px] text-slate-600">
                          <Mail size={9} />{l.email}
                        </span>}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400 font-tajawal">{l.source}</td>
                <td className="px-4 py-3 text-xs text-slate-300 font-sora">
                  {l.value ? `${l.value.toLocaleString()} ر.س` : '—'}
                </td>
                <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                <td className="px-4 py-3 text-xs text-slate-600 font-tajawal">
                  {new Date(l.last_contact).toLocaleDateString('ar-SA')}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={l.status}
                    onChange={e => handleStatus(l.id, e.target.value as LeadStatus)}
                    className="bg-white/[0.04] border border-white/[0.07] rounded-lg px-2 py-1 text-xs text-slate-300 font-tajawal cursor-pointer outline-none"
                    dir="rtl">
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <Users2 size={32} className="text-slate-700 mx-auto mb-2" />
            <p className="text-slate-600 font-tajawal text-sm">لا توجد نتائج</p>
          </div>
        )}
      </div>
    </div>
  )
}
