// Streams the recording of one ElevenLabs call to the signed-in dashboard user.
//   POST { "call_id": "<clinic_os_ai_calls.id>" }  with the user's JWT  ->  audio bytes.
// The call is read with the caller's own session, so row-level security guarantees it belongs
// to their company; the platform key never leaves the server. Needs the ELEVENLABS_API_KEY secret.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const fail = (error: string, status: number) =>
  new Response(JSON.stringify({ error }), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return fail('method not allowed', 405)

  const apiKey = Deno.env.get('ELEVENLABS_API_KEY')
  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!apiKey || !url || !anonKey) return fail('server misconfigured', 500)

  const body = await req.json().catch(() => ({}))
  const callId = typeof body?.call_id === 'string' ? body.call_id : ''
  if (!/^[0-9a-f-]{36}$/i.test(callId)) return fail('bad request', 400)

  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  })
  const { data: call } = await asUser
    .from('clinic_os_ai_calls').select('provider, external_id').eq('id', callId).maybeSingle()
  if (!call) return fail('not found', 404)
  if (call.provider !== 'elevenlabs' || !call.external_id) return fail('no recording', 404)

  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(call.external_id)}/audio`,
    { headers: { 'xi-api-key': apiKey } },
  )
  if (!res.ok) return fail('no recording', res.status === 404 ? 404 : 502)

  return new Response(res.body, {
    headers: {
      ...cors,
      'Content-Type': res.headers.get('Content-Type') ?? 'audio/mpeg',
      'Cache-Control': 'private, max-age=300',
    },
  })
})
