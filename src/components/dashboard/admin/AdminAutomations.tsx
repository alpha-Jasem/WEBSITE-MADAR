import { useEffect, useState } from 'react'
import { Zap, Search, Play, Pause, AlertTriangle, MessageSquare, Users2, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { StatusBadge } from '../shared/StatusBadge'
import { fetchAllAutomations, updateAutomationStatus } from '../../../lib/supabase'
import { mockAutomations } from '../../../lib/mockData'
import type { Automation } from '../../../types'

const typeIcons: Record<string, string> = {
  whatsapp: '💬', crm: '🔄', ai_agent: '🤖', booking: '📅', sales: '📈',
}
const typeLabels: Record<string, string> = {
  whatsapp: 'واتساب', crm: 'CRM', ai_agent: 'وكيل AI', booking: 'حجز', sales: 'مبيعات',
}

export const AdminAutomations = () => {
  const [automations, setAutomations] = useState<Automation[]>(mockAutomations)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchAllAutomations().then(d => { if (d.length) setAutomations(d) })
  }, [])

  const toggle = async (a: Automation) => {
    const newStatus = a.status === 'active' ? 'paused' : 'active'
    await updateAutomationStatus(a.id, newStatus)
    setAutomations(prev => prev.map(x => x.id === a.id ? { ...x, status: newStatus } : x))
  }

  const filtered = automations.filter(a => a.name.includes(search))
  const active = automations.filter(a => a.status === 'active').length
  const errors = automations.filter(a => a.status === 'error').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-cairo">التحكم في الأتمتة</h1>
          <p className="text-sm text-slate-500 font-tajawal">{active} نشط · {errors} أخطاء</p>
        </div>
        {errors > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-tajawal text-red-400"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle size={13} />
            {errors} أتمتة تحتاج انتباه
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ابحث عن أتمتة..."
          className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-2.5 pr-9 text-sm text-white placeholder-slate-600 outline-none focus:border-primary-400/40 font-tajawal"
          dir="rtl"
        />
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((a, i) => (
          <motion.div key={a.id}
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="p-5 rounded-2xl space-y-4"
            style={{
              background: a.status === 'error' ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${a.status === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}`,
            }}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{typeIcons[a.type]}</span>
                <div>
                  <p className="text-sm font-semibold text-white font-tajawal">{a.name}</p>
                  <p className="text-xs text-slate-600 font-tajawal">{typeLabels[a.type]}</p>
                </div>
              </div>
              <StatusBadge status={a.status} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: MessageSquare, value: a.messages_today, label: 'رسائل اليوم' },
                { icon: Users2,        value: a.leads_generated, label: 'عملاء' },
                { icon: Clock,         value: `${a.avg_response_time}ث`, label: 'وقت الرد' },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="text-center">
                  <Icon size={11} className="text-slate-600 mx-auto mb-0.5" />
                  <p className="text-sm font-bold text-white font-sora">{value}</p>
                  <p className="text-[10px] text-slate-600 font-tajawal">{label}</p>
                </div>
              ))}
            </div>

            {/* Response rate bar */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-600 font-tajawal mb-1">
                <span>معدل الاستجابة</span>
                <span>{a.response_rate}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${a.response_rate}%`,
                    background: a.response_rate > 85 ? '#10B981' : a.response_rate > 60 ? '#F59E0B' : '#EF4444',
                  }} />
              </div>
            </div>

            {a.status !== 'error' && (
              <button onClick={() => toggle(a)}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-tajawal cursor-pointer transition-all ${
                  a.status === 'active'
                    ? 'text-yellow-400 hover:bg-yellow-500/10 border border-yellow-500/20'
                    : 'text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20'
                }`}>
                {a.status === 'active' ? <><Pause size={12} />إيقاف مؤقت</> : <><Play size={12} />تشغيل</>}
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
