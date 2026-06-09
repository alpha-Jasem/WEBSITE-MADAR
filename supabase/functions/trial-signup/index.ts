import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const { action } = body

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // ── create_company: called after email OTP verified, user is already logged in ──
    if (action === 'create_company') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) return json({ error: 'unauthorized' }, 401)

      const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(
        authHeader.replace('Bearer ', ''),
      )
      if (userErr || !user) return json({ error: 'unauthorized' }, 401)

      const { company_name, owner_name, city, phone, email, business_type } = body
      const btype = business_type === 'clinic' ? 'clinic' : 'car_wash'

      if (!company_name?.trim() || !owner_name?.trim() || !email?.trim()) {
        return json({ error: 'missing_required_fields' }, 400)
      }

      // check duplicate
      const { data: existing } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('owner_email', email.trim().toLowerCase())
        .maybeSingle()

      if (existing) return json({ error: 'email_already_registered' }, 409)

      const trialEnds = new Date()
      trialEnds.setDate(trialEnds.getDate() + 3)

      // create company
      const { data: company, error: companyErr } = await supabaseAdmin
        .from('companies')
        .insert({
          name: company_name.trim(),
          owner_name: owner_name.trim(),
          owner_email: email.trim().toLowerCase(),
          owner_phone: phone?.trim() || '',
          city: city?.trim() || '',
          industry: btype,
          business_type: btype,
          plan: 'growth',
          status: 'trial',
          package_type: btype === 'clinic' ? 'whatsapp' : null,
          auth_user_id: user.id,
          trial_ends_at: trialEnds.toISOString(),
          monthly_messages: 0,
          monthly_leads: 0,
          automations_count: 0,
          message_limit: 500,
          messages_used: 0,
        })
        .select('id')
        .single()

      if (companyErr) {
        console.error('company insert error:', companyErr)
        return json({ error: 'company_create_failed' }, 500)
      }

      // create user profile
      await supabaseAdmin.from('users').upsert({
        id: user.id,
        email: email.trim().toLowerCase(),
        full_name: owner_name.trim(),
        role: 'client',
        company_id: company.id,
        phone: phone?.trim() || '',
      })

      const redirectTo = btype === 'clinic' ? '/clinic-os/dashboard' : '/client?welcome=trial'
      return json({ success: true, company_id: company.id, redirect_to: redirectTo })
    }

    return json({ error: 'unknown_action' }, 400)
  } catch (err) {
    console.error('trial-signup error:', err)
    return json({ error: 'internal_error' }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
