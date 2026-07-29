import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type CSSProperties, type ReactNode,
} from 'react'
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

// ─── Tooltip ───────────────────────────────────────────────────────────────

export function Tooltip({ label, children, side = 'top' }: {
  label: string
  children: ReactNode
  side?: 'top' | 'bottom'
}) {
  const [show, setShow] = useState(false)
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.span
            role="tooltip"
            initial={{ opacity: 0, y: side === 'top' ? 4 : -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: side === 'top' ? 4 : -4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'absolute', [side === 'top' ? 'bottom' : 'top']: 'calc(100% + 6px)',
              insetInlineStart: '50%', translate: '-50% 0', whiteSpace: 'nowrap',
              background: 'var(--surface-inverse)', color: '#fff', fontSize: 11, fontWeight: 600,
              padding: '5px 9px', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)',
              zIndex: 1400, pointerEvents: 'none', fontFamily: 'var(--font-body)',
            } as CSSProperties}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

// ─── Menu (dropdown/popover) ───────────────────────────────────────────────

export interface MenuItemDef { label: string; icon?: ReactNode; onClick?: () => void; danger?: boolean; disabled?: boolean }

export function Menu({ trigger, items, align = 'end' }: {
  trigger: ReactNode
  items: MenuItemDef[]
  align?: 'start' | 'end'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <span onClick={() => setOpen((v) => !v)} style={{ cursor: 'pointer', display: 'inline-flex' }}>{trigger}</span>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', [align === 'end' ? 'insetInlineEnd' : 'insetInlineStart']: 0,
              minWidth: 180, background: '#fff', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
              border: '1px solid color-mix(in srgb, var(--border-default) 70%, transparent)',
              padding: 6, zIndex: 1300, fontFamily: 'var(--font-body)',
            } as CSSProperties}
          >
            {items.map((it, i) => (
              <div
                key={i}
                onClick={() => { if (it.disabled) return; it.onClick?.(); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                  fontSize: 13, fontWeight: 500, cursor: it.disabled ? 'not-allowed' : 'pointer',
                  opacity: it.disabled ? 0.45 : 1,
                  color: it.danger ? 'var(--danger-500)' : 'var(--text-primary)',
                }}
                onMouseEnter={(e) => { if (!it.disabled) e.currentTarget.style.background = 'var(--surface-sunken)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                {it.icon}
                {it.label}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Tabs ──────────────────────────────────────────────────────────────────

export function Tabs({ tabs, value, onChange }: {
  tabs: { value: string; label: string; icon?: ReactNode }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-default)', position: 'relative' }}>
      {tabs.map((t) => {
        const active = t.value === value
        return (
          <div
            key={t.value}
            onClick={() => onChange(t.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', cursor: 'pointer',
              fontSize: 13.5, fontWeight: 600, color: active ? 'var(--brand-600)' : 'var(--text-secondary)',
              position: 'relative', transition: 'color 150ms ease',
            }}
          >
            {t.icon}{t.label}
            {active && (
              <motion.div
                layoutId="dv2-tabs-underline"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                style={{ position: 'absolute', bottom: -1, insetInlineStart: 0, insetInlineEnd: 0, height: 2, background: 'var(--brand-500)', borderRadius: 2 }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Skeleton ──────────────────────────────────────────────────────────────

export function Skeleton({ width = '100%', height = 14, radius, style }: {
  width?: number | string
  height?: number | string
  radius?: string
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        width, height, borderRadius: radius || 'var(--radius-sm)',
        background: 'linear-gradient(90deg, var(--slate-100) 25%, var(--slate-200) 37%, var(--slate-100) 63%)',
        backgroundSize: '400% 100%',
        animation: 'dv2-shimmer 1.4s ease infinite',
        ...style,
      }}
    />
  )
}

export function SkeletonRows({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: 20, padding: '14px 20px', borderBottom: '1px solid var(--border-default)' }}>
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} width={c === 0 ? '18%' : `${100 / columns}%`} height={13} />
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Top route-progress bar ────────────────────────────────────────────────
// A slim animated bar under the header that plays on every route change —
// purely perceived progress (Vercel/Linear-style), not tied to real network state.

export function TopProgressBar({ triggerKey }: { triggerKey: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 380)
    return () => clearTimeout(t)
  }, [triggerKey])

  return (
    <div style={{ position: 'absolute', top: 0, insetInlineStart: 0, insetInlineEnd: 0, height: 2.5, zIndex: 50, overflow: 'hidden', pointerEvents: 'none' }}>
      <AnimatePresence>
        {visible && (
          <motion.div
            key={triggerKey}
            initial={{ width: '0%', opacity: 1 }}
            animate={{ width: '82%', opacity: 1 }}
            exit={{ width: '100%', opacity: 0, transition: { width: { duration: 0.15 }, opacity: { duration: 0.3, delay: 0.08 } } }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, var(--brand-400), var(--brand-600))',
              boxShadow: '0 0 8px rgba(0,191,255,.65), 0 0 2px rgba(0,191,255,.9)',
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── CountUp ────────────────────────────────────────────────────────────────

export function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const mv = useMotionValue(0)
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString('ar-SA') + suffix)
  const [display, setDisplay] = useState('0' + suffix)

  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.6, ease: [0.16, 1, 0.3, 1] })
    const unsub = rounded.on('change', (v) => setDisplay(v))
    return () => { controls.stop(); unsub() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return <>{display}</>
}

// ─── Empty State ───────────────────────────────────────────────────────────

export function EmptyState({ icon, title, description, action }: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 8, padding: '56px 24px', textAlign: 'center',
      }}
    >
      {icon && (
        <div style={{
          width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: 'var(--brand-50)',
          color: 'var(--brand-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6,
        }}>{icon}</div>
      )}
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
      {description && <div style={{ fontSize: 13, color: 'var(--text-tertiary)', maxWidth: 320 }}>{description}</div>}
      {action && <div style={{ marginTop: 10 }}>{action}</div>}
    </motion.div>
  )
}

// ─── Pagination ────────────────────────────────────────────────────────────

export function Pagination({ page, pageCount, onChange }: {
  page: number
  pageCount: number
  onChange: (page: number) => void
}) {
  if (pageCount <= 1) return null
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '14px 0' }}>
      <PageBtn disabled={page === 1} onClick={() => onChange(page - 1)}>‹</PageBtn>
      {pages.map((p, i) => (
        <span key={p} style={{ display: 'flex', alignItems: 'center' }}>
          {i > 0 && pages[i - 1] !== p - 1 && <span style={{ padding: '0 4px', color: 'var(--text-tertiary)', fontSize: 12 }}>…</span>}
          <PageBtn active={p === page} onClick={() => onChange(p)}>{p}</PageBtn>
        </span>
      ))}
      <PageBtn disabled={page === pageCount} onClick={() => onChange(page + 1)}>›</PageBtn>
    </div>
  )
}

function PageBtn({ active, disabled, onClick, children }: { active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 28, height: 28, borderRadius: 'var(--radius-sm)', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 12.5, fontWeight: 600, background: active ? 'var(--brand-500)' : 'transparent',
        color: active ? '#fff' : disabled ? 'var(--text-tertiary)' : 'var(--text-secondary)',
        opacity: disabled ? 0.4 : 1, transition: 'background 120ms ease',
      }}
    >
      {children}
    </button>
  )
}

// ─── Toast queue (global) ──────────────────────────────────────────────────

export type ToastKind = 'success' | 'danger' | 'info'
interface QueuedToast { id: string; kind: ToastKind; title: string; description?: string }

const ToastCtx = createContext<{ push: (t: Omit<QueuedToast, 'id'>) => void } | null>(null)

const TOAST_ICON: Record<ToastKind, ReactNode> = {
  success: <CheckCircle2 size={17} style={{ color: 'var(--success-500)' }} />,
  danger: <XCircle size={17} style={{ color: 'var(--danger-500)' }} />,
  info: <Info size={17} style={{ color: 'var(--brand-500)' }} />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<QueuedToast[]>([])

  const push = useCallback((t: Omit<QueuedToast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((s) => [...s, { ...t, id }])
    setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4000)
  }, [])

  const dismiss = (id: string) => setToasts((s) => s.filter((x) => x.id !== id))

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div style={{
        position: 'fixed', bottom: 20, insetInlineStart: 20, zIndex: 1400,
        display: 'flex', flexDirection: 'column', gap: 8, width: 320, maxWidth: 'calc(100vw - 40px)',
      }}>
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -24, scale: 0.95, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              style={{
                display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', background: '#fff',
                border: '1px solid color-mix(in srgb, var(--border-default) 70%, transparent)', borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)', fontFamily: 'var(--font-body)',
              }}
            >
              <span style={{ marginTop: 1, flexShrink: 0 }}>{TOAST_ICON[t.kind]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{t.title}</div>
                {t.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{t.description}</div>}
              </div>
              <span onClick={() => dismiss(t.id)} style={{ cursor: 'pointer', color: 'var(--text-tertiary)', flexShrink: 0 }}><X size={14} /></span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx.push
}

// ─── Global "⌘K" search open event ─────────────────────────────────────────
// Simple pub/sub so DashboardV2Layout's key listener can open GlobalSearch
// without prop-drilling refs through the header.

const SEARCH_OPEN_EVENT = 'dv2:open-search'
export function requestOpenSearch() { window.dispatchEvent(new Event(SEARCH_OPEN_EVENT)) }
export function useOnOpenSearchRequest(handler: () => void) {
  useEffect(() => {
    window.addEventListener(SEARCH_OPEN_EVENT, handler)
    return () => window.removeEventListener(SEARCH_OPEN_EVENT, handler)
  }, [handler])
}
