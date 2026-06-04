import { useState, useMemo } from 'react'
import { Calendar, CheckCircle, Clock, X, AlertCircle, Download, Plus, Search, Filter } from 'lucide-react'
import { motion } from 'framer-motion'
import { StatCard } from '../../../components/clinicOS/ui/StatCard'
import { StatusBadge, SourceBadge } from '../../../components/clinicOS/ui/StatusBadge'
import { AppointmentDrawer } from '../../../components/clinicOS/ui/AppointmentDrawer'
import { EmptyState } from '../../../components/clinicOS/ui/EmptyState'
import { NewAppointmentModal } from '../../../components/clinicOS/ui/NewAppointmentModal'
import { DEMO_APPOINTMENTS, DEMO_DOCTORS, DEMO_WAITLIST } from '../../../lib/clinicOSDemoData'
import type { Appointment } from '../../../types/clinicOS'

const TODAY = new Date().toISOString().split('T')[0]

const TABS = ['قائمة', 'تقويم', 'حسب الطبيب', 'تحتاج مراجعة', 'قائمة الانتظار']

export const Appointments = () => {
  const [activeTab, setActiveTab] = useState(0)
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)
  const [showNewAppt, setShowNewAppt] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('today')
  const [appointments, setAppointments] = useState<Appointment[]>(DEMO_APPOINTMENTS)

  const getDateRange = () => {
    const today = new Date()
    if (dateFilter === 'today') return [TODAY, TODAY]
    if (dateFilter === 'tomorrow') {
      const t = new Date(today); t.setDate(t.getDate() + 1)
      const d = t.toISOString().split('T')[0]
      return [d, d]
    }
    if (dateFilter === 'week') {
      const end = new Date(today); end.setDate(end.getDate() + 7)
      return [TODAY, end.toISOString().split('T')[0]]
    }
    return [null, null]
  }
  const [dateStart, dateEnd] = getDateRange()

  const filtered = useMemo(() => appointments.filter(a => {
    if (search && !a.patient_name.includes(search) && !a.patient_phone.includes(search) && !a.doctor_name.includes(search)) return false
    if (statusFilter && a.status !== statusFilter) return false
    if (sourceFilter && a.source !== sourceFilter) return false
    if (dateStart && a.appointment_date < dateStart) return false
    if (dateEnd && a.appointment_date > dateEnd) return false
    return true
  }), [appointments, search, statusFilter, sourceFilter, dateStart, dateEnd])

  const stats = {
    total: filtered.length,
    confirmed: filtered.filter(a => a.status === 'confirmed').length,
    pending: filtered.filter(a => a.status === 'pending').length,
    cancelled: filtered.filter(a => a.status === 'cancelled').length,
    no_show: filtered.filter(a => a.status === 'no_show').length,
    needs_review: filtered.filter(a => a.status === 'needs_review').length,
  }

  const handleConfirm = (id: string) => setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'confirmed' as const } : a))
  const handleCancel = (id: string) => setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' as const } : a))

  const needsReview = appointments.filter(a => a.status === 'needs_review')
  const listData = activeTab === 3 ? needsReview : filtered

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, direction: 'rtl' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 4px 0' }}>المواعيد</h1>
          <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>إدارة الحجوزات، التأكيدات، والجداول</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
            <Download size={14} /> تصدير
          </button>
          <button onClick={() => setShowNewAppt(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
            <Plus size={14} /> موعد جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
        {[
          { icon: Calendar, label: 'الإجمالي', value: stats.total, color: '#4F46E5', bgColor: '#EEF2FF', borderColor: '#C7D2FE' },
          { icon: CheckCircle, label: 'مؤكدة', value: stats.confirmed, color: '#059669', bgColor: '#ECFDF5', borderColor: '#A7F3D0' },
          { icon: Clock, label: 'انتظار', value: stats.pending, color: '#B45309', bgColor: '#FFFBEB', borderColor: '#FDE68A' },
          { icon: X, label: 'ملغاة', value: stats.cancelled, color: '#DC2626', bgColor: '#FEF2F2', borderColor: '#FECACA' },
          { icon: AlertCircle, label: 'لم يحضر', value: stats.no_show, color: '#64748B', bgColor: '#F1F5F9', borderColor: '#CBD5E1' },
          { icon: AlertCircle, label: 'مراجعة', value: stats.needs_review, color: '#C2410C', bgColor: '#FFF7ED', borderColor: '#FED7AA' },
        ].map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px', flex: '1 1 240px' }}>
          <Search size={14} style={{ color: '#94A3B8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم، الجوال، الطبيب..." style={{ border: 'none', background: 'transparent', fontSize: 13, color: '#334155', fontFamily: 'Tajawal, sans-serif', outline: 'none', width: '100%', direction: 'rtl' }} />
        </div>
        {[
          { value: dateFilter, onChange: (v: string) => setDateFilter(v), options: [['today','اليوم'],['tomorrow','غداً'],['week','هذا الأسبوع'],['all','الكل']] },
          { value: statusFilter, onChange: (v: string) => setStatusFilter(v), options: [['','كل الحالات'],['confirmed','مؤكد'],['pending','انتظار'],['checked_in','حاضر'],['completed','مكتمل'],['cancelled','ملغي'],['no_show','لم يحضر'],['needs_review','مراجعة']] },
          { value: sourceFilter, onChange: (v: string) => setSourceFilter(v), options: [['','كل المصادر'],['ai_booking','حجز ذكي'],['whatsapp','واتساب'],['reception','الاستقبال'],['website','الموقع'],['manual','يدوي']] },
        ].map((f, i) => (
          <select key={i} value={f.value} onChange={e => f.onChange(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, color: '#334155', fontFamily: 'Tajawal, sans-serif', cursor: 'pointer', outline: 'none' }}>
            {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #E2E8F0' }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{ padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeTab === i ? 800 : 500, color: activeTab === i ? '#4F46E5' : '#64748B', fontFamily: 'Cairo, sans-serif', borderBottom: `2px solid ${activeTab === i ? '#4F46E5' : 'transparent'}`, marginBottom: -1, position: 'relative' }}>
            {t}
            {t === 'تحتاج مراجعة' && needsReview.length > 0 && <span style={{ position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: '50%', background: '#EF4444', color: 'white', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{needsReview.length}</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      {(activeTab === 0 || activeTab === 3) && (
        <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {listData.length === 0 ? (
            <EmptyState icon={Calendar} title="لا توجد مواعيد" body="لا توجد مواعيد تطابق المعايير المحددة." action={{ label: 'موعد جديد', onClick: () => setShowNewAppt(true) }} />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    {['الوقت', 'المريض', 'الطبيب', 'الخدمة', 'المصدر', 'الحالة', 'واتساب', 'إجراء'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#64748B', fontFamily: 'Cairo, sans-serif', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {listData.map((appt, i) => (
                    <motion.tr key={appt.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                      onClick={() => setSelectedAppt(appt)}
                      style={{ borderBottom: '1px solid #F8FAFC', cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#FAFAFA'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 800, color: '#4F46E5', fontFamily: 'Cairo, sans-serif', whiteSpace: 'nowrap' }}>{appt.start_time}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #4F46E540, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: 'white' }}>{appt.patient_name.charAt(0)}</span>
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{appt.patient_name}</div>
                            <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>{appt.patient_phone}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#334155', fontFamily: 'Tajawal, sans-serif', whiteSpace: 'nowrap' }}>{appt.doctor_name}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#334155', fontFamily: 'Tajawal, sans-serif' }}>{appt.service_name}</td>
                      <td style={{ padding: '12px 16px' }}><SourceBadge source={appt.source} /></td>
                      <td style={{ padding: '12px 16px' }}><StatusBadge status={appt.status} size="sm" /></td>
                      <td style={{ padding: '12px 16px' }}><StatusBadge status={appt.message_status} size="sm" /></td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                          {appt.status === 'pending' && <button onClick={() => handleConfirm(appt.id)} style={{ padding: '4px 10px', borderRadius: 6, background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>تأكيد</button>}
                          {!['completed','cancelled','no_show'].includes(appt.status) && <button onClick={() => handleCancel(appt.id)} style={{ padding: '4px 10px', borderRadius: 6, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>إلغاء</button>}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {DEMO_WAITLIST.map((w, i) => (
            <motion.div key={w.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #4F46E540, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'white' }}>{w.patient_name.charAt(0)}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{w.patient_name}</div>
                <div style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>{w.patient_phone} · {w.service_name} · {w.preferred_time_range}</div>
              </div>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: w.priority === 'high' ? '#FFF7ED' : '#F8FAFC', color: w.priority === 'high' ? '#C2410C' : '#64748B', border: `1px solid ${w.priority === 'high' ? '#FED7AA' : '#E2E8F0'}`, fontWeight: 700, fontFamily: 'Cairo, sans-serif' }}>
                {w.priority === 'high' ? 'أولوية' : w.priority === 'normal' ? 'عادي' : 'منخفض'}
              </span>
              {w.offered_slot && <span style={{ fontSize: 11, color: '#7C3AED', fontFamily: 'Tajawal, sans-serif' }}>تم عرض وقت</span>}
              <button style={{ padding: '7px 14px', borderRadius: 8, background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif', whiteSpace: 'nowrap' }}>
                عرض موعد عبر واتساب
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {DEMO_DOCTORS.map(doc => {
            const docAppts = appointments.filter(a => a.doctor_id === doc.id && a.appointment_date === TODAY)
            return (
              <div key={doc.id} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #4F46E540, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>{doc.name.split(' ')[1]?.charAt(0) || 'د'}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{doc.name}</div>
                    <StatusBadge status={doc.status || 'available'} size="sm" />
                  </div>
                </div>
                {docAppts.slice(0, 5).map((a, i) => (
                  <div key={a.id} onClick={() => setSelectedAppt(a)} style={{ padding: '10px 14px', borderBottom: i < docAppts.length - 1 ? '1px solid #F8FAFC' : 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{a.patient_name}</div>
                      <div style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>{a.start_time} · {a.service_name}</div>
                    </div>
                    <StatusBadge status={a.status} size="sm" />
                  </div>
                ))}
                {docAppts.length === 0 && <div style={{ padding: '16px', fontSize: 12, color: '#94A3B8', textAlign: 'center', fontFamily: 'Tajawal, sans-serif' }}>لا مواعيد اليوم</div>}
              </div>
            )
          })}
        </div>
      )}

      {selectedAppt && <AppointmentDrawer appointment={selectedAppt} onClose={() => setSelectedAppt(null)} onConfirm={handleConfirm} onCancel={handleCancel} />}
      {showNewAppt && <NewAppointmentModal onClose={() => setShowNewAppt(false)} onCreated={() => {}} />}
    </div>
  )
}
