// Creates, re-attaches and deletes a company's call services as real SIP trunks on the voice platform.
//   POST { op: 'create', direction, name, phone, transport, allowed_ips?, username?, password?, address?, max_channels?, agent_ids?, notes? }
//   POST { op: 'set_agents', id, agent_ids }     inbound only: which of the company's agents answer on the trunk
//   POST { op: 'delete', id }                    removes the agent links, the trunk on the platform, then the row
// with the signed-in user's JWT. The company comes from the session. Trunks are shared by the whole workspace, so a
// company only ever touches the ones stored on its own rows, and only attaches its own agents. The SIP password goes to
// the platform once and is never stored or returned. Needs NABRAH_API_KEY. Deploy with JWT verification ON.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const API = 'https://api.nabrah.ai/api/ext'
const MAX_SERVICES = 10
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

/** Digits with an optional leading +; a leading 0 becomes +966. Returns null when it does not look like a phone number. */
function phoneOf(v: unknown): string | null {
  let s = String(v ?? '').replace(/[\s()-]/g, '')
  if (/^0\d{8,10}$/.test(s)) s = '+966' + s.slice(1)
  else if (/^\d{8,15}$/.test(s)) s = '+' + s
  return /^\+\d{8,15}$/.test(s) ? s : null
}
const ipOk = (s: string) => /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(s) || /^[0-9a-f:]+(\/\d{1,3})?$/i.test(s)
const hostOk = (s: string) => /^[A-Za-z0-9]([A-Za-z0-9.-]{0,251})(:\d{2,5})?$/.test(s)

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
  const op = String(body?.op ?? '')
  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  // Telephony changes belong to the account owner; a team member (a row in company_users) is refused.
  const { data: u } = await asUser.auth.getUser()
  const { data: staff } = u?.user ? await db.from('company_users').select('company_id').eq('auth_user_id', u.user.id).maybeSingle() : { data: null }
  if (staff) return json({ error: 'خدمات الاتصال لصاحب الحساب فقط' }, 403)
  const { data: links } = await db.from('agent_links').select('agent_id').eq('company_id', companyId).eq('provider', 'nabrah')
  const mine = new Set(((links ?? []) as { agent_id: string }[]).map((l) => l.agent_id))
  const wantAgents = (list: unknown) => [...new Set(Array.isArray(list) ? list.map(String).filter((a) => mine.has(a)) : [])]

  async function inboundLinks(inboundId: string): Promise<{ link_id: string; agent_id: string }[]> {
    const raw = await nabrah('/agent-inbound-link', key as string)
    // The platform wraps the list ({ links: [...] }); a bare array is accepted too.
    const all = (Array.isArray(raw) ? raw : raw?.links ?? raw?.items ?? []) as { link_id: string; agent?: { agent_id?: string }; sip_inbound?: { id?: string }; agent_id?: string; inbound_id?: string }[]
    return all.filter((l) => (l.sip_inbound?.id ?? l.inbound_id) === inboundId).map((l) => ({ link_id: l.link_id, agent_id: String(l.agent?.agent_id ?? l.agent_id ?? '') }))
  }
  async function setInboundAgents(inboundId: string, want: string[]) {
    const have = await inboundLinks(inboundId)
    for (const l of have) if (mine.has(l.agent_id) && !want.includes(l.agent_id)) await nabrah(`/agent-inbound-link/${l.link_id}`, key as string, { method: 'DELETE' })
    for (const a of want) if (!have.some((l) => l.agent_id === a)) await nabrah('/agent-inbound-link', key as string, { method: 'POST', body: JSON.stringify({ agent_id: a, inbound_id: inboundId }) })
  }

  try {
    if (op === 'create') {
      const direction = body?.direction === 'outbound' ? 'outbound' : 'inbound'
      const name = String(body?.name ?? '').trim()
      const phone = phoneOf(body?.phone)
      const transport = ['udp', 'tcp', 'tls'].includes(String(body?.transport)) ? String(body.transport) : 'udp'
      const username = String(body?.username ?? '').trim()
      const password = String(body?.password ?? '')
      if (!name || name.length > 80) return json({ error: 'اكتب اسم الخدمة (80 حرف كحد أقصى)' }, 400)
      if (!phone) return json({ error: 'الرقم لازم يكون بصيغة دولية مثل +9665XXXXXXXX' }, 400)
      if (username && !password) return json({ error: 'اكتب كلمة مرور SIP مع اسم المستخدم' }, 400)
      const { count } = await db.from('voice_services').select('id', { count: 'exact', head: true }).eq('company_id', companyId).not('nabrah_id', 'is', null)
      if ((count ?? 0) >= MAX_SERVICES) return json({ error: `الحد الأقصى ${MAX_SERVICES} خدمات` }, 400)

      let created: { id?: string }
      let row: Record<string, unknown> = { company_id: companyId, direction, name, phone, provider: String(body?.provider ?? '').trim().slice(0, 80), status: 'active', notes: String(body?.notes ?? '').trim().slice(0, 500) || null, transport, sip_username: username || null }
      if (direction === 'inbound') {
        const ips = (Array.isArray(body?.allowed_ips) ? body.allowed_ips : []).map((s: unknown) => String(s).trim()).filter(Boolean)
        if (ips.some((s: string) => !ipOk(s))) return json({ error: 'عنوان IP غير صحيح' }, 400)
        if (!ips.length && !username) return json({ error: 'أضف عنوان IP مسموح أو اسم مستخدم وكلمة مرور' }, 400)
        const make = (withTransport: boolean) => nabrah('/sip-inbound', key, { method: 'POST', body: JSON.stringify({ name, numbers: phone, allowed_addresses: ips, auth_username: username, auth_password: password, pbx_type: 'lk', ...(withTransport ? { transport } : {}) }) })
        try { created = await make(true) } catch (e) { if (e instanceof ApiError && e.status === 422) created = await make(false); else throw e }
        row = { ...row, allowed_ips: ips, agent_ids: [] }
      } else {
        const address = String(body?.address ?? '').trim()
        const channels = Math.round(Number(body?.max_channels) || 0)
        if (!hostOk(address)) return json({ error: 'اكتب عنوان مزوّد SIP مثل sip.provider.com' }, 400)
        if (channels < 1 || channels > 500) return json({ error: 'عدد القنوات من 1 إلى 500' }, 400)
        const make = (withTransport: boolean) => nabrah('/sip-outbound', key, { method: 'POST', body: JSON.stringify({ name, numbers: phone, address, max_channels: channels, auth_username: username, auth_password: password, pbx_type: 'lk', ...(withTransport ? { transport } : {}) }) })
        try { created = await make(true) } catch (e) { if (e instanceof ApiError && e.status === 422) created = await make(false); else throw e }
        row = { ...row, address, max_channels: channels }
      }
      const nabrahId = String(created?.id ?? '')
      const { data: saved, error: saveErr } = await db.from('voice_services').insert({ ...row, nabrah_id: nabrahId }).select('id').single()
      if (saveErr) { await nabrah(`/sip-${direction}/${nabrahId}`, key, { method: 'DELETE' }).catch(() => null); return json({ error: 'تعذّر حفظ الخدمة' }, 500) }
      if (direction === 'inbound') {
        const want = wantAgents(body?.agent_ids)
        if (want.length) { await setInboundAgents(nabrahId, want); await db.from('voice_services').update({ agent_ids: want }).eq('id', saved.id) }
      }
      return json({ ok: true, id: saved.id })
    }

    const { data: row } = await db.from('voice_services').select('id, direction, nabrah_id').eq('company_id', companyId).eq('id', String(body?.id ?? '')).maybeSingle()
    if (!row) return json({ error: 'not found' }, 404)

    if (op === 'set_agents') {
      if (row.direction !== 'inbound' || !row.nabrah_id) return json({ error: 'الخدمة هذي ما تقبل ربط وكلاء' }, 400)
      const want = wantAgents(body?.agent_ids)
      await setInboundAgents(row.nabrah_id, want)
      await db.from('voice_services').update({ agent_ids: want }).eq('id', row.id)
      return json({ ok: true })
    }

    if (op === 'delete') {
      if (row.nabrah_id) {
        if (row.direction === 'inbound') for (const l of await inboundLinks(row.nabrah_id)) await nabrah(`/agent-inbound-link/${l.link_id}`, key, { method: 'DELETE' }).catch(() => null)
        await nabrah(`/sip-${row.direction}/${row.nabrah_id}`, key, { method: 'DELETE' }).catch((e) => { if (!(e instanceof ApiError && e.status === 404)) throw e })
      }
      await db.from('voice_services').delete().eq('id', row.id)
      return json({ ok: true })
    }
    return json({ error: 'unknown op' }, 400)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'failed' }, 502)
  }
})
