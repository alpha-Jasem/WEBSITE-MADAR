import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { StatusBadge } from '../../../components/clinicOS/ui/StatusBadge'
import { AppointmentDrawer } from '../../../components/clinicOS/ui/AppointmentDrawer'
import { useClinicAppointments } from '../../../lib/clinicOSQueries'
import { useClinicOS } from '../../../context/ClinicOSContext'
import type { Appointment } from '../../../types/clinicOS'

const HOURS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00']
const DAYS_AR = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

const STATUS_COLORS: Record<string, string> = {
  confirmed: '#4F46E5', checked_in: '#0369A1', completed: '#7C3AED',
  pending: '#B45309', cancelled: '#DC2626', no_show: '#64748B', needs_review: '#C2410C',
}

function getWeekDates(baseDate: Date) {
  const day = baseDate.getDay() // 0=Sun,6=Sat
  // Week starts Saturday (day 6) for Saudi Arabia
  const daysFromSat = (day + 1) % 7 // Sat=0, Sun=1, ..., Fri=6
  const start = new Date(baseDate)
  start.setDate(baseDate.getDate() - daysFromSat)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i)
    return d
  })
}

function getMonthDates(baseDate: Date) {
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const cells: { date: Date; isCurrentMonth: boolean }[] = []

  // Prev month fill
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), isCurrentMonth: false })
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), isCurrentMonth: true })
  }
  // Next month fill
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    cells.push({ date: new Date(year, month + 1, d), isCurrentMonth: false })
  }
  return cells
}

export const CalendarPage = () => {
  const { companyId, isDemo } = useClinicOS()
  const { data: allAppointments = [] } = useClinicAppointments(companyId, undefined, isDemo)
  const [view, setView] = useState<'day' | 'week' | 'month'>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)

  const weekDates = getWeekDates(currentDate)
  const monthCells = getMonthDates(currentDate)
  const today = new Date().toISOString().split('T')[0]
  const currentDateStr = currentDate.toISOString().split('T')[0]

  const getApptForSlot = (dateStr: string, hour: string) =>
    allAppointments.filter(a => {
      if (a.appointment_date !== dateStr) return false
      return a.start_time >= hour && a.start_time < `${String(Number(hour.split(':')[0]) + 1).padStart(2, '0')}:00`
    })

  const getApptForDay = (dateStr: string) =>
    allAppointments.filter(a => a.appointment_date === dateStr)

  const navigate = (dir: 1 | -1) => {
    const d = new Date(currentDate)
    if (view === 'week') d.setDate(d.getDate() + dir * 7)
    else if (view === 'day') d.setDate(d.getDate() + dir)
    else d.setMonth(d.getMonth() + dir)
    setCurrentDate(d)
  }

  const headerTitle = () => {
    if (view === 'month') return `${MONTHS_AR[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    if (view === 'week') {
      const start = weekDates[0]
      const end = weekDates[6]
      return `${start.getDate()} — ${end.getDate()} ${MONTHS_AR[end.getMonth()]} ${end.getFullYear()}`
    }
    return currentDate.toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, direction: 'rtl', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 4px 0' }}>التقويم</h1>
          <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>جدول العيادة، توافر الأطباء، والحجوزات</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#059669', fontFamily: 'Cairo, sans-serif' }}>تقويم العيادة متزامن</span>
          </div>
          {(['day', 'week', 'month'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: '7px 14px', borderRadius: 7, border: 'none', background: view === v ? '#4F46E5' : '#F8FAFC', color: view === v ? 'white' : '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
              {v === 'day' ? 'يوم' : v === 'week' ? 'أسبوع' : 'شهر'}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)}
          style={{ width: 32, height: 32, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronRight size={15} style={{ color: '#475569' }} />
        </button>
        <button onClick={() => setCurrentDate(new Date())}
          style={{ padding: '6px 14px', borderRadius: 8, background: '#EEF2FF', color: '#4F46E5', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
          اليوم
        </button>
        <button onClick={() => navigate(1)}
          style={{ width: 32, height: 32, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={15} style={{ color: '#475569' }} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{headerTitle()}</span>
      </div>

      {/* ── WEEK VIEW ── */}
      {view === 'week' && (
        <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'auto', flex: 1 }}>
          <div className="cos-calendar-week" style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, minmax(80px, 1fr))', borderBottom: '1px solid #E2E8F0', minWidth: 640 }}>
            <div style={{ padding: '12px 8px', borderLeft: '1px solid #E2E8F0' }} />
            {weekDates.map(d => {
              const ds = d.toISOString().split('T')[0]
              const isToday = ds === today
              return (
                <div key={ds} style={{ padding: '12px 8px', textAlign: 'center', borderLeft: '1px solid #F1F5F9' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>{DAYS_AR[d.getDay()]}</div>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: isToday ? '#4F46E5' : 'transparent', color: isToday ? 'white' : '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px auto 0', fontSize: 13, fontWeight: isToday ? 800 : 500, fontFamily: 'Cairo, sans-serif' }}>
                    {d.getDate()}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 520 }}>
            {HOURS.map(hour => (
              <div key={hour} className="cos-calendar-week" style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, minmax(80px, 1fr))', borderBottom: '1px solid #F8FAFC', minHeight: 60, minWidth: 640 }}>
                <div style={{ padding: '8px', fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', borderLeft: '1px solid #F1F5F9', textAlign: 'center', paddingTop: 4 }}>{hour}</div>
                {weekDates.map(d => {
                  const ds = d.toISOString().split('T')[0]
                  const appts = getApptForSlot(ds, hour)
                  return (
                    <div key={ds} style={{ padding: '4px', borderLeft: '1px solid #F8FAFC', position: 'relative', minHeight: 60 }}>
                      {appts.map(a => (
                        <div key={a.id} onClick={() => setSelectedAppt(a)}
                          style={{ padding: '4px 6px', borderRadius: 5, background: `${STATUS_COLORS[a.status]}18`, borderRight: `3px solid ${STATUS_COLORS[a.status]}`, marginBottom: 2, cursor: 'pointer' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLORS[a.status], fontFamily: 'Cairo, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.patient_name}</div>
                          <div style={{ fontSize: 9, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>{a.service_name}</div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DAY VIEW ── */}
      {view === 'day' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden', flex: 1 }}>
          {/* Day header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: currentDateStr === today ? '#4F46E5' : '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: currentDateStr === today ? 'white' : '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{currentDate.getDate()}</span>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{DAYS_AR[currentDate.getDay()]}</div>
              <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>{getApptForDay(currentDateStr).length} موعد</div>
            </div>
          </div>
          {/* Time slots */}
          <div style={{ overflowY: 'auto', maxHeight: 560 }}>
            {HOURS.map(hour => {
              const appts = getApptForSlot(currentDateStr, hour)
              return (
                <div key={hour} style={{ display: 'flex', borderBottom: '1px solid #F8FAFC', minHeight: 64 }}>
                  <div style={{ width: 64, flexShrink: 0, padding: '10px 12px', fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', textAlign: 'center', borderLeft: '1px solid #F1F5F9' }}>{hour}</div>
                  <div style={{ flex: 1, padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {appts.map(a => (
                      <motion.div key={a.id} whileHover={{ scale: 1.01 }} onClick={() => setSelectedAppt(a)}
                        style={{ padding: '10px 14px', borderRadius: 8, background: `${STATUS_COLORS[a.status]}12`, border: `1px solid ${STATUS_COLORS[a.status]}40`, borderRight: `4px solid ${STATUS_COLORS[a.status]}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{a.patient_name}</div>
                          <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>{a.service_name} · {a.doctor_name} · {a.start_time}—{a.end_time}</div>
                        </div>
                        <div style={{ marginRight: 'auto' }}>
                          <StatusBadge status={a.status} size="sm" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* ── MONTH VIEW ── */}
      {view === 'month' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden', flex: 1 }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #E2E8F0' }}>
            {DAYS_AR.map(d => (
              <div key={d} style={{ padding: '10px 8px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#64748B', fontFamily: 'Cairo, sans-serif' }}>{d}</div>
            ))}
          </div>
          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1 }}>
            {monthCells.map((cell, i) => {
              const ds = cell.date.toISOString().split('T')[0]
              const dayAppts = getApptForDay(ds)
              const isToday = ds === today
              const isSelected = ds === currentDateStr
              return (
                <div key={i} onClick={() => { setCurrentDate(new Date(cell.date)); setView('day') }}
                  style={{ minHeight: 80, padding: '8px', border: '1px solid #F1F5F9', cursor: 'pointer', background: isSelected ? '#EEF2FF' : 'transparent', transition: 'background 0.1s' }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = '#FAFAFA' }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: isToday ? '#4F46E5' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, color: isToday ? 'white' : cell.isCurrentMonth ? '#0F172A' : '#CBD5E1', fontFamily: 'Cairo, sans-serif' }}>
                      {cell.date.getDate()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dayAppts.slice(0, 2).map(a => (
                      <div key={a.id}
                        style={{ fontSize: 9, padding: '2px 5px', borderRadius: 3, background: `${STATUS_COLORS[a.status]}20`, color: STATUS_COLORS[a.status], fontWeight: 700, fontFamily: 'Cairo, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.patient_name}
                      </div>
                    ))}
                    {dayAppts.length > 2 && (
                      <div style={{ fontSize: 9, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>+{dayAppts.length - 2} أخرى</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {selectedAppt && <AppointmentDrawer appointment={selectedAppt} onClose={() => setSelectedAppt(null)} />}
    </div>
  )
}
