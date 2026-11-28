import type { ReactNode } from 'react'
import { Search } from 'lucide-react'

// Pieces shared by the pages built like the voice platform's: a rounded header card (title, sub line, actions)
// and a search card. Styles are injected once by whichever page renders them first.

export const NB_CSS = `
.nb-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; background: var(--panel); border: 1px solid var(--line); border-radius: 20px; padding: 22px 24px; }
.nb-head h1 { margin: 0; font-size: 26px; font-weight: 700; color: var(--ink); }
.nb-head p { margin: 4px 0 0; font-size: 13.5px; color: var(--muted); max-width: 64ch; }
.nb-acts { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.nb-btn { display: inline-flex; align-items: center; gap: 8px; height: 38px; padding: 0 16px; border-radius: 12px; border: 0; background: var(--ink); color: var(--panel); font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.nb-btn.sec { background: var(--panel); color: var(--ink); border: 1px solid var(--line-2, var(--line)); }
.nb-btn:disabled { opacity: .5; cursor: not-allowed; }
.nb-btn:focus-visible { outline: 3px solid var(--accent, #6c4cf1); outline-offset: 2px; }
.nb-card { background: var(--panel); border: 1px solid var(--line); border-radius: 20px; padding: 14px; }
.nb-filters { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.nb-search { flex: 1; min-width: 220px; display: flex; align-items: center; gap: 10px; border-radius: 12px; padding: 0 12px; height: 42px; border: 1px solid var(--line); color: var(--muted); }
.nb-search input { flex: 1; border: 0; outline: 0; background: transparent; color: var(--ink); font: inherit; font-size: 14px; min-width: 0; }
.nb-select { height: 42px; border-radius: 12px; border: 1px solid var(--line); background: var(--panel); color: var(--ink); font: inherit; font-size: 13.5px; padding: 0 12px; min-width: 130px; }
.nb-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.nb-tab { border: 1px solid var(--line); background: var(--panel); color: var(--muted); border-radius: 999px; padding: 6px 14px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; gap: 6px; align-items: center; }
.nb-tab[aria-pressed="true"] { background: var(--ink); color: var(--panel); border-color: var(--ink); }
`

export function HeadCard({ title, sub, children, icon }: { title: ReactNode; sub?: ReactNode; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="nb-head">
      <div style={icon ? { display: 'flex', gap: 14, alignItems: 'center' } : undefined}>
        {icon}
        <div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
      </div>
      {children && <div className="nb-acts">{children}</div>}
    </div>
  )
}

/** A search card; anything passed as children (selects, buttons) sits beside the box. */
export function SearchCard({ value, onChange, placeholder, icon, children }: { value: string; onChange: (v: string) => void; placeholder: string; icon?: ReactNode; children?: ReactNode }) {
  return (
    <div className="nb-card nb-filters">
      <label className="nb-search">{icon ?? <Search size={16} />}<input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} /></label>
      {children}
    </div>
  )
}
