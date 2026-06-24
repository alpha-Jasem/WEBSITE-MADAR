import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, CheckCircle, Clock, X, AlertCircle, Download, Plus, Search, Pencil } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { StatCard } from '../../../components/clinicOS/ui/StatCard'
import { StatusBadge, SourceBadge } from '../../../components/clinicOS/ui/StatusBadge'
import { AppointmentDrawer } from '../../../components/clinicOS/ui/AppointmentDrawer'
import { EmptyState } from '../../../components/clinicOS/ui/EmptyState'
import { NewAppointmentModal } from '../../../components/clinicOS/ui/NewAppointmentModal'
import { useClinicAppointments, useClinicDoctors, useClinicWaitlist } from '../../../lib/clinicOSQueries'
import { useClinicOS } from '../../../context/ClinicOSContext'
import type { Appointment } from '../../../types/clinicOS'

function exportAppointmentsCSV(rows: Appointment[]) {
  const headers = ['العميل', 'الجوال', 'الطبيب', 'الخدمة', 'التاريخ', 'الوقت', 'الحالة', 'المصدر']
  const lines = [
    headers.join(','),
    ...rows.map(a => [
      a.patient_name, a.patient_phone, a.doctor_name, a.service_name,
      a.appointment_date, a.start_time, a.status, a.source,
    ].map(v => `"${v}"`).join(',')),
  ]
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `appointments-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const TODAY = new Date().toISOString().split('T')[0]

const TABS = ['قائمة', 'تقويم', 'حسب الطبيب', 'تحتاج مراجعة', 'قائمة الانتظار']

export const Appointments = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(0)
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)
  const [showNewAppt, setShowNewAppt] = useState(false)
  const [editPatient, setEditPatient] = useState<Appointment | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('today')
  const { companyId, isDemo } = useClinicOS()
  const { data: allAppointments = [], refetch } = useClinicAppointments(companyId, undefined, isDemo)
  const { data: _doctors = [] } = useClinicDoctors(companyId, isDemo)
  const { data: _waitlist = [] } = useClinicWaitlist(companyId, isDemo)
  const [appointments, setAppointments] = useState<Appointment[]>([])

  useEffect(() => { setAppointments(allAppointments) }, [allAppointments])

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
    const q = search.toLowerCase()
    const phoneQ = search.replace(/\D/g, '')
    if (search && !(a.patient_name || '').toLowerCase().includes(q) && !(a.doctor_name || '').toLowerCase().includes(q) && !(phoneQ && (a.patient_phone || '').replace(/\D/g,'').includes(phoneQ))) return false
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

  const handleConfirm = async (id: string) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'confirmed' as const } : a))
    const { updateAppointmentStatus } = await import('../../../lib/clinicOSQueries')
    await updateAppointmentStatus(id, 'confirmed').catch(() => refetch())
  }
  const handleCancel = async (id: string) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' as const } : a))
    const { updateAppointmentStatus } = await import('../../../lib/clinicOSQueries')
    await updateAppointmentStatus(id, 'cancelled').catch(() => refetch())
  }

  const openEditPatient = (appt: Appointment) => {
    setEditPatient(appt)
    setEditName(appt.patient_name || '')
    setEditPhone(appt.patient_phone || '')
    setEditError('')
  }

  const handleSavePatient = async () => {
    if (!editPatient) return
    if (!editName.trim()) { setEditError('يجب إدخال اسم العميل'); return }
    if (!editPhone.trim()) { setEditError('يجب إدخال رقم الجوال'); return }
    setEditSaving(true)
    try {
      const { updateAppointmentPatient } = await import('../../../lib/clinicOSQueries')
      await updateAppointmentPatient(editPatient.id, editName.trim(), editPhone.trim())
      setAppointments(prev => prev.map(a =>
        a.id === editPatient.id ? { ...a, patient_name: editName.trim(), patient_phone: editPhone.trim() } : a
      ))
      setEditPatient(null)
    } catch {
      setEditError('حدث خطأ أثناء الحفظ، حاول مجدداً')
    } finally {
      setEditSaving(false)
    }
  }

  const needsReview = appointments.filter(a => a.status === 'needs_review')
  const listData = activeTab === 3 ? needsReview : filtered

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, direction: 'rtl' }}>
      {/* Header */}
      <div className="cos-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 4px 0' }}>المواعيد</h1>
          <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>إدارة الحجوزات، التأكيدات، والجداول</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => exportAppointmentsCSV(filtered)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
            <Download size={14} /> تصدير
          </button>
          <button onClick={() => setShowNewAppt(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
            <Plus size={14} /> موعد جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="cos-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
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
                    {['الوقت', 'العميل', 'الطبيب', 'الخدمة', 'المصدر', 'الحالة', 'واتساب', 'إجراء'].map(h => (
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
                            <span style={{ fontSize: 10, fontWeight: 800, color: 'white' }}>{(appt.patient_name || '؟').charAt(0)}</span>
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
                          <button
                            onClick={() => openEditPatient(appt)}
                            title="تعديل بيانات العميل"
                            style={{
                              padding: '4px 8px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                              background: (!appt.patient_name || appt.patient_name === 'Unknown') ? '#FFF7ED' : '#F8FAFC',
                              border: `1px solid ${(!appt.patient_name || appt.patient_name === 'Unknown') ? '#FED7AA' : '#E2E8F0'}`,
                              color: (!appt.patient_name || appt.patient_name === 'Unknown') ? '#C2410C' : '#64748B',
                            }}
                          >
                            <Pencil size={11} />
                            {(!appt.patient_name || appt.patient_name === 'Unknown') && (
                              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'Cairo, sans-serif' }}>تعديل</span>
                            )}
                          </button>
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
          {_waitlist.map((w, i) => (
            <motion.div key={w.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #4F46E540, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'white' }}>{(w.patient_name || '؟').charAt(0)}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{w.patient_name}</div>
                <div style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>{w.patient_phone} · {w.service_name} · {w.preferred_time_range}</div>
              </div>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: w.priority === 'high' ? '#FFF7ED' : '#F8FAFC', color: w.priority === 'high' ? '#C2410C' : '#64748B', border: `1px solid ${w.priority === 'high' ? '#FED7AA' : '#E2E8F0'}`, fontWeight: 700, fontFamily: 'Cairo, sans-serif' }}>
                {w.priority === 'high' ? 'أولوية' : w.priority === 'normal' ? 'عادي' : 'منخفض'}
              </span>
              {w.offered_slot && <span style={{ fontSize: 11, color: '#7C3AED', fontFamily: 'Tajawal, sans-serif' }}>تم عرض وقت</span>}
              <a
                href={`https://wa.me/966${(w.patient_phone || '').replace(/^0/, '').replace(/\D/g, '')}?text=${encodeURIComponent(`مرحباً ${w.patient_name} 👋\nيوجد موعد متاح لـ${w.service_name || 'الخدمة المطلوبة'} في ${w.preferred_time_range || 'وقت قريب'}.\nهل ترغب بالحجز؟`)}`}
                target="_blank" rel="noreferrer"
                style={{ padding: '7px 14px', borderRadius: 8, background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif', whiteSpace: 'nowrap', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                عرض موعد عبر واتساب
              </a>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === 1 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '48px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={28} style={{ color: '#4F46E5' }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', marginBottom: 6 }}>تقويم العيادة</div>
            <div style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', maxWidth: 320 }}>
              اعرض الجدول الأسبوعي والشهري، وتنقل بين الأيام مباشرة من التقويم.
            </div>
          </div>
          <button onClick={() => navigate('/clinic-os/dashboard/calendar')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 24px', borderRadius: 9, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
            <Calendar size={14} /> فتح التقويم
          </button>
        </motion.div>
      )}

      {activeTab === 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {_doctors.map(doc => {
            const docAppts = appointments.filter(a => a.doctor_id === doc.id && a.appointment_date === TODAY)
            return (
              <div key={doc.id} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #4F46E540, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>{(doc.name || '').split(' ')[1]?.charAt(0) || 'د'}</span>
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
      {showNewAppt && <NewAppointmentModal onClose={() => setShowNewAppt(false)} onCreated={() => { setShowNewAppt(false); refetch() }} />}

      {/* Edit Patient Modal */}
      <AnimatePresence>
        {editPatient && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', direction: 'rtl' }}
            onClick={() => setEditPatient(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#FFFFFF', borderRadius: 16, width: '100%', maxWidth: 400, boxShadow: '0 24px 80px rgba(0,0,0,0.2)', overflow: 'hidden' }}
            >
              {/* Header */}
              <div style={{ padding: '18px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>تعديل بيانات العميل</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>{editPatient.service_name} · {editPatient.start_time}</p>
                </div>
                <button onClick={() => setEditPatient(null)} style={{ width: 30, height: 30, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X size={14} style={{ color: '#64748B' }} />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', fontFamily: 'Cairo, sans-serif' }}>
                    الاسم الكامل <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    value={editName}
                    onChange={e => { setEditName(e.target.value); setEditError('') }}
                    placeholder="مثال: محمد العتيبي"
                    autoFocus
                    style={{
                      padding: '10px 12px', borderRadius: 8, outline: 'none', direction: 'rtl',
                      border: `1.5px solid ${editError && !editName.trim() ? '#EF4444' : '#E2E8F0'}`,
                      background: editError && !editName.trim() ? '#FEF2F2' : '#FAFAFA',
                      fontSize: 13, fontFamily: 'Tajawal, sans-serif', color: '#0F172A',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', fontFamily: 'Cairo, sans-serif' }}>
                    رقم الجوال <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    value={editPhone}
                    onChange={e => { setEditPhone(e.target.value); setEditError('') }}
                    placeholder="05xxxxxxxx"
                    style={{
                      padding: '10px 12px', borderRadius: 8, outline: 'none', direction: 'ltr',
                      border: `1.5px solid ${editError && !editPhone.trim() ? '#EF4444' : '#E2E8F0'}`,
                      background: editError && !editPhone.trim() ? '#FEF2F2' : '#FAFAFA',
                      fontSize: 13, fontFamily: 'Tajawal, sans-serif', color: '#0F172A',
                    }}
                  />
                </div>
                {editError && (
                  <p style={{ margin: 0, fontSize: 12, color: '#DC2626', fontFamily: 'Tajawal, sans-serif', background: '#FEF2F2', padding: '8px 12px', borderRadius: 7, border: '1px solid #FECACA' }}>{editError}</p>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '14px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', gap: 10, justifyContent: 'flex-start' }}>
                <button
                  onClick={handleSavePatient}
                  disabled={editSaving}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, background: editSaving ? '#94A3B8' : 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: editSaving ? 'not-allowed' : 'pointer', fontFamily: 'Cairo, sans-serif' }}
                >
                  {editSaving ? 'جاري الحفظ...' : 'حفظ البيانات'}
                </button>
                <button onClick={() => setEditPatient(null)} style={{ padding: '10px 16px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                  إلغاء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
