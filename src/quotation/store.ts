import { useRef, useSyncExternalStore } from 'react'
import type { QtApproval, QtCustomer, QtEvent, QtLine, QtProduct, QtQuote, QtSettings, QtVersion } from './types'
import { evaluate, type Verdict } from './pricing'
import { buildLines, type RequestItem } from './matching'
const uid = () => crypto.randomUUID()
import { DEMO_APPROVALS, DEMO_CUSTOMERS, DEMO_EVENTS, DEMO_PRODUCTS, DEMO_QUOTES, DEMO_SETTINGS, DEMO_VERSIONS } from './demoData'
import { live } from './liveApi'

/**
 * One store for the Quotation dashboard. The demo keeps everything in memory; a live company reads
 * and writes the qt_* tables (row-level security scopes every row to the member's company). Every
 * mutation re-runs evaluate(), so the work state always follows the rules, never a manual flag.
 */

export interface QtState {
  mode: 'demo' | 'live'
  status: 'idle' | 'loading' | 'ready' | 'error' | 'not_enabled'
  error: string | null
  companyId: string | null
  companyName: string
  actor: string
  canSeeCosts: boolean
  canApprove: boolean
  settings: QtSettings
  products: QtProduct[]
  customers: QtCustomer[]
  quotes: QtQuote[]
  approvals: QtApproval[]
  versions: QtVersion[]
  events: QtEvent[]
  /** idempotency key -> quote id, so a retried submit returns the same quote. */
  keys: Record<string, string>
}

let state: QtState = {
  mode: 'demo', status: 'idle', error: null, companyId: null, companyName: '', actor: '', canSeeCosts: false, canApprove: false,
  settings: DEMO_SETTINGS, products: [], customers: [], quotes: [], approvals: [], versions: [], events: [], keys: {},
}
const listeners = new Set<() => void>()
function set(patch: Partial<QtState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb) } }
/** Selectors may build new arrays; the result is cached per state object so React sees a stable snapshot. */
export function useQt<T>(select: (s: QtState) => T): T {
  const cache = useRef<{ s: QtState | null; f: unknown; v: T }>({ s: null, f: null, v: undefined as T })
  return useSyncExternalStore(subscribe, () => {
    if (cache.current.s !== state || cache.current.f !== select) cache.current = { s: state, f: select, v: select(state) }
    return cache.current.v
  })
}
export const getQt = () => state

const now = () => new Date().toISOString()
const today = () => new Date().toISOString().slice(0, 10)

export async function initQuotation(opts: { demo: boolean; companyId: string | null; companyName: string; actor: string; isOwner: boolean; role: string | null }) {
  const canSeeCosts = opts.demo || opts.isOwner || opts.role === 'manager'
  if (opts.demo) {
    if (state.mode === 'demo' && state.status === 'ready') return
    set({
      mode: 'demo', status: 'ready', error: null, companyId: 'demo', companyName: 'شركة الأثاث المكتبي', actor: 'أنت',
      canSeeCosts, canApprove: true, settings: DEMO_SETTINGS, products: DEMO_PRODUCTS, customers: DEMO_CUSTOMERS,
      quotes: DEMO_QUOTES, approvals: DEMO_APPROVALS, versions: DEMO_VERSIONS, events: DEMO_EVENTS, keys: {},
    })
    expireDue()
    return
  }
  if (!opts.companyId) return
  set({ mode: 'live', status: 'loading', error: null, companyId: opts.companyId, companyName: opts.companyName, actor: opts.actor, canSeeCosts, canApprove: canSeeCosts })
  try {
    const enabled = await live.isEnabled(opts.companyId)
    if (!enabled) { set({ status: 'not_enabled' }); return }
    const data = await live.loadAll(opts.companyId, canSeeCosts)
    set({ ...data, status: 'ready', keys: {} })
    expireDue()
  } catch (e) {
    set({ status: 'error', error: e instanceof Error ? e.message : 'تعذر تحميل بيانات عروض الأسعار' })
  }
}

/* ── helpers ─────────────────────────────────────────────────────────── */

export function verdictFor(q: Pick<QtQuote, 'lines' | 'discountPct'>, s = state.settings): Verdict {
  return evaluate(q.lines, q.discountPct, s)
}

function addEvent(quoteId: string, kind: QtEvent['kind'], body: string, actor = state.actor) {
  const e: QtEvent = { id: uid(), quoteId, kind, body, actor, at: now() }
  set({ events: [e, ...state.events] })
  if (state.mode === 'live') void live.addEvent(state.companyId!, e)
}

async function saveQuote(q: QtQuote) {
  set({ quotes: state.quotes.some((x) => x.id === q.id) ? state.quotes.map((x) => (x.id === q.id ? q : x)) : [q, ...state.quotes] })
  if (state.mode === 'live') await live.saveQuote(state.companyId!, q)
}

/**
 * Applies the rules to a quote that is still being worked on: needs info, needs approval, or ready.
 * A ready/sent quote that is edited goes back to draft so it is re-checked before it leaves again.
 */
function settle(q: QtQuote, opts: { auto?: boolean } = {}): QtQuote {
  const v = verdictFor(q)
  if (q.docStatus === 'accepted' || q.docStatus === 'rejected' || q.docStatus === 'expired') return q
  if (v.needsInfo) return { ...q, docStatus: 'draft', workState: 'needs_info' }
  if (v.needsApproval) {
    const approved = state.approvals.some((a) => a.quoteId === q.id && a.status === 'approved' && a.reasons.join('|') === approvalKey(v))
    if (approved) return { ...q, docStatus: q.docStatus === 'sent' ? 'sent' : 'ready', workState: 'none', prepFinishedAt: q.prepFinishedAt ?? now() }
    // The agent's work is done here; the wait for a person is not counted as preparation time.
    return { ...q, docStatus: 'draft', workState: 'awaiting_approval', prepFinishedAt: q.prepFinishedAt ?? now() }
  }
  return {
    ...q, docStatus: q.docStatus === 'sent' ? 'sent' : 'ready', workState: 'none',
    prepFinishedAt: q.prepFinishedAt ?? now(), issuedAuto: opts.auto ? true : q.issuedAuto,
  }
}

const approvalKey = (v: Verdict) => v.issues.filter((i) => i.level === 'approval').map((i) => i.message).join('|')

function ensureApprovalRequest(q: QtQuote) {
  if (q.workState !== 'awaiting_approval') return
  const v = verdictFor(q)
  const reasons = v.issues.filter((i) => i.level === 'approval').map((i) => i.message)
  const pending = state.approvals.find((a) => a.quoteId === q.id && a.status === 'pending')
  if (pending && pending.reasons.join('|') === reasons.join('|')) return
  const next = state.approvals.filter((a) => !(a.quoteId === q.id && a.status === 'pending'))
  const a: QtApproval = { id: uid(), quoteId: q.id, reasons, status: 'pending', requestedAt: now() }
  set({ approvals: [a, ...next] })
  if (state.mode === 'live') void live.saveApproval(state.companyId!, a)
  addEvent(q.id, 'approval', `طلب موافقة: ${reasons.join('، ')}`, 'الوكيل')
}

async function nextNumber(): Promise<string> {
  if (state.mode === 'live') return live.nextNumber(state.companyId!)
  const max = state.quotes.reduce((m, q) => Math.max(m, Number(q.number.replace(/\D/g, '')) || 0), 1000)
  return `${state.settings.quotePrefix}-${max + 1}`
}

const token = () => Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, '0')).join('')

/* ── customers ───────────────────────────────────────────────────────── */

export async function upsertCustomer(c: Omit<QtCustomer, 'id' | 'createdAt'> & { id?: string }): Promise<QtCustomer> {
  const existing = c.id ? state.customers.find((x) => x.id === c.id) : state.customers.find((x) => x.name.trim() === c.name.trim())
  const row: QtCustomer = { ...(existing ?? { id: uid(), createdAt: now() }), ...c, id: existing?.id ?? c.id ?? uid() } as QtCustomer
  set({ customers: existing ? state.customers.map((x) => (x.id === row.id ? row : x)) : [row, ...state.customers] })
  if (state.mode === 'live') await live.saveCustomer(state.companyId!, row)
  return row
}

/* ── the agent journey: request -> quote ─────────────────────────────── */

export interface NewRequest {
  idempotencyKey: string
  customerId: string
  items: RequestItem[]
}

/** Info is complete when this is called; the time from here to "ready" is the measured prep time. */
export async function createQuoteFromRequest(r: NewRequest): Promise<QtQuote> {
  const known = state.keys[r.idempotencyKey]
  if (known) return state.quotes.find((q) => q.id === known)!
  const started = now()
  const lines = buildLines(r.items, state.products.filter((p) => p.active))
  const s = state.settings
  const id = uid()
  set({ keys: { ...state.keys, [r.idempotencyKey]: id } })
  let q: QtQuote = {
    id, number: await nextNumber(), customerId: r.customerId, ownerName: state.actor, docStatus: 'draft', workState: 'preparing',
    lines, discountPct: 0, vatRate: s.vatRate, currency: s.currency,
    validUntil: new Date(Date.now() + s.validityDays * 86400000).toISOString().slice(0, 10),
    paymentTerms: s.paymentTerms, deliveryTerms: s.deliveryTerms, lang: 'ar', version: 1,
    prepStartedAt: started, prepFinishedAt: null, issuedAuto: false, publicToken: token(), idempotencyKey: r.idempotencyKey, createdAt: started, updatedAt: started,
  }
  q = settle(q, { auto: true })
  await saveQuote(q)
  addVersion(q, 'جهّزها الوكيل من طلب العميل', 'الوكيل')
  addEvent(q.id, 'created', `جهّز الوكيل العرض من ${r.items.length} بند`, 'الوكيل')
  if (q.workState === 'needs_info') addEvent(q.id, 'agent', 'بانتظار معلومة: ' + verdictFor(q).issues.filter((i) => i.level === 'blocking').map((i) => i.message).join('، '), 'الوكيل')
  if (q.docStatus === 'ready') addEvent(q.id, 'issued', 'أصدر الوكيل العرض تلقائيًا ضمن القواعد المعتمدة', 'الوكيل')
  ensureApprovalRequest(q)
  return q
}

function addVersion(q: QtQuote, note: string, by = state.actor) {
  const v: QtVersion = { quoteId: q.id, version: q.version, note, by, at: now(), total: verdictFor(q).totals.total }
  set({ versions: [...state.versions.filter((x) => !(x.quoteId === q.id && x.version === q.version)), v] })
  if (state.mode === 'live') void live.saveVersion(state.companyId!, v, q)
}

/** Any edit: new version, rules re-run, and an accepted/sent link now points to the new version. */
export async function editQuote(id: string, patch: Partial<Pick<QtQuote, 'lines' | 'discountPct' | 'validUntil' | 'paymentTerms' | 'deliveryTerms' | 'lang' | 'customerId'>>, note: string) {
  const q = state.quotes.find((x) => x.id === id)
  if (!q || q.docStatus === 'accepted') return
  const wasOut = q.docStatus === 'sent' || q.docStatus === 'ready'
  let next: QtQuote = { ...q, ...patch, version: q.version + 1, updatedAt: now(), docStatus: wasOut ? 'draft' : q.docStatus, issuedAuto: false }
  if (next.docStatus === 'rejected' || next.docStatus === 'expired') next = { ...next, docStatus: 'draft' }
  next = settle(next)
  await saveQuote(next)
  addVersion(next, note)
  addEvent(id, 'edit', note)
  ensureApprovalRequest(next)
}

export async function setLines(id: string, lines: QtLine[], note: string) { await editQuote(id, { lines }, note) }

export async function decideApproval(approvalId: string, decision: 'approved' | 'rejected', note?: string) {
  const a = state.approvals.find((x) => x.id === approvalId)
  if (!a || a.status !== 'pending' || !state.canApprove) return
  const done: QtApproval = { ...a, status: decision, decidedBy: state.actor, decidedAt: now(), note }
  set({ approvals: state.approvals.map((x) => (x.id === a.id ? done : x)) })
  if (state.mode === 'live') await live.saveApproval(state.companyId!, done)
  addEvent(a.quoteId, 'approval', decision === 'approved' ? `وافق ${state.actor}: ${a.reasons.join('، ')}` : `رفض ${state.actor} الاستثناء${note ? `: ${note}` : ''}`)
  const q = state.quotes.find((x) => x.id === a.quoteId)
  if (q) await saveQuote(settle(q))
}

/** Sending = the buyer gets the secure link. Nothing leaves Madar automatically here: the user shares the link. */
export async function markSent(id: string) {
  const q = state.quotes.find((x) => x.id === id)
  if (!q || q.docStatus !== 'ready') return
  await saveQuote({ ...q, docStatus: 'sent', updatedAt: now() })
  addEvent(id, 'sent', 'تم تجهيز رابط العرض للمشاركة مع العميل')
}

export async function setDocStatus(id: string, status: 'rejected', note: string) {
  const q = state.quotes.find((x) => x.id === id)
  if (!q) return
  await saveQuote({ ...q, docStatus: status, workState: 'none', updatedAt: now() })
  addEvent(id, 'rejected', note)
}

export function expireDue() {
  for (const q of state.quotes) {
    if ((q.docStatus === 'sent' || q.docStatus === 'ready') && q.validUntil < today()) {
      void saveQuote({ ...q, docStatus: 'expired', updatedAt: now() })
      addEvent(q.id, 'expired', 'انتهت صلاحية العرض', 'النظام')
    }
  }
}

/* ── buyer link ──────────────────────────────────────────────────────── */

export type BuyerAction = { kind: 'accept'; name: string } | { kind: 'change'; name: string; note: string }

/** The buyer may only accept the current version of a sent quote that has not expired. */
export async function buyerRespond(tokenValue: string, version: number, action: BuyerAction): Promise<{ ok: boolean; message: string }> {
  if (state.mode === 'live') return live.buyerRespond(tokenValue, version, action)
  const q = state.quotes.find((x) => x.publicToken === tokenValue)
  if (!q) return { ok: false, message: 'الرابط غير صالح' }
  if (q.validUntil < today() || q.docStatus === 'expired') return { ok: false, message: 'انتهت صلاحية هذا العرض. اطلب نسخة محدّثة.' }
  if (q.version !== version) return { ok: false, message: 'تم تحديث العرض بعد فتحك له. حدّث الصفحة وراجع النسخة الحالية.' }
  if (q.docStatus !== 'sent') return { ok: false, message: q.docStatus === 'accepted' ? 'تم قبول هذا العرض مسبقًا.' : 'هذا العرض غير متاح للقبول الآن.' }
  if (!action.name.trim()) return { ok: false, message: 'اكتب اسمك' }
  if (action.kind === 'accept') {
    await saveQuote({ ...q, docStatus: 'accepted', acceptedAt: now(), acceptedBy: action.name.trim(), acceptedVersion: q.version, updatedAt: now() })
    addEvent(q.id, 'accepted', `قبل ${action.name.trim()} النسخة ${q.version}`, action.name.trim())
    return { ok: true, message: `تم قبول العرض ${q.number} (النسخة ${q.version}). سيتواصل معك فريق المبيعات لإكمال الطلب.` }
  }
  addEvent(q.id, 'change_request', `طلب تعديل من ${action.name.trim()}: ${action.note}`, action.name.trim())
  await saveQuote({ ...q, docStatus: 'draft', workState: 'needs_info', updatedAt: now() })
  return { ok: true, message: 'وصل طلب التعديل. بنرسل لك نسخة محدّثة بعد مراجعته.' }
}

/* ── catalog & settings ──────────────────────────────────────────────── */

export async function saveProduct(p: QtProduct) {
  const exists = state.products.some((x) => x.id === p.id)
  set({ products: exists ? state.products.map((x) => (x.id === p.id ? p : x)) : [p, ...state.products] })
  if (state.mode === 'live') await live.saveProduct(state.companyId!, p, state.canSeeCosts)
}

export async function importProducts(rows: { product: Omit<QtProduct, 'id'>; existingId: string | null }[]) {
  for (const r of rows) {
    const prev = r.existingId ? state.products.find((p) => p.id === r.existingId) : null
    await saveProduct({ ...(prev ?? {}), ...r.product, id: r.existingId ?? uid(), unitCost: r.product.unitCost ?? prev?.unitCost ?? null })
  }
}

export async function saveSettings(s: QtSettings) {
  set({ settings: s })
  if (state.mode === 'live') await live.saveSettings(state.companyId!, s)
}
