import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject, type KeyboardEvent as ReactKeyboardEvent, type AnimationEvent } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, ChevronLeft } from 'lucide-react'

/*
 * The top bar's popover menus (account menu, "الدليل").
 *
 * Motion: `enter 0.15s ease` = fade from 0 and scale from .95 to 1, transform origin at
 * the anchor's corner; closing plays `exit` (the reverse) and the panel unmounts on
 * animationend. Plain CSS keyframes keyed on data-state, so the animation runs on the
 * compositor and never flashes when the main thread is busy. Submenus use the same
 * animation and open to the side; when neither side has room (phones) they expand in
 * place with a height 0 ↔ auto slide instead.
 *
 * Panels are portalled into the dashboard scope with fixed positioning, so they are never
 * clipped by the bar and their backdrop blur sees the page behind.
 *
 * Keyboard: ↑/↓ (and Home/End) move between items, ← opens a submenu (the "forward" key
 * in RTL), → or Esc closes it, Esc closes the menu and returns focus to the trigger.
 */

export type MenuEntry =
  | { kind: 'item'; id: string; label: string; icon?: ReactNode; onSelect: () => void; danger?: boolean; trailing?: ReactNode }
  | { kind: 'radio'; id: string; label: string; icon?: ReactNode; checked: boolean; onSelect: () => void }
  | { kind: 'sub'; id: string; label: string; icon?: ReactNode; items: MenuEntry[]; trailing?: ReactNode }
  | { kind: 'sep'; id: string }
  | { kind: 'node'; id: string; node: ReactNode }

const SUB_W = 220

export const SHELL_MENU_CSS = `
  .dv2-scope { --sm-ring: rgba(0,0,0,.06); --hover-bg-strong: rgba(0,0,0,.05); }
  .dv2-scope:not([data-theme="light"]) { --sm-ring: rgba(255,255,255,.09); --hover-bg-strong: rgba(255,255,255,.07); }
  @keyframes sm-enter { from { opacity: 0; transform: scale(.95); } to { opacity: 1; transform: scale(1); } }
  @keyframes sm-exit { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(.95); } }
  .sm-anim[data-state="open"] { animation: sm-enter .15s ease both; }
  .sm-anim[data-state="closed"] { animation: sm-exit .15s ease both; pointer-events: none; }
  .sm-panel { position: fixed; z-index: 1350; box-sizing: border-box; border-radius: 10px; padding: 4px; overflow-y: auto; overscroll-behavior: contain;
    background: color-mix(in srgb, var(--panel) 90%, transparent); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
    box-shadow: 0 0 0 1px var(--sm-ring), 0 1px 2px 0 rgba(0,0,0,.06), 0 8px 24px -8px rgba(0,0,0,.14);
    color: var(--ink); font-family: var(--font-body); outline: none; scrollbar-width: thin; scrollbar-color: var(--line-2) transparent; }
  /* dark: 95% so bright page elements don't ghost through the 4px blur */
  .dv2-scope:not([data-theme="light"]) .sm-panel { background: color-mix(in srgb, var(--panel) 95%, transparent); box-shadow: 0 0 0 1px var(--sm-ring), 0 1px 2px 0 rgba(0,0,0,.4), 0 12px 32px -8px rgba(0,0,0,.6); }
  .sm-item { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 36px; padding: 0 10px; border: 0; border-radius: 6px;
    background: transparent; color: var(--ink); font: inherit; font-size: 14px; font-weight: 400; text-align: start; cursor: pointer; box-sizing: border-box;
    transition: background-color 150ms cubic-bezier(.4,0,.2,1), color 150ms cubic-bezier(.4,0,.2,1) !important; }
  .sm-item > svg { width: 16px; height: 16px; color: var(--muted); flex: none; }
  .sm-item .sm-label { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .sm-item .sm-trail { margin-inline-start: auto; display: inline-flex; align-items: center; gap: 6px; color: var(--dim); font-size: 12px; }
  .sm-item .sm-trail svg { width: 15px; height: 15px; color: var(--dim); transition: transform 150ms cubic-bezier(.4,0,.2,1) !important; }
  .sm-item:hover, .sm-item:focus-visible, .sm-item[data-open="true"] { background: var(--hover-bg-strong); outline: none; }
  .sm-item.is-danger, .sm-item.is-danger > svg { color: var(--bad); }
  .sm-item .sm-check { width: 16px; height: 16px; color: var(--ink); }
  .sm-sep { height: 1px; background: var(--line); margin: 4px -4px; }
  .sm-inline { overflow: hidden; }
  .sm-inline-inner { padding-inline-start: 14px; padding-block: 2px; }
  @media (max-width: 640px) { .sm-item { min-height: 40px; } }
  @media (prefers-reduced-motion: reduce) { .sm-anim[data-state] { animation-duration: 1ms; } }
`

/**
 * Keeps an element mounted through its exit animation. Render while `mounted`, put
 * `state` on data-state and `onAnimationEnd` on the element.
 */
export function usePresence(open: boolean) {
  const [mounted, setMounted] = useState(open)
  useEffect(() => { if (open) setMounted(true) }, [open])
  // Fallback in case animationend never arrives (element hidden, animations disabled).
  useEffect(() => {
    if (open || !mounted) return
    const t = window.setTimeout(() => setMounted(false), 260)
    return () => window.clearTimeout(t)
  }, [open, mounted])
  const onAnimationEnd = useCallback((e: AnimationEvent) => {
    // only the exit keyframes end the presence (a late "enter" end must not unmount it)
    if (!open && e.target === e.currentTarget && e.animationName.endsWith('-exit')) setMounted(false)
  }, [open])
  return { mounted: open || mounted, state: open ? 'open' : 'closed', onAnimationEnd } as const
}

function useScopeRoot() {
  const [root, setRoot] = useState<HTMLElement | null>(null)
  useLayoutEffect(() => { setRoot(document.querySelector<HTMLElement>('.dv2-app') || document.body) }, [])
  return root
}

function focusables(panel: HTMLElement | null) {
  if (!panel) return []
  return Array.from(panel.querySelectorAll<HTMLElement>('[data-mi]')).filter((el) => !(el as HTMLButtonElement).disabled)
}

function moveFocus(panel: HTMLElement | null, dir: 1 | -1 | 'first' | 'last') {
  const list = focusables(panel)
  if (!list.length) return
  const idx = list.indexOf(document.activeElement as HTMLElement)
  let next: number
  if (dir === 'first') next = 0
  else if (dir === 'last') next = list.length - 1
  else next = idx < 0 ? (dir === 1 ? 0 : list.length - 1) : (idx + dir + list.length) % list.length
  list[next].focus()
}

interface Pos { top: number; left: number; origin: string; maxHeight: number }

/** Places a panel of `width` under the anchor, its inline-end (left, in RTL) edge on the anchor's. */
function placeUnder(anchor: HTMLElement, width: number): Pos {
  const r = anchor.getBoundingClientRect()
  const vw = window.innerWidth
  const rtl = getComputedStyle(anchor).direction === 'rtl'
  let left = rtl ? r.left : r.right - width
  left = Math.max(8, Math.min(left, vw - width - 8))
  const top = r.bottom + 8
  const originX = rtl ? (Math.abs(left - r.left) < 2 ? 'left' : 'right') : 'right'
  return { top, left, origin: `top ${originX}`, maxHeight: Math.max(160, window.innerHeight - top - 12) }
}

function SubFlyout({ open, entry, rowRef, panelRef, onClose, closeAll, root, focusFirst }: {
  open: boolean
  entry: Extract<MenuEntry, { kind: 'sub' }>
  rowRef: () => HTMLElement | null
  panelRef: RefObject<HTMLDivElement | null>
  onClose: (focusRow: boolean) => void
  closeAll: (returnFocus: boolean) => void
  root: HTMLElement
  focusFirst: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { mounted, state, onAnimationEnd } = usePresence(open)
  const [pos, setPos] = useState<{ top: number; left: number; origin: string } | null>(null)

  useLayoutEffect(() => {
    if (!open) return
    const row = rowRef()
    const panel = panelRef.current
    if (!row || !panel) return
    const p = panel.getBoundingClientRect()
    const rr = row.getBoundingClientRect()
    // RTL: forward is to the left; flip to the right when the left has no room.
    const openLeft = p.left - SUB_W - 4 >= 8
    const left = openLeft ? p.left - SUB_W - 4 : Math.min(p.right + 4, window.innerWidth - SUB_W - 8)
    const top = Math.max(8, Math.min(rr.top - 4, window.innerHeight - 200))
    setPos({ top, left, origin: `top ${openLeft ? 'right' : 'left'}` })
  }, [open, rowRef, panelRef])

  // Keyboard-opened: focus the first row; hover-opened: leave focus where it is.
  useEffect(() => {
    if (!open || !focusFirst) return
    const id = requestAnimationFrame(() => moveFocus(ref.current, 'first'))
    return () => cancelAnimationFrame(id)
  }, [open, focusFirst])

  function onKey(e: ReactKeyboardEvent) {
    const stop = () => { e.preventDefault(); e.stopPropagation() }
    if (e.key === 'ArrowDown') { stop(); moveFocus(ref.current, 1) }
    else if (e.key === 'ArrowUp') { stop(); moveFocus(ref.current, -1) }
    else if (e.key === 'Home') { stop(); moveFocus(ref.current, 'first') }
    else if (e.key === 'End') { stop(); moveFocus(ref.current, 'last') }
    else if (e.key === 'ArrowRight' || e.key === 'Escape') { stop(); onClose(true) }
    else if (e.key === 'Tab') closeAll(false)
  }

  if (!mounted || !pos) return null
  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={entry.label}
      tabIndex={-1}
      className="sm-panel sm-anim"
      data-state={state}
      data-sm-sub={entry.id}
      onAnimationEnd={onAnimationEnd}
      onKeyDown={onKey}
      style={{ top: pos.top, left: pos.left, width: SUB_W, transformOrigin: pos.origin, maxHeight: window.innerHeight - pos.top - 12 }}
      dir="rtl"
    >
      <Entries items={entry.items} closeAll={closeAll} />
    </div>,
    root,
  )
}

/** Rows of a menu. Submenus render as flyouts (desktop) or inline (no room on either side). */
function Entries({ items, closeAll, root, reduced, panelRef, active = true }: {
  items: MenuEntry[]
  /** False while the parent panel plays its exit: open flyouts exit with it. */
  active?: boolean
  closeAll: (returnFocus: boolean) => void
  root?: HTMLElement | null
  reduced?: boolean
  panelRef?: RefObject<HTMLDivElement | null>
}) {
  const [openSub, setOpenSub] = useState<string | null>(null)
  const [inline, setInline] = useState(false)
  const [viaKey, setViaKey] = useState(false)
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const inlineRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const hoverTimer = useRef<number | undefined>(undefined)

  const canFly = () => {
    const p = panelRef?.current?.getBoundingClientRect()
    if (!p || !root) return false
    return p.left - SUB_W - 4 >= 8 || p.right + 4 + SUB_W <= window.innerWidth - 8
  }
  const open = (id: string, key = false) => {
    const fly = canFly()
    setInline(!fly); setViaKey(key); setOpenSub(id)
    if (key && !fly) requestAnimationFrame(() => requestAnimationFrame(() => moveFocus(inlineRefs.current[id], 'first')))
  }
  const close = useCallback((focusRow: boolean) => {
    setOpenSub((id) => {
      if (focusRow && id) requestAnimationFrame(() => rowRefs.current[id]?.focus({ preventScroll: true }))
      return null
    })
  }, [])
  useEffect(() => () => window.clearTimeout(hoverTimer.current), [])
  const hoverClose = () => {
    if (!root) return
    window.clearTimeout(hoverTimer.current)
    hoverTimer.current = window.setTimeout(() => setOpenSub((id) => (inline ? id : null)), 120)
  }

  return (
    <>
      {items.map((it) => {
        if (it.kind === 'sep') return <div key={it.id} className="sm-sep" role="separator" />
        if (it.kind === 'node') return <div key={it.id}>{it.node}</div>
        if (it.kind === 'radio') {
          return (
            <button key={it.id} type="button" role="menuitemradio" aria-checked={it.checked} data-mi className="sm-item" onClick={it.onSelect}>
              {it.icon}<span className="sm-label">{it.label}</span>
              <span className="sm-trail">{it.checked && <Check className="sm-check" />}</span>
            </button>
          )
        }
        if (it.kind === 'item') {
          return (
            <button key={it.id} type="button" role="menuitem" data-mi className={`sm-item${it.danger ? ' is-danger' : ''}`}
              onClick={() => { closeAll(false); it.onSelect() }}
              onPointerEnter={hoverClose}
            >
              {it.icon}<span className="sm-label">{it.label}</span>
              {it.trailing && <span className="sm-trail">{it.trailing}</span>}
            </button>
          )
        }
        const isOpen = openSub === it.id
        return (
          <div key={it.id}>
            <button
              ref={(el) => { rowRefs.current[it.id] = el }}
              type="button" role="menuitem" aria-haspopup="menu" aria-expanded={isOpen} data-open={isOpen} data-mi className="sm-item"
              // a click opens (a hover may already have); only an inline submenu toggles closed
              onClick={(e) => (isOpen && inline ? close(false) : open(it.id, e.detail === 0))}
              onPointerEnter={(e) => {
                if (e.pointerType !== 'mouse' || !root) return
                window.clearTimeout(hoverTimer.current)
                hoverTimer.current = window.setTimeout(() => { if (canFly()) { setInline(false); setViaKey(false); setOpenSub(it.id) } }, 80)
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); open(it.id, true) }
                else if (e.key === 'ArrowRight' && isOpen) { e.preventDefault(); e.stopPropagation(); close(true) }
              }}
            >
              {it.icon}<span className="sm-label">{it.label}</span>
              <span className="sm-trail">{it.trailing}<ChevronLeft style={{ transform: isOpen && inline ? 'rotate(-90deg)' : undefined }} /></span>
            </button>
            {/* inline (phones): collapsible slide down / up */}
            <AnimatePresence initial={false}>
              {isOpen && inline && (
                <motion.div
                  ref={(el: HTMLDivElement | null) => { inlineRefs.current[it.id] = el }}
                  className="sm-inline" role="menu" aria-label={it.label}
                  initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                  transition={{ duration: reduced ? 0 : 0.2, ease: [0.4, 0, 0.2, 1] }}
                  onKeyDown={(e) => { if (e.key === 'ArrowRight' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true) } }}
                >
                  <div className="sm-inline-inner"><Entries items={it.items} closeAll={closeAll} /></div>
                </motion.div>
              )}
            </AnimatePresence>
            {root && panelRef && (
              <SubFlyout
                open={isOpen && !inline && active}
                entry={it}
                rowRef={() => rowRefs.current[it.id]}
                panelRef={panelRef}
                onClose={close}
                closeAll={closeAll}
                root={root}
                focusFirst={viaKey}
              />
            )}
          </div>
        )
      })}
    </>
  )
}

/**
 * A popover menu anchored to `anchorRef`. Keep it mounted; toggle `open`.
 * `focusFirst` focuses the first item on open (keyboard-opened menus).
 */
export function ShellMenu({ open, anchorRef, onClose, items, label, width = 264, focusFirst }: {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  onClose: (returnFocus: boolean) => void
  items: MenuEntry[]
  label: string
  width?: number
  focusFirst?: boolean
}) {
  const root = useScopeRoot()
  const reduced = !!useReducedMotion()
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<Pos | null>(null)
  const { mounted, state, onAnimationEnd } = usePresence(open)

  const place = useCallback(() => {
    if (anchorRef.current) setPos(placeUnder(anchorRef.current, Math.min(width, window.innerWidth - 16)))
  }, [anchorRef, width])

  useLayoutEffect(() => { if (open) place() }, [open, place])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element
      if (anchorRef.current?.contains(t)) return
      if (t.closest?.('.sm-panel')) return
      onClose(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose(true) } }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', place)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', place)
    }
  }, [open, onClose, anchorRef, place])

  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => {
      if (focusFirst) moveFocus(panelRef.current, 'first')
      else panelRef.current?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(id)
  }, [open, focusFirst])

  function onKey(e: ReactKeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus(panelRef.current, 1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveFocus(panelRef.current, -1) }
    else if (e.key === 'Home') { e.preventDefault(); moveFocus(panelRef.current, 'first') }
    else if (e.key === 'End') { e.preventDefault(); moveFocus(panelRef.current, 'last') }
    else if (e.key === 'Tab') onClose(false)
  }

  if (!root || !mounted || !pos) return null
  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      aria-label={label}
      tabIndex={-1}
      className="sm-panel sm-anim"
      data-state={state}
      onAnimationEnd={onAnimationEnd}
      dir="rtl"
      onKeyDown={onKey}
      style={{ top: pos.top, left: pos.left, width: Math.min(width, window.innerWidth - 16), maxHeight: pos.maxHeight, transformOrigin: pos.origin }}
    >
      <Entries items={items} closeAll={onClose} root={root} reduced={reduced} panelRef={panelRef} active={open} />
    </div>,
    root,
  )
}
