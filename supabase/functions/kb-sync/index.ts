// Pushes a company's knowledge base (its active questions and answers) to the voice platform, so its voice
// agents can look the answers up during a call.
//   POST { agent_id? }  with the signed-in user's JWT -> { synced, count, kb_id } | { synced: false, reason }
// The questions become one sheet in a table knowledge base named "m<company>_faq" (knowledge bases are shared by the
// whole workspace, so the company prefix keeps each company's apart); the sheet is replaced on every sync. The
// knowledge base is attached to the company's agents (or only agent_id) the way the agent editor does it, through
// the agent's knowledge_base_ids, keeping what the agent already has. Needs NABRAH_API_KEY. Deploy with JWT ON.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const API = 'https://api.nabrah.ai/api/ext'
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

async function nabrah(path: string, key: string, init: RequestInit = {}, isForm = false) {
  const headers: Record<string, string> = { 'X-API-Key': key }
  if (!isForm) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${API}${path}`, { ...init, headers, signal: AbortSignal.timeout(25_000) })
  const text = await res.text()
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status} ${text.slice(0, 200)}`)
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

const csvCell = (v: string) => `"${v.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`

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
  const { data: allLinks } = await db.from('agent_links').select('agent_id').eq('company_id', companyId).eq('provider', 'nabrah')
  const only = typeof body?.agent_id === 'string' ? body.agent_id : ''
  const links = (only ? (allLinks ?? []).filter((l: { agent_id: string }) => l.agent_id === only) : allLinks ?? []) as { agent_id: string }[]
  if (!links.length) return json({ synced: false, reason: 'no_linked_agent' })

  const { data: items, error: itemsErr } = await db.from('clinic_os_knowledge_items').select('title, content, type, metadata').eq('company_id', companyId).eq('is_active', true).order('updated_at', { ascending: false })
  if (itemsErr) return json({ error: 'could not read knowledge' }, 500)
  const rows = (items ?? []).filter((i: { title?: string; content?: string }) => String(i.title ?? '').trim() && String(i.content ?? '').trim())
  if (!rows.length) return json({ synced: false, reason: 'empty' })
  if (rows.length > 9000) return json({ synced: false, reason: 'too_many' })

  const kbKey = `m${String(companyId).replace(/-/g, '').slice(0, 8)}_faq`
  const csv = '﻿question,answer,category\n' + rows.map((r: { title: string; content: string; type: string; metadata: Record<string, unknown> | null }) => {
    const cat = typeof r.metadata?.category === 'string' && r.metadata.category.trim() ? r.metadata.category.trim() : r.type === 'policy' ? 'السياسات' : 'أسئلة عامة'
    return [csvCell(r.title.trim()), csvCell(r.content.trim()), csvCell(cat)].join(',')
  }).join('\n')
  if (csv.length > 1_800_000) return json({ synced: false, reason: 'too_big' })

  try {
    const kbs = ((await nabrah('/kb', key)) ?? []) as { id: string; key: string }[]
    let kb = kbs.find((k) => k.key === kbKey)
    if (!kb) {
      kb = await nabrah('/kb', key, { method: 'POST', body: JSON.stringify({ name: 'الأسئلة الشائعة', key: kbKey, desc: 'أسئلة العملاء الشائعة مع أجوبتها المعتمدة من الشركة: الأسعار والمواعيد والموقع والسياسات. ابحث هنا قبل ما تجاوب على أي سؤال عن الشركة.', kind: 'tabular' }) })
    }
    const kbId = String((kb as { id: string }).id)
    const detail = (await nabrah(`/kb/${kbId}`, key)) as { kind?: string; documents?: { id: string }[] }
    if (detail.kind && detail.kind !== 'tabular') return json({ synced: false, error: `knowledge base kind is ${detail.kind}, expected tabular` }, 502)

    const form = () => {
      const f = new FormData()
      f.append('file', new Blob([csv], { type: 'text/csv' }), 'faq.csv')
      f.append('sheet_desc', 'كل صف سؤال شائع (question) وجوابه المعتمد (answer) وتصنيفه (category).')
      f.append('searchable_columns', JSON.stringify(['question', 'category']))
      return f
    }
    const doc = detail.documents?.[0]
    if (doc) await nabrah(`/document/${doc.id}/file`, key, { method: 'PUT', body: form() }, true)
    else { const f = form(); f.append('knowledge_base_id', kbId); await nabrah('/document/sheet', key, { method: 'POST', body: f }, true) }

    // Attach the knowledge base to the agents (through the agent's own list, keeping what it already has).
    let attached = 0
    for (const { agent_id } of links) {
      const agent = (await nabrah(`/agent/${agent_id}`, key)) as Record<string, unknown>
      const next = toBody(agent)
      const have = next.knowledge_base_ids as string[]
      if (have.includes(kbId)) continue
      next.knowledge_base_ids = [...have, kbId]
      await nabrah(`/agent/${agent_id}`, key, { method: 'PUT', body: JSON.stringify(next) })
      attached++
    }
    return json({ synced: true, count: rows.length, kb_id: kbId, attached })
  } catch (e) {
    return json({ synced: false, error: e instanceof Error ? e.message : 'sync failed' }, 502)
  }
})
