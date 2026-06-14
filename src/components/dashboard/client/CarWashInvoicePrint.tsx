import { useRef } from 'react'
import { Printer, X } from 'lucide-react'

export interface InvoiceItem {
  id: string
  name: string
  price: number
  qty: number
}

export interface InvoiceData {
  visitId: string
  invoiceNo: string
  items: InvoiceItem[]
  customerName?: string | null
  customerPhone?: string | null
  plate?: string | null
  subtotal: number
  vatAmount: number
  total: number
  discount: number
  paymentMethod: string
  date: string
}

interface Props {
  data: InvoiceData
  company: {
    name: string
    owner_name?: string
    owner_phone?: string
    vat_number?: string | null
    commercial_reg?: string | null
    address?: string | null
    logo_url?: string | null
    tax_enabled?: boolean
    print_footer?: string | null
  }
  onClose: () => void
}

const PM_LABELS: Record<string, string> = {
  cash: 'نقد',
  mada: 'مدى',
  visa: 'فيزا',
  card: 'بطاقة',
  transfer: 'تحويل بنكي',
  bank_transfer: 'تحويل بنكي',
  stc_pay: 'STC Pay',
}

const PRINT_STYLE = `
@media print {
  body > * { display: none !important; }
  .cw-invoice-printarea { display: block !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; padding: 12mm 14mm !important; background: white !important; z-index: 999999 !important; }
  .cw-invoice-noprint { display: none !important; }
}
`

export function CarWashInvoicePrint({ data, company, onClose }: Props) {
  const printAreaRef = useRef<HTMLDivElement>(null)

  const dateStr = new Date(data.date).toLocaleString('ar-SA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true,
  })

  const payLabel = PM_LABELS[data.paymentMethod] || data.paymentMethod
  const itemCount = data.items.reduce((s, i) => s + i.qty, 0)
  const taxEnabled = company.tax_enabled !== false
  const showVat = taxEnabled && data.vatAmount > 0

  const handlePrint = () => {
    const el = printAreaRef.current
    if (!el) return
    const win = window.open('', '_blank', 'width=900,height=750')
    if (!win) { window.print(); return }
    win.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>فاتورة</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Cairo,Tajawal,Arial,sans-serif;padding:14mm 16mm;color:#111;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 10px;text-align:right}th{background:#f5f5f5;font-weight:700}img{max-height:64px;max-width:180px;object-fit:contain}@media print{body{padding:8mm 12mm}}</style></head><body>${el.innerHTML}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 350)
  }

  return (
    <>
      <style>{PRINT_STYLE}</style>

      {/* Backdrop */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,20,40,0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

        {/* Modal card */}
        <div style={{ position: 'relative', width: '92vw', maxWidth: 720, maxHeight: '94vh', overflowY: 'auto', background: '#FFFFFF', borderRadius: 16, boxShadow: '0 30px 80px rgba(0,0,0,0.22)' }}>

          {/* Action row (hidden on print) */}
          <div className="cw-invoice-noprint" style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 20px', background: '#FFF', borderBottom: '1px solid #F0F0F0' }}>
            <span style={{ fontSize: 15, fontWeight: 900, fontFamily: 'Cairo, sans-serif', color: '#111827' }}>فاتورة ضريبية مبسطة</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handlePrint}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, border: 'none', background: '#0EA5A5', color: '#fff', fontSize: 13, fontFamily: 'Cairo, sans-serif', fontWeight: 700, cursor: 'pointer' }}
              >
                <Printer size={15} /> طباعة
              </button>
              <button
                onClick={onClose}
                style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ── Invoice Body ── */}
          <div
            ref={printAreaRef}
            className="cw-invoice-printarea"
            dir="rtl"
            style={{ padding: '28px 32px', fontFamily: 'Cairo, Tajawal, sans-serif', color: '#111' }}
          >

            {/* Logo */}
            {company.logo_url && (
              <div style={{ textAlign: 'center', marginBottom: 14 }}>
                <img src={company.logo_url} alt="logo" style={{ maxHeight: 64, maxWidth: 180, objectFit: 'contain' }} />
              </div>
            )}

            {/* Page title */}
            <h1 style={{ textAlign: 'center', fontSize: 18, fontWeight: 900, margin: '0 0 22px', letterSpacing: 0.5 }}>
              {taxEnabled ? 'فاتورة ضريبية مبسطة' : 'فاتورة'}
            </h1>

            {/* Header: company (right) + customer (left) */}
            <div style={{ display: 'flex', border: '1px solid #CCC', marginBottom: 20 }}>

              {/* RIGHT: company info */}
              <div style={{ flex: 1, padding: '14px 16px', borderLeft: '1px solid #CCC' }}>
                <p style={{ margin: '0 0 5px', fontSize: 15, fontWeight: 900 }}>{company.name}</p>
                {company.address && (
                  <p style={{ margin: '0 0 4px', fontSize: 11.5, color: '#444', lineHeight: 1.5 }}>{company.address}</p>
                )}
                {company.vat_number ? (
                  <p style={{ margin: '0 0 3px', fontSize: 11.5 }}>
                    <strong>الرقم الضريبي: </strong>{company.vat_number}
                  </p>
                ) : null}
                {company.commercial_reg ? (
                  <p style={{ margin: '0 0 3px', fontSize: 11.5 }}>
                    <strong>السجل التجاري: </strong>{company.commercial_reg}
                  </p>
                ) : null}
                <p style={{ margin: '0 0 3px', fontSize: 11.5 }}>
                  <strong>رقم الفاتورة: </strong>{data.invoiceNo}
                </p>
                <p style={{ margin: '0 0 3px', fontSize: 11.5 }}>
                  <strong>نوع الفاتورة: </strong>فاتورة بيع
                </p>
                <p style={{ margin: 0, fontSize: 11.5 }}>
                  <strong>تاريخ الفاتورة: </strong>{dateStr}
                </p>
              </div>

              {/* LEFT: customer info */}
              <div style={{ flex: 1, padding: '14px 16px' }}>
                {company.owner_name && (
                  <p style={{ margin: '0 0 4px', fontSize: 11.5 }}>
                    <strong>اسم المستخدم: </strong>{company.owner_name}
                  </p>
                )}
                <p style={{ margin: '0 0 4px', fontSize: 11.5 }}>
                  <strong>اسم العميل: </strong>{data.customerName || 'عميل نقدي'}
                </p>
                {data.customerPhone && (
                  <p style={{ margin: '0 0 4px', fontSize: 11.5, direction: 'ltr', textAlign: 'right' }}>
                    <strong style={{ direction: 'rtl', display: 'inline-block', marginLeft: 4 }}>رقم العميل: </strong>
                    {data.customerPhone}
                  </p>
                )}
                {data.plate && (
                  <p style={{ margin: '0 0 4px', fontSize: 11.5 }}>
                    <strong>رقم اللوحة: </strong>{data.plate}
                  </p>
                )}
                <p style={{ margin: 0, fontSize: 11.5 }}>
                  <strong>عنوان العميل: </strong>المملكة العربية السعودية
                </p>
              </div>
            </div>

            {/* Products table */}
            {(() => {
              const headers = showVat
                ? ['كمية', 'اسم المنتج', 'السعر غير شامل الضريبة', 'الضريبة', 'الإجمالي (شامل الضريبة)']
                : ['كمية', 'اسم المنتج', 'الإجمالي']
              return (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#F5F5F5' }}>
                      {headers.map(h => (
                        <th key={h} style={{ padding: '8px 10px', border: '1px solid #CCC', textAlign: 'center', fontWeight: 900, fontSize: 11.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: '12px', textAlign: 'center', color: '#999', fontFamily: 'Tajawal' }}>لا توجد بنود</td></tr>
                    )}
                    {data.items.map((item, i) => {
                      const lineTotal = item.price * item.qty
                      const vatDivisor = 1 + (data.vatAmount && data.subtotal ? (data.vatAmount / data.subtotal) : 0.15)
                      const lineSub   = showVat ? lineTotal / vatDivisor : lineTotal
                      const lineVat   = showVat ? lineTotal - lineSub : 0
                      return (
                        <tr key={i}>
                          <td style={{ padding: '8px 10px', border: '1px solid #DDD', textAlign: 'center' }}>{item.qty}x</td>
                          <td style={{ padding: '8px 10px', border: '1px solid #DDD', fontWeight: 700 }}>{item.name}</td>
                          {showVat && (
                            <td style={{ padding: '8px 10px', border: '1px solid #DDD', textAlign: 'center', direction: 'ltr' }}>
                              {lineSub.toFixed(2)} ر.س
                            </td>
                          )}
                          {showVat && (
                            <td style={{ padding: '8px 10px', border: '1px solid #DDD', textAlign: 'center', direction: 'ltr' }}>
                              {lineVat.toFixed(2)} ر.س / 15%
                            </td>
                          )}
                          <td style={{ padding: '8px 10px', border: '1px solid #DDD', textAlign: 'center', fontWeight: 900, direction: 'ltr' }}>
                            {lineTotal.toFixed(2)} ر.س
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )
            })()}

            {/* Summary section */}
            <div style={{ border: '1px solid #CCC', marginBottom: 22, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 14px', borderBottom: '1px solid #EEE' }}>
                <strong>إجمالي العناصر</strong><span>{itemCount}</span>
              </div>
              {showVat && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 14px', borderBottom: '1px solid #EEE' }}>
                  <strong>الإجمالي غير شامل للضريبة</strong>
                  <span dir="ltr">{data.subtotal.toFixed(2)} ر.س</span>
                </div>
              )}
              {data.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 14px', borderBottom: '1px solid #EEE', color: '#D00' }}>
                  <strong>إجمالي الخصم</strong>
                  <span dir="ltr">- {data.discount.toFixed(2)} ر.س</span>
                </div>
              )}
              {showVat && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 14px', borderBottom: '1px solid #EEE' }}>
                  <strong>ضريبة القيمة المضافة (15%)</strong>
                  <span dir="ltr">{data.vatAmount.toFixed(2)} ر.س</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', borderBottom: '1px solid #EEE', fontWeight: 900, fontSize: 13, background: '#F9FAFB' }}>
                <strong>الإجمالي {showVat ? '(شامل الضريبة)' : ''}</strong>
                <span dir="ltr">{data.total.toFixed(2)} ر.س</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 14px', borderBottom: '1px solid #EEE' }}>
                <strong>المبلغ المدفوع ({payLabel})</strong>
                <span dir="ltr">{data.total.toFixed(2)} ر.س</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 14px', color: '#777', fontSize: 11 }}>
                <span>Pay{data.invoiceNo}</span>
                <span></span>
              </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', borderTop: '1px solid #DDD', paddingTop: 14 }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 900 }}>{company.name} - SA</p>
              {company.print_footer
                ? <p style={{ margin: 0, fontSize: 12, color: '#555', whiteSpace: 'pre-wrap' }}>{company.print_footer}</p>
                : <p style={{ margin: 0, fontSize: 12, color: '#777' }}>شكراً لزيارتكم</p>
              }
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
