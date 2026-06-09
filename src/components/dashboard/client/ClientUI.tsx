import { useEffect, useState } from 'react'
import type { ElementType, ReactNode } from 'react'

type Tone = 'blue' | 'green' | 'amber' | 'red' | 'slate'

const toneMap: Record<Tone, { color: string; bg: string; border: string }> = {
  blue: { color: '#1565C0', bg: 'rgba(0,191,255,0.10)', border: 'rgba(0,191,255,0.22)' },
  green: { color: '#059669', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.24)' },
  amber: { color: '#D97706', bg: 'rgba(245,158,11,0.11)', border: 'rgba(245,158,11,0.24)' },
  red: { color: '#DC2626', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.22)' },
  slate: { color: '#475569', bg: '#F8FAFC', border: '#E2E8F0' },
}

export function ClientPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <section className="client-page-header">
      <div>
        {eyebrow && <span>{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="client-page-header-actions">{actions}</div>}
    </section>
  )
}

export function ClientPanel({
  icon: Icon,
  title,
  description,
  action,
  children,
  className = '',
}: {
  icon?: ElementType
  title?: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`client-panel ${className}`}>
      {(title || description || Icon || action) && (
        <div className="client-panel-head">
          <div>
            {Icon && <span><Icon size={17} /></span>}
            <div>
              {title && <h2>{title}</h2>}
              {description && <p>{description}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function ClientStatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'blue',
}: {
  icon: ElementType
  label: string
  value: string | number
  sub?: string
  tone?: Tone
}) {
  const t = toneMap[tone]
  return (
    <article className="client-stat-card" style={{ borderTopColor: t.color }}>
      <div>
        <span style={{ color: t.color, background: t.bg, borderColor: t.border }}>
          <Icon size={17} />
        </span>
        <small>{label}</small>
      </div>
      <strong style={{ color: t.color }}>{value}</strong>
      {sub && <p>{sub}</p>}
    </article>
  )
}

export function ClientButton({
  children,
  tone = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'primary' | 'secondary' | 'success' | 'danger'
}) {
  return (
    <button {...props} className={`client-button ${tone} ${props.className || ''}`}>
      {children}
    </button>
  )
}

export function ClientEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: ElementType
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="client-empty-state">
      <span><Icon size={24} /></span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}

export function ClientStatusPill({ children, tone = 'slate' }: { children: ReactNode; tone?: Tone }) {
  const t = toneMap[tone]
  return (
    <span className="client-status-pill" style={{ color: t.color, background: t.bg, borderColor: t.border }}>
      {children}
    </span>
  )
}

export function ClientInsightPanel({
  title,
  description,
  items,
  storageKey,
}: {
  title: string
  description?: string
  items: Array<{ title: string; description: string; tone?: Tone; action?: ReactNode }>
  storageKey?: string
}) {
  const key = `madar-client-insight-hidden:${storageKey || title}`
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    setHidden(localStorage.getItem(key) === '1')
  }, [key])

  const hidePanel = () => {
    localStorage.setItem(key, '1')
    setHidden(true)
  }

  const showPanel = () => {
    localStorage.removeItem(key)
    setHidden(false)
  }

  if (hidden) {
    return (
      <button type="button" className="client-insight-restore" onClick={showPanel}>
        <span>توصيات مدار مخفية</span>
        <strong>إظهار التوصيات</strong>
      </button>
    )
  }

  return (
    <section className="client-insight-panel">
      <div className="client-insight-head">
        <div>
          <span>توصيات مدار</span>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <button type="button" onClick={hidePanel} aria-label="إخفاء توصيات مدار">
          إخفاء
        </button>
      </div>
      <div className="client-insight-grid">
        {items.map((item) => {
          const t = toneMap[item.tone || 'blue']
          return (
            <article key={item.title} style={{ borderColor: t.border, background: t.bg }}>
              <i style={{ background: t.color }} />
              <div>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>
              {item.action}
            </article>
          )
        })}
      </div>
    </section>
  )
}
