interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

const config: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  active:     { label: 'نشط',          color: '#10B981', bg: 'rgba(16,185,129,0.12)',  dot: '#10B981' },
  paused:     { label: 'متوقف',        color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  dot: '#F59E0B' },
  error:      { label: 'خطأ',          color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   dot: '#EF4444' },
  building:   { label: 'قيد البناء',   color: '#4F6EF7', bg: 'rgba(79,110,247,0.12)', dot: '#4F6EF7' },
  trial:      { label: 'تجريبي',       color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', dot: '#8B5CF6' },
  suspended:  { label: 'موقوف',        color: '#6B7280', bg: 'rgba(107,114,128,0.12)',dot: '#6B7280' },
  new:        { label: 'جديد',         color: '#06B6D4', bg: 'rgba(6,182,212,0.12)',  dot: '#06B6D4' },
  contacted:  { label: 'تم التواصل',   color: '#4F6EF7', bg: 'rgba(79,110,247,0.12)', dot: '#4F6EF7' },
  qualified:  { label: 'مؤهل',         color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', dot: '#8B5CF6' },
  converted:  { label: 'تحويل',        color: '#10B981', bg: 'rgba(16,185,129,0.12)', dot: '#10B981' },
  lost:       { label: 'خسارة',        color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  dot: '#EF4444' },
  info:       { label: 'معلومة',       color: '#4F6EF7', bg: 'rgba(79,110,247,0.12)', dot: '#4F6EF7' },
  warning:    { label: 'تحذير',        color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', dot: '#F59E0B' },
  success:    { label: 'نجاح',         color: '#10B981', bg: 'rgba(16,185,129,0.12)', dot: '#10B981' },
}

export const StatusBadge = ({ status, size = 'sm' }: StatusBadgeProps) => {
  const cfg = config[status] ?? { label: status, color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', dot: '#94A3B8' }
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium font-tajawal ${pad}`}
      style={{ background: cfg.bg, color: cfg.color }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  )
}
