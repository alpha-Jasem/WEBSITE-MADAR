import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react'
import { McIcon, type McIconName } from './mcIcons'
import type { OrbitMoon } from './OrbitScene'
import { nf } from '../../../lib/format'

const OrbitScene = lazy(() => import('./OrbitScene'))
const REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Counts a whole number up from 0 once, eased. */
export function CountUp({ value, delay = 0 }: { value: number; delay?: number }) {
  const [shown, setShown] = useState(REDUCED ? value : 0)
  useEffect(() => {
    if (REDUCED) { setShown(value); return }
    let raf = 0
    const t0 = performance.now() + delay
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - t0) / 1100))
      setShown(value * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, delay])
  return <span className="jv-num">{nf(Math.round(shown))}</span>
}

/** Reveals a sentence word by word (Arabic letters keep their joined shapes). */
function useWordReveal(text: string) {
  const words = text.split(' ')
  const [n, setN] = useState(REDUCED ? words.length : 0)
  useEffect(() => {
    if (REDUCED) { setN(words.length); return }
    setN(0)
    let i = 0
    const id = window.setInterval(() => { i += 1; setN(i); if (i >= words.length) window.clearInterval(id) }, 85)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])
  return { shown: words.slice(0, n).join(' '), done: n >= words.length }
}

export interface HeroAction { id: string; icon: McIconName; title: string; reason: string; to: string }

/** Jarvis at the centre of what he watches: the summary types itself, the moons are live counts. */
export function JarvisHero({ status, tone, summary, moons, pulse, thinking, stats, actions, onAction, onStart, chat }: {
  status: string
  tone: 'alert' | 'busy' | 'calm'
  summary: string
  moons: OrbitMoon[]
  pulse: number
  thinking: boolean
  stats: { value: number; label: string }[]
  actions: HeroAction[]
  onAction: (to: string) => void
  onStart: () => void
  chat: ReactNode
}) {
  const { shown, done } = useWordReveal(summary)
  const hour = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Riyadh' }))
  return (
    <section className={`jv-hero jv-${tone}`} aria-label="جارفيس">
      <div className="jv-stage">
        <Suspense fallback={null}><OrbitScene moons={moons} pulse={pulse} busy={thinking} /></Suspense>
        {thinking && <span className="jv-think">جارفيس يفكّر…</span>}
      </div>
      <div className="jv-copy">
        <div className="jv-line"><span className="jv-dot" /><b>جارفيس</b><span>{status}</span></div>
        <h1 className="jv-h1">{hour < 12 ? 'صباح الخير' : 'مساء الخير'}، هذي أولوياتك اليوم</h1>
        <p className="jv-brief" aria-live="polite">
          <span aria-hidden="true" className="jv-ghost">{summary}</span>
          <span>{shown}<i className={done ? 'jv-caret blink' : 'jv-caret'} /></span>
        </p>
        <div className="jv-stats">
          {stats.map((s, i) => <div key={s.label} className="jv-stat"><b><CountUp value={s.value} delay={300 + i * 80} /></b><span>{s.label}</span></div>)}
        </div>
        {actions.length > 0 && (
          <div className="jv-acts">
            {actions.map(a => (
              <button key={a.id} className="jv-act" onClick={() => onAction(a.to)}>
                <McIcon name={a.icon} size={17} /><span><b>{a.title}</b><small>{a.reason}</small></span><McIcon name="chev" size={15} />
              </button>
            ))}
          </div>
        )}
        <div className="jv-ctrl"><button className="mc-go" onClick={onStart}><McIcon name="arrow" size={16} />أبدأ يومي</button></div>
        {chat}
      </div>
    </section>
  )
}
