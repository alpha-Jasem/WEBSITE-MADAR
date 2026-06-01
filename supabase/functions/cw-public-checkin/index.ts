import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Company = {
  id: string
  name: string
  business_type: string | null
  industry: string | null
  status: 'active' | 'suspended' | 'trial'
  plan: 'starter' | 'growth' | 'enterprise'
  plan_reset_at: string | null
  tax_enabled: boolean | null
  vat_rate: number | null
  price_includes_vat: boolean | null
  cw_automations: Record<string, any> | null
}

type Service = {
  id: string
  name: string
  price: number
}

const OTP_TTL_MINUTES = 5
const OTP_VERIFICATION_TTL_MINUTES = 60
const OTP_MAX_PER_HOUR = 5
const OTP_MAX_ATTEMPTS = 5
const DEFAULT_OTP_WEBHOOK = 'https://keepcalm.app.n8n.cloud/webhook/cw-send-otp'
const TWILIO_VERIFY_BASE_URL = 'https://verify.twilio.com/v2'

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

function calcVAT(price: number, taxEnabled: boolean, vatRate: number, priceIncludesVAT: boolean) {
  if (!taxEnabled) return { subtotal: price, vat_amount: 0, total_amount: price }
  if (priceIncludesVAT) {
    const subtotal = price / (1 + vatRate / 100)
    return { subtotal, vat_amount: price - subtotal, total_amount: price }
  }
  const vat_amount = (price * vatRate) / 100
  return { subtotal: price, vat_amount, total_amount: price + vat_amount }
}

function ticketCode(items: { id: string; created_at: string }[], itemId: string) {
  const ordered = [...items].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const index = ordered.findIndex(item => item.id === itemId)
  return `A-${String((index >= 0 ? index : 0) + 1).padStart(3, '0')}`
}

function addMinutes(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString()
}

function generateOtp() {
  return String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, '0')
}

function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}

async function otpHash(companyId: string, phone: string, code: string) {
  const secret = Deno.env.get('OTP_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'madar-otp'
  return sha256(`${companyId}:${phone}:${code}:${secret}`)
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
  if (!config) return null

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

async function verifyOtpViaTwilio(phone: string, code: string) {
  const config = twilioConfig()
  if (!config) return null

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
  if (response.ok) return { ok: false, provider: 'twilio_verify', status: body.status || 'pending', body }
  return { ok: false, provider: 'twilio_verify', status: response.status, body }
}

async function sendOtpViaWhatsApp(phone: string, code: string, company: Company) {
  const n8nUrl = Deno.env.get('N8N_OTP_WEBHOOK_URL') || DEFAULT_OTP_WEBHOOK
  const metaToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN') || Deno.env.get('META_WHATSAPP_ACCESS_TOKEN')
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || Deno.env.get('META_WHATSAPP_PHONE_NUMBER_ID')
  const message = `\u0631\u0645\u0632 \u0627\u0644\u062a\u062d\u0642\u0642 \u0644\u0645\u0646\u0635\u0629 \u0645\u062f\u0627\u0631: ${code}\n\u0635\u0627\u0644\u062d \u0644\u0645\u062f\u0629 ${OTP_TTL_MINUTES} \u062f\u0642\u0627\u0626\u0642.\n${company.name}`

  if (metaToken && phoneNumberId) {
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${metaToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { preview_url: false, body: message },
      }),
    })
    if (response.ok) return { ok: true, provider: 'meta' }
    return { ok: false, provider: 'meta', status: response.status, body: await response.text().catch(() => '') }
  }

  const response = await fetch(n8nUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone,
      otp: code,
      message,
      company_id: company.id,
      company_name: company.name,
      expires_in_minutes: OTP_TTL_MINUTES,
    }),
  })
  if (response.ok) return { ok: true, provider: 'n8n' }
  return { ok: false, provider: 'n8n', status: response.status, body: await response.text().catch(() => '') }
}

async function hasVerifiedOtp(supabase: ReturnType<typeof createClient>, companyId: string, phone: string, token: string) {
  if (!token) return false
  const { data } = await supabase
    .from('cw_phone_otps')
    .select('id')
    .eq('company_id', companyId)
    .eq('phone', phone)
    .eq('verification_token', token)
    .not('verified_at', 'is', null)
    .gt('verification_expires_at', new Date().toISOString())
    .order('verified_at', { ascending: false })
    .limit(1)
  return Boolean(data?.length)
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

  const token = String(payload.token || '').trim()
  const action = String(payload.action || 'checkin').trim()
  const requestedCustomerName = String(payload.customer_name || '').trim()
  const phone = normalizePhone(String(payload.phone || ''))
  const carType = String(payload.car_type || '').trim()
  const plate = String(payload.plate || '').trim()
  const serviceId = String(payload.service_id || '').trim()
  const serviceIds = Array.isArray(payload.service_ids)
    ? payload.service_ids.map((id: unknown) => String(id || '').trim()).filter(Boolean)
    : serviceId ? [serviceId] : []
  const otp = String(payload.otp || '').replace(/\D/g, '').slice(0, 4)
  const verificationToken = String(payload.verification_token || '').trim()

  if (!token || !phone) {
    return json({ error: 'missing_required_fields' }, 400)
  }

  const { data: companies, error: companyError } = await supabase
    .rpc('get_public_checkin_company', { checkin_token: token })

  if (companyError) return json({ error: 'company_lookup_failed' }, 500)
  const company = (companies?.[0] || null) as Company | null

  if (!company) return json({ error: 'invalid_checkin_token' }, 404)
  if (company.status === 'suspended') return json({ error: 'company_suspended' }, 403)
  if (company.status === 'trial' && company.plan_reset_at && new Date(company.plan_reset_at).getTime() < Date.now()) {
    return json({ error: 'trial_expired' }, 403)
  }
  if (company.business_type !== 'car_wash' && company.industry !== 'car_wash') {
    return json({ error: 'not_car_wash' }, 403)
  }
  if (company.plan === 'starter') return json({ error: 'plan_locked' }, 403)

  const settings = company.cw_automations?.self_checkin || {}
  if (settings.enabled === false) return json({ error: 'self_checkin_disabled' }, 403)

  if (action === 'send_otp') {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: recent } = await supabase
      .from('cw_phone_otps')
      .select('id')
      .eq('company_id', company.id)
      .eq('phone', phone)
      .gte('created_at', hourAgo)

    if ((recent?.length || 0) >= OTP_MAX_PER_HOUR) {
      return json({ error: 'phone_otp_limit' }, 429)
    }

    const twilioResult = await sendOtpViaTwilio(phone)

    if (twilioResult) {
      if (!twilioResult.ok) {
        console.error('otp_send_failed', twilioResult)
        return json({ error: 'otp_send_failed', provider: twilioResult.provider }, 502)
      }

      const { error: otpError } = await supabase.from('cw_phone_otps').insert({
        company_id: company.id,
        phone,
        code_hash: `twilio:${twilioResult.sid || 'verify'}`,
        expires_at: addMinutes(OTP_TTL_MINUTES),
      })

      if (otpError) return json({ error: 'otp_store_failed' }, 500)
      return json({ sent: true, provider: twilioResult.provider, expires_in_seconds: OTP_TTL_MINUTES * 60 })
    }

    const code = generateOtp()
    const codeHash = await otpHash(company.id, phone, code)
    const sendResult = await sendOtpViaWhatsApp(phone, code, company)

    if (!sendResult.ok) {
      console.error('otp_send_failed', sendResult)
      return json({ error: 'otp_send_failed', provider: sendResult.provider }, 502)
    }

    const { error: otpError } = await supabase.from('cw_phone_otps').insert({
      company_id: company.id,
      phone,
      code_hash: codeHash,
      expires_at: addMinutes(OTP_TTL_MINUTES),
    })

    if (otpError) return json({ error: 'otp_store_failed' }, 500)
    return json({ sent: true, expires_in_seconds: OTP_TTL_MINUTES * 60 })
  }

  if (action === 'verify_otp') {
    if (otp.length !== 4) return json({ error: 'otp_invalid' }, 400)

    const { data: rows } = await supabase
      .from('cw_phone_otps')
      .select('id, code_hash, attempts, expires_at')
      .eq('company_id', company.id)
      .eq('phone', phone)
      .is('verified_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    const row = rows?.[0]
    if (!row) return json({ error: 'otp_not_found' }, 404)
    if ((row.attempts || 0) >= OTP_MAX_ATTEMPTS) return json({ error: 'otp_expired' }, 410)

    if (String(row.code_hash || '').startsWith('twilio:')) {
      const twilioCheck = await verifyOtpViaTwilio(phone, otp)
      if (!twilioCheck) return json({ error: 'otp_provider_not_configured' }, 500)
      if (!twilioCheck.ok) {
        await supabase.from('cw_phone_otps').update({ attempts: (row.attempts || 0) + 1 }).eq('id', row.id)
        return json({ error: 'otp_invalid' }, 400)
      }

      const tokenValue = generateToken()
      await supabase.from('cw_phone_otps').update({
        verified_at: new Date().toISOString(),
        verification_token: tokenValue,
        verification_expires_at: addMinutes(OTP_VERIFICATION_TTL_MINUTES),
      }).eq('id', row.id)

      return json({ verified: true, verification_token: tokenValue })
    }

    const candidateHash = await otpHash(company.id, phone, otp)
    if (candidateHash !== row.code_hash) {
      await supabase.from('cw_phone_otps').update({ attempts: (row.attempts || 0) + 1 }).eq('id', row.id)
      return json({ error: 'otp_invalid' }, 400)
    }

    const tokenValue = generateToken()
    await supabase.from('cw_phone_otps').update({
      verified_at: new Date().toISOString(),
      verification_token: tokenValue,
      verification_expires_at: addMinutes(OTP_VERIFICATION_TTL_MINUTES),
    }).eq('id', row.id)

    return json({ verified: true, verification_token: tokenValue })
  }

  if (!(await hasVerifiedOtp(supabase, company.id, phone, verificationToken))) {
    return json({ error: 'otp_required' }, 401)
  }

  if (action === 'lookup_customer') {
    const { data: customer } = await supabase
      .from('cw_customers')
      .select('id, name, total_visits, free_washes_available, wallet_balance, membership_status')
      .eq('company_id', company.id)
      .eq('phone', phone)
      .maybeSingle()

    let activeMembership = null
    if (customer?.id) {
      const { data: membership } = await supabase
        .from('cw_customer_memberships')
        .select('id, remaining_washes, ends_at, auto_renew, cw_membership_plans(name)')
        .eq('company_id', company.id)
        .eq('customer_id', customer.id)
        .eq('status', 'active')
        .gt('remaining_washes', 0)
        .or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (membership?.id) {
        const plan = Array.isArray(membership.cw_membership_plans)
          ? membership.cw_membership_plans[0]
          : membership.cw_membership_plans
        activeMembership = {
          id: membership.id,
          plan_name: plan?.name || null,
          remaining_washes: membership.remaining_washes || 0,
          ends_at: membership.ends_at || null,
          auto_renew: !!membership.auto_renew,
        }
      }
    }

    return json({
      customer: customer ? { ...customer, active_membership: activeMembership } : null,
    })
  }

  if (serviceIds.length === 0) {
    return json({ error: 'missing_required_fields' }, 400)
  }

  const approvalRequired = settings.approval_required !== false
  const antiSpamMinutes = Number(settings.anti_spam_minutes || 10)
  const spamWindow = new Date(Date.now() - antiSpamMinutes * 60 * 1000).toISOString()

  const { data: duplicate } = await supabase
    .from('cw_queue')
    .select('id')
    .eq('company_id', company.id)
    .eq('phone', phone)
    .gte('created_at', spamWindow)
    .neq('status', 'cancelled')
    .limit(1)

  if (duplicate && duplicate.length > 0) {
    return json({ error: 'duplicate_recent_checkin', anti_spam_minutes: antiSpamMinutes }, 409)
  }

  const uniqueServiceIds = [...new Set(serviceIds)]
  const { data: selectedServices, error: serviceError } = await supabase
    .from('cw_services')
    .select('id, name, price')
    .eq('company_id', company.id)
    .in('id', uniqueServiceIds)
    .eq('active', true)
    .order('created_at')

  if (serviceError || !selectedServices || selectedServices.length !== uniqueServiceIds.length) {
    return json({ error: 'invalid_service' }, 400)
  }
  const orderedServices = uniqueServiceIds
    .map(id => (selectedServices as Service[]).find(service => service.id === id))
    .filter(Boolean) as Service[]
  const selectedService = orderedServices[0]
  const serviceName = orderedServices.map(service => service.name).join(' + ')
  const servicePrice = orderedServices.reduce((sum, service) => sum + Number(service.price || 0), 0)
  const vat = calcVAT(
    servicePrice,
    !!company.tax_enabled,
    Number(company.vat_rate || 15),
    company.price_includes_vat !== false,
  )

  const { data: existingCustomer } = await supabase
    .from('cw_customers')
    .select('id')
    .eq('company_id', company.id)
    .eq('phone', phone)
    .maybeSingle()

  const customerName = requestedCustomerName || `\u0639\u0645\u064a\u0644 ${phone.slice(-4)}`

  if (existingCustomer?.id) {
    await supabase.from('cw_customers').update({ name: customerName }).eq('id', existingCustomer.id)
  } else {
    await supabase.from('cw_customers').insert({
      company_id: company.id,
      phone,
      name: customerName,
      total_visits: 0,
      welcome_sent: true,
    })
  }

  const notes = approvalRequired
    ? '[self_checkin_qr] [self_checkin_pending]'
    : '[self_checkin_qr]'

  const { data: inserted, error: insertError } = await supabase
    .from('cw_queue')
    .insert({
      company_id: company.id,
      customer_name: customerName,
      phone,
      car_type: carType || null,
      plate: plate || null,
      service_id: selectedService.id,
      service_name: serviceName,
      price: servicePrice,
      subtotal: vat.subtotal,
      vat_amount: vat.vat_amount,
      total_amount: vat.total_amount,
      status: 'received',
      payment_status: 'unpaid',
      notes,
    })
    .select('id, created_at')
    .single()

  if (insertError || !inserted) return json({ error: 'queue_insert_failed' }, 500)

  const todayStart = new Date(inserted.created_at)
  todayStart.setHours(0, 0, 0, 0)
  const { data: queueItems } = await supabase
    .from('cw_queue')
    .select('id, created_at')
    .eq('company_id', company.id)
    .gte('created_at', todayStart.toISOString())
    .neq('status', 'cancelled')
    .order('created_at', { ascending: true })

  const code = ticketCode(queueItems || [], inserted.id)

  return json({
    queue_id: inserted.id,
    ticket_code: code,
    approval_pending: approvalRequired,
    status_url: `/status/${token}/${inserted.id}`,
  })
})
