import { useState } from 'react'
import { Bot, PhoneCall, RefreshCw } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { countOf, useVoiceRead, type VoiceAgent, type VoiceCallDetail, type VoiceCallSummary } from '@/lib/queries/voicePlatform'
import { Badge, Button, Card, Dialog } from '@/dashboard/components/primitives'
import { EmptyState } from '@/dashboard/components/uiExtras'
import { NightPage, PageHead } from './shared/night'
import './growth.css'

const WORKSPACE_LISTS: [string, string][] = [
  ['tools', 'الأدوات'], ['analysis_groups', 'مجموعات التحليل'], ['knowledge_bases', 'قواعد المعرفة'], ['sip_inbound', 'خطوط الوارد'],
  ['sip_outbound', 'خطوط الصادر'], ['whatsapp_inboxes', 'أرقام واتساب'], ['contacts', 'جهات الاتصال'], ['tickets', 'التذاكر'],
]

const fmtDate = (iso: string) => { try { return new Date(iso).toLocaleString('ar-SA-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' }) } catch { return iso } }
const fmtDur = (s: number | null) => (s == null ? '—' : s >= 60 ? `${Math.floor(s / 60)}د ${s % 60}ث` : `${s}ث`)
const STATUS_AR: Record<string, string> = { completed: 'مكتملة', no_answer: 'ما ردّ', busy: 'مشغول', failed: 'فشلت', in_progress: 'جارية', queued: 'بالانتظار' }
const TYPE_AR: Record<string, string> = { web: 'ويب', inbound: 'واردة', outbound: 'صادرة', phone: 'هاتف' }

function Count({ op, label }: { op: string; label: string }) {
  const { data, error, loading } = useVoiceRead<unknown>(op, op)
  if (error) return null
  return <div className="np-kpi"><span>{label}</span><b>{loading ? '…' : countOf(data) ?? '—'}</b></div>
}

/** Voice agents: the agents behind the phone line and web calls, their call history and transcripts (read only). */
export function DashboardV2VoiceAgents() {
  const { companyId, isDemo } = useWorkspace()
  const key = isDemo ? null : companyId || 'admin'
  const agents = useVoiceRead<{ agents: VoiceAgent[] }>(key, 'agents')
  const [agentId, setAgentId] = useState<string | null>(null)
  const [callId, setCallId] = useState<string | null>(null)
  const calls = useVoiceRead<{ calls: VoiceCallSummary[]; total_count?: number }>(agentId, 'calls', { agent_id: agentId, limit: 25 })
  const detail = useVoiceRead<{ call: VoiceCallDetail }>(callId, 'call', { call_id: callId })
  const list = agents.data?.agents ?? []
  const current = list.find((a) => a.agent_id === agentId) || null

  return (
    <NightPage>
      <PageHead title="وكلاء الصوت" sub="الوكلاء اللي يردّون على المكالمات، وسجل مكالماتهم ونصوصها. للعرض فقط" actions={key ? <Button variant="secondary" onClick={() => void agents.reload()}><RefreshCw size={14} /> تحديث</Button> : undefined} />

      {isDemo && <Card style={{ padding: 16 }}><div className="np-empty">هذي الصفحة تعرض وكلاء حسابك الحقيقي، وما فيها بيانات في العرض التجريبي.</div></Card>}
      {agents.error && <Card style={{ padding: 16 }}><div className="np-empty">تعذّر جلب الوكلاء.</div></Card>}
      {!isDemo && !agents.loading && !agents.error && list.length === 0 && (
        <Card><EmptyState icon={<Bot size={20} />} title="ما فيه وكلاء صوت مربوطين بحسابك" description="لما نربط وكيلك بالحساب يظهر هنا مع مكالماته." /></Card>
      )}

      {list.length > 0 && (
        <div className="gr-grid">
          {list.map((a) => (
            <button key={a.agent_id} type="button" className="gr-card" style={{ textAlign: 'start', cursor: 'pointer', outline: a.agent_id === agentId ? '2px solid var(--ink)' : undefined }} onClick={() => setAgentId(a.agent_id)}>
              <h4>{a.name}{a.version && <Badge tone="neutral">{a.version}</Badge>}</h4>
            </button>
          ))}
        </div>
      )}

      {current && (
        <Card style={{ padding: 16, display: 'grid', gap: 10 }}>
          <AgentSummary id={current.agent_id} />
          <h3 className="np-h3"><PhoneCall size={16} /> آخر المكالمات {calls.data?.total_count != null && <span className="np-aside">{calls.data.total_count} مكالمة</span>}</h3>
          {calls.loading && <div className="np-empty">جاري التحميل…</div>}
          {calls.error && <div className="np-empty">تعذّر جلب المكالمات.</div>}
          {calls.data && calls.data.calls.length === 0 && <div className="np-empty">ما فيه مكالمات بعد.</div>}
          {calls.data?.calls.map((c) => (
            <button key={c.id} type="button" className="np-row" style={{ background: 'none', border: 0, borderBottom: '1px solid var(--line)', textAlign: 'start', cursor: 'pointer', width: '100%', color: 'inherit', font: 'inherit' }} onClick={() => setCallId(c.id)}>
              <div className="np-row-main"><b>{fmtDate(c.created_at)}</b><small>{TYPE_AR[c.call_type] || c.call_type} · {fmtDur(c.duration)}</small></div>
              <Badge tone={c.status === 'completed' ? 'success' : 'warning'}>{STATUS_AR[c.status] || c.status}</Badge>
            </button>
          ))}
        </Card>
      )}

      <WorkspaceCounts />

      <Dialog open={!!callId} title="تفاصيل المكالمة" onClose={() => setCallId(null)} width={620} footer={<Button variant="ghost" onClick={() => setCallId(null)}>إغلاق</Button>}>
        {detail.loading && <div className="np-empty">جاري التحميل…</div>}
        {detail.error && <div className="np-empty">تعذّر جلب المكالمة.</div>}
        {detail.data?.call && (
          <div style={{ display: 'grid', gap: 8, maxHeight: '60vh', overflowY: 'auto' }}>
            {(detail.data.call.transcript || []).length === 0 && <div className="np-empty">ما فيه نص لهذي المكالمة.</div>}
            {(detail.data.call.transcript || []).map((t, i) => (
              <div key={i} style={{ padding: '8px 12px', borderRadius: 10, background: t.role === 'assistant' || t.role === 'agent' ? 'var(--panel-2)' : 'var(--raise)', fontSize: 13.5, lineHeight: 1.8 }}>
                <b style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{t.role === 'assistant' || t.role === 'agent' ? 'الوكيل' : 'العميل'}</b>
                <div>{t.message}</div>
              </div>
            ))}
          </div>
        )}
      </Dialog>
    </NightPage>
  )
}

function AgentSummary({ id }: { id: string }) {
  const { data } = useVoiceRead<{ agent: VoiceAgent }>(id, 'agent', { agent_id: id })
  const a = data?.agent
  if (!a) return null
  return (
    <div style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
      <div><b>{a.name}</b></div>
      {a.first_sentence && <div>الافتتاحية: {a.first_sentence}</div>}
      <div>اللغات: {(a.languages || []).join('، ') || '—'} · الأدوات: {a.tools?.length ?? 0} · قواعد المعرفة: {a.knowledge_bases?.length ?? 0} · مجموعات التحليل: {a.analysis_groups?.length ?? 0}</div>
      {a.max_call_duration != null && <div>أقصى مدة للمكالمة: {Math.round(a.max_call_duration / 60)} دقائق</div>}
    </div>
  )
}

/** Workspace-wide counts: only an admin gets answers, everyone else sees nothing here. */
function WorkspaceCounts() {
  const probe = useVoiceRead<unknown>('probe', 'tools')
  if (probe.error || probe.loading) return null
  return (
    <Card style={{ padding: 16 }}>
      <h3 className="np-h3">ملخص مساحة العمل</h3>
      <div className="np-kpis">
        {WORKSPACE_LISTS.map(([op, label]) => <Count key={op} op={op} label={label} />)}
      </div>
    </Card>
  )
}

export default DashboardV2VoiceAgents
