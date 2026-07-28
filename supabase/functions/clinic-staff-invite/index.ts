import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const ALLOWED_ROLES = ['manager', 'staff']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRole) return json({ error: 'missing_server_config' }, 500)

  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return json({ error: 'missing_auth' }, 401)

  const service = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const authClient = createClient(supabaseUrl, serviceRole, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await authClient.auth.getUser(token)
  if (userError || !userData.user) return json({ error: 'invalid_auth' }, 401)

  let payload: Record<string, any>
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const companyId = String(payload.company_id || '')
  const email = String(payload.email || '').trim().toLowerCase()
  const fullName = String(payload.full_name || '').trim()
  const role = String(payload.role || 'staff')

  if (!companyId || !email || !fullName) return json({ error: 'missing_fields' }, 400)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'invalid_email' }, 400)
  if (!ALLOWED_ROLES.includes(role)) return json({ error: 'invalid_role' }, 400)

  // Only the clinic owner (companies.auth_user_id) can invite staff into their own company.
  const { data: company } = await service
    .from('companies')
    .select('id, name')
    .eq('id', companyId)
    .eq('auth_user_id', userData.user.id)
    .maybeSingle()

  if (!company) return json({ error: 'forbidden' }, 403)

  const { data: existingStaff } = await service
    .from('company_users')
    .select('id, auth_user_id')
    .eq('company_id', companyId)
    .eq('full_name', fullName)
    .maybeSingle()

  const origin = req.headers.get('origin') || 'https://madar.software'
  const redirectTo = `${origin}/reset-password?portal=clinic-os`

  const { data: invited, error: inviteError } = await service.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { clinic_staff_invite: true, company_id: companyId, full_name: fullName },
  })

  if (inviteError || !invited?.user) {
    return json({ error: 'invite_failed', details: inviteError?.message || 'unknown' }, 502)
  }

  if (existingStaff && !existingStaff.auth_user_id) {
    const { error: updateError } = await service
      .from('company_users')
      .update({ auth_user_id: invited.user.id, role })
      .eq('id', existingStaff.id)
    if (updateError) return json({ error: 'staff_link_failed', details: updateError.message }, 500)
  } else {
    const { error: insertError } = await service
      .from('company_users')
      .insert({ company_id: companyId, auth_user_id: invited.user.id, full_name: fullName, role, permissions: [] })
    if (insertError) return json({ error: 'staff_insert_failed', details: insertError.message }, 500)
  }

  try {
    await service.from('clinic_os_audit_logs').insert({
      company_id: companyId,
      actor_type: 'user',
      actor_id: userData.user.id,
      action: 'staff.invited',
      note: `دعوة موظف: ${fullName} (${email})`,
    })
  } catch {
    // Audit logging should never block the invite.
  }

  return json({ invited: true, auth_user_id: invited.user.id })
})
