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

      const { company_name, owner_name, city, phone } = body
      const btype = 'clinic'

      if (!company_name?.trim() || !owner_name?.trim() || !user.email) {
        return json({ error: 'missing_required_fields' }, 400)
      }

      const ownerEmail = (user.email || '').toLowerCase()
      const ok = (companyId: string) => json({ success: true, company_id: companyId, redirect_to: '/clinic-os/dashboard' })

      // already has a company: finishing twice (retry, double tap) must not fail
      const { data: existingByUser } = await supabaseAdmin
        .from('companies').select('id').eq('auth_user_id', user.id).maybeSingle()
      if (existingByUser) return ok(existingByUser.id)

      // a company with this email whose login no longer exists is adopted by the new login
      const { data: existing } = await supabaseAdmin
        .from('companies').select('id, auth_user_id').eq('owner_email', ownerEmail).maybeSingle()
      if (existing) {
        let ownerAlive = false
        if (existing.auth_user_id) {
          const { data: owner } = await supabaseAdmin.auth.admin.getUserById(existing.auth_user_id)
          ownerAlive = Boolean(owner?.user)
        }
        if (ownerAlive) return json({ error: 'email_already_registered' }, 409)
        await supabaseAdmin.from('companies').update({ auth_user_id: user.id }).eq('id', existing.id)
        await supabaseAdmin.from('users').upsert({ id: user.id, email: ownerEmail, full_name: owner_name.trim(), role: 'client' })
        return ok(existing.id)
      }

      const now = new Date()
      const planResetAt = new Date(now)
      planResetAt.setMonth(planResetAt.getMonth() + 1)
      planResetAt.setDate(1)
      planResetAt.setHours(0, 0, 0, 0)

      const trialEndsAt = new Date(now)
      trialEndsAt.setDate(trialEndsAt.getDate() + 3)

      // create company
      const { data: company, error: companyErr } = await supabaseAdmin
        .from('companies')
        .insert({
          name: company_name.trim(),
          owner_name: owner_name.trim(),
          owner_email: ownerEmail,
          owner_phone: phone?.trim() || '',
          city: city?.trim() || '',
          industry: btype,
          business_type: btype,
          plan: 'growth',
          status: 'trial',
          package_type: btype === 'clinic' ? 'whatsapp' : null,
          auth_user_id: user.id,
          plan_reset_at: planResetAt.toISOString(),
          trial_ends_at: trialEndsAt.toISOString(),
          monthly_messages: 0,
          monthly_leads: 0,
          automations_count: 0,
          message_limit: 500,
          messages_used: 0,
          tax_enabled: true,
          vat_rate: 15,
          price_includes_vat: true,
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
        email: ownerEmail,
        full_name: owner_name.trim(),
        role: 'client',
      })

      const redirectTo = btype === 'clinic' ? '/clinic-os/dashboard' : '/client'
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
