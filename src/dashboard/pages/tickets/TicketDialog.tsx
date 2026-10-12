import { useState, type FormEvent } from 'react'
import { Check, Info } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Dialog } from '@/dashboard/components/primitives'
import { useToast } from '@/dashboard/components/uiExtras'
import {
  addTicketNote, updateOpsTicket, useTicketNotes,
  type OpsCaps, type OpsTicket, type TeamMember,
} from '@/lib/queries/ops'
import type { TicketStatus } from '@/types/dashboard'
import { PRIORITY, STATUS, customerOf, dueLabel, isAiOpened, isLate, phoneOf, relTime, shortId, typeOf } from './ticketModel'

const STATUS_NOTE: Record<TicketStatus, string> = { open: 'أُعيد فتحها', in_progress: 'بدأت المعالجة', resolved: 'تم الحل' }

function Chip({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span className="ops-chip" style={{ color, background: bg }}>{label}</span>
}

export function TicketDialog({ ticket, onClose, caps, team, isDemo, base, agentName, authorName, canOpenCalls }: {
  ticket: OpsTicket | null
  onClose: () => void
  caps: OpsCaps
  team: TeamMember[]
  isDemo: boolean
  base: string
  agentName: string
  authorName: string
  canOpenCalls: boolean
}) {
  const pushToast = useToast()
  const navigate = useNavigate()
  const notesEnabled = caps.ticketNotes
  const { data: notes } = useTicketNotes(ticket?.id ?? null, ticket?.company_id ?? null, isDemo, notesEnabled)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  if (!ticket) return <Dialog open={false} title="" onClose={onClose}>{null}</Dialog>
  const t = ticket
  const p = PRIORITY[t.priority] || PRIORITY.normal
  const st = STATUS[t.status] || STATUS.open
  const late = isLate(t)
  const phone = phoneOf(t)
  const owner = team.find((m) => (t.assignee_user_id && m.auth_user_id === t.assignee_user_id) || m.full_name === t.assignee_name)

  async function setStatus(status: TicketStatus) {
    setBusy(true)
    try {
      await updateOpsTicket(t.id, { status }, isDemo)
      await addTicketNote({ ticket_id: t.id, company_id: t.company_id, kind: 'status', body: STATUS_NOTE[status], author_name: authorName }, caps, isDemo).catch(() => {})
      pushToast({ kind: 'success', title: status === 'resolved' ? 'تم حل التذكرة' : STATUS_NOTE[status] })
      if (status === 'resolved') onClose()
    } catch (e) {
      pushToast({ kind: 'danger', title: 'تعذّر تحديث التذكرة', description: e instanceof Error ? e.message : undefined })
    } finally {
      setBusy(false)
    }
  }

  async function setOwner(memberId: string) {
    const m = team.find((x) => x.id === memberId) || null
    try {
      await updateOpsTicket(t.id, { assignee_user_id: m?.auth_user_id ?? null, assignee_name: m?.full_name ?? null }, isDemo)
      await addTicketNote({ ticket_id: t.id, company_id: t.company_id, kind: 'assign', body: m ? `معيّنة لـ ${m.full_name}` : 'شيل المسؤول', author_name: authorName }, caps, isDemo).catch(() => {})
    } catch (e) {
      pushToast({ kind: 'danger', title: 'تعذّر تغيير المسؤول', description: e instanceof Error ? e.message : undefined })
    }
  }

  async function submitNote(e: FormEvent) {
    e.preventDefault()
    const body = note.trim()
    if (!body) return
    try {
      await addTicketNote({ ticket_id: t.id, company_id: t.company_id, kind: 'note', body, author_name: authorName }, caps, isDemo)
      setNote('')
    } catch (err) {
      pushToast({ kind: 'danger', title: 'تعذّر إضافة الملاحظة', description: err instanceof Error ? err.message : undefined })
    }
  }

  const go = (path: string) => { onClose(); navigate(`${base}${path}`) }
  let source: { label: string; onClick: () => void } | null = null
  if (t.ai_call_id && canOpenCalls) source = { label: 'افتح المكالمة', onClick: () => go(`/conversations?id=call:${t.ai_call_id}`) }
  else if (t.conversation_id) source = { label: 'افتح المحادثة', onClick: () => go(`/conversations`) }
  else if (t.route?.startsWith('google_review')) source = { label: 'افتح التقييم', onClick: () => go('/reviews') }

  return (
    <Dialog
      open title={t.subject} onClose={onClose}
      footer={<>
        {t.status !== 'open' && <Button variant="secondary" disabled={busy} onClick={() => setStatus('open')}>إعادة فتح</Button>}
        {t.status === 'open' && <Button variant="secondary" disabled={busy} onClick={() => setStatus('in_progress')}>بدء المعالجة</Button>}
        {t.status !== 'resolved'
          ? <Button disabled={busy} onClick={() => setStatus('resolved')}><Check size={15} /> تم الحل</Button>
          : <Button variant="secondary" onClick={onClose}>إغلاق</Button>}
      </>}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
        <span style={{ color: 'var(--dim)', fontFamily: 'var(--font-numeral)' }}>{shortId(t)}</span>
        <Chip label={st.label} color={st.color} bg="var(--hover-bg)" />
        <Chip label={p.label} color={p.color} bg={p.bg} />
        {isAiOpened(t) && <Chip label="فتحها الوكيل الذكي" color="var(--ai)" bg="var(--ai-bg)" />}
      </div>
      <p style={{ margin: '0 0 14px', color: 'var(--muted)', fontSize: 13 }}>{customerOf(t)} · {typeOf(t)} · {relTime(t.created_at)}</p>

      <dl className="ops-kv">
        <dt>وقت الرد</dt>
        <dd style={{ color: late ? 'var(--bad)' : undefined }}>{dueLabel(t)}</dd>
        {phone && <><dt>الجوال</dt><dd dir="ltr" style={{ textAlign: 'end', fontFamily: 'var(--font-numeral)' }}>{phone}</dd></>}
        {caps.ticketExtras && <>
          <dt><label htmlFor="tk-who">المسؤول</label></dt>
          <dd>
            <select id="tk-who" className="ops-input sm" style={{ maxWidth: 220 }} value={owner?.id ?? ''} onChange={(e) => setOwner(e.target.value)}>
              <option value="">بدون مسؤول</option>
              {team.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </dd>
        </>}
        {source && <><dt>المصدر</dt><dd><button type="button" className="ops-link" onClick={source.onClick}>{source.label}</button></dd></>}
      </dl>

      {t.description && <div className="ops-desc">{t.description}</div>}

      <div className="ops-timeline">
        <div className="ops-tl"><i /><div>{isAiOpened(t) ? `${agentName} فتح التذكرة من المكالمة` : 'فتحها الفريق يدويًا'}<small>{relTime(t.created_at)}</small></div></div>
        {!notesEnabled && t.assignee_name && <div className="ops-tl"><i /><div>معيّنة لـ {t.assignee_name}</div></div>}
        {(notes || []).map((n) => (
          <div key={n.id} className="ops-tl">
            <i style={{ background: n.kind === 'note' ? 'var(--ok)' : n.kind === 'status' ? 'var(--warn)' : 'var(--sky)' }} />
            <div>{n.body}<small>{n.author_name || 'الفريق'} · {relTime(n.created_at)}</small></div>
          </div>
        ))}
      </div>

      {notesEnabled ? (
        <form className="ops-reply" onSubmit={submitNote}>
          <input className="ops-input" aria-label="ملاحظة داخلية" placeholder="أضف ملاحظة داخلية" autoComplete="off" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button variant="secondary" disabled={!note.trim()}>إضافة</Button>
        </form>
      ) : (
        <div className="ops-note" style={{ marginTop: 14 }}>
          <Info size={14} />
          <span>{caps.ticketExtras ? 'الملاحظات الداخلية تتفعّل بعد تحديث قاعدة البيانات.' : 'تعيين المسؤول والملاحظات الداخلية تتفعّل بعد تحديث قاعدة البيانات.'}</span>
        </div>
      )}
    </Dialog>
  )
}
