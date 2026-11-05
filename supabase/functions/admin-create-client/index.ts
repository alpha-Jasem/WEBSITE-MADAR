import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PLAN_LIMITS: Record<string, number> = { starter: 1000, growth: 4000, enterprise: 10000 }
const PRODUCTS = ['voice_ai', 'quotation']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors })

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Verify caller is admin
  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user: caller } } = await callerClient.auth.getUser()
  if (!caller) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors })

  const { data: callerRow } = await adminClient.from('users').select('role').eq('id', caller.id).single()
  if (callerRow?.role !== 'admin') return new Response(JSON.stringify({ error: 'Forbidden — admins only' }), { status: 403, headers: cors })

  // Parse body
  const { email, password, company_name, business_type, plan, owner_name, owner_phone, products } = await req.json()
  if (!email || !password || !company_name || !plan) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: cors })
  }
  // Optional: which products the company gets (companies.products). Omitted = the column default.
  if (products !== undefined && (!Array.isArray(products) || products.length === 0 || products.some((p: unknown) => !PRODUCTS.includes(p as string)))) {
    return new Response(JSON.stringify({ error: 'Invalid products' }), { status: 400, headers: cors })
  }

  const message_limit = PLAN_LIMITS[plan] ?? 1000

  // Create auth user
  const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authErr) return new Response(JSON.stringify({ error: authErr.message }), { status: 400, headers: cors })

  const authUserId = authData.user.id

  // Create company
  const { data: company, error: companyErr } = await adminClient
    .from('companies')
    .insert({
      name: company_name,
      business_type: business_type || 'other',
      plan,
      status: 'active',
      owner_name: owner_name || '',
      owner_email: email,
      owner_phone: owner_phone || '',
      industry: business_type || 'other',
      message_limit,
      messages_used: 0,
      monthly_messages: 0,
      monthly_leads: 0,
      automations_count: 0,
      auth_user_id: authUserId,
      plan_reset_at: new Date().toISOString(),
      ...(products ? { products } : {}),
    })
    .select()
    .single()

  if (companyErr) {
    await adminClient.auth.admin.deleteUser(authUserId)
    return new Response(JSON.stringify({ error: companyErr.message }), { status: 400, headers: cors })
  }

  // Create user row
  await adminClient.from('users').insert({
    id: authUserId,
    email,
    full_name: owner_name || '',
    role: 'client',
    company_id: company.id,
    phone: owner_phone || '',
    created_at: new Date().toISOString(),
  })

  return new Response(
    JSON.stringify({ success: true, company_id: company.id, auth_user_id: authUserId }),
    { headers: { ...cors, 'Content-Type': 'application/json' } }
  )
})
