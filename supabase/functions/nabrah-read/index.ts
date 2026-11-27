// Read-only window onto the voice platform's API for the dashboard. Nothing here writes.
//   POST { op, ...args }  with the signed-in user's JWT.
// Company users reach only the agents (and those agents' calls) linked to their company in agent_links.
// Admins also reach the workspace-wide lists (contacts, tickets, tools, numbers...). The API key is the
// NABRAH_API_KEY function secret and never leaves the server. Deploy with JWT verification ON.
//   agents                      -> the agents you may see
//   agent    { agent_id }       -> one agent's configuration
//   calls    { agent_id, limit?, offset?, tag?, status?, call_type?, days? } -> call summaries for one agent
//   recording { call_id }       -> a short-lived link to the call's audio (null when it has none)
//   call     { call_id }        -> one call: transcript, analysis, tool logs
//   voice_insights { days, agent_id? } -> call insights (totals, statuses, daily, hourly) for your agents
//   admin only: voices, contacts, conversations, tickets, ticket_counts, tools, analysis_groups,
//               knowledge_bases, sip_inbound, sip_outbound, inbound_links, whatsapp_inboxes, ai_insights

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const API = 'https://api.nabrah.ai/api/ext'
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

/** Admin-only list endpoints: op -> GET path. */
const ADMIN_GET: Record<string, string> = {
  voices: '/agent/voices',
  contacts: '/omni_v2/contact',
  conversations: '/omni_v2/conversation/conversation',
  tickets: '/omni_v2/ticket',
  ticket_counts: '/omni_v2/ticket/counts',
  tools: '/tool',
  analysis_groups: '/analysis',
  knowledge_bases: '/kb',
  sip_inbound: '/sip-inbound',
  sip_outbound: '/sip-outbound',
  inbound_links: '/agent-inbound-link',
  whatsapp_inboxes: '/omni_v2/whatsapp/inboxes',
  ai_insights: '/insights/ai',
}

const ID = /^[A-Za-z0-9-]{8,64}$/

async function nabrah(path: string, key: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, { ...init, headers: { 'X-API-Key': key, 'Content-Type': 'application/json' } })
  const text = await res.text()
  if (!res.ok) throw new Error(`${res.status}`)
  return text ? JSON.parse(text) : null
}

/** Adds several agents' insights into one: numbers sum, bucket lists merge on their keys,
 *  the average duration and response times are weighted by each agent's calls. */
// deno-lint-ignore no-explicit-any
function sumInsights(parts: any[]): any {
  const add = (a: unknown, b: unknown): unknown => {
    if (typeof a === 'number' && typeof b === 'number') return a + b
    if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
      const out: Record<string, unknown> = { ...(a as Record<string, unknown>) }
      for (const [k, v] of Object.entries(b as Record<string, unknown>)) out[k] = k in out ? add(out[k], v) : v
      return out
    }
    return a ?? b
  }
  const merge = (lists: unknown[][], keyOf: (r: Record<string, unknown>) => string) => {
    const map = new Map<string, Record<string, unknown>>()
    for (const list of lists) for (const r of (list ?? []) as Record<string, unknown>[]) {
      const k = keyOf(r)
      const cur = map.get(k)
      if (!cur) { map.set(k, { ...r }); continue }
      for (const [f, v] of Object.entries(r)) if (typeof v === 'number' && !['hour', 'weekday'].includes(f)) cur[f] = (Number(cur[f]) || 0) + v
    }
    return [...map.values()]
  }
  const weight = (p: { totals?: { total?: number } }) => p?.totals?.total ?? 0
  const w = parts.reduce((s, p) => s + weight(p), 0)
  const wavg = (get: (p: any) => number) => (w ? parts.reduce((s, p) => s + get(p) * weight(p), 0) / w : 0)
  const out: any = {}
  for (const p of parts) for (const k of ['totals', 'not_connected', 'ended_by', 'hung_up_early', 'statuses']) out[k] = add(out[k], p?.[k])
  out.connected = parts.reduce((s, p) => s + (Number(p?.connected) || 0), 0)
  out.avg_duration_seconds = wavg((p) => Number(p?.avg_duration_seconds) || 0)
  out.response_time = { p50_seconds: wavg((p) => Number(p?.response_time?.p50_seconds) || 0), p95_seconds: wavg((p) => Number(p?.response_time?.p95_seconds) || 0) }
  out.daily = merge(parts.map((p) => p?.daily), (r) => String(r.date)).sort((a, b) => String(a.date).localeCompare(String(b.date)))
  out.hourly = merge(parts.map((p) => p?.hourly), (r) => String(r.hour)).sort((a, b) => Number(a.hour) - Number(b.hour))
  out.heatmap = merge(parts.map((p) => p?.heatmap), (r) => `${r.weekday}-${r.hour}`)
  out.unavailable = [...new Set(parts.flatMap((p) => p?.unavailable ?? []))]
  return out
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
  const [{ data: companyId }, { data: isAdmin }] = await Promise.all([asUser.rpc('get_my_clinic_company_id'), asUser.rpc('is_admin')])
  const admin = isAdmin === true
  if (!companyId && !admin) return json({ error: 'unauthorized' }, 401)

  const body = await req.json().catch(() => ({}))
  const op = String(body?.op ?? '')

  // Agents this caller may see: the company's links, or everything for an admin.
  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  let linked: Set<string> | null = null
  if (!admin) {
    const { data: links } = await db.from('agent_links').select('agent_id').eq('company_id', companyId).eq('provider', 'nabrah')
    linked = new Set((links ?? []).map((l: { agent_id: string }) => String(l.agent_id)))
  }
  const mayUse = (agentId: string) => admin || !!linked?.has(agentId)

  try {
    if (op === 'agents') {
      const list = (await nabrah('/agent', key)) as { agent_id: string }[]
      return json({ agents: (list ?? []).filter((a) => mayUse(String(a.agent_id))) })
    }
    if (op === 'agent') {
      const id = String(body?.agent_id ?? '')
      if (!ID.test(id) || !mayUse(id)) return json({ error: 'not found' }, 404)
      return json({ agent: await nabrah(`/agent/${id}`, key) })
    }
    if (op === 'calls') {
      const id = String(body?.agent_id ?? '')
      if (!ID.test(id) || !mayUse(id)) return json({ error: 'not found' }, 404)
      const limit = Math.min(Math.max(Number(body?.limit) || 25, 1), 50)
      const offset = Math.max(Number(body?.offset) || 0, 0)
      const tag = String(body?.tag ?? '')
      const search: Record<string, unknown> = { agent_id: id, limit, offset }
      if (/^madar_[a-f0-9]{12}$/.test(tag)) search.tag = tag
      // Call log filters: lifecycle status, call type, and how many days back.
      const status = String(body?.status ?? '')
      if (/^[a-z_-]{3,20}$/.test(status)) search.status = status
      const callType = String(body?.call_type ?? '')
      if (['inbound', 'outbound', 'web'].includes(callType)) search.call_type = callType
      const days = Number(body?.days)
      if (days > 0 && days <= 366) search.created_at_start = new Date(Date.now() - days * 86_400_000).toISOString()
      return json(await nabrah('/call/search', key, { method: 'POST', body: JSON.stringify(search) }))
    }
    if (op === 'recording') {
      // A 15-minute signed link to one call's audio, for a call of an agent you may see.
      const id = String(body?.call_id ?? '')
      if (!ID.test(id)) return json({ error: 'not found' }, 404)
      const call = await nabrah(`/call/${id}`, key)
      if (!mayUse(String(call?.agent_id ?? ''))) return json({ error: 'not found' }, 404)
      try { return json({ url: (await nabrah(`/call/get-download-link/${id}`, key))?.url ?? null }) }
      catch { return json({ url: null }) }
    }
    if (op === 'voice_insights') {
      // Call insights for a range. A company sees only its linked agents (summed when it has several);
      // an admin with no company and no agent sees the whole workspace.
      const days = Math.min(Math.max(Number(body?.days) || 7, 1), 366)
      const end = new Date()
      const start = new Date(end.getTime() - days * 86_400_000)
      const range = { start: start.toISOString(), end: end.toISOString(), tz: 'Asia/Riyadh' }
      const one = String(body?.agent_id ?? '')
      if (one && (!ID.test(one) || !mayUse(one))) return json({ error: 'not found' }, 404)
      let ids: string[] | null = one ? [one] : null
      if (!ids && companyId) {
        const { data: links } = await db.from('agent_links').select('agent_id').eq('company_id', companyId).eq('provider', 'nabrah')
        ids = (links ?? []).map((l: { agent_id: string }) => String(l.agent_id))
      }
      const fetchOne = (agent_id?: string) => nabrah('/insights/voice', key, { method: 'POST', body: JSON.stringify({ ...range, channel: 'voice', ...(agent_id ? { agent_id } : {}) }) })
      if (!ids) return json(await fetchOne())
      if (ids.length === 0) return json({ empty: true })
      const parts = await Promise.all(ids.map((id) => fetchOne(id)))
      return json(sumInsights(parts))
    }
    if (op === 'call') {
      const id = String(body?.call_id ?? '')
      if (!ID.test(id)) return json({ error: 'not found' }, 404)
      const call = await nabrah(`/call/${id}`, key)
      if (!mayUse(String(call?.agent_id ?? ''))) return json({ error: 'not found' }, 404)
      return json({ call })
    }
    if (ADMIN_GET[op]) {
      if (!admin) return json({ error: 'forbidden' }, 403)
      return json(await nabrah(ADMIN_GET[op], key))
    }
    return json({ error: 'unknown op' }, 400)
  } catch (e) {
    return json({ error: 'upstream error', status: e instanceof Error ? e.message : '' }, 502)
  }
})
