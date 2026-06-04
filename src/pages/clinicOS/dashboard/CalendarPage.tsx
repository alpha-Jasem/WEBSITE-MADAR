import { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { motion } from 'framer-motion'
import { StatusBadge } from '../../../components/clinicOS/ui/StatusBadge'
import { AppointmentDrawer } from '../../../components/clinicOS/ui/AppointmentDrawer'
import { useClinicAppointments } from '../../../lib/clinicOSQueries'
import { useClinicOS } from '../../../context/ClinicOSContext'
import type { Appointment } from '../../../types/clinicOS'

const HOURS = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00']
const DAYS_AR = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']

function getWeekDates(baseDate: Date) {
  const day = baseDate.getDay()
  const start = new Date(baseDate)
  start.setDate(baseDate.getDate() - day)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i)
    return d
  })
}

export const CalendarPage = () => {
  const { companyId } = useClinicOS()
  const { data: allAppointments = [] } = useClinicAppointments(companyId)
  const [view, setView] = useState<'day'|'week'|'month'>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)
  const [doctorFilter, setDoctorFilter] = useState('')

  const weekDates = getWeekDates(currentDate)
  const today = new Date().toISOString().split('T')[0]

  const STATUS_COLORS: Record<string, string> = {
    confirmed: '#4F46E5', checked_in: '#0369A1', completed: '#7C3AED',
    pending: '#B45309', cancelled: '#DC2626', no_show: '#64748B', needs_review: '#C2410C',
  }

  const getApptForSlot = (dateStr: string, hour: string) => {
    return allAppointments.filter(a => {
      if (a.appointment_date !== dateStr) return false
      if (doctorFilter && a.doctor_id !== doctorFilter) return false
      return a.start_time >= hour && a.start_time < `${String(Number(hour.split(':')[0]) + 1).padStart(2,'0')}:00`
    })
  }

  const navigate = (dir: 1|-1) => {
    const d = new Date(currentDate)
    if (view === 'week') d.setDate(d.getDate() + dir * 7)
    else if (view === 'day') d.setDate(d.getDate() + dir)
    else d.setMonth(d.getMonth() + dir)
    setCurrentDate(d)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, direction: 'rtl', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 4px 0' }}>التقويم</h1>
          <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>جدول العيادة، توافر الأطباء، والحجوزات</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#059669', fontFamily: 'Cairo, sans-serif' }}>تقويم العيادة متزامن</span>
          </div>
          {['day','week','month'].map(v => (
            <button key={v} onClick={() => setView(v as any)} style={{ padding: '7px 14px', borderRadius: 7, border: 'none', background: view === v ? '#4F46E5' : '#F8FAFC', color: view === v ? 'white' : '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
              {v === 'day' ? 'يوم' : v === 'week' ? 'أسبوع' : 'شهر'}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ width: 32, height: 32, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronRight size={15} style={{ color: '#475569' }} />
        </button>
        <button onClick={() => setCurrentDate(new Date())} style={{ padding: '6px 14px', borderRadius: 8, background: '#EEF2FF', color: '#4F46E5', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>اليوم</button>
        <button onClick={() => navigate(1)} style={{ width: 32, height: 32, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={15} style={{ color: '#475569' }} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>
          {currentDate.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}
        </span>
      </div>

      {/* Week View */}
      {view === 'week' && (
        <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden', flex: 1 }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', borderBottom: '1px solid #E2E8F0' }}>
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
          {/* Time slots */}
          <div style={{ overflowY: 'auto', maxHeight: 520 }}>
            {HOURS.map(hour => (
              <div key={hour} style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', borderBottom: '1px solid #F8FAFC', minHeight: 60 }}>
                <div style={{ padding: '8px 8px', fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', borderLeft: '1px solid #F1F5F9', paddingTop: 4, textAlign: 'center' }}>{hour}</div>
                {weekDates.map(d => {
                  const ds = d.toISOString().split('T')[0]
                  const appts = getApptForSlot(ds, hour)
                  return (
                    <div key={ds} style={{ padding: '4px', borderLeft: '1px solid #F8FAFC', position: 'relative', minHeight: 60 }}>
                      {appts.map(a => (
                        <div key={a.id} onClick={() => setSelectedAppt(a)} style={{ padding: '4px 6px', borderRadius: 5, background: `${STATUS_COLORS[a.status]}18`, borderRight: `3px solid ${STATUS_COLORS[a.status]}`, marginBottom: 2, cursor: 'pointer' }}>
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

      {selectedAppt && <AppointmentDrawer appointment={selectedAppt} onClose={() => setSelectedAppt(null)} />}
    </div>
  )
}
