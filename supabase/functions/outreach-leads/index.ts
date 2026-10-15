import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { advanceRun, startRun } from '../_shared/outreach.ts'

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

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const apifyToken = Deno.env.get('APIFY_TOKEN')
  if (!supabaseUrl || !serviceRole) return json({ error: 'missing_server_config' }, 500)

  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  if (!token) return json({ error: 'missing_auth' }, 401)

  const service = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: userData, error: userError } = await service.auth.getUser(token)
  if (userError || !userData.user) return json({ error: 'invalid_auth' }, 401)
  const { data: profile } = await service.from('users').select('role').eq('id', userData.user.id).maybeSingle()
  if (profile?.role !== 'admin') return json({ error: 'forbidden' }, 403)
  if (!apifyToken) return json({ error: 'missing_apify_token' }, 500)

  const payload = await req.json().catch(() => ({}))

  try {
    if (payload.action === 'start') {
      const query = String(payload.query_en || payload.query || '').trim()
      const city = String(payload.city_en || payload.city || '').trim()
      if (!query) return json({ error: 'query_required' }, 400)
      const source = payload.source === 'linkedin' ? 'linkedin' : 'google_maps'
      const runId = await startRun(service, apifyToken, {
        source, query, city, count: Number(payload.count), trigger: 'manual', userId: userData.user.id,
      })
      return json({ ok: true, run_id: runId })
    }

    if (payload.action === 'poll') {
      const { data: run } = await service.from('outreach_runs').select('*').eq('id', payload.run_id).maybeSingle()
      if (!run) return json({ error: 'run_not_found' }, 404)
      return json({ ok: true, ...(await advanceRun(service, apifyToken, run)) })
    }

    return json({ error: 'unknown_action' }, 400)
  } catch (e) {
    return json({ error: 'outreach_failed', details: (e as Error).message }, 500)
  }
})
