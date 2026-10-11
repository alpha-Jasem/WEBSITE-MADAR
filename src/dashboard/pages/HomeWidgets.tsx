import { useState } from 'react'
import { motion } from 'framer-motion'
import { CountUp } from '@/dashboard/components/uiExtras'
import { SPRING_SNAPPY } from '@/dashboard/components/motionTokens'

// Shared chart pieces and helpers. The Home page itself now lives in ./home/*;
// these stay here because Reports, Tickets and CallsAnalytics import them.

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `منذ ${mins} د`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `منذ ${hours} س`
  const days = Math.round(hours / 24)
  return `منذ ${days} ي`
}

// ─── Donut (moved from Home.tsx — now shared by booking-sources + AI performance) ──

export interface DonutSource { key: string; label: string; pct: number; color: string; count?: number }

// Professional-grade donut: real total in the center (not a meaningless "100%"), a small gap
// between segments instead of a solid ring, a legend with real counts alongside percentages,
// and two-way hover sync between the ring and the legend rows.
export function Donut({ sources, onSelect, total, centerLabel = 'الإجمالي' }: {
  sources: DonutSource[]
  onSelect?: (key: string) => void
  total?: number
  centerLabel?: string
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  const totalPct = sources.reduce((a, s) => a + s.pct, 0)
  const GAP = 1.2 // percentage-points of empty arc between segments

  let acc = 0
  const stops = sources.map((s) => {
    const start = acc
    const end = acc + s.pct
    const segEnd = Math.max(start, end - GAP)
    acc = end
    const dim = hovered != null && hovered !== s.key
    const color = dim ? `color-mix(in srgb, ${s.color} 30%, var(--slate-200))` : s.color
    return `${color} ${start}% ${segEnd}%, transparent ${segEnd}% ${end}%`
  }).join(',')

  function angleToKey(e: React.MouseEvent<HTMLDivElement>): string | null {
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = e.clientX - cx
    const dy = e.clientY - cy
    const angle = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360
    const pct = (angle / 360) * 100
    let acc2 = 0
    for (const s of sources) {
      acc2 += s.pct
      if (pct <= acc2) return s.key
    }
    return null
  }

  const hoveredSource = sources.find((s) => s.key === hovered) || null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ position: 'relative', width: 150, height: 150, margin: '0 auto' }}>
        <div
          onClick={(e) => { if (onSelect && totalPct > 0) { const k = angleToKey(e); if (k) onSelect(k) } }}
          onMouseMove={(e) => { if (totalPct > 0) setHovered(angleToKey(e)) }}
          onMouseLeave={() => setHovered(null)}
          style={{
            width: '100%', height: '100%', borderRadius: '50%', cursor: onSelect && totalPct > 0 ? 'pointer' : 'default',
            background: totalPct > 0 ? `conic-gradient(${stops})` : 'var(--slate-100)',
            transition: 'background 150ms ease',
          }}
        />
        <div style={{
          position: 'absolute', inset: 22, background: 'var(--surface-card)', borderRadius: '50%', pointerEvents: 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          {hoveredSource ? (
            <>
              <div style={{ fontFamily: 'var(--font-numeral)', fontWeight: 800, fontSize: 20 }}>{hoveredSource.count ?? `${hoveredSource.pct}%`}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)', maxWidth: 88, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hoveredSource.label}</div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: 'var(--font-numeral)', fontWeight: 800, fontSize: 20 }}>
                {total != null ? <CountUp value={total} /> : <CountUp value={totalPct} suffix="%" />}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{centerLabel}</div>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {sources.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>لا توجد بيانات بعد</div>}
        {sources.map((s) => (
          <div
            key={s.key}
            onClick={() => onSelect?.(s.key)}
            onMouseEnter={() => setHovered(s.key)}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '5px 6px', borderRadius: 'var(--radius-sm)',
              cursor: onSelect ? 'pointer' : 'default', background: hovered === s.key ? 'var(--surface-sunken)' : 'transparent',
              transition: 'background 120ms ease',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <span style={{ flex: 1, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
            {s.count != null && (
              <span style={{ fontFamily: 'var(--font-numeral)', color: 'var(--text-tertiary)', fontSize: 11, minWidth: 20, textAlign: 'left' }}>{s.count}</span>
            )}
            <span style={{ fontFamily: 'var(--font-numeral)', fontWeight: 700, minWidth: 36, textAlign: 'left' }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── PillBar — thick gradient progress bar with a label/value row above ───
// Shared so every page's "top N" ranked list (services, funnel steps, revenue
// by service...) uses the exact same shape instead of each page keeping its
// own copy that drifts out of sync when the style changes.

export function PillBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? value / max * 100 : 0
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5, fontSize: 'var(--text-body-sm)' }}>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-numeral)', fontWeight: 800, color: 'var(--brand-600)', flexShrink: 0 }}><CountUp value={value} /></span>
      </div>
      <div style={{ height: 11, background: 'var(--slate-100)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: pct / 100 }}
          transition={SPRING_SNAPPY}
          style={{
            width: '100%', height: '100%', borderRadius: 'var(--radius-full)', transformOrigin: 'left',
            backgroundImage: 'linear-gradient(90deg, var(--slate-900), var(--slate-500))',
          }}
        />
      </div>
    </div>
  )
}
