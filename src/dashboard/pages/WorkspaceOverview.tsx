import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '@/context/WorkspaceContext'
import { supabase } from '@/lib/supabase'
import { useIntegrations } from '@/lib/dashboardQueries'
import { useVoiceServices } from '@/lib/queries/agentConfig'
import { useVoiceRead, voiceRead, type VoiceAgent, type VoiceCallSummary } from '@/lib/queries/voicePlatform'
import { saudiHour } from '@/lib/saudiTime'
import { HourlyChart, KpiTiles, ReplyRing, type KpiTile } from './home/sections'
import { PillBar } from './HomeWidgets'

// Workspace overview: what the workspace holds (agents, voice lines, team, integrations) and how the
// voice agents' calls went over the last 30 days. Calls come from the voice platform through nabrah-read.

const DAY = 86_400_000
const fmtN = (n: number) => n.toLocaleString('en')
const ANSWERED = new Set(['completed', 'ended', 'success', 'answered'])
const MISSED = new Set(['no_answer', 'no-answer', 'missed', 'busy', 'failed', 'canceled', 'cancelled'])

function fmtDur(sec: number): string {
  if (!sec) return '—'
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return m ? `${m}د ${s}ث` : `${s}ث`
}

/** Tour data: two agents and a month of calls, so the page reads like a live workspace. */
function demoData(): { agents: VoiceAgent[]; calls: VoiceCallSummary[] } {
  const agents: VoiceAgent[] = [{ agent_id: 'demo-a1', name: 'وكيل الاستقبال' }, { agent_id: 'demo-a2', name: 'وكيل المتابعة' }]
  const now = Date.now()
  const calls: VoiceCallSummary[] = Array.from({ length: 64 }, (_, i) => ({
    id: `demo-c${i}`, agent_id: i % 3 ? 'demo-a1' : 'demo-a2', call_type: i % 4 ? 'inbound' : 'outbound',
    status: i % 6 === 0 ? 'no_answer' : 'completed', duration: 30 + ((i * 37) % 180),
    created_at: new Date(now - ((i * 11) % 29) * DAY - ((9 + (i % 10)) % 24) * 3600_000).toISOString(),
  }))
  return { agents, calls }
}

export function DashboardV2WorkspaceOverview() {
  const { companyId, companyName, isDemo, usageMetrics } = useWorkspace()
  const navigate = useNavigate()
  const base = isDemo ? '/demo-review' : '/dashboard'
  const { data: integrations } = useIntegrations(companyId, isDemo)
  const { items: lines } = useVoiceServices(companyId, isDemo)
  const agentsRead = useVoiceRead<{ agents: VoiceAgent[] }>(isDemo ? null : companyId || 'admin', 'agents')
  const demo = useMemo(() => (isDemo ? demoData() : null), [isDemo])
  const agents = demo ? demo.agents : agentsRead.data?.agents ?? []

  const [liveCalls, setCalls] = useState<VoiceCallSummary[] | null>(null)
  const calls = demo ? demo.calls : liveCalls
  const agentKey = agents.map((a) => a.agent_id).join(',')
  useEffect(() => {
    if (demo) return
    if (agentsRead.loading) return
    let off = false
    Promise.all(agents.map((a) => voiceRead<{ calls: VoiceCallSummary[] }>('calls', { agent_id: a.agent_id, limit: 50 })
      .then((r) => (r.calls ?? []).map((c) => ({ ...c, agent_id: c.agent_id || a.agent_id })))
      .catch(() => [] as VoiceCallSummary[])))
      .then((lists) => { if (!off) setCalls(lists.flat()) })
    return () => { off = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentKey, agentsRead.loading, demo])

  const [liveTeam, setTeam] = useState<number | null>(null)
  const team = isDemo ? 4 : liveTeam
  useEffect(() => {
    if (isDemo || !companyId) return
    void supabase.from('company_users').select('id', { count: 'exact', head: true }).eq('company_id', companyId)
      .then(({ count }) => setTeam((count ?? 0) + 1))
  }, [companyId, isDemo])

  const month = useMemo(() => {
    const from = Date.now() - 30 * DAY
    const list = (calls ?? []).filter((c) => Date.parse(c.created_at) >= from)
    const answered = list.filter((c) => ANSWERED.has(String(c.status).toLowerCase())).length
    const missed = list.filter((c) => MISSED.has(String(c.status).toLowerCase())).length
    const durations = list.map((c) => Number(c.duration) || 0).filter((d) => d > 0)
    const hourly = Array.from({ length: 24 }, () => 0)
    for (const c of list) hourly[saudiHour(c.created_at)]++
    const perAgent = agents.map((a) => ({ name: a.name, n: list.filter((c) => c.agent_id === a.agent_id).length })).sort((x, y) => y.n - x.n)
    return {
      total: list.length, answered, missed, hourly, perAgent,
      avg: durations.length ? durations.reduce((s, d) => s + d, 0) / durations.length : 0,
    }
  }, [calls, agents])

  const connected = (integrations ?? []).filter((i) => i.status === 'connected').length
  const stats: KpiTile[] = [
    { label: 'وكلاء الصوت', value: fmtN(agents.length), note: 'في هذه المساحة' },
    { label: 'قنوات الصوت', value: fmtN(lines.length), note: 'خطوط وارد وصادر' },
    { label: 'أعضاء الفريق', value: team == null ? '—' : fmtN(team), note: 'مع مالك الحساب' },
    { label: 'التكاملات', value: fmtN(connected), note: 'مربوطة الآن' },
  ]
  const loadingCalls = calls == null
  const perf: KpiTile[] = [
    { label: 'إجمالي المكالمات', value: loadingCalls ? '…' : fmtN(month.total), note: 'آخر 30 يوم' },
    { label: 'المكالمات الفائتة', value: loadingCalls ? '…' : fmtN(month.missed), note: 'ما انرد عليها' },
    { label: 'معدل النجاح', value: month.total ? `${Math.round((month.answered / month.total) * 100)}%` : '—', note: 'مكالمات اكتملت' },
    { label: 'متوسط المدة', value: fmtDur(month.avg), note: 'للمكالمة الواحدة' },
  ]

  const quota = usageMetrics.find((m) => m.key === 'smart_calls' && m.limit > 0) ?? usageMetrics.find((m) => m.limit > 0)
  const maxAgent = Math.max(1, ...month.perAgent.map((a) => a.n))

  return (
    <div className="nx-page">
      <div className="nx-head">
        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: 12, color: 'var(--dim)' }}>مساحة العمل</span>
          <h1 className="nx-h1">{companyName || 'مساحة العمل'}</h1>
          <p className="nx-h1-sub">لمحة سريعة عن هذه المساحة.</p>
        </div>
      </div>

      <section aria-label="إحصاءات مساحة العمل"><KpiTiles tiles={stats} wide /></section>

      <section aria-label="أداء المكالمات" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, color: 'var(--ink)' }}>أداء المكالمات</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>مجمّع من مكالمات الوكلاء لآخر 30 يوم.</p>
          </div>
          <button type="button" className="nx-link" onClick={() => navigate(`${base}/call-logs`)}>سجل المكالمات</button>
        </div>
        <KpiTiles tiles={perf} wide />
      </section>

      <div className="nx-grid-2">
        <HourlyChart title="التوزيع الساعي" counts={month.hourly} startHour={0} spanWord="آخر 30 يوم" />
        <ReplyRing
          title={quota ? `هامش الحصة · ${quota.label}` : 'هامش الحصة'} total={quota ? quota.used : 0} totalLabel={quota ? `من ${fmtN(quota.limit)}` : 'ما فيه باقة'}
          parts={quota ? [
            { label: 'المستهلك', value: quota.used, color: 'var(--ring-1)' },
            { label: 'المتبقي', value: Math.max(0, quota.limit - quota.used), color: 'var(--ring-3)' },
          ] : []}
        />
      </div>

      <div className="nx-grid-2">
        <div className="nx-card">
          <h3>استخدام الوكلاء<span className="nx-aside">مكالمات كل وكيل · آخر 30 يوم</span></h3>
          {month.perAgent.length === 0
            ? <div className="nx-empty">{agentsRead.loading ? 'جارِ التحميل…' : 'ما فيه وكلاء مربوطين بهذه المساحة.'}</div>
            : month.perAgent.map((a) => <PillBar key={a.name} label={a.name} value={a.n} max={maxAgent} />)}
        </div>
        <ReplyRing
          title="التوزيع" total={agents.length + (team ?? 0) + lines.length} totalLabel="عنصر"
          parts={[
            { label: 'الوكلاء', value: agents.length, color: 'var(--ring-1)' },
            { label: 'الفريق', value: team ?? 0, color: 'var(--ring-2)' },
            { label: 'خطوط الصوت', value: lines.length, color: 'var(--ring-3)' },
          ]}
        />
      </div>
    </div>
  )
}
