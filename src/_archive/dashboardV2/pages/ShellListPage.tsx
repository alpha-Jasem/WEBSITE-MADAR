import { useState, type ReactNode } from 'react'
import { Plus, Search } from 'lucide-react'
import { Card, Button } from '@/_archive/dashboardV2/components/primitives'
import { EmptyState, useToast } from '@/_archive/dashboardV2/components/uiExtras'

export function ShellListPage({ title, subtitle, searchPlaceholder, createLabel, emptyTitle, emptyDescription, icon, secondaryAction }: {
  title: string
  subtitle: string
  searchPlaceholder: string
  createLabel: string
  emptyTitle: string
  emptyDescription: string
  icon: ReactNode
  secondaryAction?: ReactNode
}) {
  const [search, setSearch] = useState('')
  const pushToast = useToast()

  function handleCreate() {
    pushToast({ kind: 'info', title: 'هذي الميزة قيد التجهيز' })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, maxWidth: 480 }}>{subtitle}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {secondaryAction}
          <Button variant="primary" onClick={handleCreate}><Plus size={15} /> {createLabel}</Button>
        </div>
      </div>

      <Card style={{ marginBottom: 16, padding: 'var(--space-4)' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={14} style={{ position: 'absolute', insetInlineStart: 12, color: 'var(--text-tertiary)' }} />
          <input
            placeholder={searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '9px 14px', paddingInlineStart: 34, fontSize: 13, borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      </Card>

      <Card style={{ padding: 'var(--space-8)' }}>
        <EmptyState
          icon={icon} title={emptyTitle} description={emptyDescription}
          action={<Button size="sm" onClick={handleCreate}><Plus size={14} /> {createLabel}</Button>}
        />
      </Card>
    </div>
  )
}
