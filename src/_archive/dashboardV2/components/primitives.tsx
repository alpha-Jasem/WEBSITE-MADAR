import { useState, type CSSProperties, type ReactNode, type ChangeEvent } from 'react'

// ─── Card ──────────────────────────────────────────────────────────────────

export function Card({ children, emphasis, interactive, style }: {
  children: ReactNode
  emphasis?: boolean
  interactive?: boolean
  style?: CSSProperties
}) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={interactive ? () => setHover(true) : undefined}
      onMouseLeave={interactive ? () => setHover(false) : undefined}
      style={{
        background: 'var(--surface-card)',
        borderRadius: 'var(--radius-lg)',
        border: emphasis ? '1.5px solid var(--brand-500)' : '1px solid var(--border-default)',
        boxShadow: interactive && hover ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transform: interactive && hover ? 'translateY(-2px)' : 'none',
        transition: 'box-shadow var(--duration-normal) var(--ease-out), transform var(--duration-normal) var(--ease-out)',
        padding: 'var(--space-5)',
        fontFamily: 'var(--font-body)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ─── Badge ─────────────────────────────────────────────────────────────────

export type BadgeTone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral'

const BADGE_TONES: Record<BadgeTone, [string, string]> = {
  brand: ['var(--brand-100)', 'var(--brand-600)'],
  success: ['var(--success-100)', 'var(--success-500)'],
  warning: ['var(--warning-100)', 'var(--warning-500)'],
  danger: ['var(--danger-100)', 'var(--danger-500)'],
  neutral: ['var(--slate-100)', 'var(--slate-600)'],
}

export function Badge({ tone = 'brand', children, style }: {
  tone?: BadgeTone
  children: ReactNode
  style?: CSSProperties
}) {
  const [bg, fg] = BADGE_TONES[tone] || BADGE_TONES.brand
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
      borderRadius: 'var(--radius-full)', background: bg, color: fg,
      fontSize: 'var(--text-caption)', fontWeight: 700, fontFamily: 'var(--font-body)',
      lineHeight: 1.6, ...style,
    }}>
      {children}
    </span>
  )
}

// ─── Button ────────────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const SIZE_STYLES: Record<ButtonSize, CSSProperties> = {
  sm: { padding: '6px 12px', fontSize: 'var(--text-body-sm)' },
  md: { padding: '10px 18px', fontSize: 'var(--text-body-md)' },
  lg: { padding: '13px 24px', fontSize: 'var(--text-body-lg)' },
}

const VARIANT_STYLES: Record<ButtonVariant, CSSProperties> = {
  primary: { background: 'var(--accent-primary)', color: 'var(--text-on-brand)', border: '1px solid transparent' },
  secondary: { background: '#fff', color: 'var(--text-primary)', border: '1px solid var(--border-strong)' },
  ghost: { background: 'transparent', color: 'var(--text-primary)', border: '1px solid transparent' },
  danger: { background: 'var(--danger-500)', color: '#fff', border: '1px solid transparent' },
}

export function Button({ variant = 'primary', size = 'md', disabled, children, onClick, style }: {
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  children: ReactNode
  onClick?: () => void
  style?: CSSProperties
}) {
  const v = VARIANT_STYLES[variant] || VARIANT_STYLES.primary
  const s = SIZE_STYLES[size] || SIZE_STYLES.md
  const [hover, setHover] = useState(false)
  const bg = hover && !disabled
    ? (variant === 'primary' ? 'var(--accent-primary-hover)' : variant === 'danger' ? 'var(--danger-500)' : 'var(--slate-100)')
    : v.background
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        fontFamily: 'var(--font-body)', fontWeight: 600, borderRadius: 'var(--radius-md)',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        transition: 'background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, whiteSpace: 'nowrap',
        ...v, ...s, background: bg, boxShadow: variant === 'primary' ? 'var(--shadow-sm)' : 'none', ...style,
      }}
    >
      {children}
    </button>
  )
}

// ─── Toast ─────────────────────────────────────────────────────────────────

export type ToastTone = 'success' | 'danger' | 'brand'

const TOAST_TONES: Record<ToastTone, [string, string]> = {
  success: ['var(--success-100)', 'var(--success-500)'],
  danger: ['var(--danger-100)', 'var(--danger-500)'],
  brand: ['var(--brand-100)', 'var(--brand-600)'],
}

export function Toast({ tone = 'brand', title, description, onClose }: {
  tone?: ToastTone
  title: string
  description?: string
  onClose?: () => void
}) {
  const [, fg] = TOAST_TONES[tone] || TOAST_TONES.brand
  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px', background: '#fff',
      border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
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
    </div>
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
      {label && <span style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon && <span style={{ position: 'absolute', insetInlineStart: 12, color: 'var(--text-tertiary)', display: 'flex' }}>{icon}</span>}
        <input
          type={type} placeholder={placeholder} value={value} onChange={onChange}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{
            width: '100%', boxSizing: 'border-box', padding: icon ? '10px 14px 10px 36px' : '10px 14px',
            fontSize: 'var(--text-body-md)', borderRadius: 'var(--radius-md)',
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
      {label && <span style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>}
      <select
        value={value} onChange={onChange}
        style={{
          padding: '10px 14px', fontSize: 'var(--text-body-md)', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-strong)', color: 'var(--text-primary)', background: '#fff',
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
          width: 40, height: 22, borderRadius: 'var(--radius-full)',
          background: checked ? 'var(--accent-primary)' : 'var(--slate-300)',
          position: 'relative', transition: 'background var(--duration-normal) var(--ease-out)', flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 2, insetInlineStart: checked ? 20 : 2, width: 18, height: 18,
          borderRadius: 'var(--radius-full)', background: '#fff', boxShadow: 'var(--shadow-sm)',
          transition: 'inset-inline-start var(--duration-normal) var(--ease-out)',
        }} />
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
  if (!open) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,17,23,.45)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 1300,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
        width: 420, maxWidth: '90vw', padding: 24, fontFamily: 'var(--font-body)', maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--text-heading-lg)', color: 'var(--text-primary)' }}>{title}</h3>
          <span onClick={onClose} style={{ cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 20 }}>×</span>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-body-md)' }}>{children}</div>
        {footer && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>{footer}</div>}
      </div>
    </div>
  )
}
