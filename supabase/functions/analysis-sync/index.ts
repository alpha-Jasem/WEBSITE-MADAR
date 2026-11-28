// Keeps a company's analysis groups (what is pulled out of every call) in step with the voice platform.
//   POST {}                        with the signed-in user's JWT -> creates/updates every group of the company on the
//                                   platform and attaches each one to exactly the agents chosen on it (agent_ids)
//   POST { delete_id: "<uuid>" }   -> detaches the group from every agent, deletes it on the platform, then its row
// Analysis groups are shared by the whole workspace, so a company only ever touches the ones stored on its own rows.
// Agents are changed the way the agent editor does it (analysis_group_ids), keeping the groups they already have.
// Needs NABRAH_API_KEY. Deploy with JWT verification ON.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const API = 'https://api.nabrah.ai/api/ext'
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

class ApiError extends Error { constructor(public status: number, msg: string) { super(msg) } }
async function nabrah(path: string, key: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, { ...init, headers: { 'X-API-Key': key, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(20_000) })
  const text = await res.text()
  if (!res.ok) throw new ApiError(res.status, `${init.method ?? 'GET'} ${path} -> ${res.status} ${text.slice(0, 200)}`)
  return text ? JSON.parse(text) : null
}

const READ_ONLY = ['agent_id', 'project_id', 'created_by_email', 'created_at', 'last_update', 'tools', 'system_tools', 'analysis_groups', 'knowledge_bases', 'voice_object', 'version']
/** The agent as the platform returned it, turned into a body it accepts back (ids for links, no read-only fields). */
function toBody(agent: Record<string, unknown>): Record<string, unknown> {
  const body: Record<string, unknown> = { ...agent }
  const ids = (list: unknown) => Array.isArray(list) ? list.map((x) => (x && typeof x === 'object' ? (x as Record<string, unknown>).id ?? (x as Record<string, unknown>).tool_id ?? (x as Record<string, unknown>).analysis_group_id ?? (x as Record<string, unknown>).kb_id : x)).filter(Boolean) : undefined
  if (body.tool_ids === undefined) body.tool_ids = ids(agent.tools) ?? []
  if (body.analysis_group_ids === undefined) body.analysis_group_ids = ids(agent.analysis_groups) ?? []
  if (body.knowledge_base_ids === undefined) body.knowledge_base_ids = ids(agent.knowledge_bases) ?? []
  for (const k of READ_ONLY) delete body[k]
  return body
}

interface Field { name: string; type: 'text' | 'number' | 'yes_no'; description: string }
const TYPE: Record<Field['type'], string> = { text: 'string', number: 'number', yes_no: 'boolean' }

/** The group as the platform wants it. `ascii` falls back to plain keys (field_1...) with the readable name kept in the description. */
function groupBody(name: string, fields: Field[], ascii: boolean) {
  const key = (f: Field, i: number) => ascii ? `field_${i + 1}` : f.name.trim().replace(/[؟?!.,،:;]+/g, '').replace(/\s+/g, '_').slice(0, 60) || `field_${i + 1}`
  return {
    name: ascii ? name.replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'group' : name,
    data_collections: fields.map((f, i) => ({
      name: key(f, i), type: TYPE[f.type] ?? 'string', constraints: {},
      description: (ascii ? `${f.name.trim()}: ` : '') + (f.description?.trim() || f.name.trim()),
    })),
  }
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
  const { data: companyId, error: whoErr } = await asUser.rpc('get_my_clinic_company_id')
  if (whoErr || !companyId) return json({ error: 'unauthorized' }, 401)

  const body = await req.json().catch(() => ({}))
  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: links } = await db.from('agent_links').select('agent_id').eq('company_id', companyId).eq('provider', 'nabrah')
  const agentIds = ((links ?? []) as { agent_id: string }[]).map((l) => l.agent_id)

  /** Gives each of the company's agents exactly the wanted platform groups among `owned`, leaving every other group on the agent alone. */
  async function applyLinks(wantedByAgent: Map<string, Set<string>>, owned: Set<string>) {
    for (const agentId of agentIds) {
      const agent = (await nabrah(`/agent/${agentId}`, key as string)) as Record<string, unknown>
      const next = toBody(agent)
      const have = (next.analysis_group_ids as string[]) ?? []
      const wanted = wantedByAgent.get(agentId) ?? new Set<string>()
      const kept = have.filter((id) => !owned.has(id) || wanted.has(id))
      const added = [...wanted].filter((id) => !kept.includes(id))
      const result = [...kept, ...added]
      if (result.length === have.length && result.every((id, i) => id === have[i])) continue
      next.analysis_group_ids = result
      await nabrah(`/agent/${agentId}`, key as string, { method: 'PUT', body: JSON.stringify(next) })
    }
  }

  try {
    if (typeof body?.delete_id === 'string') {
      const { data: row } = await db.from('analysis_groups').select('id, nabrah_id').eq('company_id', companyId).eq('id', body.delete_id).maybeSingle()
      if (!row) return json({ error: 'not found' }, 404)
      if (row.nabrah_id) {
        await applyLinks(new Map(), new Set([row.nabrah_id]))
        await nabrah(`/analysis/${row.nabrah_id}`, key, { method: 'DELETE' }).catch((e) => { if (!(e instanceof ApiError && e.status === 404)) throw e })
      }
      await db.from('analysis_groups').delete().eq('company_id', companyId).eq('id', row.id)
      return json({ deleted: true })
    }

    const { data: rows } = await db.from('analysis_groups').select('id, name, fields, nabrah_id, agent_ids').eq('company_id', companyId).order('created_at')
    const wantedByAgent = new Map<string, Set<string>>()
    const owned = new Set<string>()
    let created = 0, updated = 0
    for (const r of (rows ?? []) as { id: string; name: string; fields: Field[]; nabrah_id: string | null; agent_ids: string[] | null }[]) {
      const fields = Array.isArray(r.fields) ? r.fields : []
      const send = async (ascii: boolean) => {
        const b = JSON.stringify(groupBody(r.name, fields, ascii))
        return r.nabrah_id ? await nabrah(`/analysis/${r.nabrah_id}`, key, { method: 'PUT', body: b }) : await nabrah('/analysis', key, { method: 'POST', body: b })
      }
      let out
      try { out = await send(false) }
      catch (e) { if (e instanceof ApiError && e.status === 422) out = await send(true); else throw e }
      const id = String(out?.id ?? r.nabrah_id)
      if (!r.nabrah_id) { created++; await db.from('analysis_groups').update({ nabrah_id: id }).eq('id', r.id) } else updated++
      owned.add(id)
      for (const a of (r.agent_ids ?? [])) if (agentIds.includes(a)) wantedByAgent.set(a, (wantedByAgent.get(a) ?? new Set()).add(id))
    }
    if (agentIds.length) await applyLinks(wantedByAgent, owned)
    return json({ synced: true, created, updated })
  } catch (e) {
    return json({ synced: false, error: e instanceof Error ? e.message : 'sync failed' }, 502)
  }
})
