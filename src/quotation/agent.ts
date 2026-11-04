import type { QtLine, QtProduct } from './types'
import { lineFromProduct, matchItem, normalize } from './matching'

/**
 * In-context edits on a quote ("غيّر كمية الكراسي إلى 50", "خصم 5%", "احذف الطابعة", "أضف 2 تركيب",
 * "اقترح بديل أقل تكلفة للشاشة"). Deterministic rules: the result is checked by evaluate() like any
 * other edit, and anything it can't read is answered with what it understood, never with a guess.
 */

export interface AgentResult {
  lines?: QtLine[]
  discountPct?: number
  reply: string
  changed: boolean
}

const AR: Record<string, string> = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9', '٫': '.' }
const num = (s: string) => s.replace(/[٠-٩٫]/g, (d) => AR[d])

/** The quote line a phrase refers to: by matching its words against each line's description. */
function findLine(phrase: string, lines: QtLine[]): QtLine | null {
  // Arabic attaches prepositions and the article to the word: "لكرسي" / "بالطابعه" / "الكراسي".
  const stem = (w: string) => (w.length > 3 ? w.replace(/^(?:[لبوف]?ال|[لبوف])(?=.{3})/, '') : w)
  const words = normalize(phrase).split(' ').filter((w) => w.length > 2).map(stem)
  let best: { l: QtLine; hit: number } | null = null
  for (const l of lines) {
    const d = normalize(`${l.description} ${l.requested}`)
    const hit = words.filter((w) => d.includes(w)).length
    if (hit > 0 && (!best || hit > best.hit)) best = { l, hit }
  }
  return best?.l ?? (lines.length === 1 ? lines[0] : null)
}

export function runAgentCommand(input: string, lines: QtLine[], catalog: QtProduct[], focusLineId?: string | null): AgentResult {
  const text = num(input.trim())
  const n = normalize(text)
  const focus = focusLineId ? lines.find((l) => l.id === focusLineId) ?? null : null

  // Quote-level discount: "خصم 5%" / "خصم العرض 5"
  const disc = n.match(/^(?:طبق\s+|اعط\s+)?خصم(?:\s+العرض)?\s+(\d+(?:\.\d+)?)\s*(?:%|بالميه)?$/)
  if (disc) {
    const pct = Number(disc[1])
    return { discountPct: pct, reply: `طبّقت خصم ${pct}% على العرض. تحقّقت القواعد من جديد.`, changed: true }
  }

  // Quantity: "غير الكمية الى 50" / "كمية الكراسي 50" / "خل الطابعات 3"
  const qty = n.match(/(?:غير|عدل|خل|خلي|اجعل|خله)?\s*(?:كميه|الكميه)?\s*(.*?)\s*(?:الي|الى|إلى|=|:)?\s*(\d+(?:\.\d+)?)\s*(?:حبه|قطعه)?$/)
  if (/كميه|غير|عدل|خل|اجعل/.test(n) && qty) {
    const target = focus ?? findLine(qty[1] || '', lines)
    if (!target) return { reply: 'ما عرفت أي بند تقصد. اذكر اسم البند، مثل: غيّر كمية الكراسي إلى 50.', changed: false }
    const value = Number(qty[2])
    return {
      lines: lines.map((l) => (l.id === target.id ? { ...l, qty: value } : l)),
      reply: `غيّرت كمية «${target.description}» إلى ${value}.`, changed: true,
    }
  }

  // Remove: "احذف الطابعه"
  const del = n.match(/^(?:احذف|شيل|الغ|امسح)\s+(.+)$/)
  if (del) {
    const target = focus ?? findLine(del[1], lines)
    if (!target) return { reply: 'ما لقيت البند اللي تقصده في العرض.', changed: false }
    return { lines: lines.filter((l) => l.id !== target.id), reply: `حذفت «${target.description}».`, changed: true }
  }

  // Add: "اضف 2 تركيب"
  const add = n.match(/^(?:اضف|زد|زيد)\s+(\d+(?:\.\d+)?)?\s*(.+)$/)
  if (add) {
    const m = matchItem(add[2], catalog)
    if (!m.product) {
      return { reply: m.candidates.length
        ? `«${add[2]}» يطابق: ${m.candidates.map((c) => c.name).join('، ')}. حدّد أي واحد.`
        : `«${add[2]}» غير موجود في الكتالوج. أضفه للمنتجات أولًا أو اطلب تسعيره.`, changed: false }
    }
    const qtyAdd = add[1] ? Number(add[1]) : 1
    return { lines: [...lines, lineFromProduct(m.product, qtyAdd, input)], reply: `أضفت ${qtyAdd} × «${m.product.name}».`, changed: true }
  }

  // Cheaper alternative: same leading word in the catalog, lower price.
  if (/بديل|ارخص|اقل تكلفه|اقل سعر/.test(n)) {
    const target = focus ?? findLine(n.replace(/اقترح|بديل|ارخص|اقل تكلفه|اقل سعر|لل|ل /g, ' '), lines)
    if (!target || target.unitPrice == null) return { reply: 'حدّد البند اللي تبي له بديل.', changed: false }
    const head = normalize(target.description).split(' ')[0]
    const alt = catalog
      .filter((p) => p.active && p.id !== target.productId && p.unitPrice != null && p.unitPrice < target.unitPrice! && normalize(p.name).split(' ')[0] === head)
      .sort((a, b) => b.unitPrice! - a.unitPrice!)[0]
    if (!alt) return { reply: `ما فيه بديل أرخص لـ«${target.description}» في الكتالوج.`, changed: false }
    return {
      lines: lines.map((l) => (l.id === target.id ? { ...lineFromProduct(alt, l.qty, l.requested, l.sourceRef), id: l.id } : l)),
      reply: `استبدلت «${target.description}» بـ«${alt.name}» (${alt.unitPrice} بدل ${target.unitPrice}).`, changed: true,
    }
  }

  return { reply: 'أقدر: أغيّر كمية بند، أحذف أو أضيف بندًا، أطبّق خصمًا، أو أقترح بديلًا أرخص. مثال: «غيّر كمية الكراسي إلى 50».', changed: false }
}
