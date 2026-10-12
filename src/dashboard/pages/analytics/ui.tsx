import { useId } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import './analytics.css'

/** Tiny trend line for a KPI tile. Values oldest-first; drawn right-to-left like the other RTL charts. */
export function Sparkline({ values, label }: { values: number[]; label: string }) {
  const uid = useId().replace(/:/g, '')
  const W = 200, H = 34, P = 3
  const n = values.length
  const max = Math.max(1, ...values)
  const x = (i: number) => W - P - (n <= 1 ? (W - 2 * P) / 2 : (i * (W - 2 * P)) / (n - 1))
  const y = (v: number) => H - P - (v / max) * (H - 2 * P)
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  return (
    <svg className="ax-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={label}>
      <defs>
        <linearGradient id={`sf-${uid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--sky)', stopOpacity: 0.28 }} />
          <stop offset="1" style={{ stopColor: 'var(--sky)', stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      {n > 1 && <path d={`${line} L${x(n - 1)},${H} L${x(0)},${H} Z`} fill={`url(#sf-${uid})`} />}
      {n > 1 && <path d={line} fill="none" strokeWidth={1.8} vectorEffect="non-scaling-stroke" style={{ stroke: 'var(--sky)' }} strokeLinejoin="round" />}
    </svg>
  )
}

export function SentimentBar({ positive, neutral, negative }: { positive: number; neutral: number; negative: number }) {
  const total = positive + neutral + negative
  if (!total) return <div className="ax-senti" aria-label="لا يوجد تحليل مشاعر" />
  const w = (v: number) => `${(v / total) * 100}%`
  return (
    <div className="ax-senti" role="img" aria-label={`إيجابي ${positive}، محايد ${neutral}، سلبي ${negative}`}
      title={`إيجابي ${positive} · محايد ${neutral} · سلبي ${negative}`}>
      <i className="p" style={{ width: w(positive) }} />
      <i className="n" style={{ width: w(neutral) }} />
      <i className="x" style={{ width: w(negative) }} />
    </div>
  )
}

export function SentimentLegend() {
  return (
    <div className="ax-legend">
      <span style={{ ['--c' as string]: 'var(--ok)' }}>إيجابي</span>
      <span style={{ ['--c' as string]: 'var(--warn)' }}>محايد</span>
      <span style={{ ['--c' as string]: 'var(--bad)' }}>سلبي</span>
    </div>
  )
}

export type SortDir = 'asc' | 'desc'

export function SortTh<K extends string>({ k, label, sort, onSort }: {
  k: K
  label: string
  sort: { key: K; dir: SortDir }
  onSort: (k: K) => void
}) {
  const active = sort.key === k
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="ax-sort" onClick={() => onSort(k)}>
        {label}<Icon aria-hidden="true" />
      </button>
    </th>
  )
}

export function nextSort<K extends string>(cur: { key: K; dir: SortDir }, k: K): { key: K; dir: SortDir } {
  return cur.key === k ? { key: k, dir: cur.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'desc' }
}
