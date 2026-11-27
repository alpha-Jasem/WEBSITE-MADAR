// A voice agent's tool: during a call the customer asks for the details on WhatsApp, and the agent
// calls this function to send them a Meta-approved template from the company's own WhatsApp number.
//   POST { agent_id, phone, template_name, params?: string[], name? }
//        Auth: X-Madar-Secret header (AGENT_TOOL_SECRET). The company is the one linked to agent_id.
//   -> { ok: true } | { ok: false, error }
// The text answer is short on purpose: the agent reads it back to the customer.
// Sends through the voice platform (like whatsapp-outreach), so no Meta token is needed.
// Deploy with --no-verify-jwt: the voice platform cannot send a Supabase JWT.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EL = 'https://api.elevenlabs.io/v1/convai'
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/** 05xxxxxxxx / 5xxxxxxxx / +966… / 00966… -> 9665xxxxxxxx, or null. */
function saudiNumber(raw: string): string | null {
  let d = String(raw || '').replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('0')) d = '966' + d.slice(1)
  else if (d.length === 9 && d.startsWith('5')) d = '966' + d
  return /^9665\d{8}$/.test(d) ? d : null
}

function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405)

  const secret = Deno.env.get('AGENT_TOOL_SECRET')?.trim()
  const apiKey = Deno.env.get('ELEVENLABS_API_KEY')?.trim()
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!secret || !apiKey || !url || !serviceKey) return json({ ok: false, error: 'server misconfigured' }, 500)
  if (!same(req.headers.get('x-madar-secret') ?? '', secret)) return json({ ok: false, error: 'unauthorized' }, 401)

  const body = await req.json().catch(() => ({}))
  const agentId = String(body?.agent_id ?? '').trim()
  const templateName = String(body?.template_name ?? '').trim()
  const phone = saudiNumber(String(body?.phone ?? ''))
  const params = Array.isArray(body?.params) ? body.params.map((p: unknown) => String(p ?? '').trim()) : []
  if (!agentId || !templateName) return json({ ok: false, error: 'bad request' }, 400)
  if (!phone) return json({ ok: false, error: 'رقم الجوال غير صحيح، اطلب من العميل يعيده.' })

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: link } = await db.from('agent_links').select('company_id').eq('provider', 'elevenlabs').eq('agent_id', agentId).maybeSingle()
  if (!link) return json({ ok: false, error: 'agent not linked' }, 404)
  const companyId = link.company_id as string

  const { data: tpl } = await db.from('whatsapp_templates').select('*')
    .eq('company_id', companyId).eq('name', templateName).eq('enabled', true).maybeSingle()
  if (!tpl) return json({ ok: false, error: 'template not found' }, 404)
  const expected = Array.isArray(tpl.param_labels) ? tpl.param_labels.length : 0
  if (params.length !== expected || params.some((p: string) => !p)) return json({ ok: false, error: 'قيم القالب ناقصة' })

  // Never message a number twice in a short time: the agent may retry the tool.
  const since = new Date(Date.now() - 10 * 60_000).toISOString()
  const { data: recent } = await db.from('outreach_messages').select('id').eq('company_id', companyId)
    .eq('to_phone', phone).eq('template_name', tpl.name).eq('status', 'sent').gte('created_at', since).limit(1)
  if (recent?.length) return json({ ok: true, note: 'already sent' })

  const accRes = await fetch(`${EL}/whatsapp-accounts`, { headers: { 'xi-api-key': apiKey } })
  const accounts = accRes.ok ? (await accRes.json().catch(() => ({})))?.items ?? [] : []
  const account = accounts.find((a: { assigned_agent_id?: string }) => a.assigned_agent_id === agentId)
  if (!account?.phone_number_id) return json({ ok: false, error: 'no whatsapp number assigned to the agent' }, 409)

  const res = await fetch(`${EL}/whatsapp/outbound-message`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      whatsapp_phone_number_id: account.phone_number_id,
      whatsapp_user_id: phone,
      template_name: tpl.name,
      template_language_code: tpl.language,
      template_params: params.length ? [{ type: 'body', parameters: params.map((text: string) => ({ type: 'text', text })) }] : [],
      agent_id: agentId,
    }),
  })
  const error = res.ok ? null : `${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`
  await db.from('outreach_messages').insert({
    company_id: companyId, template_name: tpl.name, template_label: tpl.label, language: tpl.language,
    to_phone: phone, recipient_name: String(body?.name ?? '').slice(0, 80) || null, params,
    status: res.ok ? 'sent' : 'failed', error, sent_by_name: 'وكيل الصوت',
  })
  return res.ok ? json({ ok: true }) : json({ ok: false, error: 'تعذّر الإرسال، سيتواصل معك فريقنا.' }, 502)
})
