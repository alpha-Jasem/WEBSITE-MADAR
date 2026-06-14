import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const TWILIO_VERIFY_BASE_URL = 'https://verify.twilio.com/v2'
const OTP_SMS_COST_SAR = 0.9

type Company = {
  id: string
  name: string
  public_checkin_token?: string | null
  webhook_token?: string | null
}

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
  if (digits.startsWith('0')) return `966${digits.slice(1)}`
  return `966${digits}`
}

function twilioConfig() {
  const apiKeySid = Deno.env.get('TWILIO_API_KEY_SID') || Deno.env.get('TWILIO_ACCOUNT_SID') || ''
  const apiKeySecret = Deno.env.get('TWILIO_API_KEY_SECRET') || Deno.env.get('TWILIO_AUTH_TOKEN') || ''
  const serviceSid = Deno.env.get('TWILIO_VERIFY_SERVICE_SID') || ''
  const channel = (Deno.env.get('TWILIO_VERIFY_CHANNEL') || 'sms').toLowerCase()
  if (!apiKeySid || !apiKeySecret || !serviceSid) return null
  return { apiKeySid, apiKeySecret, serviceSid, channel: channel === 'whatsapp' ? 'whatsapp' : 'sms' }
}

function twilioAuthHeader(apiKeySid: string, apiKeySecret: string) {
  return `Basic ${btoa(`${apiKeySid}:${apiKeySecret}`)}`
}

async function sendTwilioOtp(phone: string) {
  const config = twilioConfig()
  if (!config) return { ok: false, provider: 'twilio', error: 'missing_twilio_config' }

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
  return { ok: false, provider: `twilio_${config.channel}`, status: response.status, body }
}

function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

function startOfMonth() {
  const date = new Date()
  date.setDate(1)
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

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

  const { data: profile } = await service
    .from('users')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') return json({ error: 'forbidden' }, 403)

  let payload: Record<string, any>
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const action = String(payload.action || 'overview')

  if (action === 'clinic_clients') {
    const { data: companies, error } = await service
      .from('companies')
      .select('id, name, owner_name, owner_email, owner_phone, city, status, clinic_plan_code, subscription_status, subscription_start_date, subscription_end_date, monthly_usage_cycle_start, monthly_usage_cycle_end, created_at')
      .or('industry.eq.clinic,business_type.eq.clinic')
      .order('created_at', { ascending: false })

    if (error) return json({ error: 'clinic_clients_failed', details: error.message }, 500)

    const ids = (companies || []).map(company => company.id)
    const [limitsResult, usageResult] = ids.length ? await Promise.all([
      service.from('clinic_os_usage_limits').select('*').in('company_id', ids),
      service.from('clinic_os_usage').select('*').in('company_id', ids).order('cycle_start', { ascending: false }),
    ]) : [{ data: [] }, { data: [] }]

    const limits = new Map((limitsResult.data || []).map(row => [row.company_id, row]))
    const usage = new Map<string, Record<string, unknown>>()
    for (const row of usageResult.data || []) {
      if (!usage.has(row.company_id)) usage.set(row.company_id, row)
    }

    return json({
      clients: (companies || []).map(company => ({
        ...company,
        limits: limits.get(company.id) || null,
        usage: usage.get(company.id) || null,
      })),
    })
  }

  if (action === 'activate_clinic_subscription') {
    const companyId = String(payload.company_id || '')
    const planCode = String(payload.plan_code || '')
    if (!companyId || !['whatsapp', 'ai_pro'].includes(planCode)) {
      return json({ error: 'invalid_activation_request' }, 400)
    }

    const { data, error } = await service.rpc('admin_activate_clinic_subscription', {
      p_company_id: companyId,
      p_plan_code: planCode,
      p_actor_id: userData.user.id,
    })

    if (error) return json({ error: 'activation_failed', details: error.message }, 500)
    return json({ activated: true, subscription: data })
  }

  if (action === 'overview') {
    const today = startOfToday()
    const month = startOfMonth()

    const [otpToday, otpMonth, otpLatest, audit, logs, companies] = await Promise.all([
      service.from('cw_phone_otps').select('id, code_hash, company_id, phone, verified_at, created_at').gte('created_at', today).order('created_at', { ascending: false }).limit(250),
      service.from('cw_phone_otps').select('id, code_hash, company_id, verified_at, created_at').gte('created_at', month).order('created_at', { ascending: false }).limit(2000),
      service.from('cw_phone_otps').select('id, code_hash, company_id, phone, verified_at, attempts, created_at').order('created_at', { ascending: false }).limit(20),
      service.from('cw_audit_logs').select('id, action, entity_type, company_id, created_at').order('created_at', { ascending: false }).limit(30),
      service.from('logs').select('id, level, event, message, company_id, automation_id, created_at').order('created_at', { ascending: false }).limit(30),
      service.from('companies').select('id, name, public_checkin_token, webhook_token').order('created_at', { ascending: false }),
    ])

    const monthRows = otpMonth.data || []
    const todayRows = otpToday.data || []
    const twilioMonth = monthRows.filter(row => String(row.code_hash || '').startsWith('twilio:')).length
    const twilioToday = todayRows.filter(row => String(row.code_hash || '').startsWith('twilio:')).length
    const verifiedMonth = monthRows.filter(row => row.verified_at).length
    const verifiedToday = todayRows.filter(row => row.verified_at).length
    const companyMap = new Map((companies.data || []).map((company: Company) => [company.id, company.name]))

    return json({
      otp: {
        today: todayRows.length,
        month: monthRows.length,
        twilio_today: twilioToday,
        twilio_month: twilioMonth,
        verified_today: verifiedToday,
        verified_month: verifiedMonth,
        estimated_sms_cost_sar: Math.round(twilioMonth * OTP_SMS_COST_SAR * 100) / 100,
        latest: (otpLatest.data || []).map(row => ({
          id: row.id,
          company_id: row.company_id,
          company_name: companyMap.get(row.company_id) || 'شركة غير معروفة',
          phone_tail: String(row.phone || '').slice(-4),
          provider: String(row.code_hash || '').startsWith('twilio:') ? 'Twilio SMS' : 'Legacy',
          status: row.verified_at ? 'verified' : 'sent',
          attempts: row.attempts || 0,
          created_at: row.created_at,
        })),
      },
      audit: audit.data || [],
      logs: logs.data || [],
      twilio_ready: Boolean(twilioConfig()),
    })
  }

  if (action === 'test_otp') {
    const companyId = String(payload.company_id || '')
    const phone = normalizePhone(String(payload.phone || ''))
    if (!companyId || !/^9665\d{8}$/.test(phone)) return json({ error: 'invalid_test_request' }, 400)

    const { data: company } = await service
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .maybeSingle()

    if (!company) return json({ error: 'company_not_found' }, 404)

    const result = await sendTwilioOtp(phone)
    if (!result.ok) return json({ error: 'otp_send_failed', provider: result.provider, details: result }, 502)

    await service.from('cw_phone_otps').insert({
      company_id: companyId,
      phone,
      code_hash: `twilio:admin-test:${result.sid || 'verify'}`,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })

    try {
      await service.from('cw_audit_logs').insert({
        company_id: companyId,
        action: 'admin_test_otp_sent',
        entity_type: 'otp',
        entity_id: phone.slice(-4),
        new_value: { provider: result.provider },
      })
    } catch {
      // Audit logging should never block an operational test.
    }

    return json({ sent: true, provider: result.provider })
  }

  return json({ error: 'unknown_action' }, 400)
})
