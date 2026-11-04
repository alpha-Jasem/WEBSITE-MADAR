import type { QtLine } from '../types'
import { computeTotals } from '../pricing'
import { fmtMoney } from './common'

/** The quote as the buyer sees it: no costs, no internal notes. Printing this block gives the PDF. */

const T = {
  ar: { quote: 'عرض سعر', no: 'رقم العرض', date: 'التاريخ', valid: 'صالح حتى', to: 'إلى', item: 'البند', qty: 'الكمية', unit: 'الوحدة', price: 'سعر الوحدة', disc: 'خصم', total: 'الإجمالي',
    subtotal: 'المجموع', qdisc: 'خصم العرض', vat: 'ضريبة القيمة المضافة', grand: 'الإجمالي شامل الضريبة', pay: 'شروط الدفع', delivery: 'التسليم', optional: 'اختياري', version: 'النسخة' },
  en: { quote: 'Quotation', no: 'Quote no.', date: 'Date', valid: 'Valid until', to: 'To', item: 'Item', qty: 'Qty', unit: 'Unit', price: 'Unit price', disc: 'Disc.', total: 'Total',
    subtotal: 'Subtotal', qdisc: 'Quote discount', vat: 'VAT', grand: 'Total incl. VAT', pay: 'Payment terms', delivery: 'Delivery', optional: 'Optional', version: 'Version' },
}

export interface DocData {
  companyName: string
  logoUrl?: string | null
  customerName: string
  number: string
  version: number
  date: string
  validUntil: string
  currency: string
  vatRate: number
  discountPct: number
  lines: QtLine[]
  paymentTerms: string
  deliveryTerms: string
  lang: 'ar' | 'en'
  nameEnFor?: (productId: string | null) => string | undefined
}

export function QuoteDocument({ d }: { d: DocData }) {
  const t = T[d.lang]
  const totals = computeTotals(d.lines, d.discountPct, d.vatRate)
  const cur = d.currency === 'SAR' ? (d.lang === 'ar' ? 'ر.س' : 'SAR') : d.currency
  const dateFmt = (s: string) => new Date(s).toLocaleDateString(d.lang === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return (
    <div className="qt-doc" dir={d.lang === 'ar' ? 'rtl' : 'ltr'} lang={d.lang}>
      <style>{DOC_CSS}</style>
      <div className="qt-doc-head">
        <div>
          {d.logoUrl ? <img src={d.logoUrl} alt="" style={{ height: 40, marginBottom: 8 }} /> : null}
          <div className="qt-doc-co">{d.companyName}</div>
        </div>
        <div style={{ textAlign: d.lang === 'ar' ? 'left' : 'right' }}>
          <div className="qt-doc-title">{t.quote}</div>
          <div className="qt-doc-meta">{t.no}: <b dir="ltr">{d.number}</b> · {t.version} {d.version}</div>
          <div className="qt-doc-meta">{t.date}: {dateFmt(d.date)} · {t.valid}: {dateFmt(d.validUntil)}</div>
        </div>
      </div>
      <div className="qt-doc-to">{t.to}: <b>{d.customerName}</b></div>
      <table className="qt-doc-table">
        <thead><tr><th>#</th><th>{t.item}</th><th>{t.qty}</th><th>{t.unit}</th><th>{t.price}</th><th>{t.disc}</th><th>{t.total}</th></tr></thead>
        <tbody>
          {d.lines.map((l, i) => {
            const lt = totals.lines[i]
            const name = d.lang === 'en' ? d.nameEnFor?.(l.productId) || l.description : l.description
            return (
              <tr key={l.id} className={l.optional ? 'opt' : undefined}>
                <td>{i + 1}</td>
                <td>{name}{l.optional && <small> ({t.optional})</small>}</td>
                <td className="n">{l.qty}</td>
                <td>{l.unit}</td>
                <td className="n">{l.unitPrice == null ? '—' : fmtMoney(l.unitPrice)}</td>
                <td className="n">{l.discountPct ? `${l.discountPct}%` : '—'}</td>
                <td className="n">{fmtMoney(lt.net)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="qt-doc-totals">
        <div><span>{t.subtotal}</span><b className="n">{fmtMoney(totals.subtotal)} {cur}</b></div>
        {totals.discount > 0 && <div><span>{t.qdisc} ({d.discountPct}%)</span><b className="n">−{fmtMoney(totals.discount)} {cur}</b></div>}
        <div><span>{t.vat} ({d.vatRate}%)</span><b className="n">{fmtMoney(totals.vat)} {cur}</b></div>
        <div className="grand"><span>{t.grand}</span><b className="n">{fmtMoney(totals.total)} {cur}</b></div>
      </div>
      {(d.paymentTerms || d.deliveryTerms) && (
        <div className="qt-doc-terms">
          {d.paymentTerms && <p><b>{t.pay}:</b> {d.paymentTerms}</p>}
          {d.deliveryTerms && <p><b>{t.delivery}:</b> {d.deliveryTerms}</p>}
        </div>
      )}
    </div>
  )
}

const DOC_CSS = `
.qt-doc { background: #fff; color: #111; border-radius: 10px; padding: 28px; font-size: 13px; line-height: 1.6; box-shadow: 0 1px 0 rgba(0,0,0,.04); }
.qt-doc .n { font-variant-numeric: tabular-nums; white-space: nowrap; }
.qt-doc-head { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid #111; padding-bottom: 14px; margin-bottom: 14px; flex-wrap: wrap; }
.qt-doc-co { font-size: 17px; font-weight: 700; }
.qt-doc-title { font-size: 20px; font-weight: 700; }
.qt-doc-meta { color: #555; font-size: 12px; }
.qt-doc-to { margin-bottom: 12px; }
.qt-doc-table { width: 100%; border-collapse: collapse; }
.qt-doc-table th { text-align: start; font-size: 11.5px; color: #555; font-weight: 600; border-bottom: 1px solid #ddd; padding: 7px 6px; }
.qt-doc-table td { border-bottom: 1px solid #eee; padding: 8px 6px; vertical-align: top; }
.qt-doc-table tr.opt td { color: #777; }
.qt-doc-totals { margin-inline-start: auto; width: min(320px, 100%); margin-top: 14px; }
.qt-doc-totals > div { display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; }
.qt-doc-totals .grand { border-top: 2px solid #111; margin-top: 6px; padding-top: 8px; font-size: 15px; }
.qt-doc-terms { margin-top: 18px; padding-top: 12px; border-top: 1px solid #eee; color: #333; }
.qt-doc-terms p { margin: 0 0 4px; }
@media (max-width: 600px) { .qt-doc { padding: 16px; font-size: 12px; } .qt-doc-table { display: block; overflow-x: auto; } }
@media print { .qt-doc { box-shadow: none; border-radius: 0; padding: 0; } }
`
