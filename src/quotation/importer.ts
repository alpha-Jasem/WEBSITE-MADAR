import type { QtProduct } from './types'
import type { RequestItem } from './matching'
import { normalize } from './matching'

/** Excel / CSV for the catalog and for buyer request lists. Pure functions; reading the file is done by readSheet(). */

const HEADERS: Record<string, keyof RowDraft> = {
  sku: 'sku', code: 'sku', 'رمز': 'sku', 'الرمز': 'sku', 'كود': 'sku', 'رقم الصنف': 'sku',
  name: 'name', product: 'name', item: 'name', 'اسم': 'name', 'الاسم': 'name', 'المنتج': 'name', 'الصنف': 'name', 'البند': 'name', 'الوصف': 'name',
  'name en': 'nameEn', english: 'nameEn', 'الاسم بالانجليزي': 'nameEn',
  unit: 'unit', uom: 'unit', 'الوحده': 'unit', 'وحده': 'unit',
  price: 'price', 'unit price': 'price', 'السعر': 'price', 'سعر': 'price', 'سعر الوحده': 'price',
  cost: 'cost', 'التكلفه': 'cost', 'تكلفه': 'cost',
  qty: 'qty', quantity: 'qty', 'الكميه': 'qty', 'كميه': 'qty', 'العدد': 'qty',
}

interface RowDraft { sku?: string; name?: string; nameEn?: string; unit?: string; price?: string; cost?: string; qty?: string }

function mapRow(row: Record<string, unknown>): RowDraft {
  const out: RowDraft = {}
  for (const [k, v] of Object.entries(row)) {
    const key = HEADERS[normalize(String(k))]
    if (key && v != null && String(v).trim() !== '') out[key] = String(v).trim()
  }
  return out
}

const toNum = (s?: string) => {
  if (s == null) return null
  const n = Number(normalize(s).replace(/[^\d.]/g, ''))
  return Number.isFinite(n) && normalize(s).replace(/[^\d.]/g, '') !== '' ? n : NaN
}

export interface ImportPreview {
  rows: { row: number; product: Omit<QtProduct, 'id'>; existingId: string | null }[]
  errors: { row: number; message: string }[]
}

export function previewCatalog(rows: Record<string, unknown>[], existing: QtProduct[], source: string): ImportPreview {
  const out: ImportPreview = { rows: [], errors: [] }
  const seen = new Set<string>()
  rows.forEach((raw, i) => {
    const row = i + 2 // header is row 1
    const r = mapRow(raw)
    if (!r.name) { out.errors.push({ row, message: 'بدون اسم منتج' }); return }
    const price = toNum(r.price)
    const cost = toNum(r.cost)
    if (Number.isNaN(price)) { out.errors.push({ row, message: `السعر «${r.price}» ليس رقمًا` }); return }
    if (Number.isNaN(cost)) { out.errors.push({ row, message: `التكلفة «${r.cost}» ليست رقمًا` }); return }
    const sku = r.sku || ''
    const key = sku ? `s:${normalize(sku)}` : `n:${normalize(r.name)}`
    if (seen.has(key)) { out.errors.push({ row, message: `مكرر في الملف (${sku || r.name})` }); return }
    seen.add(key)
    const match = existing.find((p) => (sku && normalize(p.sku) === normalize(sku)) || (!sku && normalize(p.name) === normalize(r.name!)))
    out.rows.push({
      row,
      existingId: match?.id ?? null,
      product: {
        sku, name: r.name, nameEn: r.nameEn, unit: r.unit || 'حبة', unitPrice: price, unitCost: cost,
        priceSource: source, priceUpdatedAt: price != null ? new Date().toISOString() : null, active: true,
      },
    })
  })
  return out
}

/** A buyer's list (Excel/CSV): one item per row, keeping the file and row as the line's reference. */
export function requestItemsFromRows(rows: Record<string, unknown>[], fileName: string): RequestItem[] {
  const items: RequestItem[] = []
  rows.forEach((raw, i) => {
    const r = mapRow(raw)
    const text = [r.sku, r.name].filter(Boolean).join(' ')
    if (!text) return
    const q = toNum(r.qty)
    items.push({ text, qty: q == null || Number.isNaN(q) ? null : q, sourceRef: `ملف: ${fileName} سطر ${i + 2}` })
  })
  return items
}

/** Reads the first sheet of an .xlsx/.xls/.csv file into header-keyed rows. */
export async function readSheet(file: File): Promise<Record<string, unknown>[]> {
  const XLSX = await import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return ws ? XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' }) : []
}
