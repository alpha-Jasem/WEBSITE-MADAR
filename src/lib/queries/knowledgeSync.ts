import { supabase } from '../supabase'

export interface KbSyncResult { ok: boolean; count?: number; reason?: 'no_linked_agent' | 'empty' | 'too_many' | 'too_big'; error?: string }

/** Pushes the company's active questions and answers to its voice agents (function kb-sync). */
export async function syncKnowledgeToAgents(): Promise<KbSyncResult> {
  try {
    const { data: s } = await supabase.auth.getSession()
    const token = s.session?.access_token
    if (!token) return { ok: false, error: 'سجّل دخولك من جديد' }
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kb-sync`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '', 'Content-Type': 'application/json' },
      body: '{}',
    })
    const out = await res.json().catch(() => ({}))
    if (out.synced) return { ok: true, count: Number(out.count) || 0 }
    if (out.reason) return { ok: false, reason: out.reason }
    return { ok: false, error: String(out.error || 'تعذّرت المزامنة').slice(0, 160) }
  } catch { return { ok: false, error: 'تعذّرت المزامنة' } }
}
