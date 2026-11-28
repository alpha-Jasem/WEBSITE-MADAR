// Brings one finished call from the voice platform into the company's dashboard: the call row (so conversations,
// notifications, assignment and automation rules see it), a support ticket when it needs a person, and the caller as a
// contact. The mapping and ticket rules are the ones the webhook already uses (agentCallMapper.js).

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ingestCall } from './agentCallWebhook.js'
import { normalizeNabrahCall } from './agentCallMapper.js'

const API = 'https://api.nabrah.ai/api/ext'
/** Statuses of a call that has not finished yet; it is picked up later, when it ends. */
const UNFINISHED = new Set(['queued', 'scheduled', 'ringing', 'in_progress', 'in-progress', 'ongoing'])

export interface IngestResult { ingested: boolean; reason?: string; ticket?: string; contact?: 'created' | 'updated' | 'none' }

function callStore(db: SupabaseClient) {
  return {
    async upsertCall(row: Record<string, unknown>): Promise<string> {
      const { data, error } = await db.from('clinic_os_ai_calls').upsert(row, { onConflict: 'provider,external_id' }).select('id').single()
      if (error) throw error
      return data.id
    },
    // One ticket per call: a repeat never opens a second one and never touches one staff already moved on.
    async insertTicketOnce(ticket: Record<string, unknown>): Promise<boolean> {
      const { data, error } = await db.from('ai_agent_support_tickets').upsert(ticket, { onConflict: 'ai_call_id', ignoreDuplicates: true }).select('id')
      if (error) throw error
      return (data?.length ?? 0) > 0
    },
  }
}

/** The caller as a contact: an existing one with the same number (last nine digits) is refreshed, otherwise a new one is added. */
async function saveContact(db: SupabaseClient, companyId: string, phone: string, name: string | null, at: string): Promise<'created' | 'updated' | 'none'> {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8) return 'none'
  const tail = digits.slice(-9)
  const { data: found } = await db.from('clinic_os_patients').select('id, name').eq('company_id', companyId).like('phone', `%${tail}`).limit(1)
  if (found?.length) {
    await db.from('clinic_os_patients').update({ last_visit_at: at, ...(name && /^(عميل|unknown)/.test(found[0].name || '') ? { name } : {}) }).eq('id', found[0].id)
    return 'updated'
  }
  const { error } = await db.from('clinic_os_patients').insert({ company_id: companyId, name: (name || '').trim() || 'عميل جديد', phone, patient_type: 'new', last_visit_at: at })
  return error ? 'none' : 'created'
}

export async function ingestNabrahCall(db: SupabaseClient, nabrahKey: string, companyId: string, callId: string): Promise<IngestResult> {
  const res = await fetch(`${API}/call/${encodeURIComponent(callId)}`, { headers: { 'X-API-Key': nabrahKey }, signal: AbortSignal.timeout(15_000) })
  if (!res.ok) return { ingested: false, reason: `fetch ${res.status}` }
  const call = await res.json()
  // Only a company's own agents: the call's agent must be linked to this company.
  const { data: link } = await db.from('agent_links').select('company_id').eq('provider', 'nabrah').eq('agent_id', String(call?.agent_id ?? '')).maybeSingle()
  if (link?.company_id !== companyId) return { ingested: false, reason: 'not this company' }
  if (UNFINISHED.has(String(call?.status ?? '').trim().toLowerCase())) return { ingested: false, reason: 'unfinished' }

  const row = normalizeNabrahCall(call, companyId) as Record<string, unknown>
  const saved = await ingestCall(callStore(db), row) as { ticket: string }
  const phone = String(row.phone ?? '')
  const contact = phone && phone !== 'unknown' ? await saveContact(db, companyId, phone, (row.caller_name as string | null) ?? null, String(row.call_time)) : 'none'
  return { ingested: true, ticket: saved.ticket, contact }
}
