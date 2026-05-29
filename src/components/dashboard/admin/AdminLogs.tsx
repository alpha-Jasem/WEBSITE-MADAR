import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, Info, RefreshCw, Search } from 'lucide-react'
import { StatusBadge } from '../shared/StatusBadge'
import { fetchLogs } from '../../../lib/supabase'
import type { Log, LogLevel } from '../../../types'

const levelIcons: Record<LogLevel, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  error: AlertTriangle,
  success: CheckCircle2,
}

const levelLabels: Record<LogLevel | 'all', string> = {
  all: 'الكل',
  info: 'معلومات',
  warning: 'تحذير',
  error: 'خطأ',
  success: 'نجاح',
}

export const AdminLogs = () => {
  const [logs, setLogs] = useState<Log[]>([])
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const rows = await fetchLogs(120)
    setLogs(rows)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return logs.filter(log => {
      const matchSearch = !needle || [log.message, log.event, log.company_id, log.automation_id]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(needle))
      const matchLevel = levelFilter === 'all' || log.level === levelFilter
      return matchSearch && matchLevel
    })
  }, [logs, search, levelFilter])

  const levelCounts = (['error', 'warning', 'success', 'info'] as LogLevel[]).map(level => ({
    level,
    count: logs.filter(log => log.level === level).length,
  }))

  return (
    <div className="admin-page">
      <section className="admin-page-hero">
        <div>
          <span>سجل النظام</span>
          <h1>أحداث التشغيل والأخطاء</h1>
          <p>واجهة مرتبة لمراجعة أخطاء n8n، رسائل النظام، والتنبيهات المهمة بدون قراءة JSON طويل إلا عند الحاجة.</p>
        </div>
        <button type="button" onClick={load}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          تحديث
        </button>
      </section>

      <div className="admin-log-filters">
        <button type="button" className={levelFilter === 'all' ? 'active' : ''} onClick={() => setLevelFilter('all')}>
          <Activity size={15} />
          الكل
          <strong>{logs.length}</strong>
        </button>
        {levelCounts.map(({ level, count }) => {
          const Icon = levelIcons[level]
          return (
            <button key={level} type="button" className={levelFilter === level ? 'active' : ''} onClick={() => setLevelFilter(levelFilter === level ? 'all' : level)}>
              <Icon size={15} />
              {levelLabels[level]}
              <strong>{count}</strong>
            </button>
          )
        })}
      </div>

      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={15} />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="ابحث في السجلات..." />
        </div>
      </div>

      <div className="admin-log-list">
        {filtered.map(log => (
          <article key={log.id} className={log.level}>
            <StatusBadge status={log.level} />
            <div>
              <header>
                <strong>{log.event}</strong>
                <span>{new Date(log.created_at).toLocaleString('ar-SA')}</span>
              </header>
              <p>{log.message}</p>
              <footer>
                {log.company_id && <code>company:{log.company_id}</code>}
                {log.automation_id && <code>automation:{log.automation_id}</code>}
              </footer>
              {log.meta && <pre>{JSON.stringify(log.meta, null, 2)}</pre>}
            </div>
          </article>
        ))}

        {!loading && filtered.length === 0 && (
          <div className="admin-empty-state">
            <Activity size={30} />
            لا توجد سجلات مطابقة.
          </div>
        )}
      </div>
    </div>
  )
}
