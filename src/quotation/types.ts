/** Madar Quotation: shared types. Money is SAR (or the company currency) with 2 decimals. */

export interface QtSettings {
  currency: string
  vatRate: number
  validityDays: number
  /** Quotes above this total always go to a person with authority. null = no ceiling. */
  autoIssueMaxTotal: number | null
  maxDiscountPct: number
  minMarginPct: number
  /** A catalog price older than this needs approval before it is quoted. */
  priceMaxAgeDays: number
  paymentTerms: string
  deliveryTerms: string
  quotePrefix: string
}

export interface QtProduct {
  id: string
  sku: string
  name: string
  nameEn?: string
  description?: string
  unit: string
  unitPrice: number | null
  /** Internal: only members allowed to see costs get this field. */
  unitCost?: number | null
  priceSource: string
  priceUpdatedAt: string | null
  active: boolean
}

export interface QtCustomer {
  id: string
  name: string
  contactName?: string
  phone?: string
  email?: string
  createdAt: string
}

export interface QtLine {
  id: string
  /** What the buyer wrote, kept as the reference for this line. */
  requested: string
  /** Where the line came from: "نص الطلب" / "ملف: x.xlsx سطر 4". */
  sourceRef?: string
  productId: string | null
  description: string
  unit: string
  qty: number
  unitPrice: number | null
  unitCost?: number | null
  discountPct: number
  priceUpdatedAt?: string | null
  optional?: boolean
  /** Set when matching found several close products. */
  candidates?: { productId: string; name: string; score: number }[]
}

/** Commercial state of the document. */
export type DocStatus = 'draft' | 'ready' | 'sent' | 'accepted' | 'rejected' | 'expired'
/** Processing state, kept apart from DocStatus so "waiting for approval" never reads as a document status. */
export type WorkState = 'none' | 'preparing' | 'needs_info' | 'awaiting_approval'

export interface QtQuote {
  id: string
  number: string
  customerId: string
  ownerName: string
  docStatus: DocStatus
  workState: WorkState
  lines: QtLine[]
  discountPct: number
  vatRate: number
  currency: string
  validUntil: string
  paymentTerms: string
  deliveryTerms: string
  lang: 'ar' | 'en'
  version: number
  /** Info complete -> ready: the measured preparation time. */
  prepStartedAt: string | null
  prepFinishedAt: string | null
  issuedAuto: boolean
  publicToken: string
  /** Same key on a retried submit = same quote (unique per company in the database). */
  idempotencyKey?: string
  acceptedAt?: string | null
  acceptedBy?: string | null
  acceptedVersion?: number | null
  createdAt: string
  updatedAt: string
}

export interface QtVersion {
  quoteId: string
  version: number
  note: string
  by: string
  at: string
  total: number
}

export interface QtApproval {
  id: string
  quoteId: string
  reasons: string[]
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: string
  decidedBy?: string
  decidedAt?: string
  note?: string
}

export interface QtEvent {
  id: string
  quoteId: string
  kind: 'created' | 'agent' | 'edit' | 'issued' | 'sent' | 'approval' | 'accepted' | 'rejected' | 'change_request' | 'expired' | 'followup'
  body: string
  actor: string
  at: string
}
