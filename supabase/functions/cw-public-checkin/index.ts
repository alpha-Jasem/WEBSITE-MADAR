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

function makeReply(origin: string | null) {
  return (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
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

  const token  = String(payload.token || '').trim()
  const action = String(payload.action || 'checkin').trim()
  const phone  = normalizePhone(String(payload.phone || ''))

  async function getCompany(): Promise<Company | null> {
    const { data } = await supabase.rpc('get_public_checkin_company', { checkin_token: token })
    return (data?.[0] || null) as Company | null
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
    const { data: customer } = await supabase.from('cw_customers')
      .select('id, name, total_visits, free_washes_available')
      .eq('company_id', company.id).eq('phone', phone).maybeSingle()
    return json({ customer: customer || null })
  }

  // ══ CHECKIN ══════════════════════════════════════════════════════════════════
  const serviceId = String(payload.service_id || '').trim()
  if (!serviceId) return json({ error: 'missing_required_fields' }, 400)

  const antiSpamMinutes = Number(settings.anti_spam_minutes || 10)
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

  let customerId: string | null = null
  if (existingCustomer?.id) {
    customerId = existingCustomer.id
    await supabase.from('cw_customers').update({ name: customerName }).eq('id', existingCustomer.id)
  } else {
    const { data: newCust } = await supabase.from('cw_customers').insert({
      company_id: company.id, phone, name: customerName, total_visits: 0, welcome_sent: true,
    }).select('id').single()
    customerId = newCust?.id || null
  }

  const approvalRequired = settings.approval_required !== false
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

  const todayStart = new Date(inserted.created_at)
  todayStart.setHours(0, 0, 0, 0)
  const { data: queueItems } = await supabase.from('cw_queue')
    .select('id, created_at').eq('company_id', company.id)
    .gte('created_at', todayStart.toISOString())
    .neq('status', 'cancelled').order('created_at', { ascending: true })

  const code = ticketCode(queueItems || [], inserted.id)
  return json({
    queue_id: inserted.id,
    ticket_code: code,
    approval_pending: approvalRequired,
    customer_id: customerId,
    status_url: `/status/${token}/${inserted.id}`,
  })
})
