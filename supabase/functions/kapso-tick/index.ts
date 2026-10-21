// Runs every minute from pg_cron. Sends at most one due first message (template) and retries replies that failed to go out.
// Deployed with --no-verify-jwt; authenticated with the internal cron secret.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { loadSettings, sendNextFirst, sendText } from '../_shared/wa.ts'

Deno.serve(async req => {
  const secret = Deno.env.get('OUTREACH_CRON_SECRET')
  if (!secret || req.headers.get('x-cron-secret') !== secret) return new Response('forbidden', { status: 403 })
  const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
  try {
    const s = await loadSettings(service)
    const result: Record<string, unknown> = {}

    // replies that were queued but not delivered (a reply is only allowed inside the 24 hours after the customer's last message)
    if (s.enabled && s.phone_number_id) {
      const { data: queued } = await service.from('wa_messages').select('id, body, wa_conversations(phone, last_in_at)').eq('direction', 'out').eq('status', 'queued').eq('kind', 'reply').lt('created_at', new Date(Date.now() - 90000).toISOString()).limit(5)
      for (const m of (queued ?? []) as any[]) {
        const lastIn = m.wa_conversations?.last_in_at ? new Date(m.wa_conversations.last_in_at).getTime() : 0
        if (Date.now() - lastIn > 23 * 3600000) { await service.from('wa_messages').update({ status: 'failed', error: 'window_closed' }).eq('id', m.id); continue }
        const r = await sendText(s.phone_number_id, m.wa_conversations.phone, m.body)
        await service.from('wa_messages').update(r.ok ? { status: 'sent', sent_at: new Date().toISOString(), wa_message_id: r.id ?? null } : { status: 'failed', error: r.error }).eq('id', m.id)
      }
      result.retried = queued?.length ?? 0
    }

    result.first = await sendNextFirst(service, s)
    return new Response(JSON.stringify({ ok: true, ...result }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message.slice(0, 200) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
