// Dashboard helper for the Kapso connection: status, webhook registration and the first-message template. Admin only.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { KAPSO_PLATFORM, kapsoKey, loadSettings } from '../_shared/wa.ts'

const META = 'https://api.kapso.ai/meta/whatsapp/v24.0'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
const kapso = async (url: string, init: RequestInit = {}) => {
  const res = await fetch(url, { ...init, headers: { 'X-API-Key': kapsoKey(), 'Content-Type': 'application/json', ...(init.headers || {}) } })
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) as any }
}

const TEMPLATE_BODY = 'السلام عليكم {{business_name}}،\n{{message}}\n\nإذا ما يناسبك ردّ بكلمة «إيقاف» وما نتواصل معك مرة ثانية.'

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  const { data: u } = await service.auth.getUser(token)
  if (!u.user) return json({ error: 'invalid_auth' }, 401)
  const { data: profile } = await service.from('users').select('role').eq('id', u.user.id).maybeSingle()
  if (profile?.role !== 'admin') return json({ error: 'forbidden' }, 403)
  if (!kapsoKey()) return json({ error: 'kapso_not_configured' }, 200)

  const body = await req.json().catch(() => ({})) as Record<string, any>
  const s = await loadSettings(service)
  const pnid = s.phone_number_id
  if (!pnid) return json({ error: 'no_phone_number_id' }, 200)
  const hook = `${Deno.env.get('SUPABASE_URL')}/functions/v1/kapso-webhook`

  const numbers = await kapso(`${KAPSO_PLATFORM}/whatsapp/phone_numbers`)
  if (!numbers.ok) return json({ error: 'kapso_auth_failed', status: numbers.status }, 200)
  const num = (numbers.data?.data ?? []).find((n: any) => String(n.phone_number_id) === String(pnid))
  if (!num) return json({ error: 'number_not_found' }, 200)
  const waba = num.business_account_id

  const webhooks = async () => (await kapso(`${KAPSO_PLATFORM}/whatsapp/phone_numbers/${pnid}/webhooks`)).data?.data ?? []
  const template = async () => {
    const r = await kapso(`${META}/${waba}/message_templates?name=${encodeURIComponent(s.template_name)}`)
    const t = (r.data?.data ?? []).find((x: any) => x.name === s.template_name && x.language === s.template_lang) ?? (r.data?.data ?? [])[0]
    return t ? { name: t.name, status: t.status, category: t.category, language: t.language, reason: t.rejected_reason } : null
  }

  if (body.action === 'register_webhook') {
    const existing = (await webhooks()).find((w: any) => w.url === hook)
    if (existing) return json({ ok: true, existing: true })
    const r = await kapso(`${KAPSO_PLATFORM}/whatsapp/phone_numbers/${pnid}/webhooks`, {
      method: 'POST',
      body: JSON.stringify({ whatsapp_webhook: { url: hook, secret_key: Deno.env.get('KAPSO_WEBHOOK_SECRET'), kind: 'kapso', events: ['whatsapp.message.received'], active: true } }),
    })
    return json({ ok: r.ok, status: r.status, error: r.ok ? undefined : String(r.data?.error?.message ?? r.data?.error ?? 'failed').slice(0, 200) })
  }

  if (body.action === 'create_template') {
    const r = await kapso(`${META}/${waba}/message_templates`, {
      method: 'POST',
      body: JSON.stringify({
        name: s.template_name, category: 'MARKETING', language: s.template_lang, parameter_format: 'NAMED',
        components: [{
          type: 'BODY', text: TEMPLATE_BODY,
          example: { body_text_named_params: [{ param_name: 'business_name', example: 'عيادة الأمل' }, { param_name: 'message', example: 'أنا عبدالله من مدار، نبني وكلاء ذكاء اصطناعي يردون على عملائكم على واتساب ويحجزون المواعيد ٢٤ ساعة. وش أكثر شي يتعبكم في الرد على الرسائل؟' }] },
        }],
      }),
    })
    return json({ ok: r.ok, status: r.status, template: r.data, error: r.ok ? undefined : String(r.data?.error?.message ?? r.data?.error ?? 'failed').slice(0, 300) })
  }

  // default: status
  const [hooks, tpl] = await Promise.all([webhooks(), template()])
  const mine = hooks.find((w: any) => w.url === hook)
  return json({
    ok: true,
    number: { id: num.phone_number_id, name: num.name, status: num.status, quality: num.quality_rating, display: num.display_phone_number ?? null },
    webhook: { registered: !!mine, active: mine?.active ?? false },
    template: tpl,
    template_name: s.template_name,
  })
})
