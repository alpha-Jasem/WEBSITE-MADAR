// A company's knowledge bases on the voice platform: list, create, add and remove documents, attach to agents, delete.
//   POST (JSON) { op: 'list' }
//               { op: 'create', name, desc, kind: 'documents' | 'table' }
//               { op: 'get', id }                             -> the knowledge base with its documents and their status
//               { op: 'set_agents', id, agent_ids }           -> which of the company's agents search it
//               { op: 'delete_document', id, doc_id }
//               { op: 'delete', id }
//               { op: 'update', id, name, desc }              -> rename a knowledge base / change when the agent searches it
//   POST (multipart) op=add_document, id=<kb id>, file=<PDF, or CSV/XLSX for a table>, sheet_desc? -> uploads a document
// with the signed-in user's JWT. Knowledge bases are shared by the whole workspace, so each company's carry a key prefix
// ("m<company>_") and a company only ever sees, changes or attaches its own. Needs NABRAH_API_KEY. Deploy with JWT ON.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const API = 'https://api.nabrah.ai/api/ext'
const MAX_KBS = 10
const MAX_PDF = 20 * 1024 * 1024
const MAX_SHEET = 2 * 1024 * 1024
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

class ApiError extends Error { constructor(public status: number, msg: string) { super(msg) } }
async function nabrah(path: string, key: string, init: RequestInit = {}, isForm = false) {
  const headers: Record<string, string> = { 'X-API-Key': key }
  if (!isForm) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${API}${path}`, { ...init, headers, signal: AbortSignal.timeout(60_000) })
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
  const prefix = `m${String(companyId).replace(/-/g, '').slice(0, 8)}_`

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: links } = await db.from('agent_links').select('agent_id').eq('company_id', companyId).eq('provider', 'nabrah')
  const mine = ((links ?? []) as { agent_id: string }[]).map((l) => l.agent_id)

  const ctype = req.headers.get('content-type') ?? ''
  let form: FormData | null = null
  let body: Record<string, unknown> = {}
  if (ctype.includes('multipart/form-data')) { form = await req.formData().catch(() => null); body = { op: String(form?.get('op') ?? ''), id: String(form?.get('id') ?? '') } }
  else body = await req.json().catch(() => ({}))
  const op = String(body.op ?? '')

  /** The company's own knowledge base, or null (a key without the company prefix is never touched). */
  async function ownKb(id: unknown) {
    const kb = await nabrah(`/kb/${encodeURIComponent(String(id ?? ''))}`, key as string).catch(() => null)
    return kb && typeof kb.key === 'string' && kb.key.startsWith(prefix) ? kb : null
  }
  async function agentsWith(kbId: string): Promise<string[]> {
    const out: string[] = []
    for (const a of mine) {
      const agent = await nabrah(`/agent/${a}`, key as string).catch(() => null)
      const list = (agent?.knowledge_bases ?? []) as { id?: string; kb_id?: string }[]
      if (list.some((k) => (k?.id ?? k?.kb_id) === kbId)) out.push(a)
    }
    return out
  }
  async function setAgents(kbId: string, want: string[]) {
    for (const a of mine) {
      const agent = await nabrah(`/agent/${a}`, key as string) as Record<string, unknown>
      const next = toBody(agent)
      const have = (next.knowledge_base_ids as string[]) ?? []
      const has = have.includes(kbId), wants = want.includes(a)
      if (has === wants) continue
      next.knowledge_base_ids = wants ? [...have, kbId] : have.filter((x) => x !== kbId)
      await nabrah(`/agent/${a}`, key as string, { method: 'PUT', body: JSON.stringify(next) })
    }
  }

  try {
    if (op === 'list') {
      const all = ((await nabrah('/kb', key)) ?? []) as { id: string; key: string }[]
      const own = (Array.isArray(all) ? all : []).filter((k) => typeof k.key === 'string' && k.key.startsWith(prefix))
      const withAgents = await Promise.all(own.map(async (k) => ({ ...k, agent_ids: await agentsWith(k.id) })))
      return json({ knowledge_bases: withAgents })
    }

    if (op === 'create') {
      const name = String(body.name ?? '').trim()
      const desc = String(body.desc ?? '').trim()
      const kind = body.kind === 'table' ? 'tabular' : 'unstructured'
      if (!name || name.length > 120) return json({ error: 'اكتب اسم قاعدة المعرفة' }, 400)
      if (!desc) return json({ error: 'اكتب وصفًا يعرّف الوكيل متى يستخدمها' }, 400)
      const all = ((await nabrah('/kb', key)) ?? []) as { key: string }[]
      if (all.filter((k) => typeof k.key === 'string' && k.key.startsWith(prefix)).length >= MAX_KBS) return json({ error: `الحد الأقصى ${MAX_KBS} قواعد معرفة` }, 400)
      for (let i = 0; i < 4; i++) {
        const k = `${prefix}kb${Math.random().toString(36).slice(2, 8)}`
        try {
          const kb = await nabrah('/kb', key, { method: 'POST', body: JSON.stringify({ name, key: k, desc, kind }) })
          return json({ ok: true, id: kb?.id })
        } catch (e) { if (!(e instanceof ApiError && e.status === 409)) throw e }
      }
      return json({ error: 'تعذّر إنشاء القاعدة، حاول مرة ثانية' }, 502)
    }

    const kb = await ownKb(body.id)
    if (!kb) return json({ error: 'not found' }, 404)
    const kbId = String(kb.id)

    if (op === 'get') return json({ knowledge_base: kb, agent_ids: await agentsWith(kbId) })

    if (op === 'set_agents') {
      const want = [...new Set(Array.isArray(body.agent_ids) ? (body.agent_ids as unknown[]).map(String).filter((a) => mine.includes(a)) : [])]
      await setAgents(kbId, want)
      return json({ ok: true })
    }

    if (op === 'update') {
      const name = String(body.name ?? '').trim(), desc = String(body.desc ?? '').trim()
      if (!name || name.length > 120) return json({ error: 'اكتب اسم قاعدة المعرفة' }, 400)
      if (!desc) return json({ error: 'اكتب وصفًا يعرّف الوكيل متى يستخدمها' }, 400)
      await nabrah(`/kb/${kbId}`, key, { method: 'PATCH', body: JSON.stringify({ name, desc }) })
      return json({ ok: true })
    }

    if (op === 'delete') {
      await setAgents(kbId, [])
      await nabrah(`/kb/${kbId}`, key, { method: 'DELETE' })
      return json({ ok: true })
    }

    if (op === 'delete_document') {
      const doc = await nabrah(`/document/${encodeURIComponent(String(body.doc_id ?? ''))}`, key).catch(() => null)
      if (!doc || String(doc.knowledge_base_id) !== kbId) return json({ error: 'not found' }, 404)
      await nabrah(`/document/${doc.id}`, key, { method: 'DELETE' })
      return json({ ok: true })
    }

    if (op === 'add_document') {
      const file = form?.get('file')
      if (!(file instanceof File) || !file.size) return json({ error: 'اختر ملفًا' }, 400)
      const isTable = kb.kind === 'tabular'
      const name = file.name.toLowerCase()
      if (isTable) {
        if (!/\.(csv|xlsx|xls)$/.test(name)) return json({ error: 'الجدول يقبل ملف CSV أو Excel فقط' }, 400)
        if (file.size > MAX_SHEET) return json({ error: 'الملف أكبر من 2 ميجابايت' }, 400)
      } else {
        if (!name.endsWith('.pdf')) return json({ error: 'المستندات تقبل ملفات PDF فقط' }, 400)
        if (file.size > MAX_PDF) return json({ error: 'الملف أكبر من 20 ميجابايت' }, 400)
      }
      const f = new FormData()
      f.append('knowledge_base_id', kbId)
      f.append('file', file, file.name)
      if (isTable) {
        const desc = String(form?.get('sheet_desc') ?? '').trim()
        if (desc) f.append('sheet_desc', desc.slice(0, 500))
        const cols = String(form?.get('searchable_columns') ?? '').split(/[,،]/).map((c) => c.trim()).filter(Boolean).slice(0, 30)
        if (cols.length) f.append('searchable_columns', JSON.stringify(cols))
        // A table knowledge base holds one sheet: a new file replaces the current one.
        const docs = (kb.documents ?? []) as { id: string }[]
        if (docs.length) {
          const r = new FormData(); r.append('file', file, file.name)
          if (desc) r.append('sheet_desc', desc.slice(0, 500))
          if (cols.length) r.append('searchable_columns', JSON.stringify(cols))
          await nabrah(`/document/${docs[0].id}/file`, key, { method: 'PUT', body: r }, true)
          return json({ ok: true, replaced: true })
        }
      }
      const doc = await nabrah(isTable ? '/document/sheet' : '/document/file', key, { method: 'POST', body: f }, true)
      return json({ ok: true, id: doc?.id })
    }

    return json({ error: 'unknown op' }, 400)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'failed' }, 502)
  }
})
