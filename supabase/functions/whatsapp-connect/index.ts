// Lets a company owner connect its own Meta WhatsApp Business account from the dashboard.
//   POST { action: 'connect', access_token, waba_id }  -> checks the pair against Meta, then stores it
//   POST { action: 'disconnect' }                      -> removes the stored pair
// The token is checked with Meta before it is saved and is never returned to the browser. Only the company
// owner can use it: a team member (a row in company_users) is refused.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !serviceKey || !anonKey) return json({ error: 'server misconfigured' }, 500)

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

  const body = await req.json().catch(() => null) as { action?: string; access_token?: string; waba_id?: string } | null

  if (body?.action === 'disconnect') {
    const { error } = await db.from('whatsapp_cloud_accounts').delete().eq('company_id', companyId)
    if (error) return json({ error: 'failed', message: 'تعذّر فصل الربط.' }, 500)
    return json({ ok: true })
  }

  if (body?.action === 'connect') {
    const token = String(body.access_token ?? '').trim()
    const waba = String(body.waba_id ?? '').trim()
    if (!/^\d{8,25}$/.test(waba)) return json({ error: 'bad_waba', message: 'معرّف حساب واتساب للأعمال أرقام فقط (8 خانات أو أكثر).' }, 400)
    if (token.length < 40 || /\s/.test(token)) return json({ error: 'bad_token', message: 'مفتاح الوصول غير صحيح. انسخه كامل بدون مسافات.' }, 400)

    const auth = { Authorization: `Bearer ${token}` }
    const acct = await fetch(`${GRAPH}/${waba}?fields=name`, { headers: auth, signal: AbortSignal.timeout(15_000) }).catch(() => null)
    const acctOut = await acct?.json().catch(() => null)
    if (!acct?.ok) return json({ error: 'meta_rejected', message: 'ميتا رفضت المفتاح مع هذا المعرّف. تأكد إن المفتاح دائم وإن حساب الأعمال هو نفسه صاحب المعرّف.' }, 400)

    // Creating templates needs the management permission; messaging alone does not, so this is reported, not required.
    const tpl = await fetch(`${GRAPH}/${waba}/message_templates?limit=1`, { headers: auth, signal: AbortSignal.timeout(15_000) }).catch(() => null)

    const { error } = await db.from('whatsapp_cloud_accounts').upsert(
      { company_id: companyId, access_token: token, waba_id: waba, updated_at: new Date().toISOString() }, { onConflict: 'company_id' })
    if (error) return json({ error: 'failed', message: 'تعذّر حفظ الربط.' }, 500)
    return json({ ok: true, account_name: acctOut?.name ?? null, can_manage_templates: !!tpl?.ok })
  }

  return json({ error: 'bad request' }, 400)
})
