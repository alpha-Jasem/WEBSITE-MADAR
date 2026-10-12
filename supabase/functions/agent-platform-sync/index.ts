// Pushes a company's dashboard settings to its linked ElevenLabs agents.
//   POST { "action": "settings" | "knowledge" | "all" }  with the signed-in user's JWT.
// The company comes from the caller's session (get_my_clinic_company_id), never from the body,
// and only agents listed for that company in agent_links are touched.
//   settings  -> agent name + greeting (agent_settings) become the agent's name / first message.
//   knowledge -> active clinic_os_knowledge_items are written as ONE ElevenLabs text document
//                ("madar-knowledge") that replaces the previous one on the agent; documents the
//                agent already had are kept.
// Nabrah is not synced here: its API has no knowledge/greeting update that Madar relies on yet.
// Needs the ELEVENLABS_API_KEY secret. Deploy with JWT verification ON (the default).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EL = 'https://api.elevenlabs.io/v1/convai'
const DOC_NAME = 'madar-knowledge'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

async function el(path: string, key: string, init: RequestInit = {}) {
  const res = await fetch(`${EL}${path}`, {
    ...init,
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`ElevenLabs ${init.method ?? 'GET'} ${path} -> ${res.status} ${text.slice(0, 200)}`)
  return text ? JSON.parse(text) : {}
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const apiKey = Deno.env.get('ELEVENLABS_API_KEY')
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!apiKey || !url || !serviceKey || !anonKey) return json({ error: 'server misconfigured' }, 500)

  const authHeader = req.headers.get('Authorization') ?? ''
  const asUser = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } })
  const { data: companyId, error: whoErr } = await asUser.rpc('get_my_clinic_company_id')
  if (whoErr || !companyId) return json({ error: 'unauthorized' }, 401)

  const body = await req.json().catch(() => ({}))
  const action = body?.action === 'settings' || body?.action === 'knowledge' ? body.action : 'all'

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: links, error: linkErr } = await db
    .from('agent_links').select('agent_id, label').eq('company_id', companyId).eq('provider', 'elevenlabs')
  if (linkErr) return json({ error: 'could not read agent links' }, 500)
  if (!links?.length) return json({ synced: false, reason: 'no_linked_agent' })

  let settings: { agent_name?: string; greeting?: string } | null = null
  if (action !== 'knowledge') {
    const { data } = await db.from('agent_settings').select('agent_name, greeting').eq('company_id', companyId).maybeSingle()
    settings = data
  }

  let knowledgeText = ''
  if (action !== 'settings') {
    const { data: items } = await db
      .from('clinic_os_knowledge_items').select('title, content').eq('company_id', companyId).eq('is_active', true)
      .order('created_at', { ascending: true })
    knowledgeText = (items ?? [])
      .filter((i) => i.content?.trim())
      .map((i) => `${i.title?.trim() || 'معلومة'}:\n${i.content.trim()}`)
      .join('\n\n---\n\n')
  }

  const results: Array<Record<string, unknown>> = []
  for (const link of links) {
    const agentId = link.agent_id as string
    try {
      const agent = await el(`/agents/${agentId}`, apiKey)
      const patch: Record<string, any> = {}
      const convAgent: Record<string, any> = {}

      if (settings?.agent_name) patch.name = settings.agent_name
      if (settings?.greeting) convAgent.first_message = settings.greeting

      let newDocId: string | null = null
      if (action !== 'settings' && knowledgeText) {
        const doc = await el('/knowledge-base/text', apiKey, {
          method: 'POST', body: JSON.stringify({ name: DOC_NAME, text: knowledgeText }),
        })
        newDocId = doc.id
        const existing: any[] = agent?.conversation_config?.agent?.prompt?.knowledge_base ?? []
        const kept = existing.filter((d) => d.name !== DOC_NAME)
        convAgent.prompt = { knowledge_base: [...kept, { type: 'text', name: DOC_NAME, id: doc.id }] }
      }

      if (Object.keys(convAgent).length) patch.conversation_config = { agent: convAgent }
      if (Object.keys(patch).length) await el(`/agents/${agentId}`, apiKey, { method: 'PATCH', body: JSON.stringify(patch) })

      // Drop the previous madar document only after the agent points at the new one.
      if (newDocId) {
        const old: any[] = (agent?.conversation_config?.agent?.prompt?.knowledge_base ?? []).filter((d: any) => d.name === DOC_NAME)
        for (const d of old) await el(`/knowledge-base/${d.id}`, apiKey, { method: 'DELETE' }).catch(() => {})
      }
      results.push({ agent_id: agentId, ok: true, settings: !!settings, knowledge: !!newDocId })
    } catch (e) {
      console.error('agent-platform-sync failed', agentId, e)
      results.push({ agent_id: agentId, ok: false, error: 'platform_error' })
    }
  }
  return json({ synced: results.every((r) => r.ok), results })
})
