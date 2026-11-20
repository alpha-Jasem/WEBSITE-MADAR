import { Meter, EmptyLine } from '../shared/night'
import { callVerdict, sentimentKind } from '@/lib/callAnalysis'
import { CHANNEL_LABEL } from '../conversations/model'
import type { AICallLog } from '@/types/dashboard'

/** Customer satisfaction per channel, read from the sentiment and verdict the agent's analysis already stores. */
export function ChannelSatisfaction({ calls }: { calls: AICallLog[] }) {
  const channels = [...new Set(calls.map((c) => c.channel || 'phone'))]
  const rows = channels.map((ch) => {
    const list = calls.filter((c) => (c.channel || 'phone') === ch)
    const felt = list.map(sentimentKind).filter((k) => k != null)
    const positive = felt.filter((k) => k === 'positive').length
    let ok = 0, judged = 0
    for (const c of list) { const v = callVerdict(c); if (v === 'success') { ok++; judged++ } else if (v === 'failure') judged++ }
    return { ch, total: list.length, felt: felt.length, positive, ok, judged }
  }).sort((a, b) => b.total - a.total)

  if (rows.every((r) => r.felt === 0)) return <EmptyLine>ما فيه تقييم مشاعر كافٍ في هذه الفترة.</EmptyLine>
  return (
    <div>
      {rows.map((r) => (
        <Meter
          key={r.ch}
          label={<>{CHANNEL_LABEL[r.ch as keyof typeof CHANNEL_LABEL] || r.ch} <small style={{ color: 'var(--dim)' }}>· {r.total} محادثة{r.judged ? ` · نجح الوكيل في ${Math.round((r.ok / r.judged) * 100)}%` : ''}</small></>}
          value={r.felt ? r.positive : 0}
          max={Math.max(1, r.felt)}
          display={r.felt ? `${Math.round((r.positive / r.felt) * 100)}% راضون` : '—'}
          color="var(--ok)"
        />
      ))}
      <small style={{ color: 'var(--dim)' }}>نسبة المحادثات ذات الانطباع الإيجابي من المحادثات التي حُلّلت مشاعرها.</small>
    </div>
  )
}
