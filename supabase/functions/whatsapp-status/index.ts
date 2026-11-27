// What the dashboard's WhatsApp page shows: is this company's number connected, and can the inbox reply freely?
//   POST {} with the signed-in user's JWT
//     -> { agent_linked, connected, phone_number?, name?, token_expired?, messaging?, can_reply, agent_id?, agent_name? }
// A number connected from the dashboard is the company's own inbox on the voice platform (nabrah_inbox_id).
// Older companies fall back to the number assigned to their ElevenLabs agent. Never the rest of the workspace.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EL = 'https://api.elevenlabs.io/v1/convai'
const API = 'https://api.nabrah.ai/api/ext'
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const apiKey = Deno.env.get('ELEVENLABS_API_KEY')?.trim()
  const nabrahKey = Deno.env.get('NABRAH_API_KEY')?.trim()
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !serviceKey || !anonKey) return json({ error: 'server misconfigured' }, 500)

  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  })
  const { data: companyId } = await asUser.rpc('get_my_clinic_company_id')
  if (!companyId) return json({ error: 'unauthorized' }, 401)

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  const [{ data: link }, { data: acc }] = await Promise.all([
    db.from('agent_links').select('agent_id').eq('company_id', companyId).eq('provider', 'elevenlabs').limit(1).maybeSingle(),
    db.from('whatsapp_cloud_accounts').select('company_id, nabrah_inbox_id, phone_number, inbox_name').eq('company_id', companyId).maybeSingle(),
  ])
  const can_reply = !!acc

  if (acc?.nabrah_inbox_id && nabrahKey) {
    const r = await fetch(`${API}/omni_v2/whatsapp/inboxes/${encodeURIComponent(acc.nabrah_inbox_id)}`, { headers: { 'X-API-Key': nabrahKey }, signal: AbortSignal.timeout(10_000) }).catch(() => null)
    if (!r?.ok) return json({ agent_linked: false, connected: true, can_reply, phone_number: acc.phone_number, name: acc.inbox_name })
    const inbox = await r.json().catch(() => ({}))
    const gone = inbox?.config?.meta_disconnected === true
    return json({
      agent_linked: !!inbox?.chatbot_agent_id, connected: true, can_reply,
      phone_number: acc.phone_number, name: inbox?.name ?? acc.inbox_name,
      token_expired: gone, messaging: !gone,
      agent_id: inbox?.chatbot_agent_id ?? null, agent_name: inbox?.chatbot_agent_name ?? null,
    })
  }

  if (!link || !apiKey) return json({ agent_linked: false, connected: false, can_reply })

  const res = await fetch(`${EL}/whatsapp-accounts`, { headers: { 'xi-api-key': apiKey }, signal: AbortSignal.timeout(10_000) }).catch(() => null)
  if (!res?.ok) return json({ error: 'تعذّر قراءة حالة واتساب الحين' }, 502)
  const items = ((await res.json().catch(() => ({})))?.items ?? []) as Record<string, unknown>[]
  const mine = items.find((a) => a.assigned_agent_id === link.agent_id)
  if (!mine) return json({ agent_linked: true, connected: false, can_reply })
  return json({
    agent_linked: true, connected: true, can_reply,
    phone_number: mine.phone_number ?? null, name: mine.phone_number_name ?? null,
    token_expired: mine.is_token_expired === true, messaging: mine.enable_messaging !== false,
  })
})
