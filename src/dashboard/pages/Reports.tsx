import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useBookings, useAICalls, useMessages } from '@/lib/dashboardQueries'
import { exportRowsToExcel } from '@/lib/exportExcel'
import { bookingsLabel } from '@/dashboard/modules'
import { Card, Button } from '@/dashboard/components/primitives'
import { Skeleton } from '@/dashboard/components/uiExtras'
import { NightPage, PageHead, CardTitle, Seg, Kpi, Meter, EmptyLine, fmtNum } from './shared/night'
import { AreaChart, BarChart } from './shared/charts'
import { PERIOD_OPTIONS, PERIOD_PHRASE, periodBuckets, bucketize, localTime, type Period } from './shared/periods'

const SOURCE_COLORS: Record<string, string> = {
  ai_booking: 'var(--violet)', whatsapp: 'var(--ok)', website: 'var(--sky)',
  reception: 'var(--warn)', manual: 'var(--dim)',
}
const SOURCE_LABELS: Record<string, string> = {
  ai_booking: 'حجز بالذكاء الاصطناعي', whatsapp: 'واتساب', website: 'الموقع الإلكتروني',
  reception: 'الاستقبال', manual: 'يدوي',
}

function fmtDuration(sec: number) {
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`
}

function KpiSkeleton() {
  return (
    <div className="np-kpi">
      <Skeleton width="55%" height={12} />
      <Skeleton width="40%" height={24} style={{ marginTop: 8 }} />
    </div>
  )
}

export function DashboardV2Reports() {
  const { companyId, isDemo, hasModule, businessType } = useWorkspace()
  const { data: appointments, loading: apptsLoading } = useBookings(companyId, undefined, isDemo)
  const { data: aiCalls, loading: callsLoading } = useAICalls(companyId, isDemo)
  const { data: messages, loading: msgsLoading } = useMessages(companyId, isDemo)
  const loading = apptsLoading || callsLoading || msgsLoading
  const [period, setPeriod] = useState<Period>('week')

  const hasVoice = hasModule('voice')
  const hasBookings = hasModule('bookings')
  const bLabel = bookingsLabel(businessType)
  const bookedWord = businessType === 'real_estate' ? 'موعد' : 'حجز'

  const appts = appointments || []
  const calls = hasVoice ? aiCalls || [] : []
  const msgs = messages || []

  const buckets = useMemo(() => periodBuckets(period), [period])
  const range = useMemo(() => ({ start: buckets[0].start, end: buckets[buckets.length - 1].end }), [buckets])
  const inRange = (t: number | null) => t != null && t >= range.start && t < range.end

  const callsP = useMemo(() => calls.filter((c) => inRange(new Date(c.call_time).getTime())), [calls, range]) // eslint-disable-line react-hooks/exhaustive-deps
  const msgsP = useMemo(() => msgs.filter((m) => inRange(new Date(m.created_at).getTime())), [msgs, range]) // eslint-disable-line react-hooks/exhaustive-deps
  const apptsP = useMemo(() => (hasBookings ? appts : []).filter((a) => inRange(localTime(a.appointment_date, a.start_time))), [appts, range, hasBookings]) // eslint-disable-line react-hooks/exhaustive-deps

  const activity = useMemo(() => {
    const c = bucketize(callsP, buckets, (x) => new Date(x.call_time).getTime())
    const m = bucketize(msgsP, buckets, (x) => new Date(x.created_at).getTime())
    return c.map((v, i) => v + m[i])
  }, [callsP, msgsP, buckets])
  const bookingSeries = useMemo(() => bucketize(apptsP, buckets, (a) => localTime(a.appointment_date, a.start_time)), [apptsP, buckets])
  const labels = buckets.map((b) => b.label)

  const resolved = callsP.filter((c) => c.status === 'completed' && !c.needs_review).length
  const resolvedPct = callsP.length ? Math.round((resolved / callsP.length) * 100) : 0
  const avgDur = callsP.length ? callsP.reduce((s, c) => s + (c.duration_seconds || 0), 0) / callsP.length : 0
  const minutes = Math.round(callsP.reduce((s, c) => s + (c.duration_seconds || 0), 0) / 60)
  const delivered = msgsP.filter((m) => m.status === 'delivered' || m.status === 'read').length
  const readCount = msgsP.filter((m) => m.status === 'read').length
  const failedMsgs = msgsP.filter((m) => m.status === 'failed').length
  const deliveredPct = msgsP.length ? Math.round((delivered / msgsP.length) * 100) : 0

  const funnel = useMemo(() => {
    const incoming = callsP.length + msgsP.length
    const answered = callsP.filter((c) => c.status === 'completed').length + msgsP.filter((m) => m.status !== 'failed').length
    const booked = callsP.filter((c) => c.result === 'booked').length
    const attended = apptsP.filter((a) => a.status === 'completed').length
    return [
      { label: 'محادثات واردة', value: incoming },
      { label: 'تم الرد عليها', value: answered },
      { label: `تم ${bookedWord === 'موعد' ? 'تحديد موعد' : 'حجز موعد'}`, value: booked },
      { label: 'تم الحضور', value: attended },
    ]
  }, [callsP, msgsP, apptsP, bookedWord])

  const outcomes = useMemo(() => {
    if (hasVoice) {
      const total = callsP.length || 1
      const count = (pred: (r: string | null | undefined) => boolean) => callsP.filter((c) => pred(c.result)).length
      return [
        { label: `سجّل ${bookedWord}`, n: count((r) => r === 'booked'), color: 'var(--ok)' },
        { label: 'عدّل أو ألغى موعد', n: count((r) => r === 'rescheduled' || r === 'cancelled'), color: 'var(--sky)' },
        { label: 'حوّلها لموظف', n: count((r) => r === 'referred'), color: 'var(--warn)' },
        { label: 'استفسار بدون إجراء', n: count((r) => r === 'no_action' || r == null), color: 'var(--ai)' },
        { label: 'بدون نتيجة', n: count((r) => r === 'failed'), color: 'var(--bad)' },
      ].map((o) => ({ ...o, pct: Math.round((o.n / total) * 100) }))
    }
    const total = msgsP.length || 1
    const by = (s: string) => msgsP.filter((m) => m.status === s).length
    return [
      { label: 'تمت قراءتها', n: by('read'), color: 'var(--ok)' },
      { label: 'تم التسليم', n: by('delivered'), color: 'var(--sky)' },
      { label: 'أُرسلت', n: by('sent'), color: 'var(--ai)' },
      { label: 'قيد الإرسال', n: by('pending'), color: 'var(--warn)' },
      { label: 'فشلت', n: by('failed'), color: 'var(--bad)' },
    ].map((o) => ({ ...o, pct: Math.round((o.n / total) * 100) }))
  }, [hasVoice, callsP, msgsP, bookedWord])

  const services = useMemo(() => {
    const counts: Record<string, number> = {}
    apptsP.forEach((a) => { if (a.service_name) counts[a.service_name] = (counts[a.service_name] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [apptsP])

  const sources = useMemo(() => {
    const counts: Record<string, number> = {}
    apptsP.forEach((a) => { counts[a.source] = (counts[a.source] || 0) + 1 })
    const total = apptsP.length || 1
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([key, count]) => ({
      label: SOURCE_LABELS[key] || key, count, pct: Math.round((count / total) * 100), color: SOURCE_COLORS[key] || 'var(--dim)',
    }))
  }, [apptsP])

  const maxFunnel = Math.max(1, ...funnel.map((f) => f.value))
  const maxService = Math.max(1, ...services.map(([, v]) => v))

  function exportReport() {
    exportRowsToExcel('تقرير-مدار', [
      { name: 'النشاط', rows: buckets.map((b, i) => ({ 'الفترة': b.label, 'المحادثات والمكالمات': activity[i], [bLabel]: hasBookings ? bookingSeries[i] : 0 })) },
      { name: 'مسار التحويل', rows: funnel.map((f) => ({ 'المرحلة': f.label, 'العدد': f.value })) },
      ...(hasBookings ? [
        { name: 'أعلى الخدمات', rows: services.map(([label, value]) => ({ 'الخدمة': label, 'عدد الحجوزات': value })) },
        { name: 'مصادر الحجوزات', rows: sources.map((s) => ({ 'المصدر': s.label, 'النسبة %': s.pct })) },
        { name: 'الحجوزات التفصيلية', rows: appts.map((a) => ({ 'العميل': a.patient_name, 'الجوال': a.patient_phone, 'الخدمة': a.service_name, 'التاريخ': a.appointment_date, 'الوقت': a.start_time, 'الحالة': a.status, 'المصدر': SOURCE_LABELS[a.source] || a.source })) },
      ] : []),
    ])
  }

  const kpis = hasVoice
    ? [
      { label: 'المكالمات', value: fmtNum(callsP.length), hint: callsP.length ? `متوسط المدة ${fmtDuration(avgDur)}` : 'لا توجد مكالمات بالفترة' },
      { label: 'انحلت بدون موظف', value: `${resolvedPct}%`, hint: `${fmtNum(resolved)} من ${fmtNum(callsP.length)} مكالمة` },
      hasBookings
        ? { label: bLabel, value: fmtNum(apptsP.length), hint: `${fmtNum(apptsP.filter((a) => a.status === 'completed').length)} مكتمل` }
        : { label: 'دقائق المكالمات', value: fmtNum(minutes), hint: 'إجمالي مدة المكالمات' },
      { label: 'رسائل واتساب', value: fmtNum(msgsP.length), hint: msgsP.length ? `${deliveredPct}% وصلت` : 'لا توجد رسائل بالفترة' },
    ]
    : [
      { label: 'رسائل واتساب', value: fmtNum(msgsP.length), hint: PERIOD_PHRASE[period] },
      { label: 'وصلت للعميل', value: `${deliveredPct}%`, hint: `${fmtNum(delivered)} من ${fmtNum(msgsP.length)} رسالة` },
      { label: 'تمت قراءتها', value: fmtNum(readCount), hint: 'قرأها العميل' },
      hasBookings
        ? { label: bLabel, value: fmtNum(apptsP.length), hint: `${fmtNum(apptsP.filter((a) => a.status === 'completed').length)} مكتمل` }
        : { label: 'فشلت', value: fmtNum(failedMsgs), hint: 'لم تصل للعميل' },
    ]

  const activityTitle = hasVoice ? 'المحادثات والمكالمات عبر الوقت' : 'رسائل واتساب عبر الوقت'
  const activityTotal = activity.reduce((s, v) => s + v, 0)

  return (
    <NightPage>
      <PageHead
        title="التقارير"
        sub={`أداء الموظف الذكي · ${PERIOD_PHRASE[period]}${isDemo ? ' · عرض تجريبي' : ''}`}
        actions={<>
          <Seg label="الفترة" options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
          <Button variant="secondary" onClick={exportReport}><Download size={15} /> تصدير Excel</Button>
        </>}
      />

      <div className="np-kpis">
        {loading ? Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />) : kpis.map((k) => <Kpi key={k.label} {...k} />)}
      </div>

      <div className="np-grid-2">
        <Card delay={0}>
          <CardTitle aside={loading ? null : `${fmtNum(activityTotal)} إجمالي`}>{activityTitle}</CardTitle>
          {loading ? <Skeleton width="100%" height={210} /> : (
            activityTotal === 0
              ? <EmptyLine>ما فيه نشاط مسجّل {PERIOD_PHRASE[period]}</EmptyLine>
              : <AreaChart values={activity} labels={labels} ariaLabel={activityTitle} />
          )}
        </Card>
        <Card delay={0.06}>
          <CardTitle aside={hasVoice ? `${fmtNum(callsP.length)} مكالمة` : `${fmtNum(msgsP.length)} رسالة`}>{hasVoice ? 'وش صار في المكالمات' : 'حالة الرسائل'}</CardTitle>
          {loading ? <Skeleton width="100%" height={160} /> : (
            (hasVoice ? callsP.length : msgsP.length) === 0
              ? <EmptyLine>لا توجد بيانات {PERIOD_PHRASE[period]}</EmptyLine>
              : outcomes.map((o) => <Meter key={o.label} label={o.label} value={o.pct} display={`${o.pct}% · ${fmtNum(o.n)}`} color={o.color} />)
          )}
        </Card>
      </div>

      {hasBookings && (
        <div className="np-grid-2 even">
          <Card delay={0.1}>
            <CardTitle aside={`${fmtNum(apptsP.length)} ${bookedWord}`}>{bLabel} {period === 'today' ? 'حسب الساعة' : 'حسب اليوم'}</CardTitle>
            {loading ? <Skeleton width="100%" height={200} /> : (
              apptsP.length === 0
                ? <EmptyLine>لا توجد {bLabel} {PERIOD_PHRASE[period]}</EmptyLine>
                : <BarChart values={bookingSeries} labels={labels} ariaLabel={`${bLabel} عبر الوقت`} highlightLast={period !== 'today'} />
            )}
          </Card>
          <Card delay={0.14}>
            <CardTitle>مسار المحادثات إلى {bLabel}</CardTitle>
            {loading ? <Skeleton width="100%" height={160} /> : funnel.map((f) => (
              <Meter key={f.label} label={f.label} value={f.value} max={maxFunnel} display={fmtNum(f.value)} />
            ))}
          </Card>
        </div>
      )}

      {hasBookings && (
        <div className="np-grid-2 even">
          <Card delay={0.18}>
            <CardTitle>أعلى الخدمات طلبًا</CardTitle>
            {loading ? <Skeleton width="100%" height={140} /> : services.length === 0
              ? <EmptyLine>ستظهر أعلى الخدمات هنا بمجرد وصول أول {bookedWord}</EmptyLine>
              : services.map(([label, value], i) => (
                <div key={label} className="np-row">
                  <span className="np-num" style={{ color: 'var(--dim)', width: 22 }}>{i + 1}</span>
                  <div className="np-row-main">
                    <div className="np-usage-row"><span style={{ color: 'var(--text-primary)' }}>{label}</span><b>{fmtNum(value)}</b></div>
                    <div className="np-meter"><i style={{ width: `${(value / maxService) * 100}%` }} /></div>
                  </div>
                </div>
              ))}
          </Card>
          <Card delay={0.22}>
            <CardTitle>مصادر {bLabel}</CardTitle>
            {loading ? <Skeleton width="100%" height={140} /> : sources.length === 0
              ? <EmptyLine>ستظهر توزيعة المصادر هنا بمجرد وصول أول {bookedWord}</EmptyLine>
              : sources.map((s) => <Meter key={s.label} label={s.label} value={s.pct} display={`${s.pct}% · ${fmtNum(s.count)}`} color={s.color} />)}
          </Card>
        </div>
      )}
    </NightPage>
  )
}
