import { useEffect, useRef, type ReactNode } from 'react'
import { Toggle } from '../shared/night'

// Small controls and the shared styles of the two widget builders (web call, chat).

export const WG_CSS = `
.wg-page { display: flex; flex-direction: column; gap: 16px; max-width: 1240px; }
.wg-crumb { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); font-size: 13px; text-decoration: none; background: none; border: 0; font-family: inherit; cursor: pointer; padding: 0; }
.wg-crumb:hover { color: var(--ink); }
.wg-title { margin: 4px 0 0; font-size: 26px; font-weight: 700; color: var(--ink); }
.wg-steps { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--muted); margin-top: 6px; }
.wg-steps i { width: 30px; height: 4px; border-radius: 3px; background: var(--line); }
.wg-steps i.on { background: var(--ink); }
.wg-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, 420px); gap: 20px; align-items: start; }
.wg-grid.chat { grid-template-columns: 190px minmax(0, 1fr) minmax(300px, 400px); }
@media (max-width: 1000px) { .wg-grid, .wg-grid.chat { grid-template-columns: 1fr; } }
.wg-card { background: var(--panel); border: 1px solid var(--line); border-radius: 22px; padding: 20px; display: grid; gap: 14px; }
.wg-card h2 { margin: 0; font-size: 15.5px; font-weight: 700; color: var(--ink); }
.wg-card p.sub { margin: -8px 0 0; font-size: 12.5px; color: var(--muted); line-height: 1.7; }
.wg-f { display: grid; gap: 6px; }
.wg-f > span { font-size: 12.5px; color: var(--text-secondary, var(--muted)); font-weight: 600; }
.wg-f > small, .wg-hint { font-size: 12px; color: var(--muted); line-height: 1.7; }
.wg-in { height: 42px; border-radius: 12px; border: 1px solid var(--line-2, var(--line)); background: var(--panel-2, var(--panel)); color: var(--ink); font: inherit; font-size: 14px; padding: 0 12px; width: 100%; }
textarea.wg-in { height: auto; padding: 10px 12px; line-height: 1.7; resize: vertical; }
.wg-in:focus-visible, .wg-sel:focus-visible { outline: 3px solid var(--accent, #6c4cf1); outline-offset: 1px; }
.wg-sel { height: 42px; border-radius: 12px; border: 1px solid var(--line-2, var(--line)); background: var(--panel-2, var(--panel)); color: var(--ink); font: inherit; font-size: 14px; padding: 0 10px; width: 100%; }
.wg-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.wg-row b { font-size: 14px; font-weight: 600; color: var(--ink); display: block; }
.wg-row small { color: var(--muted); font-size: 12.5px; line-height: 1.6; }
.wg-two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 600px) { .wg-two { grid-template-columns: 1fr; } }
.wg-colors { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.wg-color { width: 30px; height: 30px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; padding: 0; position: relative; }
.wg-color[aria-pressed="true"] { border-color: var(--ink); box-shadow: inset 0 0 0 2px var(--panel); }
.wg-color:focus-visible { outline: 3px solid var(--accent, #6c4cf1); outline-offset: 2px; }
.wg-hex { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; color: var(--muted); direction: ltr; }
.wg-tiles { display: flex; gap: 8px; flex-wrap: wrap; }
.wg-tile { min-width: 46px; height: 46px; border-radius: 14px; border: 1px solid var(--line); background: var(--panel-2, var(--panel)); color: var(--ink); display: inline-flex; align-items: center; justify-content: center; gap: 6px; font: inherit; font-size: 13px; padding: 0 12px; cursor: pointer; }
.wg-tile[aria-pressed="true"] { border: 2px solid var(--ink); }
.wg-tile:focus-visible { outline: 3px solid var(--accent, #6c4cf1); outline-offset: 2px; }
.wg-corners { width: 92px; height: 78px; border-radius: 12px; border: 1px solid var(--line); background: var(--panel-2, var(--panel)); position: relative; }
.wg-corner { position: absolute; width: 24px; height: 24px; border-radius: 50%; border: 1px solid var(--line-2, var(--line)); background: var(--panel); cursor: pointer; padding: 0; display: grid; place-items: center; color: #fff; }
.wg-corner[aria-pressed="true"] { background: var(--ink); border-color: var(--ink); }
.wg-corner.tl { top: 6px; left: 6px; } .wg-corner.tr { top: 6px; right: 6px; } .wg-corner.bl { bottom: 6px; left: 6px; } .wg-corner.br { bottom: 6px; right: 6px; }
.wg-range { display: grid; gap: 6px; }
.wg-range > div { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--text-secondary, var(--muted)); font-weight: 600; }
.wg-range input { width: 100%; accent-color: var(--ink); }
.wg-bar { position: sticky; bottom: 12px; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 10px; background: var(--panel); border: 1px solid var(--line); border-radius: 18px; padding: 10px 14px; box-shadow: 0 8px 28px rgba(0,0,0,.12); flex-wrap: wrap; }
.wg-bar .acts { display: flex; gap: 8px; }
.wg-stage { position: sticky; top: 76px; display: grid; gap: 10px; }
.wg-stage h3 { margin: 0; font-size: 13px; color: var(--muted); font-weight: 600; }
.wg-cap { text-align: center; font-size: 12px; color: var(--muted); }
.wg-win { border: 1px solid var(--line); border-radius: 18px; overflow: hidden; background: #fff; box-shadow: 0 8px 30px rgba(0,0,0,.08); position: relative; height: 330px; }
.wg-win .bar { height: 34px; background: #f1f2f5; border-bottom: 1px solid #e6e8ee; display: flex; align-items: center; gap: 6px; padding: 0 12px; }
.wg-win .bar i { width: 9px; height: 9px; border-radius: 50%; }
.wg-win .bar span { margin-inline-start: auto; font-size: 11px; color: #8a8f9c; direction: ltr; }
.wg-win .site { padding: 18px; display: grid; gap: 10px; }
.wg-win .site i { display: block; height: 11px; border-radius: 6px; background: #eceef3; }
.wg-win .site .b { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.wg-win .site .b i { height: 64px; border-radius: 12px; }
.wg-fab { position: absolute; border: 0; border-radius: 50%; color: #fff; display: grid; place-items: center; box-shadow: 0 10px 26px rgba(0,0,0,.28); overflow: hidden; padding: 0; }
.wg-fab img { width: 100%; height: 100%; object-fit: cover; }
.wg-dark { background: #14151b; }
.wg-frame { border: 1px solid var(--line); border-radius: 22px; overflow: hidden; background: #eef0f4; position: relative; }
.wg-frame iframe { width: 100%; border: 0; display: block; background: transparent; }
.wg-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--line); }
.wg-tabs button { border: 0; background: none; font: inherit; font-size: 13.5px; font-weight: 600; color: var(--muted); padding: 8px 14px; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; }
.wg-tabs button[aria-pressed="true"] { color: var(--ink); border-bottom-color: var(--ink); }
.wg-tpl { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; }
.wg-tp { border: 1px solid var(--line); background: var(--panel-2, var(--panel)); border-radius: 14px; padding: 8px; font: inherit; font-size: 12.5px; color: var(--ink); cursor: pointer; display: grid; gap: 6px; text-align: center; }
.wg-tp[aria-pressed="true"] { border: 2px solid var(--ink); padding: 7px; }
.wg-tp:focus-visible { outline: 3px solid var(--accent, #6c4cf1); outline-offset: 2px; }
.wg-tp .th { height: 70px; border-radius: 9px; overflow: hidden; display: grid; align-content: start; justify-items: center; gap: 4px; padding: 8px; }
.wg-tp .th i { display: block; border-radius: 4px; background: rgba(255,255,255,.7); height: 5px; width: 70%; }
.wg-nav { display: grid; gap: 4px; align-content: start; position: sticky; top: 76px; }
.wg-nav button { display: flex; align-items: center; gap: 10px; border: 0; background: none; font: inherit; font-size: 14px; color: var(--ink); padding: 10px 12px; border-radius: 12px; cursor: pointer; text-align: start; }
.wg-nav button[aria-current="step"] { background: var(--ink); color: var(--panel); }
.wg-nav button:focus-visible { outline: 3px solid var(--accent, #6c4cf1); outline-offset: 2px; }
.wg-nav em { font-style: normal; font-size: 11px; opacity: .7; margin-inline-start: auto; }
.wg-st { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.wg-st button, .wg-dv button { border: 1px solid var(--line); background: var(--panel); color: var(--muted); border-radius: 999px; padding: 4px 11px; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
.wg-st button[aria-pressed="true"], .wg-dv button[aria-pressed="true"] { background: var(--ink); color: var(--panel); border-color: var(--ink); }
.wg-code { direction: ltr; text-align: left; background: var(--panel-2, var(--panel)); border: 1px solid var(--line); border-radius: 10px; padding: 12px; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; line-height: 1.7; white-space: pre-wrap; word-break: break-all; color: var(--ink); }
.wg-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
.wg-item { background: var(--panel); border: 1px solid var(--line); border-radius: 20px; padding: 16px; display: grid; gap: 12px; position: relative; }
.wg-item h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--ink); }
.wg-item .meta { font-size: 12.5px; color: var(--muted); line-height: 1.8; }
.wg-item .top { display: flex; align-items: center; gap: 12px; }
.wg-item .ic { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; color: #fff; flex: none; overflow: hidden; }
.wg-item .ic img { width: 100%; height: 100%; object-fit: cover; }
.wg-item .acts { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.wg-menu { position: absolute; inset-inline-end: 12px; top: 46px; z-index: 6; background: var(--panel); border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 12px 34px rgba(0,0,0,.18); padding: 6px; display: grid; min-width: 150px; }
.wg-menu button { border: 0; background: none; font: inherit; font-size: 13.5px; color: var(--ink); padding: 9px 12px; border-radius: 9px; cursor: pointer; text-align: start; display: flex; gap: 8px; align-items: center; }
.wg-menu button:hover { background: var(--hover-bg); }
.wg-menu button.del { color: var(--bad, #dc2626); }
.wg-ic { border: 1px solid var(--line); background: none; color: var(--muted); width: 32px; height: 32px; border-radius: 9px; cursor: pointer; display: grid; place-items: center; margin-inline-start: auto; }
.wg-ic:hover { background: var(--hover-bg); color: var(--ink); }
.wg-ic:focus-visible { outline: 3px solid var(--accent, #6c4cf1); outline-offset: 2px; }
`

export function Field({ label, hint, children, group }: { label: string; hint?: ReactNode; children: ReactNode; group?: boolean }) {
  const inner = <><span>{label}</span>{children}{hint && <small>{hint}</small>}</>
  return group ? <div className="wg-f">{inner}</div> : <label className="wg-f">{inner}</label>
}

export function Row({ title, sub, checked, onChange, disabled }: { title: string; sub?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="wg-row">
      <div><b>{title}</b>{sub && <small>{sub}</small>}</div>
      <Toggle checked={checked} onChange={onChange} label={title} disabled={disabled} />
    </div>
  )
}

export const PALETTE = ['#4f46e5', '#2563eb', '#0ea5e9', '#16a34a', '#f59e0b', '#ef4444', '#a855f7', '#111827']

export function ColorField({ label, value, onChange, allowEmpty, emptyLabel }: { label: string; value: string; onChange: (v: string) => void; allowEmpty?: boolean; emptyLabel?: string }) {
  const valid = /^#[0-9a-fA-F]{6}$/.test(value)
  return (
    <div className="wg-f">
      <span>{label}</span>
      <div className="wg-colors" role="group" aria-label={label}>
        {allowEmpty && <button type="button" className="wg-tile" style={{ height: 30, minWidth: 0, borderRadius: 999, padding: '0 10px', fontSize: 12 }} aria-pressed={!value} onClick={() => onChange('')}>{emptyLabel || 'افتراضي'}</button>}
        {PALETTE.map((c) => <button key={c} type="button" className="wg-color" style={{ background: c }} aria-label={c} aria-pressed={value.toLowerCase() === c} onClick={() => onChange(c)} />)}
        <input type="color" aria-label={`${label} مخصص`} value={valid ? value : '#4f46e5'} onChange={(e) => onChange(e.target.value)} style={{ width: 34, height: 30, border: 0, background: 'none', padding: 0, cursor: 'pointer' }} />
        {valid && <span className="wg-hex">{value}</span>}
      </div>
    </div>
  )
}

export function Tiles<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: readonly (readonly [T, ReactNode])[] }) {
  return (
    <div className="wg-f">
      <span>{label}</span>
      <div className="wg-tiles" role="group" aria-label={label}>
        {options.map(([k, node]) => <button key={k} type="button" className="wg-tile" aria-pressed={value === k} onClick={() => onChange(k)}>{node}</button>)}
      </div>
    </div>
  )
}

export function Corners({ value, onChange, label }: { value: string; onChange: (v: 'tl' | 'tr' | 'bl' | 'br') => void; label: string }) {
  return (
    <div className="wg-f">
      <span>{label}</span>
      <div className="wg-corners" role="group" aria-label={label}>
        {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
          <button key={c} type="button" className={`wg-corner ${c}`} aria-pressed={value === c} aria-label={{ tl: 'أعلى اليسار', tr: 'أعلى اليمين', bl: 'أسفل اليسار', br: 'أسفل اليمين' }[c]} onClick={() => onChange(c)}>{value === c ? '✓' : ''}</button>
        ))}
      </div>
    </div>
  )
}

export function Range({ label, value, min, max, onChange, unit }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <div className="wg-range">
      <div><span>{label}</span><span dir="ltr">{value}{unit}</span></div>
      <input type="range" min={min} max={max} value={value} aria-label={label} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  )
}

/** An iframe of one of the public widget pages; the settings are sent to it as they change. */
export function PreviewFrame({ src, readyType, message, height, minWidth }: { src: string; readyType: string; message: unknown; height: number; minWidth?: number }) {
  const ref = useRef<HTMLIFrameElement>(null)
  const last = useRef(message)
  last.current = message
  const post = () => ref.current?.contentWindow?.postMessage(last.current, '*')
  useEffect(post, [message]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const on = (e: MessageEvent) => { if (e.source === ref.current?.contentWindow && e.data?.type === readyType) post() }
    window.addEventListener('message', on)
    return () => window.removeEventListener('message', on)
  }, [readyType]) // eslint-disable-line react-hooks/exhaustive-deps
  return <iframe ref={ref} title="معاينة حية" src={src} onLoad={post} style={{ height, minWidth }} />
}
