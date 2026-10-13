import { useEffect, useState, type CSSProperties, type ReactNode, type ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DURATION_MEDIUM, DURATION_FAST, EASE_OUT } from './motionTokens'

// ─── Card ──────────────────────────────────────────────────────────────────

export function Card({ children, emphasis, interactive, glow, glass, delay = 0, style }: {
  children: ReactNode
  emphasis?: boolean
  interactive?: boolean
  glow?: boolean
  glass?: boolean
  delay?: number
  style?: CSSProperties
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_MEDIUM, delay: Math.min(delay, 0.5), ease: EASE_OUT }}
      whileHover={interactive ? {
        borderColor: 'var(--line-2)',
      } : undefined}
      style={{
        // Night panel: flat navy on the abyss, separated by a hairline. Emphasis adds
        // the logo gradient as a thin top rule plus a faint blue/violet wash.
        backgroundColor: 'var(--surface-card)',
        borderRadius: 'var(--radius-xl)',
        border: emphasis ? '1px solid var(--card-border-emphasis)' : '1px solid var(--card-border)',
        boxShadow: 'var(--shadow-sm)',
        padding: 'var(--space-5)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-body)',
        cursor: interactive ? 'pointer' : undefined,
        ...style,
      }}
    >
      {children}
    </motion.div>
  )
}

// ─── Badge ─────────────────────────────────────────────────────────────────

export type BadgeTone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral'

// Night chips: the semantic colour on a ~13% tint of itself, no border.
const BADGE_TONES: Record<BadgeTone, [string, string]> = {
  brand: ['var(--info-bg)', 'var(--info)'],
  success: ['var(--ok-bg)', 'var(--ok)'],
  warning: ['var(--warn-bg)', 'var(--warn)'],
  danger: ['var(--bad-bg)', 'var(--bad)'],
  neutral: ['var(--hover-bg)', 'var(--text-secondary)'],
}

export function Badge({ tone = 'brand', children, style }: {
  tone?: BadgeTone
  children: ReactNode
  style?: CSSProperties
}) {
  const [bg, fg] = BADGE_TONES[tone] || BADGE_TONES.brand
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 9px', height: 22, boxSizing: 'border-box',
      borderRadius: 'var(--radius-full)', background: bg, color: fg,
      border: tone === 'neutral' ? '1px solid var(--border-default)' : '1px solid transparent',
      fontSize: 11.5, fontWeight: 500, fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
      lineHeight: 1, ...style,
    }}>
      {children}
    </span>
  )
}

// ─── Button ────────────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const SIZE_STYLES: Record<ButtonSize, CSSProperties> = {
  sm: { padding: '0 10px', height: 28, fontSize: 12, borderRadius: 'var(--radius-md)' },
  md: { padding: '0 14px', height: 34, fontSize: 13, borderRadius: 'var(--radius-md)' },
  lg: { padding: '0 18px', height: 40, fontSize: 14, borderRadius: 'var(--radius-lg)' },
}

// Primary carries the logo gradient (reserved for primary actions); the rest stay
// quiet navy/outline so the one gradient button on a screen is the obvious next step.
const VARIANT_STYLES: Record<ButtonVariant, CSSProperties> = {
  primary: { backgroundColor: 'var(--pri-bg)', backgroundImage: 'none', color: 'var(--pri-fg)', border: '1px solid transparent' },
  secondary: { backgroundColor: 'var(--panel-2)', backgroundImage: 'none', color: 'var(--text-primary)', border: '1px solid var(--border-strong)' },
  ghost: { backgroundColor: 'transparent', backgroundImage: 'none', color: 'var(--text-secondary)', border: '1px solid transparent' },
  danger: { backgroundColor: 'var(--bad-bg)', backgroundImage: 'none', color: 'var(--bad)', border: '1px solid transparent' },
}

const HOVER_BG: Record<ButtonVariant, string> = {
  primary: 'var(--pri-hover)',
  secondary: 'var(--raise)',
  ghost: 'var(--hover-bg)',
  danger: 'color-mix(in srgb, var(--bad) 22%, transparent)',
}

const RESTING_SHADOW: Record<ButtonVariant, string> = {
  primary: 'none',
  secondary: 'none',
  ghost: 'none',
  danger: 'none',
}

const HOVER_SHADOW: Record<ButtonVariant, string> = {
  primary: 'none',
  secondary: 'none',
  ghost: 'none',
  danger: 'none',
}

export function Button({ variant = 'primary', size = 'md', disabled, children, onClick, style, 'aria-label': ariaLabel }: {
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  children: ReactNode
  onClick?: () => void
  style?: CSSProperties
  'aria-label'?: string
}) {
  const v = VARIANT_STYLES[variant] || VARIANT_STYLES.primary
  const s = SIZE_STYLES[size] || SIZE_STYLES.md
  const [hover, setHover] = useState(false)
  const active = hover && !disabled
  return (
    <motion.button
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ duration: DURATION_FAST }}
      style={{
        fontFamily: 'var(--font-body)', fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1,
        transition: 'background-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, whiteSpace: 'nowrap',
        boxShadow: active ? HOVER_SHADOW[variant] : RESTING_SHADOW[variant],
        ...v, ...s,
        ...(active ? { backgroundColor: HOVER_BG[variant] } : {}),
        ...(active && variant === 'secondary' ? { borderColor: 'color-mix(in srgb, var(--ink) 30%, transparent)' } : {}),
        ...style,
      }}
    >
      {children}
    </motion.button>
  )
}

// ─── Toast ─────────────────────────────────────────────────────────────────

export type ToastTone = 'success' | 'danger' | 'brand'

const TOAST_TONES: Record<ToastTone, [string, string]> = {
  success: ['var(--ok-bg)', 'var(--ok)'],
  danger: ['var(--bad-bg)', 'var(--bad)'],
  brand: ['var(--info-bg)', 'var(--sky)'],
}

export function Toast({ tone = 'brand', title, description, onClose }: {
  tone?: ToastTone
  title: string
  description?: string
  onClose?: () => void
}) {
  const [, fg] = TOAST_TONES[tone] || TOAST_TONES.brand
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -24, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      style={{
        display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px', background: 'var(--surface-raised)',
        border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
        minWidth: 280, fontFamily: 'var(--font-body)',
      }}>
      <span style={{ width: 8, height: 8, borderRadius: 'var(--radius-full)', background: fg, marginTop: 6, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 'var(--text-body-sm)', color: 'var(--text-primary)' }}>{title}</div>
        {description && (
          <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', marginTop: 2 }}>{description}</div>
        )}
      </div>
      {onClose && (
        <span onClick={onClose} style={{ cursor: 'pointer', color: 'var(--text-tertiary)' }}>×</span>
      )}
    </motion.div>
  )
}

// ─── Input ─────────────────────────────────────────────────────────────────

export function Input({ label, placeholder, type = 'text', value, onChange, error, icon, style }: {
  label?: string
  placeholder?: string
  type?: string
  value?: string
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
  error?: string
  icon?: ReactNode
  style?: CSSProperties
}) {
  const [focus, setFocus] = useState(false)
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-body)', ...style }}>
      {label && <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon && <span style={{ position: 'absolute', insetInlineStart: 12, color: 'var(--text-tertiary)', display: 'flex' }}>{icon}</span>}
        <input
          type={type} placeholder={placeholder} value={value} onChange={onChange}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{
            width: '100%', boxSizing: 'border-box', paddingBlock: 9, paddingInlineEnd: 12, paddingInlineStart: icon ? 36 : 12,
            fontSize: 'var(--text-body-sm)', borderRadius: 'var(--radius-md)', background: 'var(--surface-input)',
            border: error ? '1px solid var(--danger-500)' : focus ? '1px solid var(--border-focus)' : '1px solid var(--border-strong)',
            boxShadow: focus ? 'var(--ring-focus)' : 'none', outline: 'none', color: 'var(--text-primary)',
            transition: 'box-shadow var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out)',
          }}
        />
      </div>
      {error && <span style={{ fontSize: 'var(--text-caption)', color: 'var(--danger-500)' }}>{error}</span>}
    </label>
  )
}

// ─── Select ────────────────────────────────────────────────────────────────

export interface SelectOption { value: string; label: string }

export function Select({ label, options = [], value, onChange, style }: {
  label?: string
  options?: SelectOption[]
  value?: string
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void
  style?: CSSProperties
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-body)', ...style }}>
      {label && <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>}
      <select
        value={value} onChange={onChange}
        style={{
          padding: '9px 12px', fontSize: 'var(--text-body-sm)', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-strong)', color: 'var(--text-primary)', background: 'var(--surface-input)',
          outline: 'none', appearance: 'auto',
        }}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

// ─── Switch ────────────────────────────────────────────────────────────────

export function Switch({ checked, onChange, label, style }: {
  checked: boolean
  onChange?: (checked: boolean) => void
  label?: ReactNode
  style?: CSSProperties
}) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-md)', cursor: 'pointer', ...style }}>
      <span
        onClick={() => onChange && onChange(!checked)}
        style={{
          width: 42, height: 24, borderRadius: 'var(--radius-full)',
          background: checked ? 'var(--pri-bg)' : 'var(--border-strong)',
          position: 'relative', transition: 'background var(--duration-normal) var(--ease-out)', flexShrink: 0,
        }}
      >
        <motion.span
          animate={{ insetInlineStart: checked ? 21 : 3 }}
          transition={{ type: 'spring', stiffness: 600, damping: 32 }}
          style={{
            position: 'absolute', top: 3, width: 18, height: 18,
            borderRadius: 'var(--radius-full)', background: checked ? 'var(--pri-fg)' : '#fff', boxShadow: 'var(--shadow-sm)',
          }}
        />
      </span>
      {label}
    </label>
  )
}

// ─── Dialog ────────────────────────────────────────────────────────────────

export function Dialog({ open, title, children, onClose, footer }: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed', inset: 0, background: 'var(--scrim)', backdropFilter: 'blur(3px)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: 16,
          }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            style={{
              background: 'var(--surface-raised)', borderRadius: 14, boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border-strong)',
              width: 460, maxWidth: '100%', padding: 22, fontFamily: 'var(--font-body)', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
              <button type="button" onClick={onClose} aria-label="إغلاق" style={{ cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 22, lineHeight: 1, background: 'none', border: 0, padding: 4 }}>×</button>
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{children}</div>
            {footer && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
