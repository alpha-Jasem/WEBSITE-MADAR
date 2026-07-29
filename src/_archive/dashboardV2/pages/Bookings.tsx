import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Search, List, CalendarDays, ChevronRight, ChevronLeft, CalendarX2, Trash2 } from 'lucide-react'
import { useClinicOS } from '@/context/ClinicOSContext'
import {
  useClinicAppointments, useClinicDoctors, useClinicServices,
  createAppointment, updateAppointmentStatus,
} from '@/lib/clinicOSQueries'
import type { AppointmentStatus } from '@/types/clinicOS'
import { Card, Badge, Button, Dialog, Input, Select, type BadgeTone } from '@/_archive/dashboardV2/components/primitives'
import { EmptyState, SkeletonRows, Pagination, useToast, Avatar, SortableHeader } from '@/_archive/dashboardV2/components/uiExtras'

type SortKey = 'patient_name' | 'appointment_date' | 'start_time'
const PAGE_SIZE = 10

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  confirmed: 'مؤكد', pending: 'قيد الانتظار', checked_in: 'تم الوصول', completed: 'مكتمل',
  cancelled: 'ملغى', no_show: 'لم يحضر', rescheduled: 'مؤجل', needs_review: 'يحتاج مراجعة',
}
const STATUS_TONE: Record<AppointmentStatus, BadgeTone> = {
  confirmed: 'success', pending: 'warning', checked_in: 'brand', completed: 'brand',
  cancelled: 'danger', no_show: 'danger', rescheduled: 'neutral', needs_review: 'warning',
}
const FILTERS: (AppointmentStatus | 'all')[] = ['all', 'confirmed', 'pending', 'completed', 'cancelled', 'no_show']
const SOURCE_LABELS: Record<string, string> = {
  ai_booking: 'حجز بالذكاء الاصطناعي', whatsapp: 'واتساب', website: 'الموقع الإلكتروني',
  reception: 'الاستقبال', manual: 'يدوي',
}
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
  const { data: appointments, loading, refetch } = useClinicAppointments(companyId, undefined, isDemo)
  const { data: doctors } = useClinicDoctors(companyId, isDemo)
  const { data: services } = useClinicServices(companyId, isDemo)
  const pushToast = useToast()

  const [filter, setFilter] = useState<AppointmentStatus | 'all'>('all')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [month, setMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'appointment_date', dir: -1 })
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkCancelling, setBulkCancelling] = useState(false)
  const [form, setForm] = useState({
    patient_name: '', patient_phone: '', doctor_id: '', service_id: '',
    appointment_date: new Date().toISOString().split('T')[0], start_time: '10:00',
  })

  const rows = appointments || []

  const filtered = useMemo(() => rows.filter((r) => {
    if (filter !== 'all' && r.status !== filter) return false
    if (serviceFilter !== 'all' && r.service_id !== serviceFilter) return false
    if (sourceFilter && r.source !== sourceFilter) return false
    if (selectedDate && r.appointment_date !== selectedDate) return false
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      if (!r.patient_name?.toLowerCase().includes(q) && !r.patient_phone?.includes(q)) return false
    }
    return true
  }), [rows, filter, serviceFilter, sourceFilter, selectedDate, query])

  const shown = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      const av = a[sort.key] ?? ''
      const bv = b[sort.key] ?? ''
      return av < bv ? -sort.dir : av > bv ? sort.dir : 0
    })
    return copy
  }, [filtered, sort])

  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const pageRows = useMemo(() => shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [shown, page])

  useEffect(() => { setPage(1) }, [filter, serviceFilter, sourceFilter, selectedDate, query, sort])

  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setOpen(true)
      searchParams.delete('new')
      setSearchParams(searchParams, { replace: true })
    }
    const src = searchParams.get('source')
    if (src) setSourceFilter(src)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }))
  }

  function toggleSelect(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAllOnPage() {
    setSelected((s) => {
      const allSelected = pageRows.every((r) => s.has(r.id))
      const next = new Set(s)
      pageRows.forEach((r) => (allSelected ? next.delete(r.id) : next.add(r.id)))
      return next
    })
  }

  async function bulkCancel() {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    setBulkCancelling(true)
    try {
      await Promise.all(ids.map((id) => updateAppointmentStatus(id, 'cancelled')))
      pushToast({ kind: 'success', title: `تم إلغاء ${ids.length} حجز` })
      setSelected(new Set())
      refetch()
    } catch (e) {
      pushToast({ kind: 'danger', title: 'تعذّر إلغاء بعض الحجوزات', description: e instanceof Error ? e.message : undefined })
    } finally {
      setBulkCancelling(false)
    }
  }

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
      pushToast({ kind: 'success', title: 'تم إنشاء الحجز', description: form.patient_name })
      refetch()
    } catch (e) {
      pushToast({ kind: 'danger', title: 'تعذّر إنشاء الحجز', description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  function cancelBooking(id: string) {
    const timeoutId = setTimeout(async () => {
      await updateAppointmentStatus(id, 'cancelled')
      refetch()
    }, 4500)
    pushToast({
      kind: 'info', title: 'جارِ إلغاء الحجز...', duration: 4700,
      action: {
        label: 'تراجع',
        onClick: () => { clearTimeout(timeoutId); pushToast({ kind: 'success', title: 'تم التراجع عن الإلغاء' }) },
      },
    })
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
        {sourceFilter && (
          <div
            onClick={() => setSourceFilter(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              padding: '5px 10px', borderRadius: 'var(--radius-full)', background: 'var(--brand-50)', color: 'var(--brand-700)',
            }}
          >
            المصدر: {SOURCE_LABELS[sourceFilter] || sourceFilter} ×
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

      {selected.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14,
            padding: '10px 16px', background: 'var(--brand-50)', border: '1px solid var(--brand-200, #B3EDFF)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-700)' }}>{selected.size} محدد</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => setSelected(new Set())}>إلغاء التحديد</Button>
            <Button variant="danger" size="sm" onClick={bulkCancel} disabled={bulkCancelling}>
              <Trash2 size={14} /> {bulkCancelling ? 'جارِ الإلغاء...' : 'إلغاء المحدد'}
            </Button>
          </div>
        </motion.div>
      )}

      <div className={view === 'calendar' ? 'dv2-responsive-grid' : undefined} style={{ display: 'grid', gridTemplateColumns: view === 'calendar' ? '300px 1fr' : '1fr', gap: 16 }}>
        {view === 'calendar' && (
          <MiniCalendar month={month} appointmentsByDate={appointmentsByDate} selectedDate={selectedDate} onSelectDate={setSelectedDate} onMonthChange={setMonth} />
        )}

        <Card style={{ padding: 0, overflowX: 'auto' }}>
          <div style={{ minWidth: 640 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '32px 1.4fr 1.4fr 1fr 1fr 0.8fr 0.6fr', padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-default)', alignItems: 'center' }}>
              <input type="checkbox" checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))} onChange={toggleSelectAllOnPage} style={{ cursor: 'pointer' }} />
              <SortableHeader label="المريض" active={sort.key === 'patient_name'} dir={sort.dir} onClick={() => toggleSort('patient_name')} />
              <div>الخدمة</div>
              <SortableHeader label="التاريخ" active={sort.key === 'appointment_date'} dir={sort.dir} onClick={() => toggleSort('appointment_date')} />
              <SortableHeader label="الوقت" active={sort.key === 'start_time'} dir={sort.dir} onClick={() => toggleSort('start_time')} />
              <div>الحالة</div><div></div>
            </div>

            {loading && <SkeletonRows rows={6} columns={6} />}

            {!loading && pageRows.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ backgroundColor: 'var(--surface-sunken)' }}
                transition={{ duration: 0.18, delay: Math.min(i, 8) * 0.02 }}
                style={{
                  display: 'grid', gridTemplateColumns: '32px 1.4fr 1.4fr 1fr 1fr 0.8fr 0.6fr', padding: '14px 20px', fontSize: 14,
                  alignItems: 'center', borderBottom: '1px solid var(--border-default)', position: 'relative',
                  background: selected.has(b.id) ? 'var(--surface-sunken)' : 'transparent',
                }}
              >
                {selected.has(b.id) && (
                  <motion.div
                    layoutId={`bk-accent-${b.id}`}
                    style={{ position: 'absolute', insetInlineStart: 0, top: 6, bottom: 6, width: 3, borderRadius: 'var(--radius-full)', background: 'var(--brand-500)' }}
                  />
                )}
                <input type="checkbox" checked={selected.has(b.id)} onChange={() => toggleSelect(b.id)} style={{ cursor: 'pointer' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--text-primary)' }}>
                  <Avatar name={b.patient_name} size={26} />
                  {b.patient_name}
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>{b.service_name}</div>
                <div style={{ color: 'var(--text-secondary)' }}>{b.appointment_date}</div>
                <div style={{ color: 'var(--text-secondary)' }}>{b.start_time}</div>
                <div><Badge tone={STATUS_TONE[b.status]}>{STATUS_LABEL[b.status]}</Badge></div>
                <div>
                  {b.status !== 'cancelled' && b.status !== 'completed' && (
                    <span onClick={() => cancelBooking(b.id)} style={{ color: 'var(--danger-500)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>إلغاء</span>
                  )}
                </div>
              </motion.div>
            ))}

            {!loading && shown.length === 0 && (
              <EmptyState
                icon={<CalendarX2 size={20} />}
                title="لا توجد حجوزات مطابقة"
                description="جرّب تغيير الفلاتر أو أضف حجزًا جديدًا."
                action={<Button size="sm" onClick={() => setOpen(true)}><Plus size={14} /> حجز جديد</Button>}
              />
            )}

            {!loading && shown.length > 0 && (
              <Pagination page={page} pageCount={pageCount} onChange={setPage} />
            )}
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
    </div>
  )
}
