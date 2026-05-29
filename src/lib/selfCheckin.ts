import type { Company, Plan } from '../types'

export const SELF_CHECKIN_PENDING_MARK = '[self_checkin_pending]'
export const SELF_CHECKIN_SOURCE_MARK = '[self_checkin_qr]'

type SelfCheckinCompany = Pick<Company, 'webhook_token' | 'plan'> & {
  public_checkin_token?: string | null
  cw_automations?: Record<string, any> | null
}

export function getPublicCheckinToken(company?: Partial<SelfCheckinCompany> | null) {
  return company?.public_checkin_token || company?.webhook_token || ''
}

export function getSelfCheckinUrl(company?: Partial<SelfCheckinCompany> | null, origin = window.location.origin) {
  const token = getPublicCheckinToken(company)
  return token ? `${origin}/checkin/${token}` : ''
}

export function canUseSelfCheckin(plan?: Plan | null) {
  return plan === 'growth' || plan === 'enterprise'
}

export function getSelfCheckinSettings(company?: Partial<SelfCheckinCompany> | null) {
  const settings = company?.cw_automations?.self_checkin || {}
  return {
    enabled: settings.enabled !== false,
    approvalRequired: settings.approval_required !== false,
    antiSpamMinutes: Number(settings.anti_spam_minutes || 10),
  }
}

export function markSelfCheckinNotes(notes?: string | null, pending = true) {
  const parts = [SELF_CHECKIN_SOURCE_MARK]
  if (pending) parts.push(SELF_CHECKIN_PENDING_MARK)
  if (notes?.trim()) parts.push(notes.trim())
  return parts.join(' ')
}

export function isSelfCheckinPending(notes?: string | null) {
  return !!notes?.includes(SELF_CHECKIN_PENDING_MARK)
}

export function clearSelfCheckinPending(notes?: string | null) {
  return (notes || '')
    .replace(SELF_CHECKIN_PENDING_MARK, '')
    .replace(/\s+/g, ' ')
    .trim()
}
