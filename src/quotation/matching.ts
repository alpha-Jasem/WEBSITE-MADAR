import type { QtLine, QtProduct } from './types'

/**
 * Turns what a buyer wrote into quote lines and matches them to the catalog. Deterministic: the same
 * request and catalog always give the same result, and nothing is guessed. A line with no clear match
 * stays unmatched (or ambiguous with candidates) so the agent asks instead of picking.
 */

const AR_DIGITS: Record<string, string> = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9', '٫': '.' }

export function normalize(s: string) {
  return s
    .replace(/[٠-٩٫]/g, (d) => AR_DIGITS[d])
    .replace(/[ً-ْـ]/g, '') // tashkeel, tatweel
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}.\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const STOP = new Set(['و', 'من', 'في', 'على', 'مع', 'حبه', 'حبات', 'قطعه', 'قطع', 'عدد', 'pcs', 'pc', 'x', 'the', 'and', 'of', 'ال'])

function tokens(s: string) {
  return normalize(s).split(' ')
    .map((t) => (t.length > 3 && t.startsWith('ال') ? t.slice(2) : t))
    .filter((t) => t && !STOP.has(t))
}

export interface RequestItem { text: string; qty: number | null; sourceRef: string; /** Set when someone picked the product explicitly. */ productId?: string }

/** One item per line: "50 كرسي مكتب", "كرسي مكتب × 50", "كرسي مكتب: 50", "- 2 طابعة". */
export function parseRequest(raw: string, sourceRef = 'نص الطلب'): RequestItem[] {
  const items: RequestItem[] = []
  // Bullets and list numbers ("1." "2)") are markers, not quantities.
  const lines = raw.split(/\r?\n|،|;/).map((l) => l.replace(/^\s*(?:[-–•*]|[\d٠-٩]+[.)])\s*/, '').trim()).filter(Boolean)
  for (const line of lines) {
    const n = line.replace(/[٠-٩٫]/g, (d) => AR_DIGITS[d])
    let qty: number | null = null
    let text = n
    const lead = n.match(/^(\d+(?:\.\d+)?)\s*(?:x|×|\*)?\s+(.+)$/i)
    const trail = n.match(/^(.+?)\s*(?:x|×|\*|:|=|-|عدد)\s*(\d+(?:\.\d+)?)\s*$/i)
    if (lead) { qty = Number(lead[1]); text = lead[2] }
    else if (trail) { qty = Number(trail[2]); text = trail[1] }
    text = text.trim()
    if (text.length < 2) continue
    items.push({ text, qty, sourceRef })
  }
  return items
}

export interface Match { product: QtProduct | null; score: number; candidates: { productId: string; name: string; score: number }[] }

export function matchItem(text: string, catalog: QtProduct[]): Match {
  const live = catalog.filter((p) => p.active)
  const norm = normalize(text)
  const bySku = live.find((p) => p.sku && norm.split(' ').includes(normalize(p.sku)))
  if (bySku) return { product: bySku, score: 1, candidates: [] }
  const t = new Set(tokens(text))
  if (t.size === 0) return { product: null, score: 0, candidates: [] }
  const scored = live.map((p) => {
    const pt = new Set([...tokens(p.name), ...(p.nameEn ? tokens(p.nameEn) : [])])
    let hit = 0
    for (const x of t) if (pt.has(x)) hit++
    // How much of the request is covered, weighted with how much of the product name it uses.
    const nameTokens = tokens(p.name).length || 1
    const score = hit === 0 ? 0 : (hit / t.size) * 0.6 + (hit / nameTokens) * 0.4
    return { p, score: Math.round(score * 100) / 100 }
  }).filter((s) => s.score > 0).sort((a, b) => b.score - a.score)
  const top = scored[0]
  const second = scored[1]
  const clear = top && top.score >= 0.75 && (!second || top.score - second.score >= 0.2)
  if (clear) return { product: top.p, score: top.score, candidates: [] }
  const candidates = scored.filter((s) => s.score >= 0.3).slice(0, 3).map((s) => ({ productId: s.p.id, name: s.p.name, score: s.score }))
  return { product: null, score: top?.score ?? 0, candidates }
}

let seq = 0
export const newId = (p = 'l') => `${p}_${Date.now().toString(36)}_${(seq++).toString(36)}`

export function lineFromProduct(p: QtProduct, qty: number, requested: string, sourceRef?: string): QtLine {
  return {
    id: newId(), requested, sourceRef, productId: p.id, description: p.name, unit: p.unit, qty,
    unitPrice: p.unitPrice, unitCost: p.unitCost ?? null, discountPct: 0, priceUpdatedAt: p.priceUpdatedAt,
  }
}

/** Request items -> quote lines. A missing quantity becomes 0 so the rules ask for it. */
export function buildLines(items: RequestItem[], catalog: QtProduct[]): QtLine[] {
  return items.map((it) => {
    const picked = it.productId ? catalog.find((p) => p.id === it.productId) : undefined
    const m = picked ? { product: picked, candidates: [] } : matchItem(it.text, catalog)
    if (m.product) return lineFromProduct(m.product, it.qty ?? 0, it.text, it.sourceRef)
    return {
      id: newId(), requested: it.text, sourceRef: it.sourceRef, productId: null, description: it.text, unit: '',
      qty: it.qty ?? 0, unitPrice: null, unitCost: null, discountPct: 0, candidates: m.candidates,
    }
  })
}
