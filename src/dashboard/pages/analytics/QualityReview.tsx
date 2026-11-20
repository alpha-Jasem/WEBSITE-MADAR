import { callVerdict, sentimentKind, callTitle, callWarnings, contactName } from '@/lib/callAnalysis'
import { CHANNEL_LABEL } from '../conversations/model'
import { Chip } from '../conversations/ui'
import { EmptyLine } from '../shared/night'
import type { AICallLog } from '@/types/dashboard'

interface Flagged { call: AICallLog; score: number; reasons: string[] }

/** Conversations most worth a person's look, ranked from the analysis the agent already stored. */
export function flagConversations(calls: AICallLog[]): Flagged[] {
  const out: Flagged[] = []
  for (const call of calls) {
    const reasons: string[] = []
    let score = 0
    if (callVerdict(call) === 'failure') { reasons.push('ما حقق الوكيل الهدف'); score += 3 }
    if (sentimentKind(call) === 'negative') { reasons.push('عميل منزعج'); score += 3 }
    if (call.needs_review) { reasons.push('تنتظر مراجعة'); score += 2 }
    if (callWarnings(call).length > 0) { reasons.push('تنبيه من التحليل'); score += 1 }
    if (score > 0) out.push({ call, score, reasons })
  }
  return out.sort((a, b) => b.score - a.score || Date.parse(b.call.call_time) - Date.parse(a.call.call_time))
}

export function QualityReview({ flagged, total, onOpen }: { flagged: Flagged[]; total: number; onOpen: (c: AICallLog) => void }) {
  if (flagged.length === 0) return <EmptyLine>لا توجد محادثات مقلقة في هذه الفترة من أصل {total}.</EmptyLine>
  return (
    <div className="nx-inbox">
      {flagged.slice(0, 5).map(({ call, reasons }) => (
        <div key={call.id} className="nx-item">
          <div style={{ minWidth: 0, flex: 1 }}>
            <p>{callTitle(call)}</p>
            <small>{contactName(call) || call.phone || 'عميل'} · {CHANNEL_LABEL[(call.channel || 'phone') as keyof typeof CHANNEL_LABEL]}</small>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>{reasons.map((r) => <Chip key={r} tone="warn">{r}</Chip>)}</div>
          </div>
          <div className="nx-acts"><button type="button" className="nx-btn sm pri" onClick={() => onOpen(call)}>افتح</button></div>
        </div>
      ))}
      <small style={{ color: 'var(--dim)' }}>{flagged.length} من {total} محادثة تستحق نظرة.</small>
    </div>
  )
}
