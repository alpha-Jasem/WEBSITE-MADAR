// Receives WhatsApp events from Kapso (official WhatsApp Cloud API). Deployed with --no-verify-jwt:
// authenticity comes from the X-Webhook-Signature HMAC (SHA-256 of the raw body, keyed with the webhook secret).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { loadSettings, processInbound } from '../_shared/wa.ts'

const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')

async function validSignature(raw: string, header: string | null) {
  const secret = Deno.env.get('KAPSO_WEBHOOK_SECRET')
  if (!secret || !header) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const expected = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)))
  if (expected.length !== header.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ header.charCodeAt(i)
  return diff === 0
}

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405 })
  const raw = await req.text()
  if (!(await validSignature(raw, req.headers.get('X-Webhook-Signature')))) return new Response('invalid_signature', { status: 401 })

  const event = req.headers.get('X-Webhook-Event') || ''
  let payload: any
  try { payload = JSON.parse(raw) } catch { return new Response('bad_json', { status: 400 }) }

  const work = (async () => {
    if (event !== 'whatsapp.message.received') return
    const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
    const settings = await loadSettings(service)
    const items: any[] = payload?.batch ? (payload.data ?? []) : [payload]
    for (const item of items) {
      const m = item?.message
      if (!m) continue
      if (item.phone_number_id && settings.phone_number_id && String(item.phone_number_id) !== String(settings.phone_number_id)) continue // another number (for example the sandbox)
      const from = String(m.from ?? item?.conversation?.phone_number ?? '')
      const text = String(m.text?.body ?? m.kapso?.content ?? '')
      try {
        await processInbound(service, settings, { from, name: item?.conversation?.contact_name || undefined, text, type: String(m.type || 'text'), waId: m.id })
      } catch (e) {
        console.error('inbound failed', (e as Error).message)
      }
    }
  })()

  // answer Kapso right away; the agent's reply is produced and sent in the background
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime
  if (rt?.waitUntil) rt.waitUntil(work)
  else await work
  return new Response('ok', { status: 200 })
})
