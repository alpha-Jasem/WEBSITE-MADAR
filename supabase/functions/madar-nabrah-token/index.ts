// Mints a Nabrah web-call token for the "لين" (Layn) sales agent used by the
// homepage voice widget (public/signal/index.html). The Nabrah API key must
// never reach the browser, so this function calls Nabrah server-side and
// only relays back the {token, url} pair the LiveKit client needs.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Fixed on purpose: this endpoint only ever serves the Madar homepage sales
// agent, so there is no client-supplied agent_id to validate or trust.
const MADAR_AGENT_ID = '01a07508-bf7a-7a3b-8de1-b3a7d3d6b224'

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const apiKey = Deno.env.get('NABRAH_API_KEY')
  if (!apiKey) return json({ error: 'server misconfigured' }, 500)

  try {
    const res = await fetch('https://api.nabrah.ai/api/ext/web/make-web-call', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: MADAR_AGENT_ID }),
    })
    const text = await res.text()
    return new Response(text, { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('nabrah token mint failed:', e)
    return json({ error: 'could not start call' }, 502)
  }
})
