import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const ALLOWED_ORIGINS = [
  'https://madar.software',
  'https://www.madar.software',
  'https://madar-os.netlify.app',
]

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

type Company = {
  id: string; name: string; business_type: string | null; industry: string | null
  status: 'active' | 'suspended' | 'trial'; plan: 'starter' | 'growth' | 'enterprise'
  tax_enabled: boolean | null; vat_rate: number | null; price_includes_vat: boolean | null
  cw_automations: Record<string, any> | null
}
type Service = { id: string; name: string; price: number }

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
function generateOTP() { return String(Math.floor(1000 + Math.random() * 9000)) }
function getIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') || 'unknown'
}

// Send WhatsApp directly using _madar_config credentials — no n8n needed
async function sendWhatsAppDirect(
  supabase: ReturnType<typeof createClient>,
  phone: string,
  message: string
): Promise<void> {
  const { data: configs } = await supabase
    .from('_madar_config')
    .select('key, value')
    .in('key', ['whatsapp_phone_id', 'whatsapp_token'])
  const phoneId = (configs as any[])?.find((c: any) => c.key === 'whatsapp_phone_id')?.value
  const waToken = (configs as any[])?.find((c: any) => c.key === 'whatsapp_token')?.value
  if (!phoneId || !waToken) return
  fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${waToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { body: message },
    }),
  }).catch(() => undefined)
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
  const origin = req.headers.get('origin')
  const json = makeReply(origin)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRole) return json({ error: 'missing_server_config' }, 500)

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let payload: Record<string, any>
  try { payload = await req.json() } catch { return json({ error: 'invalid_json' }, 400) }

  const ipAddress = getIP(req)
  const token = String(payload.token || '').trim()
  const action = String(payload.action || 'checkin').trim()
  const phone  = normalizePhone(String(payload.phone || ''))
  const verificationToken = String(payload.verification_token || '').trim()

  async function validateToken(expectedPhone: string): Promise<{ ok: boolean; error?: string; otpId?: string }> {
    if (!verificationToken) return { ok: false, error: 'verification_required' }
    const { data: otp } = await supabase
      .from('cw_otps').select('id, phone, verified, used, expires_at')
      .eq('id', verificationToken).maybeSingle()
    if (!otp || !otp.verified || otp.used) return { ok: false, error: 'verification_required' }
    if (new Date(otp.expires_at) < new Date()) return { ok: false, error: 'verification_expired' }
    if (otp.phone !== expectedPhone) return { ok: false, error: 'phone_mismatch' }
    return { ok: true, otpId: otp.id }
  }

  async function getCompany(): Promise<Company | null> {
    const { data } = await supabase.rpc('get_public_checkin_company', { checkin_token: token })
    return (data?.[0] || null) as Company | null
  }

  // ══ SEND OTP ════════════════════════════════════════════════════════════════
  if (action === 'send_otp') {
    if (!token || !phone) return json({ error: 'missing_required_fields' }, 400)
    const company = await getCompany()
    if (!company) return json({ error: 'invalid_checkin_token' }, 404)
    if (company.status === 'suspended') return json({ error: 'company_suspended' }, 403)
    if (company.plan === 'starter') return json({ error: 'plan_locked' }, 403)
    const settings = company.cw_automations?.self_checkin || {}
    if (settings.enabled === false) return json({ error: 'self_checkin_disabled' }, 403)

    if (ipAddress !== 'unknown') {
      const { count: ipCount } = await supabase.from('cw_otps').select('id', { count: 'exact', head: true })
        .eq('ip_address', ipAddress)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      if ((ipCount || 0) >= 10) return json({ error: 'rate_limit_exceeded' }, 429)
    }
    const { count: phoneCount } = await supabase.from('cw_otps').select('id', { count: 'exact', head: true })
      .eq('phone', phone).eq('company_id', company.id)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    if ((phoneCount || 0) >= 3) return json({ error: 'phone_otp_limit' }, 429)

    await supabase.from('cw_otps').delete()
      .eq('phone', phone).eq('company_id', company.id).eq('verified', false)

    const otp = generateOTP()
    await supabase.from('cw_otps').insert({
      phone, company_id: company.id, otp, ip_address: ipAddress,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })

    // WhatsApp مباشر بدون n8n
    await sendWhatsAppDirect(supabase, phone,
      `🔐 رمز التحقق لـ ${company.name}\n\nالرمز: *${otp}*\n\nصالح لمدة 5 دقائق. لا تشاركه مع أحد.`
    )

    return json({ sent: true })
  }

  // ══ VERIFY OTP ══════════════════════════════════════════════════════════════
  if (action === 'verify_otp') {
    const otpInput = String(payload.otp || '').trim()
    if (!phone || !otpInput) return json({ error: 'missing_required_fields' }, 400)
    const { data: otpRecord } = await supabase.from('cw_otps')
      .select('id, otp, expires_at, verified, used')
      .eq('phone', phone).eq('verified', false).eq('used', false)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!otpRecord) return json({ error: 'otp_not_found' }, 400)
    if (new Date(otpRecord.expires_at) < new Date()) return json({ error: 'otp_expired' }, 400)
    if (otpRecord.otp !== otpInput) return json({ error: 'otp_invalid' }, 400)
    await supabase.from('cw_otps').update({
      verified: true,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }).eq('id', otpRecord.id)
    return json({ verified: true, verification_token: otpRecord.id })
  }

  if (!phone) return json({ error: 'missing_required_fields' }, 400)
  const company = await getCompany()
  if (!company) return json({ error: 'invalid_checkin_token' }, 404)
  if (company.status === 'suspended') return json({ error: 'company_suspended' }, 403)
  if (company.business_type !== 'car_wash' && company.industry !== 'car_wash') return json({ error: 'not_car_wash' }, 403)
  if (company.plan === 'starter') return json({ error: 'plan_locked' }, 403)
  const settings = company.cw_automations?.self_checkin || {}
  if (settings.enabled === false) return json({ error: 'self_checkin_disabled' }, 403)

  // ══ LOOKUP CUSTOMER ══════════════════════════════════════════════════════════
  if (action === 'lookup_customer') {
    const tv = await validateToken(phone)
    if (!tv.ok) return json({ error: tv.error }, 403)
    const { data: customer } = await supabase.from('cw_customers')
      .select('id, name, total_visits, free_washes_available')
      .eq('company_id', company.id).eq('phone', phone).maybeSingle()
    return json({ customer: customer || null })
  }

  // ══ CHECKIN ══════════════════════════════════════════════════════════════════
  const serviceId = String(payload.service_id || '').trim()
  if (!serviceId) return json({ error: 'missing_required_fields' }, 400)
  const tv = await validateToken(phone)
  if (!tv.ok) return json({ error: tv.error }, 403)

  const approvalRequired = settings.approval_required !== false
  const antiSpamMinutes  = Number(settings.anti_spam_minutes || 10)
  const spamWindow = new Date(Date.now() - antiSpamMinutes * 60 * 1000).toISOString()

  const { data: duplicate } = await supabase.from('cw_queue').select('id')
    .eq('company_id', company.id).eq('phone', phone)
    .gte('created_at', spamWindow).neq('status', 'cancelled').limit(1)
  if (duplicate && duplicate.length > 0)
    return json({ error: 'duplicate_recent_checkin', anti_spam_minutes: antiSpamMinutes }, 409)

  const { data: service, error: serviceError } = await supabase.from('cw_services')
    .select('id, name, price').eq('company_id', company.id)
    .eq('id', serviceId).eq('active', true).maybeSingle()
  if (serviceError || !service) return json({ error: 'invalid_service' }, 400)

  const selectedService = service as Service
  const vat = calcVAT(Number(selectedService.price || 0), !!company.tax_enabled,
    Number(company.vat_rate || 15), !!company.price_includes_vat)

  const requestedCustomerName = String(payload.customer_name || '').trim()
  const carType = String(payload.car_type || '').trim()
  const plate   = String(payload.plate   || '').trim()

  const { data: existingCustomer } = await supabase.from('cw_customers')
    .select('id').eq('company_id', company.id).eq('phone', phone).maybeSingle()
  const customerName = requestedCustomerName || `عميل ${phone.slice(-4)}`
  if (existingCustomer?.id) {
    await supabase.from('cw_customers').update({ name: customerName }).eq('id', existingCustomer.id)
  } else {
    await supabase.from('cw_customers').insert({
      company_id: company.id, phone, name: customerName, total_visits: 0, welcome_sent: true,
    })
  }

  const notes = approvalRequired ? '[self_checkin_qr] [self_checkin_pending]' : '[self_checkin_qr]'
  const { data: inserted, error: insertError } = await supabase.from('cw_queue').insert({
    company_id: company.id, customer_name: customerName, phone,
    car_type: carType || null, plate: plate || null,
    service_id: selectedService.id, service_name: selectedService.name,
    price: selectedService.price, subtotal: vat.subtotal,
    vat_amount: vat.vat_amount, total_amount: vat.total_amount,
    status: 'received', payment_status: 'unpaid', notes,
  }).select('id, created_at').single()

  if (insertError || !inserted) return json({ error: 'queue_insert_failed' }, 500)

  await supabase.from('cw_otps').update({ used: true }).eq('id', tv.otpId!)

  const todayStart = new Date(inserted.created_at)
  todayStart.setHours(0, 0, 0, 0)
  const { data: queueItems } = await supabase.from('cw_queue')
    .select('id, created_at').eq('company_id', company.id)
    .gte('created_at', todayStart.toISOString())
    .neq('status', 'cancelled').order('created_at', { ascending: true })

  const code = ticketCode(queueItems || [], inserted.id)
  return json({ queue_id: inserted.id, ticket_code: code, approval_pending: approvalRequired,
    status_url: `/status/${token}/${inserted.id}` })
})
