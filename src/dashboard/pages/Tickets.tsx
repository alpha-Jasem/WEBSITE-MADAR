import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bot, Clock, Columns3, Download, LayoutGrid, ListChecks, MoreHorizontal, Plus, Search, Ticket } from 'lucide-react'
import { NB_CSS } from './shared/nbPage'
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
// The page follows the reference ticketing layout: board or cards, filters, and status / assignment counts.
import './tickets/ops.css'

type Filter = 'all' | 'mine' | 'unassigned' | 'assigned'
type StatusFilter = 'all' | TicketStatus
type View = 'kanban' | 'cards'
const COLUMNS: TicketStatus[] = ['open', 'in_progress', 'resolved', 'snoozed']
const STATUS_NOTE: Record<TicketStatus, string> = { open: 'أُعيد فتحها', in_progress: 'علّقها الفريق', resolved: 'أُغلقت', snoozed: 'أُجّلت' }

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

const TK_CSS = `
.tk-count { display: inline-flex; align-items: center; gap: 6px; height: 38px; padding: 0 14px; border-radius: 12px; border: 1px solid var(--line); background: var(--panel); color: var(--muted); font-size: 13px; }
.tk-count b { color: var(--ink); }
.tk-view { display: inline-flex; gap: 2px; padding: 3px; border-radius: 12px; border: 1px solid var(--line); background: var(--panel); }
.tk-view button { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; border: 0; border-radius: 9px; background: transparent; color: var(--muted); font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; }
.tk-view button[aria-pressed="true"] { background: var(--hover-bg); color: var(--ink); box-shadow: 0 0 0 1px var(--line); }
.tk-menu { position: absolute; z-index: 21; inset-inline-end: 0; top: 44px; min-width: 190px; background: var(--panel); border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 12px 30px rgba(0,0,0,.14); padding: 6px; }
.tk-menu button { width: 100%; display: flex; align-items: center; gap: 8px; border: 0; background: none; color: var(--ink); font: inherit; font-size: 13.5px; padding: 9px 10px; border-radius: 9px; cursor: pointer; text-align: start; }
.tk-menu button:hover { background: var(--hover-bg); }
.tk-two { display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px; }
@media (max-width: 860px) { .tk-two { grid-template-columns: 1fr; } }
.tk-box { display: grid; gap: 10px; }
.tk-box > b { font-size: 12.5px; color: var(--muted); font-weight: 600; }
.tk-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.tk-chip { display: inline-flex; align-items: center; gap: 8px; height: 38px; padding: 0 12px; border-radius: 12px; border: 1px solid var(--line); background: var(--panel); color: var(--ink); font: inherit; font-size: 13px; cursor: pointer; }
.tk-chip .n { min-width: 22px; height: 20px; padding: 0 6px; border-radius: 999px; background: var(--hover-bg); color: var(--muted); font-size: 11.5px; display: inline-grid; place-items: center; }
.tk-chip[aria-pressed="true"] { background: var(--hover-bg); border-color: var(--ink); box-shadow: 0 0 0 1px var(--ink); font-weight: 600; }
.tk-chip:focus-visible, .tk-view button:focus-visible { outline: 3px solid var(--accent, #6c4cf1); outline-offset: 2px; }
`

export function DashboardV2Tickets() {
  const { companyId, isDemo, userName, hasModule, accountLoading } = useWorkspace()
  const pushToast = useToast()
  const base = isDemo ? '/demo-review' : '/dashboard'
  const { caps, ready } = useOpsCaps(isDemo, accountLoading)
  const { data: tickets, loading, error, refetch } = useOpsTickets(companyId, isDemo)
  const { data: team } = useTeam(companyId, isDemo)
  const me = useCurrentUserId(isDemo)
  const [filter, setFilter] = useState<Filter>('all')
  const [statusF, setStatusF] = useState<StatusFilter>('all')
  const [view, setView] = useState<View>('kanban')
  const [days, setDays] = useState(30)
  const [priorityF, setPriorityF] = useState('')
  const [typeF, setTypeF] = useState('')
  const [assigneeF, setAssigneeF] = useState('')
  const [contactQ, setContactQ] = useState('')
  const [q, setQ] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
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

  // Filters in the order of the reference page: period, priority, type, assignee, contact;
  // then the status and assignment counts, each of which narrows the list too.
  const isAssigned = (t: OpsTicket) => !!(t.assignee_user_id || t.assignee_name)
  const base0 = all.filter((t) => {
    if (days && Date.now() - Date.parse(t.created_at) > days * 86_400_000) return false
    if (priorityF && t.priority !== priorityF) return false
    if (typeF && typeOf(t) !== typeF) return false
    if (assigneeF && (t.assignee_user_id || t.assignee_name) !== assigneeF) return false
    if (q.trim() && ![t.subject, customerOf(t), t.customer_phone, shortId(t)].some((v) => String(v ?? '').toLowerCase().includes(q.trim().toLowerCase()))) return false
    if (contactQ.trim()) {
      const q = contactQ.trim().toLowerCase()
      if (![customerOf(t), t.customer_phone].some((v) => String(v ?? '').toLowerCase().includes(q))) return false
    }
    return true
  })
  const byAssign = (t: OpsTicket, f: Filter) =>
    f === 'mine' ? !!me && t.assignee_user_id === me : f === 'unassigned' ? !isAssigned(t) : f === 'assigned' ? isAssigned(t) : true
  const list = base0.filter((t) => byAssign(t, filter) && (statusF === 'all' || t.status === statusF))
  const statusCount = (s: StatusFilter) => base0.filter((t) => byAssign(t, filter) && (s === 'all' || t.status === s)).length
  const assignCount = (f: Filter) => base0.filter((t) => (statusF === 'all' || t.status === statusF) && byAssign(t, f)).length
  const types = useMemo(() => [...new Set(all.map(typeOf))], [all])
  const assignees = useMemo(() => {
    const m = new Map<string, string>()
    for (const t of all) { const k = t.assignee_user_id || t.assignee_name; if (k) m.set(k, t.assignee_name || 'عضو الفريق') }
    return [...m.entries()]
  }, [all])
  const openTicket = all.find((t) => t.id === openId) || null

  function exportCsv() {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const head = ['الرقم', 'الموضوع', 'العميل', 'الجوال', 'النوع', 'الأولوية', 'الحالة', 'المسؤول', 'تاريخ الإنشاء']
    const lines = list.map((t) => [shortId(t), t.subject, customerOf(t), t.customer_phone, typeOf(t), PRIORITY[t.priority]?.label, STATUS[t.status]?.label, t.assignee_name, new Date(t.created_at).toLocaleString('ar-SA-u-ca-gregory-nu-latn')].map(esc).join(','))
    const blob = new Blob(['﻿' + [head.map(esc).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `tickets-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

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

  const assignFilters: [Filter, string][] = [
    ['all', 'الكل'],
    ...(caps.ticketExtras ? [['mine', 'تذاكري'], ['unassigned', 'غير مُسندة'], ['assigned', 'مُسندة']] as [Filter, string][] : []),
  ]
  const statusFilters: [StatusFilter, string][] = [['all', 'الكل'], ...COLUMNS.map((s) => [s, STATUS[s].label] as [StatusFilter, string])]
  const dot = (c: string) => <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, flex: 'none' }} />
  const statusDot: Record<string, string> = { all: 'var(--sky)', open: STATUS.open.color, in_progress: STATUS.in_progress.color, resolved: STATUS.resolved.color, snoozed: STATUS.snoozed.color }
  const assignDot: Record<string, string> = { all: 'var(--sky)', mine: 'var(--info)', unassigned: 'var(--warn)', assigned: 'var(--ok)' }

  return (
    <div className="ops-page">
      <style>{NB_CSS + TK_CSS}</style>
      <div className="ops-head">
        <div>
          <h1 className="ops-h1">التذاكر</h1>
          <p className="ops-sub">أدر تذاكر العملاء عبر جميع القنوات. الوكيل الذكي يفتحها تلقائيًا من المكالمات.</p>
        </div>
        <div className="nb-acts">
          <span className="tk-count"><Ticket size={15} /> <b className="nx-num">{loading ? '…' : list.length}</b> تذكرة</span>
          <div className="tk-view" role="group" aria-label="طريقة العرض">
            <button type="button" aria-pressed={view === 'cards'} onClick={() => setView('cards')}><LayoutGrid size={14} /> بطاقات</button>
            <button type="button" aria-pressed={view === 'kanban'} onClick={() => setView('kanban')}><Columns3 size={14} /> أعمدة</button>
          </div>
          <button type="button" className="nb-btn sec" disabled={list.length === 0} onClick={exportCsv}><Download size={15} /> تصدير</button>
          {caps.ticketBoard && (
            <span style={{ position: 'relative' }}>
              <button type="button" className="nb-btn sec" style={{ padding: '0 11px' }} aria-label="المزيد" aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)}><MoreHorizontal size={16} /></button>
              {moreOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={() => setMoreOpen(false)} />
                  <div className="tk-menu" role="menu">
                    <button type="button" role="menuitem" onClick={() => { setMoreOpen(false); setStagesOpen(true) }}><Columns3 size={14} /> تخصيص الأعمدة</button>
                  </div>
                </>
              )}
            </span>
          )}
          <span className="shell-dup"><button type="button" className="nb-btn" onClick={() => { setCallId(null); setNewOpen(true) }}><Plus size={16} /> تذكرة جديدة</button></span>
        </div>
      </div>

      <div className="nb-card tk-filters">
        <div className="nb-filters">
          <label className="nb-search"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالموضوع أو جهة الاتصال أو رقم التذكرة" aria-label="بحث في التذاكر" /></label>
          <select className="nb-select" aria-label="الفترة" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>آخر 7 أيام</option><option value={30}>آخر 30 يومًا</option><option value={90}>آخر 90 يومًا</option><option value={0}>كل الوقت</option>
          </select>
          <select className="nb-select" aria-label="الأولوية" value={priorityF} onChange={(e) => setPriorityF(e.target.value)}>
            <option value="">الأولوية</option>{Object.entries(PRIORITY).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
          </select>
          <select className="nb-select" aria-label="النوع" value={typeF} onChange={(e) => setTypeF(e.target.value)}>
            <option value="">كل الأنواع</option>{types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {caps.ticketExtras && (
            <select className="nb-select" aria-label="المُسند إليه" value={assigneeF} onChange={(e) => setAssigneeF(e.target.value)}>
              <option value="">المُسند إليه</option>{assignees.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </select>
          )}
          <input className="nb-select" aria-label="جهة الاتصال" placeholder="جهة الاتصال" value={contactQ} onChange={(e) => setContactQ(e.target.value)} style={{ minWidth: 150 }} />
        </div>
      </div>

      <div className="tk-two">
        <div className="nb-card tk-box">
          <b>الحالة</b>
          <div className="tk-chips" role="group" aria-label="الحالة">
            {statusFilters.map(([k, l]) => <button key={k} type="button" className="tk-chip" aria-pressed={statusF === k} onClick={() => setStatusF(k)}>{dot(statusDot[k])}{l}<span className="n nx-num">{loading ? '' : statusCount(k)}</span></button>)}
          </div>
        </div>
        <div className="nb-card tk-box">
          <b>الإسناد</b>
          <div className="tk-chips" role="group" aria-label="الإسناد">
            {assignFilters.map(([k, l]) => <button key={k} type="button" className="tk-chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>{dot(assignDot[k])}{l}<span className="n nx-num">{loading ? '' : assignCount(k)}</span></button>)}
          </div>
        </div>
      </div>

      {error && <div className="ops-note" style={{ background: 'var(--bad-bg)', color: 'var(--bad)' }}>تعذّر تحميل التذاكر: {error}</div>}

      {view === 'cards' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {loading ? [0, 1, 2].map((i) => <Skeleton key={i} height={96} radius="14px" />)
            : list.length ? list.map((t) => <TicketCard key={t.id} t={t} onOpen={() => setOpenId(t.id)} subtasks={progress.get(t.id)} />)
            : <div className="ops-empty-line">لا توجد تذاكر. عدّل عوامل التصفية أو أنشئ تذكرة جديدة للبدء.</div>}
        </div>
      )}

      {view === 'kanban' && <div className={`ops-board${cols.length > 3 ? ' many' : ''}`}>
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
                  : <div className="ops-empty-line">{dropKey === c.key ? 'أفلتها هنا' : 'لا توجد تذاكر'}</div>}
            </section>
          )
        })}
      </div>}

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
