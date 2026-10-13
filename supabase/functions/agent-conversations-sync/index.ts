// Pulls conversations the voice platform has but the dashboard does not (a missed webhook,
// or history from before the webhook was attached) and feeds each one through the normal
// agent-call-webhook ingestion, so mapping, tagging and tickets behave exactly like live calls.
//   POST {}  with the signed-in user's JWT  ->  { synced, pending, checked }
// The company comes from the caller's session; only agents in agent_links for it are read.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EL = 'https://api.elevenlabs.io/v1/convai'
const MAX_NEW = 20
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

let lastStatus = 0
async function get(path: string, key: string) {
  const res = await fetch(`${EL}${path}`, { headers: { 'xi-api-key': key } })
  lastStatus = res.status
  return res.ok ? res.json().catch(() => null) : null
}

async function sign(body: string, secret: string) {
  const t = Math.floor(Date.now() / 1000)
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${body}`)))
  return `t=${t},v0=${Array.from(mac).map((b) => b.toString(16).padStart(2, '0')).join('')}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const apiKey = Deno.env.get('ELEVENLABS_API_KEY')?.trim()
  const secret = Deno.env.get('ELEVENLABS_WEBHOOK_SECRET')?.trim()
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!apiKey || !secret || !url || !serviceKey || !anonKey) return json({ error: 'server misconfigured' }, 500)

  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  })
  const { data: companyId } = await asUser.rpc('get_my_clinic_company_id')
  if (!companyId) return json({ error: 'unauthorized' }, 401)

  const body0 = await req.json().catch(() => ({}))
  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: links } = await db.from('agent_links').select('agent_id').eq('company_id', companyId).eq('provider', 'elevenlabs')
  if (!links?.length) return json(body0?.live ? { live: [] } : { synced: 0, pending: 0, checked: 0, reason: 'no_linked_agent' })

  // Live mode: conversations still running on the platform. Nothing is stored; the dashboard shows
  // them as "live" until the platform finishes them and the normal webhook saves them.
  if (body0?.live) {
    const live: unknown[] = []
    for (const { agent_id } of links) {
      const list = await get(`/conversations?agent_id=${encodeURIComponent(agent_id)}&page_size=10`, apiKey)
      for (const c of list?.conversations ?? []) {
        if (!c.conversation_id || c.status === 'done' || c.status === 'failed') continue
        const d = await get(`/conversations/${encodeURIComponent(c.conversation_id)}`, apiKey)
        if (!d) continue
        const wa = d.metadata?.whatsapp
        const phone = wa?.whatsapp_user_id || d.metadata?.phone_call?.external_number || ''
        live.push({
          id: c.conversation_id, status: d.status, started: d.metadata?.start_time_unix_secs ?? c.start_time_unix_secs,
          channel: wa ? 'whatsapp' : d.metadata?.phone_call ? 'phone' : 'web', phone,
          transcript: (d.transcript ?? []).filter((t: { message?: string }) => t.message)
            .map((t: { role: string; message: string; time_in_call_secs?: number }) => ({ role: t.role, text: t.message, secs: t.time_in_call_secs ?? 0 })),
        })
      }
    }
    return json({ live })
  }

  const { data: known } = await db.from('clinic_os_ai_calls').select('external_id').eq('company_id', companyId).eq('provider', 'elevenlabs')
  const have = new Set((known ?? []).map((r: { external_id: string | null }) => r.external_id))

  const missing: string[] = []
  let checked = 0
  for (const { agent_id } of links) {
    let cursor = ''
    for (let page = 0; page < 3; page++) {
      const list = await get(`/conversations?agent_id=${encodeURIComponent(agent_id)}&page_size=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, apiKey)
      for (const c of list?.conversations ?? []) {
        checked += 1
        if (c.conversation_id && !have.has(c.conversation_id) && (!c.status || c.status === 'done' || c.status === 'failed')) missing.push(c.conversation_id)
      }
      if (!list?.has_more || !list?.next_cursor) break
      cursor = list.next_cursor
    }
  }

  let synced = 0
  for (const id of missing.slice(0, MAX_NEW)) {
    const detail = await get(`/conversations/${encodeURIComponent(id)}`, apiKey)
    if (!detail || (detail.status && detail.status !== 'done' && detail.status !== 'failed')) continue
    const body = JSON.stringify({ type: 'post_call_transcription', data: detail })
    const res = await fetch(`${url}/functions/v1/agent-call-webhook?provider=elevenlabs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'elevenlabs-signature': await sign(body, secret) },
      body,
    })
    if (res.ok) synced += 1
  }
  return json({ synced, pending: Math.max(0, missing.length - MAX_NEW), checked, platform_status: lastStatus })
})
