import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, Search, Clock, Upload, Download } from 'lucide-react'
import { NightPage, Kpi, CardTitle, Seg, EmptyLine } from '@/dashboard/pages/shared/night'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useQt, verdictFor, decideApproval } from '../../store'
import type { DocStatus } from '../../types'
import { NewQuoteDialog } from '../NewQuoteDialog'
import { QuoteStatus, fmtAgo, fmtDuration, fmtMoney, prepSeconds } from '../common'
import { exportCustomers } from './Customers'

const PERIODS = [[7, '7 أيام'], [30, '30 يوم'], [90, '90 يوم']] as const
const CLOSED: DocStatus[] = ['accepted', 'rejected', 'expired']

const STAGES: { label: string; match: DocStatus[]; bar: string; fg: string }[] = [
  { label: 'مسودة', match: ['draft'], bar: 'color-mix(in srgb, var(--muted) 22%, transparent)', fg: 'var(--ink)' },
  { label: 'جاهز', match: ['ready'], bar: 'linear-gradient(90deg, #6F7891, #A9B0C2)', fg: '#0A0F2C' },
  { label: 'مُرسل', match: ['sent'], bar: 'linear-gradient(90deg, #B4BBCB, #E6E9EF)', fg: '#0A0F2C' },
  { label: 'مقبول', match: ['accepted'], bar: 'linear-gradient(90deg, #0A6CFF, #1550FF 45%, #7B2BFF)', fg: '#FFFFFF' },
  { label: 'مرفوض ومنتهي', match: ['rejected', 'expired'], bar: 'color-mix(in srgb, #7B2BFF 38%, transparent)', fg: 'var(--ink)' },
]

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

  const total = (q: (typeof quotes)[number]) => verdictFor(q).totals.total
  const since = Date.now() - days * 86400000
  const inPeriod = quotes.filter((q) => new Date(q.createdAt).getTime() >= since)
  const openQuotes = quotes.filter((q) => !CLOSED.includes(q.docStatus))
  const openValue = openQuotes.reduce((s, q) => s + total(q), 0)
  const thisWeek = quotes.filter((q) => new Date(q.createdAt).getTime() >= Date.now() - 7 * 86400000).length
  const accepted = inPeriod.filter((q) => q.docStatus === 'accepted')
  const acceptedValue = accepted.reduce((s, q) => s + total(q), 0)
  const decided = inPeriod.filter((q) => ['sent', ...CLOSED].includes(q.docStatus)).length
  const preps = inPeriod.map(prepSeconds).filter((x): x is number => x != null)
  const avgPrep = preps.length ? preps.reduce((a, b) => a + b, 0) / preps.length : null
  const custName = (id: string) => customers.find((c) => c.id === id)?.name ?? '—'

  const stages = STAGES.map((st) => {
    const list = inPeriod.filter((q) => st.match.includes(q.docStatus))
    return { ...st, n: list.length, sum: list.reduce((s, q) => s + total(q), 0) }
  })
  const maxN = Math.max(1, ...stages.map((s) => s.n))

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
      <style>{HOME_CSS}</style>

      <section className="qh-hero">
        <div className="qh-lead">
          <span className="qh-eyebrow">قيمة العروض المفتوحة الآن</span>
          <div className="qh-big"><b className="qt-num">{fmtMoney(openValue)}</b><span>ر.س</span></div>
          <p className="qh-say">
            {quotes.length === 0
              ? 'ما فيه عروض بعد. اضغط «عرض جديد بالوكيل» وخلّ الوكيل يجهّز أول عرض.'
              : <>الوكيل جهّز <b>{thisWeek}</b> عرض هذا الأسبوع{decisions.length ? <>، و<b>{decisions.length}</b> تنتظر قرارك.</> : '، وما فيه شي ينتظرك.'}</>}
          </p>
          <div className="qh-cta">
            <button type="button" className="qt-btn pri qh-lg" onClick={() => setOpen(true)}><Bot size={16} /> عرض جديد بالوكيل</button>
            {decisions.length > 0 && <a className="qt-btn qh-lg" href="#qh-decisions">راجع القرارات ({decisions.length})</a>}
          </div>
        </div>

        <div className="qt-card qh-funnel">
          <div className="qh-funnel-head">
            <CardTitle style={{ margin: 0 }}>مسار العروض</CardTitle>
            <Seg label="الفترة" options={PERIODS} value={days as 7 | 30 | 90} onChange={(v) => setDays(v)} />
          </div>
          {stages.map((s) => (
            <div key={s.label} className="qh-stage">
              <span className="qh-stage-l">{s.label}</span>
              <div className="qh-track">{s.n ? <div style={{ width: `${Math.max(12, (s.n / maxN) * 100)}%`, background: s.bar, color: s.fg }}>{s.n}</div> : <em>0</em>}</div>
              <span className="qh-stage-v qt-num">{fmtMoney(s.sum)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="np-kpis">
        <Kpi label="عروض الفترة" value={inPeriod.length} hint={`${inPeriod.filter((q) => q.issuedAuto).length} أصدرها الوكيل تلقائيًا`} />
        <Kpi label="قيمة المقبول" value={<span className="qt-num">{fmtMoney(acceptedValue)}</span>} hint="شامل الضريبة، ر.س" />
        <Kpi label="نسبة القبول" value={decided ? `${Math.round((accepted.length / decided) * 100)}%` : '—'} hint="من العروض المرسلة" />
        <Kpi label="متوسط زمن التجهيز" value={fmtDuration(avgPrep)} hint="من اكتمال الطلب إلى العرض الجاهز" />
      </div>

      <div className="qh-grid">
        <section className="qt-card qh-list">
          <div className="qh-list-head">
            <CardTitle style={{ margin: 0 }} aside={query ? `${found.length} نتيجة` : undefined}>آخر العروض</CardTitle>
            <label className="qh-search">
              <Search size={15} />
              <input className="qt-input" placeholder="ابحث بالعميل أو رقم العرض" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="بحث" />
            </label>
          </div>
          {found.length === 0 ? <EmptyLine>ما فيه عروض</EmptyLine> : found.slice(0, 8).map((q) => {
            const name = custName(q.customerId)
            return (
              <button key={q.id} type="button" className="qh-row" onClick={() => navigate(`${base}/q/${q.id}`)}>
                <span className="qh-avatar">{name.trim().charAt(0) || '؟'}</span>
                <span className="qh-row-main"><b>{name}</b><small><span className="qt-num">{q.number}</span> · {fmtAgo(q.updatedAt)}</small></span>
                <span className="qh-row-v qt-num">{fmtMoney(total(q))}</span>
                <QuoteStatus q={q} />
              </button>
            )
          })}
          {quotes.length > 8 && <button type="button" className="np-link" style={{ margin: '10px auto 0' }} onClick={() => navigate(`${base}/quotes`)}>كل العروض ({quotes.length})</button>}
        </section>

        <div className="qh-side">
          <section className="qt-card" id="qh-decisions">
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
          </section>

          <section className="qt-card qh-customers">
            <CardTitle aside={`${customers.length} عميل`}>العملاء</CardTitle>
            <p>استورد قائمتك من Excel مرة وحدة، والوكيل يتعرّف على العميل لما يطلب عرض.</p>
            <div className="qh-cta">
              <button type="button" className="qt-btn pri" onClick={() => navigate(`${base}/customers?import=1`)}><Upload size={15} /> استيراد Excel</button>
              <button type="button" className="qt-btn" onClick={() => exportCustomers(customers, quotes)}><Download size={15} /> تصدير</button>
            </div>
          </section>

          <section className="qt-card">
            <CardTitle>نشاط الوكيل</CardTitle>
            {events.length === 0 ? <EmptyLine>ما فيه نشاط بعد</EmptyLine> : events.slice(0, 6).map((e) => (
              <div key={e.id} className="np-row">
                <Clock size={14} style={{ color: 'var(--dim)', flex: 'none' }} />
                <div className="np-row-main"><b style={{ fontSize: 13 }}>{e.body}</b><small>{e.actor} · {fmtAgo(e.at)}</small></div>
              </div>
            ))}
          </section>
        </div>
      </div>
      <NewQuoteDialog open={open} onClose={() => setOpen(false)} base={base} />
    </NightPage>
  )
}

const HOME_CSS = `
.qh-hero { display: flex; flex-wrap: wrap; gap: 28px; align-items: stretch; }
.qh-lead { flex: 1 1 340px; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 12px; }
.qh-eyebrow { font-size: 13px; color: var(--muted); }
.qh-big { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.qh-big b { font-size: clamp(36px, 5vw, 56px); font-weight: 600; letter-spacing: -1.5px; line-height: 1.15; color: var(--ink); }
.qr:not([data-theme="light"]) .qh-big b { background: linear-gradient(180deg, #FFFFFF 20%, #B4BBCB); -webkit-background-clip: text; background-clip: text; color: transparent; }
.qh-big span { font-size: 16px; color: var(--muted); }
.qh-say { margin: 0; font-size: 14.5px; color: var(--muted); line-height: 1.8; }
.qh-say b { color: var(--ink); font-weight: 600; }
.qh-cta { display: flex; gap: 10px; flex-wrap: wrap; }
.qt-btn.qh-lg { height: 46px; padding: 0 22px; font-size: 14px; }
.qh-funnel { flex: 1.4 1 460px; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
.qh-funnel-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
.qh-stage { display: flex; align-items: center; gap: 12px; }
.qh-stage-l { width: 92px; flex: none; font-size: 12.5px; color: var(--muted); }
.qh-track { flex: 1; height: 30px; border-radius: 8px; background: var(--hover-bg); overflow: hidden; position: relative; }
.qh-track > div { height: 100%; border-radius: 8px; display: flex; align-items: center; padding: 0 10px; box-sizing: border-box; font-size: 12.5px; font-weight: 500; transition: width .4s var(--ease-out); }
.qh-track > em { position: absolute; inset-inline-start: 10px; top: 6px; font-style: normal; font-size: 12px; color: var(--dim); }
.qh-stage-v { width: 110px; flex: none; text-align: left; font-size: 12.5px; color: var(--muted); }
.qh-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 16px; align-items: start; }
.qh-side { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.qh-list { display: flex; flex-direction: column; gap: 6px; }
.qh-list-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 6px; }
.qh-search { position: relative; flex: 0 1 280px; min-width: 180px; }
.qh-search svg { position: absolute; inset-inline-start: 12px; top: 10px; color: var(--dim); }
.qh-search .qt-input { padding-inline-start: 34px; border-radius: 999px; }
.qh-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; width: 100%; padding: 10px; border: 0; border-radius: 12px; background: var(--hover-bg); color: inherit; font: inherit; text-align: start; cursor: pointer; }
.qh-row:hover { background: var(--nav-active-bg); }
.qh-avatar { width: 38px; height: 38px; border-radius: 10px; flex: none; display: grid; place-items: center; font-size: 14px; background: var(--raise); color: var(--info); }
.qh-row-main { flex: 1 1 160px; min-width: 0; display: flex; flex-direction: column; }
.qh-row-main b { font-weight: 500; font-size: 14px; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.qh-row-main small { font-size: 12px; color: var(--dim); }
.qh-row-v { font-size: 14px; color: var(--ink); }
.qh-customers p { margin: 0 0 12px; font-size: 13px; color: var(--muted); line-height: 1.7; }
.qr:not([data-theme="light"]) .qh-customers { background: linear-gradient(150deg, rgba(21,80,255,.22), rgba(123,43,255,.16)); border-color: rgba(160,176,255,.28); }
@media (max-width: 1000px) { .qh-grid { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 520px) { .qh-stage-l { width: 64px; } .qh-stage-v { width: 84px; font-size: 11.5px; } }
`
