import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, Search, Clock } from 'lucide-react'
import { NightPage, PageHead, Kpi, CardTitle, Seg, EmptyLine } from '@/dashboard/pages/shared/night'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useQt, verdictFor, decideApproval } from '../../store'
import { NewQuoteDialog } from '../NewQuoteDialog'
import { QuotesTable } from './Quotes'
import { fmtAgo, fmtDuration, fmtMoney, prepSeconds } from '../common'

const PERIODS = [[7, '7 أيام'], [30, '30 يوم'], [90, '90 يوم']] as const

export function QtHome() {
  const navigate = useNavigate()
  const { isDemo } = useWorkspace()
  const base = isDemo ? '/quotation-demo' : '/quotation'
  const quotes = useQt((s) => s.quotes)
  const customers = useQt((s) => s.customers)
  const approvals = useQt((s) => s.approvals)
  const events = useQt((s) => s.events)
  const canApprove = useQt((s) => s.canApprove)
  const [days, setDays] = useState<number>(30)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const since = Date.now() - days * 86400000
  const inPeriod = quotes.filter((q) => new Date(q.createdAt).getTime() >= since)
  const acceptedValue = inPeriod.filter((q) => q.docStatus === 'accepted').reduce((s, q) => s + verdictFor(q).totals.total, 0)
  const preps = inPeriod.map(prepSeconds).filter((x): x is number => x != null)
  const avgPrep = preps.length ? preps.reduce((a, b) => a + b, 0) / preps.length : null
  const custName = (id: string) => customers.find((c) => c.id === id)?.name ?? '—'

  const decisions = useMemo(() => {
    const out: { id: string; quoteId: string; number: string; customer: string; reason: string; owner: string; kind: 'approval' | 'info'; approvalId?: string }[] = []
    for (const a of approvals.filter((x) => x.status === 'pending')) {
      const q = quotes.find((x) => x.id === a.quoteId)
      if (q) out.push({ id: a.id, quoteId: q.id, number: q.number, customer: custName(q.customerId), reason: a.reasons.join('، '), owner: 'صاحب الصلاحية', kind: 'approval', approvalId: a.id })
    }
    for (const q of quotes.filter((x) => x.workState === 'needs_info')) {
      const blocking = verdictFor(q).issues.filter((i) => i.level === 'blocking').map((i) => i.message)
      out.push({ id: q.id, quoteId: q.id, number: q.number, customer: custName(q.customerId), reason: blocking.join('، ') || 'طلب تعديل من العميل', owner: q.ownerName, kind: 'info' })
    }
    return out
  }, [approvals, quotes, customers]) // eslint-disable-line react-hooks/exhaustive-deps

  const found = query.trim()
    ? quotes.filter((q) => q.number.toLowerCase().includes(query.trim().toLowerCase()) || custName(q.customerId).includes(query.trim()))
    : quotes

  return (
    <NightPage>
      <PageHead
        title="عروض الأسعار"
        sub="الوكيل يجهّز العرض من طلب العميل، ويرفع لك الاستثناءات فقط."
        actions={<>
          <Seg label="الفترة" options={PERIODS} value={days as 7 | 30 | 90} onChange={(v) => setDays(v)} />
          <button type="button" className="qt-btn pri" onClick={() => setOpen(true)}><Bot size={15} /> إنشاء عرض بالوكيل</button>
        </>}
      />
      <label style={{ position: 'relative', display: 'block' }}>
        <Search size={15} style={{ position: 'absolute', insetInlineStart: 10, top: 11, color: 'var(--dim)' }} />
        <input className="qt-input" style={{ paddingInlineStart: 32 }} placeholder="ابحث بالعميل أو رقم العرض" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="بحث" />
      </label>

      <div className="np-kpis">
        <Kpi label="عروض الفترة" value={inPeriod.length} hint={`${inPeriod.filter((q) => q.issuedAuto).length} أصدرها الوكيل تلقائيًا`} />
        <Kpi label="قيمة المقبول" value={<span className="qt-num">{fmtMoney(acceptedValue)}</span>} hint="شامل الضريبة، ر.س" />
        <Kpi label="تحتاج تدخل" value={decisions.length} hint="موافقات ومعلومات ناقصة" />
        <Kpi label="متوسط زمن التجهيز" value={fmtDuration(avgPrep)} hint="من اكتمال الطلب إلى العرض الجاهز" />
      </div>

      <div className="qt-card">
        <CardTitle aside={`${decisions.length}`}>يحتاج قرارك</CardTitle>
        {decisions.length === 0 ? <EmptyLine>ما فيه شي ينتظرك. الوكيل يكمل الباقي.</EmptyLine> : decisions.map((d) => (
          <div key={d.id} className="np-row">
            <div className="np-row-main">
              <b><span className="qt-num">{d.number}</span> · {d.customer}</b>
              <small>{d.kind === 'approval' ? 'موافقة: ' : 'معلومة ناقصة: '}{d.reason}</small>
              <small>المسؤول: {d.owner}</small>
            </div>
            {d.kind === 'approval' && canApprove ? (
              <span style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="qt-btn sm pri" onClick={() => decideApproval(d.approvalId!, 'approved')}>موافقة</button>
                <button type="button" className="qt-btn sm" onClick={() => navigate(`${base}/q/${d.quoteId}`)}>مراجعة</button>
              </span>
            ) : (
              <button type="button" className="qt-btn sm" onClick={() => navigate(`${base}/q/${d.quoteId}`)}>{d.kind === 'info' ? 'أكمل المعلومة' : 'فتح'}</button>
            )}
          </div>
        ))}
      </div>

      <div className="np-grid-2">
        <div className="qt-card">
          <CardTitle aside={query ? `${found.length} نتيجة` : undefined}>العروض</CardTitle>
          <QuotesTable quotes={found.slice(0, 8)} base={base} />
        </div>
        <div className="qt-card">
          <CardTitle>نشاط الوكيل</CardTitle>
          {events.length === 0 ? <EmptyLine>ما فيه نشاط بعد</EmptyLine> : events.slice(0, 8).map((e) => (
            <div key={e.id} className="np-row">
              <Clock size={14} style={{ color: 'var(--dim)', flex: 'none' }} />
              <div className="np-row-main"><b style={{ fontSize: 13 }}>{e.body}</b><small>{e.actor} · {fmtAgo(e.at)}</small></div>
            </div>
          ))}
        </div>
      </div>
      <NewQuoteDialog open={open} onClose={() => setOpen(false)} base={base} />
    </NightPage>
  )
}
