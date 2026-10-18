// Real connection checks for the admin dashboard. Never reports "connected" without a live call
// (or a clearly worded "unchecked"). Results are stored in integration_checks with the check time.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Status = 'not_configured' | 'unchecked' | 'ok' | 'degraded' | 'failed'
interface Result { key: string; label: string; status: Status; detail: string; latency_ms?: number }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

async function timed<T>(fn: () => Promise<T>) {
  const t = Date.now()
  const value = await fn()
  return { value, ms: Date.now() - t }
}

function b64url(input: ArrayBuffer | string) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input)
  let s = ''
  bytes.forEach(b => (s += String.fromCharCode(b)))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function googleToken(sa: { client_email: string; private_key: string }) {
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/calendar', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }))
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), c => c.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`))
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claims}.${b64url(sig)}` }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error_description || body.error || 'token_failed')
  return body.access_token as string
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const service = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } })

  const cronSecret = Deno.env.get('OUTREACH_CRON_SECRET')
  const fromCron = !!cronSecret && req.headers.get('x-cron-secret') === cronSecret
  if (!fromCron) {
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    if (!token) return json({ error: 'missing_auth' }, 401)
    const { data: u } = await service.auth.getUser(token)
    if (!u.user) return json({ error: 'invalid_auth' }, 401)
    const { data: profile } = await service.from('users').select('role').eq('id', u.user.id).maybeSingle()
    if (profile?.role !== 'admin') return json({ error: 'forbidden' }, 403)
  }

  const results: Result[] = []
  const add = (r: Result) => results.push(r)
  const guard = async (key: string, label: string, fn: () => Promise<Omit<Result, 'key' | 'label'>>) => {
    try { add({ key, label, ...(await fn()) }) } catch (e) { add({ key, label, status: 'failed', detail: (e as Error).message.slice(0, 200) }) }
  }

  await guard('supabase', 'قاعدة البيانات (Supabase)', async () => {
    const { value, ms } = await timed(() => service.from('users').select('id', { count: 'exact', head: true }))
    if (value.error) return { status: 'failed', detail: value.error.message, latency_ms: ms }
    return { status: 'ok', detail: 'استعلام ناجح', latency_ms: ms }
  })

  await guard('apify', 'Apify (جلب العملاء)', async () => {
    const token = Deno.env.get('APIFY_TOKEN')
    if (!token) return { status: 'not_configured', detail: 'APIFY_TOKEN غير مضبوط' }
    const { value, ms } = await timed(() => fetch(`https://api.apify.com/v2/users/me?token=${token}`))
    return value.ok ? { status: 'ok', detail: 'المفتاح صالح', latency_ms: ms } : { status: 'failed', detail: `HTTP ${value.status}`, latency_ms: ms }
  })

  await guard('google_calendar', 'Google Calendar', async () => {
    const raw = Deno.env.get('GOOGLE_SA_JSON')
    const cal = Deno.env.get('GOOGLE_CALENDAR_ID')
    if (!raw || !cal) return { status: 'not_configured', detail: 'GOOGLE_SA_JSON أو GOOGLE_CALENDAR_ID غير مضبوط' }
    const { value, ms } = await timed(async () => {
      const t = await googleToken(JSON.parse(raw))
      return fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal)}`, { headers: { Authorization: `Bearer ${t}` } })
    })
    return value.ok ? { status: 'ok', detail: 'التقويم متاح للكتابة عبر حساب الخدمة', latency_ms: ms }
      : { status: 'failed', detail: value.status === 404 || value.status === 403 ? 'التقويم غير مشارك مع حساب الخدمة' : `HTTP ${value.status}`, latency_ms: ms }
  })

  await guard('web_push', 'إشعارات الجوال (Web Push)', async () => {
    if (!Deno.env.get('VAPID_PUBLIC_KEY') || !Deno.env.get('VAPID_PRIVATE_KEY')) return { status: 'not_configured', detail: 'مفاتيح VAPID غير مضبوطة' }
    const { count } = await service.from('push_subscriptions').select('id', { count: 'exact', head: true })
    return (count ?? 0) > 0 ? { status: 'ok', detail: `${count} جهاز مسجل (لم يُرسل إشعار تجريبي في هذا الفحص)` }
      : { status: 'degraded', detail: 'المفاتيح مضبوطة لكن لا يوجد جهاز مفعّل' }
  })

  await guard('cron', 'المهام المجدولة (pg_cron)', async () => {
    const { data, error } = await service.rpc('cron_health')
    if (error) return { status: 'failed', detail: error.message }
    const jobs = (data ?? []) as { jobname: string; active: boolean; last_status: string | null; last_run_at: string | null }[]
    if (jobs.length === 0) return { status: 'not_configured', detail: 'لا توجد مهام مجدولة' }
    const bad = jobs.filter(j => j.active && j.last_status && j.last_status !== 'succeeded')
    const never = jobs.filter(j => j.active && !j.last_run_at)
    if (bad.length) return { status: 'degraded', detail: `آخر تشغيل فاشل: ${bad.map(j => j.jobname).join('، ')}` }
    return { status: 'ok', detail: `${jobs.length} مهمة${never.length ? `، ${never.length} لم تعمل بعد` : '، آخر تشغيل ناجح لكل منها'}` }
  })

  await guard('n8n', 'n8n', async () => {
    const base = Deno.env.get('N8N_BASE_URL')
    const key = Deno.env.get('N8N_API_KEY')
    if (!base || !key) return { status: 'not_configured', detail: 'N8N_BASE_URL أو N8N_API_KEY غير مضبوط' }
    const { value, ms } = await timed(() => fetch(`${base.replace(/\/$/, '')}/api/v1/workflows?limit=1`, { headers: { 'X-N8N-API-KEY': key } }))
    return value.ok ? { status: 'ok', detail: 'واجهة n8n تستجيب', latency_ms: ms } : { status: 'failed', detail: `HTTP ${value.status}`, latency_ms: ms }
  })

  await guard('elevenlabs', 'ElevenLabs', async () => {
    const key = Deno.env.get('ELEVENLABS_API_KEY')
    if (!key) return { status: 'not_configured', detail: 'ELEVENLABS_API_KEY غير مضبوط' }
    const { value, ms } = await timed(() => fetch('https://api.elevenlabs.io/v1/user', { headers: { 'xi-api-key': key } }))
    return value.ok ? { status: 'ok', detail: 'المفتاح صالح', latency_ms: ms } : { status: 'failed', detail: `HTTP ${value.status}`, latency_ms: ms }
  })

  await guard('moyasar', 'Moyasar (المدفوعات)', async () => {
    if (!Deno.env.get('MOYASAR_SECRET_KEY')) return { status: 'not_configured', detail: 'MOYASAR_SECRET_KEY غير مضبوط' }
    return { status: 'unchecked', detail: 'المفتاح موجود، لم تُجرَ مكالمة اختبار ولم تُستدع الدفعات من الواجهة بعد' }
  })

  await guard('salla', 'سلة (Webhook)', async () => {
    if (!Deno.env.get('SALLA_WEBHOOK_SECRET')) return { status: 'not_configured', detail: 'SALLA_WEBHOOK_SECRET غير مضبوط' }
    const { data } = await service.from('salla_webhook_events').select('received_at').order('received_at', { ascending: false }).limit(1)
    const last = data?.[0]?.received_at as string | undefined
    return last ? { status: 'unchecked', detail: `آخر حدث وصل: ${last}` } : { status: 'unchecked', detail: 'السر مضبوط، لم يصل أي حدث بعد' }
  })

  const now = new Date().toISOString()
  for (const r of results) {
    await service.from('integration_checks').upsert({
      key: r.key, label: r.label, status: r.status, detail: r.detail, latency_ms: r.latency_ms ?? null,
      last_checked_at: now, ...(r.status === 'ok' ? { last_ok_at: now } : {}), updated_at: now,
    }, { onConflict: 'key' })
  }
  return json({ ok: true, checked_at: now, results })
})
