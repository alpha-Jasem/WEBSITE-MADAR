// Data layer for the tickets, knowledge base and agent settings pages.
//
// Several columns/tables used here come from migration
// 20261012110000_ops_tickets_kb_agent_settings.sql (and ai_call_id / agent_links from
// 20261012090000_agent_call_ingestion.sql). Until those are applied, useOpsCaps()
// reports them missing and the pages hide the matching controls instead of failing.
//
// In demo mode every hook reads an in-memory copy of the fixtures in opsDemo.ts, and the
// mutations edit that copy, so the sales tour is clickable without touching Supabase.
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { supabase } from '../supabase'
import { DEMO_AI_CALLS } from '../demoData'
import type { AICallLog, SupportTicket, TicketPriority, TicketStatus } from '../../types/dashboard'
import {
  DEMO_ME, DEMO_TEAM, DEMO_OPS_TICKETS, DEMO_TICKET_NOTES, DEMO_UNANSWERED, DEMO_KB, DEMO_AGENT_SETTINGS,
} from './opsDemo'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface OpsTicket extends SupportTicket {
  assignee_user_id?: string | null
  assignee_name?: string | null
  customer_name?: string | null
  customer_phone?: string | null
  ticket_type?: string | null
  due_at?: string | null
}

export type TicketNoteKind = 'note' | 'status' | 'assign'

export interface TicketNote {
  id: string
  ticket_id: string
  company_id: string
  kind: TicketNoteKind
  body: string
  author_user_id?: string | null
  author_name?: string | null
  created_at: string
}

export interface TeamMember {
  id: string
  auth_user_id: string | null
  full_name: string
  role: string
}

export interface UnansweredQuestion {
  id: string
  company_id: string
  question: string
  count: number
  last_asked_at: string
  answered_at: string | null
  knowledge_item_id: string | null
  ai_call_id: string | null
}

export interface OpsKnowledgeItem {
  id: string
  company_id: string
  type: string
  title: string
  content: string
  metadata: Record<string, unknown> | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/** day: 0 = Sunday … 6 = Saturday. Times are "HH:MM". */
export interface WorkingDay { day: number; open: boolean; from: string; to: string }
export interface AgentChannels { phone: boolean; whatsapp: boolean; web: boolean }
export type AfterHoursMode = 'take' | 'message'

export interface AgentSettings {
  company_id: string
  agent_name: string
  voice_label: string
  greeting: string
  transfer_number: string
  channels: AgentChannels
  working_hours: WorkingDay[]
  after_hours_mode: AfterHoursMode
  paused: boolean
  updated_at?: string | null
}

export interface AgentLink { provider: 'nabrah' | 'elevenlabs'; agent_id: string; label?: string | null }

/** Which optional schema pieces exist in the connected database. */
export interface OpsCaps {
  /** assignee/customer/type/due columns on ai_agent_support_tickets */
  ticketExtras: boolean
  /** ai_agent_support_tickets.ai_call_id */
  ticketCallLink: boolean
  ticketNotes: boolean
  unanswered: boolean
  agentSettings: boolean
  agentLinks: boolean
}

const ALL_CAPS: OpsCaps = { ticketExtras: true, ticketCallLink: true, ticketNotes: true, unanswered: true, agentSettings: true, agentLinks: true }
const NO_CAPS: OpsCaps = { ticketExtras: false, ticketCallLink: false, ticketNotes: false, unanswered: false, agentSettings: false, agentLinks: false }

// ─── Demo store ────────────────────────────────────────────────────────────────

const demo = {
  tickets: DEMO_OPS_TICKETS.map((t) => ({ ...t })),
  notes: DEMO_TICKET_NOTES.map((n) => ({ ...n })),
  questions: DEMO_UNANSWERED.map((q) => ({ ...q })),
  kb: DEMO_KB.map((k) => ({ ...k })),
  settings: { ...DEMO_AGENT_SETTINGS } as AgentSettings,
}
let demoVersion = 0
const demoListeners = new Set<() => void>()
function demoChange(fn: () => void) {
  fn()
  demoVersion += 1
  demoListeners.forEach((l) => l())
}
function useDemoVersion() {
  return useSyncExternalStore(
    (l) => { demoListeners.add(l); return () => { demoListeners.delete(l) } },
    () => demoVersion,
  )
}
const demoId = () => `demo-${Math.random().toString(36).slice(2, 9)}`

// ─── Helpers ───────────────────────────────────────────────────────────────────

type PgError = { code?: string; message?: string } | null

/** True when the error means "this column/table does not exist (yet)". */
function isMissingSchema(error: PgError): boolean {
  if (!error) return false
  if (['42703', '42P01', 'PGRST204', 'PGRST205', 'PGRST200'].includes(error.code || '')) return true
  return /does not exist|could not find|schema cache/i.test(error.message || '')
}

async function probe(table: string, columns: string): Promise<boolean> {
  const { error } = await supabase.from(table).select(columns).limit(1)
  if (!error) return true
  // Anything other than a missing column/table (e.g. a network blip) is treated as present,
  // so the real query surfaces the actual error instead of silently hiding the feature.
  return !isMissingSchema(error)
}

let capsPromise: Promise<OpsCaps> | null = null
function loadCaps(): Promise<OpsCaps> {
  if (!capsPromise) {
    capsPromise = Promise.all([
      probe('ai_agent_support_tickets', 'assignee_user_id,assignee_name,customer_name,customer_phone,ticket_type,due_at'),
      probe('ai_agent_support_tickets', 'ai_call_id'),
      probe('ticket_notes', 'id'),
      probe('agent_unanswered_questions', 'id'),
      probe('agent_settings', 'company_id'),
      probe('agent_links', 'agent_id'),
    ]).then(([ticketExtras, ticketCallLink, ticketNotes, unanswered, agentSettings, agentLinks]) => (
      { ticketExtras, ticketCallLink, ticketNotes, unanswered, agentSettings, agentLinks }
    )).catch(() => { capsPromise = null; return NO_CAPS })
  }
  return capsPromise
}

/** Pass accountLoading as `waiting` so demo sessions never probe the real database. */
export function useOpsCaps(isDemo: boolean, waiting = false): { caps: OpsCaps; ready: boolean } {
  const [caps, setCaps] = useState<OpsCaps | null>(isDemo ? ALL_CAPS : null)
  useEffect(() => {
    if (isDemo) { setCaps(ALL_CAPS); return }
    if (waiting) return
    let alive = true
    loadCaps().then((c) => { if (alive) setCaps(c) })
    return () => { alive = false }
  }, [isDemo, waiting])
  return { caps: caps ?? NO_CAPS, ready: caps !== null }
}

/** Fetch + refetch on realtime changes for one company-scoped table. */
function useLive<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  realtime: { table: string; companyId: string | null; enabled: boolean } | null,
) {
  const version = useDemoVersion()
  const [data, setData] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [instance] = useState(() => Math.random().toString(36).slice(2))

  const run = useCallback(async () => {
    try {
      const result = await fetcher()
      setData(result)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطأ غير متوقع')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version])

  useEffect(() => { run() }, [run])

  const table = realtime?.table
  const companyId = realtime?.companyId
  const enabled = !!realtime?.enabled && !!companyId
  useEffect(() => {
    if (!enabled || !table) return
    const channel = supabase
      .channel(`ops_${table}_${companyId}_${instance}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter: `company_id=eq.${companyId}` }, () => { run() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [enabled, table, companyId, instance, run])

  return { data, loading, error, refetch: run }
}

// ─── Current user and team ─────────────────────────────────────────────────────

export function useCurrentUserId(isDemo: boolean): string | null {
  const [id, setId] = useState<string | null>(isDemo ? DEMO_ME : null)
  useEffect(() => {
    if (isDemo) { setId(DEMO_ME); return }
    let alive = true
    supabase.auth.getUser().then(({ data }) => { if (alive) setId(data.user?.id ?? null) })
    return () => { alive = false }
  }, [isDemo])
  return id
}

export function useTeam(companyId: string | null, isDemo: boolean) {
  return useLive<TeamMember[]>(async () => {
    if (isDemo) return DEMO_TEAM
    if (!companyId) return []
    const { data, error } = await supabase
      .from('company_users')
      .select('id, auth_user_id, full_name, role')
      .eq('company_id', companyId)
      .order('created_at')
    if (error) throw error
    return ((data ?? []) as TeamMember[]).filter((m) => m.full_name)
  }, [companyId, isDemo], null)
}

// ─── Tickets ───────────────────────────────────────────────────────────────────

export function useOpsTickets(companyId: string | null, isDemo: boolean) {
  return useLive<OpsTicket[]>(async () => {
    if (isDemo) return demo.tickets.map((t) => ({ ...t }))
    if (!companyId) return []
    const { data, error } = await supabase
      .from('ai_agent_support_tickets')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as OpsTicket[]
  }, [companyId, isDemo], { table: 'ai_agent_support_tickets', companyId, enabled: !isDemo })
}

export interface NewTicketInput {
  company_id: string
  subject: string
  description: string
  priority: TicketPriority
  ticket_type: string
  customer_name: string
  customer_phone?: string
  assignee?: TeamMember | null
  ai_call_id?: string | null
  /** Shown in the timeline as the author. */
  author_name?: string
}

export async function createOpsTicket(input: NewTicketInput, caps: OpsCaps, isDemo: boolean): Promise<OpsTicket> {
  const now = new Date().toISOString()
  if (isDemo) {
    const row: OpsTicket = {
      id: demoId(), company_id: input.company_id, subject: input.subject, description: input.description,
      route: 'tickets-page', priority: input.priority, status: 'open', created_at: now, updated_at: now,
      ticket_type: input.ticket_type, customer_name: input.customer_name, customer_phone: input.customer_phone || null,
      assignee_user_id: input.assignee?.auth_user_id ?? null, assignee_name: input.assignee?.full_name ?? null,
      ai_call_id: input.ai_call_id ?? null, due_at: null,
    }
    demoChange(() => { demo.tickets.unshift(row) })
    return row
  }
  const { data: auth } = await supabase.auth.getUser()
  // Without the extra columns, keep customer/type in the description so nothing is lost.
  const extrasInDescription = !caps.ticketExtras
    ? [input.customer_name && `العميل: ${input.customer_name}`, input.customer_phone && `الهاتف: ${input.customer_phone}`, input.ticket_type && `النوع: ${input.ticket_type}`].filter(Boolean).join('\n')
    : ''
  const callRef = input.ai_call_id && !caps.ticketCallLink ? `المكالمة: ${input.ai_call_id}` : ''
  const description = [input.description, extrasInDescription, callRef].filter(Boolean).join('\n\n')
  const payload: Record<string, unknown> = {
    company_id: input.company_id, subject: input.subject, description, priority: input.priority,
    status: 'open', route: 'tickets-page', user_id: auth.user?.id ?? null,
  }
  if (caps.ticketExtras) {
    Object.assign(payload, {
      ticket_type: input.ticket_type || null, customer_name: input.customer_name || null,
      customer_phone: input.customer_phone || null,
      assignee_user_id: input.assignee?.auth_user_id ?? null, assignee_name: input.assignee?.full_name ?? null,
    })
  }
  if (caps.ticketCallLink && input.ai_call_id) payload.ai_call_id = input.ai_call_id
  const { data, error } = await supabase.from('ai_agent_support_tickets').insert(payload).select().single()
  if (error) throw error
  const row = data as OpsTicket
  if (caps.ticketNotes && input.assignee) {
    await addTicketNote({ ticket_id: row.id, company_id: row.company_id, kind: 'assign', body: `معيّنة لـ ${input.assignee.full_name}`, author_name: input.author_name }, caps, false).catch(() => {})
  }
  return row
}

export async function findTicketForCall(callId: string, caps: OpsCaps, isDemo: boolean): Promise<OpsTicket | null> {
  if (isDemo) return demo.tickets.find((t) => t.ai_call_id === callId) ?? null
  if (!caps.ticketCallLink) return null
  const { data, error } = await supabase.from('ai_agent_support_tickets').select('*').eq('ai_call_id', callId).maybeSingle()
  if (error) return null
  return (data as OpsTicket) ?? null
}

export async function updateOpsTicket(
  id: string,
  patch: Partial<Pick<OpsTicket, 'status' | 'assignee_user_id' | 'assignee_name' | 'priority'>>,
  isDemo: boolean,
) {
  const updated_at = new Date().toISOString()
  if (isDemo) {
    demoChange(() => {
      const t = demo.tickets.find((x) => x.id === id)
      if (t) Object.assign(t, patch, { updated_at })
    })
    return
  }
  const { error } = await supabase.from('ai_agent_support_tickets').update({ ...patch, updated_at }).eq('id', id)
  if (error) throw error
}

export function useTicketNotes(ticketId: string | null, companyId: string | null, isDemo: boolean, enabled: boolean) {
  return useLive<TicketNote[]>(async () => {
    if (!ticketId) return []
    if (isDemo) return demo.notes.filter((n) => n.ticket_id === ticketId)
    if (!enabled) return []
    const { data, error } = await supabase
      .from('ticket_notes')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at')
    if (error) throw error
    return (data ?? []) as TicketNote[]
  }, [ticketId, isDemo, enabled], { table: 'ticket_notes', companyId, enabled: !isDemo && enabled && !!ticketId })
}

export async function addTicketNote(
  input: { ticket_id: string; company_id: string; kind: TicketNoteKind; body: string; author_name?: string },
  caps: OpsCaps,
  isDemo: boolean,
) {
  if (isDemo) {
    demoChange(() => {
      demo.notes.push({ id: demoId(), ...input, author_name: input.author_name ?? 'أنت', created_at: new Date().toISOString() })
    })
    return
  }
  if (!caps.ticketNotes) return
  const { error } = await supabase.from('ticket_notes').insert({ ...input, author_name: input.author_name || null })
  if (error) throw error
}

/** One AI call, for prefilling a ticket opened from the call log (?new=1&call=<id>). */
export function useAiCall(callId: string | null, isDemo: boolean) {
  return useLive<AICallLog | null>(async () => {
    if (!callId) return null
    if (isDemo) return DEMO_AI_CALLS.find((c) => c.id === callId) ?? null
    const { data, error } = await supabase.from('clinic_os_ai_calls').select('*').eq('id', callId).maybeSingle()
    if (error) throw error
    return (data as AICallLog) ?? null
  }, [callId, isDemo], null)
}

// ─── Knowledge base ────────────────────────────────────────────────────────────

export function useKnowledgeItems(companyId: string | null, isDemo: boolean) {
  return useLive<OpsKnowledgeItem[]>(async () => {
    if (isDemo) return demo.kb.map((k) => ({ ...k }))
    if (!companyId) return []
    const { data, error } = await supabase
      .from('clinic_os_knowledge_items')
      .select('*')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as OpsKnowledgeItem[]
  }, [companyId, isDemo], { table: 'clinic_os_knowledge_items', companyId, enabled: !isDemo })
}

/** Creates or updates a Q&A item and returns its id. */
export async function saveKnowledgeAnswer(input: {
  id?: string
  company_id: string
  question: string
  answer: string
  category: string
  type?: string
  metadata?: Record<string, unknown> | null
}, isDemo: boolean): Promise<string> {
  const updated_at = new Date().toISOString()
  const metadata = { ...(input.metadata || {}), category: input.category }
  if (isDemo) {
    const id = input.id || demoId()
    demoChange(() => {
      const existing = demo.kb.find((k) => k.id === id)
      if (existing) Object.assign(existing, { title: input.question, content: input.answer, metadata, updated_at })
      else demo.kb.unshift({ id, company_id: input.company_id, type: input.type || 'faq', title: input.question, content: input.answer, metadata, is_active: true, created_at: updated_at, updated_at })
    })
    return id
  }
  const values = { company_id: input.company_id, type: input.type || 'faq', title: input.question, content: input.answer, metadata, is_active: true, updated_at }
  if (input.id) {
    const { error } = await supabase.from('clinic_os_knowledge_items').update(values).eq('id', input.id)
    if (error) throw error
    return input.id
  }
  const { data, error } = await supabase.from('clinic_os_knowledge_items').insert(values).select('id').single()
  if (error) throw error
  return (data as { id: string }).id
}

export async function setKnowledgeActive(id: string, is_active: boolean, isDemo: boolean) {
  if (isDemo) { demoChange(() => { const k = demo.kb.find((x) => x.id === id); if (k) k.is_active = is_active }); return }
  const { error } = await supabase.from('clinic_os_knowledge_items').update({ is_active, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function removeKnowledgeItem(id: string, isDemo: boolean) {
  if (isDemo) { demoChange(() => { demo.kb = demo.kb.filter((k) => k.id !== id) }); return }
  const { error } = await supabase.from('clinic_os_knowledge_items').delete().eq('id', id)
  if (error) throw error
}

export function useUnansweredQuestions(companyId: string | null, isDemo: boolean, enabled: boolean) {
  return useLive<UnansweredQuestion[]>(async () => {
    if (isDemo) return demo.questions.filter((q) => !q.answered_at)
    if (!companyId || !enabled) return []
    const { data, error } = await supabase
      .from('agent_unanswered_questions')
      .select('*')
      .eq('company_id', companyId)
      .is('answered_at', null)
      .order('count', { ascending: false })
      .order('last_asked_at', { ascending: false })
      .limit(20)
    if (error) throw error
    return (data ?? []) as UnansweredQuestion[]
  }, [companyId, isDemo, enabled], { table: 'agent_unanswered_questions', companyId, enabled: !isDemo && enabled })
}

export async function markQuestionAnswered(id: string, knowledgeItemId: string, isDemo: boolean) {
  const answered_at = new Date().toISOString()
  if (isDemo) {
    demoChange(() => { const q = demo.questions.find((x) => x.id === id); if (q) Object.assign(q, { answered_at, knowledge_item_id: knowledgeItemId }) })
    return
  }
  const { error } = await supabase.from('agent_unanswered_questions').update({ answered_at, knowledge_item_id: knowledgeItemId }).eq('id', id)
  if (error) throw error
}

/**
 * Pushes the company's settings and knowledge base to its linked ElevenLabs agents through the
 * agent-platform-sync edge function (it holds the platform key; the browser never calls the platform).
 * Resolves with synced:false and a reason when nothing could be pushed (no linked agent, function
 * not deployed) so callers can ignore it silently. Nabrah agents are not synced yet.
 */
export async function syncKnowledgeToVoicePlatforms(
  companyId: string, action: 'settings' | 'knowledge' | 'all' = 'knowledge',
): Promise<{ synced: boolean; reason?: string }> {
  void companyId
  try {
    const { data, error } = await supabase.functions.invoke('agent-platform-sync', { body: { action } })
    if (error) return { synced: false, reason: 'unavailable' }
    return { synced: !!data?.synced, reason: data?.reason }
  } catch {
    return { synced: false, reason: 'unavailable' }
  }
}

// ─── Agent settings ────────────────────────────────────────────────────────────

export const WEEK_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export function defaultAgentSettings(companyId: string, companyName: string): AgentSettings {
  return {
    company_id: companyId,
    agent_name: 'الوكيل الذكي',
    voice_label: 'نسائي سعودي (نجدي)',
    greeting: `هلا وغلا، معك الوكيل الذكي من ${companyName || 'منشأتنا'}، كيف أقدر أخدمك؟`,
    transfer_number: '',
    channels: { phone: true, whatsapp: true, web: false },
    working_hours: WEEK_DAYS.map((_, day) => (
      day === 5 ? { day, open: false, from: '', to: '' } : { day, open: true, from: '09:00', to: '21:00' }
    )),
    after_hours_mode: 'take',
    paused: false,
    updated_at: null,
  }
}

function normalizeSettings(row: Partial<AgentSettings> & { company_id: string }, fallback: AgentSettings): AgentSettings {
  const hours = Array.isArray(row.working_hours) && row.working_hours.length === 7 ? row.working_hours : fallback.working_hours
  return {
    ...fallback,
    ...Object.fromEntries(Object.entries(row).filter(([, v]) => v !== null && v !== undefined)),
    channels: { ...fallback.channels, ...(row.channels || {}) },
    working_hours: hours,
  } as AgentSettings
}

/** null data = no saved row yet (the page shows defaults). */
export function useAgentSettings(companyId: string | null, isDemo: boolean, enabled: boolean) {
  return useLive<AgentSettings | null>(async () => {
    if (isDemo) return { ...demo.settings }
    if (!companyId || !enabled) return null
    const { data, error } = await supabase.from('agent_settings').select('*').eq('company_id', companyId).maybeSingle()
    if (error) throw error
    return data ? normalizeSettings(data as AgentSettings, defaultAgentSettings(companyId, '')) : null
  }, [companyId, isDemo, enabled], null)
}

export async function saveAgentSettings(s: AgentSettings, isDemo: boolean) {
  const updated_at = new Date().toISOString()
  if (isDemo) { demoChange(() => { demo.settings = { ...s, updated_at } }); return }
  const { error } = await supabase.from('agent_settings').upsert({
    company_id: s.company_id, agent_name: s.agent_name, voice_label: s.voice_label, greeting: s.greeting,
    transfer_number: s.transfer_number, channels: s.channels, working_hours: s.working_hours,
    after_hours_mode: s.after_hours_mode, paused: s.paused, updated_at,
  }, { onConflict: 'company_id' })
  if (error) throw error
}

export function useAgentLinks(companyId: string | null, isDemo: boolean, enabled: boolean) {
  return useLive<AgentLink[]>(async () => {
    if (isDemo || !companyId || !enabled) return []
    const { data, error } = await supabase.from('agent_links').select('provider, agent_id, label').eq('company_id', companyId)
    if (error) return []
    return (data ?? []) as AgentLink[]
  }, [companyId, isDemo, enabled], null)
}

/** A page where someone can talk to the agent in the browser, if the platform has one. */
export function webAgentUrl(link: AgentLink): string | null {
  if (link.provider === 'elevenlabs') return `https://elevenlabs.io/app/talk-to?agent_id=${encodeURIComponent(link.agent_id)}`
  return null // Nabrah has no public browser test page we can link to.
}

export type { TicketPriority, TicketStatus }
