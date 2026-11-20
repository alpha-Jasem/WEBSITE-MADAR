import { useMemo } from 'react'
import type { AICallLog } from '@/types/dashboard'
import { containment } from './model'

const TARGET = 70

/** Containment rate with a target line and the change against the previous period. */
export function ContainmentBar({ calls, previous, phrase }: { calls: AICallLog[]; previous: AICallLog[]; phrase: string }) {
  const cur = useMemo(() => containment(calls), [calls])
  const prev = useMemo(() => containment(previous), [previous])
  if (cur.rate == null) return null
  const pct = Math.round(cur.rate * 100)
  const d = prev.rate == null ? null : pct - Math.round(prev.rate * 100)
  const met = pct >= TARGET
  return (
    <div className="ax-contain">
      <div className="ax-contain-top">
        <b style={{ color: met ? 'var(--ok, #3dd6a0)' : 'var(--warn)' }}>{pct}%</b>
        <span>{met ? 'فوق الهدف' : `أقل من الهدف بـ ${TARGET - pct}%`}</span>
        {d != null && d !== 0 && <small>{d > 0 ? '+' : ''}{d}% عن {phrase}</small>}
      </div>
      <div className="ax-contain-track" role="img" aria-label={`نسبة الاحتواء ${pct}% والهدف ${TARGET}%`}>
        <i style={{ width: `${pct}%` }} />
        <u style={{ insetInlineStart: `${TARGET}%` }} title={`الهدف ${TARGET}%`} />
      </div>
      <p className="ax-heat-note">
        {cur.contained.toLocaleString('en-US')} محادثة خلّصها الوكيل بنفسه، و{cur.escalated.toLocaleString('en-US')} احتاجت الفريق (تحويل أو مراجعة أو فشل). الهدف {TARGET}%.
      </p>
    </div>
  )
}
