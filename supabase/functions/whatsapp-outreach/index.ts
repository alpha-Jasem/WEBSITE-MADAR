// Sends a Meta-approved WhatsApp template to customers through the voice platform's WhatsApp
// number, and logs every send.
//   POST { template_id, recipients: [{ phone, name?, params: string[] }], dry_run?, sent_by? }
//        with the signed-in user's JWT  ->  { results: [{ phone, status, error? }] }
// The company comes from the session. The template must be one the company registered in
// whatsapp_templates (its name must match a template approved in Meta). At most 25 per call.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EL = 'https://api.elevenlabs.io/v1/convai'
const MAX = 25
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

/** 05xxxxxxxx / 5xxxxxxxx / +966… / 00966… -> 9665xxxxxxxx, or null. */
function saudiNumber(raw: string): string | null {
  let d = String(raw || '').replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('0')) d = '966' + d.slice(1)
  else if (d.length === 9 && d.startsWith('5')) d = '966' + d
  return /^9665\d{8}$/.test(d) ? d : null
}

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
  const recipients = Array.isArray(body?.recipients) ? body.recipients : []
  if (!body?.template_id || recipients.length === 0) return json({ error: 'bad request' }, 400)
  if (recipients.length > MAX) return json({ error: `at most ${MAX} recipients per send` }, 400)

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: tpl } = await db.from('whatsapp_templates').select('*')
    .eq('id', body.template_id).eq('company_id', companyId).eq('enabled', true).maybeSingle()
  if (!tpl) return json({ error: 'template not found' }, 404)
  const expected = Array.isArray(tpl.param_labels) ? tpl.param_labels.length : 0

  const { data: link } = await db.from('agent_links').select('agent_id').eq('company_id', companyId).eq('provider', 'elevenlabs').limit(1).maybeSingle()
  if (!link) return json({ error: 'no linked agent' }, 409)
  const accRes = await fetch(`${EL}/whatsapp-accounts`, { headers: { 'xi-api-key': apiKey } })
  const accounts = accRes.ok ? (await accRes.json().catch(() => ({})))?.items ?? [] : []
  const account = accounts.find((a: { assigned_agent_id?: string }) => a.assigned_agent_id === link.agent_id)
  if (!account?.phone_number_id) return json({ error: 'no whatsapp number assigned to the agent' }, 409)

  const prepared = recipients.map((r: { phone?: string; name?: string; params?: unknown }) => {
    const phone = saudiNumber(r.phone || '')
    const params = Array.isArray(r.params) ? r.params.map((p) => String(p ?? '').trim()) : []
    let error: string | null = null
    if (!phone) error = 'رقم غير صحيح'
    else if (params.length !== expected || params.some((p) => !p)) error = 'قيم القالب ناقصة'
    return { phone: phone || String(r.phone || ''), name: (r.name || '').toString().slice(0, 80) || null, params, error }
  })

  if (body.dry_run) {
    return json({ dry_run: true, from: account.phone_number, results: prepared.map((p: { phone: string; error: string | null }) => ({ phone: p.phone, status: p.error ? 'invalid' : 'ready', error: p.error })) })
  }

  const results: { phone: string; status: 'sent' | 'failed'; error?: string }[] = []
  for (const p of prepared) {
    let status: 'sent' | 'failed' = 'failed'
    let error: string | null = p.error
    if (!error) {
      const res = await fetch(`${EL}/whatsapp/outbound-message`, {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsapp_phone_number_id: account.phone_number_id,
          whatsapp_user_id: p.phone,
          template_name: tpl.name,
          template_language_code: tpl.language,
          template_params: p.params.length ? [{ type: 'body', parameters: p.params.map((text: string) => ({ type: 'text', text })) }] : [],
          agent_id: link.agent_id,
        }),
      })
      if (res.ok) status = 'sent'
      else error = `${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`
    }
    await db.from('outreach_messages').insert({
      company_id: companyId, template_name: tpl.name, template_label: tpl.label, language: tpl.language,
      to_phone: p.phone, recipient_name: p.name, params: p.params, status, error,
      sent_by_name: String(body.sent_by || '').slice(0, 80) || null,
    })
    results.push({ phone: p.phone, status, ...(error ? { error } : {}) })
  }
  return json({ results })
})
