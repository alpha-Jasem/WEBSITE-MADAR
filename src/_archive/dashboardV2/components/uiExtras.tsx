import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type CSSProperties, type ReactNode,
} from 'react'
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { CheckCircle2, XCircle, Info, X, Keyboard, Sparkles, Plus, ArrowUpDown } from 'lucide-react'

// ─── Avatar (deterministic color + initial) ────────────────────────────────

const AVATAR_PALETTE = [
  ['#E0F7FF', '#0099CC'], ['#FFE8CC', '#C2620A'], ['#E7DBFF', '#6D28D9'],
  ['#DCFCE7', '#15803D'], ['#FCE7F3', '#BE185D'], ['#FEF3C7', '#B45309'],
  ['#D6E4FF', '#1E3A70'], ['#FEE2E2', '#B91C1C'],
]

function hashStr(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const clean = (name || '؟').trim()
  const [bg, fg] = AVATAR_PALETTE[hashStr(clean) % AVATAR_PALETTE.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: bg, color: fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: size * 0.4,
    }}>
      {clean[0] || '؟'}
    </div>
  )
}

// ─── SortableHeader (click a table column header to sort by it) ───────────

export function SortableHeader({ label, active, dir, onClick }: {
  label: string
  active: boolean
  dir: 1 | -1
  onClick: () => void
}) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', userSelect: 'none', color: active ? 'var(--brand-600)' : undefined }}>
      {label}
      <ArrowUpDown size={12} style={{ opacity: active ? 1 : 0.4, transform: active && dir === -1 ? 'scaleY(-1)' : undefined }} />
    </div>
  )
}

// ─── LiveDot (pulsing indicator for realtime-subscribed data) ─────────────

export function LiveDot({ live }: { live?: boolean }) {
  if (!live) return null
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--success-500)' }}>
      <span style={{ position: 'relative', width: 7, height: 7, display: 'inline-flex' }}>
        <motion.span
          animate={{ scale: [1, 2.2], opacity: [0.55, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
          style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--success-500)' }}
        />
        <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--success-500)' }} />
      </span>
      مباشر
    </span>
  )
}

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

// ─── Sparkline ──────────────────────────────────────────────────────────────

export function Sparkline({ data, width = 64, height = 24, color = 'var(--brand-500)' }: {
  data: number[]
  width?: number
  height?: number
  color?: string
}) {
  if (data.length < 2) return null
  const max = Math.max(1, ...data)
  const min = Math.min(...data)
  const range = Math.max(1, max - min)
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * width,
    height - ((v - min) / range) * height,
  ])
  const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible', flexShrink: 0 }}>
      <path d={path} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
    </svg>
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
interface QueuedToast {
  id: string; kind: ToastKind; title: string; description?: string; duration?: number
  action?: { label: string; onClick: () => void }
}

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
    setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), t.duration ?? 4000)
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
                {t.action && (
                  <span
                    onClick={() => { t.action!.onClick(); dismiss(t.id) }}
                    style={{ display: 'inline-block', marginTop: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--brand-600)', cursor: 'pointer' }}
                  >
                    {t.action.label}
                  </span>
                )}
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

// ─── Keyboard shortcuts overlay ("?" to open) ──────────────────────────────

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: '⌘K / Ctrl+K', label: 'فتح البحث والإجراءات السريعة' },
  { keys: '↑ / ↓', label: 'التنقل بين نتائج البحث' },
  { keys: 'Enter', label: 'تنفيذ النتيجة المحددة' },
  { keys: 'Esc', label: 'إغلاق أي نافذة أو قائمة مفتوحة' },
  { keys: '?', label: 'عرض هذه القائمة' },
]

function isTypingTarget(el: EventTarget | null) {
  const tag = (el as HTMLElement)?.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement)?.isContentEditable
}

export function ShortcutsOverlay() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '?' && !isTypingTarget(e.target) && !(e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen(true) }
      else if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          onClick={() => setOpen(false)}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(13,27,62,.25)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500 }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            style={{ background: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: 360, maxWidth: '90vw', padding: 22, fontFamily: 'var(--font-body)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
              <Keyboard size={18} style={{ color: 'var(--brand-500)' }} /> اختصارات لوحة المفاتيح
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {SHORTCUTS.map((s) => (
                <div key={s.keys} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.label}</span>
                  <span style={{
                    fontSize: 11.5, fontWeight: 700, color: 'var(--text-primary)', background: 'var(--surface-sunken)',
                    border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '3px 8px', fontFamily: 'var(--font-mono)',
                  }}>{s.keys}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── "What's New" badge ─────────────────────────────────────────────────────

const WHATS_NEW_VERSION = 'dv2-2026-07-29'
const WHATS_NEW_SEEN_KEY = 'dv2_whats_new_seen'
const WHATS_NEW_ITEMS = [
  'بحث سريع مطوّر: اكتب "حجز جديد" أو اضغط ⌘K لتنفيذ إجراءات مباشرة',
  'تحديد جماعي بالحجوزات والعملاء مع إمكانية التراجع',
  'رسوم بيانية تفاعلية مع مقارنة بالأسبوع الماضي',
  'قائمة جانبية قابلة للطي لمساحة عرض أكبر',
]

export function WhatsNewBadge() {
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(true)

  useEffect(() => {
    setSeen(localStorage.getItem(WHATS_NEW_SEEN_KEY) === WHATS_NEW_VERSION)
  }, [])

  function toggle() {
    setOpen((v) => !v)
    if (!seen) { localStorage.setItem(WHATS_NEW_SEEN_KEY, WHATS_NEW_VERSION); setSeen(true) }
  }

  return (
    <div style={{ position: 'relative' }}>
      <div onClick={toggle} style={{ position: 'relative', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}>
        <Sparkles size={18} />
        {!seen && (
          <span style={{ position: 'absolute', top: -2, insetInlineEnd: -2, width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-500)', border: '2px solid var(--surface-page)' }} />
        )}
      </div>
      <AnimatePresence>
        {open && (
          <>
            <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1200 }} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'absolute', top: '130%', insetInlineEnd: 0, width: 280, background: '#fff', borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-default)', zIndex: 1300, padding: 14,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={14} style={{ color: 'var(--brand-500)' }} /> جديد بالداشبورد
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {WHATS_NEW_ITEMS.map((item, i) => (
                  <li key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <span style={{ color: 'var(--brand-500)', flexShrink: 0 }}>•</span>{item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Floating quick-add button (FAB) ───────────────────────────────────────

export function Fab({ actions }: { actions: { label: string; icon: ReactNode; onClick: () => void }[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'fixed', bottom: 24, insetInlineStart: 24, zIndex: 1250 }}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', bottom: '115%', insetInlineStart: 0, minWidth: 190, background: '#fff',
              borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-default)', padding: 6,
            }}
          >
            {actions.map((a, i) => (
              <div
                key={i}
                onClick={() => { a.onClick(); setOpen(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-sunken)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ color: 'var(--brand-500)', display: 'flex' }}>{a.icon}</span>
                {a.label}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.94 }}
        animate={{ rotate: open ? 45 : 0 }}
        transition={{ duration: 0.2 }}
        style={{
          width: 52, height: 52, borderRadius: '50%', background: 'var(--gradient-brand)', color: '#fff', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0,191,255,.4), var(--shadow-lg)',
        }}
      >
        <Plus size={22} />
      </motion.button>
    </div>
  )
}
