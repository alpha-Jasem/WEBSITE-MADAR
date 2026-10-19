import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function b64url(input: ArrayBuffer | string) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input)
  let s = ''
  bytes.forEach(b => (s += String.fromCharCode(b)))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Service-account access token (JWT bearer grant) for the Calendar scope.
async function googleAccessToken(sa: { client_email: string; private_key: string }) {
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0))
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`))
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${b64url(sig)}`,
    }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error_description || body.error || 'google_token_failed')
  return body.access_token as string
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const saRaw = Deno.env.get('GOOGLE_SA_JSON')
  const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID')
  if (!supabaseUrl || !serviceRole) return json({ error: 'missing_server_config' }, 500)

  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  if (!token) return json({ error: 'missing_auth' }, 401)

  const service = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: userData, error: userError } = await service.auth.getUser(token)
  if (userError || !userData.user) return json({ error: 'invalid_auth' }, 401)
  const { data: profile } = await service.from('users').select('role').eq('id', userData.user.id).maybeSingle()
  if (profile?.role !== 'admin') return json({ error: 'forbidden' }, 403)
  if (!saRaw || !calendarId) return json({ error: 'calendar_not_configured' }, 500)

  const p = await req.json().catch(() => ({}))

  // Free slots for proposing meeting times: Sunday to Thursday, Riyadh time, checked against the real calendar.
  if (p.action === 'slots') {
    try {
      const accessToken = await googleAccessToken(JSON.parse(saRaw))
      const minutes = Math.min(Math.max(Number(p.minutes) || 30, 15), 120)
      const now = Date.now()
      const horizon = now + 8 * 86400000
      const fb = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeMin: new Date(now).toISOString(), timeMax: new Date(horizon).toISOString(), timeZone: 'Asia/Riyadh', items: [{ id: calendarId }] }),
      })
      const fbBody = await fb.json().catch(() => ({}))
      if (!fb.ok) return json({ error: 'calendar_failed', details: fbBody?.error?.message || fb.status }, 502)
      const busy = ((fbBody.calendars?.[calendarId]?.busy ?? []) as { start: string; end: string }[]).map(b => [Date.parse(b.start), Date.parse(b.end)])
      const hours = [10, 11, 12, 16, 17]
      const out: { start: string; label: string }[] = []
      const riyadh = new Date(now + 3 * 3600000)
      for (let d = 0; d < 8 && out.length < 8; d++) {
        const day = new Date(Date.UTC(riyadh.getUTCFullYear(), riyadh.getUTCMonth(), riyadh.getUTCDate() + d))
        const dow = day.getUTCDay()
        if (dow === 5 || dow === 6) continue
        for (const h of hours) {
          const s = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h - 3)
          const e = s + minutes * 60000
          if (s < now + 2 * 3600000) continue
          if (busy.some(([bs, be]) => s < be && e > bs)) continue
          out.push({ start: new Date(s).toISOString(), label: new Date(s).toLocaleString('ar-SA-u-ca-gregory', { timeZone: 'Asia/Riyadh', weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }) })
          if (out.length >= 8) break
        }
      }
      return json({ ok: true, slots: out })
    } catch (e) {
      return json({ error: 'calendar_failed', details: (e as Error).message }, 500)
    }
  }

  const start = new Date(p.start)
  const minutes = Math.min(Math.max(Number(p.minutes) || 30, 10), 240)
  if (Number.isNaN(start.getTime())) return json({ error: 'invalid_start' }, 400)
  const end = new Date(start.getTime() + minutes * 60000)

  try {
    const accessToken = await googleAccessToken(JSON.parse(saRaw))
    const description = [
      `اجتماع تعريفي مع ${p.name || ''}`,
      p.phone ? `الجوال: +${p.phone}` : '',
      p.meet_link ? `Google Meet: ${p.meet_link}` : '',
      p.notes || '',
    ].filter(Boolean).join('\n')

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: `اجتماع مدار — ${p.name || ''}`,
        description,
        location: p.meet_link || undefined,
        start: { dateTime: start.toISOString(), timeZone: 'Asia/Riyadh' },
        end: { dateTime: end.toISOString(), timeZone: 'Asia/Riyadh' },
        reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 30 }, { method: 'popup', minutes: 5 }] },
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      const code = res.status === 404 || res.status === 403 ? 'calendar_not_shared' : 'calendar_failed'
      return json({ error: code, details: body?.error?.message || res.status }, 502)
    }
    return json({ ok: true, event_id: body.id, link: body.htmlLink })
  } catch (e) {
    return json({ error: 'calendar_failed', details: (e as Error).message }, 500)
  }
})
