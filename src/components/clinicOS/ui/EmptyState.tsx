import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  body?: string
  action?: { label: string; onClick: () => void }
}

export const EmptyState = ({ icon: Icon, title, body, action }: EmptyStateProps) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', gap: 12 }}>
    <div style={{ width: 56, height: 56, borderRadius: 16, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={24} style={{ color: '#94A3B8' }} />
    </div>
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: 15, fontWeight: 700, color: '#334155', fontFamily: 'Cairo, sans-serif', margin: 0 }}>{title}</p>
      {body && <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4, fontFamily: 'Tajawal, sans-serif' }}>{body}</p>}
    </div>
    {action && (
      <button onClick={action.onClick} style={{ marginTop: 4, padding: '8px 20px', borderRadius: 8, background: '#4F46E5', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
        {action.label}
      </button>
    )}
  </div>
)
