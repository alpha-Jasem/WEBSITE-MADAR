import { useMemo, useState } from 'react'
import { PhoneCall } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useVoiceRead, type VoiceAgent } from '@/lib/queries/voicePlatform'
import { Card, Select } from '@/dashboard/components/primitives'
import { EmptyState, KpiCardSkeleton } from '@/dashboard/components/uiExtras'
import { NightPage, PageHead, CardTitle, Seg, Kpi, fmtNum } from './shared/night'
import { BarChart } from './shared/charts'
import { AR_GREG, hourLabel } from './shared/periods'
import { Donut } from './HomeWidgets'

// Call analytics from the voice platform's insights (nabrah-read voice_insights): one agent or all of
// the company's agents, over the last 7 or 30 days.

type Period = 7 | 30
type Kind = 'inbound' | 'outbound' | 'web'
interface Bucket { inbound?: number; outbound?: number; web?: number }
interface Insights {
  empty?: boolean
  totals?: { total?: number } & Bucket
  connected?: number
  not_connected?: { no_answer?: number; busy?: number; failed?: number }
  avg_duration_seconds?: number
  statuses?: Record<string, number>
  daily?: ({ date: string } & Bucket)[]
  hourly?: ({ hour: number } & Bucket)[]
  ended_by?: Record<string, number>
}

const KIND_LABEL: Record<Kind, string> = { inbound: 'وارد', outbound: 'صادر', web: 'مكالمات الويب' }
const STATUS: Record<string, { label: string; color: string }> = {
  completed: { label: 'مكتملة', color: 'var(--success-500)' },
  no_answer: { label: 'لا يوجد رد', color: 'var(--warning-500)' },
  busy: { label: 'مشغول', color: 'var(--ring-2, #8b5cf6)' },
  failed: { label: 'فشلت', color: 'var(--danger-500)' },
}
const ENDED: Record<string, string> = { customer: 'العميل', agent: 'الوكيل', no_response: 'بدون رد', time_limit: 'انتهى الوقت', voicemail: 'بريد صوتي', transfer: 'تحويل', not_recorded: 'غير مسجّل' }
const sumKinds = (b?: Bucket) => (b?.inbound ?? 0) + (b?.outbound ?? 0) + (b?.web ?? 0)

/** Tour numbers, shaped like the live insights. */
function demoInsights(days: number): Insights {
  const daily = Array.from({ length: days }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i))
    return { date: d.toISOString().slice(0, 10), inbound: 3 + ((i * 7) % 6), outbound: (i * 3) % 4, web: i % 3 }
  })
  const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, inbound: h >= 9 && h <= 22 ? 2 + ((h * 5) % 7) : 0, outbound: h >= 10 && h <= 18 ? (h % 3) : 0, web: h >= 18 ? 1 : 0 }))
  const totals = daily.reduce((t, d) => ({ inbound: t.inbound + d.inbound, outbound: t.outbound + d.outbound, web: t.web + d.web }), { inbound: 0, outbound: 0, web: 0 })
  const total = sumKinds(totals)
  const noAnswer = Math.round(total * 0.12)
  return { totals: { total, ...totals }, connected: total - noAnswer, not_connected: { no_answer: noAnswer, busy: 0, failed: 0 }, avg_duration_seconds: 86,
    statuses: { completed: total - noAnswer, no_answer: noAnswer }, daily, hourly, ended_by: { customer: Math.round(total * 0.6), agent: Math.round(total * 0.28) } }
}

export function DashboardV2CallsAnalytics() {
  const { companyId, isDemo } = useWorkspace()
  const [period, setPeriod] = useState<Period>(7)
  const [agentId, setAgentId] = useState('')
  const agentsRead = useVoiceRead<{ agents: VoiceAgent[] }>(isDemo ? null : companyId || 'admin', 'agents')
  const agents = isDemo ? [{ agent_id: 'demo-a1', name: 'وكيل الاستقبال' }, { agent_id: 'demo-a2', name: 'وكيل المتابعة' }] : agentsRead.data?.agents ?? []
  const live = useVoiceRead<Insights>(isDemo ? null : `${companyId || 'admin'}-${period}-${agentId}`, 'voice_insights', { days: period, ...(agentId ? { agent_id: agentId } : {}) })
  const ins: Insights | null = isDemo ? demoInsights(period) : live.data

  const total = ins?.totals?.total ?? sumKinds(ins?.totals)
  const completed = ins?.statuses?.completed ?? ins?.connected ?? 0
  const missed = (ins?.not_connected?.no_answer ?? 0) + (ins?.not_connected?.busy ?? 0) + (ins?.not_connected?.failed ?? 0)
  const avg = Math.round(ins?.avg_duration_seconds ?? 0)

  const days = useMemo(() => (ins?.daily ?? []).map((d) => ({
    label: new Date(`${d.date}T12:00:00`).toLocaleDateString(AR_GREG, period === 7 ? { weekday: 'short' } : { day: 'numeric', month: 'numeric' }),
    count: sumKinds(d),
  })), [ins, period])

  const statusSources = useMemo(() => {
    const entries = Object.entries(ins?.statuses ?? {}).filter(([, v]) => v > 0)
    const sum = entries.reduce((s, [, v]) => s + v, 0)
    return entries.map(([k, v]) => ({ key: k, label: STATUS[k]?.label ?? k, color: STATUS[k]?.color ?? 'var(--slate-400)', count: v, pct: sum ? Math.round((v / sum) * 100) : 0 }))
  }, [ins])

  const hours = useMemo(() => {
    const byHour = new Map((ins?.hourly ?? []).map((h) => [Number(h.hour), h]))
    return Array.from({ length: 24 }, (_, h) => { const b = byHour.get(h); return { h, inbound: b?.inbound ?? 0, outbound: b?.outbound ?? 0, web: b?.web ?? 0, total: sumKinds(b) } })
  }, [ins])
  const peakOf = (list: typeof hours) => list.reduce((best, x) => (x.total > best.total ? x : best), list[0] ?? { h: 0, total: 0 })
  const peak = peakOf(hours)
  const evening = peakOf(hours.filter((x) => x.h >= 16))
  const quiet = hours.reduce((low, x) => (x.total < low.total ? x : low), hours[0] ?? { h: 0, total: 0 })
  const span = (h: number) => `${hourLabel(h)}–${hourLabel((h + 1) % 24)}`
  const ended = Object.entries(ins?.ended_by ?? {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])

  if (!isDemo && (live.loading && !live.data)) return <KpiCardSkeleton />

  return (
    <NightPage>
      <PageHead
        title="تحليلات المكالمات"
        sub="تابع أداء مكالمات الوكلاء في مساحة العمل بنظرة سريعة"
        actions={<Seg label="الفترة" value={period} onChange={setPeriod} options={[[7, 'آخر 7 أيام'], [30, 'آخر 30 يوم']] as const} />}
      />

      <div style={{ maxWidth: 320 }}>
        <Select label="الوكيل" value={agentId} onChange={(e) => setAgentId(e.target.value)}
          options={[{ value: '', label: 'كل الوكلاء' }, ...agents.map((a) => ({ value: a.agent_id, label: a.name }))]} />
      </div>

      {live.error && !isDemo && <Card style={{ padding: 16 }}><div className="np-empty">ما قدرنا نجيب التحليلات الحين، حاول بعد شوي.</div></Card>}

      <div className="np-kpis">
        <Kpi label="إجمالي المكالمات" value={fmtNum(total)} />
        <Kpi label="متوسط المدة" value={`${Math.floor(avg / 60)}د ${avg % 60}ث`} />
        <Kpi label="مكتملة" value={fmtNum(completed)} hint={total ? `${Math.round((completed / total) * 100)}%` : undefined} trend="up" />
        <Kpi label="فاشلة / فائتة" value={fmtNum(missed)} valueStyle={missed ? { color: 'var(--bad)' } : undefined} />
      </div>

      <div className="np-grid-2">
        <Card delay={0.1}>
          <CardTitle aside={`${fmtNum(total)} مكالمة`}>اتجاه أداء المكالمات</CardTitle>
          {total === 0 ? <EmptyState icon={<PhoneCall size={18} />} title="لا توجد بيانات للفترة المحددة" /> : (
            <BarChart values={days.map((d) => d.count)} labels={days.map((d) => d.label)} ariaLabel="المكالمات حسب اليوم" />
          )}
        </Card>
        <Card delay={0.16}>
          <CardTitle>توزيع حالات المكالمات</CardTitle>
          {statusSources.length === 0 ? <EmptyState icon={<PhoneCall size={18} />} title="لا توجد بيانات" /> : (
            <Donut sources={statusSources} total={total} centerLabel="مكالمة" />
          )}
        </Card>
      </div>

      <Card delay={0.22}>
        <CardTitle aside="نمط حجم المكالمات على مدار 24 ساعة">التوزيع الساعي للمكالمات</CardTitle>
        {total === 0 ? <EmptyState icon={<PhoneCall size={18} />} title="لا توجد بيانات للفترة المحددة" /> : (
          <>
            <BarChart values={hours.map((h) => h.total)} labels={hours.map((h) => hourLabel(h.h))} ariaLabel="المكالمات حسب الساعة" height={170} highlightLast={false} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12.5, color: 'var(--muted)', marginTop: 10 }}>
              {(['inbound', 'outbound', 'web'] as Kind[]).map((k) => <span key={k}>{KIND_LABEL[k]}: <b style={{ color: 'var(--ink)' }}>{fmtNum(ins?.totals?.[k] ?? 0)}</b></span>)}
            </div>
            <ul style={{ margin: '10px 0 0', paddingInlineStart: 18, fontSize: 12.5, color: 'var(--muted)', lineHeight: 2 }}>
              <li>ساعات الذروة ({span(peak.h)}) · {fmtNum(peak.total)} مكالمة</li>
              <li>ذروة المساء ({span(evening.h)}) · {fmtNum(evening.total)} مكالمة</li>
              <li>الساعات خارج الذروة ({span(quiet.h)}) · {fmtNum(quiet.total)} مكالمة</li>
            </ul>
          </>
        )}
      </Card>

      {ended.length > 0 && (
        <Card delay={0.28}>
          <CardTitle>من أنهى المكالمة</CardTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, fontSize: 13 }}>
            {ended.map(([k, v]) => <span key={k} style={{ color: 'var(--muted)' }}>{ENDED[k] ?? k}: <b style={{ color: 'var(--ink)' }}>{fmtNum(v)}</b></span>)}
          </div>
        </Card>
      )}
    </NightPage>
  )
}
