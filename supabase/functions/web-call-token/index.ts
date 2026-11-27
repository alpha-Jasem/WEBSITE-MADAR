// Starts a browser call between a website visitor and the company's voice agent (the web-call widget).
//   POST { key }  (public; key = the company's site widget public key)  ->  { token, url } for the LiveKit client
// The agent is the one the owner picked in the dashboard, and it must be linked to that company.
// When the owner listed allowed websites, the page's Origin must be one of them. A few calls per
// visitor every ten minutes, so a copied snippet cannot run up the company's usage.
// Deploy with --no-verify-jwt: visitors have no session.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

async function sha256(text: string) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))
  return Array.from(d).map((b) => b.toString(16).padStart(2, '0')).join('')
}
const origin = (u: string) => { try { return new URL(u.trim()).origin } catch { return '' } }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const apiKey = Deno.env.get('NABRAH_API_KEY')?.trim()
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!apiKey || !url || !serviceKey) return json({ error: 'server misconfigured' }, 500)

  const body = await req.json().catch(() => ({}))
  const key = String(body?.key ?? '')
  if (!/^[0-9a-f-]{36}$/i.test(key)) return json({ error: 'not found' }, 404)

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: w } = await db.from('site_widgets').select('company_id, call_enabled, call_agent_id, call_allowed_origins').eq('public_key', key).maybeSingle()
  if (!w?.call_enabled || !w.call_agent_id) return json({ error: 'not found' }, 404)

  const allowed = ((w.call_allowed_origins ?? []) as string[]).map(origin).filter(Boolean)
  if (allowed.length && !allowed.includes(origin(req.headers.get('origin') ?? ''))) return json({ error: 'origin not allowed' }, 403)

  const { data: link } = await db.from('agent_links').select('agent_id').eq('company_id', w.company_id).eq('provider', 'nabrah').eq('agent_id', w.call_agent_id).maybeSingle()
  if (!link) return json({ error: 'not found' }, 404)

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
  const ipHash = await sha256(`call:${ip}:${w.company_id}`)
  const tenMin = new Date(Date.now() - 10 * 60_000).toISOString()
  const { count } = await db.from('site_chat_hits').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', tenMin)
  if ((count ?? 0) >= 4) return json({ error: 'too many calls' }, 429)
  await db.from('site_chat_hits').insert({ company_id: w.company_id, ip_hash: ipHash })

  try {
    const res = await fetch('https://api.nabrah.ai/api/ext/web/make-web-call', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: w.call_agent_id }),
    })
    const out = await res.json().catch(() => ({}))
    if (!res.ok || !out?.token || !out?.url) return json({ error: 'could not start call' }, 502)
    return json({ token: out.token, url: out.url })
  } catch {
    return json({ error: 'could not start call' }, 502)
  }
})
