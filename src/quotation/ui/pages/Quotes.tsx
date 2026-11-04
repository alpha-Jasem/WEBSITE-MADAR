import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot } from 'lucide-react'
import { NightPage, PageHead, Seg, EmptyLine } from '@/dashboard/pages/shared/night'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useQt, verdictFor } from '../../store'
import type { DocStatus, QtQuote } from '../../types'
import { QuoteStatus, fmtAgo, fmtMoney } from '../common'
import { NewQuoteDialog } from '../NewQuoteDialog'

export function QuotesTable({ quotes, base }: { quotes: QtQuote[]; base: string }) {
  const navigate = useNavigate()
  const customers = useQt((s) => s.customers)
  if (quotes.length === 0) return <EmptyLine>ما فيه عروض</EmptyLine>
  return (
    <div className="np-table-wrap">
      <table className="np-table">
        <thead><tr><th>العميل</th><th>الرقم</th><th>القيمة</th><th>الحالة</th><th>المسؤول</th><th>آخر تحديث</th></tr></thead>
        <tbody>
          {quotes.map((q) => (
            <tr key={q.id} className="clickable" tabIndex={0} onClick={() => navigate(`${base}/q/${q.id}`)} onKeyDown={(e) => { if (e.key === 'Enter') navigate(`${base}/q/${q.id}`) }}>
              <td className="strong">{customers.find((c) => c.id === q.customerId)?.name ?? '—'}</td>
              <td><span className="qt-num">{q.number}</span></td>
              <td><span className="qt-num">{fmtMoney(verdictFor(q).totals.total)}</span></td>
              <td><QuoteStatus q={q} /></td>
              <td>{q.ownerName}</td>
              <td>{fmtAgo(q.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const FILTERS = [['all', 'الكل'], ['work', 'يحتاج تدخل'], ['draft', 'مسودة'], ['ready', 'جاهز'], ['sent', 'مُرسل'], ['accepted', 'مقبول'], ['closed', 'مرفوض ومنتهي']] as const
type Filter = typeof FILTERS[number][0]

export function QtQuotes() {
  const { isDemo } = useWorkspace()
  const base = isDemo ? '/quotation-demo' : '/quotation'
  const quotes = useQt((s) => s.quotes)
  const [f, setF] = useState<Filter>('all')
  const [open, setOpen] = useState(false)
  const match = (q: QtQuote) => {
    if (f === 'all') return true
    if (f === 'work') return q.workState !== 'none'
    if (f === 'closed') return (['rejected', 'expired'] as DocStatus[]).includes(q.docStatus)
    return q.docStatus === f
  }
  const list = quotes.filter(match)
  return (
    <NightPage>
      <PageHead title="عروض الأسعار" sub={`${quotes.length} عرض`} actions={<button type="button" className="qt-btn pri" onClick={() => setOpen(true)}><Bot size={15} /> إنشاء عرض بالوكيل</button>} />
      <Seg label="تصفية" options={FILTERS} value={f} onChange={setF} />
      <div className="qt-card"><QuotesTable quotes={list} base={base} /></div>
      <NewQuoteDialog open={open} onClose={() => setOpen(false)} base={base} />
    </NightPage>
  )
}
