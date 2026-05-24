import { X, Printer, MessageCircle, Gift } from 'lucide-react'
import type { CWQueueItem, Company, PaymentMethod } from '../../../types'

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'كاش',
  mada: 'مدى',
  visa: 'فيزا',
  bank_transfer: 'تحويل بنكي',
  stc_pay: 'STC Pay',
  other: 'أخرى',
}

interface Props {
  item: CWQueueItem
  company: Company
  paymentMethod: PaymentMethod
  onClose: () => void
}

export const CarWashReceipt = ({ item, company, paymentMethod, onClose }: Props) => {
  const receiptNo = `REC-${item.id.slice(0, 8).toUpperCase()}`
  const now = new Date()
  const dateStr = now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })

  const taxEnabled = company.tax_enabled && !item.is_free_wash
  const subtotal = item.subtotal ?? item.price
  const vatAmount = item.vat_amount ?? 0
  const totalAmount = item.is_free_wash ? 0 : (item.total_amount ?? item.price)

  const handlePrint = () => window.print()

  const handleWhatsApp = () => {
    if (!item.phone) return
    const phone = item.phone.replace(/^0/, '966').replace(/\D/g, '')
    const lines = [
      `🚗 *فاتورة غسيل سيارة*`,
      `${company.name}`,
      `─────────────────`,
      `رقم الفاتورة: ${receiptNo}`,
      `التاريخ: ${dateStr}`,
      ``,
      `الاسم: ${item.customer_name}`,
      item.car_type ? `نوع السيارة: ${item.car_type}` : '',
      item.plate ? `رقم اللوحة: ${item.plate}` : '',
      item.service_name ? `الخدمة: ${item.service_name}` : '',
      ``,
    ].filter(Boolean)

    if (item.is_free_wash) {
      lines.push(`السعر الأصلي: ${item.original_price} ر.س`)
      lines.push(`خصم الولاء: -${item.original_price} ر.س`)
      lines.push(`*الإجمالي: 0 ر.س* 🎁`)
    } else if (taxEnabled) {
      lines.push(`قبل الضريبة: ${subtotal.toFixed(2)} ر.س`)
      lines.push(`ضريبة ${company.vat_rate || 15}%: ${vatAmount.toFixed(2)} ر.س`)
      lines.push(`*الإجمالي: ${totalAmount.toFixed(2)} ر.س*`)
    } else {
      lines.push(`*الإجمالي: ${totalAmount} ر.س*`)
    }

    lines.push(``)
    lines.push(`طريقة الدفع: ${PAYMENT_LABELS[paymentMethod]}`)
    lines.push(`شكراً لزيارتكم! 🙏`)

    const text = encodeURIComponent(lines.join('\n'))
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: '#0D1422', border: '1px solid rgba(255,255,255,0.1)' }}>
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <h2 className="text-base font-bold text-white font-cairo">فاتورة</h2>
            <p className="text-xs text-slate-400 font-sora">{receiptNo}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Receipt body */}
        <div className="px-6 py-5 space-y-4 print:px-0 print:py-2" id="receipt-content">
          {/* Company */}
          <div className="text-center">
            <p className="text-lg font-bold text-white font-cairo">{company.name}</p>
            <p className="text-xs text-slate-500 font-tajawal">{dateStr} — {timeStr}</p>
          </div>

          <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)' }} />

          {/* Customer info */}
          <div className="space-y-1.5">
            <Row label="الاسم" value={item.customer_name} />
            {item.phone && <Row label="الجوال" value={item.phone} />}
            {item.car_type && <Row label="نوع السيارة" value={item.car_type} />}
            {item.plate && <Row label="رقم اللوحة" value={item.plate} />}
            {item.service_name && <Row label="الخدمة" value={item.service_name} />}
          </div>

          <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)' }} />

          {/* Price breakdown */}
          <div className="space-y-1.5">
            {item.is_free_wash ? (
              <>
                <Row label="السعر الأصلي" value={`${item.original_price} ر.س`} strikethrough />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-400 font-tajawal flex items-center gap-1">
                    <Gift size={11} /> خصم الولاء
                  </span>
                  <span className="text-xs text-amber-400 font-tajawal">-{item.original_price} ر.س</span>
                </div>
                <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <span className="text-sm font-bold text-white font-cairo">الإجمالي</span>
                  <span className="text-sm font-bold text-emerald-400 font-sora">0 ر.س 🎁</span>
                </div>
              </>
            ) : taxEnabled ? (
              <>
                <Row label="قبل الضريبة" value={`${subtotal.toFixed(2)} ر.س`} />
                <Row label={`ضريبة ${company.vat_rate || 15}%`} value={`${vatAmount.toFixed(2)} ر.س`} />
                <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <span className="text-sm font-bold text-white font-cairo">الإجمالي</span>
                  <span className="text-sm font-bold text-emerald-400 font-sora">{totalAmount.toFixed(2)} ر.س</span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white font-cairo">الإجمالي</span>
                <span className="text-sm font-bold text-emerald-400 font-sora">{totalAmount} ر.س</span>
              </div>
            )}

            {!item.is_free_wash && (
              <Row label="طريقة الدفع" value={PAYMENT_LABELS[paymentMethod]} highlight />
            )}
          </div>

          <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)' }} />

          <p className="text-center text-xs text-slate-600 font-tajawal">شكراً لزيارتكم — نتطلع لخدمتكم مجدداً 🙏</p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 rounded-xl text-sm font-tajawal flex items-center justify-center gap-2 transition-all hover:opacity-80"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8' }}
          >
            <Printer size={14} />
            طباعة
          </button>
          {item.phone && (
            <button
              onClick={handleWhatsApp}
              className="flex-1 py-2.5 rounded-xl text-sm font-tajawal flex items-center justify-center gap-2 transition-all hover:opacity-80"
              style={{ background: 'rgba(37,211,102,0.15)', border: '1px solid rgba(37,211,102,0.3)', color: '#25D366' }}
            >
              <MessageCircle size={14} />
              واتساب
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-tajawal transition-all hover:opacity-80"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: 'white' }}
          >
            إغلاق
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          body > *:not(.fixed) { display: none !important; }
          .fixed { position: static !important; background: white !important; }
          #receipt-content { color: black !important; }
        }
      `}</style>
    </div>
  )
}

function Row({ label, value, strikethrough, highlight }: { label: string; value: string; strikethrough?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500 font-tajawal">{label}</span>
      <span
        className={`text-xs font-tajawal ${highlight ? 'text-primary-400' : 'text-slate-300'} ${strikethrough ? 'line-through text-slate-500' : ''}`}
      >
        {value}
      </span>
    </div>
  )
}
