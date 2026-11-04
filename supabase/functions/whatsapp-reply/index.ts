// Sends a free-text WhatsApp reply from the dashboard inbox, from the company's own number.
//   POST { phone, text } with the signed-in user's JWT  ->  { ok: true, id } | { error, code? }
// The number is the one assigned to the company's agent on the voice platform; the message goes
// straight to Meta's Cloud API with the company's token (whatsapp_cloud_accounts). Meta only
// accepts free text within 24 hours of the customer's last message; after that use a template
// (whatsapp-outreach).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EL = 'https://api.elevenlabs.io/v1/convai'
const GRAPH = 'https://graph.facebook.com/v21.0'
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
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!apiKey || !url || !serviceKey || !anonKey) return json({ error: 'server misconfigured' }, 500)

  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  })
  const { data: companyId } = await asUser.rpc('get_my_clinic_company_id')
  if (!companyId) return json({ error: 'unauthorized' }, 401)

  const body = await req.json().catch(() => ({}))
  const phone = String(body?.phone ?? '').replace(/\D/g, '')
  const text = String(body?.text ?? '').trim()
  if (phone.length < 8 || !text || text.length > 4096) return json({ error: 'bad request' }, 400)

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: acc } = await db.from('whatsapp_cloud_accounts').select('access_token').eq('company_id', companyId).maybeSingle()
  if (!acc?.access_token) return json({ error: 'not configured', code: 'not_configured' }, 409)

  const { data: link } = await db.from('agent_links').select('agent_id').eq('company_id', companyId).eq('provider', 'elevenlabs').limit(1).maybeSingle()
  if (!link) return json({ error: 'no linked agent', code: 'not_configured' }, 409)
  const accRes = await fetch(`${EL}/whatsapp-accounts`, { headers: { 'xi-api-key': apiKey } })
  const accounts = accRes.ok ? (await accRes.json().catch(() => ({})))?.items ?? [] : []
  const number = accounts.find((a: { assigned_agent_id?: string }) => a.assigned_agent_id === link.agent_id)
  if (!number?.phone_number_id) return json({ error: 'no whatsapp number assigned to the agent', code: 'not_configured' }, 409)

  const res = await fetch(`${GRAPH}/${number.phone_number_id}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${acc.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, type: 'text', text: { body: text } }),
  })
  const out = await res.json().catch(() => ({}))
  if (!res.ok) {
    const code = out?.error?.code
    // 131047: more than 24 hours since the customer's last message.
    if (code === 131047) return json({ error: 'window closed', code: 'window_closed' }, 422)
    if (code === 190) return json({ error: 'token expired', code: 'token' }, 502)
    return json({ error: `${res.status}: ${String(out?.error?.message ?? '').slice(0, 300)}` }, 502)
  }
  return json({ ok: true, id: out?.messages?.[0]?.id ?? null })
})
