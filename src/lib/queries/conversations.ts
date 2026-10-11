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
