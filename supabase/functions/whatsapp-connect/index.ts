// Lets a company owner connect its own WhatsApp number from the dashboard.
//   POST { action: 'connect', name, phone_number, phone_number_id, waba_id, access_token, auto_assign? }
//        -> checks the number and token against Meta, creates the number's inbox on the voice platform,
//           then stores the token and inbox id. Returns { inbox_id, webhook? } (callback values when the platform gives them).
//   POST { action: 'assign', agent_id }   -> the company's agent answers on its number
//   POST { action: 'disconnect' }         -> removes the stored token and inbox link (the platform inbox stays, and is
//                                            picked up again when the same number is connected)
// The token is checked with Meta before it is saved and is never returned to the browser. Only the company
// owner can use it: a team member (a row in company_users) is refused.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GRAPH = 'https://graph.facebook.com/v21.0'
const API = 'https://api.nabrah.ai/api/ext'
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

/** Webhook values the platform may keep in an inbox's config, whatever they are called there. */
function webhookOf(config: unknown): { callback_url: string | null; verify_token: string | null } | null {
  if (!config || typeof config !== 'object') return null
  let callback_url: string | null = null
  let verify_token: string | null = null
  for (const [k, v] of Object.entries(config as Record<string, unknown>)) {
    if (typeof v !== 'string' || !v) continue
    if (/callback|webhook_url/i.test(k)) callback_url = v
    else if (/verify/i.test(k)) verify_token = v
  }
  return callback_url || verify_token ? { callback_url, verify_token } : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const key = Deno.env.get('NABRAH_API_KEY')?.trim()
  if (!url || !serviceKey || !anonKey || !key) return json({ error: 'server misconfigured' }, 500)
  const nabrah = (path: string, init: RequestInit = {}) =>
    fetch(`${API}${path}`, { ...init, headers: { 'X-API-Key': key, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(20_000) })

  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  })
  const { data: companyId } = await asUser.rpc('get_my_clinic_company_id')
  const { data: u } = await asUser.auth.getUser()
  if (!companyId || !u?.user) return json({ error: 'unauthorized' }, 401)

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: staff } = await db.from('company_users').select('company_id').eq('auth_user_id', u.user.id).maybeSingle()
  if (staff) return json({ error: 'owner_only', message: 'الربط مع ميتا لصاحب الحساب فقط.' }, 403)

  const body = await req.json().catch(() => null) as Record<string, unknown> | null

  if (body?.action === 'disconnect') {
    const { error } = await db.from('whatsapp_cloud_accounts').delete().eq('company_id', companyId)
    if (error) return json({ error: 'failed', message: 'تعذّر فصل الربط.' }, 500)
    return json({ ok: true })
  }

  if (body?.action === 'assign') {
    const agentId = String(body.agent_id ?? '')
    const { data: acc } = await db.from('whatsapp_cloud_accounts').select('nabrah_inbox_id').eq('company_id', companyId).maybeSingle()
    if (!acc?.nabrah_inbox_id) return json({ error: 'not_connected', message: 'اربط رقم الواتساب أول.' }, 409)
    const { data: link } = await db.from('agent_links').select('label').eq('provider', 'nabrah').eq('agent_id', agentId).eq('company_id', companyId).maybeSingle()
    if (!link) return json({ error: 'bad_agent', message: 'الوكيل مو تابع لحسابك.' }, 404)
    const res = await nabrah('/omni_v2/whatsapp/assign_chatbot', { method: 'POST', body: JSON.stringify({ agent_id: agentId, inbox_id: acc.nabrah_inbox_id, name: link.label || 'الوكيل', can_refer_to_human: true }) })
    if (!res.ok) return json({ error: 'failed', message: res.status === 409 ? 'فيه تغيير ثاني ينحفظ الحين، جرّب بعد لحظات.' : 'تعذّر ربط الوكيل بالرقم.' }, 502)
    return json({ ok: true })
  }

  if (body?.action === 'connect') {
    const token = String(body.access_token ?? '').trim()
    const waba = String(body.waba_id ?? '').trim()
    const phoneId = String(body.phone_number_id ?? '').trim()
    const name = String(body.name ?? '').trim().slice(0, 80)
    const phone = String(body.phone_number ?? '').replace(/[\s-]/g, '')
    if (!name) return json({ error: 'bad_name', message: 'اكتب اسم الصندوق.' }, 400)
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) return json({ error: 'bad_phone', message: 'اكتب الرقم بالصيغة الدولية: + ثم رمز الدولة ثم الرقم، بدون صفر في البداية.' }, 400)
    if (!/^\d{8,25}$/.test(phoneId)) return json({ error: 'bad_phone_id', message: 'معرّف رقم الهاتف أرقام فقط.' }, 400)
    if (!/^\d{8,25}$/.test(waba)) return json({ error: 'bad_waba', message: 'معرّف حساب واتساب للأعمال أرقام فقط (8 خانات أو أكثر).' }, 400)
    if (token.length < 40 || /\s/.test(token)) return json({ error: 'bad_token', message: 'مفتاح الوصول غير صحيح. انسخه كامل بدون مسافات.' }, 400)

    const auth = { Authorization: `Bearer ${token}` }
    const acct = await fetch(`${GRAPH}/${waba}?fields=name`, { headers: auth, signal: AbortSignal.timeout(15_000) }).catch(() => null)
    if (!acct?.ok) return json({ error: 'meta_rejected', message: 'ميتا رفضت المفتاح مع هذا المعرّف. تأكد إن المفتاح دائم وإن حساب الأعمال هو نفسه صاحب المعرّف.' }, 400)
    const num = await fetch(`${GRAPH}/${phoneId}?fields=display_phone_number`, { headers: auth, signal: AbortSignal.timeout(15_000) }).catch(() => null)
    if (!num?.ok) return json({ error: 'meta_phone', message: 'ميتا ما لقت معرّف رقم الهاتف بهذا المفتاح. انسخه من صفحة «إرسال رسالة» في تطبيق ميتا.' }, 400)
    // Creating templates needs the management permission; messaging alone does not, so this is reported, not required.
    const tpl = await fetch(`${GRAPH}/${waba}/message_templates?limit=1`, { headers: auth, signal: AbortSignal.timeout(15_000) }).catch(() => null)

    // Create the number's inbox; when it already exists (connected before), pick it up unless another company holds it.
    let inbox: Record<string, unknown> | null = null
    const created = await nabrah('/omni_v2/whatsapp/inboxes', { method: 'POST', body: JSON.stringify({ name, phone_number: phone, phone_number_id: phoneId, business_account_id: waba, api_key: token, enable_auto_assignment: body.auto_assign !== false }) })
    if (created.ok) inbox = await created.json().catch(() => null)
    else if (created.status === 409) {
      const list = await nabrah('/omni_v2/whatsapp/inboxes')
      const items = list.ok ? ((await list.json().catch(() => ({})))?.inboxes ?? []) as Record<string, unknown>[] : []
      const found = items.find((i) => { const c = JSON.stringify(i.config ?? {}); return c.includes(phoneId) || c.includes(phone.slice(1)) })
      if (!found) return json({ error: 'limit', message: 'ما قدرنا نضيف رقم جديد. تواصل مع فريق مدار.' }, 409)
      const { data: holder } = await db.from('whatsapp_cloud_accounts').select('company_id').eq('nabrah_inbox_id', String(found.id)).maybeSingle()
      if (holder && holder.company_id !== companyId) return json({ error: 'taken', message: 'هذا الرقم مربوط بحساب ثاني.' }, 409)
      inbox = found
    } else return json({ error: 'platform', message: 'ما قدرنا ننشئ صندوق الواتساب الحين. تأكد من البيانات وجرّب مرة ثانية.' }, 502)
    const inboxId = String(inbox?.id ?? '')
    if (!inboxId) return json({ error: 'platform', message: 'ما قدرنا ننشئ صندوق الواتساب الحين.' }, 502)

    const { error } = await db.from('whatsapp_cloud_accounts').upsert({
      company_id: companyId, access_token: token, waba_id: waba, phone_number_id: phoneId, phone_number: phone,
      inbox_name: name, nabrah_inbox_id: inboxId, updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id' })
    if (error) return json({ error: 'failed', message: 'تعذّر حفظ الربط.' }, 500)

    // The webhook values usually appear once the inbox is provisioned, so read the inbox back once.
    let webhook = webhookOf(inbox?.config)
    if (!webhook) {
      const full = await nabrah(`/omni_v2/whatsapp/inboxes/${inboxId}`)
      if (full.ok) webhook = webhookOf((await full.json().catch(() => ({})))?.config)
    }
    return json({ ok: true, inbox_id: inboxId, webhook, can_manage_templates: !!tpl?.ok })
  }

  return json({ error: 'bad request' }, 400)
})
