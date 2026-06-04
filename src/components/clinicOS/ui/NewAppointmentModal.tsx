import { useState } from 'react'
import { X, Search, User, Stethoscope, Clock, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { DEMO_PATIENTS, DEMO_DOCTORS, DEMO_SERVICES, getAvailableSlots } from '../../../lib/clinicOSDemoData'
import type { Appointment } from '../../../types/clinicOS'

interface Props {
  onClose: () => void
  onCreated: (appt: Appointment) => void
  selectedDate?: string
}

const TODAY = new Date().toISOString().split('T')[0]

export const NewAppointmentModal = ({ onClose, onCreated, selectedDate }: Props) => {
  const [step, setStep] = useState(1)
  const [patientSearch, setPatientSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<typeof DEMO_PATIENTS[0] | null>(null)
  const [newPatient, setNewPatient] = useState({ name: '', phone: '' })
  const [selectedService, setSelectedService] = useState<typeof DEMO_SERVICES[0] | null>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<typeof DEMO_DOCTORS[0] | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [appointmentDate, setAppointmentDate] = useState(selectedDate || TODAY)
  const [sendWhatsApp, setSendWhatsApp] = useState(true)
  const [creating, setCreating] = useState(false)

  const filteredPatients = patientSearch.length > 1
    ? DEMO_PATIENTS.filter(p => p.name.includes(patientSearch) || p.phone.includes(patientSearch))
    : []

  const availableSlots = selectedDoctor && selectedService
    ? getAvailableSlots(appointmentDate, selectedDoctor.id, selectedService.duration_minutes)
    : []

  const calcEndTime = (start: string, dur: number) => {
    const [h, m] = start.split(':').map(Number)
    const total = h * 60 + m + dur
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }

  const handleCreate = async () => {
    if (!selectedSlot || !selectedDoctor || !selectedService) return
    setCreating(true)
    await new Promise(r => setTimeout(r, 700))
    const patient = selectedPatient || { id: `pat-new-${Date.now()}`, name: newPatient.name, phone: newPatient.phone, patient_type: 'new' as const }
    const appt: Appointment = {
      id: `apt-new-${Date.now()}`,
      clinic_id: 'demo-clinic-001',
      patient_id: patient.id,
      patient_name: patient.name,
      patient_phone: patient.phone,
      patient_type: patient.patient_type,
      doctor_id: selectedDoctor.id,
      doctor_name: selectedDoctor.name,
      service_id: selectedService.id,
      service_name: selectedService.name,
      appointment_date: appointmentDate,
      start_time: selectedSlot,
      end_time: calcEndTime(selectedSlot, selectedService.duration_minutes),
      duration_minutes: selectedService.duration_minutes,
      buffer_minutes: selectedService.buffer_minutes,
      status: selectedService.requires_approval ? 'needs_review' : 'confirmed',
      source: 'manual',
      confirmation_status: 'confirmed',
      message_status: sendWhatsApp ? 'sent' : 'pending',
      calendar_sync_status: 'synced',
      notes: '',
      created_by: 'reception',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    onCreated(appt)
    setCreating(false)
    onClose()
  }

  const STEP_LABEL = ['', 'المريض', 'الخدمة', 'الطبيب', 'الوقت', 'تأكيد']

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', direction: 'rtl' }}>
      <div style={{ background: '#FFFFFF', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: 0 }}>موعد جديد</h2>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={15} style={{ color: '#64748B' }} />
            </button>
          </div>
          {/* Step dots */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {[1,2,3,4,5].map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: s === step ? 28 : 24, height: 24, borderRadius: 20, background: s < step ? '#059669' : s === step ? '#4F46E5' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                  {s < step ? <CheckCircle size={12} style={{ color: 'white' }} /> : <span style={{ fontSize: 11, fontWeight: 800, color: s === step ? 'white' : '#94A3B8' }}>{s}</span>}
                </div>
                <span style={{ fontSize: 11, color: s === step ? '#4F46E5' : '#94A3B8', fontFamily: 'Tajawal, sans-serif', fontWeight: s === step ? 700 : 400, display: s < 5 ? undefined : undefined }}>{STEP_LABEL[s]}</span>
                {s < 5 && <div style={{ width: 20, height: 1, background: s < step ? '#A7F3D0' : '#E2E8F0' }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* Step 1: Patient */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', fontFamily: 'Cairo, sans-serif', display: 'block', marginBottom: 6 }}>ابحث عن مريض موجود</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '9px 12px' }}>
                  <Search size={14} style={{ color: '#94A3B8' }} />
                  <input value={patientSearch} onChange={e => setPatientSearch(e.target.value)} placeholder="اسم المريض أو رقم الجوال..." style={{ border: 'none', background: 'transparent', fontSize: 13, color: '#334155', fontFamily: 'Tajawal, sans-serif', outline: 'none', width: '100%', direction: 'rtl' }} />
                </div>
              </div>
              {filteredPatients.length > 0 && (
                <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
                  {filteredPatients.slice(0, 5).map(p => (
                    <div key={p.id} onClick={() => { setSelectedPatient(p); setPatientSearch(p.name) }} style={{ padding: '10px 14px', cursor: 'pointer', background: selectedPatient?.id === p.id ? '#EEF2FF' : '#FFFFFF', borderBottom: '1px solid #F8FAFC', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #4F46E580, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>{p.name.charAt(0)}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>{p.phone} · {p.total_visits} زيارة</div>
                      </div>
                      {selectedPatient?.id === p.id && <CheckCircle size={14} style={{ color: '#4F46E5', marginRight: 'auto' }} />}
                    </div>
                  ))}
                </div>
              )}
              {selectedPatient && (
                <div style={{ padding: '12px 14px', borderRadius: 8, background: '#EEF2FF', border: '1px solid #C7D2FE', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={15} style={{ color: '#4F46E5' }} />
                  <span style={{ fontSize: 13, color: '#4F46E5', fontWeight: 700, fontFamily: 'Cairo, sans-serif' }}>مريض موجود: {selectedPatient.name}</span>
                </div>
              )}
              {!selectedPatient && patientSearch.length === 0 && (
                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 14 }}>
                  <p style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', marginBottom: 10 }}>أو أضف مريض جديد</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input value={newPatient.name} onChange={e => setNewPatient(p => ({...p, name: e.target.value}))} placeholder="الاسم الكامل" style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', direction: 'rtl' }} />
                    <input value={newPatient.phone} onChange={e => setNewPatient(p => ({...p, phone: e.target.value}))} placeholder="رقم الجوال" style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', direction: 'rtl' }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Service */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: '0 0 4px 0' }}>اختر الخدمة المطلوبة</p>
              {DEMO_SERVICES.filter(s => s.active).map(svc => (
                <div key={svc.id} onClick={() => setSelectedService(svc)} style={{ padding: '14px', borderRadius: 10, border: `2px solid ${selectedService?.id === svc.id ? '#4F46E5' : '#E2E8F0'}`, background: selectedService?.id === svc.id ? '#EEF2FF' : '#FFFFFF', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{svc.name}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2, fontFamily: 'Tajawal, sans-serif' }}>{svc.duration_minutes} دقيقة{svc.buffer_minutes > 0 ? ` + ${svc.buffer_minutes}د buffer` : ''}</div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: svc.price > 0 ? '#0F172A' : '#059669', fontFamily: 'Cairo, sans-serif' }}>{svc.price > 0 ? `${svc.price} ريال` : 'مجاناً'}</div>
                      {svc.requires_approval && <div style={{ fontSize: 10, color: '#C2410C', marginTop: 2, fontFamily: 'Tajawal, sans-serif' }}>يحتاج موافقة</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 3: Doctor */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: '0 0 4px 0' }}>اختر الطبيب</p>
              {DEMO_DOCTORS.filter(d => d.active && d.status !== 'off_today').map(doc => (
                <div key={doc.id} onClick={() => setSelectedDoctor(doc)} style={{ padding: '14px', borderRadius: 10, border: `2px solid ${selectedDoctor?.id === doc.id ? '#4F46E5' : '#E2E8F0'}`, background: selectedDoctor?.id === doc.id ? '#EEF2FF' : '#FFFFFF', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #4F46E580, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User size={16} style={{ color: 'white' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{doc.name}</div>
                    <div style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>{doc.specialty}</div>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 11, color: doc.status === 'available' ? '#059669' : '#B45309', fontFamily: 'Tajawal, sans-serif', fontWeight: 700 }}>
                      {doc.status === 'available' ? 'متاح' : doc.status === 'busy' ? 'مشغول' : 'محجوز'}
                    </div>
                    {doc.next_available && <div style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>متاح: {doc.next_available}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 4: Time Slot */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', fontFamily: 'Cairo, sans-serif', display: 'block', marginBottom: 6 }}>التاريخ</label>
                <input type="date" value={appointmentDate} onChange={e => setAppointmentDate(e.target.value)} style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', width: '100%' }} />
              </div>
              <div>
                <p style={{ fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif', marginBottom: 10 }}>الأوقات المتاحة فقط (لمنع التعارض)</p>
                {availableSlots.length === 0 ? (
                  <div style={{ padding: '16px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <AlertTriangle size={14} style={{ color: '#DC2626' }} />
                    <span style={{ fontSize: 13, color: '#DC2626', fontFamily: 'Tajawal, sans-serif' }}>لا توجد أوقات متاحة لهذا اليوم</span>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {availableSlots.map(slot => (
                      <button key={slot} onClick={() => setSelectedSlot(slot)} style={{ padding: '10px 8px', borderRadius: 8, border: `2px solid ${selectedSlot === slot ? '#4F46E5' : '#E2E8F0'}`, background: selectedSlot === slot ? '#EEF2FF' : '#FFFFFF', color: selectedSlot === slot ? '#4F46E5' : '#475569', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif', transition: 'all 0.15s' }}>
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Confirm */}
          {step === 5 && selectedDoctor && selectedService && selectedSlot && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: '16px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                {[
                  ['المريض', selectedPatient?.name || newPatient.name],
                  ['الطبيب', selectedDoctor.name],
                  ['الخدمة', selectedService.name],
                  ['التاريخ', appointmentDate],
                  ['الوقت', `${selectedSlot} — ${calcEndTime(selectedSlot, selectedService.duration_minutes)}`],
                  ['المدة', `${selectedService.duration_minutes} دقيقة`],
                  ['السعر', selectedService.price > 0 ? `${selectedService.price} ريال` : 'مجاناً'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>{k}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{v}</span>
                  </div>
                ))}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={sendWhatsApp} onChange={e => setSendWhatsApp(e.target.checked)} style={{ width: 16, height: 16 }} />
                <span style={{ fontSize: 13, color: '#334155', fontFamily: 'Tajawal, sans-serif' }}>إرسال تأكيد واتساب للمريض</span>
              </label>
              {selectedService.requires_approval && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FFF7ED', border: '1px solid #FED7AA', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <AlertTriangle size={14} style={{ color: '#C2410C' }} />
                  <span style={{ fontSize: 12, color: '#9A3412', fontFamily: 'Tajawal, sans-serif' }}>هذه الخدمة تحتاج موافقة — سيكون الموعد بحالة "تحتاج مراجعة"</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          {step > 1 ? (
            <button onClick={() => setStep(s => s - 1)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
              <ChevronRight size={15} />
              السابق
            </button>
          ) : <div />}
          {step < 5 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={
                (step === 1 && !selectedPatient && (!newPatient.name || !newPatient.phone)) ||
                (step === 2 && !selectedService) ||
                (step === 3 && !selectedDoctor) ||
                (step === 4 && !selectedSlot)
              }
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, background: '#4F46E5', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif', opacity: ((step === 1 && !selectedPatient && (!newPatient.name || !newPatient.phone)) || (step === 2 && !selectedService) || (step === 3 && !selectedDoctor) || (step === 4 && !selectedSlot)) ? 0.4 : 1 }}
            >
              التالي
              <ChevronLeft size={15} />
            </button>
          ) : (
            <button onClick={handleCreate} disabled={creating} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, background: creating ? '#94A3B8' : '#059669', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer', fontFamily: 'Cairo, sans-serif' }}>
              {creating ? 'جاري الإنشاء...' : 'إنشاء الموعد'}
              {!creating && <CheckCircle size={15} />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
