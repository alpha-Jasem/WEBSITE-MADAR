import { supabase } from '../supabase'

// Zaki, the dashboard assistant: calls the zaki edge function (read-only tools over the company's data).
// In the tour there is no model, so the page answers from the tour's own numbers instead.

export interface ZakiThread { id: string; title: string; updated_at: string }
export interface ZakiMessage { role: 'user' | 'assistant'; content: string; tools?: string[] }

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('سجّل دخولك من جديد')
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zaki`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const out = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(out.reply || 'زكي غير متاح الآن')
  return out as T
}

export const zakiThreads = () => call<{ threads: ZakiThread[] }>({ action: 'list' }).then((r) => r.threads)
export const zakiMessages = (id: string) => call<{ messages: ZakiMessage[] }>({ action: 'messages', conversation_id: id }).then((r) => r.messages)
export const zakiDelete = (id: string) => call<{ ok: boolean }>({ action: 'delete', conversation_id: id })
export const zakiAsk = (message: string, conversationId: string | null) =>
  call<{ reply: string; conversation_id: string; tools?: string[] }>({ action: 'ask', message, conversation_id: conversationId })
