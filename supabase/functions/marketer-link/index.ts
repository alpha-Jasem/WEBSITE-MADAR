// Links an existing account (by email) to a marketer record and gives it the marketer role.
// Admin only. Roles cannot be changed from the browser, so this needs the service role.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  if (!token) return json({ error: 'missing_auth' }, 401)
  const { data: u } = await service.auth.getUser(token)
  if (!u.user) return json({ error: 'invalid_auth' }, 401)
  const { data: me } = await service.from('users').select('role').eq('id', u.user.id).maybeSingle()
  if (me?.role !== 'admin') return json({ error: 'forbidden' }, 403)

  const { marketer_id, email } = await req.json().catch(() => ({}))
  if (!marketer_id || !email) return json({ error: 'marketer_id_and_email_required' }, 400)

  // Find the account by email (page through users; the list is small).
  let target: { id: string } | null = null
  for (let page = 1; page <= 20 && !target; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 })
    if (error) return json({ error: 'lookup_failed' }, 500)
    target = data.users.find(x => (x.email ?? '').toLowerCase() === String(email).toLowerCase()) ?? null
    if (data.users.length < 200) break
  }
  if (!target) return json({ error: 'account_not_found', hint: 'the marketer must sign up first' }, 404)

  const { data: existing } = await service.from('users').select('role').eq('id', target.id).maybeSingle()
  if (existing?.role === 'admin') return json({ error: 'cannot_link_admin_account' }, 409)
  const { error: roleErr } = await service.from('users').upsert({ id: target.id, email, role: 'marketer' }, { onConflict: 'id' })
  if (roleErr) return json({ error: 'role_failed' }, 500)
  const { error: linkErr } = await service.from('marketers').update({ auth_user_id: target.id }).eq('id', marketer_id)
  if (linkErr) return json({ error: 'link_failed' }, 500)
  await service.from('audit_events').insert({ actor_id: u.user.id, action: 'marketer_linked', entity_type: 'marketer', entity_id: marketer_id, after: { account: target.id } })
  return json({ ok: true })
})
