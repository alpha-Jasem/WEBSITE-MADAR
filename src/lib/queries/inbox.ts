import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useRealtimeRefetch } from '../realtime'

// Team activity on a conversation (notes, status, assignment, replies) and saved quick
// replies. Backed by conversation_events / canned_replies (migration 20261013120000).
// Demo mode keeps both in memory so the sales tour stays clickable.

export type EventKind = 'note' | 'status' | 'assign' | 'reply' | 'transfer'

export interface ConvEvent {
  id: string
  conversation_key: string
  kind: EventKind
  body: string
  assignee_user_id?: string | null
  assignee_name?: string | null
  team_id?: string | null
  team_name?: string | null
  author_name?: string | null
  created_at: string
}

export type ConvStatus = 'open' | 'closed' | 'waiting' | 'snoozed'

export interface ConvState {
  status: ConvStatus
  /** For a snoozed conversation: when it comes back (ISO), or null for "until the customer writes". */
  snoozeUntil: string | null
  assigneeId: string | null
  assigneeName: string | null
  teamId: string | null
  teamName: string | null
}

export interface CannedReply { id: string; shortcut: string; body: string; builtIn?: boolean }

export const DEFAULT_CANNED: CannedReply[] = [
  { id: 'default:hello', shortcut: 'هلا', body: 'هلا وغلا! معك فريق خدمة العملاء، كيف نقدر نساعدك؟', builtIn: true },
  { id: 'default:wait', shortcut: 'لحظة', body: 'أبشر، لحظات وأرجع لك بالجواب.', builtIn: true },
  { id: 'default:thanks', shortcut: 'شكرا', body: 'شكرًا لتواصلك معنا، يسعدنا خدمتك دائمًا.', builtIn: true },
  { id: 'default:number', shortcut: 'رقم', body: 'ممكن تزودنا برقم جوالك عشان نتواصل معك؟', builtIn: true },
  { id: 'default:call', shortcut: 'اتصال', body: 'بيتواصل معك أحد من فريقنا خلال اليوم إن شاء الله.', builtIn: true },
]

const demoId = () => `demo-${Math.random().toString(36).slice(2, 10)}`
const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString()

let demoEvents: ConvEvent[] = []
let demoCanned: CannedReply[] = []
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

/** Status event bodies: open, closed, waiting (for the customer), snoozed:<ISO time> or snoozed:reply. */
export function parseStatus(body: string): { status: ConvStatus; until: string | null } {
  if (body === 'closed' || body === 'waiting') return { status: body, until: null }
  if (body.startsWith('snoozed')) {
    const until = body.slice(8)
    return { status: 'snoozed', until: until && until !== 'reply' ? until : null }
  }
  return { status: 'open', until: null }
}

/**
 * The state a conversation is in, from its events (oldest first). A conversation waiting for the customer
 * or snoozed opens again when the customer writes after it (lastCustomerAt) or when its snooze time passes.
 */
export function convState(events: ConvEvent[] | undefined, opts: { lastCustomerAt?: string | null; now?: number } = {}): ConvState {
  let status: ConvStatus = 'open'
  let snoozeUntil: string | null = null
  let statusAt = ''
  let assigneeId: string | null = null
  let assigneeName: string | null = null
  let teamId: string | null = null
  let teamName: string | null = null
  for (const e of events || []) {
    if (e.kind === 'status') { const p = parseStatus(e.body); status = p.status; snoozeUntil = p.until; statusAt = e.created_at }
    if (e.kind === 'assign') { assigneeId = e.assignee_user_id || null; assigneeName = assigneeId ? e.body : null }
    // A transfer hands the conversation to a team; a person inside it is optional.
    if (e.kind === 'transfer') {
      teamId = e.team_id || null; teamName = e.team_name || null
      assigneeId = e.assignee_user_id || null; assigneeName = assigneeId ? e.assignee_name || null : null
    }
  }
  if (status === 'waiting' || status === 'snoozed') {
    const now = opts.now ?? Date.now()
    // A conversation time in the future (clock skew, sample data) is not a new message.
    const last = opts.lastCustomerAt ? Date.parse(opts.lastCustomerAt) : NaN
    const wrote = last > Date.parse(statusAt) && last <= now
    const woke = status === 'snoozed' && !!snoozeUntil && Date.parse(snoozeUntil) <= now
    if (wrote || woke) { status = 'open'; snoozeUntil = null }
  }
  return { status, snoozeUntil, assigneeId, assigneeName, teamId, teamName }
}

/** What smart assignment needs to know about a team: each member's open conversations and who got the last one. */
export function assignmentContext(all: Map<string, ConvEvent[]>, teamId: string, memberIds: string[]) {
  const loads: Record<string, number> = {}
  let lastAssigneeId: string | null = null
  let lastAt = ''
  for (const evs of all.values()) {
    const st = convState(evs)
    if (st.status === 'open' && st.assigneeId && memberIds.includes(st.assigneeId)) loads[st.assigneeId] = (loads[st.assigneeId] || 0) + 1
    for (const e of evs) {
      if (e.kind === 'transfer' && e.team_id === teamId && e.assignee_user_id && e.created_at > lastAt) { lastAt = e.created_at; lastAssigneeId = e.assignee_user_id }
    }
  }
  return { loads, lastAssigneeId }
}

/** When the current assignee got the conversation, and when they first replied after that. */
export function assignmentTimes(events: ConvEvent[]) {
  let assignedAt: string | null = null
  for (const e of events) {
    if ((e.kind === 'assign' || e.kind === 'transfer') && e.assignee_user_id) assignedAt = e.created_at
    else if ((e.kind === 'assign' || e.kind === 'transfer') && !e.assignee_user_id) assignedAt = null
  }
  const repliedAt = assignedAt ? events.find((e) => e.kind === 'reply' && e.created_at > assignedAt!)?.created_at ?? null : null
  return { assignedAt, repliedAt }
}

/** Every event of the company grouped by conversation key, oldest first. */
export function useConversationEvents(companyId: string | null, isDemo: boolean) {
  const [map, setMap] = useState<Map<string, ConvEvent[]>>(new Map())
  const [available, setAvailable] = useState(true)

  const load = useCallback(async () => {
    let rows: ConvEvent[] = []
    if (isDemo) rows = demoEvents
    else {
      if (!companyId) return
      const { data, error } = await supabase.from('conversation_events')
        .select('id, conversation_key, kind, body, assignee_user_id, assignee_name, team_id, team_name, author_name, created_at')
        .eq('company_id', companyId).order('created_at').limit(2000)
      if (error) { setAvailable(false); setMap(new Map()); return }
      setAvailable(true)
      rows = (data || []) as ConvEvent[]
    }
    const next = new Map<string, ConvEvent[]>()
    for (const e of rows) {
      const list = next.get(e.conversation_key)
      if (list) list.push(e); else next.set(e.conversation_key, [e])
    }
    setMap(next)
  }, [companyId, isDemo])

  useEffect(() => {
    void load()
    listeners.add(load)
    return () => { listeners.delete(load) }
  }, [load])

  // Notes, status, assignment and transfers made by teammates arrive live.
  useRealtimeRefetch(`events_${companyId}`, [{ table: 'conversation_events', filter: `company_id=eq.${companyId}` }],
    () => { void load() }, !isDemo && !!companyId)

  return { events: map, available }
}

export async function addConversationEvent(
  companyId: string | null, isDemo: boolean,
  input: { key: string; kind: EventKind; body: string; assigneeId?: string | null; assigneeName?: string | null; teamId?: string | null; teamName?: string | null; authorName?: string },
) {
  if (isDemo) {
    demoEvents = [...demoEvents, {
      id: demoId(), conversation_key: input.key, kind: input.kind, body: input.body,
      assignee_user_id: input.assigneeId ?? null, assignee_name: input.assigneeName ?? null, team_id: input.teamId ?? null, team_name: input.teamName ?? null,
      author_name: input.authorName || 'أنت', created_at: new Date().toISOString(),
    }]
    notify()
    return
  }
  if (!companyId) throw new Error('no company')
  const { error } = await supabase.from('conversation_events').insert({
    company_id: companyId, conversation_key: input.key, kind: input.kind, body: input.body,
    assignee_user_id: input.assigneeId ?? null, assignee_name: input.assigneeName ?? null, team_id: input.teamId ?? null, team_name: input.teamName ?? null,
    author_name: input.authorName || null,
  })
  if (error) throw error
  notify()
}

/** Built-in replies plus the company's own; a saved reply with the same shortcut replaces the built-in one. */
export function useCannedReplies(companyId: string | null, isDemo: boolean) {
  const [custom, setCustom] = useState<CannedReply[]>([])
  const [available, setAvailable] = useState(true)

  const load = useCallback(async () => {
    if (isDemo) { setCustom([...demoCanned]); return }
    if (!companyId) return
    const { data, error } = await supabase.from('canned_replies').select('id, shortcut, body').eq('company_id', companyId).order('created_at')
    if (error) { setAvailable(false); setCustom([]); return }
    setAvailable(true)
    setCustom((data || []) as CannedReply[])
  }, [companyId, isDemo])

  useEffect(() => {
    void load()
    listeners.add(load)
    return () => { listeners.delete(load) }
  }, [load])

  const shortcuts = new Set(custom.map((c) => c.shortcut))
  return { replies: [...custom, ...DEFAULT_CANNED.filter((d) => !shortcuts.has(d.shortcut))], available }
}

export async function saveCannedReply(companyId: string | null, isDemo: boolean, shortcut: string, body: string) {
  const s = shortcut.trim()
  if (!s || !body.trim()) throw new Error('empty')
  if (isDemo) {
    demoCanned = [...demoCanned.filter((c) => c.shortcut !== s), { id: demoId(), shortcut: s, body: body.trim() }]
    notify()
    return
  }
  if (!companyId) throw new Error('no company')
  const { error } = await supabase.from('canned_replies').upsert({ company_id: companyId, shortcut: s, body: body.trim() }, { onConflict: 'company_id,shortcut' })
  if (error) throw error
  notify()
}

export async function deleteCannedReply(companyId: string | null, isDemo: boolean, id: string) {
  if (isDemo) { demoCanned = demoCanned.filter((c) => c.id !== id); notify(); return }
  if (!companyId) throw new Error('no company')
  const { error } = await supabase.from('canned_replies').delete().eq('company_id', companyId).eq('id', id)
  if (error) throw error
  notify()
}

/** A couple of pre-made events so the demo inbox shows the activity lines. */
export function seedDemoInboxEvents(keys: string[]) {
  if (demoEvents.length > 0 || keys.length === 0) return
  const k = keys[0]
  demoEvents = [
    { id: demoId(), conversation_key: k, kind: 'assign', body: 'ريم', assignee_user_id: 'demo-user-reem', author_name: 'أحمد الزهراني', created_at: ago(50) },
    { id: demoId(), conversation_key: k, kind: 'note', body: 'العميلة ترد بسرعة على الواتساب، الأفضل نتواصل معها مساءً.', author_name: 'ريم', created_at: ago(30) },
  ]
}
