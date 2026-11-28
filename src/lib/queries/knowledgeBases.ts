import { supabase } from '../supabase'

// A company's knowledge bases on the voice platform (function kb-manage). Documents (PDF) are searched by meaning,
// a table (one CSV or Excel sheet) is looked up by column.

export type KbKind = 'unstructured' | 'tabular'
export interface KbDoc { id: string; status?: string; title?: string; filename?: string; created_at?: string }
export interface KnowledgeBase {
  id: string; name: string; key?: string; desc?: string; kind: KbKind; document_count?: number; created_at?: string
  agent_ids?: string[]; documents?: KbDoc[]
}

async function call(init: { json?: Record<string, unknown>; form?: FormData }): Promise<Record<string, unknown>> {
  const { data: s } = await supabase.auth.getSession()
  const token = s.session?.access_token
  if (!token) throw new Error('سجّل دخولك من جديد')
  const headers: Record<string, string> = { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '' }
  if (init.json) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kb-manage`, { method: 'POST', headers, body: init.form ?? JSON.stringify(init.json) })
  const out = await res.json().catch(() => ({}))
  if (!res.ok || out.error) throw new Error(String(out.error || 'تعذّر تنفيذ الطلب').slice(0, 220))
  return out
}

export const kbList = async () => ((await call({ json: { op: 'list' } })).knowledge_bases ?? []) as KnowledgeBase[]
export const kbGet = async (id: string) => {
  const out = await call({ json: { op: 'get', id } })
  return { ...(out.knowledge_base as KnowledgeBase), agent_ids: (out.agent_ids ?? []) as string[] }
}
export const kbCreate = (name: string, desc: string, kind: 'documents' | 'table') => call({ json: { op: 'create', name, desc, kind } })
export const kbSetAgents = (id: string, agent_ids: string[]) => call({ json: { op: 'set_agents', id, agent_ids } })
export const kbDelete = (id: string) => call({ json: { op: 'delete', id } })
export const kbUpdate = (id: string, name: string, desc: string) => call({ json: { op: 'update', id, name, desc } })
export const kbDeleteDocument = (id: string, doc_id: string) => call({ json: { op: 'delete_document', id, doc_id } })
export function kbAddDocument(id: string, file: File, sheetDesc?: string, searchableColumns?: string) {
  const f = new FormData()
  f.append('op', 'add_document'); f.append('id', id); f.append('file', file, file.name)
  if (sheetDesc) f.append('sheet_desc', sheetDesc)
  if (searchableColumns) f.append('searchable_columns', searchableColumns)
  return call({ form: f })
}
