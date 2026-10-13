import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Inbox as InboxIcon, RefreshCw, Phone, Copy, ExternalLink, CheckCircle2, Lock, Unlock, Ticket, Send, StickyNote, Bot, UserRound, Tag, Sparkles, X, Plus,
} from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useCustomers } from '@/lib/dashboardQueries'
import { useCurrentUserId, useTeam } from '@/lib/queries/ops'
import { fetchLiveConversations, liveToCall, markCallReviewed, syncPlatformConversations, type LiveConversation } from '@/lib/queries/conversations'
import {
  addConversationEvent, convState, deleteCannedReply, saveCannedReply, seedDemoInboxEvents, useCannedReplies, useConversationEvents,
  type ConvEvent,
} from '@/lib/queries/inbox'
import { collectedData, contactKey, normalizePhone, sentimentKind, SENTIMENT_LABEL, sentimentTone, formatValue } from '@/lib/callAnalysis'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { useToast } from '@/dashboard/components/uiExtras'
import type { SupportTicket } from '@/types/dashboard'
import { buildConversations, CHANNEL_LABEL, copyText, fmtDay, fmtDuration, fmtFull, fmtWhen, itemChip, type ConvItem } from './model'
import { ChannelIcon, Chip, Sk, TagChips } from './ui'
import { RecordingPlayer } from './RecordingPlayer'
import { MSG_TYPE_LABEL } from './model'
import './inbox.css'

type Line =
  | { k: 'msg'; who: 'a' | 'c'; name: string; text: string; time?: string }
  | { k: 'sys'; text: string; at?: string }
  | { k: 'event'; e: ConvEvent }

interface Props {
  items: ConvItem[]
  allItems: ConvItem[]
  loading: boolean
  tickets: SupportTicket[]
  showTickets: boolean
  selectedKey: string | null
  onSelect: (key: string) => void
  onOpenFull: (key: string) => void
  onTicket: (path: string) => void
}

const initials = (name: string) => (name.trim().match(/[\p{L}\p{N}]/u)?.[0] || '؟').toUpperCase()

/** Three-pane inbox: list, the conversation with a reply box, and the customer profile. */
/** One chat per WhatsApp number (like the phone app): its platform conversations become one thread. */
function groupChats(list: ConvItem[]): ConvItem[] {
  const chats = new Map<string, ConvItem[]>()
  const out: ConvItem[] = []
  for (const i of list) {
    const p = i.channel === 'whatsapp' && i.call ? normalizePhone(i.phone) : ''
    if (!p) { out.push(i); continue }
    const g = chats.get(p)
    if (g) g.push(i); else chats.set(p, [i])
  }
  for (const [p, members] of chats) {
    const sorted = [...members].sort((a, b) => a.time.localeCompare(b.time))
    const latest = sorted[sorted.length - 1]
    const tags = new Map<string, ConvItem['tags'][number]>()
    for (const m of sorted) for (const t of m.tags) tags.set(t.id, t)
    out.push({
      ...latest, key: `chat:${p}`, name: [...sorted].reverse().map((m) => m.name).find((n) => n && n !== latest.phone && n.toLowerCase() !== 'unknown') || latest.name,
      messageCount: sorted.reduce((n, m) => n + m.messageCount, 0), needsAction: sorted.some((m) => m.needsAction),
      tags: [...tags.values()], group: sorted,
    })
  }
  return out.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
}
export function Inbox({ items: baseItems, allItems, loading, tickets, showTickets, selectedKey, onSelect, onOpenFull, onTicket }: Props) {
  const { companyId, isDemo, userName } = useWorkspace()
  const { events } = useConversationEvents(companyId, isDemo)
  const [live, setLive] = useState<LiveConversation[]>([])
  const [syncing, setSyncing] = useState(false)

  // Conversations still running on the platform show up here right away, before they are saved.
  useEffect(() => {
    if (isDemo || !companyId) return
    let alive = true
    const tick = async () => {
      if (document.visibilityState === 'hidden') return
      const l = await fetchLiveConversations()
      if (alive) setLive(l)
    }
    void tick()
    const t = window.setInterval(tick, 12000)
    return () => { alive = false; window.clearInterval(t) }
  }, [isDemo, companyId])

  const items = useMemo(() => {
    const stored = new Set(allItems.map((i) => i.call?.external_id).filter(Boolean))
    const liveCalls = live.filter((l) => !stored.has(l.id) && l.transcript.length > 0).map((l) => liveToCall(l, companyId || ''))
    const liveItems = buildConversations(liveCalls, [], { includePhone: true, includeMessages: false }).map((i) => ({ ...i, live: true }))
    return groupChats([...liveItems, ...baseItems])
  }, [live, baseItems, allItems, companyId])
  const pushToast = useToast()

  // Pull anything the live webhook missed, quietly, when the inbox opens.
  useEffect(() => { if (!isDemo) void syncPlatformConversations() }, [isDemo])

  async function syncNow() {
    setSyncing(true)
    const r = await syncPlatformConversations(true)
    setSyncing(false)
    pushToast(r
      ? { kind: 'success', title: r.synced > 0 ? `جلبنا ${r.synced} محادثة جديدة` : 'كل المحادثات محدّثة', description: r.pending > 0 ? `باقي ${r.pending}، اضغط تحديث مرة ثانية` : undefined }
      : { kind: 'info', title: 'التحديث غير متاح الآن', description: 'المحادثات الجديدة تنضاف تلقائيًا أول ما تنتهي.' })
  }

  // Pick the first conversation so the middle pane is never empty.
  useEffect(() => {
    if (!selectedKey && items.length > 0) onSelect(items[0].key)
  }, [selectedKey, items, onSelect])

  useEffect(() => { if (isDemo) seedDemoInboxEvents(items.slice(0, 1).map((i) => i.key)) }, [isDemo, items])

  const item = items.find((i) => i.key === selectedKey) || allItems.find((i) => i.key === selectedKey) || null

  return (
    <div className="ib">
      <ListPane items={items} loading={loading} selectedKey={item?.key || null} onSelect={onSelect} events={events}
        onSync={isDemo ? undefined : syncNow} syncing={syncing} />
      {item ? (
        <>
          <ThreadPane key={item.key} item={item} events={events.get(item.key) || []} tickets={tickets} showTickets={showTickets}
            authorName={userName || 'أنت'} onOpenFull={onOpenFull} onTicket={onTicket} />
          <ProfilePane item={item} allItems={allItems} tickets={tickets} showTickets={showTickets} onSelect={onSelect} onOpenFull={onOpenFull} onTicket={onTicket} />
        </>
      ) : (
        <div className="ib-empty ib-span2"><InboxIcon size={26} /><b>اختر محادثة</b><span>اضغط على أي محادثة من القائمة لتشوف تفاصيلها وترد عليها.</span></div>
      )}
    </div>
  )
}

// ─── list ─────────────────────────────────────────────────────────────────────

function ListPane({ items, loading, selectedKey, onSelect, events, onSync, syncing }: {
  items: ConvItem[]; loading: boolean; selectedKey: string | null; onSelect: (k: string) => void; events: Map<string, ConvEvent[]>
  onSync?: () => void; syncing?: boolean
}) {
  return (
    <aside className="ib-list" aria-label="المحادثات">
      <div className="ib-list-head">
        <b>المحادثات <span className="nx-num">{items.length}</span></b>
        {onSync && <button type="button" className="nx-icon-btn" aria-label="تحديث من المنصة" title="جلب المحادثات الجديدة" disabled={syncing} onClick={onSync}><RefreshCw size={14} className={syncing ? 'ib-spin' : undefined} /></button>}
      </div>
      <div className="ib-list-body">
        {loading && items.length === 0 && Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ padding: '10px 14px' }}><Sk h={44} /></div>)}
        {!loading && items.length === 0 && <div className="nx-empty">ما فيه محادثات تطابق الفلاتر.</div>}
        {items.map((i) => {
          const st = convState(events.get(i.key))
          const [label, tone] = itemChip(i)
          return (
            <button key={i.key} type="button" className="ib-row" aria-current={selectedKey === i.key ? 'true' : undefined} onClick={() => onSelect(i.key)}>
              <span className="ib-avatar" aria-hidden="true">{initials(i.name)}<ChannelIcon channel={i.channel} size={11} /></span>
              <span className="ib-row-main">
                <span className="ib-row-top"><b>{i.name}</b><time>{fmtWhen(i.time)}</time></span>
                <span className="ib-row-sum">{i.summary || '—'}</span>
                <span className="ib-row-meta">
                  <Chip tone={i.live ? 'ok' : st.status === 'closed' ? 'dim' : tone}>{i.live ? '● جارية الآن' : st.status === 'closed' ? 'مغلقة' : label}</Chip>
                  {st.assigneeName && <span className="ib-assignee" title="المسؤول"><UserRound size={11} /> {st.assigneeName}</span>}
                  {i.tags.slice(0, 2).map((t) => <span key={t.id} className="nx-tag" data-c={t.color || 'gray'}>{t.label}</span>)}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

// ─── conversation ─────────────────────────────────────────────────────────────

function ThreadPane({ item, events, tickets, showTickets, authorName, onOpenFull, onTicket }: {
  item: ConvItem; events: ConvEvent[]; tickets: SupportTicket[]; showTickets: boolean; authorName: string
  onOpenFull: (k: string) => void; onTicket: (path: string) => void
}) {
  const { companyId, isDemo } = useWorkspace()
  const pushToast = useToast()
  const { data: team } = useTeam(companyId, isDemo)
  const myId = useCurrentUserId(isDemo)
  // The signed-in person can always take a conversation, even when the team list is empty.
  const people = useMemo(() => {
    const list = (team || []).filter((t) => t.auth_user_id).map((t) => ({ id: t.auth_user_id as string, name: t.full_name }))
    if (myId && !list.some((p) => p.id === myId)) list.unshift({ id: myId, name: authorName })
    return list
  }, [team, myId, authorName])
  const state = convState(events)
  const call = item.call
  const [chipLabel, chipTone] = itemChip(item)
  const ticket = call ? tickets.find((t) => t.ai_call_id === call.id) : undefined
  const bottom = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)

  const lines = useMemo<Line[]>(() => {
    const out: Line[] = []
    if (item.group) {
      item.group.forEach((g, gi) => {
        out.push({ k: 'sys', text: gi === 0 ? `بدأت المحادثة عبر واتساب · ${fmtFull(g.time)}` : `محادثة جديدة · ${fmtFull(g.time)}` })
        for (const m of g.call?.transcript || []) out.push({ k: 'msg', who: m.speaker === 'agent' ? 'a' : 'c', name: m.speaker === 'agent' ? 'الوكيل الذكي' : item.name, text: m.text, time: m.time })
        if (gi < item.group!.length - 1) out.push({ k: 'sys', text: `انتهت · ${itemChip(g)[0]}` })
      })
    } else {
      out.push({ k: 'sys', text: `بدأت المحادثة عبر ${CHANNEL_LABEL[item.channel]} · ${fmtFull(item.time)}` })
    }
    if (item.group) { /* transcripts added above */ }
    else if (call?.transcript?.length) {
      for (const m of call.transcript) out.push({ k: 'msg', who: m.speaker === 'agent' ? 'a' : 'c', name: m.speaker === 'agent' ? 'الوكيل الذكي' : item.name, text: m.text, time: m.time })
    } else if (item.messages?.length) {
      for (const m of item.messages) out.push({ k: 'msg', who: 'a', name: MSG_TYPE_LABEL[m.message_type] || 'رسالة', text: m.body, time: fmtWhen(m.sent_at || m.created_at) })
    }
    if (item.tags.length) out.push({ k: 'sys', text: `صنّف الوكيل المحادثة: ${item.tags.map((t) => t.label).join('، ')}` })
    if (call?.needs_review || call?.status === 'needs_review') out.push({ k: 'sys', text: `تحتاج مراجعة: ${call.review_reason || 'بدون سبب مذكور'}` })
    else if (item.live) out.push({ k: 'sys', text: 'المحادثة جارية الآن، تتحدث تلقائيًا' })
    else out.push({ k: 'sys', text: `انتهت المحادثة · ${chipLabel}` })
    if (ticket) out.push({ k: 'sys', text: `فُتحت تذكرة: ${ticket.subject}` })
    for (const e of events) out.push({ k: 'event', e })
    return out
  }, [item, call, ticket, chipLabel, events])
  const isLive = !!item.live

  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }) }, [events.length, item.key])

  async function log(kind: 'status' | 'assign', body: string, assigneeId?: string | null) {
    setBusy(true)
    try { await addConversationEvent(companyId, isDemo, { key: item.key, kind, body, assigneeId, authorName }) }
    catch (e) { pushToast({ kind: 'danger', title: 'ما قدرنا نحفظ التغيير', description: e instanceof Error ? e.message : undefined }) }
    finally { setBusy(false) }
  }

  async function reviewed() {
    if (!call) return
    setBusy(true)
    try { await markCallReviewed(call, isDemo); pushToast({ kind: 'success', title: 'تم تعليمها كمراجَعة' }) }
    catch (e) { pushToast({ kind: 'danger', title: 'ما قدرنا نحفظ المراجعة', description: e instanceof Error ? e.message : undefined }) }
    finally { setBusy(false) }
  }

  const needsReview = !!call && (call.needs_review || call.status === 'needs_review')

  return (
    <section className="ib-thread" aria-label="المحادثة">
      <header className="ib-thread-head">
        <div className="ib-thread-who">
          <span className="ib-avatar lg" aria-hidden="true">{initials(item.name)}</span>
          <div style={{ minWidth: 0 }}>
            <h2>{item.name}</h2>
            <p>{CHANNEL_LABEL[item.channel]}{item.phone ? <> · <span dir="ltr" className="nx-num">{item.phone}</span></> : null} · <Chip tone={item.live ? 'ok' : state.status === 'closed' ? 'dim' : chipTone}>{item.live ? '● جارية الآن' : state.status === 'closed' ? 'مغلقة' : chipLabel}</Chip></p>
          </div>
        </div>
        <div className="ib-thread-acts">
          <label className="ib-assign">
            <UserRound size={13} />
            <select aria-label="إسناد المحادثة" value={state.assigneeId || ''} disabled={busy}
              onChange={(e) => {
                const m = people.find((p) => p.id === e.target.value)
                void log('assign', m?.name || '', m?.id || null)
              }}>
              <option value="">غير مسندة</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          {needsReview && !isLive && <button type="button" className="nx-btn" disabled={busy} onClick={reviewed}><CheckCircle2 /> تمت المراجعة</button>}
          {showTickets && call && !isLive && (ticket
            ? <button type="button" className="nx-btn" onClick={() => onTicket(`?ticket=${encodeURIComponent(ticket.id)}`)}><Ticket /> التذكرة</button>
            : <button type="button" className="nx-btn" onClick={() => onTicket(`?new=1&call=${encodeURIComponent(call.id)}`)}><Ticket /> افتح تذكرة</button>)}
          <button type="button" className="nx-btn" disabled={busy} onClick={() => log('status', state.status === 'closed' ? 'open' : 'closed')}>
            {state.status === 'closed' ? <><Unlock /> إعادة فتح</> : <><Lock /> إغلاق</>}
          </button>
        </div>
      </header>

      <div className="ib-thread-body">
        {call && item.channel !== 'whatsapp' && !isDemo && call.provider === 'elevenlabs' && call.external_id && call.analysis?.has_audio !== false && <RecordingPlayer callId={call.id} />}
        {lines.map((l, i) => <ThreadLine key={i} line={l} prev={lines[i - 1]} itemTime={item.time} />)}
        <div ref={bottom} />
      </div>

      <Composer item={item} authorName={authorName} />
    </section>
  )
}

function ThreadLine({ line, prev, itemTime }: { line: Line; prev?: Line; itemTime: string }) {
  if (line.k === 'sys') return <div className="ib-sys">{line.text}</div>
  if (line.k === 'msg') {
    return (
      <div className={`ib-msg ${line.who}`}>
        <span className="ib-msg-who">{line.name}</span>
        {line.text}
        {line.time && <small className="nx-num">{line.time}</small>}
      </div>
    )
  }
  const e = line.e
  const day = fmtDay(e.created_at)
  const prevDay = prev?.k === 'event' ? fmtDay(prev.e.created_at) : fmtDay(itemTime)
  const sep = day !== prevDay ? <div className="ib-day">{day}</div> : null
  const when = new Date(e.created_at).toLocaleTimeString('ar-SA-u-ca-gregory-nu-latn', { hour: 'numeric', minute: '2-digit' })
  if (e.kind === 'note') {
    return (<>{sep}<div className="ib-note"><span className="ib-msg-who"><StickyNote size={12} /> ملاحظة داخلية · {e.author_name || 'فريقك'}</span>{e.body}<small className="nx-num">{when}</small></div></>)
  }
  if (e.kind === 'reply') {
    return (<>{sep}<div className="ib-msg team"><span className="ib-msg-who">{e.author_name || 'فريقك'} · عبر واتساب</span>{e.body}<small className="nx-num">{when}</small></div></>)
  }
  const text = e.kind === 'assign'
    ? (e.assignee_user_id ? `${e.author_name || 'فريقك'} أسند المحادثة إلى ${e.body}` : `${e.author_name || 'فريقك'} ألغى الإسناد`)
    : `${e.author_name || 'فريقك'} ${e.body === 'closed' ? 'أغلق المحادثة' : 'أعاد فتح المحادثة'}`
  return (<>{sep}<div className="ib-sys">{text} · {when}</div></>)
}

function Composer({ item, authorName }: { item: ConvItem; authorName: string }) {
  const { companyId, isDemo } = useWorkspace()
  const pushToast = useToast()
  const { replies } = useCannedReplies(companyId, isDemo)
  const [mode, setMode] = useState<'reply' | 'note'>('note')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const canReply = !!item.phone
  const effectiveMode = mode === 'reply' && !canReply ? 'note' : mode

  // "/" opens the quick replies; typing after it filters them.
  const slash = text.startsWith('/') ? text.slice(1).trim() : null
  const matches = slash == null ? [] : replies.filter((r) => !slash || r.shortcut.includes(slash) || r.body.includes(slash)).slice(0, 6)

  async function send() {
    const body = text.trim()
    if (!body) return
    setBusy(true)
    try {
      if (effectiveMode === 'reply') {
        sendWhatsAppMessage(item.phone, body)
        await addConversationEvent(companyId, isDemo, { key: item.key, kind: 'reply', body, authorName })
      } else {
        await addConversationEvent(companyId, isDemo, { key: item.key, kind: 'note', body, authorName })
      }
      setText('')
    } catch (e) {
      pushToast({ kind: 'danger', title: 'ما انحفظت', description: e instanceof Error ? e.message : undefined })
    } finally { setBusy(false) }
  }

  async function saveAsReply() {
    const body = text.trim()
    if (!body || body.startsWith('/')) { pushToast({ kind: 'info', title: 'اكتب نص الرد أولًا' }); return }
    const shortcut = (window.prompt?.('اكتب كلمة قصيرة تستدعي بها هذا الرد (مثل: سعر)') || '').trim()
    if (!shortcut) return
    try { await saveCannedReply(companyId, isDemo, shortcut, body); pushToast({ kind: 'success', title: 'انحفظ الرد الجاهز', description: `اكتب /${shortcut} لاستخدامه` }) }
    catch { pushToast({ kind: 'danger', title: 'تعذّر حفظ الرد الجاهز' }) }
  }

  return (
    <div className="ib-composer">
      {matches.length > 0 && (
        <ul className="ib-canned" role="listbox" aria-label="ردود جاهزة">
          {matches.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => setText(r.body)}><b>/{r.shortcut}</b><span>{r.body}</span></button>
              {!r.builtIn && <button type="button" className="ib-x" aria-label="حذف الرد" onClick={() => void deleteCannedReply(companyId, isDemo, r.id)}><X size={12} /></button>}
            </li>
          ))}
        </ul>
      )}
      <div className="ib-modes" role="tablist" aria-label="نوع الرسالة">
        <button type="button" role="tab" aria-selected={effectiveMode === 'reply'} disabled={!canReply} onClick={() => setMode('reply')} title={canReply ? '' : 'ما فيه رقم لهذا العميل'}>
          <Send size={13} /> واتساب من جوالك
        </button>
        <button type="button" role="tab" aria-selected={effectiveMode === 'note'} onClick={() => setMode('note')}><StickyNote size={13} /> ملاحظة داخلية</button>
      </div>
      <textarea
        className="ib-input" rows={2} value={text} aria-label={effectiveMode === 'reply' ? 'نص الرد' : 'نص الملاحظة'}
        placeholder={effectiveMode === 'reply' ? 'اكتب ردك… أو ابدأ بـ / لاستخدام رد جاهز' : 'اكتب ملاحظة يشوفها فريقك فقط… أو ابدأ بـ / لرد جاهز'}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void send() } }}
      />
      <div className="ib-composer-foot">
        <span>{effectiveMode === 'reply' ? 'الوكيل يرد تلقائيًا من رقم الأعمال. هذا يفتح واتساب على جوالك لو تبغى تتواصل بنفسك، ويتسجل هنا.' : 'الملاحظة داخلية ولا تُرسل للعميل.'}</span>
        <div>
          <button type="button" className="nx-btn sm" onClick={saveAsReply} title="احفظ النص كرد جاهز"><Plus size={13} /> رد جاهز</button>
          <button type="button" className="nx-btn pri" disabled={busy || !text.trim() || text.startsWith('/')} onClick={send}>
            {effectiveMode === 'reply' ? <><Send /> فتح واتساب</> : <><StickyNote /> حفظ الملاحظة</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── profile ──────────────────────────────────────────────────────────────────

function ProfilePane({ item, allItems, tickets, showTickets, onSelect, onOpenFull, onTicket }: {
  item: ConvItem; allItems: ConvItem[]; tickets: SupportTicket[]; showTickets: boolean
  onSelect: (k: string) => void; onOpenFull: (k: string) => void; onTicket: (path: string) => void
}) {
  const { companyId, isDemo } = useWorkspace()
  const pushToast = useToast()
  const { data: customers } = useCustomers(companyId, isDemo)
  const call = item.call
  const phone = normalizePhone(item.phone)
  const saved = phone ? (customers || []).find((c) => normalizePhone(c.phone) === phone) : undefined
  const mood = call ? sentimentKind(call) : null
  const data = call ? collectedData(call).filter((f) => f.filled).slice(0, 6) : []
  const myKey = call ? contactKey(call) : ''
  const own = new Set([item.key, ...(item.group || []).map((g) => g.key)])
  const previous = allItems.filter((i) => !own.has(i.key) && (
    (i.call && myKey && contactKey(i.call) === myKey) || (phone && normalizePhone(i.phone) === phone)
  )).slice(0, 5)
  const ownCalls = new Set([call?.id, ...(item.group || []).map((g) => g.call?.id)].filter(Boolean))
  const related = tickets.filter((t) => (t.ai_call_id && ownCalls.has(t.ai_call_id)) || previous.some((p) => p.call && t.ai_call_id === p.call.id)).slice(0, 4)

  async function copyPhone() {
    if (!item.phone) return
    const ok = await copyText(item.phone)
    pushToast(ok ? { kind: 'success', title: 'تم نسخ الرقم' } : { kind: 'danger', title: 'تعذّر النسخ' })
  }

  return (
    <aside className="ib-profile" aria-label="ملف العميل">
      <div className="ib-p-head">
        <span className="ib-avatar xl" aria-hidden="true">{initials(item.name)}</span>
        <h3>{item.name}</h3>
        {item.phone && (
          <div className="ib-p-phone">
            <span dir="ltr" className="nx-num">{item.phone}</span>
            <button type="button" className="nx-icon-btn" aria-label="نسخ الرقم" onClick={copyPhone}><Copy size={13} /></button>
            <a className="nx-icon-btn" aria-label="اتصال" href={`tel:${item.phone}`}><Phone size={13} /></a>
          </div>
        )}
      </div>

      <Section title="تفاصيل المحادثة">
        <Row k="القناة" v={CHANNEL_LABEL[item.channel]} />
        <Row k="بدأت" v={fmtFull(item.time)} />
        {call && call.duration_seconds > 0 && <Row k="المدة" v={fmtDuration(call.duration_seconds)} />}
        {mood && <Row k="المشاعر" v={<Chip tone={sentimentTone(mood)}>{SENTIMENT_LABEL[mood]}</Chip>} />}
        <Row k="الرسائل" v={String(item.messageCount || 0)} />
      </Section>

      {item.tags.length > 0 && <Section title="الوسوم" icon={<Tag size={13} />}><TagChips tags={item.tags} /></Section>}

      {data.length > 0 && (
        <Section title="اللي جمعه الوكيل" icon={<Sparkles size={13} />}>
          {data.map((f) => <Row key={f.key} k={f.label} v={formatValue(f.value)} />)}
        </Section>
      )}

      {saved && (
        <Section title="سجل العميل" icon={<UserRound size={13} />}>
          <Row k="النوع" v={saved.patient_type === 'returning' ? 'عائد' : 'جديد'} />
          <Row k="عدد الزيارات" v={String(saved.total_visits)} />
          {saved.last_visit_at && <Row k="آخر زيارة" v={saved.last_visit_at.split('T')[0]} />}
        </Section>
      )}

      {showTickets && related.length > 0 && (
        <Section title="التذاكر" icon={<Ticket size={13} />}>
          {related.map((t) => <button key={t.id} type="button" className="ib-link" onClick={() => onTicket(`?ticket=${encodeURIComponent(t.id)}`)}>{t.subject}</button>)}
        </Section>
      )}

      {previous.length > 0 && (
        <Section title="محادثات سابقة" icon={<Bot size={13} />}>
          {previous.map((p) => (
            <button key={p.key} type="button" className="ib-prev" onClick={() => onSelect(p.key)}>
              <span>{p.title || p.summary || CHANNEL_LABEL[p.channel]}</span><time>{fmtWhen(p.time)}</time>
            </button>
          ))}
        </Section>
      )}

      <button type="button" className="nx-btn ib-full" onClick={() => onOpenFull(item.group ? item.group[item.group.length - 1].key : item.key)}><ExternalLink /> التحليل والتفاصيل الكاملة</button>
    </aside>
  )
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return <section className="ib-sec"><h4>{icon}{title}</h4><div>{children}</div></section>
}
function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="ib-kv"><span>{k}</span><b>{v}</b></div>
}
