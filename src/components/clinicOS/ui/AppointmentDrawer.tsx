import { useState } from 'react'
import { X, Phone, Calendar, Clock, User, Stethoscope, MessageSquare, CheckCircle, AlertCircle, ChevronLeft } from 'lucide-react'
import { StatusBadge, SourceBadge } from './StatusBadge'
import type { Appointment, AppointmentStatus } from '../../../types/clinicOS'
import { DEMO_SERVICES } from '../../../lib/clinicOSDemoData'
import { updateAppointmentStatus } from '../../../lib/clinicOSQueries'
import { useToast } from '../../../lib/useToast'
import { notifyApptConfirmed, notifyApptCancelled } from '../../../lib/clinicN8n'
import { useClinicOS } from '../../../context/ClinicOSContext'

interface AppointmentDrawerProps {
  appointment: Appointment | null
  onClose: () => void
  onConfirm?: (id: string) => void
  onCancel?: (id: string) => void
}

const INFO_ROW = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #F8FAFC' }}>
    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={14} style={{ color: '#64748B' }} />
    </div>
    <div>
      <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>{label}</div>
      <div style={{ fontSize: 13, color: '#0F172A', fontWeight: 600, fontFamily: 'Tajawal, sans-serif' }}>{value}</div>
    </div>
  </div>
)

function buildTimeline(appt: Appointment) {
  const msgSent = ['sent', 'delivered', 'read'].includes(appt.message_status)
  const patientConfirmed = ['confirmed', 'checked_in', 'completed'].includes(appt.status)
  const reminderSet = patientConfirmed
  return [
    { label: 'تم إنشاء الموعد', done: true },
    { label: 'تم حجز الجدول', done: true },
    { label: 'تم إرسال التأكيد عبر واتساب', done: msgSent },
    { label: 'المريض أكد الحضور', done: patientConfirmed },
    { label: 'تم تحديد تذكير قبل الموعد', done: reminderSet },
  ]
}

export const AppointmentDrawer = ({ appointment, onClose, onConfirm, onCancel }: AppointmentDrawerProps) => {
  const { showToast } = useToast()
  const { clinicName, companyId } = useClinicOS()
  const [localStatus, setLocalStatus] = useState<AppointmentStatus | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  if (!appointment) return null

  const effectiveStatus = localStatus ?? appointment.status
  const service = DEMO_SERVICES.find(s => s.id === appointment.service_id)
  const price = service?.price ?? 0

  const handleConfirm = async () => {
    setIsConfirming(true)
    const prev = localStatus ?? appointment.status
    setLocalStatus('confirmed')
    try {
      await updateAppointmentStatus(appointment.id, 'confirmed')
      onConfirm?.(appointment.id)
      showToast('تم تأكيد الموعد بنجاح', 'success')
      notifyApptConfirmed({
        patient_phone: appointment.patient_phone,
        patient_name: appointment.patient_name,
        doctor_name: appointment.doctor_name,
        service_name: appointment.service_name,
        appointment_date: appointment.appointment_date,
        start_time: appointment.start_time,
        clinic_name: clinicName || 'العيادة',
        company_id: companyId || '',
      })
    } catch {
      setLocalStatus(prev)
      showToast('تعذر تأكيد الموعد، حاول مرة أخرى', 'error')
    } finally {
      setIsConfirming(false)
    }
  }

  const handleCancelConfirmed = async () => {
    setShowCancelConfirm(false)
    setIsCancelling(true)
    const prev = localStatus ?? appointment.status
    setLocalStatus('cancelled')
    try {
      await updateAppointmentStatus(appointment.id, 'cancelled')
      onCancel?.(appointment.id)
      showToast('تم إلغاء الموعد', 'warning')
      notifyApptCancelled({
        patient_phone: appointment.patient_phone,
        patient_name: appointment.patient_name,
        doctor_name: appointment.doctor_name,
        service_name: appointment.service_name,
        appointment_date: appointment.appointment_date,
        start_time: appointment.start_time,
        clinic_name: clinicName || 'العيادة',
        company_id: companyId || '',
      })
    } catch {
      setLocalStatus(prev)
      showToast('تعذر إلغاء الموعد، حاول مرة أخرى', 'error')
    } finally {
      setIsCancelling(false)
    }
  }

  const handleWhatsApp = () => {
    const clean = (appointment.patient_phone || '').replace(/\D/g, '')
    window.open('https://wa.me/' + clean, '_blank', 'noopener,noreferrer')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', direction: 'rtl' }}>
      {/* Overlay */}
      <div onClick={onClose} style={{ flex: 1, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }} />

      {/* Drawer */}
      <div style={{ width: 420, background: '#FFFFFF', boxShadow: '-8px 0 40px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 6px 0' }}>{appointment.patient_name}</h2>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <StatusBadge status={effectiveStatus} />
              <SourceBadge source={appointment.source} />
              {appointment.patient_type === 'new' && (
                <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#7C3AED', background: '#F5F3FF', border: '1px solid #DDD6FE' }}>عميل جديد</span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <ChevronLeft size={16} style={{ color: '#64748B' }} />
          </button>
        </div>

        <div style={{ padding: '0 20px 20px', flex: 1 }}>
          {/* Appointment info */}
          <div style={{ marginTop: 16 }}>
            <INFO_ROW icon={Phone} label="رقم الجوال" value={appointment.patient_phone} />
            <INFO_ROW icon={Calendar} label="التاريخ" value={appointment.appointment_date} />
            <INFO_ROW icon={Clock} label="الوقت" value={`${appointment.start_time} — ${appointment.end_time} (${appointment.duration_minutes} دقيقة)`} />
            <INFO_ROW icon={User} label="الطبيب" value={appointment.doctor_name} />
            <INFO_ROW icon={Stethoscope} label="الخدمة" value={`${appointment.service_name}${price > 0 ? ` — ${price} ريال` : ' — مجاناً'}`} />
          </div>

          {/* WhatsApp status */}
          <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', fontFamily: 'Cairo, sans-serif', marginBottom: 8 }}>حالة واتساب</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageSquare size={14} style={{ color: '#059669' }} />
              <span style={{ fontSize: 12, color: '#334155', fontFamily: 'Tajawal, sans-serif' }}>
                رسالة التأكيد — <StatusBadge status={appointment.message_status} size="sm" />
              </span>
            </div>
          </div>

          {/* Needs review */}
          {effectiveStatus === 'needs_review' && appointment.needs_review_reason && (
            <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 10, background: '#FFF7ED', border: '1px solid #FED7AA' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <AlertCircle size={14} style={{ color: '#C2410C', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#C2410C', fontFamily: 'Cairo, sans-serif' }}>سبب المراجعة</div>
                  <div style={{ fontSize: 12, color: '#9A3412', fontFamily: 'Tajawal, sans-serif', marginTop: 2 }}>{appointment.needs_review_reason}</div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {appointment.notes && (
            <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', fontFamily: 'Cairo, sans-serif', marginBottom: 4 }}>ملاحظات</div>
              <p style={{ fontSize: 12, color: '#475569', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>{appointment.notes}</p>
            </div>
          )}

          {/* Timeline */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', fontFamily: 'Cairo, sans-serif', marginBottom: 12 }}>سجل النشاط</div>
            {buildTimeline(appointment).map((ev, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                <CheckCircle size={14} style={{ color: ev.done ? '#059669' : '#CBD5E1', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: ev.done ? '#334155' : '#CBD5E1', fontFamily: 'Tajawal, sans-serif' }}>{ev.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #E2E8F0', position: 'sticky', bottom: 0, background: '#FFFFFF' }}>
          {showCancelConfirm ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#DC2626', fontFamily: 'Cairo, sans-serif', textAlign: 'center' }}>هل أنت متأكد من إلغاء الموعد؟</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleCancelConfirmed} disabled={isCancelling} style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#DC2626', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: isCancelling ? 'not-allowed' : 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                  {isCancelling ? 'جاري الإلغاء...' : 'نعم، إلغاء'}
                </button>
                <button onClick={() => setShowCancelConfirm(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                  لا، تراجع
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              {effectiveStatus === 'pending' && (
                <button onClick={handleConfirm} disabled={isConfirming} style={{ flex: 1, padding: '10px', borderRadius: 8, background: isConfirming ? '#94A3B8' : '#059669', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: isConfirming ? 'not-allowed' : 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                  {isConfirming ? 'جاري التأكيد...' : 'تأكيد الموعد'}
                </button>
              )}
              {effectiveStatus === 'confirmed' && localStatus === 'confirmed' && (
                <div style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <CheckCircle size={14} style={{ color: '#059669' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#059669', fontFamily: 'Cairo, sans-serif' }}>تم التأكيد</span>
                </div>
              )}
              <button onClick={handleWhatsApp} style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#F0FDF4', color: '#059669', border: '1px solid #A7F3D0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                واتساب
              </button>
              {!['completed', 'cancelled', 'no_show'].includes(effectiveStatus) && (
                <button onClick={() => setShowCancelConfirm(true)} style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                  إلغاء
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
