import { useEffect, useState } from 'react'
import { Activity, Search, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import { StatusBadge } from '../shared/StatusBadge'
import { fetchLogs } from '../../../lib/supabase'
import type { Log, LogLevel } from '../../../types'

export const AdminLogs = () => {
  const [logs, setLogs] = useState<Log[]>([])
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const d = await fetchLogs(100)
    if (d.length) setLogs(d)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = logs.filter(l => {
    const matchSearch = l.message.includes(search) || l.event.includes(search)
    const matchLevel = levelFilter === 'all' || l.level === levelFilter
    return matchSearch && matchLevel
  })

  const levelCounts = (['error', 'warning', 'success', 'info'] as LogLevel[]).map(lv => ({
    level: lv, count: logs.filter(l => l.level === lv).length,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-cairo">سجل الأحداث</h1>
          <p className="text-sm text-slate-500 font-tajawal">{logs.length} حدث مسجل</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors cursor-pointer font-tajawal"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          تحديث
        </button>
      </div>

      {/* Level summary */}
      <div className="grid grid-cols-4 gap-3">
        {levelCounts.map(({ level, count }) => (
          <button key={level} onClick={() => setLevelFilter(levelFilter === level ? 'all' : level)}
            className={`p-3 rounded-xl text-center cursor-pointer transition-all ${levelFilter === level ? 'ring-1 ring-white/20' : ''}`}
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xl font-bold font-sora text-white mb-1">{count}</p>
            <StatusBadge status={level} />
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ابحث في السجلات..."
          className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-2.5 pr-9 text-sm text-white placeholder-slate-600 outline-none focus:border-primary-400/40 font-tajawal"
          dir="rtl" />
      </div>

      <div className="space-y-2">
        {filtered.map((log, i) => (
          <motion.div key={log.id}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
            className="flex items-start gap-3 p-4 rounded-xl"
            style={{
              background: log.level === 'error' ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${log.level === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)'}`,
            }}>
            <StatusBadge status={log.level} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] text-slate-600 font-work">{log.event}</span>
                {log.company_id && <span className="text-[10px] text-slate-700 font-tajawal">· company:{log.company_id}</span>}
              </div>
              <p className="text-sm text-slate-300 font-tajawal leading-relaxed">{log.message}</p>
              {log.meta && (
                <p className="text-[10px] text-slate-700 font-work mt-1 font-mono">
                  {JSON.stringify(log.meta)}
                </p>
              )}
            </div>
            <span className="text-[10px] text-slate-600 flex-shrink-0 font-work">
              {new Date(log.created_at).toLocaleTimeString('ar-SA')}
            </span>
          </motion.div>
        ))}

        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <Activity size={32} className="text-slate-700 mx-auto mb-2" />
            <p className="text-slate-600 font-tajawal text-sm">لا توجد سجلات</p>
          </div>
        )}
      </div>
    </div>
  )
}
