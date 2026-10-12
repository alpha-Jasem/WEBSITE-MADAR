import { OrbAvatar } from './OrbAvatar'

/*
 * The account button's picture: the person's orb inside a thin ring that shows how
 * much of the plan this month has used.
 *
 * Geometry (viewBox 100, r = 42, so the circumference is ~264):
 *  - "used" arc in ink, starting at the top and turned 18deg clockwise;
 *  - "remaining" arc in grey, mirrored (rotateY 180deg ≡ scaleX(-1)) so it runs anticlockwise
 *    from the top, leaving an 18deg gap on each side of the used arc.
 * A 1% arc is always drawn so an empty plan still reads as a ring with a marker.
 * Arcs animate stroke-dasharray / stroke over 0.6s; the orb and the percent text
 * swap with a 150ms scale/opacity change (the text shows while the menu is open).
 */

const R = 42
const C = 2 * Math.PI * R // ≈ 263.9
const GAP = (18 / 360) * C // the 18deg offset, as a stroke length

export const USAGE_RING_CSS = `
  .uring { position: relative; width: 2.3rem; height: 2.3rem; display: grid; place-items: center; flex: none; }
  .uring svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
  .uring-layer { transform-origin: 50% 50%; transform-box: view-box; transition: opacity .3s cubic-bezier(.4,0,.2,1); }
  .uring-used { transform: rotate(18deg); }
  /* the mirror of rotateY(180deg), written as a 2D flip so every engine applies it to SVG */
  .uring-rest { transform: scaleX(-1); }
  .uring circle { fill: none; stroke-width: 6; stroke-linecap: round;
    transition: stroke-dasharray .6s ease, stroke .6s ease !important; }
  .uring-used circle { stroke: var(--ring-used, var(--ink)); }
  .uring-rest circle { stroke: var(--ring-rest, var(--line-2)); }
  .uring-orb, .uring-pct { grid-area: 1 / 1; transition: transform 150ms cubic-bezier(.4,0,.2,1), opacity 150ms cubic-bezier(.4,0,.2,1) !important; }
  .uring-orb { transform: scale(.65); border-radius: 50%; }
  .uring-pct { font-size: 9.5px; font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums; letter-spacing: -.01em;
    transform: scale(.6); opacity: 0; direction: ltr; }
  .uring.is-open .uring-orb { transform: scale(.3); opacity: 0; }
  .uring.is-open .uring-pct { transform: scale(1); opacity: 1; }
  @media (prefers-reduced-motion: reduce) {
    .uring circle, .uring-layer, .uring-orb, .uring-pct { transition: none !important; }
  }
`

export function UsageRingAvatar({ percent, open, seed, imageUrl }: {
  /** 0–100: share of the plan used this cycle. */
  percent: number
  /** True while the account menu is open: the ring shows the number instead of the orb. */
  open: boolean
  seed: string
  imageUrl?: string | null
}) {
  const pct = Math.max(0, Math.min(100, Math.round(Number.isFinite(percent) ? percent : 0)))
  const used = (Math.max(1, pct) / 100) * C
  const rest = Math.max(0, C - used - 2 * GAP)
  return (
    <span className={`uring${open ? ' is-open' : ''}`} aria-hidden="true" data-pct={pct}>
      <svg viewBox="0 0 100 100">
        {/* rotate(-90) puts the stroke's start at the top (the same point a 66 = C/4 dash offset reaches) */}
        <g className="uring-layer uring-rest" style={{ opacity: rest > 0.5 ? 1 : 0 }}>
          <circle cx="50" cy="50" r={R} transform="rotate(-90 50 50)" strokeDasharray={`${rest.toFixed(2)} ${C.toFixed(2)}`} />
        </g>
        <g className="uring-layer uring-used">
          <circle cx="50" cy="50" r={R} transform="rotate(-90 50 50)" strokeDasharray={`${used.toFixed(2)} ${C.toFixed(2)}`} />
        </g>
      </svg>
      <OrbAvatar seed={seed} imageUrl={imageUrl} size={36.8} className="uring-orb" />
      <span className="uring-pct">{pct}%</span>
    </span>
  )
}
