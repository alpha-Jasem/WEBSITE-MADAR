// Pushes a company's enabled tools (agent_tools) to its voice agents on the voice platform.
//   POST { dry_run?: boolean }  with the signed-in user's JWT. The company comes from the session, never the body.
// Every tool is created on the platform as "m<company>_<name>" (tools are shared by the whole workspace, so the
// company prefix keeps each company's tools apart) and linked to every agent the company owns. Tools that were
// disabled or deleted in the dashboard are removed from the platform. GET and DELETE tools send their parameters in
// the query string, the others in the body. dry_run returns the plan without writing anything.
// Needs the NABRAH_API_KEY secret. Deploy with JWT verification ON.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const API = 'https://api.nabrah.ai/api/ext'
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

async function nabrah(path: string, key: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, { ...init, headers: { 'X-API-Key': key, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(20_000) })
  const text = await res.text()
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status} ${text.slice(0, 160)}`)
  return text ? JSON.parse(text) : null
}

interface Param { name: string; description: string; required: boolean }
interface Tool { name: string; description: string; method: string; url: string; params: Param[] }

function toolBody(t: Tool, prefix: string) {
  const location = t.method === 'GET' || t.method === 'DELETE' ? 'query' : 'body'
  return {
    name: prefix + t.name, description: t.description, url: t.url, method: t.method, timeout_seconds: 10,
    parameters: t.params.map((p) => ({ name: p.name, location, parameter_type: 'llm_input', data_type: 'string', description: p.description || p.name, required: !!p.required, value: '', default_value: '' })),
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
  const dryRun = body?.dry_run === true
  const prefix = `m${String(companyId).replace(/-/g, '').slice(0, 8)}_`

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: links } = await db.from('agent_links').select('agent_id').eq('company_id', companyId).eq('provider', 'nabrah')
  if (!links?.length) return json({ synced: false, reason: 'no_linked_agent' })
  const { data: rows, error: toolsErr } = await db.from('agent_tools').select('name, description, method, url, params').eq('company_id', companyId).eq('enabled', true)
  if (toolsErr) return json({ error: 'could not read tools' }, 500)
  const wanted = (rows ?? []) as Tool[]

  const plan = { create: [] as string[], update: [] as string[], remove: [] as string[], linked: 0 }
  try {
    const all = ((await nabrah('/tool', key)) ?? []) as { id: string; name: string }[]
    const ours = new Map(all.filter((t) => typeof t.name === 'string' && t.name.startsWith(prefix)).map((t) => [t.name, t.id]))

    const ids = new Map<string, string>() // dashboard name -> platform tool id
    for (const t of wanted) {
      const body = toolBody(t, prefix)
      const existing = ours.get(body.name)
      if (existing) {
        plan.update.push(t.name)
        if (!dryRun) await nabrah(`/tool/${existing}`, key, { method: 'PUT', body: JSON.stringify(body) })
        ids.set(t.name, existing)
        ours.delete(body.name)
      } else {
        plan.create.push(t.name)
        if (!dryRun) { const made = await nabrah('/tool', key, { method: 'POST', body: JSON.stringify(body) }); ids.set(t.name, String(made?.id)) }
      }
    }
    for (const [name, id] of ours) {
      plan.remove.push(name.slice(prefix.length))
      if (!dryRun) await nabrah(`/tool/${id}`, key, { method: 'DELETE' }).catch(() => null)
    }
    if (!dryRun) {
      for (const { agent_id } of links as { agent_id: string }[]) {
        const have = new Set((((await nabrah(`/tool/agent/${agent_id}`, key)) ?? []) as { id: string }[]).map((t) => t.id))
        for (const id of ids.values()) {
          if (have.has(id)) continue
          await nabrah('/tool/link', key, { method: 'POST', body: JSON.stringify({ tool_id: id, agent_id }) })
          plan.linked++
        }
      }
    }
  } catch (e) {
    return json({ synced: false, error: e instanceof Error ? e.message : 'sync failed', results: [plan] }, 502)
  }
  return json({ synced: !dryRun, dry_run: dryRun, results: [plan] })
})
