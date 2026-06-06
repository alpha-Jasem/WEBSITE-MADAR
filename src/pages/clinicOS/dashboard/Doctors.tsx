import { useState } from 'react'
import { UserCheck, Calendar, Clock, Plus, X, ChevronLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { StatCard } from '../../../components/clinicOS/ui/StatCard'
import { StatusBadge } from '../../../components/clinicOS/ui/StatusBadge'
import { useClinicDoctors, useClinicTodayAppointments, createDoctor, updateDoctor } from '../../../lib/clinicOSQueries'
import { useClinicOS } from '../../../context/ClinicOSContext'
import { useToast } from '../../../lib/useToast'
import type { Doctor } from '../../../types/clinicOS'
import { useNavigate } from 'react-router-dom'

const TODAY = new Date().toISOString().split('T')[0]
const DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']

export const Doctors = () => {
  const { companyId, isDemo } = useClinicOS()
  const { showToast } = useToast()
  const { data: doctors = [], refetch } = useClinicDoctors(companyId, isDemo)
  const { data: todayAppts = [] } = useClinicTodayAppointments(companyId, isDemo)
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Doctor | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleDoc, setScheduleDoc] = useState<Doctor | null>(null)
  const [workDays, setWorkDays] = useState<boolean[]>([true, true, true, true, true, true, false]) // Sat–Fri
  const [workStart, setWorkStart] = useState('09:00')
  const [workEnd, setWorkEnd] = useState('17:00')
  const [savingSched, setSavingSched] = useState(false)
  const [newDoc, setNewDoc] = useState({ name: '', specialty: '', max_appointments_per_day: 12, emergency_slots_per_day: 2 })
  const [saving, setSaving] = useState(false)

  const openScheduleModal = (doc: Doctor) => {
    setScheduleDoc(doc)
    const wh = (doc as Doctor & { working_hours?: { days?: boolean[]; start?: string; end?: string } }).working_hours
    setWorkDays(wh?.days || [true, true, true, true, true, true, false])
    setWorkStart(wh?.start || '09:00')
    setWorkEnd(wh?.end || '17:00')
    setShowScheduleModal(true)
  }

  const handleSaveSchedule = async () => {
    if (!scheduleDoc) return
    if (isDemo) { showToast('لا يمكن التعديل في وضع التجربة', 'info'); return }
    setSavingSched(true)
    try {
      await updateDoctor(scheduleDoc.id, { working_hours: { days: workDays, start: workStart, end: workEnd } } as Partial<Doctor>)
      showToast('تم حفظ جدول الطبيب', 'success')
      setShowScheduleModal(false)
      refetch()
    } catch { showToast('حدث خطأ أثناء الحفظ', 'error') }
    finally { setSavingSched(false) }
  }

  const handleAddDoctor = async () => {
    if (!newDoc.name.trim() || !newDoc.specialty.trim()) {
      showToast('الاسم والتخصص مطلوبان', 'warning'); return
    }
    if (isDemo) { showToast('لا يمكن الإضافة في وضع التجربة', 'info'); return }
    setSaving(true)
    try {
      await createDoctor({ ...newDoc, clinic_id: companyId!, status: 'available' as const })
      showToast('تم إضافة الطبيب بنجاح', 'success')
      setShowAddModal(false)
      setNewDoc({ name: '', specialty: '', max_appointments_per_day: 12, emergency_slots_per_day: 2 })
      refetch()
    } catch { showToast('حدث خطأ أثناء الإضافة', 'error') }
    finally { setSaving(false) }
  }

  const docAppts = (id: string) => todayAppts.filter(a => a.doctor_id === id)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, direction: 'rtl' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 4px 0' }}>الأطباء</h1>
          <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>إدارة جداول الأطباء والتوافر والطاقة الاستيعابية</p>
        </div>
        <button onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
          <Plus size={14} /> إضافة طبيب
        </button>
      </div>

      <div className="cos-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {[
          { icon: UserCheck, label: 'إجمالي الأطباء', value: doctors.length, color: '#4F46E5', bgColor: '#EEF2FF', borderColor: '#C7D2FE' },
          { icon: UserCheck, label: 'متاح اليوم', value: doctors.filter(d => d.status === 'available' || d.status === 'busy').length, color: '#059669', bgColor: '#ECFDF5', borderColor: '#A7F3D0' },
          { icon: Calendar, label: 'محجوز بالكامل', value: doctors.filter(d => d.status === 'fully_booked').length, color: '#DC2626', bgColor: '#FEF2F2', borderColor: '#FECACA' },
          { icon: Clock, label: 'إجازة اليوم', value: doctors.filter(d => d.status === 'off_today').length, color: '#64748B', bgColor: '#F1F5F9', borderColor: '#CBD5E1' },
          { icon: UserCheck, label: 'فتحات طوارئ', value: doctors.reduce((s, d) => s + d.emergency_slots_per_day, 0), color: '#C2410C', bgColor: '#FFF7ED', borderColor: '#FED7AA' },
        ].map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['الطبيب', 'التخصص', 'الحالة', 'مواعيد اليوم', 'أقصى/يوم', 'التالي المتاح', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#64748B', fontFamily: 'Cairo, sans-serif' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {doctors.map((doc, i) => {
                const appts = docAppts(doc.id)
                return (
                  <motion.tr key={doc.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                    onClick={() => setSelected(doc)}
                    style={{ borderBottom: '1px solid #F8FAFC', cursor: 'pointer', background: selected?.id === doc.id ? '#EEF2FF' : 'transparent', transition: 'background 0.1s' }}
                    onMouseEnter={e => { if (selected?.id !== doc.id) (e.currentTarget as HTMLTableRowElement).style.background = '#FAFAFA' }}
                    onMouseLeave={e => { if (selected?.id !== doc.id) (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #4F46E540, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>{(doc.name || '').split(' ')[1]?.charAt(0) || 'د'}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{doc.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569', fontFamily: 'Tajawal, sans-serif' }}>{doc.specialty}</td>
                    <td style={{ padding: '12px 16px' }}><StatusBadge status={doc.status || 'available'} size="sm" /></td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ height: 6, width: 60, borderRadius: 3, background: '#F1F5F9', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: '#4F46E5', borderRadius: 3, width: `${Math.min(100, (appts.length / doc.max_appointments_per_day) * 100)}%` }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{appts.length}/{doc.max_appointments_per_day}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748B', fontFamily: 'Cairo, sans-serif' }}>{doc.max_appointments_per_day}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: doc.next_available ? '#059669' : '#DC2626', fontFamily: 'Cairo, sans-serif', fontWeight: 600 }}>{doc.next_available || 'غير متاح'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={e => { e.stopPropagation(); setSelected(doc) }} style={{ padding: '5px 12px', borderRadius: 6, background: '#EEF2FF', color: '#4F46E5', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>عرض</button>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Doctor profile */}
        {selected && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ width: 300, background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '20px', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: 0 }}>{selected.name}</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: 18 }}>×</button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <StatusBadge status={selected.status || 'available'} />
              <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: '8px 0 0 0' }}>{selected.specialty}</p>
            </div>
            {[['أقصى مواعيد/يوم', String(selected.max_appointments_per_day)], ['فتحات طوارئ', String(selected.emergency_slots_per_day)], ['التالي المتاح', selected.next_available || 'غير متاح']].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F8FAFC' }}>
                <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>{k}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
              <button onClick={() => openScheduleModal(selected)} style={{ flex: 1, padding: '9px', borderRadius: 8, background: '#4F46E5', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>تعديل الجدول</button>
              <button onClick={() => navigate(`/clinic-os/dashboard/appointments?doctor=${encodeURIComponent(selected.name)}`)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '9px', borderRadius: 8, background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                <ChevronLeft size={12} /> مواعيده
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Add Doctor Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', direction: 'rtl' }}>
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              style={{ background: '#FFFFFF', borderRadius: 16, padding: '28px', width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 17, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: 0 }}>إضافة طبيب جديد</h2>
                <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X size={18} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'الاسم الكامل', key: 'name', placeholder: 'د. محمد الأحمدي' },
                  { label: 'التخصص', key: 'specialty', placeholder: 'طب الأسنان العام' },
                ].map(f => (
                  <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', fontFamily: 'Cairo, sans-serif' }}>{f.label}</label>
                    <input value={(newDoc as Record<string, string | number>)[f.key] as string} onChange={e => setNewDoc(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                      style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', direction: 'rtl' }} />
                  </div>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'أقصى مواعيد/يوم', key: 'max_appointments_per_day' },
                    { label: 'فتحات طوارئ', key: 'emergency_slots_per_day' },
                  ].map(f => (
                    <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', fontFamily: 'Cairo, sans-serif' }}>{f.label}</label>
                      <input type="number" min={1} value={(newDoc as Record<string, string | number>)[f.key] as number} onChange={e => setNewDoc(p => ({ ...p, [f.key]: Number(e.target.value) }))}
                        style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', textAlign: 'center' }} />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={handleAddDoctor} disabled={saving} style={{ flex: 1, padding: '11px', borderRadius: 8, background: saving ? '#94A3B8' : '#4F46E5', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                  {saving ? 'جاري الحفظ...' : 'إضافة الطبيب'}
                </button>
                <button onClick={() => setShowAddModal(false)} style={{ padding: '11px 18px', borderRadius: 8, background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>إلغاء</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Schedule Modal */}
      <AnimatePresence>
        {showScheduleModal && scheduleDoc && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', direction: 'rtl' }}>
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              style={{ background: '#FFFFFF', borderRadius: 16, padding: '28px', width: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 17, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: 0 }}>جدول {scheduleDoc.name}</h2>
                <button onClick={() => setShowScheduleModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X size={18} /></button>
              </div>

              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', fontFamily: 'Cairo, sans-serif', marginBottom: 10 }}>أيام العمل</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {DAYS.map((day, i) => (
                    <button key={day} type="button" onClick={() => setWorkDays(p => p.map((v, j) => j === i ? !v : v))}
                      style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${workDays[i] ? '#4F46E5' : '#E2E8F0'}`, background: workDays[i] ? '#EEF2FF' : '#F8FAFC', color: workDays[i] ? '#4F46E5' : '#94A3B8', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', fontFamily: 'Cairo, sans-serif' }}>وقت البداية</label>
                  <input type="time" value={workStart} onChange={e => setWorkStart(e.target.value)}
                    style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', fontFamily: 'Cairo, sans-serif' }}>وقت الانتهاء</label>
                  <input type="time" value={workEnd} onChange={e => setWorkEnd(e.target.value)}
                    style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleSaveSchedule} disabled={savingSched}
                  style={{ flex: 1, padding: '11px', borderRadius: 8, background: savingSched ? '#94A3B8' : '#4F46E5', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: savingSched ? 'not-allowed' : 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                  {savingSched ? 'جاري الحفظ...' : 'حفظ الجدول'}
                </button>
                <button onClick={() => setShowScheduleModal(false)}
                  style={{ padding: '11px 18px', borderRadius: 8, background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>إلغاء</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
