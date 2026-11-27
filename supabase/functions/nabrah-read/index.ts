// Read-only window onto the voice platform's API for the dashboard. Nothing here writes.
//   POST { op, ...args }  with the signed-in user's JWT.
// Company users reach only the agents (and those agents' calls) linked to their company in agent_links.
// Admins also reach the workspace-wide lists (contacts, tickets, tools, numbers...). The API key is the
// NABRAH_API_KEY function secret and never leaves the server. Deploy with JWT verification ON.
//   agents                      -> the agents you may see
//   agent    { agent_id }       -> one agent's configuration
//   calls    { agent_id, limit?, offset?, tag? } -> call summaries for one agent (tag: one campaign's calls)
//   call     { call_id }        -> one call: transcript, analysis, tool logs
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
      return json(await nabrah('/call/search', key, { method: 'POST', body: JSON.stringify(search) }))
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
