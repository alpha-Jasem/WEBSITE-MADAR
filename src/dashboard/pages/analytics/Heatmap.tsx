import { useMemo } from 'react'
import type { AICallLog } from '@/types/dashboard'

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const BLOCK = 3
const BLOCKS = 24 / BLOCK
const blockLabel = (b: number) => `${String(b * BLOCK).padStart(2, '0')}–${String(b * BLOCK + BLOCK).padStart(2, '0')}`

/** Busy hours: how many conversations land in each weekday x 3-hour block, so staffing and
 *  agent hours can follow the real rhythm of the business. */
export function BusyHoursMap({ calls }: { calls: AICallLog[] }) {
  const { grid, max, peak } = useMemo(() => {
    const g = Array.from({ length: 7 }, () => Array<number>(BLOCKS).fill(0))
    for (const c of calls) {
      const d = new Date(c.call_time)
      if (Number.isNaN(d.getTime())) continue
      g[d.getDay()][Math.floor(d.getHours() / BLOCK)] += 1
    }
    let m = 0, p: { day: number; block: number; n: number } | null = null
    g.forEach((row, day) => row.forEach((n, block) => { if (n > m) { m = n; p = { day, block, n } } }))
    return { grid: g, max: m, peak: p as { day: number; block: number; n: number } | null }
  }, [calls])

  if (max === 0) return null
  return (
    <div className="ax-heat" role="img" aria-label="خريطة أوقات الضغط حسب اليوم والساعة">
      <div className="ax-heat-grid">
        <span />
        {Array.from({ length: BLOCKS }, (_, b) => <small key={b} className="ax-heat-h">{blockLabel(b)}</small>)}
        {grid.map((row, day) => (
          <div key={day} className="ax-heat-row">
            <small className="ax-heat-d">{DAYS[day]}</small>
            {row.map((n, b) => (
              <i key={b} className="ax-heat-c" title={`${DAYS[day]} ${blockLabel(b)}: ${n}`}
                style={{ background: n === 0 ? 'var(--panel-2)' : `color-mix(in srgb, var(--sky) ${Math.round(18 + (n / max) * 72)}%, var(--panel-2))` }} />
            ))}
          </div>
        ))}
      </div>
      {peak && <p className="ax-heat-note">أعلى ضغط: {DAYS[peak.day]} من {blockLabel(peak.block)} ({peak.n.toLocaleString('en-US')} محادثة).</p>}
    </div>
  )
}
