import { useState, type ReactNode } from 'react'
import { Sparkles, AlertTriangle, ClipboardCheck, ListChecks, CheckCircle2, Circle, Copy, Check } from 'lucide-react'
import type { AICallLog } from '@/types/dashboard'
import {
  callVerdict, VERDICT_LABEL, verdictTone, sentimentKind, SENTIMENT_LABEL, sentimentTone, sentimentScore, callCost,
  evaluationCriteria, collectedData, formatValue, callWarnings, terminationLabel,
} from '@/lib/callAnalysis'
import { CHANNEL_LABEL, fmtDuration, fmtFull, type ConvItem } from './model'
import { Chip } from './ui'

const LANG_LABEL: Record<string, string> = { ar: 'العربية', en: 'الإنجليزية' }

/** نظرة عامة: summary, platform warnings, a metadata grid and the fields the agent extracted. */
export function ConversationOverview({ item, fields, status, onCopy }: {
  item: ConvItem
  fields: [string, string][]
  status: ReactNode
  onCopy: (text: string) => Promise<boolean>
}) {
  const call = item.call
  const warnings = call ? callWarnings(call) : []
  const cost = call ? callCost(call) : null
  const mood = call ? sentimentKind(call) : null
  const frustration = call?.analysis?.sentiment?.frustration
  const id = call ? call.external_id || call.id : item.key
  const [copied, setCopied] = useState(false)
  async function copyId() {
    if (await onCopy(id)) { setCopied(true); setTimeout(() => setCopied(false), 1500) }
  }
  const meta: [string, ReactNode, boolean?][] = ([
    ['معرّف المحادثة', (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
        <span dir="ltr" style={{ fontSize: 12, minWidth: 0, overflowWrap: 'anywhere' }}>{id}</span>
        <button type="button" className="nx-icon-btn" style={{ width: 24, height: 24 }} aria-label="نسخ المعرّف" title="نسخ المعرّف" onClick={copyId}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </span>
    )],
    ['الحالة', status],
    ['المشاعر', mood ? (
      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <Chip tone={sentimentTone(mood)}>{SENTIMENT_LABEL[mood]}</Chip>
        {typeof frustration === 'number' && <small style={{ color: 'var(--muted)' }} className="nx-num">انزعاج {frustration.toFixed(2)}</small>}
      </span>
    ) : ''],
    ['التاريخ', fmtFull(item.time)],
    ['القناة', CHANNEL_LABEL[item.channel]],
    ['المدة', call && call.duration_seconds > 0 ? fmtDuration(call.duration_seconds) : ''],
    ['الرسائل', item.messageCount ? String(item.messageCount) : ''],
    ['الاستهلاك', cost != null ? `${cost.toLocaleString('en-US')} رصيد` : ''],
    ['معرّف العميل', call?.analysis?.user_id || '', true],
    ['رقم العميل', item.phone, true],
    ['سبب الانتهاء', call ? terminationLabel(call) : ''],
    ['اللغة', call?.analysis?.language ? LANG_LABEL[call.analysis.language] || call.analysis.language : ''],
  ] as [string, ReactNode, boolean?][]).filter(([, v]) => v)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {warnings.length > 0 && (
        <div className="ax-warn">
          {warnings.map((w, i) => (
            <div key={i} className="nx-alert warn"><AlertTriangle size={16} /><p>{w}</p></div>
          ))}
        </div>
      )}
      <section>
        <p className="ax-section-h" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Sparkles size={14} style={{ color: 'var(--ai)' }} /> الملخص</p>
        {call?.summary || (!call && item.summary)
          ? <p style={{ margin: 0, lineHeight: 1.8 }}>{call ? call.summary : item.summary}</p>
          : <p style={{ margin: 0, color: 'var(--dim)' }}>ما فيه ملخص لهذه المحادثة.</p>}
      </section>
      <section>
        <p className="ax-section-h">بيانات المحادثة</p>
        <dl className="ax-meta" style={{ margin: 0 }}>
          {meta.map(([k, v, ltr]) => (
            <div key={k}><dt>{k}</dt><dd className="nx-num">{ltr ? <span dir="ltr" style={{ fontSize: 12 }}>{v}</span> : v}</dd></div>
          ))}
        </dl>
      </section>
      {fields.length > 0 && (
        <section>
          <p className="ax-section-h">التفاصيل المستخرجة</p>
          <dl className="nx-kv">
            {fields.map(([k, v]) => <FieldPair key={k} k={k} v={v} />)}
          </dl>
        </section>
      )}
    </div>
  )
}

function FieldPair({ k, v }: { k: string; v: string }) {
  return <><dt>{k}</dt><dd>{v}</dd></>
}

/** التحليل: each evaluation criterion with its result and reasoning, then the collected data. */
export function ConversationAnalysis({ call }: { call: AICallLog }) {
  const criteria = evaluationCriteria(call)
  const data = collectedData(call)
  if (!criteria.length && !data.length) {
    return <div className="nx-empty">ما فيه تحليل لهذه المحادثة. يظهر هنا تقييم الوكيل والبيانات اللي جمعها لما تتوفر.</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {criteria.length > 0 && (
        <section>
          <p className="ax-section-h" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ListChecks size={14} /> معايير التقييم</p>
          <div className="ax-crit">
            {criteria.map((c) => (
              <div key={c.key} className="ax-crit-item">
                <header>
                  <b>{c.label}</b>
                  <Chip tone={verdictTone(c.result)}>{VERDICT_LABEL[c.result]}</Chip>
                </header>
                {c.rationale && <p>{c.rationale}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
      {data.length > 0 && (
        <section>
          <p className="ax-section-h" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ClipboardCheck size={14} /> البيانات المجمّعة
            <span style={{ marginInlineStart: 'auto', fontWeight: 500, color: 'var(--dim)' }} className="nx-num">{data.filter((d) => d.filled).length} من {data.length}</span>
          </p>
          <dl className="ax-data" style={{ margin: 0 }}>
            {data.map((d) => (
              <div key={d.key} className={`ax-data-row${d.filled ? '' : ' empty'}`}>
                <dt>
                  {d.filled ? <CheckCircle2 size={14} style={{ color: 'var(--ok)' }} aria-label="متوفر" /> : <Circle size={14} style={{ color: 'var(--dim)' }} aria-label="غير متوفر" />}
                  {d.label}
                </dt>
                <dd>
                  {d.filled ? <span className="ax-pill">{formatValue(d.value)}</span> : 'لم يُذكر'}
                  {d.rationale && <small>{d.rationale}</small>}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  )
}

/** Side card with the verdict, score and mood. Renders nothing when the call has no analysis. */
export function VerdictCard({ call, onAnalysis }: { call: AICallLog; onAnalysis: () => void }) {
  const a = call.analysis
  if (!a) return null
  const verdict = callVerdict(call)
  const mood = sentimentKind(call)
  const score = sentimentScore(call)
  const frustration = a.sentiment?.frustration
  const criteria = evaluationCriteria(call)
  const passed = criteria.filter((c) => c.result === 'success').length
  const rows: [string, ReactNode][] = []
  if (verdict !== 'none') rows.push(['النتيجة', <Chip key="v" tone={verdictTone(verdict)}>{VERDICT_LABEL[verdict]}</Chip>])
  if (typeof a.success_score === 'number') rows.push(['درجة النجاح', <span key="s" className="nx-num">{Math.round(a.success_score * (a.success_score <= 1 ? 100 : 1))}%</span>])
  if (mood) rows.push(['المشاعر', <span key="m" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Chip tone={sentimentTone(mood)}>{SENTIMENT_LABEL[mood]}</Chip>{score != null && <span className="nx-num" dir="ltr" style={{ color: 'var(--muted)' }}>{score > 0 ? '+' : ''}{score.toFixed(2)}</span>}</span>])
  if (typeof frustration === 'number') rows.push(['الانزعاج', <span key="f" className="nx-num">{frustration.toFixed(2)}</span>])
  if (criteria.length) rows.push(['المعايير', <button key="c" type="button" className="nx-link" onClick={onAnalysis}>{passed} من {criteria.length} ناجحة</button>])
  if (!rows.length) return null
  return (
    <div className="nx-card">
      <h3><ClipboardCheck size={16} style={{ color: 'var(--ok)' }} /> تقييم المحادثة</h3>
      {a.title && <p style={{ margin: '0 0 12px', fontWeight: 600 }}>{a.title}</p>}
      <dl className="nx-kv" style={{ alignItems: 'center' }}>
        {rows.map(([k, v]) => <FieldPair2 key={k} k={k} v={v} />)}
      </dl>
    </div>
  )
}

function FieldPair2({ k, v }: { k: string; v: ReactNode }) {
  return <><dt>{k}</dt><dd>{v}</dd></>
}
