// Brings the company's WhatsApp conversations from its own inbox on the voice platform into the
// dashboard's conversations table, so the WhatsApp inbox (assignment, tags, tickets) reads them like any other.
//   POST {} with the signed-in user's JWT  ->  { synced, checked } | { synced: 0, reason }
// Only the inbox stored for the caller's company (whatsapp_cloud_accounts.nabrah_inbox_id) is read.
// One row per platform conversation (provider 'nabrah_whatsapp', external_id = conversation id); a row is
// refreshed only when the conversation has new activity.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const API = 'https://api.nabrah.ai/api/ext'
const PROVIDER = 'nabrah_whatsapp'
const MAX_REFRESH = 15
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// deno-lint-ignore no-explicit-any
type Any = any

/** Seconds (or milliseconds) since the epoch, or an ISO string, as epoch seconds. */
function secs(v: unknown): number {
  if (typeof v === 'number') return v > 1e12 ? Math.floor(v / 1000) : v
  const t = Date.parse(String(v ?? ''))
  return Number.isNaN(t) ? 0 : Math.floor(t / 1000)
}
const offset = (s: number) => {
  const n = Math.max(0, Math.floor(s))
  return `${Math.floor(n / 3600)}:${String(Math.floor((n % 3600) / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const key = Deno.env.get('NABRAH_API_KEY')?.trim()
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!key || !url || !serviceKey || !anonKey) return json({ error: 'server misconfigured' }, 500)

  const asUser = createClient(url, anonKey, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }, auth: { persistSession: false } })
  const { data: companyId } = await asUser.rpc('get_my_clinic_company_id')
  if (!companyId) return json({ error: 'unauthorized' }, 401)

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: acc } = await db.from('whatsapp_cloud_accounts').select('nabrah_inbox_id').eq('company_id', companyId).maybeSingle()
  const inboxId = acc?.nabrah_inbox_id as string | undefined
  if (!inboxId) return json({ synced: 0, checked: 0, reason: 'no_inbox' })

  const get = async (path: string) => {
    const r = await fetch(`${API}${path}`, { headers: { 'X-API-Key': key }, signal: AbortSignal.timeout(15_000) })
    if (!r.ok) throw new Error(String(r.status))
    return r.json()
  }

  try {
    // The latest conversations on the company's number, every status.
    const convs: Any[] = []
    for (let page = 1; page <= 2; page++) {
      const out = await get(`/omni_v2/whatsapp?inbox_id=${encodeURIComponent(inboxId)}&status_param=all&assignee_type=all&page=${page}`)
      const list = Array.isArray(out?.payload) ? out.payload : []
      convs.push(...list)
      if (list.length < 20) break
    }
    if (!convs.length) return json({ synced: 0, checked: 0 })

    const ids = convs.map((c) => String(c.id))
    const { data: known } = await db.from('clinic_os_ai_calls').select('external_id, analysis').eq('company_id', companyId).eq('provider', PROVIDER).in('external_id', ids)
    const seen = new Map((known ?? []).map((k: Any) => [String(k.external_id), Number(k.analysis?.last_activity_at) || 0]))
    const stale = convs.filter((c) => seen.get(String(c.id)) !== secs(c.last_activity_at)).slice(0, MAX_REFRESH)

    let synced = 0
    for (const c of stale) {
      // Up to three pages of the thread, oldest first.
      const msgs: Any[] = []
      let before = ''
      for (let i = 0; i < 3; i++) {
        const out = await get(`/omni_v2/conversation/conversation/${encodeURIComponent(String(c.id))}/messages${before ? `?before=${before}` : ''}`)
        const page = Array.isArray(out?.payload) ? out.payload : []
        if (!page.length) break
        msgs.push(...page)
        const oldest = Math.min(...page.map((m: Any) => Number(m.id) || Infinity))
        if (!Number.isFinite(oldest) || page.length < 20) break
        before = String(oldest)
      }
      const thread = [...new Map(msgs.map((m) => [m.id, m])).values()]
        .filter((m) => !m.private && (m.message_type === 0 || m.message_type === 1 || m.message_type === 3) && String(m.content ?? '').trim())
        .sort((a, b) => secs(a.created_at) - secs(b.created_at))

      const sender = c.meta?.sender ?? {}
      const phone = String(sender.phone_number ?? '').replace(/[^\d+]/g, '')
      if (!phone) continue
      const start = secs(c.created_at) || secs(thread[0]?.created_at) || Math.floor(Date.now() / 1000)
      const last = secs(c.last_activity_at) || start
      const lastText = String(c.last_non_activity_message?.content ?? thread[thread.length - 1]?.content ?? '').trim()
      const row = {
        company_id: companyId, provider: PROVIDER, external_id: String(c.id), channel: 'whatsapp',
        phone, caller_name: sender.name && sender.name !== phone ? String(sender.name).slice(0, 120) : null,
        call_time: new Date(start * 1000).toISOString(), duration_seconds: Math.max(0, last - start), status: 'completed',
        summary: lastText.slice(0, 280) || null,
        transcript: thread.map((m) => ({
          speaker: m.message_type === 0 ? 'patient' : 'agent',
          text: String(m.content).slice(0, 4000),
          time: offset(secs(m.created_at) - start),
        })),
        analysis: { source: PROVIDER, conversation_id: c.id, last_activity_at: secs(c.last_activity_at), status: c.status ?? null, unread_count: c.unread_count ?? 0, can_reply: c.can_reply ?? null },
      }
      const { error } = await db.from('clinic_os_ai_calls').upsert(row, { onConflict: 'provider,external_id' })
      if (!error) synced++
    }
    return json({ synced, checked: convs.length })
  } catch (e) {
    return json({ error: 'upstream error', status: e instanceof Error ? e.message : '' }, 502)
  }
})
