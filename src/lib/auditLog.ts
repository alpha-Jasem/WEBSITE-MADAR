import { supabase } from './supabase'

export async function logAudit(
  companyId: string,
  action: string,
  options?: {
    userId?: string
    entityType?: string
    entityId?: string
    oldValue?: unknown
    newValue?: unknown
  }
) {
  try {
    await supabase.from('cw_audit_logs').insert({
      company_id: companyId,
      user_id: options?.userId ?? null,
      action,
      entity_type: options?.entityType ?? null,
      entity_id: options?.entityId ?? null,
      old_value: options?.oldValue ?? null,
      new_value: options?.newValue ?? null,
    })
  } catch {
    // fire-and-forget — never throw
  }
}
