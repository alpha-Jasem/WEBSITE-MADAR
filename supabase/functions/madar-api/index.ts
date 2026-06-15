import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-madar-key',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const db = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // ── 1. Authenticate via API key ──────────────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? req.headers.get('x-madar-key') ?? ''
  const rawKey = authHeader.replace(/^Bearer\s+/i, '').trim()

  if (!rawKey.startsWith('mdrc_')) {
    return json({ error: 'missing_or_invalid_key', hint: 'Include: Authorization: Bearer mdrc_xxx' }, 401)
  }

  const keyHash = await sha256(rawKey)
  const { data: keyRow, error: keyErr } = await db
    .from('api_keys')
    .select('id, company_id, permissions, active')
    .eq('key_hash', keyHash)
    .single()

  if (keyErr || !keyRow || !keyRow.active) {
    return json({ error: 'unauthorized', hint: 'API key is invalid or revoked' }, 401)
  }

  const companyId = keyRow.company_id as string
  const perms = (keyRow.permissions ?? []) as string[]
  const canRead = perms.includes('read:all') || perms.includes('read:customers') || perms.includes('read:visits')
  const canWrite = perms.includes('write:all') || perms.includes('write:visits') || perms.includes('write:customers')

  // Update last_used_at async (don't await)
  db.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyRow.id).then(() => {})

  // ── 2. Route ─────────────────────────────────────────────────────────────
  const url = new URL(req.url)
  const rawPath = url.pathname
  // Remove function prefix: /functions/v1/madar-api
  const path = rawPath.replace(/^.*\/madar-api/, '') || '/'
  const method = req.method

  // ── GET / — API info
  if (path === '/' || path === '') {
    return json({
      api: 'Madar OS REST API',
      version: '1.0',
      company_id: companyId,
      permissions: perms,
      endpoints: [
        'GET /customers', 'GET /customers/:id',
        'POST /customers',
        'GET /visits', 'POST /visits',
        'GET /queue', 'PATCH /queue/:id/status',
        'GET /reports/summary',
        'GET /webhooks', 'POST /webhooks', 'DELETE /webhooks/:id',
      ],
    })
  }

  // ── GET /customers
  if (path === '/customers' && method === 'GET') {
    if (!canRead) return json({ error: 'forbidden' }, 403)
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 200), 1000)
    const search = url.searchParams.get('search') ?? ''
    let q = db.from('cw_customers')
      .select('id,name,phone,total_visits,loyalty_tier,last_visit_at,created_at,car_type,plate')
      .eq('company_id', companyId)
      .order('last_visit_at', { ascending: false })
      .limit(limit)
    if (search) q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
    const { data, error } = await q
    if (error) return json({ error: error.message }, 500)
    return json({ data, count: data?.length ?? 0 })
  }

  // ── GET /customers/:id
  const custMatch = path.match(/^\/customers\/([^/]+)$/)
  if (custMatch && method === 'GET') {
    if (!canRead) return json({ error: 'forbidden' }, 403)
    const { data: cust } = await db.from('cw_customers')
      .select('*').eq('id', custMatch[1]).eq('company_id', companyId).single()
    if (!cust) return json({ error: 'not_found' }, 404)
    const { data: visits } = await db.from('cw_visits')
      .select('id,service_name,total_amount,payment_method,created_at')
      .eq('company_id', companyId).eq('phone', cust.phone)
      .order('created_at', { ascending: false }).limit(30)
    return json({ data: { ...cust, visits: visits ?? [] } })
  }

  // ── POST /customers
  if (path === '/customers' && method === 'POST') {
    if (!canWrite) return json({ error: 'forbidden' }, 403)
    const body = await req.json().catch(() => ({}))
    if (!body.phone) return json({ error: 'phone is required' }, 400)
    const phone = String(body.phone).replace(/\D/g, '')
    const normalizedPhone = phone.startsWith('966') ? phone : phone.startsWith('0') ? `966${phone.slice(1)}` : `966${phone}`
    const { data: existing } = await db.from('cw_customers')
      .select('id').eq('company_id', companyId).eq('phone', normalizedPhone).maybeSingle()
    if (existing) return json({ error: 'customer_exists', id: existing.id }, 409)
    const { data, error } = await db.from('cw_customers').insert({
      company_id: companyId,
      phone: normalizedPhone,
      name: body.name ?? null,
      total_visits: 0,
      welcome_sent: false,
    }).select().single()
    if (error) return json({ error: error.message }, 500)
    return json({ data }, 201)
  }

  // ── GET /visits
  if (path === '/visits' && method === 'GET') {
    if (!canRead) return json({ error: 'forbidden' }, 403)
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 1000)
    const from = url.searchParams.get('from') // YYYY-MM-DD
    const to   = url.searchParams.get('to')
    let q = db.from('cw_visits')
      .select('id,customer_name,phone,plate,service_name,total_amount,subtotal,vat_amount,payment_method,created_at,worker_id')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (from) q = q.gte('created_at', from)
    if (to)   q = q.lte('created_at', to + 'T23:59:59')
    const { data, error } = await q
    if (error) return json({ error: error.message }, 500)
    return json({ data, count: data?.length ?? 0 })
  }

  // ── POST /visits
  if (path === '/visits' && method === 'POST') {
    if (!canWrite) return json({ error: 'forbidden' }, 403)
    const body = await req.json().catch(() => ({}))
    if (!body.service_name || !body.total_amount) {
      return json({ error: 'service_name and total_amount are required' }, 400)
    }
    const { data, error } = await db.from('cw_visits').insert({
      company_id: companyId,
      customer_name: body.customer_name ?? null,
      phone: body.phone ?? null,
      plate: body.plate ?? null,
      service_name: body.service_name,
      total_amount: Number(body.total_amount),
      subtotal: body.subtotal ? Number(body.subtotal) : Number(body.total_amount) / 1.15,
      vat_amount: body.vat_amount ? Number(body.vat_amount) : Number(body.total_amount) - Number(body.total_amount) / 1.15,
      payment_method: body.payment_method ?? 'cash',
      payment_status: 'paid',
      is_free_wash: false,
    }).select().single()
    if (error) return json({ error: error.message }, 500)
    return json({ data }, 201)
  }

  // ── GET /queue
  if (path === '/queue' && method === 'GET') {
    if (!canRead) return json({ error: 'forbidden' }, 403)
    const { data, error } = await db.from('cw_queue')
      .select('id,customer_name,phone,plate,car_type,service_name,status,created_at,delivered_at')
      .eq('company_id', companyId)
      .not('status', 'in', '("delivered","cancelled")')
      .order('created_at')
    if (error) return json({ error: error.message }, 500)
    return json({ data, count: data?.length ?? 0 })
  }

  // ── PATCH /queue/:id/status
  const queueMatch = path.match(/^\/queue\/([^/]+)\/status$/)
  if (queueMatch && method === 'PATCH') {
    if (!canWrite) return json({ error: 'forbidden' }, 403)
    const body = await req.json().catch(() => ({}))
    const validStatuses = ['received', 'washing', 'drying', 'ready', 'delivered', 'cancelled']
    if (!validStatuses.includes(body.status)) {
      return json({ error: `status must be one of: ${validStatuses.join(', ')}` }, 400)
    }
    const { data, error } = await db.from('cw_queue')
      .update({ status: body.status, ...(body.status === 'delivered' ? { delivered_at: new Date().toISOString() } : {}) })
      .eq('id', queueMatch[1]).eq('company_id', companyId).select().single()
    if (error) return json({ error: error.message }, 500)
    return json({ data })
  }

  // ── GET /reports/summary
  if (path === '/reports/summary' && method === 'GET') {
    if (!canRead) return json({ error: 'forbidden' }, 403)
    const period = url.searchParams.get('period') ?? 'today'
    const now = new Date()
    let fromDate: string
    if (period === 'week') {
      const d = new Date(now); d.setDate(d.getDate() - 7); fromDate = d.toISOString().slice(0, 10)
    } else if (period === 'month') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    } else {
      fromDate = now.toISOString().slice(0, 10)
    }
    const { data: visits } = await db.from('cw_visits')
      .select('total_amount,payment_method,is_free_wash')
      .eq('company_id', companyId)
      .gte('created_at', fromDate)
    const revenue = (visits ?? []).reduce((s, v) => s + Number(v.total_amount || 0), 0)
    const byPayment: Record<string, number> = {}
    for (const v of visits ?? []) {
      const pm = v.payment_method || 'cash'
      byPayment[pm] = (byPayment[pm] ?? 0) + Number(v.total_amount || 0)
    }
    return json({
      data: {
        period,
        from: fromDate,
        total_revenue: revenue,
        total_visits: visits?.length ?? 0,
        avg_invoice: visits?.length ? revenue / visits.length : 0,
        by_payment: byPayment,
      },
    })
  }

  // ── GET /webhooks
  if (path === '/webhooks' && method === 'GET') {
    const { data } = await db.from('webhook_endpoints')
      .select('id,url,events,active,last_triggered_at,created_at')
      .eq('company_id', companyId).order('created_at')
    return json({ data })
  }

  // ── POST /webhooks
  if (path === '/webhooks' && method === 'POST') {
    const body = await req.json().catch(() => ({}))
    if (!body.url) return json({ error: 'url is required' }, 400)
    const validEvents = ['visit.created', 'queue.status_changed', 'daily.closed', 'customer.created']
    const events = Array.isArray(body.events) ? body.events.filter((e: string) => validEvents.includes(e)) : ['visit.created']
    const { data, error } = await db.from('webhook_endpoints').insert({
      company_id: companyId,
      url: body.url,
      events,
      secret: body.secret ?? null,
    }).select().single()
    if (error) return json({ error: error.message }, 500)
    return json({ data }, 201)
  }

  // ── DELETE /webhooks/:id
  const webhookMatch = path.match(/^\/webhooks\/([^/]+)$/)
  if (webhookMatch && method === 'DELETE') {
    await db.from('webhook_endpoints').delete().eq('id', webhookMatch[1]).eq('company_id', companyId)
    return json({ success: true })
  }

  return json({ error: 'endpoint_not_found', path, method }, 404)
})
