import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  trend?: { value: string; direction: 'up' | 'down' | 'neutral' }
  color?: string
  bgColor?: string
  borderColor?: string
  subtitle?: string
  onClick?: () => void
}

export const StatCard = ({
  icon: Icon, label, value, trend, color = '#4F46E5',
  bgColor = '#EEF2FF', borderColor = '#C7D2FE', subtitle, onClick,
}: StatCardProps) => {
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus
  const trendColor = trend?.direction === 'up' ? '#10B981' : trend?.direction === 'down' ? '#EF4444' : '#94A3B8'

  return (
    <div
      onClick={onClick}
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex', flexDirection: 'column', gap: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s, transform 0.15s',
        fontFamily: 'Cairo, Tajawal, sans-serif',
      }}
      onMouseEnter={e => { if (onClick) { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)' } }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: bgColor, border: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} style={{ color }} />
        </div>
        {trend && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: trend.direction === 'up' ? '#ECFDF5' : trend.direction === 'down' ? '#FEF2F2' : '#F8FAFC', padding: '2px 8px', borderRadius: 20 }}>
            <TrendIcon size={11} style={{ color: trendColor }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: trendColor }}>{trend.value}</span>
          </div>
        )}
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 13, color: '#64748B', marginTop: 3, fontWeight: 500 }}>{label}</div>
        {subtitle && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{subtitle}</div>}
      </div>
    </div>
  )
}
