import { useState } from 'react'
import { NightPage, PageHead, Kpi, Seg, CardTitle, Meter, EmptyLine } from '@/dashboard/pages/shared/night'
import { useQt, verdictFor } from '../../store'
import { fmtDuration, fmtMoney, prepSeconds } from '../common'

const PERIODS = [[30, '30 يوم'], [90, '90 يوم'], [365, 'سنة']] as const

export function QtAnalytics() {
  const quotes = useQt((s) => s.quotes)
  const versions = useQt((s) => s.versions)
  const events = useQt((s) => s.events)
  const approvals = useQt((s) => s.approvals)
  const [days, setDays] = useState<number>(90)
  const since = Date.now() - days * 86400000
  const list = quotes.filter((q) => new Date(q.createdAt).getTime() >= since)
  const ids = new Set(list.map((q) => q.id))

  const preps = list.map(prepSeconds).filter((x): x is number => x != null).sort((a, b) => a - b)
  const median = preps.length ? preps[Math.floor(preps.length / 2)] : null
  const withinTarget = preps.filter((s) => s <= 120).length
  const issued = list.filter((q) => q.prepFinishedAt)
  const auto = issued.filter((q) => q.issuedAuto).length
  const humanEdits = versions.filter((v) => ids.has(v.quoteId) && v.by !== 'الوكيل' && v.version > 1).length
  const decided = list.filter((q) => q.docStatus === 'accepted' || q.docStatus === 'rejected' || q.docStatus === 'expired')
  const accepted = list.filter((q) => q.docStatus === 'accepted')
  const value = (qs: typeof list) => qs.reduce((s, q) => s + verdictFor(q).totals.total, 0)

  // Why quotes stalled: every blocking/approval reason the agent raised, grouped.
  const reasons = new Map<string, number>()
  for (const a of approvals.filter((x) => ids.has(x.quoteId))) for (const r of a.reasons) {
    const key = r.includes('خصم') ? 'خصم أعلى من الحد' : r.includes('هامش') ? 'هامش ربح منخفض' : r.includes('أقدم') ? 'سعر قديم' : r.includes('حد الإصدار') ? 'قيمة أعلى من حد الإصدار' : r.includes('تكلفة') ? 'تكلفة غير مسجلة' : 'أخرى'
    reasons.set(key, (reasons.get(key) ?? 0) + 1)
  }
  for (const e of events.filter((x) => ids.has(x.quoteId) && x.kind === 'agent')) {
    const key = e.body.includes('غير موجود') ? 'بند غير موجود في الكتالوج' : e.body.includes('بدون سعر') ? 'منتج بدون سعر معتمد' : 'معلومة ناقصة'
    reasons.set(key, (reasons.get(key) ?? 0) + 1)
  }
  for (const e of events.filter((x) => ids.has(x.quoteId) && x.kind === 'change_request')) reasons.set('طلب تعديل من العميل', (reasons.get('طلب تعديل من العميل') ?? 0) + 1)
  const reasonList = [...reasons.entries()].sort((a, b) => b[1] - a[1])
  const maxR = reasonList[0]?.[1] ?? 1

  return (
    <NightPage>
      <PageHead title="التحليلات" sub="من البيانات المسجلة فقط" actions={<Seg label="الفترة" options={PERIODS} value={days as 30 | 90 | 365} onChange={setDays} />} />
      <div className="np-kpis">
        <Kpi label="الوسيط لزمن التجهيز" value={fmtDuration(median)} hint={preps.length ? `${withinTarget} من ${preps.length} خلال دقيقتين` : 'لا توجد عروض مكتملة'} />
        <Kpi label="الإصدار الآلي" value={issued.length ? `${Math.round((auto / issued.length) * 100)}%` : '—'} hint={`${auto} من ${issued.length} عرض`} />
        <Kpi label="تعديلات بشرية" value={humanEdits} hint="نسخ عدّلها الفريق بعد الوكيل" />
        <Kpi label="نسبة القبول" value={decided.length ? `${Math.round((accepted.length / decided.length) * 100)}%` : '—'} hint={`${fmtMoney(value(accepted))} ر.س مقبول`} />
      </div>
      <div className="np-grid-2 even">
        <div className="qt-card">
          <CardTitle>أسباب التعثّر</CardTitle>
          {reasonList.length === 0 ? <EmptyLine>ما تعثّر أي عرض في هذه الفترة</EmptyLine> : reasonList.map(([k, n]) => <Meter key={k} label={k} value={n} max={maxR} display={n} />)}
        </div>
        <div className="qt-card">
          <CardTitle>نتيجة العروض</CardTitle>
          {list.length === 0 ? <EmptyLine>لا توجد عروض</EmptyLine> : (
            <>
              <Meter label="مقبول" value={accepted.length} max={list.length} display={accepted.length} color="var(--ok)" />
              <Meter label="مرفوض" value={list.filter((q) => q.docStatus === 'rejected').length} max={list.length} display={list.filter((q) => q.docStatus === 'rejected').length} color="var(--bad)" />
              <Meter label="منتهي بدون رد" value={list.filter((q) => q.docStatus === 'expired').length} max={list.length} display={list.filter((q) => q.docStatus === 'expired').length} />
              <Meter label="مفتوح" value={list.filter((q) => ['draft', 'ready', 'sent'].includes(q.docStatus)).length} max={list.length} display={list.filter((q) => ['draft', 'ready', 'sent'].includes(q.docStatus)).length} color="var(--info)" />
            </>
          )}
        </div>
      </div>
    </NightPage>
  )
}
