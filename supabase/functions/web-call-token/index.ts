// Starts a browser call between a website visitor and the company's voice agent (the web-call widget).
//   GET  ?key=[&page=1]  ->  { name, config, direct_link }  the widget's public look (call.js, call.html)
//   POST { key, page? }  ->  { token, url } for the LiveKit client
// key = a widget's public key (site_widget_items, or the older site_widgets row). A chat widget with voice on also works.
// The agent is the one the owner picked in the dashboard, and it must be linked to that company.
// When the owner listed allowed websites, the page's Origin must be one of them. A few calls per
// visitor every ten minutes, so a copied snippet cannot run up the company's usage.
// Deploy with --no-verify-jwt: visitors have no session.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

async function sha256(text: string) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))
  return Array.from(d).map((b) => b.toString(16).padStart(2, '0')).join('')
}
const origin = (u: string) => { try { return new URL(u.trim()).origin } catch { return '' } }

const SELF = 'https://madar.software'
const UUID = /^[0-9a-f-]{36}$/i

interface Target { company_id: string; agent_id: string; origins: string[]; direct_link: boolean; selfOk?: boolean; name: string; config: Record<string, unknown> | null }

// A widget by key: the new items first, then the older one-row-per-company settings.
async function find(db: ReturnType<typeof createClient>, key: string): Promise<Target | null> {
  const { data: it } = await db.from('site_widget_items').select('company_id, kind, name, enabled, agent_id, allowed_origins, direct_link, config').eq('public_key', key).maybeSingle()
  if (it) {
    if (!it.enabled) return null
    const cfg = (it.config ?? {}) as Record<string, unknown>
    if (it.kind === 'call') return { company_id: it.company_id, agent_id: it.agent_id || '', origins: it.allowed_origins ?? [], direct_link: !!it.direct_link, name: it.name, config: cfg }
    if (cfg.voice === true) return { company_id: it.company_id, agent_id: String(cfg.voiceAgentId || ''), origins: it.allowed_origins ?? [], direct_link: false, selfOk: true, name: it.name, config: cfg }
    return null
  }
  const { data: w } = await db.from('site_widgets').select('company_id, call_enabled, call_agent_id, call_allowed_origins, call_label, color, position').eq('public_key', key).maybeSingle()
  if (!w?.call_enabled || !w.call_agent_id) return null
  const corner = w.position === 'left' ? 'bl' : 'br'
  return { company_id: w.company_id, agent_id: w.call_agent_id, origins: w.call_allowed_origins ?? [], direct_link: false, name: '', config: { color: w.color, position: corner, label: w.call_label, panel: { brand: w.color } } }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'GET' && req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) return json({ error: 'server misconfigured' }, 500)
  const db = createClient(url, serviceKey, { auth: { persistSession: false } })

  if (req.method === 'GET') {
    const q = new URL(req.url).searchParams
    const key = q.get('key') ?? ''
    if (!UUID.test(key)) return json({ error: 'not found' }, 404)
    const w = await find(db, key)
    if (!w || !w.agent_id) return json({ error: 'not found' }, 404)
    if (q.get('page') === '1' && !w.direct_link) return json({ error: 'not found' }, 404)
    return json({ name: w.name, config: w.config, direct_link: w.direct_link }, 200)
  }

  const apiKey = Deno.env.get('NABRAH_API_KEY')?.trim()
  if (!apiKey) return json({ error: 'server misconfigured' }, 500)

  const body = await req.json().catch(() => ({}))
  const key = String(body?.key ?? '')
  if (!UUID.test(key)) return json({ error: 'not found' }, 404)

  const w = await find(db, key)
  if (!w || !w.agent_id) return json({ error: 'not found' }, 404)
  if (body?.page === true && !w.direct_link) return json({ error: 'not found' }, 404)

  const allowed = w.origins.map(origin).filter(Boolean)
  const from = origin(req.headers.get('origin') ?? '')
  // The direct-link page and the chat widget's frame both run on madar.software; the chat sends the address of the page that holds it.
  const viaDirectPage = w.direct_link && from === SELF
  const viaChat = w.selfOk && from === SELF
  const where = viaChat ? origin(String(body?.page_url ?? '')) : from
  if (allowed.length && !viaDirectPage && !allowed.includes(where)) return json({ error: 'origin not allowed' }, 403)

  const { data: link } = await db.from('agent_links').select('agent_id').eq('company_id', w.company_id).eq('provider', 'nabrah').eq('agent_id', w.agent_id).maybeSingle()
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
      body: JSON.stringify({ agent_id: w.agent_id }),
    })
    const out = await res.json().catch(() => ({}))
    if (!res.ok || !out?.token || !out?.url) return json({ error: 'could not start call' }, 502)
    return json({ token: out.token, url: out.url })
  } catch {
    return json({ error: 'could not start call' }, 502)
  }
})
