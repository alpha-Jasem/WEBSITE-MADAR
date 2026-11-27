// Pure helpers for call follow-ups: no imports, so the dashboard tests can load this file too.

export interface FollowupCall {
  id?: string
  call_from?: string | null
  call_to?: string | null
  call_type?: string | null
  status?: string | null
  duration?: number | null
  agent_name?: string | null
  variables?: Record<string, unknown> | null
  analysis_results?: unknown
}

/** The header value the callback carries: HMAC of the company id, so an agent's stored callback
 *  (visible to that company's dashboard) only opens that company's follow-ups. */
export async function followupSecret(secret: string, companyId: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(`followup:${companyId}`))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const META =new Set(['id', 'analysis_group_id', 'data_collection_id', 'type', 'description', 'source'])

/** The call's analysis as one flat map: each field under its own name and under «group.field». */
export function flattenAnalysis(results: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const put = (group: string, key: string, value: unknown) => {
    if (!key) return
    if (!(key in out)) out[key] = value
    if (group) out[`${group}.${key}`] = value
  }
  for (const g of Array.isArray(results) ? results : []) {
    if (!g || typeof g !== 'object') continue
    const group = String((g as Record<string, unknown>).name ?? '')
    const rows = (g as Record<string, unknown>).results
    for (const r of Array.isArray(rows) ? rows : rows && typeof rows === 'object' ? [rows] : []) {
      if (!r || typeof r !== 'object') continue
      const row = r as Record<string, unknown>
      const name = row.name ?? row.key ?? row.field ?? row.data_collection_name
      if (typeof name === 'string' && ('value' in row || 'result' in row)) { put(group, name, 'value' in row ? row.value : row.result); continue }
      for (const [k, v] of Object.entries(row)) if (!META.has(k)) put(group, k, v)
    }
  }
  return out
}

export function isTrue(v: unknown): boolean {
  if (v === true) return true
  if (typeof v === 'number') return v === 1
  return typeof v === 'string' && ['true', 'yes', 'نعم', '1'].includes(v.trim().toLowerCase())
}

/** True when every listed analysis field is true (no conditions: always). */
export function conditionsMet(conditions: string[], analysis: Record<string, unknown>): boolean {
  return conditions.every((c) => isTrue(analysis[c]))
}

/** 05xxxxxxxx / 5xxxxxxxx / +966… / 00966… -> 9665xxxxxxxx; other international numbers are kept as digits. */
export function waNumber(raw: string | null | undefined): string | null {
  let d = String(raw ?? '').replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('05') && d.length === 10) d = '966' + d.slice(1)
  else if (d.length === 9 && d.startsWith('5')) d = '966' + d
  return d.length >= 8 && d.length <= 15 ? d : null
}

/** The customer's number: the caller on inbound calls, the number dialled otherwise. */
export function customerNumber(call: FollowupCall): string | null {
  return waNumber(call.call_type === 'inbound' ? call.call_from : call.call_to)
}

/** Fills {{call.from}}, {{call.to}}, {{call.duration}}, {{agent.name}}, {{var.x}}, {{analysis.x}} and {{customer.phone}}. */
export function renderParam(text: string, call: FollowupCall, analysis: Record<string, unknown>): string {
  return text.replace(/\{\{\s*([a-z]+)\.([^}\s]+)\s*\}\}/gi, (_, scope: string, key: string) => {
    const s = scope.toLowerCase()
    let v: unknown = ''
    if (s === 'call') v = key === 'from' ? call.call_from : key === 'to' ? call.call_to : key === 'duration' ? (call.duration != null ? `${Math.round(Number(call.duration) / 60) || 1} دقيقة` : '') : key === 'type' ? call.call_type : key === 'status' ? call.status : ''
    else if (s === 'agent' && key === 'name') v = call.agent_name
    else if (s === 'customer' && key === 'phone') v = customerNumber(call)
    else if (s === 'var') v = call.variables?.[key]
    else if (s === 'analysis') v = analysis[key]
    if (v == null) return ''
    if (typeof v === 'boolean') return v ? 'نعم' : 'لا'
    return typeof v === 'object' ? JSON.stringify(v) : String(v)
  }).trim()
}
