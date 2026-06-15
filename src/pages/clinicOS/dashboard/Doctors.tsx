import { useState } from 'react'
import { UserCheck, Calendar, Clock, Plus, X, ChevronLeft, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { StatCard } from '../../../components/clinicOS/ui/StatCard'
import { StatusBadge } from '../../../components/clinicOS/ui/StatusBadge'
import { useClinicDoctors, useClinicTodayAppointments, createDoctor, toggleDoctorAvailability } from '../../../lib/clinicOSQueries'
import { useClinicOS } from '../../../context/ClinicOSContext'
import { useToast } from '../../../lib/useToast'
import type { Doctor } from '../../../types/clinicOS'
import { useNavigate } from 'react-router-dom'

const ABSENCE_REASONS = ['مرض', 'إجازة', 'حالة طارئة', 'اجتماع', 'أخرى']

export const Doctors = () => {
  const { companyId, isDemo } = useClinicOS()
  const { showToast } = useToast()
  const { data: doctors = [], refetch } = useClinicDoctors(companyId, isDemo)
  const { data: todayAppts = [] } = useClinicTodayAppointments(companyId, isDemo)
  const navigate = useNavigate()

  const [selected, setSelected] = useState<Doctor | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newDoc, setNewDoc] = useState({ name: '', specialty: '', max_appointments_per_day: 12, emergency_slots_per_day: 2 })
  const [saving, setSaving] = useState(false)

  // Absence modal state
  const [showAbsenceModal, setShowAbsenceModal] = useState(false)
  const [absenceDoc, setAbsenceDoc] = useState<Doctor | null>(null)
  const [absenceReason, setAbsenceReason] = useState('مرض')
  const [absenceCustom, setAbsenceCustom] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const handleAddDoctor = async () => {
    if (!newDoc.name.trim() || !newDoc.specialty.trim()) {
      showToast('الاسم والتخصص مطلوبان', 'warning'); return
    }
    if (isDemo) { showToast('لا يمكن الإضافة في وضع التجربة', 'info'); return }
    setSaving(true)
    try {
      await createDoctor({ ...newDoc, clinic_id: companyId!, is_available: true, status: 'available' as const })
      showToast('تم إضافة الطبيب بنجاح', 'success')
      setShowAddModal(false)
      setNewDoc({ name: '', specialty: '', max_appointments_per_day: 12, emergency_slots_per_day: 2 })
      refetch()
    } catch { showToast('حدث خطأ أثناء الإضافة', 'error') }
    finally { setSaving(false) }
  }

  // Mark doctor available (instant, no modal)
  const handleMarkAvailable = async (doc: Doctor, e: React.MouseEvent) => {
    e.stopPropagation()
    if (isDemo) { showToast('لا يمكن التعديل في وضع التجربة', 'info'); return }
    setTogglingId(doc.id)
    try {
      await toggleDoctorAvailability(doc.id, true)
      showToast(`${doc.name} متاح الآن ✓`, 'success')
      if (selected?.id === doc.id) setSelected({ ...selected, is_available: true, unavailable_reason: undefined })
      refetch()
    } catch { showToast('حدث خطأ', 'error') }
    finally { setTogglingId(null) }
  }

  // Open absence modal then confirm
  const openAbsenceModal = (doc: Doctor, e: React.MouseEvent) => {
    e.stopPropagation()
    if (isDemo) { showToast('لا يمكن التعديل في وضع التجربة', 'info'); return }
    setAbsenceDoc(doc)
    setAbsenceReason('مرض')
    setAbsenceCustom('')
    setShowAbsenceModal(true)
  }

  const handleConfirmAbsence = async () => {
    if (!absenceDoc) return
    const reason = absenceReason === 'أخرى' ? absenceCustom.trim() || 'غائب اليوم' : absenceReason
    setTogglingId(absenceDoc.id)
    setShowAbsenceModal(false)
    try {
      await toggleDoctorAvailability(absenceDoc.id, false, reason)
      showToast(`${absenceDoc.name} علّمناه غائباً — نورا لن تقبل حجوزات له`, 'success')
      if (selected?.id === absenceDoc.id) setSelected({ ...selected, is_available: false, unavailable_reason: reason })
      refetch()
    } catch { showToast('حدث خطأ', 'error') }
    finally { setTogglingId(null); setAbsenceDoc(null) }
  }

  const docAppts = (id: string) => todayAppts.filter(a => a.doctor_id === id)
  const unavailableCount = doctors.filter(d => !d.is_available).length

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

      {/* Absence alert banner */}
      {unavailableCount > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12 }}>
          <AlertTriangle size={16} color="#C2410C" />
          <span style={{ fontSize: 13, color: '#C2410C', fontFamily: 'Cairo, sans-serif', fontWeight: 600 }}>
            {unavailableCount} {unavailableCount === 1 ? 'طبيب غائب اليوم' : 'أطباء غائبون اليوم'} — نورا لن تقبل حجوزات عليهم تلقائياً
          </span>
        </motion.div>
      )}

      <div className="cos-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {[
          { icon: UserCheck, label: 'إجمالي الأطباء', value: doctors.length, color: '#4F46E5', bgColor: '#EEF2FF', borderColor: '#C7D2FE' },
          { icon: UserCheck, label: 'متاح اليوم', value: doctors.filter(d => d.is_available && (d.status === 'available' || d.status === 'busy')).length, color: '#059669', bgColor: '#ECFDF5', borderColor: '#A7F3D0' },
          { icon: Calendar, label: 'محجوز بالكامل', value: doctors.filter(d => d.is_available && d.status === 'fully_booked').length, color: '#DC2626', bgColor: '#FEF2F2', borderColor: '#FECACA' },
          { icon: AlertTriangle, label: 'غائب اليوم', value: unavailableCount, color: '#C2410C', bgColor: '#FFF7ED', borderColor: '#FED7AA' },
          { icon: Clock, label: 'فتحات طوارئ', value: doctors.filter(d => d.is_available).reduce((s, d) => s + d.emergency_slots_per_day, 0), color: '#7C3AED', bgColor: '#F5F3FF', borderColor: '#DDD6FE' },
        ].map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['الطبيب', 'التخصص', 'الحالة', 'مواعيد اليوم', 'أقصى/يوم', 'التالي المتاح', 'توفر نورا', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#64748B', fontFamily: 'Cairo, sans-serif' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {doctors.map((doc, i) => {
                const appts = docAppts(doc.id)
                const isAbsent = !doc.is_available
                const isToggling = togglingId === doc.id
                return (
                  <motion.tr key={doc.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                    onClick={() => setSelected(doc)}
                    style={{ borderBottom: '1px solid #F8FAFC', cursor: 'pointer', background: isAbsent ? '#FFFBF5' : selected?.id === doc.id ? '#EEF2FF' : 'transparent', transition: 'background 0.1s' }}
                    onMouseEnter={e => { if (selected?.id !== doc.id) (e.currentTarget as HTMLTableRowElement).style.background = isAbsent ? '#FFF7ED' : '#FAFAFA' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = isAbsent ? '#FFFBF5' : selected?.id === doc.id ? '#EEF2FF' : 'transparent' }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: isAbsent ? '#FED7AA' : 'linear-gradient(135deg, #4F46E540, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: isAbsent ? '#C2410C' : 'white' }}>{(doc.name || '').split(' ')[1]?.charAt(0) || 'د'}</span>
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: isAbsent ? '#92400E' : '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{doc.name}</div>
                          {isAbsent && doc.unavailable_reason && (
                            <div style={{ fontSize: 11, color: '#C2410C', fontFamily: 'Tajawal, sans-serif' }}>{doc.unavailable_reason}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569', fontFamily: 'Tajawal, sans-serif' }}>{doc.specialty}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {isAbsent
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: '#FEF3C7', color: '#92400E', fontSize: 11, fontWeight: 700, fontFamily: 'Cairo, sans-serif' }}>⚫ غائب</span>
                        : <StatusBadge status={doc.status || 'available'} size="sm" />
                      }
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ height: 6, width: 60, borderRadius: 3, background: '#F1F5F9', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: isAbsent ? '#FCA5A5' : '#4F46E5', borderRadius: 3, width: `${Math.min(100, (appts.length / doc.max_appointments_per_day) * 100)}%` }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{appts.length}/{doc.max_appointments_per_day}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748B', fontFamily: 'Cairo, sans-serif' }}>{doc.max_appointments_per_day}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: isAbsent ? '#DC2626' : doc.next_available ? '#059669' : '#DC2626', fontFamily: 'Cairo, sans-serif', fontWeight: 600 }}>
                      {isAbsent ? 'غائب' : doc.next_available || 'غير متاح'}
                    </td>

                    {/* Availability Toggle Column */}
                    <td style={{ padding: '12px 16px' }}>
                      {isToggling ? (
                        <span style={{ fontSize: 11, color: '#94A3B8' }}>...</span>
                      ) : isAbsent ? (
                        <button
                          onClick={e => handleMarkAvailable(doc, e)}
                          style={{ padding: '5px 10px', borderRadius: 6, background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif', whiteSpace: 'nowrap' }}>
                          ✓ عاد
                        </button>
                      ) : (
                        <button
                          onClick={e => openAbsenceModal(doc, e)}
                          style={{ padding: '5px 10px', borderRadius: 6, background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif', whiteSpace: 'nowrap' }}>
                          غائب
                        </button>
                      )}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={e => { e.stopPropagation(); setSelected(doc) }} style={{ padding: '5px 12px', borderRadius: 6, background: '#EEF2FF', color: '#4F46E5', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>عرض</button>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Doctor profile panel */}
        {selected && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ width: 300, background: '#FFFFFF', borderRadius: 14, border: `1px solid ${!selected.is_available ? '#FED7AA' : '#E2E8F0'}`, padding: '20px', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: 0 }}>{selected.name}</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: 18 }}>×</button>
            </div>

            {/* Availability Big Toggle */}
            <div style={{ marginBottom: 16, padding: '14px', borderRadius: 12, background: selected.is_available ? '#ECFDF5' : '#FFF7ED', border: `1px solid ${selected.is_available ? '#A7F3D0' : '#FED7AA'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: selected.is_available ? 0 : 6 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: selected.is_available ? '#059669' : '#C2410C', fontFamily: 'Cairo, sans-serif' }}>
                    {selected.is_available ? '● متاح لنورا' : '⚫ غائب — نورا محظورة'}
                  </div>
                  {!selected.is_available && selected.unavailable_reason && (
                    <div style={{ fontSize: 11, color: '#92400E', fontFamily: 'Tajawal, sans-serif', marginTop: 2 }}>{selected.unavailable_reason}</div>
                  )}
                </div>
                {togglingId === selected.id ? (
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>...</span>
                ) : selected.is_available ? (
                  <button onClick={e => openAbsenceModal(selected, e)}
                    style={{ padding: '5px 12px', borderRadius: 8, background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                    تغييب
                  </button>
                ) : (
                  <button onClick={e => handleMarkAvailable(selected, e)}
                    style={{ padding: '5px 12px', borderRadius: 8, background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                    إرجاع
                  </button>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <StatusBadge status={selected.status || 'available'} />
              <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: '8px 0 0 0' }}>{selected.specialty}</p>
            </div>
            {[
              ['أقصى مواعيد/يوم', String(selected.max_appointments_per_day)],
              ['فتحات طوارئ', String(selected.emergency_slots_per_day)],
              ['التالي المتاح', selected.is_available ? (selected.next_available || 'غير متاح') : 'غائب اليوم'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F8FAFC' }}>
                <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>{k}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
              <button onClick={() => navigate(`/clinic-os/dashboard/knowledge?section=doctors&doctor=${selected.id}`)} style={{ flex: 1, padding: '9px', borderRadius: 8, background: '#4F46E5', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>تعديل جدول الحجز</button>
              <button onClick={() => navigate(`/clinic-os/dashboard/appointments?doctor=${encodeURIComponent(selected.name)}`)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '9px', borderRadius: 8, background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                <ChevronLeft size={12} /> مواعيده
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Absence Reason Modal */}
      <AnimatePresence>
        {showAbsenceModal && absenceDoc && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', direction: 'rtl' }}>
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              style={{ background: '#FFFFFF', borderRadius: 16, padding: '28px', width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h2 style={{ fontSize: 16, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: 0 }}>تغييب {absenceDoc.name}</h2>
                <button onClick={() => setShowAbsenceModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X size={18} /></button>
              </div>

              <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: '0 0 18px 0', lineHeight: 1.6 }}>
                بعد التأكيد، نورا لن تقبل أي حجز جديد مع هذا الطبيب، وستخبر المريض بأنه غير متاح اليوم.
              </p>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', fontFamily: 'Cairo, sans-serif', marginBottom: 10 }}>سبب الغياب</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ABSENCE_REASONS.map(r => (
                    <button key={r} onClick={() => setAbsenceReason(r)}
                      style={{ padding: '6px 14px', borderRadius: 8, border: `1.5px solid ${absenceReason === r ? '#C2410C' : '#E2E8F0'}`, background: absenceReason === r ? '#FFF7ED' : '#F8FAFC', color: absenceReason === r ? '#C2410C' : '#64748B', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {absenceReason === 'أخرى' && (
                <div style={{ marginBottom: 16 }}>
                  <input
                    value={absenceCustom}
                    onChange={e => setAbsenceCustom(e.target.value)}
                    placeholder="اكتب السبب..."
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={handleConfirmAbsence}
                  style={{ flex: 1, padding: '11px', borderRadius: 8, background: '#C2410C', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                  تأكيد الغياب
                </button>
                <button onClick={() => setShowAbsenceModal(false)}
                  style={{ padding: '11px 18px', borderRadius: 8, background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>إلغاء</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

    </div>
  )
}
