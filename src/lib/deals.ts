import { supabase } from './supabase'
import { nextStage, type DealStage, type LeadStatus } from './dealStages'

export interface LeadRef {
  id: string
  name: string
  phone: string
  contact_name?: string
  campaign?: string
  source?: string
}

export interface Deal {
  id: string
  lead_id: string | null
  company_name: string
  contact_name: string
  contact_phone: string
  stage: DealStage
  lost_reason: string
  campaign: string
  source: string
  sourced_by: string
  closed_by: string
  service: string
  value_net: number | null
  last_contact_at: string | null
  next_step: string
  next_step_at: string | null
  created_at: string
  updated_at: string
  closed_at: string | null
}

async function currentUserId() {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export async function logDealEvent(dealId: string, type: string, data: Record<string, unknown> = {}) {
  await supabase.from('deal_events').insert({ deal_id: dealId, type, data, actor_type: 'owner', actor_id: await currentUserId() })
}

/**
 * Keeps the deal of an Outreach lead in step with the lead status. Creates the deal on first contact,
 * moves it forward (never silently backwards), and records the change in the deal history.
 */
export async function syncDealForLead(lead: LeadRef, status: LeadStatus, extra: Partial<Deal> = {}) {
  const { data: existing } = await supabase.from('deals').select('*').eq('lead_id', lead.id).maybeSingle()
  const now = new Date().toISOString()

  if (!existing) {
    if (status === 'new') return null
    const stage = nextStage('new', status)
    const { data: created, error } = await supabase.from('deals').insert({
      lead_id: lead.id, company_name: lead.name, contact_name: lead.contact_name ?? '', contact_phone: lead.phone,
      stage, campaign: lead.campaign ?? '', source: lead.source ?? 'outreach', last_contact_at: now,
      closed_at: stage === 'won' || stage === 'lost' ? now : null, ...extra,
    }).select('*').single()
    if (error || !created) return null
    await logDealEvent(created.id, 'created', { stage, from_status: status })
    return created as Deal
  }

  const deal = existing as Deal
  const stage = nextStage(deal.stage, status)
  const patch: Record<string, unknown> = { updated_at: now, ...extra }
  if (stage !== deal.stage) {
    patch.stage = stage
    if (stage === 'won' || stage === 'lost') patch.closed_at = now
  }
  const { data: updated } = await supabase.from('deals').update(patch).eq('id', deal.id).select('*').single()
  if (stage !== deal.stage) await logDealEvent(deal.id, 'stage_change', { from: deal.stage, to: stage })
  return (updated ?? deal) as Deal
}

export async function recordContact(lead: LeadRef, channel: 'whatsapp' | 'call') {
  const { data: deal } = await supabase.from('deals').select('id').eq('lead_id', lead.id).maybeSingle()
  if (deal) {
    await supabase.from('deals').update({ last_contact_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', deal.id)
    await logDealEvent(deal.id, 'contact', { channel })
  }
}

export async function loadDoNotContact(): Promise<Set<string>> {
  const { data } = await supabase.from('do_not_contact').select('phone').not('phone', 'is', null)
  return new Set((data ?? []).map(r => r.phone as string))
}

export async function addDoNotContact(phone: string, companyName: string, reason: 'opt_out' | 'existing_customer' | 'invalid' | 'unsuitable', note = '') {
  const { error } = await supabase.from('do_not_contact').upsert(
    { phone, company_name: companyName, reason, note, created_by: await currentUserId() },
    { onConflict: 'phone' },
  )
  return !error
}

export async function writeAudit(action: string, entityType: string, entityId: string, before: unknown, after: unknown) {
  const actor = await currentUserId()
  if (!actor) return
  await supabase.from('audit_events').insert({ actor_id: actor, action, entity_type: entityType, entity_id: entityId, before, after })
}
