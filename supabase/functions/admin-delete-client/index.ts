// Permanently deletes a client: the company (its data goes with it through the foreign keys) and its login.
//   POST { company_id, confirm_name } with an admin's JWT  ->  { success: true } | { error }
// confirm_name must equal the company's name. An admin can not delete their own account, an admin's
// company, or a login that another company still uses.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const callerClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
  const { data: { user: caller } } = await callerClient.auth.getUser()
  if (!caller) return json({ error: 'Unauthorized' }, 401)
  const { data: callerRow } = await db.from('users').select('role').eq('id', caller.id).single()
  if (callerRow?.role !== 'admin') return json({ error: 'Forbidden — admins only' }, 403)

  const { company_id, confirm_name } = await req.json().catch(() => ({}))
  if (!company_id) return json({ error: 'Missing company_id' }, 400)

  const { data: company } = await db.from('companies').select('id, name, auth_user_id').eq('id', company_id).maybeSingle()
  if (!company) return json({ error: 'الشركة غير موجودة' }, 404)
  if (String(confirm_name ?? '').trim() !== String(company.name ?? '').trim()) return json({ error: 'اسم التأكيد غير مطابق' }, 400)

  const owner = company.auth_user_id as string | null
  if (owner === caller.id) return json({ error: 'ما تقدر تحذف حسابك أنت' }, 400)
  if (owner) {
    const { data: ownerRow } = await db.from('users').select('role').eq('id', owner).maybeSingle()
    if (ownerRow?.role === 'admin') return json({ error: 'هذا حساب أدمن ولا يُحذف من هنا' }, 400)
  }

  const { error: delErr } = await db.from('companies').delete().eq('id', company.id)
  if (delErr) return json({ error: `تعذّر حذف الشركة: ${delErr.message}` }, 409)

  // The login goes only if no other company still points at it.
  if (owner) {
    const { count } = await db.from('companies').select('id', { count: 'exact', head: true }).eq('auth_user_id', owner)
    if (!count) {
      await db.from('users').delete().eq('id', owner)
      await db.auth.admin.deleteUser(owner)
    }
  }
  return json({ success: true })
})
