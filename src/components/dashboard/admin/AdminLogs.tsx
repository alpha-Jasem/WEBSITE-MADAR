import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Log, LogLevel } from '../../../types'
import { useRealtimeRefetch } from '../../../lib/realtime'

const levelLabels: Record<LogLevel | 'all', string> = {
  all: 'الكل',
  info: 'معلومات',
  warning: 'تحذير',
  error: 'خطأ',
  success: 'نجاح',
}

const levelBadge: Record<LogLevel, string> = {
  info: 'blue',
  warning: 'amber',
  error: 'red',
  success: 'green',
}

export const AdminLogs = () => {
  const [logs, setLogs] = useState<Log[]>([])
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all')
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    const { data, error } = await supabase.from('logs').select('*').order('created_at', { ascending: false }).limit(120)
    setLoadError(error ? 'تعذّر تحميل السجلات: ' + error.message : null)
    setLogs(error ? [] : ((data ?? []) as Log[]))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useRealtimeRefetch('admin_logs', [{ table: 'logs' }], () => load(true), true)

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return logs.filter(log => {
      const matchSearch = !needle || [log.message, log.event, log.company_id, log.automation_id]
        .filter(Boolean).some(v => String(v).toLowerCase().includes(needle))
      const matchLevel = levelFilter === 'all' || log.level === levelFilter
      return matchSearch && matchLevel
    })
  }, [logs, search, levelFilter])

  const levelCounts = (['error', 'warning', 'success', 'info'] as LogLevel[]).map(level => ({
    level, count: logs.filter(l => l.level === level).length,
  }))

  return (
    <div className="page fade-in">
      <div className="sec-head" style={{ marginBottom: 24 }}>
        <div>
          <div className="sec-title">سجل الأحداث</div>
          <div className="sec-sub">إجراءات الإدارة المسجلة في جدول logs</div>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}>
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          تحديث
        </button>
      </div>

      {loadError && <div className="card card-pad" style={{ marginBottom: 16, borderColor: 'rgba(240,80,60,.4)' }}>{loadError}</div>}
      <div className="row gap-3" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
        <button className={`pill ${levelFilter === 'all' ? 'active' : ''}`} onClick={() => setLevelFilter('all')}>
          الكل <span className="cnt">{logs.length}</span>
        </button>
        {levelCounts.map(({ level, count }) => (
          <button key={level} className={`pill ${levelFilter === level ? 'active' : ''}`}
            onClick={() => setLevelFilter(levelFilter === level ? 'all' : level)}>
            {levelLabels[level]} <span className="cnt">{count}</span>
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="row gap-3 card-pad" style={{ padding: '12px 16px' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--ink-3)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ابحث في السجلات..."
            style={{ background: 'none', border: 'none', outline: 'none', flex: 1, fontSize: 13, color: 'var(--ink)' }}
          />
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>المستوى</th>
              <th>الحدث</th>
              <th>الرسالة</th>
              <th>التوقيت</th>
              <th>المرجع</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(log => (
              <tr key={log.id}>
                <td><span className={`badge ${levelBadge[log.level] || 'gray'}`}>{levelLabels[log.level] || log.level}</span></td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-2)' }}>{log.event}</td>
                <td style={{ maxWidth: 340, color: 'var(--ink-2)' }}>{log.message}</td>
                <td style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>
                  {new Date(log.created_at).toLocaleString('ar-SA')}
                </td>
                <td style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-4)' }}>
                  {log.company_id ? log.company_id.slice(0, 8) + '…' : '—'}
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--ink-3)' }}>
                  {logs.length === 0 ? 'لا توجد بيانات: لم يُسجل أي حدث بعد' : 'لا توجد سجلات مطابقة'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
