import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const TWILIO_VERIFY_BASE_URL = 'https://verify.twilio.com/v2'
const TRIAL_DAYS = 3

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizePhone(value: string) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('966')) return digits
  if (digits.startsWith('05') && digits.length === 10) return `966${digits.slice(1)}`
  if (digits.startsWith('5') && digits.length === 9) return `966${digits}`
  return digits
}

function validSaudiMobile(phone: string) {
  return /^9665\d{8}$/.test(phone)
}

function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

function trialEndsAt() {
  return new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
}

function twilioConfig() {
  const apiKeySid = Deno.env.get('TWILIO_API_KEY_SID') || Deno.env.get('TWILIO_ACCOUNT_SID') || ''
  const apiKeySecret = Deno.env.get('TWILIO_API_KEY_SECRET') || Deno.env.get('TWILIO_AUTH_TOKEN') || ''
  const serviceSid = Deno.env.get('TWILIO_VERIFY_SERVICE_SID') || ''
  const channel = (Deno.env.get('TWILIO_VERIFY_CHANNEL') || 'sms').toLowerCase()

  if (!apiKeySid || !apiKeySecret || !serviceSid) return null
  return {
    apiKeySid,
    apiKeySecret,
    serviceSid,
    channel: channel === 'whatsapp' ? 'whatsapp' : 'sms',
  }
}

function twilioAuthHeader(apiKeySid: string, apiKeySecret: string) {
  return `Basic ${btoa(`${apiKeySid}:${apiKeySecret}`)}`
}

async function sendOtpViaTwilio(phone: string) {
  const config = twilioConfig()
  if (!config) return { ok: false, error: 'twilio_not_configured' }

  const response = await fetch(`${TWILIO_VERIFY_BASE_URL}/Services/${config.serviceSid}/Verifications`, {
    method: 'POST',
    headers: {
      'Authorization': twilioAuthHeader(config.apiKeySid, config.apiKeySecret),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: `+${phone}`,
      Channel: config.channel,
    }),
  })

  const body = await response.json().catch(() => ({}))
  if (response.ok) return { ok: true, provider: `twilio_${config.channel}`, sid: body.sid as string | undefined }
  return { ok: false, error: 'twilio_send_failed', status: response.status, body }
}

async function verifyOtpViaTwilio(phone: string, code: string) {
  const config = twilioConfig()
  if (!config) return { ok: false, error: 'twilio_not_configured' }

  const response = await fetch(`${TWILIO_VERIFY_BASE_URL}/Services/${config.serviceSid}/VerificationCheck`, {
    method: 'POST',
    headers: {
      'Authorization': twilioAuthHeader(config.apiKeySid, config.apiKeySecret),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: `+${phone}`,
      Code: code,
    }),
  })

  const body = await response.json().catch(() => ({}))
  if (response.ok && body.status === 'approved') return { ok: true, provider: 'twilio_verify' }
  if (response.ok) return { ok: false, error: 'otp_not_approved', status: body.status || 'pending', body }
  return { ok: false, error: 'twilio_verify_failed', status: response.status, body }
}

function defaultFeatureFlags() {
  return {
    self_checkin: true,
    live_status: true,
    quick_queue: true,
    finance: true,
    reports: true,
    workers: true,
    loyalty: true,
    cash_pos: true,
    wallet: false,
    memberships: false,
    online_payments: false,
    branches: false,
    ai_promos: false,
  }
}

function resolveBusinessType(value: unknown) {
  const raw = String(value || '').trim().toLowerCase()
  if (raw === 'clinic' || raw === 'medical' || raw === 'dental') {
    return { businessType: 'clinic', industry: 'clinic', messageLimit: 10000, monthlyTarget: 0 }
  }
  return { businessType: 'car_wash', industry: 'car_wash', messageLimit: 10000, monthlyTarget: 20000 }
}

function defaultCarWashServices(companyId: string) {
  return [
    { company_id: companyId, name: 'غسيل خارجي سريع', price: 25, duration_minutes: 15, active: true },
    { company_id: companyId, name: 'غسيل داخلي وخارجي', price: 45, duration_minutes: 25, active: true },
    { company_id: companyId, name: 'غسيل بخار كامل', price: 85, duration_minutes: 45, active: true },
  ]
}

async function findExistingCompany(supabase: ReturnType<typeof createClient>, email: string, phone: string) {
  const [{ data: byEmail }, { data: byPhone }] = await Promise.all([
    supabase.from('companies').select('id').eq('owner_email', email).limit(1).maybeSingle(),
    supabase.from('companies').select('id').eq('owner_phone', phone).limit(1).maybeSingle(),
  ])
  return byEmail || byPhone || null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRole) return json({ error: 'missing_server_config' }, 500)

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let payload: Record<string, any>
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const action = String(payload.action || '').trim()
  const phone = normalizePhone(String(payload.phone || ''))
  const email = String(payload.email || '').trim().toLowerCase()

  if (!validSaudiMobile(phone)) return json({ error: 'invalid_saudi_phone' }, 400)

  if (action === 'create_email_signup') {
    const companyName = String(payload.company_name || '').trim()
    const ownerName = String(payload.owner_name || '').trim()
    const city = String(payload.city || '').trim()
    const password = String(payload.password || '')
    const signupType = resolveBusinessType(payload.business_type)

    if (!email.includes('@') || !companyName || !ownerName || password.length < 8) {
      return json({ error: 'missing_required_fields' }, 400)
    }

    const existingCompany = await findExistingCompany(supabase, email, phone)
    if (existingCompany) return json({ error: 'company_already_exists' }, 409)

    const { data: existingAuth } = await supabase.auth.admin.listUsers()
    const alreadyRegistered = existingAuth?.users?.some(user => user.email?.toLowerCase() === email)
    if (alreadyRegistered) return json({ error: 'email_already_registered' }, 409)

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        full_name: ownerName,
        company_name: companyName,
        signup_source: 'trial',
        confirmation_channel: 'email',
      },
    })

    if (authError || !authData.user) {
      return json({ error: 'auth_user_create_failed', message: authError?.message }, 400)
    }

    const authUserId = authData.user.id
    const features = defaultFeatureFlags()
    const automations = {
      feature_flags: features,
      self_checkin: { enabled: true, otp_required: true },
      onboarding: {
        status: 'trial_started',
        source: 'self_service',
        trial_days: TRIAL_DAYS,
        city,
        confirmation_channel: 'email',
      },
    }

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: companyName,
        industry: signupType.industry,
        business_type: signupType.businessType,
        plan: 'growth',
        status: 'trial',
        owner_name: ownerName,
        owner_email: email,
        owner_phone: phone,
        auth_user_id: authUserId,
        message_limit: signupType.messageLimit,
        messages_used: 0,
        plan_reset_at: trialEndsAt(),
        public_checkin_token: generateToken(),
        tax_enabled: true,
        vat_rate: 15,
        price_includes_vat: true,
        cw_loyalty_threshold: 5,
        cw_automations: automations,
        cw_monthly_target: signupType.monthlyTarget,
      })
      .select('*')
      .single()

    if (companyError || !company) {
      await supabase.auth.admin.deleteUser(authUserId)
      return json({ error: 'company_create_failed', message: companyError?.message }, 400)
    }

    await Promise.all([
      supabase.from('users').insert({
        id: authUserId,
        email,
        full_name: ownerName,
        role: 'client',
      }),
      signupType.businessType === 'car_wash'
        ? supabase.from('cw_services').insert(defaultCarWashServices(company.id))
        : Promise.resolve({ data: null, error: null }),
      supabase.from('logs').insert({
        company_id: company.id,
        level: 'success',
        event: 'trial_signup_email_created',
        message: 'Self-service trial account created with email confirmation',
        meta: { email, phone, company_name: companyName, trial_days: TRIAL_DAYS },
      }),
    ])

    return json({
      ok: true,
      company_id: company.id,
      trial_days: TRIAL_DAYS,
      plan: 'growth',
      requires_email_confirmation: true,
      redirect_to: '/login?portal=client',
    })
  }

  if (action === 'send_otp') {
    if (!email.includes('@')) return json({ error: 'invalid_email' }, 400)

    const existingCompany = await findExistingCompany(supabase, email, phone)

    if (existingCompany) return json({ error: 'company_already_exists' }, 409)

    const { data: existingAuth } = await supabase.auth.admin.listUsers()
    const alreadyRegistered = existingAuth?.users?.some(user => user.email?.toLowerCase() === email)
    if (alreadyRegistered) return json({ error: 'email_already_registered' }, 409)

    const sent = await sendOtpViaTwilio(phone)
    if (!sent.ok) return json({ error: sent.error || 'otp_send_failed', details: sent }, 502)

    await supabase.from('logs').insert({
      level: 'info',
      event: 'trial_signup_otp_sent',
      message: 'Trial signup OTP sent',
      meta: { phone, email, provider: sent.provider, sid: sent.sid },
    })

    return json({ ok: true, expires_in_minutes: 10, provider: sent.provider })
  }

  if (action === 'verify_signup') {
    const code = String(payload.otp || '').replace(/\D/g, '').slice(0, 8)
    const companyName = String(payload.company_name || '').trim()
    const ownerName = String(payload.owner_name || '').trim()
    const city = String(payload.city || '').trim()
    const password = String(payload.password || '')

    if (!email.includes('@') || !companyName || !ownerName || password.length < 8) {
      return json({ error: 'missing_required_fields' }, 400)
    }
    if (code.length < 4) return json({ error: 'invalid_otp' }, 400)

    const signupType = resolveBusinessType(payload.business_type)
    const verified = await verifyOtpViaTwilio(phone, code)
    if (!verified.ok) return json({ error: verified.error || 'otp_failed', details: verified }, 401)

    const existingCompany = await findExistingCompany(supabase, email, phone)

    if (existingCompany) return json({ error: 'company_already_exists' }, 409)

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: ownerName,
        company_name: companyName,
        signup_source: 'trial',
      },
    })

    if (authError || !authData.user) {
      return json({ error: 'auth_user_create_failed', message: authError?.message }, 400)
    }

    const authUserId = authData.user.id
    const features = defaultFeatureFlags()
    const automations = {
      feature_flags: features,
      self_checkin: { enabled: true, otp_required: true },
      onboarding: {
        status: 'trial_started',
        source: 'self_service',
        trial_days: TRIAL_DAYS,
        city,
      },
    }

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: companyName,
        industry: signupType.industry,
        business_type: signupType.businessType,
        plan: 'growth',
        status: 'trial',
        owner_name: ownerName,
        owner_email: email,
        owner_phone: phone,
        auth_user_id: authUserId,
        message_limit: signupType.messageLimit,
        messages_used: 0,
        plan_reset_at: trialEndsAt(),
        public_checkin_token: generateToken(),
        tax_enabled: true,
        vat_rate: 15,
        price_includes_vat: true,
        cw_loyalty_threshold: 5,
        cw_automations: automations,
        cw_monthly_target: signupType.monthlyTarget,
      })
      .select('*')
      .single()

    if (companyError || !company) {
      await supabase.auth.admin.deleteUser(authUserId)
      return json({ error: 'company_create_failed', message: companyError?.message }, 400)
    }

    await Promise.all([
      supabase.from('users').insert({
        id: authUserId,
        email,
        full_name: ownerName,
        role: 'client',
      }),
      signupType.businessType === 'car_wash'
        ? supabase.from('cw_services').insert(defaultCarWashServices(company.id))
        : Promise.resolve({ data: null, error: null }),
      supabase.from('logs').insert({
        company_id: company.id,
        level: 'success',
        event: 'trial_signup_created',
        message: 'Self-service trial account created',
        meta: { email, phone, company_name: companyName, trial_days: TRIAL_DAYS },
      }),
    ])

    return json({
      ok: true,
      company_id: company.id,
      trial_days: TRIAL_DAYS,
      plan: 'growth',
      redirect_to: '/client?welcome=trial',
    })
  }

  return json({ error: 'unknown_action' }, 400)
})
