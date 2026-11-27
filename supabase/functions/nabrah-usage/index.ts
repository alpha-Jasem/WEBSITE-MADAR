// This month's voice usage for the signed-in user's company, counted from its own agents' calls.
//   POST {} with the signed-in user's JWT  ->  { minutes, calls, limit, cycle_start, cycle_end } | { none: true }
// It also writes the number to clinic_os_usage, which the dashboard listens to (realtime), so other open
// screens update by themselves. Deploy with JWT verification ON.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { recomputeVoiceUsage } from '../_shared/voice-usage.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const key = Deno.env.get('NABRAH_API_KEY')?.trim()
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!key || !url || !serviceKey || !anonKey) return json({ error: 'server misconfigured' }, 500)

  const asUser = createClient(url, anonKey, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }, auth: { persistSession: false } })
  const { data: companyId } = await asUser.rpc('get_my_clinic_company_id')
  if (!companyId) return json({ error: 'unauthorized' }, 401)

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  try {
    const usage = await recomputeVoiceUsage(db, key, companyId)
    return json(usage ?? { none: true })
  } catch (e) {
    return json({ error: 'upstream error', status: e instanceof Error ? e.message : '' }, 502)
  }
})
