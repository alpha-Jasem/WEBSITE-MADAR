import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bot, Clock, Columns3, ListChecks, Plus } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { Button } from '@/dashboard/components/primitives'
import { useToast, Skeleton } from '@/dashboard/components/uiExtras'
import {
  addTicketNote, findTicketForCall, updateOpsTicket, useCompanySubtasks, useCurrentUserId, useOpsCaps, useOpsTickets, useTeam, useTicketStages,
  type OpsTicket,
} from '@/lib/queries/ops'
import type { TicketStatus } from '@/types/dashboard'
import { useShellPrimaryAction } from '@/dashboard/components/shellActions'
import { NewTicketDialog } from './tickets/NewTicketDialog'
import { TicketDialog } from './tickets/TicketDialog'
import { StagesDialog } from './tickets/StagesDialog'
import { PRIORITY, STATUS, customerOf, dueLabel, isAiOpened, isLate, relTime, shortId, typeOf } from './tickets/ticketModel'
import './tickets/ops.css'

type Filter = 'all' | 'mine' | 'unassigned' | 'late'
const COLUMNS: TicketStatus[] = ['open', 'in_progress', 'resolved']
const STATUS_NOTE: Record<TicketStatus, string> = { open: 'أُعيد فتحها', in_progress: 'بدأت المعالجة', resolved: 'تم الحل' }

/** One board column: a company stage, or one of the three statuses when the company has none. */
interface Col { key: string; label: string; color: string; status: TicketStatus; stageId: string | null }

function TicketCard({ t, onOpen, subtasks }: { t: OpsTicket; onOpen: () => void; subtasks?: { done: number; total: number } }) {
  const p = PRIORITY[t.priority] || PRIORITY.normal
  const late = isLate(t)
  return (
    <button
      type="button" className="ops-tk" style={{ ['--pri' as string]: p.color }} onClick={onOpen}
      draggable onDragStart={(e) => { e.dataTransfer.setData('text/ticket', t.id); e.dataTransfer.effectAllowed = 'move' }}
    >
      <span className="id">
        <span style={{ fontFamily: 'var(--font-numeral)' }}>{shortId(t)}</span>
        {isAiOpened(t) && (
          <span className="ops-chip" style={{ color: 'var(--ai)', background: 'var(--ai-bg)' }}><Bot size={12} />الوكيل الذكي</span>
        )}
        <span style={{ marginInlineStart: 'auto' }}>{relTime(t.created_at)}</span>
      </span>
      <p>{t.subject}</p>
      <span className="meta">{customerOf(t)} · {typeOf(t)}</span>
      <span className="meta">
        <span className="ops-chip" style={{ color: p.color, background: p.bg }}>{p.label}</span>
        <span style={{ color: late ? 'var(--bad)' : 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Clock size={13} /> {dueLabel(t)}
        </span>
        {t.assignee_name
          ? <span className="ops-who" title={t.assignee_name}>{t.assignee_name.trim()[0]}</span>
          : <span className="ops-who none" title="بدون مسؤول">؟</span>}
        {subtasks && subtasks.total > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: subtasks.done === subtasks.total ? 'var(--ok)' : 'var(--muted)' }}>
            <ListChecks size={13} /> {subtasks.done}/{subtasks.total}
          </span>
        )}
      </span>
    </button>
  )
}

export function DashboardV2Tickets() {
  const { companyId, isDemo, userName, hasModule, accountLoading } = useWorkspace()
  const pushToast = useToast()
  const base = isDemo ? '/demo-review' : '/dashboard'
  const { caps, ready } = useOpsCaps(isDemo, accountLoading)
  const { data: tickets, loading, error, refetch } = useOpsTickets(companyId, isDemo)
  const { data: team } = useTeam(companyId, isDemo)
  const me = useCurrentUserId(isDemo)
  const [filter, setFilter] = useState<Filter>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [callId, setCallId] = useState<string | null>(null)
  const [stagesOpen, setStagesOpen] = useState(false)
  const [dropKey, setDropKey] = useState<string | null>(null)
  const { data: stageRows } = useTicketStages(companyId, isDemo, caps.ticketBoard)
  const { data: subtaskRows } = useCompanySubtasks(companyId, isDemo, caps.ticketBoard)
  const stages = useMemo(() => stageRows || [], [stageRows])
  const [params, setParams] = useSearchParams()
  const handledParams = useRef(false)
  useShellPrimaryAction({ label: 'تذكرة جديدة', icon: <Plus />, onClick: () => { setCallId(null); setNewOpen(true) } })

  const all = useMemo(() => tickets || [], [tickets])
  const members = team || []
  const meMember = members.find((m) => m.auth_user_id && m.auth_user_id === me)
  const authorName = meMember?.full_name || userName || 'الفريق'
  const agentName = isDemo ? 'مها' : 'الوكيل الذكي'

  // ?new=1[&call=<id>] opens the new-ticket dialog (prefilled from that call). If the AI
  // already opened a ticket for the call, show that one instead of creating a duplicate.
  useEffect(() => {
    if (handledParams.current || !ready || params.get('new') !== '1') return
    handledParams.current = true
    const call = params.get('call')
    const next = new URLSearchParams(params)
    next.delete('new'); next.delete('call')
    setParams(next, { replace: true })
    if (!call) { setCallId(null); setNewOpen(true); return }
    findTicketForCall(call, caps, isDemo).then((existing) => {
      if (existing) {
        setOpenId(existing.id)
        pushToast({ kind: 'info', title: 'فيه تذكرة مفتوحة لهالمكالمة', description: 'فتحنا لك التذكرة الموجودة بدل ما نكررها.' })
      } else {
        setCallId(call)
        setNewOpen(true)
      }
    })
  }, [ready, params, setParams, caps, isDemo, pushToast])

  // ?ticket=<id> opens that ticket's detail dialog (e.g. from a call that already has one).
  useEffect(() => {
    const id = params.get('ticket')
    if (!id || loading) return
    const next = new URLSearchParams(params)
    next.delete('ticket')
    setParams(next, { replace: true })
    if (all.some((t) => t.id === id)) setOpenId(id)
    else pushToast({ kind: 'danger', title: 'ما لقينا هالتذكرة', description: 'يمكن انحذفت أو تخص حساب ثاني.' })
  }, [params, setParams, loading, all, pushToast])

  const list = all.filter((t) => {
    if (filter === 'mine') return !!me && t.assignee_user_id === me
    if (filter === 'unassigned') return !t.assignee_user_id && !t.assignee_name && t.status !== 'resolved'
    if (filter === 'late') return isLate(t)
    return true
  })
  const count = (s: TicketStatus) => all.filter((t) => t.status === s).length
  const lateCount = all.filter((t) => isLate(t)).length
  const unassignedOpen = all.filter((t) => t.status === 'open' && !t.assignee_user_id && !t.assignee_name).length
  const aiShare = all.length ? Math.round((all.filter(isAiOpened).length / all.length) * 100) : 0
  const openTicket = all.find((t) => t.id === openId) || null

  const cols: Col[] = stages.length
    ? stages.map((s) => ({ key: s.id, label: s.name, color: s.color || STATUS[s.status].color, status: s.status, stageId: s.id }))
    : COLUMNS.map((k) => ({ key: k, label: STATUS[k].label, color: STATUS[k].color, status: k, stageId: null }))
  // A ticket sits in its own stage while that stage still matches its status, otherwise in the first stage of its status.
  const colOf = (t: OpsTicket) => {
    if (!stages.length) return t.status
    const own = stages.find((s) => s.id === t.stage_id && s.status === t.status)
    return (own || stages.find((s) => s.status === t.status) || stages[0]).id
  }
  const progress = useMemo(() => {
    const m = new Map<string, { done: number; total: number }>()
    for (const s of subtaskRows || []) {
      const x = m.get(s.ticket_id) || { done: 0, total: 0 }
      x.total += 1
      if (s.done) x.done += 1
      m.set(s.ticket_id, x)
    }
    return m
  }, [subtaskRows])

  async function dropOn(col: Col, ticketId: string) {
    setDropKey(null)
    const t = all.find((x) => x.id === ticketId)
    if (!t || colOf(t) === col.key) return
    try {
      await updateOpsTicket(t.id, caps.ticketBoard ? { status: col.status, stage_id: col.stageId } : { status: col.status }, isDemo)
      const body = col.stageId ? `انتقلت إلى «${col.label}»` : STATUS_NOTE[col.status]
      await addTicketNote({ ticket_id: t.id, company_id: t.company_id, kind: 'status', body, author_name: authorName }, caps, isDemo).catch(() => {})
      if (!isDemo) refetch()
    } catch (e) {
      pushToast({ kind: 'danger', title: 'تعذّر نقل التذكرة', description: e instanceof Error ? e.message : undefined })
    }
  }

  const filters: [Filter, string][] = [
    ['all', 'الكل'],
    ...(caps.ticketExtras ? [['mine', meMember ? `المعيّنة لـ ${meMember.full_name}` : 'المعيّنة لي'], ['unassigned', 'بدون مسؤول']] as [Filter, string][] : []),
    ['late', 'متأخرة'],
  ]

  return (
    <div className="ops-page">
      <div className="ops-head">
        <div>
          <h1 className="ops-h1">التذاكر</h1>
          <p className="ops-sub">طلبات العملاء اللي تحتاج متابعة من فريقك. الوكيل الذكي يفتحها تلقائيًا من المكالمات</p>
        </div>
        <span className="shell-dup"><Button onClick={() => { setCallId(null); setNewOpen(true) }}><Plus size={15} /> تذكرة جديدة</Button></span>
      </div>

      <div className="ops-kpis">
        <div className="ops-kpi"><span>مفتوحة</span><b>{count('open')}</b><i>{caps.ticketExtras ? `${unassignedOpen} بدون مسؤول` : 'بانتظار فريقك'}</i></div>
        <div className="ops-kpi"><span>قيد المعالجة</span><b>{count('in_progress')}</b><i>يتابعها فريقك</i></div>
        <div className="ops-kpi"><span>متأخرة</span><b style={{ color: lateCount ? 'var(--bad)' : undefined }}>{lateCount}</b><i>تجاوزت وقت الرد</i></div>
        <div className="ops-kpi"><span>فتحها الوكيل الذكي</span><b>{aiShare}%</b><i>والباقي فتحها فريقك</i></div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="ops-seg" role="group" aria-label="تصفية التذاكر">
          {filters.map(([k, l]) => (
            <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
        {caps.ticketBoard && (
          <span style={{ marginInlineStart: 'auto' }}>
            <Button variant="secondary" size="sm" onClick={() => setStagesOpen(true)}><Columns3 size={14} /> تخصيص الأعمدة</Button>
          </span>
        )}
      </div>

      {error && <div className="ops-note" style={{ background: 'var(--bad-bg)', color: 'var(--bad)' }}>تعذّر تحميل التذاكر: {error}</div>}

      <div className={`ops-board${cols.length > 3 ? ' many' : ''}`}>
        {cols.map((c) => {
          const items = list.filter((t) => colOf(t) === c.key)
          return (
            <section
              key={c.key} className={`ops-col${dropKey === c.key ? ' drop' : ''}`} aria-label={c.label}
              onDragOver={(e) => { if (e.dataTransfer.types.includes('text/ticket')) { e.preventDefault(); setDropKey(c.key) } }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropKey(null) }}
              onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/ticket'); if (id) void dropOn(c, id) }}
            >
              <div className="ops-col-head">
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: c.color }} />
                {c.label}
                <span className="n">{loading ? '' : items.length}</span>
              </div>
              {loading
                ? [0, 1].map((i) => <Skeleton key={i} height={96} radius="14px" />)
                : items.length
                  ? items.map((t) => <TicketCard key={t.id} t={t} onOpen={() => setOpenId(t.id)} subtasks={progress.get(t.id)} />)
                  : <div className="ops-empty-line">{dropKey === c.key ? 'أفلتها هنا' : 'ما فيه تذاكر هنا'}</div>}
            </section>
          )
        })}
      </div>

      <TicketDialog
        ticket={openTicket} onClose={() => setOpenId(null)} caps={caps} team={members} isDemo={isDemo}
        base={base} agentName={agentName} authorName={authorName} canOpenCalls={hasModule('voice')}
        stages={stages} subtasks={(subtaskRows || []).filter((s) => s.ticket_id === openId)}
      />
      <StagesDialog open={stagesOpen} onClose={() => setStagesOpen(false)} stages={stages} companyId={companyId} isDemo={isDemo} />
      <NewTicketDialog
        open={newOpen} onClose={() => setNewOpen(false)} callId={callId} companyId={companyId} isDemo={isDemo}
        caps={caps} team={members} authorName={authorName}
        onCreated={(t) => { setNewOpen(false); setCallId(null); setOpenId(t.id); refetch() }}
      />
    </div>
  )
}
