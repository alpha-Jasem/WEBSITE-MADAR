// Public endpoint behind the lead forms companies put on their websites (public/forms/embed.js).
//   GET  ?id=<form id>                          -> the form's public settings (active forms only)
//   POST { form_id, values: {key: text}, page_url, website }
//        `website` is a hidden field people never see; anything in it means a bot, and we quietly accept.
// A submission is saved, added to the company's customers (if the number is new), and fires the
// form.submitted automation so a rule can send the customer a WhatsApp template within seconds.
// Abuse limits: 5 submissions per visitor per 10 minutes, and 200 per form per hour.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', ...extra } })

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface Field { key: string; label: string; type: string; required?: boolean }

/** Saudi mobile in 05xxxxxxxx form, or null. */
function saudiMobile(raw: string): string | null {
  let d = String(raw || '').replace(/[٠-٩]/g, (c) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('966')) d = '0' + d.slice(3)
  else if (d.length === 9 && d.startsWith('5')) d = '0' + d
  return /^05\d{8}$/.test(d) ? d : null
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const cols = 'id, company_id, name, kind, title, subtitle, fields, button_text, success_text, settings, active'

  if (req.method === 'GET') {
    const id = new URL(req.url).searchParams.get('id') || ''
    if (!UUID.test(id)) return json({ error: 'not found' }, 404)
    const { data } = await db.from('lead_forms').select(cols).eq('id', id).eq('active', true).maybeSingle()
    if (!data) return json({ error: 'not found' }, 404)
    const { company_id: _c, active: _a, name: _n, ...pub } = data
    return json(pub, 200, { 'Cache-Control': 'public, max-age=60' })
  }
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return json({ error: 'bad request' }, 400)
  const formId = String(body.form_id || '')
  if (!UUID.test(formId)) return json({ error: 'not found' }, 404)
  if (body.website) return json({ ok: true })

  const { data: form } = await db.from('lead_forms').select(cols + ', submit_count').eq('id', formId).eq('active', true).maybeSingle()
  if (!form) return json({ error: 'not found' }, 404)

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
  const ipHash = await sha256(`${ip}:${formId}`)
  const since10 = new Date(Date.now() - 10 * 60_000).toISOString()
  const since60 = new Date(Date.now() - 60 * 60_000).toISOString()
  const [{ count: mine }, { count: all }] = await Promise.all([
    db.from('lead_form_submissions').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', since10),
    db.from('lead_form_submissions').select('id', { count: 'exact', head: true }).eq('form_id', formId).gte('created_at', since60),
  ])
  if ((mine || 0) >= 5 || (all || 0) >= 200) return json({ error: 'كثرت المحاولات، جرّب بعد شوي' }, 429)

  const fields = (Array.isArray(form.fields) ? form.fields : []) as Field[]
  const raw = (body.values && typeof body.values === 'object' ? body.values : {}) as Record<string, unknown>
  const values: Record<string, string> = {}
  for (const f of fields) {
    const v = String(raw[f.key] ?? '').trim().slice(0, f.type === 'textarea' ? 1000 : 120)
    if (f.required && !v) return json({ error: `«${f.label}» مطلوب` }, 400)
    if (v) values[f.key] = v
  }
  const phoneField = fields.find((f) => f.type === 'phone')
  let phone: string | null = null
  if (phoneField && values[phoneField.key]) {
    phone = saudiMobile(values[phoneField.key])
    if (!phone) return json({ error: 'اكتب رقم جوال سعودي صحيح يبدأ بـ 05' }, 400)
    values[phoneField.key] = phone
  }
  const emailField = fields.find((f) => f.type === 'email')
  const email = emailField ? values[emailField.key] || null : null
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'البريد غير صحيح' }, 400)
  const name = values.name || values[fields.find((f) => f.type === 'text')?.key || ''] || null
  const pageUrl = typeof body.page_url === 'string' ? body.page_url.slice(0, 500) : null

  const { error } = await db.from('lead_form_submissions').insert({
    form_id: form.id, company_id: form.company_id, name, phone, email, data: values, page_url: pageUrl, ip_hash: ipHash,
  })
  if (error) return json({ error: 'تعذّر الإرسال، جرّب مرة ثانية' }, 500)
  await db.from('lead_forms').update({ submit_count: ((form.submit_count as number) || 0) + 1 }).eq('id', form.id)

  // New number -> new customer (fires the customer.created automation too).
  if (phone) {
    const { data: existing } = await db.from('clinic_os_patients').select('id').eq('company_id', form.company_id).in('phone', [phone, `966${phone.slice(1)}`, `+966${phone.slice(1)}`]).limit(1)
    if (!existing?.length) {
      await db.from('clinic_os_patients').insert({ company_id: form.company_id, name: name || 'عميل من النموذج', phone, notes: `من نموذج «${form.name}»${pageUrl ? ` · ${pageUrl}` : ''}` })
    }
  }

  const summary = fields.filter((f) => values[f.key] && f.type !== 'phone' && f.key !== 'name').map((f) => `${f.label}: ${values[f.key]}`).join(' · ')
  await db.rpc('queue_connect_event', {
    p_company: form.company_id, p_event: 'form.submitted',
    p_payload: { form: { id: form.id, name: form.name }, customer: { name, phone, email }, fields: values, summary, page_url: pageUrl },
  })

  return json({ ok: true, message: form.success_text })
})
