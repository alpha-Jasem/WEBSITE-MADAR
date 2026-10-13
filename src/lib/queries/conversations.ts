import { useMemo, useSyncExternalStore } from 'react'
import { supabase } from '../supabase'
import { useAICalls, useMessages } from '../dashboardQueries'
import type { AICallLog, AICallStatus } from '../../types/dashboard'

// Calls a person has marked reviewed in this session. Realtime refetches the row
// anyway, but this makes the change visible at once (and is the only record of it in
// demo mode, where nothing is written).
const reviewedIds = new Set<string>()
const listeners = new Set<() => void>()
let version = 0

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
function emit() {
  version += 1
  listeners.forEach((l) => l())
}

function applyReviewed(call: AICallLog): AICallLog {
  if (!reviewedIds.has(call.id)) return call
  return { ...call, needs_review: false, status: call.status === 'needs_review' ? 'completed' : call.status }
}

/** Clears needs_review on a call. Throws when the write fails or RLS silently
 *  matches no row, so the caller can show the reason. */
export async function markCallReviewed(call: Pick<AICallLog, 'id' | 'status'>, isDemo: boolean) {
  if (!isDemo) {
    const patch: { needs_review: boolean; status?: AICallStatus } = { needs_review: false }
    if (call.status === 'needs_review') patch.status = 'completed'
    const { data, error } = await supabase
      .from('clinic_os_ai_calls')
      .update(patch)
      .eq('id', call.id)
      .select('id')
    if (error) throw error
    if (!data || data.length === 0) throw new Error('ما تقدر تعدّل هذه المكالمة من حسابك')
  }
  reviewedIds.add(call.id)
  emit()
}

/** Calls and WhatsApp messages for the conversation views, with session review marks applied. */
export function useConversationData(companyId: string | null, isDemo: boolean) {
  const callsQ = useAICalls(companyId, isDemo)
  const msgsQ = useMessages(companyId, isDemo)
  const v = useSyncExternalStore(subscribe, () => version)
  const calls = useMemo(() => (callsQ.data || []).map(applyReviewed), [callsQ.data, v])
  return {
    calls,
    messages: msgsQ.data || [],
    callsLoading: callsQ.loading,
    messagesLoading: msgsQ.loading,
    loading: callsQ.loading || msgsQ.loading,
    error: callsQ.error || msgsQ.error,
    live: callsQ.live || msgsQ.live,
    refetch: () => { callsQ.refetch(); msgsQ.refetch() },
  }
}

/** Fetches a call's recording through the agent-call-audio function and returns a playable blob URL. */
export async function fetchCallRecording(callId: string): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return null
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-call-audio`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ call_id: callId }),
  })
  if (!res.ok) return null
  return URL.createObjectURL(await res.blob())
}

let lastSync = 0

/** Asks the platform for conversations the dashboard has not stored yet. Quiet by default:
 *  at most once a minute unless forced, and never throws (the live webhook is the main path). */
export async function syncPlatformConversations(force = false): Promise<{ synced: number; pending: number } | null> {
  if (!force && Date.now() - lastSync < 60_000) return null
  lastSync = Date.now()
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) return null
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-conversations-sync`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '', 'Content-Type': 'application/json' },
      body: '{}',
    })
    if (!res.ok) return null
    const out = await res.json()
    return { synced: Number(out.synced) || 0, pending: Number(out.pending) || 0 }
  } catch { return null }
}

export interface LiveConversation {
  id: string
  status: string
  started: number
  channel: 'whatsapp' | 'phone' | 'web'
  phone: string
  transcript: { role: string; text: string; secs: number }[]
}

/** Conversations that are still running on the voice platform (not stored until they finish). */
export async function fetchLiveConversations(): Promise<LiveConversation[]> {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) return []
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-conversations-sync`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '', 'Content-Type': 'application/json' },
      body: JSON.stringify({ live: true }),
    })
    if (!res.ok) return []
    const out = await res.json()
    return Array.isArray(out.live) ? out.live : []
  } catch { return [] }
}

/** Turns a live conversation into the same shape as a stored call so the inbox can show it. */
export function liveToCall(l: LiveConversation, companyId: string): AICallLog {
  const started = new Date((l.started || Math.floor(Date.now() / 1000)) * 1000).toISOString()
  const mm = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(Math.floor(n % 60)).padStart(2, '0')}`
  return {
    id: `live-${l.id}`, company_id: companyId, phone: l.phone, call_time: started, created_at: started,
    duration_seconds: Math.max(0, Math.floor(Date.now() / 1000) - (l.started || 0)), status: 'completed', needs_review: false,
    provider: 'elevenlabs', external_id: l.id, channel: l.channel, summary: 'محادثة جارية الآن',
    transcript: l.transcript.map((t) => ({ speaker: t.role === 'agent' ? 'agent' : 'patient', text: t.text, time: mm(t.secs) })),
  } as AICallLog
}
