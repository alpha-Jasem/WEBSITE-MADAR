// Submits a company's WhatsApp template to Meta for approval, and reads back the approval status.
//   POST { action: 'submit', template_id }  -> creates the template in Meta (category MARKETING), status PENDING
//   POST { action: 'sync' }                 -> reads every template of the company's WhatsApp Business Account from Meta
//                                              and updates the status of the registered ones (matched by name + language)
// The company comes from the signed-in user's session. The Meta token and business account id are the ones stored
// in whatsapp_cloud_accounts (service role only), never sent to the browser.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GRAPH = 'https://graph.facebook.com/v21.0'
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const metaError = (out: any) => String(out?.error?.error_user_msg || out?.error?.message || 'رفضت ميتا الطلب').slice(0, 300)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

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

  const body = await req.json().catch(() => null) as { action?: string; template_id?: string } | null
  const db = createClient(url, serviceKey, { auth: { persistSession: false } })

  const { data: acc } = await db.from('whatsapp_cloud_accounts').select('access_token, waba_id').eq('company_id', companyId).maybeSingle()
  if (!acc?.access_token) return json({ error: 'not_connected', message: 'حساب واتساب للأعمال غير مربوط بعد. اربطه أول عشان نرفع القالب لميتا.' }, 409)
  if (!acc.waba_id) return json({ error: 'no_waba', message: 'ناقص معرّف حساب واتساب للأعمال (WABA). أضفه وجرّب مرة ثانية.' }, 409)
  const auth = { Authorization: `Bearer ${acc.access_token}` }

  if (body?.action === 'sync') {
    const res = await fetch(`${GRAPH}/${acc.waba_id}/message_templates?fields=name,language,status,rejected_reason&limit=200`, { headers: auth, signal: AbortSignal.timeout(15_000) }).catch(() => null)
    const out = await res?.json().catch(() => null)
    if (!res?.ok) return json({ error: 'meta_failed', message: metaError(out) }, 502)
    const remote = (out?.data ?? []) as { name: string; language: string; status: string; rejected_reason?: string }[]
    const { data: mine } = await db.from('whatsapp_templates').select('id, name, language').eq('company_id', companyId)
    let updated = 0
    for (const t of mine ?? []) {
      const r = remote.find((x) => x.name === t.name && x.language === t.language)
      if (!r) continue
      await db.from('whatsapp_templates').update({
        meta_status: r.status, meta_error: r.rejected_reason && r.rejected_reason !== 'NONE' ? r.rejected_reason : null, meta_synced_at: new Date().toISOString(),
      }).eq('id', t.id).eq('company_id', companyId)
      updated++
    }
    return json({ ok: true, updated })
  }

  if (body?.action === 'submit' && body.template_id) {
    const { data: tpl } = await db.from('whatsapp_templates').select('*').eq('id', body.template_id).eq('company_id', companyId).maybeSingle()
    if (!tpl) return json({ error: 'template not found' }, 404)
    if (!/^[a-z0-9_]{1,200}$/.test(tpl.name)) return json({ error: 'bad_name', message: 'اسم القالب لازم حروف إنجليزية صغيرة وأرقام وشرطة سفلية فقط.' }, 400)
    if (String(tpl.body).length > 1024) return json({ error: 'too_long', message: 'نص القالب أطول من 1024 حرف.' }, 400)
    const params = (tpl.param_labels ?? []) as string[]
    const component: Record<string, unknown> = { type: 'BODY', text: tpl.body }
    if (params.length) component.example = { body_text: [params.map((l) => l || 'مثال')] }
    const res = await fetch(`${GRAPH}/${acc.waba_id}/message_templates`, {
      method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: tpl.name, language: tpl.language, category: 'MARKETING', components: [component] }),
      signal: AbortSignal.timeout(15_000),
    }).catch(() => null)
    const out = await res?.json().catch(() => null)
    if (!res?.ok) {
      const message = metaError(out)
      await db.from('whatsapp_templates').update({ meta_error: message, meta_synced_at: new Date().toISOString() }).eq('id', tpl.id)
      return json({ error: 'meta_failed', message }, 502)
    }
    await db.from('whatsapp_templates').update({
      meta_template_id: out?.id ?? null, meta_status: out?.status ?? 'PENDING', meta_error: null, meta_synced_at: new Date().toISOString(),
    }).eq('id', tpl.id)
    return json({ ok: true, status: out?.status ?? 'PENDING' })
  }

  return json({ error: 'bad request' }, 400)
})
