import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'

/** True below the phone/tablet breakpoint the shell uses (900px), for props that can't take a media query. */
export function useIsNarrow(maxWidth = 900) {
  const query = `(max-width: ${maxWidth}px)`
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setNarrow(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return narrow
}

/* Page-level building blocks that mirror the approved "Night" prototype (public/demo/index.html):
   head row, cards with an h3, segmented controls, KPI tiles, row lines, meters, toggles, empty
   lines and tables that scroll inside their own wrapper. Everything reads the dv2 tokens, so the
   same markup works in the dark Night theme and the light Day theme. */

const NIGHT_PAGE_CSS = `
.np-page { display: flex; flex-direction: column; gap: 18px; min-width: 0; padding-bottom: 32px; }
.np-head { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 12px; }
.np-head > div:first-child { min-width: 0; }
.np-h1 { font-family: var(--font-display); font-size: 24px; font-weight: 700; margin: 0; color: var(--text-primary); line-height: 1.35; text-wrap: balance; }
.np-sub { margin: 2px 0 0; color: var(--text-secondary); font-size: 14px; }
.np-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.np-h3 { margin: 0 0 14px; font-family: var(--font-body); font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; color: var(--text-primary); }
.np-aside { margin-inline-start: auto; color: var(--text-tertiary); font-weight: 500; font-size: 12px; }
.np-num { font-variant-numeric: tabular-nums; }

.np-seg { display: inline-flex; background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 4px; gap: 2px; flex-wrap: wrap; }
.np-seg button { border: 0; background: none; padding: 6px 13px; border-radius: 9px; color: var(--muted); font-weight: 600; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
.np-seg button:hover { color: var(--ink); }
.np-seg button[aria-pressed="true"] { background: var(--raise); color: var(--ink); box-shadow: inset 0 0 0 1px var(--line-2); }

.np-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.np-kpis.c3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.np-kpi { background: var(--panel); border: 1px solid var(--line); border-radius: 16px; padding: 14px 16px; min-width: 0; }
.np-kpi > span { color: var(--muted); font-size: 12.5px; display: block; }
.np-kpi > b { display: block; font-family: var(--font-display); font-size: 24px; line-height: 1.35; font-weight: 700; color: var(--text-primary); font-variant-numeric: tabular-nums; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.np-kpi > i { font-style: normal; font-size: 11.5px; color: var(--dim); display: block; }
.np-kpi > i.up { color: var(--ok); } .np-kpi > i.down { color: var(--bad); }

.np-grid-2 { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 18px; align-items: start; }
.np-grid-2.even { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.np-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
.np-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.np-filters { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }

.np-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--line); min-width: 0; }
.np-row:last-child { border-bottom: 0; }
.np-row-main { flex: 1; min-width: 0; }
.np-row-main b { display: block; font-weight: 600; color: var(--text-primary); }
.np-row-main small { display: block; color: var(--muted); font-size: 12.5px; }

.np-meter { height: 6px; background: var(--raise); border-radius: 99px; overflow: hidden; margin-top: 6px; }
.np-meter > i { display: block; height: 100%; background: var(--grad); border-radius: 99px; }
.np-usage-row { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; }
.np-usage-row > span { color: var(--muted); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.np-usage-row > b { color: var(--text-primary); font-variant-numeric: tabular-nums; white-space: nowrap; }

.np-empty { color: var(--dim); text-align: center; padding: 18px 0; font-size: 13px; }
.np-link { background: none; border: 0; color: var(--sky); font-weight: 600; padding: 0; cursor: pointer; font-size: 12.5px; display: inline-flex; align-items: center; gap: 4px; }
.np-link.danger { color: var(--bad); }
.np-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 700; padding: 3px 9px; border-radius: 999px; white-space: nowrap; line-height: 1.4; }

.np-toggle { position: relative; width: 42px; height: 24px; border-radius: 99px; background: var(--line-2); border: 0; flex: none; padding: 0; cursor: pointer; }
.np-toggle::before { content: ""; position: absolute; inset: -8px -4px; }
.np-toggle::after { content: ""; position: absolute; top: 3px; inset-inline-start: 3px; width: 18px; height: 18px; border-radius: 50%; background: #FFFFFF; box-shadow: 0 1px 2px rgba(0,0,0,.25); transition: inset-inline-start .2s; }
.np-toggle[aria-checked="true"] { background: var(--royal-2); }
.np-toggle[aria-checked="true"]::after { inset-inline-start: 21px; }
.np-toggle:disabled { opacity: .5; cursor: not-allowed; }

.np-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; max-width: 100%; }
.np-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 620px; }
.np-table th { text-align: start; color: var(--dim); font-weight: 600; font-size: 12px; padding: 10px 12px; border-bottom: 1px solid var(--line); white-space: nowrap; }
.np-table td { padding: 12px; border-bottom: 1px solid var(--line); color: var(--text-secondary); vertical-align: middle; }
.np-table td.strong { color: var(--text-primary); font-weight: 600; }
.np-table tbody tr:last-child td { border-bottom: 0; }
.np-table tbody tr.clickable { cursor: pointer; }
.np-table tbody tr:hover td { background: var(--hover-bg); }
.np-table tbody tr.is-selected td { background: var(--info-bg); }
.np-check { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; cursor: pointer; margin: -4px; }
.np-check input { width: 16px; height: 16px; cursor: pointer; margin: 0; }

.np-bulk { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 10px 16px; background: var(--info-bg);
  border: 1px solid var(--card-border-emphasis); border-radius: var(--radius-md); }
.np-bulk > b { font-size: 13px; color: var(--info); }

.np-icon-tile { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; flex: none; }

@media (max-width: 1150px) {
  .np-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .np-grid-3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 900px) {
  .np-grid-2, .np-grid-2.even, .np-grid-3, .np-form-grid { grid-template-columns: minmax(0, 1fr); }
  .np-kpis.c3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  /* comfortable tap targets on touch screens */
  .np-page :where(button, select, a.np-tap) { min-height: 40px; }
  .np-page .np-seg button { min-height: 40px; padding-inline: 14px; }
  .np-page .np-toggle { min-height: 0; }
  .np-page .np-link { min-height: 40px; }
  .np-check { width: 40px; height: 40px; margin: -10px; }
}
@media (max-width: 520px) {
  .np-h1 { font-size: 20px; }
  .np-kpi > b { font-size: 21px; }
  .np-actions { width: 100%; }
  .np-seg { max-width: 100%; }
}
`

/** Shared page CSS. Render once per page (duplicates are harmless). */
export function NightStyles() {
  return <style>{NIGHT_PAGE_CSS}</style>
}

export function NightPage({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="np-page" style={style}>
      <NightStyles />
      {children}
    </div>
  )
}

export function PageHead({ title, sub, actions, icon }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="np-head">
      <div>
        <h1 className="np-h1" style={icon ? { display: 'flex', alignItems: 'center', gap: 8 } : undefined}>{icon}{title}</h1>
        {sub != null && sub !== '' && <p className="np-sub">{sub}</p>}
      </div>
      {actions && <div className="np-actions">{actions}</div>}
    </div>
  )
}

export function CardTitle({ children, aside, style }: { children: ReactNode; aside?: ReactNode; style?: CSSProperties }) {
  return (
    <h3 className="np-h3" style={style}>
      {children}
      {aside != null && <span className="np-aside">{aside}</span>}
    </h3>
  )
}

export function Seg<T extends string | number>({ options, value, onChange, label }: {
  options: readonly (readonly [T, ReactNode])[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="np-seg" role="group" aria-label={label}>
      {options.map(([k, l]) => (
        <button key={String(k)} type="button" aria-pressed={value === k} onClick={() => onChange(k)}>{l}</button>
      ))}
    </div>
  )
}

export function Kpi({ label, value, hint, trend, valueStyle }: {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  trend?: 'up' | 'down' | 'flat'
  valueStyle?: CSSProperties
}) {
  return (
    <div className="np-kpi">
      <span>{label}</span>
      <b style={valueStyle}>{value}</b>
      {hint != null && <i className={trend && trend !== 'flat' ? trend : undefined}>{hint}</i>}
    </div>
  )
}

export function Meter({ label, value, display, max = 100, color }: {
  label: ReactNode
  value: number
  display?: ReactNode
  max?: number
  color?: string
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="np-usage-row"><span>{label}</span><b>{display ?? value}</b></div>
      <div className="np-meter" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
        <i style={{ width: `${pct}%`, ...(color ? { background: color } : {}) }} />
      </div>
    </div>
  )
}

export function Toggle({ checked, onChange, label, disabled }: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button" className="np-toggle" role="switch" aria-checked={checked} aria-label={label}
      disabled={disabled} onClick={() => onChange(!checked)}
    />
  )
}

export type ChipTone = 'ok' | 'warn' | 'bad' | 'info' | 'ai' | 'muted'
const CHIP: Record<ChipTone, [string, string]> = {
  ok: ['var(--ok)', 'var(--ok-bg)'],
  warn: ['var(--warn)', 'var(--warn-bg)'],
  bad: ['var(--bad)', 'var(--bad-bg)'],
  info: ['var(--info)', 'var(--info-bg)'],
  ai: ['var(--ai)', 'var(--ai-bg)'],
  muted: ['var(--text-tertiary)', 'var(--hover-bg)'],
}
export function Chip({ tone = 'info', children }: { tone?: ChipTone; children: ReactNode }) {
  const [fg, bg] = CHIP[tone]
  return <span className="np-chip" style={{ color: fg, background: bg }}>{children}</span>
}

export function EmptyLine({ children }: { children: ReactNode }) {
  return <div className="np-empty">{children}</div>
}

/** Arabic-friendly number with Latin digits, matching the prototype's toLocaleString('en'). */
export function fmtNum(n: number) {
  return n.toLocaleString('en-US')
}
