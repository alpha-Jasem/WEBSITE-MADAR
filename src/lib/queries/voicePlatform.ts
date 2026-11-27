import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'

// Read-only view of the voice platform behind the agents: agents, their calls, and (admins only) the
// workspace-wide lists. Everything goes through the nabrah-read function; no key reaches the browser.

export interface VoiceAgent {
  agent_id: string; name: string; created_at?: string; last_update?: string; version?: string
  voice?: string; languages?: string[]; tools?: unknown[]; knowledge_bases?: unknown[]; analysis_groups?: unknown[]
  first_sentence?: string; goal?: string; max_call_duration?: number
}
export interface VoiceCallSummary {
  id: string; created_at: string; duration: number | null; call_type: string; status: string
  call_from?: string; call_to?: string; agent_id: string; agent_name?: string; tags?: ({ name?: string } | string)[]
}
export interface VoiceCallDetail extends VoiceCallSummary {
  transcript?: { role: string; message: string; timestamp?: number }[]
  analysis_results?: unknown
}

export async function voiceRead<T = unknown>(op: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('nabrah-read', { body: { op, ...args } })
  if (error) throw error
  if (data?.error) throw new Error(String(data.error))
  return data as T
}

/** One read with loading / error state; re-runs when `key` changes. */
export function useVoiceRead<T>(key: string | null, op: string, args: Record<string, unknown> = {}) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(!!key)
  const [error, setError] = useState<string | null>(null)
  const argsJson = JSON.stringify(args)
  const load = useCallback(async () => {
    if (!key) { setData(null); setLoading(false); return }
    setLoading(true); setError(null)
    try { setData(await voiceRead<T>(op, JSON.parse(argsJson))) }
    catch (e) { setData(null); setError(e instanceof Error ? e.message : 'failed') }
    finally { setLoading(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, op, argsJson])
  useEffect(() => { void load() }, [load])
  return { data, loading, error, reload: load }
}

/** How many rows a list response holds, whatever envelope the platform used. */
export function countOf(d: unknown): number | null {
  if (Array.isArray(d)) return d.length
  if (d && typeof d === 'object') {
    for (const v of Object.values(d as Record<string, unknown>)) if (Array.isArray(v)) return v.length
  }
  return null
}
