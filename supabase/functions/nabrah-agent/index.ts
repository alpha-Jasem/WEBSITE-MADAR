// Agent management on the voice platform for the dashboard's agents page.
//   POST { op, ...args }  with the signed-in user's JWT. Deploy with JWT verification ON.
//   voices                         -> the voices an agent can use
//   create { fields }              -> new agent, linked to the caller's company in agent_links
//   update { agent_id, fields }    -> reads the agent, applies the edited fields, writes it back whole
//   copy   { agent_id }            -> a copy named «نسخة من …», linked to the same company
//   delete { agent_id }            -> deletes the agent and its link (irreversible; the page confirms first)
// Company users reach only agents linked to their company; admins reach every agent.
// The API key is the NABRAH_API_KEY function secret and never leaves the server.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const API = 'https://api.nabrah.ai/api/ext'
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const ID = /^[A-Za-z0-9-]{8,64}$/

// Fields the editor may set. Anything else in the request is dropped.
const EDITABLE = new Set([
  'name', 'agent_type', 'voice_id', 'languages', 'language_mode', 'start_first', 'allow_interruptions',
  'first_sentence', 'who_are_you', 'goal', 'steps', 'stack', 'speech_speed', 'max_call_duration', 'support_data',
  'background_ambient', 'background_ambient_volume', 'thinking_sound', 'thinking_sound_volume',
  'enable_tags', 'tags', 'tags_prompt', 'enable_ticket_creation', 'ticket_prompt',
  'tool_ids', 'analysis_group_ids', 'knowledge_base_ids', 'variables',
  'pre_call_callback', 'post_call_callback', 'post_analysis_callback',
])
// Read-only fields the platform returns that must not be sent back.
const READ_ONLY = ['agent_id', 'project_id', 'created_by_email', 'created_at', 'last_update', 'tools', 'system_tools', 'analysis_groups', 'knowledge_bases', 'voice_object', 'version']

function pick(fields: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (fields && typeof fields === 'object') for (const [k, v] of Object.entries(fields as Record<string, unknown>)) if (EDITABLE.has(k)) out[k] = v
  return out
}

/** The agent as the platform returned it, turned into a body it accepts back: ids for links, no read-only fields. */
function toBody(agent: Record<string, unknown>): Record<string, unknown> {
  const body: Record<string, unknown> = { ...agent }
  const ids = (list: unknown) => Array.isArray(list) ? list.map((x) => (x && typeof x === 'object' ? (x as Record<string, unknown>).id ?? (x as Record<string, unknown>).tool_id ?? (x as Record<string, unknown>).analysis_group_id ?? (x as Record<string, unknown>).kb_id : x)).filter(Boolean) : undefined
  if (body.tool_ids === undefined) body.tool_ids = ids(agent.tools) ?? []
  if (body.analysis_group_ids === undefined) body.analysis_group_ids = ids(agent.analysis_groups) ?? []
  if (body.knowledge_base_ids === undefined && agent.knowledge_bases !== undefined) body.knowledge_base_ids = ids(agent.knowledge_bases) ?? []
  for (const k of READ_ONLY) delete body[k]
  return body
}

async function nabrah(path: string, key: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, { ...init, headers: { 'X-API-Key': key, 'Content-Type': 'application/json' } })
  const text = await res.text()
  if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 300)}`)
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
  const db = createClient(url, serviceKey, { auth: { persistSession: false } })

  // Same rule as the page: the account owner, or a member whose permissions include agent.settings
  // (saved keys win; with none saved, only the manager preset has it).
  if (!admin) {
    const { data: u } = await asUser.auth.getUser()
    const uid = u?.user?.id
    if (!uid) return json({ error: 'unauthorized' }, 401)
    const { data: owned } = await db.from('companies').select('id').eq('id', companyId).eq('auth_user_id', uid).maybeSingle()
    if (!owned) {
      const { data: me } = await db.from('company_users').select('role, permissions').eq('company_id', companyId).eq('auth_user_id', uid).maybeSingle()
      const keys = (Array.isArray(me?.permissions) ? me.permissions as unknown[] : []).filter((p): p is string => typeof p === 'string' && p.includes('.'))
      const allowed = keys.length > 0 ? keys.includes('agent.settings') : me?.role === 'manager'
      if (!allowed) return json({ error: 'forbidden' }, 403)
    }
  }

  async function linkedCompany(agentId: string): Promise<string | null> {
    const { data } = await db.from('agent_links').select('company_id').eq('provider', 'nabrah').eq('agent_id', agentId).maybeSingle()
    return data?.company_id ?? null
  }
  async function mayUse(agentId: string) {
    if (!ID.test(agentId)) return false
    if (admin) return true
    return (await linkedCompany(agentId)) === companyId
  }

  try {
    if (op === 'voices') return json({ voices: await nabrah('/agent/voices', key) })

    if (op === 'create') {
      const fields = pick(body?.fields)
      if (!String(fields.name ?? '').trim()) return json({ error: 'name required' }, 400)
      const created = await nabrah('/agent', key, { method: 'POST', body: JSON.stringify({ agent_type: 'basic', stack: 'latest', languages: ['ar'], ...fields }) })
      if (companyId && created?.agent_id) await db.from('agent_links').insert({ provider: 'nabrah', agent_id: String(created.agent_id), company_id: companyId, label: String(fields.name).slice(0, 80) })
      return json({ agent: created })
    }

    const agentId = String(body?.agent_id ?? '')
    if (!(await mayUse(agentId))) return json({ error: 'not found' }, 404)

    if (op === 'update') {
      const current = await nabrah(`/agent/${agentId}`, key)
      const next = { ...toBody(current ?? {}), ...pick(body?.fields) }
      const saved = await nabrah(`/agent/${agentId}`, key, { method: 'PUT', body: JSON.stringify(next) })
      if (typeof next.name === 'string') await db.from('agent_links').update({ label: next.name.slice(0, 80) }).eq('provider', 'nabrah').eq('agent_id', agentId)
      return json({ agent: saved })
    }

    if (op === 'copy') {
      const current = await nabrah(`/agent/${agentId}`, key)
      const copyBody = { ...toBody(current ?? {}), name: `نسخة من ${String(current?.name ?? '')}`.slice(0, 120) }
      const created = await nabrah('/agent', key, { method: 'POST', body: JSON.stringify(copyBody) })
      const owner = (await linkedCompany(agentId)) ?? companyId
      if (owner && created?.agent_id) await db.from('agent_links').insert({ provider: 'nabrah', agent_id: String(created.agent_id), company_id: owner, label: String(copyBody.name).slice(0, 80) })
      return json({ agent: created })
    }

    if (op === 'delete') {
      if (body?.confirm !== true) return json({ error: 'confirm required' }, 400)
      await nabrah(`/agent/${agentId}`, key, { method: 'DELETE' })
      await db.from('agent_links').delete().eq('provider', 'nabrah').eq('agent_id', agentId)
      return json({ deleted: true })
    }

    return json({ error: 'unknown op' }, 400)
  } catch (e) {
    return json({ error: 'upstream error', status: e instanceof Error ? e.message.slice(0, 200) : '' }, 502)
  }
})
