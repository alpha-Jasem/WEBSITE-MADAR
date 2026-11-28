import { useEffect, useRef } from 'react'
import { PhoneOff } from 'lucide-react'

export type CallSpeaker = 'none' | 'agent' | 'user'
type Mode = 'connecting' | 'agent' | 'user' | 'listen'

const RGB: Record<Mode, [number, number, number]> = {
  agent: [139, 116, 255], user: [34, 197, 94], listen: [143, 152, 196], connecting: [245, 158, 11],
}
const LABEL: Record<Mode, [string, string]> = {
  connecting: ['جاري الاتصال…', 'نجهّز المكالمة'],
  agent: ['الوكيل يتكلم', 'اسمعه للنهاية أو قاطعه'],
  user: ['أنت تتكلم', 'الوكيل يسمعك'],
  listen: ['الوكيل يسمعك', 'تكلّم متى ما جهزت'],
}
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

const CSS = `
.cp { position: fixed; z-index: 60; inset-inline: 0; bottom: 18px; margin-inline: auto; width: min(380px, calc(100vw - 32px)); background: #0f1320; color: #f1f2f7;
  border: 1px solid #272b3d; border-radius: 20px; box-shadow: 0 18px 50px rgba(0,0,0,.35); padding: 12px 14px; display: flex; align-items: center; gap: 12px; }
.cp-wave { width: 104px; height: 60px; flex: none; display: block; }
.cp-main { flex: 1; min-width: 0; display: grid; gap: 2px; }
.cp-main b { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cp-main span { font-size: 12.5px; color: #a9acc2; }
.cp-time { font-variant-numeric: tabular-nums; direction: ltr; text-align: right; }
.cp-end { border: 0; width: 44px; height: 44px; border-radius: 50%; background: var(--bad, #dc2626); color: #fff; cursor: pointer; display: grid; place-items: center; flex: none; }
.cp-end:focus-visible { outline: 3px solid #f1f2f7; outline-offset: 2px; }
`

/** Three layered ribbons across a mirror line. They widen and speed up with the voice and take the colour of whoever speaks. */
function Ribbons({ mode, level }: { mode: Mode; level: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const live = useRef({ mode, level })
  live.current = { mode, level }

  useEffect(() => {
    const cv = ref.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const W = cv.clientWidth, H = cv.clientHeight
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const cur: number[] = [...RGB[live.current.mode]]
    let sm = 0, last = performance.now(), raf = 0
    const col = (a: number, k = 1) => `rgba(${Math.round(cur[0] * k)},${Math.round(cur[1] * k)},${Math.round(cur[2] * k)},${a})`

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const t = now / 1000, { mode: m, level: lv } = live.current
      const tgt = RGB[m]
      for (let i = 0; i < 3; i++) cur[i] += (tgt[i] - cur[i]) * Math.min(1, dt * 6)
      // How wide the ribbons open: the real loudness while someone speaks, a gentle idle motion otherwise.
      const want = m === 'agent' || m === 'user' ? Math.min(1, Math.max(0.22, lv * 4)) : m === 'connecting' ? 0.2 + 0.12 * Math.sin(t * 4) : 0.06 + 0.03 * Math.sin(t * 1.6)
      sm += (want - sm) * Math.min(1, dt * 10)
      const a = reduce ? (m === 'agent' || m === 'user' ? 0.5 : 0.08) : sm, sp = reduce ? 0 : t
      ctx.clearRect(0, 0, W, H)
      const cy = H / 2
      ctx.strokeStyle = col(0.2); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(W * 0.04, cy); ctx.lineTo(W * 0.96, cy); ctx.stroke()
      for (let L = 2; L >= 0; L--) {
        const A = a * H * (0.46 - L * 0.1) + H * 0.02, top: [number, number][] = []
        for (let x = W * 0.04; x <= W * 0.96; x += 2) {
          const u = (x - W * 0.04) / (W * 0.92), env = Math.sin(u * Math.PI)
          top.push([x, cy + Math.sin(u * (6 + L * 2) + sp * (2.4 + L * 0.8) + L * 1.3) * A * env])
        }
        ctx.beginPath(); top.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])))
        for (let i = top.length - 1; i >= 0; i--) ctx.lineTo(top[i][0], cy - (top[i][1] - cy) * 0.9)
        ctx.closePath()
        const g = ctx.createLinearGradient(0, 0, 0, H)
        g.addColorStop(0, col(0)); g.addColorStop(0.5, col(0.3 + a * 0.3 - L * 0.06, 1 + L * 0.1)); g.addColorStop(1, col(0))
        ctx.fillStyle = g; ctx.fill()
        ctx.beginPath(); top.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])))
        ctx.strokeStyle = col(0.95 - L * 0.25, 1.15); ctx.lineWidth = 2 - L * 0.4; ctx.stroke()
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={ref} className="cp-wave" aria-hidden="true" />
}

/** A floating card for a live web call. `level` (0 to 1) is the loudness of whoever speaks. */
export function CallPanel({ state, speaker, level, seconds, agentName, onHangUp }: {
  state: 'idle' | 'connecting' | 'live'
  speaker: CallSpeaker
  level: number
  seconds: number
  agentName: string
  onHangUp: () => void
}) {
  if (state === 'idle') return null
  const mode: Mode = state === 'connecting' ? 'connecting' : speaker === 'none' ? 'listen' : speaker
  const [title, hint] = LABEL[mode]
  return (
    <div className="cp" role="status" aria-live="polite" dir="rtl">
      <style>{CSS}</style>
      <Ribbons mode={mode} level={level} />
      <div className="cp-main">
        <b>{agentName || 'الوكيل'}</b>
        <span>{title} · {hint}</span>
        {state === 'live' && <span className="cp-time">{mmss(seconds)}</span>}
      </div>
      <button type="button" className="cp-end" onClick={onHangUp} aria-label="إنهاء المكالمة"><PhoneOff size={18} /></button>
    </div>
  )
}
