import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Phone, MessageCircle, Globe, BarChart3, ClipboardCheck, Tags, X } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useConversationData } from '@/lib/queries/conversations'
import { SENTIMENT_LABEL, sentimentTone } from '@/lib/callAnalysis'
import { NightPage, PageHead, CardTitle, Seg, Meter, EmptyLine } from './shared/night'
import { AreaChart, BarChart } from './shared/charts'
import { PERIOD_OPTIONS, PERIOD_PHRASE, type Period } from './shared/periods'
import { useIsNarrow } from './shared/night'
import { Chip, Sk } from './conversations/ui'
import { CHANNEL_LABEL } from './conversations/model'
import {
  filterCalls, computeMetrics, computeTopics, computeFieldStats, insightText, recommendations,
  type ChannelFilter, type MetricId, type TopicRow, type InsightCard,
} from './analytics/model'
import { Sparkline, SentimentBar, SentimentLegend } from './analytics/ui'
import './home/night.css'
import './analytics/analytics.css'

const TOPIC_LIMIT = 8
const DISMISS_KEY = 'ax_dismissed_insights'

function readDismissed(): string[] {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]') } catch { return [] }
}
function writeDismissed(ids: string[]) {
  try { localStorage.setItem(DISMISS_KEY, JSON.stringify(ids)) } catch { /* private mode */ }
}
const HIGHLIGHT_FIELDS: [string[], string][] = [
  [['contact_number', 'phone'], 'تركوا رقم تواصل'],
  [['visit_preference'], 'طلبوا موعد زيارة'],
  [['requested_next_step'], 'حددوا خطوة تالية'],
]

/** Spotlight on how the AI agent is doing: volume, success, sentiment, topics and what it collected. */
export function DashboardV2AgentAnalytics() {
  const { companyId, isDemo } = useWorkspace()
  const navigate = useNavigate()
  const base = isDemo ? '/demo-review' : '/clinic-os/dashboard'
  const narrow = useIsNarrow()
  const { calls, callsLoading } = useConversationData(companyId, isDemo)
  const [period, setPeriod] = useState<Period>('week')
  const [channel, setChannel] = useState<ChannelFilter>('all')
  const [metricId, setMetricId] = useState<MetricId>('count')
  const [dismissed, setDismissed] = useState<string[]>(readDismissed)

  const channelsPresent = useMemo(() => {
    const s = new Set(calls.map((c) => c.channel || 'phone'))
    return (['whatsapp', 'web', 'phone'] as const).filter((c) => s.has(c))
  }, [calls])

  const { buckets, inRange, previous } = useMemo(() => filterCalls(calls, period, channel), [calls, period, channel])
  const metrics = useMemo(() => computeMetrics(inRange, previous, buckets, period), [inRange, previous, buckets, period])
  const topics = useMemo(() => computeTopics(inRange), [inRange])
  const fieldStats = useMemo(() => computeFieldStats(inRange), [inRange])
  const insight = useMemo(() => insightText(inRange, topics, metrics, fieldStats.fields, period), [inRange, topics, metrics, fieldStats, period])

  const recs = useMemo(() => recommendations(inRange, calls, fieldStats.fields), [inRange, calls, fieldStats])
  const cards: InsightCard[] = [
    ...(insight ? [{
      id: 'summary', tag: 'ملخص الفترة', tone: 'ai' as const, dismissible: false,
      title: `${inRange.length.toLocaleString('en-US')} محادثة ${PERIOD_PHRASE[period]}`, text: insight,
      actions: [{ label: 'عرض المحادثات', to: 'conversations' }],
    }] : []),
    ...recs.filter((r) => !r.dismissible || !dismissed.includes(r.id)),
  ]
  function dismiss(id: string) {
    const next = [...dismissed, id]
    setDismissed(next)
    writeDismissed(next)
  }

  const shown = metrics.filter((m) => m.available)
  const selected = shown.find((m) => m.id === metricId) || shown[0]
  const labels = buckets.map((b) => b.label)

  const channelOptions: (readonly [ChannelFilter, ReactNode])[] = [
    ['all', 'كل القنوات'],
    ...channelsPresent.map((c) => [c, <><ChannelGlyph c={c} />{CHANNEL_LABEL[c]}</>] as const),
  ]

  function openTopic(t: TopicRow) {
    navigate(`${base}/conversations?q=${encodeURIComponent(t.topic)}`)
  }

  return (
    <NightPage>
      <PageHead
        title="تحليلات الموظف"
        sub={`كيف يتعامل الموظف الذكي مع عملائك، ${PERIOD_PHRASE[period]}`}
        actions={<Seg label="الفترة" value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />}
      />

      {channelsPresent.length > 1 && (
        <div className="np-filters">
          <Seg label="القناة" value={channel} onChange={setChannel} options={channelOptions} />
        </div>
      )}

      {callsLoading && calls.length === 0 ? (
        <>
          <div className="ax-kpis">{Array.from({ length: 6 }).map((_, i) => <Sk key={i} h={118} />)}</div>
          <Sk h={260} />
        </>
      ) : (
        <>
          {cards.length > 0 && (
            <div className="ax-insights" role="list" aria-label="ملاحظات واقتراحات">
              {cards.map((c) => (
                <article key={c.id} role="listitem" className={`ax-ins${c.id === 'summary' ? ' lead' : ''}`}>
                  <header>
                    {c.id === 'summary' && <span className="ax-orb" aria-hidden="true"><Sparkles size={14} /></span>}
                    <Chip tone={c.tone}>{c.tag}</Chip>
                    {c.dismissible && (
                      <button type="button" className="nx-icon-btn ax-x" aria-label="إخفاء" title="إخفاء" onClick={() => dismiss(c.id)}><X size={13} /></button>
                    )}
                  </header>
                  <b>{c.title}</b>
                  <p>{c.text}</p>
                  <div className="ax-ins-acts">
                    {c.actions.map((a, i) => (
                      <button key={a.to} type="button" className={`nx-btn sm${i === 0 ? '' : ' ghost'}`} onClick={() => navigate(`${base}/${a.to}`)}>{a.label}</button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="ax-kpis">
            {shown.map((m) => (
              <button key={m.id} type="button" className="ax-kpi" aria-pressed={selected?.id === m.id} onClick={() => setMetricId(m.id)}>
                <span>{m.label}</span>
                <b style={m.id === 'review' && m.value !== '0' ? { color: 'var(--warn)' } : undefined}>{m.value}</b>
                <i className={m.tone}>{m.hint}</i>
                <Sparkline values={m.series} label={`اتجاه ${m.label}`} />
              </button>
            ))}
          </div>

          {selected && (
            <div className="nx-card">
              <CardTitle aside={PERIOD_PHRASE[period]}><BarChart3 size={16} style={{ color: 'var(--sky)' }} /> {selected.label}</CardTitle>
              {inRange.length === 0 ? <EmptyLine>ما فيه محادثات في هذه الفترة.</EmptyLine>
                : selected.id === 'count' || selected.id === 'review' || selected.id === 'cost'
                  ? <BarChart values={selected.series} labels={labels} ariaLabel={selected.label} format={selected.format} height={narrow ? 180 : 220} highlightLast={period !== 'today'} />
                  : <AreaChart values={selected.series} labels={labels} ariaLabel={selected.label} format={selected.format} height={narrow ? 180 : 220} />}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="nx-card">
              <CardTitle aside={topics.length ? `${topics.length} موضوع` : undefined}><Tags size={16} style={{ color: 'var(--ai)' }} /> المواضيع</CardTitle>
              {topics.length === 0 ? <EmptyLine>ما فيه مواضيع في هذه الفترة.</EmptyLine> : (
                <>
                  {narrow ? <TopicList rows={topics.slice(0, TOPIC_LIMIT)} max={topics[0].count} onOpen={openTopic} />
                    : <TopicTable rows={topics.slice(0, TOPIC_LIMIT)} max={topics[0].count} onOpen={openTopic} />}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}>
                    <SentimentLegend />
                    {topics.length > TOPIC_LIMIT && <small style={{ color: 'var(--dim)' }}>+{topics.length - TOPIC_LIMIT} مواضيع أخرى</small>}
                  </div>
                </>
              )}
            </div>

            <div className="nx-card">
              <CardTitle aside={fieldStats.withData ? `من ${fieldStats.withData} محادثة` : undefined}>
                <ClipboardCheck size={16} style={{ color: 'var(--ok)' }} /> أهم ما جمعه الموظف
              </CardTitle>
              {fieldStats.fields.length === 0 ? (
                <EmptyLine>ما جمع الموظف بيانات منظمة في هذه الفترة.</EmptyLine>
              ) : (
                <>
                  <div className="ax-hl">
                    {HIGHLIGHT_FIELDS.map(([keys, label]) => {
                      const f = fieldStats.fields.find((x) => keys.includes(x.key))
                      if (!f) return null
                      return (
                        <div key={label} className="nx-stat">
                          <b>{f.filled}</b>
                          <span>{label}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="ax-fields">
                    {fieldStats.fields.map((f) => (
                      <Meter key={f.key} label={f.label} value={f.filled} max={Math.max(1, f.total)} display={`${f.filled} من ${f.total}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </NightPage>
  )
}

function ChannelGlyph({ c }: { c: 'phone' | 'whatsapp' | 'web' }) {
  const I = c === 'phone' ? Phone : c === 'whatsapp' ? MessageCircle : Globe
  return <I size={13} />
}

function SentimentCell({ t }: { t: TopicRow }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1 }}><SentimentBar positive={t.positive} neutral={t.neutral} negative={t.negative} /></div>
      {t.dominant ? (
        <span title={SENTIMENT_LABEL[t.dominant]}>
          <Chip tone={sentimentTone(t.dominant)}>
            <span dir="ltr" className="nx-num">{t.avgScore != null ? `${t.avgScore >= 0 ? '+' : ''}${t.avgScore.toFixed(2)}` : SENTIMENT_LABEL[t.dominant]}</span>
          </Chip>
        </span>
      ) : <span style={{ color: 'var(--dim)' }}>—</span>}
    </div>
  )
}

function TopicName({ t }: { t: TopicRow }) {
  return (
    <>
      <span style={{ display: 'block', color: t.short ? 'var(--muted)' : 'var(--ink)', fontWeight: 600 }}>{t.topic}</span>
      {t.description && <span className="ax-sub" style={{ maxWidth: 260 }} title={t.description}>{t.description}</span>}
    </>
  )
}

function rateText(r: number | null) {
  return r == null ? '—' : `${Math.round(r * 100)}%`
}

function TopicTable({ rows, max, onOpen }: { rows: TopicRow[]; max: number; onOpen: (t: TopicRow) => void }) {
  return (
    <div className="np-table-wrap">
      <table className="np-table ax-topics" style={{ minWidth: 0 }}>
        <thead>
          <tr><th>الموضوع</th><th>المحادثات</th><th>المشاعر</th><th>النجاح</th></tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.topic} className="clickable" tabIndex={0} onClick={() => onOpen(t)} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(t) }}>
              <td style={{ maxWidth: 260, overflowWrap: 'anywhere' }}><TopicName t={t} /></td>
              <td style={{ width: '28%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="ax-bar-track"><div className="ax-bar" style={{ width: `${(t.count / max) * 100}%` }} /></div>
                  <b className="nx-num" style={{ color: 'var(--ink)' }}>{t.count}</b>
                </div>
              </td>
              <td style={{ width: '30%' }}><SentimentCell t={t} /></td>
              <td className="nx-num">{rateText(t.successRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TopicList({ rows, max, onOpen }: { rows: TopicRow[]; max: number; onOpen: (t: TopicRow) => void }) {
  return (
    <div className="ax-topic-list">
      {rows.map((t) => (
        <button key={t.topic} type="button" className="ax-topic-row" onClick={() => onOpen(t)}
          style={{ background: 'none', border: 0, borderBottom: '1px solid var(--line)', textAlign: 'start', color: 'var(--ink)', cursor: 'pointer', fontFamily: 'inherit' }}>
          <span style={{ minWidth: 0 }}><TopicName t={t} /></span>
          <small className="nx-num">{t.count} محادثة · نجاح {rateText(t.successRate)}</small>
          <div className="ax-bar-track"><div className="ax-bar" style={{ width: `${(t.count / max) * 100}%`, height: 6 }} /></div>
          <div style={{ gridColumn: '1 / -1' }}><SentimentCell t={t} /></div>
        </button>
      ))}
    </div>
  )
}
