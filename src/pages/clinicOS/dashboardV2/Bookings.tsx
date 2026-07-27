import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useClinicOS } from '../../../context/ClinicOSContext'
import {
  useClinicAppointments, useClinicDoctors, useClinicServices,
  createAppointment, updateAppointmentStatus,
} from '../../../lib/clinicOSQueries'
import type { AppointmentStatus } from '../../../types/clinicOS'
import { Card, Badge, Button, Dialog, Input, Select, Toast, type BadgeTone } from '../../../components/clinicOS/v2/primitives'

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  confirmed: 'مؤكد', pending: 'قيد الانتظار', checked_in: 'تم الوصول', completed: 'مكتمل',
  cancelled: 'ملغى', no_show: 'لم يحضر', rescheduled: 'مؤجل', needs_review: 'يحتاج مراجعة',
}
const STATUS_TONE: Record<AppointmentStatus, BadgeTone> = {
  confirmed: 'success', pending: 'warning', checked_in: 'brand', completed: 'brand',
  cancelled: 'danger', no_show: 'danger', rescheduled: 'neutral', needs_review: 'warning',
}
const FILTERS: (AppointmentStatus | 'all')[] = ['all', 'confirmed', 'pending', 'completed', 'cancelled', 'no_show']

export function DashboardV2Bookings() {
  const { companyId, isDemo } = useClinicOS()
  const { data: appointments, refetch } = useClinicAppointments(companyId, undefined, isDemo)
  const { data: doctors } = useClinicDoctors(companyId, isDemo)
  const { data: services } = useClinicServices(companyId, isDemo)

  const [filter, setFilter] = useState<AppointmentStatus | 'all'>('all')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ title: string; description?: string } | null>(null)
  const [form, setForm] = useState({
    patient_name: '', patient_phone: '', doctor_id: '', service_id: '',
    appointment_date: new Date().toISOString().split('T')[0], start_time: '10:00',
  })

  const rows = appointments || []
  const shown = filter === 'all' ? rows : rows.filter((r) => r.status === filter)

  const doctorOptions = useMemo(() => (doctors || []).map((d) => ({ value: d.id, label: d.name })), [doctors])
  const serviceOptions = useMemo(() => (services || []).map((s) => ({ value: s.id, label: s.name })), [services])

  async function addBooking() {
    if (!form.patient_name.trim() || !companyId) return
    const doctor = (doctors || []).find((d) => d.id === form.doctor_id)
    const service = (services || []).find((s) => s.id === form.service_id)
    setSaving(true)
    try {
      const duration = service?.duration_minutes ?? 30
      const [h, m] = form.start_time.split(':').map(Number)
      const endDate = new Date(0, 0, 0, h, m + duration)
      const end_time = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`
      await createAppointment({
        clinic_id: companyId,
        patient_name: form.patient_name,
        patient_phone: form.patient_phone,
        doctor_id: form.doctor_id || undefined,
        doctor_name: doctor?.name || '',
        service_id: form.service_id || undefined,
        service_name: service?.name || '',
        appointment_date: form.appointment_date,
        start_time: form.start_time,
        end_time,
        duration_minutes: duration,
        status: 'pending',
        source: 'manual',
        confirmation_status: 'pending',
        message_status: 'pending',
        calendar_sync_status: 'pending',
      })
      setOpen(false)
      setForm({ patient_name: '', patient_phone: '', doctor_id: '', service_id: '', appointment_date: new Date().toISOString().split('T')[0], start_time: '10:00' })
      setToast({ title: 'تم إنشاء الحجز', description: form.patient_name })
      refetch()
    } catch (e) {
      setToast({ title: 'تعذّر إنشاء الحجز', description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(false)
      setTimeout(() => setToast(null), 3000)
    }
  }

  async function cancelBooking(id: string) {
    await updateAppointmentStatus(id, 'cancelled')
    refetch()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>الحجوزات</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{rows.length} حجز إجمالي</div>
        </div>
        <Button onClick={() => setOpen(true)}><Plus size={15} /> حجز جديد</Button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <div key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            background: filter === f ? 'var(--brand-500)' : '#fff', color: filter === f ? '#fff' : 'var(--text-secondary)',
            border: '1px solid ' + (filter === f ? 'var(--brand-500)' : 'var(--border-default)'),
          }}>
            {f === 'all' ? 'الكل' : STATUS_LABEL[f]}
          </div>
        ))}
      </div>

      <Card style={{ padding: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.4fr 1fr 1fr 0.8fr 0.6fr', padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-default)' }}>
          <div>المريض</div><div>الخدمة</div><div>التاريخ</div><div>الوقت</div><div>الحالة</div><div></div>
        </div>
        {shown.map((b) => (
          <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.4fr 1fr 1fr 0.8fr 0.6fr', padding: '14px 20px', fontSize: 14, alignItems: 'center', borderBottom: '1px solid var(--border-default)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.patient_name}</div>
            <div style={{ color: 'var(--text-secondary)' }}>{b.service_name}</div>
            <div style={{ color: 'var(--text-secondary)' }}>{b.appointment_date}</div>
            <div style={{ color: 'var(--text-secondary)' }}>{b.start_time}</div>
            <div><Badge tone={STATUS_TONE[b.status]}>{STATUS_LABEL[b.status]}</Badge></div>
            <div>
              {b.status !== 'cancelled' && b.status !== 'completed' && (
                <span onClick={() => cancelBooking(b.id)} style={{ color: 'var(--danger-500)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>إلغاء</span>
              )}
            </div>
          </div>
        ))}
        {shown.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>لا توجد حجوزات مطابقة</div>}
      </Card>

      <Dialog
        open={open} title="حجز جديد" onClose={() => setOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>إلغاء</Button><Button onClick={addBooking} disabled={saving}>{saving ? 'جارِ الحفظ...' : 'حفظ الحجز'}</Button></>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="اسم العميل" placeholder="مثال: سارة أحمد" value={form.patient_name} onChange={(e) => setForm((f) => ({ ...f, patient_name: e.target.value }))} />
          <Input label="رقم الجوال" placeholder="05xxxxxxxx" value={form.patient_phone} onChange={(e) => setForm((f) => ({ ...f, patient_phone: e.target.value }))} />
          {serviceOptions.length > 0 && (
            <Select label="الخدمة" options={serviceOptions} value={form.service_id} onChange={(e) => setForm((f) => ({ ...f, service_id: e.target.value }))} />
          )}
          {doctorOptions.length > 0 && (
            <Select label="الموظف المسؤول" options={doctorOptions} value={form.doctor_id} onChange={(e) => setForm((f) => ({ ...f, doctor_id: e.target.value }))} />
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <Input label="التاريخ" type="date" value={form.appointment_date} onChange={(e) => setForm((f) => ({ ...f, appointment_date: e.target.value }))} style={{ flex: 1 }} />
            <Input label="الوقت" type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} style={{ flex: 1 }} />
          </div>
        </div>
      </Dialog>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, insetInlineStart: 24, zIndex: 100 }}>
          <Toast tone="success" title={toast.title} description={toast.description} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  )
}
