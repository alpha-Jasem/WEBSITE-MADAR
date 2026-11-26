import { useEffect, useRef, useState } from 'react'
import { Send, Trash2 } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useCurrentUserId, useTeam } from '@/lib/queries/ops'
import { CHAT_CHANNELS, deleteTeamMessage, sendTeamMessage, useTeamChat } from '@/lib/queries/teamChat'
import { Button, Card } from '@/dashboard/components/primitives'
import { EmptyState, useToast } from '@/dashboard/components/uiExtras'
import { NightPage, PageHead } from './shared/night'

const CSS = `
.tc-wrap { display: grid; grid-template-columns: 190px minmax(0, 1fr); gap: 14px; min-height: 60vh; }
@media (max-width: 760px) { .tc-wrap { grid-template-columns: minmax(0, 1fr); } }
.tc-chans { display: flex; flex-direction: column; gap: 4px; }
@media (max-width: 760px) { .tc-chans { flex-direction: row; overflow-x: auto; } }
.tc-chan { all: unset; box-sizing: border-box; cursor: pointer; padding: 9px 12px; border-radius: 10px; font-size: 13.5px; color: var(--text-secondary); white-space: nowrap; }
.tc-chan:hover { background: var(--fill-hover, rgba(255,255,255,.05)); }
.tc-chan[aria-pressed="true"] { background: var(--fill-active, rgba(255,255,255,.1)); color: var(--ink); font-weight: 600; }
.tc-panel { display: flex; flex-direction: column; min-width: 0; height: min(68vh, 640px); }
.tc-log { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.tc-msg { max-width: min(80%, 520px); padding: 9px 12px; border-radius: 12px; background: var(--fill-hover, rgba(255,255,255,.06)); font-size: 14px; line-height: 1.55; align-self: flex-start; overflow-wrap: anywhere; }
.tc-msg.me { align-self: flex-end; background: var(--fill-active, rgba(122,162,255,.18)); }
.tc-msg b { display: block; font-size: 11.5px; color: var(--text-tertiary); margin-bottom: 2px; font-weight: 600; }
.tc-msg small { display: block; margin-top: 3px; font-size: 11px; color: var(--text-tertiary); }
.tc-msg .tc-del { all: unset; cursor: pointer; float: inline-end; color: var(--text-tertiary); margin-inline-start: 8px; }
.tc-compose { display: flex; gap: 8px; padding: 10px; border-top: 1px solid var(--line); align-items: flex-end; }
.tc-compose textarea { flex: 1; min-width: 0; resize: none; border-radius: 10px; border: 1px solid var(--border-strong); background: transparent; color: inherit; padding: 9px 11px; font: inherit; }
`

const clock = (iso: string) => new Date(iso).toLocaleTimeString('ar-SA-u-ca-gregory-nu-latn', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Riyadh' })

/** Team chat: channels where the company's teammates talk to each other (not customers). */
export function DashboardV2TeamChat() {
  const { companyId, isDemo } = useWorkspace()
  const pushToast = useToast()
  const myId = useCurrentUserId(isDemo)
  const { data: team } = useTeam(companyId, isDemo)
  const [channel, setChannel] = useState('general')
  const { messages, available } = useTeamChat(companyId, isDemo, channel)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const log = useRef<HTMLDivElement>(null)
  const myName = (team || []).find((t) => t.auth_user_id && t.auth_user_id === myId)?.full_name || 'أنا'

  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight }, [messages.length, channel])

  async function send() {
    const body = text.trim()
    if (!body || !myId) return
    setBusy(true)
    try { await sendTeamMessage(companyId, isDemo, { channel, fromId: myId, fromName: myName, body }); setText('') }
    catch (e) { pushToast({ kind: 'danger', title: 'ما انرسلت الرسالة', description: e instanceof Error ? e.message : undefined }) }
    finally { setBusy(false) }
  }

  return (
    <NightPage>
      <style>{CSS}</style>
      <PageHead title="محادثة الفريق" sub="تواصل مع زملائك داخل الشركة. هذي الرسائل ما تصل للعملاء" />
      {!available ? (
        <Card style={{ padding: 16 }}><div className="np-empty">محادثة الفريق تتفعّل بعد تحديث قاعدة البيانات.</div></Card>
      ) : (
        <div className="tc-wrap">
          <nav className="tc-chans" aria-label="القنوات">
            {CHAT_CHANNELS.map(([id, label]) => <button key={id} type="button" className="tc-chan" aria-pressed={channel === id} onClick={() => setChannel(id)}># {label}</button>)}
          </nav>
          <Card style={{ padding: 0 }}>
            <div className="tc-panel">
              <div className="tc-log" aria-live="polite" ref={log}>
                {messages.length === 0
                  ? <EmptyState title="ما فيه رسائل بعد" description="ابدأ المحادثة مع فريقك." />
                  : messages.map((m) => {
                    const mine = m.from_id === myId
                    return (
                      <div key={m.id} className={`tc-msg${mine ? ' me' : ''}`}>
                        <b>{mine ? 'أنت' : m.from_name || 'زميل'}</b>
                        {m.body}
                        <small className="nx-num">{clock(m.created_at)}{mine && <button type="button" className="tc-del" aria-label="حذف الرسالة" onClick={() => void deleteTeamMessage(companyId, isDemo, m.id)}><Trash2 size={12} /></button>}</small>
                      </div>
                    )
                  })}
              </div>
              <div className="tc-compose">
                <textarea rows={2} value={text} aria-label="رسالة للفريق" placeholder="اكتب رسالة لفريقك…" onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }} />
                <Button disabled={busy || !text.trim() || !myId} onClick={() => void send()}><Send size={14} /> إرسال</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </NightPage>
  )
}

export default DashboardV2TeamChat
