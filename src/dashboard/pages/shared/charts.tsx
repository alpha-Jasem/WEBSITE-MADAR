import { useId, useLayoutEffect, useRef, useState } from 'react'

/* Small SVG charts in the Night style. Drawn at the container's real pixel width (not a scaled
   viewBox) so axis text stays legible on phones. Time runs right-to-left like the rest of the
   RTL dashboard: pass values oldest-first and the oldest lands on the right. Colours come from
   the dv2 tokens, so both themes work. */

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setWidth(Math.floor(el.getBoundingClientRect().width))
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

/** A y-axis top and ticks with round integer steps, so gridlines line up with real values. */
export function niceScale(maxValue: number) {
  const max = Math.max(0, maxValue)
  if (max <= 4) return { top: 4, ticks: [0, 2, 4] }
  const raw = (max * 1.1) / 2
  const pow = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw && Number.isInteger(s)) ?? 10 * pow
  return { top: step * 2, ticks: [0, step, step * 2] }
}

const PAD = { left: 10, right: 40, top: 18, bottom: 26 }
const LABEL_GAP = 48

function labelStep(n: number, plotW: number) {
  const fit = Math.max(1, Math.floor(plotW / LABEL_GAP))
  return Math.max(1, Math.ceil(n / fit))
}

function shortNum(v: number) {
  if (v >= 1_000_000) return `${Math.round(v / 100_000) / 10}M`
  if (v >= 10_000) return `${Math.round(v / 1000)}k`
  return v.toLocaleString('en-US')
}

function Tip({ x, y, text, width }: { x: number; y: number; text: string; width: number }) {
  const w = Math.max(44, text.length * 6.6 + 16)
  const left = Math.min(Math.max(x - w / 2, 2), width - w - 2)
  return (
    <g pointerEvents="none">
      <rect x={left} y={Math.max(0, y - 34)} width={w} height={24} rx={6} style={{ fill: 'var(--surface-inverse)' }} />
      <text x={left + w / 2} y={Math.max(0, y - 34) + 16} fontSize={11.5} fontWeight={500} textAnchor="middle" style={{ fill: '#F5F5F5' }}>{text}</text>
    </g>
  )
}

export function AreaChart({ values, labels, height = 210, ariaLabel, color = 'var(--sky)', format = (n: number) => n.toLocaleString('en-US') }: {
  color?: string
  values: number[]
  labels: string[]
  height?: number
  ariaLabel: string
  format?: (n: number) => string
}) {
  const [ref, W] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const uid = useId().replace(/:/g, '')
  const n = values.length
  const H = height
  const plotW = Math.max(1, W - PAD.left - PAD.right)
  const { top, ticks } = niceScale(Math.max(0, ...values))
  const x = (i: number) => W - PAD.right - (n <= 1 ? plotW / 2 : (i * plotW) / (n - 1))
  const y = (v: number) => H - PAD.bottom - (v / top) * (H - PAD.top - PAD.bottom)
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const step = labelStep(n, plotW)

  return (
    <div ref={ref} style={{ width: '100%', minWidth: 0 }}>
      {W > 0 && n > 0 && (
        <svg width={W} height={H} role="img" aria-label={ariaLabel} style={{ display: 'block', overflow: 'visible' }} onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id={`af-${uid}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" style={{ stopColor: color, stopOpacity: 0.16 }} />
              <stop offset="1" style={{ stopColor: color, stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} style={{ stroke: 'var(--line)' }} />
              <text x={W - 4} y={y(v) + 4} fontSize={11} textAnchor="end" style={{ fill: 'var(--dim)' }}>{shortNum(v)}</text>
            </g>
          ))}
          {n > 1 && <path d={`${line} L${x(n - 1)},${H - PAD.bottom} L${x(0)},${H - PAD.bottom} Z`} fill={`url(#af-${uid})`} />}
          <path d={line} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" style={n > 1 ? undefined : { display: 'none' }} />
          {labels.map((l, i) => ((n - 1 - i) % step === 0 && l ? (
            <text key={i} x={x(i)} y={H - 6} fontSize={10.5} textAnchor="middle" style={{ fill: 'var(--dim)' }}>{l}</text>
          ) : null))}
          {hover != null && <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} style={{ stroke: 'var(--line-2)' }} strokeDasharray="3 3" />}
          <circle
            cx={x(hover ?? n - 1)} cy={y(values[hover ?? n - 1])} r={3.5} strokeWidth={1.6}
            style={{ fill: 'var(--panel)', stroke: color }}
          />
          {values.map((_, i) => (
            <rect
              key={i} x={x(i) - plotW / Math.max(1, (n - 1) * 2)} y={0} width={plotW / Math.max(1, n - 1)} height={H}
              fill="transparent" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)}
            >
              <title>{`${labels[i] || ''}: ${format(values[i])}`}</title>
            </rect>
          ))}
          {hover != null && <Tip x={x(hover)} y={y(values[hover])} width={W} text={`${labels[hover] ? labels[hover] + ' · ' : ''}${format(values[hover])}`} />}
        </svg>
      )}
      {W === 0 && <div style={{ height: H }} />}
    </div>
  )
}

export function BarChart({ values, labels, height = 200, ariaLabel, highlightLast = true, showValues = true, format = (n: number) => n.toLocaleString('en-US') }: {
  values: number[]
  labels: string[]
  height?: number
  ariaLabel: string
  highlightLast?: boolean
  showValues?: boolean
  format?: (n: number) => string
}) {
  const [ref, W] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const n = values.length
  const H = height
  const plotW = Math.max(1, W - PAD.left - PAD.right)
  const band = plotW / Math.max(1, n)
  const barW = Math.max(3, Math.min(42, band * 0.62))
  const { top, ticks } = niceScale(Math.max(0, ...values))
  const cx = (i: number) => W - PAD.right - band * (i + 0.5)
  const y = (v: number) => H - PAD.bottom - (v / top) * (H - PAD.top - PAD.bottom)
  const step = labelStep(n, plotW)
  const valuesFit = showValues && band >= 30

  return (
    <div ref={ref} style={{ width: '100%', minWidth: 0 }}>
      {W > 0 && n > 0 && (
        <svg width={W} height={H} role="img" aria-label={ariaLabel} style={{ display: 'block', overflow: 'visible' }} onMouseLeave={() => setHover(null)}>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} style={{ stroke: 'var(--line)' }} />
              <text x={W - 4} y={y(v) + 4} fontSize={11} textAnchor="end" style={{ fill: 'var(--dim)' }}>{shortNum(v)}</text>
            </g>
          ))}
          {values.map((v, i) => {
            const h = Math.max(0, H - PAD.bottom - y(v))
            const isLast = highlightLast && i === n - 1
            return (
              <g key={i} onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)}>
                <rect x={cx(i) - band / 2} y={0} width={band} height={H} fill="transparent" />
                <rect
                  x={cx(i) - barW / 2} y={H - PAD.bottom - Math.max(h, v > 0 ? 2 : 0)} width={barW} height={Math.max(h, v > 0 ? 2 : 0)}
                  rx={Math.min(3, barW / 3)} fill={isLast ? 'var(--sky)' : 'color-mix(in srgb, var(--sky) 45%, transparent)'}
                  style={{ opacity: hover == null || hover === i ? 1 : 0.55 }}
                >
                  <title>{`${labels[i] || ''}: ${format(v)}`}</title>
                </rect>
                {valuesFit && v > 0 && (
                  <text x={cx(i)} y={y(v) - 5} fontSize={10.5} fontWeight={700} textAnchor="middle" style={{ fill: 'var(--muted)' }}>{shortNum(v)}</text>
                )}
              </g>
            )
          })}
          {labels.map((l, i) => ((n - 1 - i) % step === 0 && l ? (
            <text key={i} x={cx(i)} y={H - 6} fontSize={10.5} textAnchor="middle" style={{ fill: 'var(--dim)' }}>{l}</text>
          ) : null))}
          {hover != null && !valuesFit && <Tip x={cx(hover)} y={y(values[hover])} width={W} text={`${labels[hover] ? labels[hover] + ' · ' : ''}${format(values[hover])}`} />}
        </svg>
      )}
      {W === 0 && <div style={{ height: H }} />}
    </div>
  )
}
