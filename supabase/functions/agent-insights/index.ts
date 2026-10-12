// Returns the voice platform's own analysis of the caller company's linked ElevenLabs agents:
// AI topic clusters (with sentiment counts) and the weekly insight summary.
//   POST { "days": 7 | 30 }  with the signed-in user's JWT.
// The company comes from the caller's session; only agents in agent_links for it are read.
// These platform endpoints are not in the public API reference, so every failure degrades to
// { available: false } and the dashboard falls back to its own computed topics.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EL = 'https://api.elevenlabs.io/v1/convai'
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

async function get(path: string, key: string) {
  const res = await fetch(`${EL}${path}`, { headers: { 'xi-api-key': key } })
  if (!res.ok) return null
  return res.json().catch(() => null)
}

const avg = (m: { count?: number; sum?: number } | undefined) =>
  m && m.count ? Math.round((Number(m.sum) / m.count) * 100) / 100 : null

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const apiKey = Deno.env.get('ELEVENLABS_API_KEY')
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!apiKey || !url || !serviceKey || !anonKey) return json({ available: false, reason: 'server_misconfigured' })

  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  })
  const { data: companyId } = await asUser.rpc('get_my_clinic_company_id')
  if (!companyId) return json({ error: 'unauthorized' }, 401)

  const body = await req.json().catch(() => ({}))
  const days = body?.days === 30 ? 30 : 7
  const now = Math.floor(Date.now() / 1000)
  const from = now - days * 86400

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: links } = await db.from('agent_links').select('agent_id')
    .eq('company_id', companyId).eq('provider', 'elevenlabs')
  if (!links?.length) return json({ available: false, reason: 'no_linked_agent' })

  const topics: Array<Record<string, unknown>> = []
  const summaries: Array<Record<string, unknown>> = []
  for (const { agent_id } of links) {
    const t = await get(`/agents/${agent_id}/topics?from_unix_secs=${from}&to_unix_secs=${now}&include_evaluation_criteria=true`, apiKey)
    for (const x of t?.topics ?? []) {
      const s = x.metrics?.sentiment ?? {}
      topics.push({
        id: x.topic_id, label: x.label, description: x.description, count: x.conversation_count ?? 0,
        sentiment: avg(s.sentiment), frustration: avg(s.frustration),
        positive: s.positive_count ?? 0, neutral: s.neutral_count ?? 0, negative: s.negative_count ?? 0,
        success_rate: typeof x.success_rate === 'number' ? x.success_rate : null,
      })
    }
    const r = (await get(`/insights/agent/${agent_id}/report?window_days=${days}`, apiKey))?.report
    const w = r?.window_summary
    if (r?.status === 'completed' && w) {
      summaries.push({
        title: w.llm?.title ?? null, short: w.llm?.short_summary ?? null, long: w.llm?.long_summary ?? null,
        conversations: w.conversation_count ?? null, avg_duration_secs: w.average_call_duration_secs ?? null,
        termination_reasons: w.termination_reason_counts ?? null,
        window_start: r.window_start_unix_secs, window_end: r.window_end_unix_secs, generated_at: r.generated_at_unix_secs,
      })
    }
  }
  topics.sort((a, b) => Number(b.count) - Number(a.count))
  return json({ available: topics.length > 0 || summaries.length > 0, days, topics, summaries })
})
