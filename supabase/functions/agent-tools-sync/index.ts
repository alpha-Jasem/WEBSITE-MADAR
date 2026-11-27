// Pushes a company's enabled tools (agent_tools) to its linked ElevenLabs voice agent as webhook tools.
//   POST { dry_run?: boolean }  with the signed-in user's JWT. The company comes from the session, never the body.
// Every tool is created on ElevenLabs as "madar_<name>" and attached to the agent. Tools the agent already had
// that are not ours (no "madar_" prefix) are left alone; our tools that were disabled or deleted in the
// dashboard are detached and removed. GET tools send their parameters in the query string, the others as a JSON body.
// dry_run returns the plan without writing anything. Needs the ELEVENLABS_API_KEY secret. Deploy with JWT verification ON.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EL = 'https://api.elevenlabs.io/v1/convai'
const PREFIX = 'madar_'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

async function el(path: string, key: string, init: RequestInit = {}) {
  const res = await fetch(`${EL}${path}`, { ...init, headers: { 'xi-api-key': key, 'Content-Type': 'application/json', ...(init.headers ?? {}) } })
  const text = await res.text()
  if (!res.ok) throw new Error(`ElevenLabs ${init.method ?? 'GET'} ${path} -> ${res.status} ${text.slice(0, 200)}`)
  return text ? JSON.parse(text) : {}
}

interface Param { name: string; description: string; required: boolean }
interface Tool { name: string; description: string; method: string; url: string; params: Param[] }

function toolConfig(t: Tool) {
  const props = Object.fromEntries(t.params.map((p) => [p.name, { type: 'string', description: p.description || p.name }]))
  const required = t.params.filter((p) => p.required).map((p) => p.name)
  const api_schema: Record<string, unknown> = { url: t.url, method: t.method }
  if (t.params.length) {
    if (t.method === 'GET' || t.method === 'DELETE') api_schema.query_params_schema = { properties: props, required }
    else api_schema.request_body_schema = { type: 'object', properties: props, required }
  }
  return { type: 'webhook', name: PREFIX + t.name, description: t.description, api_schema }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const apiKey = Deno.env.get('ELEVENLABS_API_KEY')?.trim()
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!apiKey || !url || !serviceKey || !anonKey) return json({ error: 'server misconfigured' }, 500)

  const asUser = createClient(url, anonKey, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }, auth: { persistSession: false } })
  const { data: companyId, error: whoErr } = await asUser.rpc('get_my_clinic_company_id')
  if (whoErr || !companyId) return json({ error: 'unauthorized' }, 401)

  const body = await req.json().catch(() => ({}))
  const dryRun = body?.dry_run === true

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: links } = await db.from('agent_links').select('agent_id').eq('company_id', companyId).eq('provider', 'elevenlabs')
  if (!links?.length) return json({ synced: false, reason: 'no_linked_agent' })
  const { data: rows, error: toolsErr } = await db.from('agent_tools').select('name, description, method, url, params').eq('company_id', companyId).eq('enabled', true)
  if (toolsErr) return json({ error: 'could not read tools' }, 500)
  const wanted = (rows ?? []) as Tool[]

  const results: unknown[] = []
  try {
    for (const { agent_id } of links) {
      const agent = await el(`/agents/${agent_id}`, apiKey)
      const current: string[] = agent?.conversation_config?.agent?.prompt?.tool_ids ?? []

      // Which of the agent's current tools are ours, by name.
      const ours = new Map<string, string>()
      const foreign: string[] = []
      for (const id of current) {
        const t = await el(`/tools/${id}`, apiKey).catch(() => null)
        const name: string | undefined = t?.tool_config?.name
        if (name?.startsWith(PREFIX)) ours.set(name, id); else foreign.push(id)
      }

      const plan = { agent_id, create: [] as string[], update: [] as string[], remove: [] as string[] }
      const keep: string[] = []
      for (const t of wanted) {
        const cfg = toolConfig(t)
        const existing = ours.get(cfg.name)
        if (existing) {
          plan.update.push(t.name)
          if (!dryRun) await el(`/tools/${existing}`, apiKey, { method: 'PATCH', body: JSON.stringify({ tool_config: cfg }) })
          keep.push(existing)
          ours.delete(cfg.name)
        } else {
          plan.create.push(t.name)
          if (!dryRun) { const made = await el('/tools', apiKey, { method: 'POST', body: JSON.stringify({ tool_config: cfg }) }); keep.push(made.id) }
        }
      }
      for (const [name, id] of ours) {
        plan.remove.push(name.slice(PREFIX.length))
        if (!dryRun) await el(`/tools/${id}`, apiKey, { method: 'DELETE' }).catch(() => undefined)
      }
      if (!dryRun && (plan.create.length || plan.update.length || plan.remove.length)) {
        await el(`/agents/${agent_id}`, apiKey, { method: 'PATCH', body: JSON.stringify({ conversation_config: { agent: { prompt: { tool_ids: [...foreign, ...keep] } } } }) })
      }
      results.push(plan)
    }
  } catch (e) {
    return json({ synced: false, error: e instanceof Error ? e.message : 'sync failed', results }, 502)
  }
  return json({ synced: !dryRun, dry_run: dryRun, results })
})
