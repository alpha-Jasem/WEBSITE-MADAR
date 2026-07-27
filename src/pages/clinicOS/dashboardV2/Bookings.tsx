import { useMemo, useState } from 'react'
import { Plus, Search, List, CalendarDays, ChevronRight, ChevronLeft } from 'lucide-react'
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
const WEEKDAY_LABELS = ['أح', 'إث', 'ثل', 'أر', 'خم', 'جم', 'سب']

function MiniCalendar({ month, appointmentsByDate, selectedDate, onSelectDate, onMonthChange }: {
  month: Date
  appointmentsByDate: Record<string, number>
  selectedDate: string | null
  onSelectDate: (d: string | null) => void
  onMonthChange: (d: Date) => void
}) {
  const year = month.getFullYear()
  const m = month.getMonth()
  const firstDay = new Date(year, m, 1)
  const startOffset = firstDay.getDay()
  const daysInMonth = new Date(year, m + 1, 0).getDate()
  const cells: (string | null)[] = Array.from({ length: startOffset }, () => null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  const monthLabel = month.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })
  const today = new Date().toISOString().split('T')[0]

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span onClick={() => onMonthChange(new Date(year, m - 1, 1))} style={{ cursor: 'pointer', color: 'var(--text-tertiary)' }}><ChevronRight size={18} /></span>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{monthLabel}</div>
        <span onClick={() => onMonthChange(new Date(year, m + 1, 1))} style={{ cursor: 'pointer', color: 'var(--text-tertiary)' }}><ChevronLeft size={18} /></span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>{w}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((date, i) => {
          if (!date) return <div key={i} />
          const count = appointmentsByDate[date] || 0
          const isSelected = selectedDate === date
          const isToday = date === today
          return (
            <div
              key={date}
              onClick={() => onSelectDate(isSelected ? null : date)}
              style={{
                aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 12, position: 'relative',
                background: isSelected ? 'var(--brand-500)' : isToday ? 'var(--brand-50)' : 'transparent',
                color: isSelected ? '#fff' : 'var(--text-primary)',
                border: isToday && !isSelected ? '1px solid var(--brand-300)' : '1px solid transparent',
              }}
            >
              <span>{Number(date.split('-')[2])}</span>
              {count > 0 && (
                <span style={{
                  width: 4, height: 4, borderRadius: '50%', marginTop: 2,
                  background: isSelected ? '#fff' : 'var(--brand-500)',
                }} />
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export function DashboardV2Bookings() {
  const { companyId, isDemo } = useClinicOS()
  const { data: appointments, refetch } = useClinicAppointments(companyId, undefined, isDemo)
  const { data: doctors } = useClinicDoctors(companyId, isDemo)
  const { data: services } = useClinicServices(companyId, isDemo)

  const [filter, setFilter] = useState<AppointmentStatus | 'all'>('all')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [month, setMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ title: string; description?: string } | null>(null)
  const [form, setForm] = useState({
    patient_name: '', patient_phone: '', doctor_id: '', service_id: '',
    appointment_date: new Date().toISOString().split('T')[0], start_time: '10:00',
  })

  const rows = appointments || []

  const shown = useMemo(() => rows.filter((r) => {
    if (filter !== 'all' && r.status !== filter) return false
    if (serviceFilter !== 'all' && r.service_id !== serviceFilter) return false
    if (selectedDate && r.appointment_date !== selectedDate) return false
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      if (!r.patient_name?.toLowerCase().includes(q) && !r.patient_phone?.includes(q)) return false
    }
    return true
  }), [rows, filter, serviceFilter, selectedDate, query])

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, number> = {}
    rows.forEach((r) => { map[r.appointment_date] = (map[r.appointment_date] || 0) + 1 })
    return map
  }, [rows])

  const doctorOptions = useMemo(() => (doctors || []).map((d) => ({ value: d.id, label: d.name })), [doctors])
  const serviceOptions = useMemo(() => (services || []).map((s) => ({ value: s.id, label: s.name })), [services])
  const serviceFilterOptions = useMemo(() => [{ value: 'all', label: 'كل الخدمات' }, ...serviceOptions], [serviceOptions])

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>الحجوزات</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{shown.length} من {rows.length} حجز</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <span onClick={() => setView('list')} style={{ padding: '8px 12px', cursor: 'pointer', background: view === 'list' ? 'var(--brand-500)' : '#fff', color: view === 'list' ? '#fff' : 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}><List size={15} /></span>
            <span onClick={() => setView('calendar')} style={{ padding: '8px 12px', cursor: 'pointer', background: view === 'calendar' ? 'var(--brand-500)' : '#fff', color: view === 'calendar' ? '#fff' : 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}><CalendarDays size={15} /></span>
          </div>
          <Button onClick={() => setOpen(true)}><Plus size={15} /> حجز جديد</Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Input placeholder="بحث بالاسم أو الجوال" icon={<Search size={15} />} value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: 240 }} />
        {serviceFilterOptions.length > 1 && (
          <Select options={serviceFilterOptions} value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} style={{ width: 180 }} />
        )}
        {selectedDate && (
          <div onClick={() => setSelectedDate(null)} style={{ fontSize: 12, color: 'var(--brand-600)', cursor: 'pointer', fontWeight: 600 }}>
            {selectedDate} × إزالة
          </div>
        )}
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

      <div className={view === 'calendar' ? 'dv2-responsive-grid' : undefined} style={{ display: 'grid', gridTemplateColumns: view === 'calendar' ? '300px 1fr' : '1fr', gap: 16 }}>
        {view === 'calendar' && (
          <MiniCalendar month={month} appointmentsByDate={appointmentsByDate} selectedDate={selectedDate} onSelectDate={setSelectedDate} onMonthChange={setMonth} />
        )}

        <Card style={{ padding: 0, overflowX: 'auto' }}>
          <div style={{ minWidth: 600 }}>
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
          </div>
        </Card>
      </div>

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
