import { useEffect, useMemo, useState } from 'react'
import type { ElementType } from 'react'
import { AlertTriangle, Bot, Calendar, ExternalLink, MessageSquare, Pause, Play, RefreshCw, Search, Users2, Zap } from 'lucide-react'
import { StatusBadge } from '../shared/StatusBadge'
import { fetchAllAutomations, updateAutomationStatus } from '../../../lib/supabase'
import type { Automation, AutomationType } from '../../../types'

const typeMeta: Record<AutomationType, { label: string; icon: ElementType; color: string }> = {
  whatsapp: { label: 'واتساب', icon: MessageSquare, color: '#10B981' },
  crm: { label: 'CRM', icon: Users2, color: '#1565C0' },
  ai_agent: { label: 'وكيل AI', icon: Bot, color: '#8B5CF6' },
  booking: { label: 'حجوزات', icon: Calendar, color: '#F59E0B' },
  sales: { label: 'مبيعات', icon: Zap, color: '#EF4444' },
}

export const AdminAutomations = () => {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const rows = await fetchAllAutomations()
    setAutomations(rows)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const toggle = async (automation: Automation) => {
    const nextStatus = automation.status === 'active' ? 'paused' : 'active'
    await updateAutomationStatus(automation.id, nextStatus)
    setAutomations(prev => prev.map(item => item.id === automation.id ? { ...item, status: nextStatus } : item))
  }

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return automations
    return automations.filter(item =>
      [item.name, item.type, item.company?.name, item.company?.industry]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(needle))
    )
  }, [automations, search])

  const active = automations.filter(item => item.status === 'active').length
  const paused = automations.filter(item => item.status === 'paused').length
  const errors = automations.filter(item => item.status === 'error').length
  const messagesToday = automations.reduce((sum, item) => sum + (item.messages_today || 0), 0)

  return (
    <div className="admin-page">
      <section className="admin-page-hero">
        <div>
          <span>مركز الأتمتة</span>
          <h1>تشغيل واتساب و n8n من مكان واحد</h1>
          <p>راقب الأتمتات النشطة، الأخطاء، الرسائل اليومية، وروابط n8n لكل شركة بدون الدخول على كل حساب يدويًا.</p>
        </div>
        <button type="button" onClick={load}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          تحديث
        </button>
      </section>

      <div className="admin-metric-strip">
        {[
          { label: 'نشطة', value: active, color: '#10B981' },
          { label: 'متوقفة', value: paused, color: '#F59E0B' },
          { label: 'تحتاج انتباه', value: errors, color: '#EF4444' },
          { label: 'رسائل اليوم', value: messagesToday.toLocaleString('en-US'), color: '#1565C0' },
        ].map(item => (
          <article key={item.label}>
            <span style={{ background: item.color }} />
            <strong>{item.value}</strong>
            <small>{item.label}</small>
          </article>
        ))}
      </div>

      {errors > 0 && (
        <div className="admin-alert-line">
          <AlertTriangle size={16} />
          يوجد {errors} أتمتة تحتاج مراجعة قبل أن تؤثر على رسائل العملاء.
        </div>
      )}

      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={15} />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="ابحث عن أتمتة أو شركة..." />
        </div>
      </div>

      <div className="admin-automation-grid">
        {filtered.map(automation => {
          const meta = typeMeta[automation.type] ?? typeMeta.crm
          const Icon = meta.icon
          return (
            <article key={automation.id} className={automation.status === 'error' ? 'danger' : ''}>
              <header>
                <div className="admin-automation-icon" style={{ color: meta.color, background: `${meta.color}14`, borderColor: `${meta.color}2E` }}>
                  <Icon size={18} />
                </div>
                <div>
                  <h3>{automation.name}</h3>
                  <p>{automation.company?.name || 'بدون شركة'} · {meta.label}</p>
                </div>
                <StatusBadge status={automation.status} />
              </header>

              <div className="admin-automation-stats">
                <span><strong>{automation.messages_today || 0}</strong><small>اليوم</small></span>
                <span><strong>{automation.messages_month || 0}</strong><small>الشهر</small></span>
                <span><strong>{automation.response_rate || 0}%</strong><small>استجابة</small></span>
              </div>

              <div className="admin-response-bar">
                <span style={{ width: `${Math.min(100, automation.response_rate || 0)}%` }} />
              </div>

              <footer>
                {automation.n8n_workflow_id && (
                  <a
                    href={`${(automation as any).n8n_instance_url || 'https://keepcalm.app.n8n.cloud'}/workflow/${automation.n8n_workflow_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={13} />
                    فتح n8n
                  </a>
                )}
                {automation.status !== 'error' && (
                  <button type="button" onClick={() => toggle(automation)}>
                    {automation.status === 'active' ? <Pause size={13} /> : <Play size={13} />}
                    {automation.status === 'active' ? 'إيقاف مؤقت' : 'تشغيل'}
                  </button>
                )}
              </footer>
            </article>
          )
        })}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="admin-empty-state">لا توجد أتمتات مطابقة للبحث.</div>
      )}
    </div>
  )
}
