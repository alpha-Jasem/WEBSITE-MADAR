import { useEffect, useState } from 'react'
import { Zap, Users2, MessageSquare, TrendingUp, ArrowUpRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { StatCard } from '../shared/StatCard'
import { StatusBadge } from '../shared/StatusBadge'
import { MiniChart } from '../shared/MiniChart'
import { fetchClientStats, fetchClientAutomations, fetchClientLeads } from '../../../lib/supabase'
import { mockClientStats, mockAutomations, mockLeads, mockChartData } from '../../../lib/mockData'
import type { ClientStats, Automation, Lead } from '../../../types'

const DEMO_COMPANY_ID = 'c1'

export const ClientOverview = () => {
  const [stats, setStats] = useState<ClientStats>(mockClientStats)
  const [automations, setAutomations] = useState<Automation[]>(mockAutomations.filter(a => a.company_id === DEMO_COMPANY_ID))
  const [leads, setLeads] = useState<Lead[]>(mockLeads.filter(l => l.company_id === DEMO_COMPANY_ID).slice(0, 5))

  useEffect(() => {
    fetchClientStats(DEMO_COMPANY_ID).then(d => { if (d) setStats(d) })
    fetchClientAutomations(DEMO_COMPANY_ID).then(d => { if (d.length) setAutomations(d) })
    fetchClientLeads(DEMO_COMPANY_ID).then(d => { if (d.length) setLeads(d.slice(0, 5)) })
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-cairo">نظرة عامة</h1>
        <p className="text-sm text-slate-500 font-tajawal">مرحباً — هذا ملخص نشاطك</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="أتمتة نشطة"       value={stats.active_automations} icon={<Zap size={18} />}          trend={0}   accent="#4F6EF7" delay={0.0} />
        <StatCard label="إجمالي العملاء"    value={stats.total_leads}        icon={<Users2 size={18} />}       trend={18}  accent="#10B981" delay={0.1} />
        <StatCard label="رسائل اليوم"       value={stats.messages_today}     icon={<MessageSquare size={18} />} trend={5}  accent="#06B6D4" delay={0.2} />
        <StatCard label="معدل الاستجابة"    value={`${stats.response_rate}%`}icon={<TrendingUp size={18} />}  trend={3}   accent="#8B5CF6" delay={0.3} />
        <StatCard label="عملاء هذا الأسبوع" value={stats.leads_this_week}   icon={<ArrowUpRight size={18} />} trend={22}  accent="#F59E0B" delay={0.4} />
        <StatCard label="معدل التحويل"      value={`${stats.conversion_rate}%`} icon={<TrendingUp size={18} />} trend={8} accent="#EC4899" delay={0.5} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 className="text-sm font-bold text-white font-cairo mb-4">الرسائل هذا الأسبوع</h3>
          <MiniChart data={mockChartData.weeklyMessages} dataKey="messages" color="#4F6EF7" height={140} />
        </div>
        <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 className="text-sm font-bold text-white font-cairo mb-4">العملاء هذا الأسبوع</h3>
          <MiniChart data={mockChartData.weeklyLeads} dataKey="leads" type="bar" color="#10B981" height={140} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Automations status */}
        <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 className="text-sm font-bold text-white font-cairo mb-4">حالة الأتمتة</h3>
          <div className="space-y-3">
            {automations.map(a => (
              <div key={a.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-white font-tajawal truncate">{a.name}</p>
                    <StatusBadge status={a.status} />
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${a.response_rate}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      style={{ background: a.status === 'active' ? '#4F6EF7' : a.status === 'error' ? '#EF4444' : '#6B7280' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent leads */}
        <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 className="text-sm font-bold text-white font-cairo mb-4">آخر العملاء</h3>
          <div className="space-y-3">
            {leads.map(l => (
              <div key={l.id} className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #10B981, #06B6D4)' }}>
                  {l.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-tajawal">{l.name}</p>
                  <p className="text-[10px] text-slate-600 font-tajawal">{l.source}</p>
                </div>
                <StatusBadge status={l.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
