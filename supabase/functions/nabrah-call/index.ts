// The two actions on the voice platform that place calls. Everything else is read-only in nabrah-read.
//   POST { op, ...args }  with the signed-in user's JWT. Deploy with JWT verification ON.
//   web_call        { agent_id }     -> { token, url } to talk to the agent from the browser
//   launch_campaign { campaign_id }  -> dials a saved draft campaign once; stores its call ids
// Company users only reach agents linked to their company in agent_links, and a campaign must call from
// one of the company's active outbound services. Admins reach every agent and number.

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
const PHONE = /^\+?[0-9]{8,15}$/
const digits = (s: string) => s.replace(/[^0-9]/g, '')

async function nabrah(path: string, key: string, body: unknown) {
  const res = await fetch(`${API}${path}`, { method: 'POST', headers: { 'X-API-Key': key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const text = await res.text()
  if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 200)}`)
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

  const authHeader = req.headers.get('Authorization') ?? ''
  const asUser = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } })
  const [{ data: companyId }, { data: isAdmin }, { data: userData }] = await Promise.all([
    asUser.rpc('get_my_clinic_company_id'), asUser.rpc('is_admin'), asUser.auth.getUser(),
  ])
  const admin = isAdmin === true
  if (!companyId && !admin) return json({ error: 'unauthorized' }, 401)

  const body = await req.json().catch(() => ({}))
  const op = String(body?.op ?? '')
  const db = createClient(url, serviceKey, { auth: { persistSession: false } })

  async function mayUse(companyOfRow: string | null, agentId: string) {
    if (admin) return true
    const { data } = await db.from('agent_links').select('agent_id').eq('company_id', companyOfRow ?? companyId).eq('provider', 'nabrah').eq('agent_id', agentId).maybeSingle()
    return !!data
  }

  try {
    if (op === 'web_call') {
      const agentId = String(body?.agent_id ?? '')
      if (!ID.test(agentId) || !(await mayUse(null, agentId))) return json({ error: 'not found' }, 404)
      const r = await nabrah('/web/make-web-call', key, { agent_id: agentId, identity: userData?.user?.id ?? undefined })
      return json({ token: r?.token, url: r?.url })
    }

    if (op === 'launch_campaign') {
      const id = String(body?.campaign_id ?? '')
      if (!ID.test(id)) return json({ error: 'not found' }, 404)
      let q = db.from('voice_campaigns').select('*').eq('id', id)
      if (!admin) q = q.eq('company_id', companyId)
      const { data: c } = await q.maybeSingle()
      if (!c) return json({ error: 'not found' }, 404)
      if (c.status !== 'draft') return json({ error: 'already launched' }, 409)
      if (!(await mayUse(c.company_id, c.agent_id))) return json({ error: 'agent not linked' }, 403)
      if (!admin) {
        const { data: lines } = await db.from('voice_services').select('phone').eq('company_id', c.company_id).eq('direction', 'outbound').eq('status', 'active')
        if (!(lines ?? []).some((l: { phone: string }) => digits(l.phone) === digits(c.call_from))) return json({ error: 'number not active' }, 403)
      }
      const numbers = [...new Set((c.numbers as string[]).map((n) => n.trim()).filter((n) => PHONE.test(n)))]
      if (numbers.length === 0 || numbers.length > 100) return json({ error: 'bad numbers' }, 400)

      // Claim the draft first so a double click cannot dial the list twice.
      const tag = `madar_${id.replace(/-/g, '').slice(0, 12)}`
      const { data: claimed } = await db.from('voice_campaigns').update({ status: 'launching', tag }).eq('id', id).eq('status', 'draft').select('id')
      if (!claimed?.length) return json({ error: 'already launched' }, 409)
      try {
        const r = await nabrah('/call/make-call', key, { agent_id: c.agent_id, call_from: c.call_from, call_to: numbers, tags: [tag] })
        const callIds = Array.isArray(r?.call_ids) ? r.call_ids.map(String) : []
        await db.from('voice_campaigns').update({ status: 'launched', call_ids: callIds, launched_at: new Date().toISOString(), error: null }).eq('id', id)
        return json({ launched: callIds.length, tag })
      } catch (e) {
        await db.from('voice_campaigns').update({ status: 'failed', error: e instanceof Error ? e.message : 'failed' }).eq('id', id)
        return json({ error: 'upstream error' }, 502)
      }
    }

    return json({ error: 'unknown op' }, 400)
  } catch (e) {
    return json({ error: 'upstream error', status: e instanceof Error ? e.message.slice(0, 40) : '' }, 502)
  }
})
