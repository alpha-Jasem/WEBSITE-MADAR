import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Search, List, CalendarDays, ChevronRight, ChevronLeft, CalendarX2, Trash2, X } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import {
  useBookings, useStaffMembers, useServices,
  createBooking, updateBookingStatus,
} from '@/lib/dashboardQueries'
import type { Booking, BookingStatus } from '@/types/dashboard'
import { bookingsLabel } from '@/dashboard/modules'
import { Card, Badge, Button, Dialog, Input, Select, type BadgeTone } from '@/dashboard/components/primitives'
import { EmptyState, SkeletonRows, Pagination, useToast, Avatar, SortableHeader, ContactActions, Skeleton } from '@/dashboard/components/uiExtras'
import { NightPage, PageHead, CardTitle, Seg, EmptyLine, Chip, useIsNarrow, fmtNum } from './shared/night'
import { AR_GREG, toISODate } from './shared/periods'

type SortKey = 'patient_name' | 'appointment_date' | 'start_time'
const PAGE_SIZE = 10

const STATUS_LABEL: Record<BookingStatus, string> = {
  confirmed: 'مؤكد', pending: 'قيد الانتظار', checked_in: 'تم الوصول', completed: 'مكتمل',
  cancelled: 'ملغى', no_show: 'لم يحضر', rescheduled: 'مؤجل', needs_review: 'يحتاج مراجعة',
}
const STATUS_TONE: Record<BookingStatus, BadgeTone> = {
  confirmed: 'success', pending: 'warning', checked_in: 'brand', completed: 'brand',
  cancelled: 'danger', no_show: 'danger', rescheduled: 'neutral', needs_review: 'warning',
}
const FILTERS: (BookingStatus | 'all')[] = ['all', 'confirmed', 'pending', 'completed', 'cancelled', 'no_show']
const SOURCE_LABELS: Record<string, string> = {
  ai_booking: 'حجز بالذكاء الاصطناعي', whatsapp: 'واتساب', website: 'الموقع الإلكتروني',
  reception: 'الاستقبال', manual: 'يدوي',
}
const WEEKDAY_SHORT = ['أح', 'إث', 'ثل', 'أر', 'خم', 'جم', 'سب']
const WEEKDAY_FULL = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

const BOOKINGS_CSS = `
.bk-weekbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.bk-weekbar h2 { margin: 0; font-size: 14px; font-weight: 700; font-family: var(--font-body); color: var(--text-secondary); flex: 1; min-width: 0; }
.bk-nav { width: 36px; height: 36px; border-radius: 11px; border: 1px solid var(--line); background: var(--panel); color: var(--muted); display: grid; place-items: center; cursor: pointer; padding: 0; }
.bk-nav:hover { color: var(--ink); border-color: var(--line-2); }
.bk-week { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px; }
.bk-day { border: 1px solid var(--line); background: var(--panel); border-radius: 14px; padding: 10px 4px; text-align: center; cursor: pointer; color: var(--text-primary); min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 1px; }
.bk-day:hover { border-color: var(--line-2); }
.bk-day[aria-pressed="true"] { border-color: var(--sky); background: var(--info-bg); }
.bk-day.is-today:not([aria-pressed="true"]) { border-color: color-mix(in srgb, var(--sky) 45%, transparent); }
.bk-day b { display: block; font-family: var(--font-display); font-size: 18px; line-height: 1.3; font-variant-numeric: tabular-nums; }
.bk-day small { color: var(--muted); font-size: 11.5px; white-space: nowrap; }
.bk-day .bk-count { color: var(--dim); font-variant-numeric: tabular-nums; }
.bk-day[aria-pressed="true"] .bk-count { color: var(--info); }
.bk-slot { display: grid; grid-template-columns: 64px minmax(0, 1fr) auto; gap: 14px; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--line); }
.bk-slot:last-child { border-bottom: 0; }
.bk-slot .bk-time { font-family: var(--font-display); font-weight: 600; color: var(--muted); font-variant-numeric: tabular-nums; }
.bk-slot .bk-who { min-width: 0; }
.bk-slot .bk-who b { display: block; color: var(--text-primary); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bk-slot .bk-who small { display: block; color: var(--muted); font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bk-slot .bk-acts { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.bk-cal-grid { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 16px; align-items: start; }
.bk-cal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.bk-cal-cells { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
.bk-cal-cell { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: var(--radius-md); cursor: pointer; font-size: 12px; border: 1px solid transparent; background: transparent; color: var(--text-primary); padding: 0; font-variant-numeric: tabular-nums; }
.bk-cal-cell:hover { background: var(--hover-bg); }
.bk-cal-cell.is-today { border-color: var(--sky); }
.bk-cal-cell[aria-pressed="true"] { background: var(--pri-bg); color: var(--pri-fg); border-color: transparent; }
.bk-cal-cell i { width: 4px; height: 4px; border-radius: 50%; margin-top: 2px; background: var(--sky); }
.bk-cal-cell[aria-pressed="true"] i { background: var(--pri-fg); }
.bk-filter-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; cursor: pointer; padding: 5px 10px; border-radius: 999px; background: var(--info-bg); color: var(--info); border: 0; }
@media (max-width: 900px) {
  .bk-cal-grid { grid-template-columns: minmax(0, 1fr); }
  .bk-nav { width: 40px; height: 40px; }
  .bk-day { padding: 8px 2px; }
}
@media (max-width: 520px) {
  .bk-day .bk-word { display: none; }
  .bk-day b { font-size: 16px; }
  .bk-slot { grid-template-columns: 52px minmax(0, 1fr); gap: 10px; }
  .bk-slot .bk-acts { grid-column: 2; justify-content: flex-start; }
}
`

function startOfWeek(d: Date) {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  s.setDate(s.getDate() - s.getDay())
  return s
}

function MiniCalendar({ month, appointmentsByDate, selectedDate, onSelectDate, onMonthChange }: {
  month: Date
  appointmentsByDate: Record<string, number>
  selectedDate: string | null
  onSelectDate: (d: string | null) => void
  onMonthChange: (d: Date) => void
}) {
  const year = month.getFullYear()
  const m = month.getMonth()
  const startOffset = new Date(year, m, 1).getDay()
  const daysInMonth = new Date(year, m + 1, 0).getDate()
  const cells: (string | null)[] = Array.from({ length: startOffset }, () => null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  const monthLabel = month.toLocaleDateString(AR_GREG, { month: 'long', year: 'numeric' })
  const today = toISODate(new Date())

  return (
    <Card>
      <div className="bk-cal-head">
        <button type="button" className="bk-nav" aria-label="الشهر السابق" onClick={() => onMonthChange(new Date(year, m - 1, 1))}><ChevronRight size={18} /></button>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{monthLabel}</div>
        <button type="button" className="bk-nav" aria-label="الشهر التالي" onClick={() => onMonthChange(new Date(year, m + 1, 1))}><ChevronLeft size={18} /></button>
      </div>
      <div className="bk-cal-cells" style={{ marginBottom: 6 }}>
        {WEEKDAY_SHORT.map((w) => (
          <div key={w} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>{w}</div>
        ))}
      </div>
      <div className="bk-cal-cells">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />
          const count = appointmentsByDate[date] || 0
          const isSelected = selectedDate === date
          return (
            <button
              key={date} type="button" aria-pressed={isSelected}
              aria-label={`${date}${count ? ` · ${count}` : ''}`}
              className={`bk-cal-cell${date === today ? ' is-today' : ''}`}
              onClick={() => onSelectDate(isSelected ? null : date)}
            >
              <span>{Number(date.split('-')[2])}</span>
              {count > 0 && <i />}
            </button>
          )
        })}
      </div>
    </Card>
  )
}

export function DashboardV2Bookings() {
  const { companyId, isDemo, businessType } = useWorkspace()
  const { data: appointments, loading, refetch } = useBookings(companyId, undefined, isDemo)
  const { data: doctors } = useStaffMembers(companyId, isDemo)
  const { data: services } = useServices(companyId, isDemo)
  const pushToast = useToast()
  const narrow = useIsNarrow()

  const label = bookingsLabel(businessType)
  const word = businessType === 'real_estate' ? 'موعد' : 'حجز'

  const todayISO = toISODate(new Date())
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [month, setMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [focusDay, setFocusDay] = useState(todayISO)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'appointment_date', dir: -1 })
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkCancelling, setBulkCancelling] = useState(false)
  const [form, setForm] = useState({
    patient_name: '', patient_phone: '', doctor_id: '', service_id: '',
    appointment_date: todayISO, start_time: '10:00',
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
      await Promise.all(ids.map((id) => updateBookingStatus(id, 'cancelled')))
      pushToast({ kind: 'success', title: `تم إلغاء ${ids.length} ${word}` })
      setSelected(new Set())
      refetch()
    } catch (e) {
      pushToast({ kind: 'danger', title: `تعذّر إلغاء بعض ${label}`, description: e instanceof Error ? e.message : undefined })
    } finally {
      setBulkCancelling(false)
    }
  }

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, number> = {}
    rows.forEach((r) => { map[r.appointment_date] = (map[r.appointment_date] || 0) + 1 })
    return map
  }, [rows])

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i)
    return { iso: toISODate(d), date: d }
  }), [weekStart])
  const weekLabel = `${weekDays[0].date.toLocaleDateString(AR_GREG, { day: 'numeric', month: 'short' })} – ${weekDays[6].date.toLocaleDateString(AR_GREG, { day: 'numeric', month: 'short', year: 'numeric' })}`

  const dayRows = useMemo(
    () => rows.filter((r) => r.appointment_date === focusDay).sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '')),
    [rows, focusDay],
  )
  const focusDate = new Date(`${focusDay}T00:00:00`)
  const focusTitle = `${focusDay === todayISO ? 'اليوم · ' : ''}${WEEKDAY_FULL[focusDate.getDay()]} ${focusDate.getDate()} ${focusDate.toLocaleDateString(AR_GREG, { month: 'long' })}`

  const todayRows = useMemo(() => rows.filter((r) => r.appointment_date === todayISO), [rows, todayISO])
  const todayPending = todayRows.filter((r) => r.status === 'pending' || r.status === 'needs_review').length

  function goToday() {
    setWeekStart(startOfWeek(new Date()))
    setFocusDay(todayISO)
  }
  function shiftWeek(delta: number) {
    const next = new Date(weekStart); next.setDate(next.getDate() + delta * 7)
    setWeekStart(next)
    const f = new Date(`${focusDay}T00:00:00`); f.setDate(f.getDate() + delta * 7)
    setFocusDay(toISODate(f))
  }

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
      await createBooking({
        company_id: companyId,
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
      setForm({ patient_name: '', patient_phone: '', doctor_id: '', service_id: '', appointment_date: toISODate(new Date()), start_time: '10:00' })
      pushToast({ kind: 'success', title: `تم إنشاء ال${word}`, description: form.patient_name })
      refetch()
    } catch (e) {
      pushToast({ kind: 'danger', title: `تعذّر إنشاء ال${word}`, description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  function cancelBooking(id: string) {
    const timeoutId = setTimeout(async () => {
      await updateBookingStatus(id, 'cancelled')
      refetch()
    }, 4500)
    pushToast({
      kind: 'info', title: `جارِ إلغاء ال${word}...`, duration: 4700,
      action: {
        label: 'تراجع',
        onClick: () => { clearTimeout(timeoutId); pushToast({ kind: 'success', title: 'تم التراجع عن الإلغاء' }) },
      },
    })
  }

  const canCancel = (b: Booking) => b.status !== 'cancelled' && b.status !== 'completed'
  const contactSize = narrow ? 40 : 28

  return (
    <NightPage>
      <style>{BOOKINGS_CSS}</style>
      <PageHead
        title={label}
        sub={loading ? 'جارِ التحميل…' : `${fmtNum(todayRows.length)} اليوم · ${fmtNum(todayPending)} بانتظار التأكيد`}
        actions={<Button onClick={() => setOpen(true)}><Plus size={15} /> {word} جديد</Button>}
      />

      {/* Week strip + the chosen day's list, as in the prototype */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="bk-weekbar">
          <h2 className="np-num">{weekLabel}</h2>
          <button type="button" className="bk-nav" aria-label="الأسبوع السابق" onClick={() => shiftWeek(-1)}><ChevronRight size={17} /></button>
          <Button variant="secondary" size="sm" onClick={goToday}>اليوم</Button>
          <button type="button" className="bk-nav" aria-label="الأسبوع التالي" onClick={() => shiftWeek(1)}><ChevronLeft size={17} /></button>
        </div>
        <div className="bk-week" role="group" aria-label="أيام الأسبوع">
          {weekDays.map(({ iso, date }) => {
            const count = appointmentsByDate[iso] || 0
            return (
              <button
                key={iso} type="button" aria-pressed={focusDay === iso}
                className={`bk-day${iso === todayISO ? ' is-today' : ''}`}
                onClick={() => setFocusDay(iso)}
                aria-label={`${WEEKDAY_FULL[date.getDay()]} ${date.getDate()} · ${count} ${word}`}
              >
                <small>{narrow ? WEEKDAY_SHORT[date.getDay()] : WEEKDAY_FULL[date.getDay()]}</small>
                <b>{date.getDate()}</b>
                <small className="bk-count">{count}<span className="bk-word"> {word}</span></small>
              </button>
            )
          })}
        </div>
      </div>

      <Card delay={0.04}>
        <CardTitle aside={`${fmtNum(dayRows.length)} ${word}`}>{focusTitle}</CardTitle>
        {loading && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bk-slot"><Skeleton width={44} height={14} /><Skeleton width="60%" height={14} /><Skeleton width={70} height={20} /></div>
        ))}
        {!loading && dayRows.length === 0 && <EmptyLine>ما فيه {label} بهذا اليوم</EmptyLine>}
        {!loading && dayRows.map((b) => (
          <div key={b.id} className="bk-slot">
            <span className="bk-time">{b.start_time?.slice(0, 5)}</span>
            <div className="bk-who">
              <b>{b.patient_name}</b>
              <small>{[b.service_name, b.doctor_name, SOURCE_LABELS[b.source] || b.source].filter(Boolean).join(' · ')}</small>
            </div>
            <div className="bk-acts">
              {b.source === 'ai_booking' && <Chip tone="ai">سجّله الوكيل الذكي</Chip>}
              <Badge tone={STATUS_TONE[b.status]}>{STATUS_LABEL[b.status]}</Badge>
              <ContactActions size={contactSize} phone={b.patient_phone} message={`مرحباً ${b.patient_name}، بخصوص موعدك بتاريخ ${b.appointment_date}.`} />
            </div>
          </div>
        ))}
      </Card>

      {/* Full list / calendar with filters, sorting, bulk cancel and pagination */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="np-head" style={{ alignItems: 'center' }}>
          <h2 className="np-h3" style={{ margin: 0, fontSize: 16 }}>كل {label} <span className="np-aside" style={{ marginInlineStart: 4 }}>{fmtNum(shown.length)} من {fmtNum(rows.length)}</span></h2>
          <Seg label="طريقة العرض" value={view} onChange={setView} options={[['list', <><List size={14} /> قائمة</>], ['calendar', <><CalendarDays size={14} /> تقويم</>]] as const} />
        </div>

        <div className="np-filters">
          <Input placeholder="بحث بالاسم أو الجوال" icon={<Search size={15} />} value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: narrow ? '100%' : 240 }} />
          {serviceFilterOptions.length > 1 && (
            <Select options={serviceFilterOptions} value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} style={{ width: narrow ? '100%' : 180 }} />
          )}
          {selectedDate && (
            <button type="button" className="bk-filter-pill" onClick={() => setSelectedDate(null)}>{selectedDate} <X size={12} /></button>
          )}
          {sourceFilter && (
            <button type="button" className="bk-filter-pill" onClick={() => setSourceFilter(null)}>المصدر: {SOURCE_LABELS[sourceFilter] || sourceFilter} <X size={12} /></button>
          )}
        </div>

        <Seg
          label="تصفية حسب الحالة" value={filter} onChange={setFilter}
          options={FILTERS.map((f) => [f, f === 'all' ? 'الكل' : STATUS_LABEL[f]] as const)}
        />

        {selected.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="np-bulk">
            <b>{selected.size} محدد</b>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button variant="secondary" size="sm" onClick={() => setSelected(new Set())}>إلغاء التحديد</Button>
              <Button variant="danger" size="sm" onClick={bulkCancel} disabled={bulkCancelling}>
                <Trash2 size={14} /> {bulkCancelling ? 'جارِ الإلغاء...' : 'إلغاء المحدد'}
              </Button>
            </div>
          </motion.div>
        )}

        <div className={view === 'calendar' ? 'bk-cal-grid' : undefined}>
          {view === 'calendar' && (
            <MiniCalendar month={month} appointmentsByDate={appointmentsByDate} selectedDate={selectedDate} onSelectDate={setSelectedDate} onMonthChange={setMonth} />
          )}

          <Card delay={0.08} style={{ padding: 0, minWidth: 0 }}>
            {loading && <SkeletonRows rows={6} columns={6} />}
            {!loading && shown.length > 0 && (
              <div className="np-table-wrap">
                <table className="np-table" style={{ minWidth: 720 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>
                        <label className="np-check"><input type="checkbox" aria-label="تحديد الكل" checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))} onChange={toggleSelectAllOnPage} /></label>
                      </th>
                      <th><SortableHeader label="العميل" active={sort.key === 'patient_name'} dir={sort.dir} onClick={() => toggleSort('patient_name')} /></th>
                      <th>الخدمة</th>
                      <th><SortableHeader label="التاريخ" active={sort.key === 'appointment_date'} dir={sort.dir} onClick={() => toggleSort('appointment_date')} /></th>
                      <th><SortableHeader label="الوقت" active={sort.key === 'start_time'} dir={sort.dir} onClick={() => toggleSort('start_time')} /></th>
                      <th>الحالة</th>
                      <th>تواصل</th>
                      <th aria-label="إجراءات" />
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((b) => (
                      <tr key={b.id} className={selected.has(b.id) ? 'is-selected' : undefined}>
                        <td><label className="np-check"><input type="checkbox" aria-label={`تحديد ${b.patient_name}`} checked={selected.has(b.id)} onChange={() => toggleSelect(b.id)} /></label></td>
                        <td className="strong">
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={b.patient_name} size={28} />{b.patient_name}</span>
                        </td>
                        <td>{b.service_name || '—'}</td>
                        <td className="np-num" style={{ whiteSpace: 'nowrap' }}>{b.appointment_date}</td>
                        <td className="np-num">{b.start_time?.slice(0, 5)}</td>
                        <td><Badge tone={STATUS_TONE[b.status]}>{STATUS_LABEL[b.status]}</Badge></td>
                        <td><ContactActions size={contactSize} phone={b.patient_phone} message={`مرحباً ${b.patient_name}، بخصوص موعدك بتاريخ ${b.appointment_date}.`} /></td>
                        <td>{canCancel(b) && <button type="button" className="np-link danger" onClick={() => cancelBooking(b.id)}>إلغاء</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && shown.length === 0 && (
              <EmptyState
                icon={<CalendarX2 size={20} />}
                title={`لا توجد ${label} مطابقة`}
                description={`جرّب تغيير الفلاتر أو أضف ${word}ًا جديدًا.`}
                action={<Button size="sm" onClick={() => setOpen(true)}><Plus size={14} /> {word} جديد</Button>}
              />
            )}

            {!loading && shown.length > 0 && (
              <Pagination page={page} pageCount={pageCount} onChange={setPage} />
            )}
          </Card>
        </div>
      </div>

      <Dialog
        open={open} title={`${word} جديد`} onClose={() => setOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>إلغاء</Button><Button onClick={addBooking} disabled={saving}>{saving ? 'جارِ الحفظ...' : `حفظ ال${word}`}</Button></>}
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
          <div className="np-form-grid">
            <Input label="التاريخ" type="date" value={form.appointment_date} onChange={(e) => setForm((f) => ({ ...f, appointment_date: e.target.value }))} />
            <Input label="الوقت" type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} />
          </div>
        </div>
      </Dialog>
    </NightPage>
  )
}
