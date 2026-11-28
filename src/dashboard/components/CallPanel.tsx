import { Mic, PhoneOff } from 'lucide-react'

export type CallSpeaker = 'none' | 'agent' | 'user'

const CSS = `
.cp { position: fixed; z-index: 60; inset-inline: 0; bottom: 18px; margin-inline: auto; width: min(360px, calc(100vw - 32px)); background: var(--panel, #fff); color: var(--ink, #111);
  border: 1px solid var(--line-2, #ddd); border-radius: 20px; box-shadow: 0 18px 50px rgba(0,0,0,.22); padding: 14px 16px; display: flex; align-items: center; gap: 14px; }
.cp-orb { position: relative; width: 64px; height: 64px; flex: none; display: grid; place-items: center; --lv: 0; --c: var(--muted, #888); }
.cp-orb[data-s="agent"] { --c: var(--ai, #8053f8); }
.cp-orb[data-s="user"] { --c: var(--ok, #16a34a); }
.cp-orb[data-s="connecting"] { --c: var(--warn, #f59e0b); }
.cp-core { position: relative; z-index: 2; width: 38px; height: 38px; border-radius: 50%; background: var(--c); display: grid; place-items: center; color: #fff;
  transform: scale(calc(1 + var(--lv) * .28)); transition: transform 120ms linear, background .3s; }
.cp-ring { position: absolute; inset: 6px; border-radius: 50%; border: 2px solid var(--c); opacity: 0; }
.cp-orb[data-s="agent"] .cp-ring, .cp-orb[data-s="user"] .cp-ring { animation: cp-wave 1.6s ease-out infinite; }
.cp-orb[data-s="agent"] .cp-ring:nth-child(2), .cp-orb[data-s="user"] .cp-ring:nth-child(2) { animation-delay: .5s; }
.cp-orb[data-s="agent"] .cp-ring:nth-child(3), .cp-orb[data-s="user"] .cp-ring:nth-child(3) { animation-delay: 1s; }
.cp-orb[data-s="listen"] .cp-core { animation: cp-breath 3s ease-in-out infinite; }
.cp-orb[data-s="connecting"] .cp-core { animation: cp-blink 1s ease-in-out infinite; }
.cp-bars { display: flex; gap: 3px; align-items: center; height: 18px; }
.cp-bars i { width: 3px; height: 100%; border-radius: 2px; background: #fff; transform-origin: center; animation: cp-bar .9s ease-in-out infinite; }
.cp-bars i:nth-child(2) { animation-delay: .15s; } .cp-bars i:nth-child(3) { animation-delay: .3s; } .cp-bars i:nth-child(4) { animation-delay: .45s; }
.cp-main { flex: 1; min-width: 0; display: grid; gap: 2px; }
.cp-main b { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cp-main span { font-size: 12.5px; color: var(--muted, #777); }
.cp-time { font-variant-numeric: tabular-nums; direction: ltr; font-size: 12px; color: var(--muted, #777); }
.cp-end { border: 0; width: 44px; height: 44px; border-radius: 50%; background: var(--bad, #dc2626); color: #fff; cursor: pointer; display: grid; place-items: center; flex: none; }
.cp-end:focus-visible { outline: 3px solid var(--ink, #111); outline-offset: 2px; }
@keyframes cp-wave { 0% { transform: scale(.7); opacity: .55; } 100% { transform: scale(1.45); opacity: 0; } }
@keyframes cp-breath { 50% { transform: scale(1.08); } }
@keyframes cp-blink { 50% { opacity: .45; } }
@keyframes cp-bar { 0%, 100% { transform: scaleY(.25); } 50% { transform: scaleY(1); } }
@media (prefers-reduced-motion: reduce) {
  .cp-orb .cp-ring, .cp-orb .cp-core, .cp-bars i { animation: none !important; transition: none !important; }
  .cp-orb[data-s="agent"] .cp-ring, .cp-orb[data-s="user"] .cp-ring { opacity: .35; transform: scale(1.15); }
  .cp-bars i { transform: scaleY(.7); }
}
`

const LABEL: Record<string, [string, string]> = {
  connecting: ['جاري الاتصال…', 'نجهّز المكالمة'],
  agent: ['الوكيل يتكلم', 'اسمعه للنهاية أو قاطعه'],
  user: ['أنت تتكلم', 'الوكيل يسمعك'],
  listen: ['الوكيل يسمعك', 'تكلّم متى ما جهزت'],
}
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

/** A floating card for a live web call: the orb waves while the agent speaks, glows green while you speak,
 *  breathes while the agent listens. `level` (0 to 1) is the loudness of whoever speaks. */
export function CallPanel({ state, speaker, level, seconds, agentName, onHangUp }: {
  state: 'idle' | 'connecting' | 'live'
  speaker: CallSpeaker
  level: number
  seconds: number
  agentName: string
  onHangUp: () => void
}) {
  if (state === 'idle') return null
  const mode = state === 'connecting' ? 'connecting' : speaker === 'none' ? 'listen' : speaker
  const [title, hint] = LABEL[mode]
  return (
    <div className="cp" role="status" aria-live="polite" dir="rtl">
      <style>{CSS}</style>
      <div className="cp-orb" data-s={mode} style={{ ['--lv' as string]: Math.min(1, Math.max(0, level)).toFixed(2) }} aria-hidden="true">
        <span className="cp-ring" /><span className="cp-ring" /><span className="cp-ring" />
        <span className="cp-core">
          {mode === 'agent' ? <span className="cp-bars"><i /><i /><i /><i /></span> : <Mic size={18} />}
        </span>
      </div>
      <div className="cp-main">
        <b>{agentName || 'الوكيل'}</b>
        <span>{title} · {hint}</span>
        {state === 'live' && <span className="cp-time">{mmss(seconds)}</span>}
      </div>
      <button type="button" className="cp-end" onClick={onHangUp} aria-label="إنهاء المكالمة"><PhoneOff size={18} /></button>
    </div>
  )
}
