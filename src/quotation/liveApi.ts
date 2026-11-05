import { supabase } from '@/lib/supabase'
import type { QtApproval, QtCustomer, QtEvent, QtProduct, QtQuote, QtSettings, QtVersion } from './types'
import { computeTotals } from './pricing'
import { DEMO_SETTINGS } from './demoData'

/** Reads and writes the qt_* tables. RLS limits every query to the signed-in member's company. */

type Row = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data
}

const settingsFrom = (r: Row | null): QtSettings => r ? {
  currency: r.currency, vatRate: Number(r.vat_rate), validityDays: r.validity_days,
  autoIssueMaxTotal: r.auto_issue_max_total == null ? null : Number(r.auto_issue_max_total),
  maxDiscountPct: Number(r.max_discount_pct), minMarginPct: Number(r.min_margin_pct), priceMaxAgeDays: r.price_max_age_days,
  paymentTerms: r.payment_terms, deliveryTerms: r.delivery_terms, quotePrefix: r.quote_prefix,
} : { ...DEMO_SETTINGS, paymentTerms: '', deliveryTerms: '' }

const quoteFrom = (r: Row): QtQuote => ({
  id: r.id, number: r.number, customerId: r.customer_id, ownerName: r.owner_name, docStatus: r.doc_status, workState: r.work_state,
  lines: r.lines ?? [], discountPct: Number(r.discount_pct), vatRate: Number(r.vat_rate), currency: r.currency, validUntil: r.valid_until,
  paymentTerms: r.payment_terms, deliveryTerms: r.delivery_terms, lang: r.lang, version: r.version,
  prepStartedAt: r.prep_started_at, prepFinishedAt: r.prep_finished_at, issuedAuto: r.issued_auto, publicToken: r.public_token,
  acceptedAt: r.accepted_at, acceptedBy: r.accepted_by, acceptedVersion: r.accepted_version, createdAt: r.created_at, updatedAt: r.updated_at,
})

export const live = {
  async isEnabled(companyId: string) {
    const { data, error } = await supabase.from('companies').select('products').eq('id', companyId).maybeSingle()
    if (error) return false // column not migrated yet
    return Array.isArray((data as Row | null)?.products) && (data as Row).products.includes('quotation')
  },

  async loadAll(companyId: string, canSeeCosts: boolean) {
    const [s, p, c, q, a, v, e, costs] = await Promise.all([
      supabase.from('qt_settings').select('*').eq('company_id', companyId).maybeSingle(),
      supabase.from('qt_products').select('*').eq('company_id', companyId).order('name'),
      supabase.from('qt_customers').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
      supabase.from('qt_quotes').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(500),
      supabase.from('qt_approvals').select('*').eq('company_id', companyId).order('requested_at', { ascending: false }),
      supabase.from('qt_quote_versions').select('quote_id, version, note, created_by, created_at, total').eq('company_id', companyId),
      supabase.from('qt_events').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(300),
      canSeeCosts ? supabase.from('qt_product_costs').select('product_id, unit_cost').eq('company_id', companyId) : Promise.resolve({ data: [], error: null }),
    ])
    const costMap = new Map<string, number | null>((check(costs) as Row[] ?? []).map((r) => [r.product_id, r.unit_cost == null ? null : Number(r.unit_cost)]))
    const quotes = (check(q) as Row[]).map(quoteFrom)
    if (!canSeeCosts) for (const x of quotes) x.lines = x.lines.map((l) => ({ ...l, unitCost: undefined }))
    return {
      settings: settingsFrom(check(s) as Row | null),
      products: (check(p) as Row[]).map((r): QtProduct => ({
        id: r.id, sku: r.sku, name: r.name, nameEn: r.name_en ?? undefined, description: r.description ?? undefined, unit: r.unit,
        unitPrice: r.unit_price == null ? null : Number(r.unit_price), unitCost: canSeeCosts ? costMap.get(r.id) ?? null : undefined,
        priceSource: r.price_source, priceUpdatedAt: r.price_updated_at, active: r.active,
      })),
      customers: (check(c) as Row[]).map((r): QtCustomer => ({ id: r.id, name: r.name, contactName: r.contact_name ?? undefined, phone: r.phone ?? undefined, email: r.email ?? undefined, createdAt: r.created_at })),
      quotes,
      approvals: (check(a) as Row[]).map((r): QtApproval => ({ id: r.id, quoteId: r.quote_id, reasons: r.reasons, status: r.status, requestedAt: r.requested_at, decidedBy: r.decided_by ?? undefined, decidedAt: r.decided_at ?? undefined, note: r.note ?? undefined })),
      versions: (check(v) as Row[]).map((r): QtVersion => ({ quoteId: r.quote_id, version: r.version, note: r.note, by: r.created_by, at: r.created_at, total: Number(r.total) })),
      events: (check(e) as Row[]).map((r): QtEvent => ({ id: r.id, quoteId: r.quote_id, kind: r.kind, body: r.body, actor: r.actor, at: r.created_at })),
    }
  },

  async nextNumber(_companyId: string): Promise<string> {
    const { data, error } = await supabase.rpc('qt_next_number')
    if (error) throw new Error(error.message)
    return data as string
  },

  async saveQuote(companyId: string, q: QtQuote) {
    const totals = computeTotals(q.lines, q.discountPct, q.vatRate)
    check(await supabase.from('qt_quotes').upsert({
      id: q.id, company_id: companyId, number: q.number, customer_id: q.customerId, owner_name: q.ownerName,
      doc_status: q.docStatus, work_state: q.workState, lines: q.lines, discount_pct: q.discountPct, vat_rate: q.vatRate, currency: q.currency,
      valid_until: q.validUntil, payment_terms: q.paymentTerms, delivery_terms: q.deliveryTerms, lang: q.lang, version: q.version,
      totals: { subtotal: totals.subtotal, discount: totals.discount, taxable: totals.taxable, vat: totals.vat, total: totals.total },
      prep_started_at: q.prepStartedAt, prep_finished_at: q.prepFinishedAt, issued_auto: q.issuedAuto, public_token: q.publicToken, idempotency_key: q.idempotencyKey ?? null,
      accepted_at: q.acceptedAt ?? null, accepted_by: q.acceptedBy ?? null, accepted_version: q.acceptedVersion ?? null, updated_at: q.updatedAt,
    }))
  },

  async saveVersion(companyId: string, v: QtVersion, q: QtQuote) {
    await supabase.from('qt_quote_versions').upsert({
      quote_id: q.id, company_id: companyId, version: v.version, snapshot: q, total: v.total, note: v.note, created_by: v.by,
    }, { onConflict: 'quote_id,version' })
  },

  async saveApproval(companyId: string, a: QtApproval) {
    check(await supabase.from('qt_approvals').upsert({
      id: a.id, company_id: companyId, quote_id: a.quoteId, reasons: a.reasons, status: a.status,
      requested_at: a.requestedAt, decided_by: a.decidedBy ?? null, decided_at: a.decidedAt ?? null, note: a.note ?? null,
    }))
  },

  async addEvent(companyId: string, e: QtEvent) {
    await supabase.from('qt_events').insert({ company_id: companyId, id: e.id, quote_id: e.quoteId, kind: e.kind, body: e.body, actor: e.actor })
  },

  async saveCustomer(companyId: string, c: QtCustomer) {
    check(await supabase.from('qt_customers').upsert({
      id: c.id, company_id: companyId, name: c.name, contact_name: c.contactName ?? null, phone: c.phone ?? null, email: c.email ?? null,
    }))
  },

  async saveCustomers(companyId: string, list: QtCustomer[]) {
    for (let i = 0; i < list.length; i += 500) {
      check(await supabase.from('qt_customers').upsert(list.slice(i, i + 500).map((c) => ({
        id: c.id, company_id: companyId, name: c.name, contact_name: c.contactName ?? null, phone: c.phone ?? null, email: c.email ?? null,
      }))))
    }
  },

  async saveProduct(companyId: string, p: QtProduct, canSeeCosts: boolean) {
    const row = check(await supabase.from('qt_products').upsert({
      id: p.id, company_id: companyId, sku: p.sku, name: p.name, name_en: p.nameEn ?? null, description: p.description ?? null,
      unit: p.unit, unit_price: p.unitPrice, price_source: p.priceSource, price_updated_at: p.priceUpdatedAt, active: p.active,
    }).select('id').single()) as Row
    if (canSeeCosts && p.unitCost !== undefined) {
      check(await supabase.from('qt_product_costs').upsert({ product_id: row.id, company_id: companyId, unit_cost: p.unitCost, updated_at: new Date().toISOString() }))
    }
  },

  async saveSettings(companyId: string, s: QtSettings) {
    check(await supabase.from('qt_settings').upsert({
      company_id: companyId, currency: s.currency, vat_rate: s.vatRate, validity_days: s.validityDays, auto_issue_max_total: s.autoIssueMaxTotal,
      max_discount_pct: s.maxDiscountPct, min_margin_pct: s.minMarginPct, price_max_age_days: s.priceMaxAgeDays,
      payment_terms: s.paymentTerms, delivery_terms: s.deliveryTerms, quote_prefix: s.quotePrefix, updated_at: new Date().toISOString(),
    }))
  },

  async publicQuote(token: string) {
    const { data, error } = await supabase.rpc('qt_public_quote', { p_token: token })
    if (error) throw new Error(error.message)
    return data as Row | null
  },

  async buyerRespond(token: string, version: number, action: { kind: 'accept'; name: string } | { kind: 'change'; name: string; note: string }) {
    const { data, error } = await supabase.rpc('qt_public_respond', {
      p_token: token, p_version: version, p_action: action.kind, p_name: action.name, p_note: action.kind === 'change' ? action.note : '',
    })
    if (error) return { ok: false, message: 'تعذر إرسال الرد، حاول مرة ثانية.' }
    return data as { ok: boolean; message: string }
  },
}
