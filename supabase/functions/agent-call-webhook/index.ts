// Receives post-call webhooks from the voice-agent platforms and writes one
// normalised row per call into clinic_os_ai_calls.
//   ?provider=nabrah      Nabrah agent post_call_callback / post_analysis_callback.
//                         Auth: X-Madar-Secret header. Only the call id is read; the call is re-fetched.
//   ?provider=elevenlabs  ElevenLabs post_call_transcription. Auth: elevenlabs-signature HMAC.
// Calls that end as needs_review (transfer, complaint, refund, call-back, unresolved)
// also open one ai_agent_support_tickets row linked by ai_call_id.
// Deploy with --no-verify-jwt: the platforms cannot send a Supabase JWT.
// The request logic lives in _shared/agentCallWebhook.js (exercised by scripts/agent-calls-selfcheck.mjs).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAgentCallWebhook } from '../_shared/agentCallWebhook.js'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

const store = {
  async companyForAgent(provider: string, agentId: string): Promise<string | null> {
    const { data, error } = await db
      .from('agent_links')
      .select('company_id')
      .eq('provider', provider)
      .eq('agent_id', agentId)
      .maybeSingle()
    if (error) throw error
    return data?.company_id ?? null
  },

  async upsertCall(row: Record<string, unknown>): Promise<string> {
    const { data, error } = await db
      .from('clinic_os_ai_calls')
      .upsert(row, { onConflict: 'provider,external_id' })
      .select('id')
      .single()
    if (error) throw error
    return data.id
  },

  // ON CONFLICT (ai_call_id) DO NOTHING: a retry never opens a second ticket and never
  // touches one staff already moved to in_progress / resolved.
  async insertTicketOnce(ticket: Record<string, unknown>): Promise<boolean> {
    const { data, error } = await db
      .from('ai_agent_support_tickets')
      .upsert(ticket, { onConflict: 'ai_call_id', ignoreDuplicates: true })
      .select('id')
    if (error) throw error
    return (data?.length ?? 0) > 0
  },
}

Deno.serve(createAgentCallWebhook({ env: Deno.env, store }))
