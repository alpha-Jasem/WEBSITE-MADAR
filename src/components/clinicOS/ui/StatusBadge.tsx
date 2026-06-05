import type { AppointmentStatus, MessageStatus, AICallStatus, DoctorStatus } from '../../../types/clinicOS'

type AnyStatus = AppointmentStatus | MessageStatus | AICallStatus | DoctorStatus | string

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  // Appointment
  confirmed:   { label: 'مؤكد',        color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  pending:     { label: 'قيد الانتظار', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
  checked_in:  { label: 'حاضر',        color: '#0369A1', bg: '#EFF9FF', border: '#BAE6FD' },
  completed:   { label: 'مكتمل',       color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  cancelled:   { label: 'ملغي',        color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  no_show:     { label: 'لم يحضر',     color: '#475569', bg: '#F1F5F9', border: '#CBD5E1' },
  rescheduled: { label: 'تم التأجيل',  color: '#0369A1', bg: '#EFF9FF', border: '#BAE6FD' },
  needs_review:{ label: 'تحتاج مراجعة',color: '#C2410C', bg: '#FFF7ED', border: '#FED7AA' },
  // Message
  not_sent:    { label: 'لم يُرسل',    color: '#94A3B8', bg: '#F8FAFC', border: '#E2E8F0' },
  pending:     { label: 'قيد الانتظار', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
  sent:        { label: 'مرسل',        color: '#0369A1', bg: '#EFF9FF', border: '#BAE6FD' },
  delivered:   { label: 'تم التسليم',  color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  read:        { label: 'تمت القراءة', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  failed:      { label: 'فشل الإرسال', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  // Doctor
  available:   { label: 'متاح',        color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  busy:        { label: 'مشغول',       color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
  fully_booked:{ label: 'محجوز بالكامل',color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  on_break:    { label: 'استراحة',     color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
  off_today:   { label: 'إجازة',       color: '#475569', bg: '#F1F5F9', border: '#CBD5E1' },
  emergency_only: { label: 'طوارئ فقط', color: '#C2410C', bg: '#FFF7ED', border: '#FED7AA' },
  // AI
  booked:      { label: 'تم الحجز',    color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  no_slot:     { label: 'لا وقت متاح', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  transferred: { label: 'تم التحويل',  color: '#0369A1', bg: '#EFF9FF', border: '#BAE6FD' },
}

interface StatusBadgeProps {
  status: AnyStatus
  size?: 'sm' | 'md'
}

export const StatusBadge = ({ status, size = 'md' }: StatusBadgeProps) => {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: size === 'sm' ? '2px 8px' : '3px 10px',
      borderRadius: 20,
      fontSize: size === 'sm' ? 11 : 12,
      fontWeight: 700,
      color: cfg.color,
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      whiteSpace: 'nowrap',
      fontFamily: 'Tajawal, Cairo, sans-serif',
    }}>
      {cfg.label}
    </span>
  )
}

export const SOURCE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ai_booking: { label: 'حجز ذكي',    color: '#7C3AED', bg: '#F5F3FF' },
  whatsapp:   { label: 'واتساب',     color: '#059669', bg: '#ECFDF5' },
  reception:  { label: 'الاستقبال',  color: '#0369A1', bg: '#EFF9FF' },
  website:    { label: 'الموقع',     color: '#B45309', bg: '#FFFBEB' },
  manual:     { label: 'يدوي',       color: '#475569', bg: '#F1F5F9' },
}

export const SourceBadge = ({ source }: { source: string }) => {
  const cfg = SOURCE_CONFIG[source] ?? { label: source, color: '#64748B', bg: '#F8FAFC' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg, fontFamily: 'Tajawal, sans-serif' }}>
      {cfg.label}
    </span>
  )
}
