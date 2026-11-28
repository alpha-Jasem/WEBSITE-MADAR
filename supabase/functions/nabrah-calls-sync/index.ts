// Brings the company's recent finished voice calls into the dashboard (call rows, tickets, contacts) for agents whose
// calls did not arrive through the post-analysis callback.
//   POST {} with the signed-in user's JWT  ->  { ingested, checked }
// Looks at the last 24 hours of the company's own agents, skips calls already stored and calls that ended less than
// two minutes ago (their analysis may not be ready; the callback or the next run takes them). At most 15 per run.
// Needs NABRAH_API_KEY. Deploy with JWT verification ON.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ingestNabrahCall } from '../_shared/call-ingest.ts'

const API = 'https://api.nabrah.ai/api/ext'
const MAX_PER_RUN = 15
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

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
  const { data: links } = await db.from('agent_links').select('agent_id').eq('company_id', companyId).eq('provider', 'nabrah')
  if (!links?.length) return json({ ingested: 0, checked: 0, reason: 'no_linked_agent' })

  try {
    const since = new Date(Date.now() - 24 * 3600_000).toISOString()
    const settled = Date.now() - 2 * 60_000
    const recent: { id: string; call_ended_at?: string | null; created_at?: string; duration?: number }[] = []
    for (const { agent_id } of links as { agent_id: string }[]) {
      const res = await fetch(`${API}/call/search`, {
        method: 'POST', headers: { 'X-API-Key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id, limit: 50, offset: 0, created_at_start: since }), signal: AbortSignal.timeout(15_000),
      })
      if (!res.ok) throw new Error(`calls ${res.status}`)
      const out = await res.json().catch(() => ({}))
      recent.push(...((Array.isArray(out) ? out : out?.calls ?? []) as typeof recent))
    }
    const ready = recent.filter((c) => {
      const ended = Date.parse(String(c.call_ended_at ?? ''))
      return !Number.isNaN(ended) && ended <= settled
    })
    if (!ready.length) return json({ ingested: 0, checked: recent.length })
    const { data: known } = await db.from('clinic_os_ai_calls').select('external_id').eq('company_id', companyId).eq('provider', 'nabrah').in('external_id', ready.map((c) => String(c.id)))
    const have = new Set((known ?? []).map((k: { external_id: string }) => String(k.external_id)))
    let ingested = 0
    for (const c of ready.filter((c) => !have.has(String(c.id))).slice(0, MAX_PER_RUN)) {
      const r = await ingestNabrahCall(db, key, companyId, String(c.id)).catch(() => null)
      if (r?.ingested) ingested++
    }
    return json({ ingested, checked: recent.length })
  } catch (e) {
    return json({ error: 'upstream error', status: e instanceof Error ? e.message : '' }, 502)
  }
})
