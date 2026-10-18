// Deal stages of the agency's own sales pipeline, and how an Outreach lead status maps onto them.
export const DEAL_STAGES = [
  'new', 'contacted', 'interested', 'qualified', 'offer_sent', 'negotiation', 'awaiting_payment', 'won', 'lost',
] as const
export type DealStage = (typeof DEAL_STAGES)[number]

export const STAGE_LABEL: Record<DealStage, string> = {
  new: 'جديد',
  contacted: 'تم التواصل',
  interested: 'مهتم',
  qualified: 'مؤهل',
  offer_sent: 'عرض مرسل',
  negotiation: 'تفاوض',
  awaiting_payment: 'بانتظار الدفع',
  won: 'مغلق بنجاح',
  lost: 'خسارة',
}

export type LeadStatus = 'new' | 'contacted' | 'replied' | 'meeting' | 'won' | 'lost' | 'no_answer'

/** Stage a deal should be in, given the Outreach lead status. */
export function stageForLeadStatus(status: LeadStatus): DealStage {
  switch (status) {
    case 'new': return 'new'
    case 'contacted':
    case 'no_answer': return 'contacted'
    case 'replied': return 'interested'
    case 'meeting': return 'qualified'
    case 'won': return 'won'
    case 'lost': return 'lost'
  }
}

export const isClosed = (s: DealStage) => s === 'won' || s === 'lost'
export const stageRank = (s: DealStage) => DEAL_STAGES.indexOf(s)

/**
 * A lead status change may move the deal forward or close it. It never silently pulls a deal back
 * from a later stage (offer sent, negotiation, awaiting payment) to an earlier one, and a closed
 * deal is only reopened explicitly.
 */
export function nextStage(current: DealStage, status: LeadStatus): DealStage {
  const target = stageForLeadStatus(status)
  if (isClosed(current)) return current
  if (target === 'lost' || target === 'won') return target
  return stageRank(target) > stageRank(current) ? target : current
}
