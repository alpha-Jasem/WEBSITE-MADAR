import { useEffect, useState } from 'react'
import { Search, Users2, Phone } from 'lucide-react'
import { motion } from 'framer-motion'
import { StatusBadge } from '../shared/StatusBadge'
import { fetchClientLeads, updateLeadStatus } from '../../../lib/supabase'
import { mockLeads } from '../../../lib/mockData'
import type { Lead, LeadStatus } from '../../../types'

const DEMO_COMPANY_ID = 'c1'

export const ClientLeads = () => {
  const [leads, setLeads] = useState<Lead[]>(mockLeads.filter(l => l.company_id === DEMO_COMPANY_ID))
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchClientLeads(DEMO_COMPANY_ID).then(d => { if (d.length) setLeads(d) })
  }, [])

  const handleStatus = async (id: string, status: LeadStatus) => {
    await updateLeadStatus(id, status)
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
  }

  const filtered = leads.filter(l => l.name.includes(search) || l.phone.includes(search))

  const byStatus = (['new', 'contacted', 'qualified', 'converted', 'lost'] as LeadStatus[]).map(s => ({
    status: s,
    leads: leads.filter(l => l.status === s),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-cairo">العملاء المحتملون</h1>
          <p className="text-sm text-slate-500 font-tajawal">{leads.length} عميل</p>
        </div>
      </div>

      {/* Kanban summary */}
      <div className="grid grid-cols-5 gap-2">
        {byStatus.map(({ status, leads: sl }) => (
          <div key={status} className="p-3 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-2xl font-bold text-white font-sora mb-1">{sl.length}</p>
            <StatusBadge status={status} />
          </div>
        ))}
      </div>

      <div className="relative">
        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ابحث..."
          className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-2.5 pr-9 text-sm text-white placeholder-slate-600 outline-none focus:border-primary-400/40 font-tajawal"
          dir="rtl" />
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['العميل', 'المصدر', 'القيمة', 'الحالة', 'الإجراء'].map(h => (
                <th key={h} className="px-4 py-3 text-right text-xs text-slate-500 font-tajawal font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((l, i) => (
              <motion.tr key={l.id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #10B981, #4F6EF7)' }}>
                      {l.name[0]}
                    </div>
                    <div>
                      <p className="text-sm text-white font-tajawal">{l.name}</p>
                      <span className="flex items-center gap-1 text-[10px] text-slate-600">
                        <Phone size={9} /><span dir="ltr">{l.phone}</span>
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400 font-tajawal">{l.source}</td>
                <td className="px-4 py-3 text-xs text-slate-300 font-sora">
                  {l.value ? `${l.value.toLocaleString()} ر.س` : '—'}
                </td>
                <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                <td className="px-4 py-3">
                  <select value={l.status}
                    onChange={e => handleStatus(l.id, e.target.value as LeadStatus)}
                    className="bg-white/[0.04] border border-white/[0.07] rounded-lg px-2 py-1 text-xs text-slate-300 font-tajawal cursor-pointer outline-none"
                    dir="rtl">
                    {(['new', 'contacted', 'qualified', 'converted', 'lost'] as LeadStatus[]).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
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
