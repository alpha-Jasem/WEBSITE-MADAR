import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BookOpenCheck, Building2, CalendarClock, Check, ChevronLeft, CircleHelp,
  Clock3, CreditCard, MapPin, Plus, Save, ShieldCheck, Stethoscope, Trash2,
  WalletCards,
} from 'lucide-react'
import { useClinicOS } from '../../../context/ClinicOSContext'
import {
  createDoctor, saveClinicKnowledgeItem, updateDoctor, useClinicDoctors, useClinicKnowledge, useClinicServices,
} from '../../../lib/clinicOSQueries'
import type { Doctor, WorkingHours } from '../../../types/clinicOS'
import { useToast } from '../../../components/clinicOS/ui/Toast'
import './clinic-ai-dashboard.css'

type KnowledgeType = 'clinic' | 'doctors' | 'services' | 'hours' | 'branches' | 'faq' | 'policy' | 'payments'
type DayKey = keyof WorkingHours
type DoctorScheduleDay = { key: DayKey; label: string; enabled: boolean; start: string; end: string; break_start: string; break_end: string }
type Row = Record<string, string | boolean | DoctorScheduleDay[]>
type KnowledgeData = Record<string, string | boolean | Row[]>

const doctorDays: Array<{ key: DayKey; label: string }> = [
  { key: 'sun', label: 'الأحد' }, { key: 'mon', label: 'الاثنين' }, { key: 'tue', label: 'الثلاثاء' },
  { key: 'wed', label: 'الأربعاء' }, { key: 'thu', label: 'الخميس' }, { key: 'fri', label: 'الجمعة' },
  { key: 'sat', label: 'السبت' },
]

const defaultDoctorSchedule = (): DoctorScheduleDay[] => doctorDays.map(day => ({
  ...day, enabled: day.key !== 'fri', start: '09:00', end: '17:00', break_start: '', break_end: '',
}))

const doctorSchedule = (doctor?: Doctor): DoctorScheduleDay[] => {
  const hours = doctor?.working_hours as WorkingHours & { days?: boolean[]; start?: string; end?: string }
  if (Array.isArray(hours?.days)) {
    const legacyOrder: DayKey[] = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri']
    return defaultDoctorSchedule().map(day => ({
      ...day,
      enabled: Boolean(hours.days?.[legacyOrder.indexOf(day.key)]),
      start: hours.start || day.start,
      end: hours.end || day.end,
    }))
  }
  return defaultDoctorSchedule().map(day => {
    const saved = hours?.[day.key]
    return saved ? {
      ...day, enabled: Boolean(saved.open), start: saved.start || day.start, end: saved.end || day.end,
      break_start: saved.break_start || '', break_end: saved.break_end || '',
    } : day
  })
}

const toWorkingHours = (schedule: DoctorScheduleDay[]): WorkingHours => Object.fromEntries(schedule.map(day => [day.key, {
  open: day.enabled,
  start: day.start,
  end: day.end,
  ...(day.break_start ? { break_start: day.break_start } : {}),
  ...(day.break_end ? { break_end: day.break_end } : {}),
}])) as WorkingHours

const sections: Array<{ key: KnowledgeType; label: string; description: string; icon: typeof Building2 }> = [
  { key: 'clinic', label: 'معلومات العيادة', description: 'الهوية ووسائل التواصل والموقع', icon: Building2 },
  { key: 'doctors', label: 'الأطباء', description: 'التخصصات واللغات ومعلومات كل طبيب', icon: Stethoscope },
  { key: 'services', label: 'الخدمات والأسعار', description: 'السعر والمدة وتعليمات الخدمة', icon: WalletCards },
  { key: 'hours', label: 'أوقات العمل', description: 'دوام كل يوم وفترات الاستراحة', icon: CalendarClock },
  { key: 'branches', label: 'الفروع', description: 'العناوين وأرقام التواصل والخرائط', icon: MapPin },
  { key: 'faq', label: 'الأسئلة الشائعة', description: 'إجابات جاهزة للأسئلة المتكررة', icon: CircleHelp },
  { key: 'policy', label: 'سياسة الحجز والإلغاء', description: 'التأخير والإلغاء والعربون وإعادة الجدولة', icon: ShieldCheck },
  { key: 'payments', label: 'طرق الدفع', description: 'وسائل الدفع والتأمين والتقسيط', icon: CreditCard },
]

const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const paymentOptions = ['نقدي', 'مدى', 'Visa', 'Mastercard', 'Apple Pay', 'STC Pay', 'تحويل بنكي', 'تأمين طبي', 'تقسيط']

const emptyRow = (type: KnowledgeType): Row => {
  if (type === 'doctors') return { id: '', name: '', specialty: '', languages: 'العربية', gender: '', notes: '', max_appointments: '12', emergency_slots: '1', schedule: defaultDoctorSchedule() }
  if (type === 'services') return { name: '', price: '', duration: '', doctor: '', preparation: '', description: '' }
  if (type === 'branches') return { name: '', city: '', address: '', phone: '', maps_url: '' }
  if (type === 'faq') return { question: '', answer: '' }
  return {}
}

const defaults = (type: KnowledgeType, clinicName: string): KnowledgeData => {
  if (type === 'clinic') return { name: clinicName || '', specialty: '', description: '', phone: '', whatsapp: '', email: '', website: '', address: '', maps_url: '' }
  if (type === 'hours') return { rows: days.map(day => ({ day, enabled: day !== 'الجمعة', open: '09:00', close: '21:00', break_from: '', break_to: '' })) }
  if (type === 'policy') return { cancellation_hours: '24', late_minutes: '15', deposit_required: false, deposit_amount: '', reschedule_count: '1', no_show_policy: '', cancellation_policy: '', notes: '' }
  if (type === 'payments') return { methods: paymentOptions.map(name => ({ name, enabled: ['نقدي', 'مدى', 'Visa', 'Mastercard'].includes(name) })), insurance_providers: '', installment_details: '', notes: '' }
  return { rows: [] }
}

const hasMetadata = (value: unknown): value is KnowledgeData => Boolean(value && typeof value === 'object' && Object.keys(value as object).length)

function readableContent(type: KnowledgeType, data: KnowledgeData) {
  const value = (key: string) => String(data[key] || '').trim()
  const rows = (data.rows as Row[] || []).filter(row => Object.values(row).some(Boolean))
  if (type === 'clinic') return [
    ['اسم العيادة', value('name')], ['التخصص العام', value('specialty')], ['نبذة', value('description')],
    ['الهاتف', value('phone')], ['واتساب', value('whatsapp')], ['البريد', value('email')],
    ['الموقع الإلكتروني', value('website')], ['العنوان', value('address')], ['رابط الخريطة', value('maps_url')],
  ].filter(([, val]) => val).map(([label, val]) => `${label}: ${val}`).join('\n')
  if (type === 'hours') return rows.map(row => row.enabled ? `${row.day}: ${row.open} - ${row.close}${row.break_from ? `، استراحة ${row.break_from} - ${row.break_to}` : ''}` : `${row.day}: مغلق`).join('\n')
  if (type === 'doctors') return rows.map(row => {
    const schedule = (row.schedule as DoctorScheduleDay[] || []).map(day => day.enabled
      ? `${day.label} ${day.start}-${day.end}${day.break_start ? ` (استراحة ${day.break_start}-${day.break_end})` : ''}`
      : `${day.label} مغلق`).join('، ')
    return `${row.name} — ${row.specialty}${row.languages ? ` — اللغات: ${row.languages}` : ''} — جدول الحجز: ${schedule}${row.notes ? ` — ${row.notes}` : ''}`
  }).join('\n')
  if (type === 'services') return rows.map(row => `${row.name} — ${row.price || 'السعر غير محدد'} ر.س — ${row.duration || 'المدة غير محددة'} دقيقة${row.doctor ? ` — ${row.doctor}` : ''}${row.preparation ? ` — التحضير: ${row.preparation}` : ''}`).join('\n')
  if (type === 'branches') return rows.map(row => `${row.name} — ${row.city} — ${row.address} — ${row.phone}${row.maps_url ? ` — ${row.maps_url}` : ''}`).join('\n')
  if (type === 'faq') return rows.map(row => `س: ${row.question}\nج: ${row.answer}`).join('\n\n')
  if (type === 'policy') return `الإلغاء قبل الموعد: ${value('cancellation_hours')} ساعة\nمهلة التأخير: ${value('late_minutes')} دقيقة\nالعربون: ${data.deposit_required ? `${value('deposit_amount')} ر.س` : 'غير مطلوب'}\nمرات إعادة الجدولة: ${value('reschedule_count')}\nسياسة عدم الحضور: ${value('no_show_policy')}\nسياسة الإلغاء: ${value('cancellation_policy')}\nملاحظات: ${value('notes')}`
  const methods = (data.methods as Row[] || []).filter(row => row.enabled).map(row => row.name).join('، ')
  return `طرق الدفع المتاحة: ${methods || 'غير محددة'}\nشركات التأمين: ${value('insurance_providers')}\nتفاصيل التقسيط: ${value('installment_details')}\nملاحظات: ${value('notes')}`
}

export const KnowledgeCenterPage = () => {
  const [searchParams] = useSearchParams()
  const { companyId, isDemo, clinicName } = useClinicOS()
  const { showToast } = useToast()
  const requestedSection = searchParams.get('section') as KnowledgeType | null
  const [tab, setTab] = useState<KnowledgeType>(sections.some(section => section.key === requestedSection) ? requestedSection! : 'clinic')
  const [draft, setDraft] = useState<KnowledgeData>(() => defaults('clinic', clinicName || ''))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const { data: items = [], loading, refetch } = useClinicKnowledge(companyId, isDemo)
  const { data: doctors = [], refetch: refetchDoctors } = useClinicDoctors(companyId, isDemo)
  const { data: services = [] } = useClinicServices(companyId, isDemo)
  const item = items.find(entry => entry.type === tab)
  const section = sections.find(entry => entry.key === tab)!
  const SectionIcon = section.icon
  const completed = useMemo(() => sections.filter(entry => {
    const saved = items.find(item => item.type === entry.key)
    return hasMetadata(saved?.metadata) || Boolean(saved?.content?.trim())
  }).length, [items])

  useEffect(() => {
    let next = hasMetadata(item?.metadata) ? item.metadata : defaults(tab, clinicName || '')
    if (tab === 'doctors' && doctors.length) {
      const savedRows = hasMetadata(item?.metadata) ? (item.metadata.rows as Row[] || []) : []
      const linked = doctors.map(doctor => {
        const saved = savedRows.find(row => row.id === doctor.id || row.name === doctor.name)
        return {
          ...(saved || {}), id: doctor.id, name: doctor.name || '', specialty: doctor.specialty || '',
          languages: String(saved?.languages || 'العربية'), gender: String(saved?.gender || ''), notes: String(saved?.notes || ''),
          max_appointments: String(doctor.max_appointments_per_day || 12), emergency_slots: String(doctor.emergency_slots_per_day || 0),
          schedule: doctorSchedule(doctor),
        }
      })
      const unlinked = savedRows.filter(row => !doctors.some(doctor => row.id === doctor.id || row.name === doctor.name))
      next = { rows: [...linked, ...unlinked] }
    }
    if (!hasMetadata(item?.metadata) && tab === 'services' && services.length) {
      next = { rows: services.map(service => ({ name: service.name || '', price: String(service.price || ''), duration: String(service.duration_minutes || ''), doctor: '', preparation: '', description: '' })) }
    }
    setDraft(next)
    setDirty(false)
  }, [tab, item?.id, item?.updated_at, clinicName, doctors, services])

  const patch = (key: string, value: string | boolean | Row[]) => { setDraft(current => ({ ...current, [key]: value })); setDirty(true) }
  const rows = (draft.rows as Row[] || [])
  const updateRow = (index: number, key: string, value: string | boolean | DoctorScheduleDay[]) => patch('rows', rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row))
  const addRow = () => patch('rows', [...rows, emptyRow(tab)])
  const removeRow = (index: number) => patch('rows', rows.filter((_, rowIndex) => rowIndex !== index))

  const save = async () => {
    if (!companyId || isDemo) return showToast('نسخة العرض لا تحفظ تغييرات فعلية', 'error')
    setSaving(true)
    try {
      let dataToSave = draft
      if (tab === 'doctors') {
        const syncedRows: Row[] = []
        for (const row of rows) {
          if (!String(row.name || '').trim() || !String(row.specialty || '').trim()) continue
          const payload: Partial<Doctor> = {
            clinic_id: companyId,
            name: String(row.name),
            specialty: String(row.specialty),
            active: true,
            is_available: true,
            max_appointments_per_day: Number(row.max_appointments) || 12,
            emergency_slots_per_day: Number(row.emergency_slots) || 0,
            working_hours: toWorkingHours((row.schedule as DoctorScheduleDay[]) || defaultDoctorSchedule()),
          }
          const savedDoctor = row.id ? await updateDoctor(String(row.id), payload) : await createDoctor(payload)
          syncedRows.push({ ...row, id: savedDoctor.id, schedule: doctorSchedule({ ...savedDoctor, working_hours: payload.working_hours } as Doctor) })
        }
        dataToSave = { ...draft, rows: syncedRows }
      }
      await saveClinicKnowledgeItem({ id: item?.id, company_id: companyId, type: tab, title: section.label, content: readableContent(tab, dataToSave), metadata: dataToSave })
      if (tab === 'doctors') await refetchDoctors()
      await refetch()
      setDirty(false)
      showToast('تم تحديث معرفة موظف الاستقبال الذكي', 'success')
    } catch {
      showToast('تعذر حفظ المعلومات', 'error')
    } finally { setSaving(false) }
  }

  return <div className="clinic-ai-page clinic-knowledge-page">
    <div className="clinic-ai-header knowledge-heading">
      <div><h1>مركز المعرفة</h1><p>بيانات منظمة يعتمد عليها موظف الاستقبال الذكي للإجابة بدقة، بدون تخمين.</p></div>
      <div className="knowledge-progress"><div><span>جاهزية المعرفة</span><strong>{completed} من {sections.length}</strong></div><div className="clinic-progress"><span style={{ width: `${completed / sections.length * 100}%` }}/></div></div>
    </div>
    <div className="knowledge-shell">
      <nav className="clinic-card knowledge-nav" aria-label="أقسام مركز المعرفة">
        {sections.map(({ key, label, description, icon: Icon }) => {
          const ready = items.some(item => item.type === key && (hasMetadata(item.metadata) || item.content?.trim()))
          return <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
            <span className="knowledge-nav-icon"><Icon size={17}/></span><span><strong>{label}</strong><small>{description}</small></span>
            {ready ? <Check size={16} className="knowledge-ready"/> : <ChevronLeft size={16}/>} 
          </button>
        })}
      </nav>
      <main className="clinic-card knowledge-editor-panel">
        <header className="knowledge-editor-head"><div><span className="knowledge-editor-icon"><SectionIcon size={20}/></span><div><h2>{section.label}</h2><p>{section.description}</p></div></div><button className="clinic-action" onClick={save} disabled={saving || !dirty}><Save size={15}/>{saving ? 'جاري الحفظ...' : dirty ? 'حفظ ونشر للموظف الذكي' : 'تم الحفظ'}</button></header>
        {loading ? <div className="knowledge-loading"><Clock3 size={22}/><span>جاري تحميل بيانات العيادة...</span></div> : <KnowledgeForm type={tab} data={draft} patch={patch} rows={rows} updateRow={updateRow} addRow={addRow} removeRow={removeRow}/>} 
        <footer className="knowledge-safe-note"><BookOpenCheck size={17}/><span><strong>مصدر موثوق للموظف الذكي</strong> لن يستخدم النظام معلومة غير محفوظة هنا أو في بيانات الحجز الفعلية.</span></footer>
      </main>
    </div>
  </div>
}

function KnowledgeForm({ type, data, patch, rows, updateRow, addRow, removeRow }: { type: KnowledgeType; data: KnowledgeData; patch: (key: string, value: string | boolean | Row[]) => void; rows: Row[]; updateRow: (index: number, key: string, value: string | boolean | DoctorScheduleDay[]) => void; addRow: () => void; removeRow: (index: number) => void }) {
  if (type === 'clinic') return <div className="knowledge-form-grid"><Field label="اسم العيادة" value={data.name} onChange={v => patch('name', v)} required/><Field label="التخصص العام" value={data.specialty} onChange={v => patch('specialty', v)} placeholder="مثال: طب الأسنان"/><Field label="رقم الهاتف" value={data.phone} onChange={v => patch('phone', v)} dir="ltr"/><Field label="رقم واتساب" value={data.whatsapp} onChange={v => patch('whatsapp', v)} dir="ltr"/><Field label="البريد الإلكتروني" value={data.email} onChange={v => patch('email', v)} dir="ltr"/><Field label="الموقع الإلكتروني" value={data.website} onChange={v => patch('website', v)} dir="ltr"/><Field label="العنوان" value={data.address} onChange={v => patch('address', v)} wide/><Field label="رابط Google Maps" value={data.maps_url} onChange={v => patch('maps_url', v)} dir="ltr" wide/><TextField label="نبذة مختصرة عن العيادة" value={data.description} onChange={v => patch('description', v)} wide/></div>
  if (type === 'hours') return <div className="knowledge-hours">{rows.map((row, index) => <div className={`knowledge-hours-row ${row.enabled ? '' : 'closed'}`} key={String(row.day)}><label className="knowledge-switch"><input type="checkbox" checked={Boolean(row.enabled)} onChange={e => updateRow(index, 'enabled', e.target.checked)}/><span/></label><strong>{row.day}</strong>{row.enabled ? <><TimeInput label="يفتح" value={row.open} onChange={v => updateRow(index, 'open', v)}/><TimeInput label="يغلق" value={row.close} onChange={v => updateRow(index, 'close', v)}/><TimeInput label="بداية الاستراحة" value={row.break_from} onChange={v => updateRow(index, 'break_from', v)}/><TimeInput label="نهاية الاستراحة" value={row.break_to} onChange={v => updateRow(index, 'break_to', v)}/></> : <span className="clinic-badge">مغلق</span>}</div>)}</div>
  if (type === 'policy') return <div className="knowledge-form-grid"><Field label="الإلغاء قبل الموعد (ساعة)" value={data.cancellation_hours} onChange={v => patch('cancellation_hours', v)} type="number"/><Field label="مهلة التأخير (دقيقة)" value={data.late_minutes} onChange={v => patch('late_minutes', v)} type="number"/><Field label="عدد مرات إعادة الجدولة" value={data.reschedule_count} onChange={v => patch('reschedule_count', v)} type="number"/><ToggleField label="يتطلب عربون" checked={Boolean(data.deposit_required)} onChange={v => patch('deposit_required', v)}/>{data.deposit_required && <Field label="قيمة العربون (ر.س)" value={data.deposit_amount} onChange={v => patch('deposit_amount', v)} type="number"/>}<TextField label="سياسة الإلغاء" value={data.cancellation_policy} onChange={v => patch('cancellation_policy', v)} wide/><TextField label="سياسة عدم الحضور" value={data.no_show_policy} onChange={v => patch('no_show_policy', v)} wide/><TextField label="ملاحظات إضافية" value={data.notes} onChange={v => patch('notes', v)} wide/></div>
  if (type === 'payments') return <><div className="knowledge-payment-grid">{(data.methods as Row[] || []).map((method, index) => <label className={method.enabled ? 'selected' : ''} key={String(method.name)}><input type="checkbox" checked={Boolean(method.enabled)} onChange={e => patch('methods', (data.methods as Row[]).map((row, rowIndex) => rowIndex === index ? { ...row, enabled: e.target.checked } : row))}/><CreditCard size={18}/><span>{method.name}</span><Check size={15}/></label>)}</div><div className="knowledge-form-grid knowledge-subform"><TextField label="شركات التأمين المقبولة" value={data.insurance_providers} onChange={v => patch('insurance_providers', v)} placeholder="اكتب أسماء الشركات مفصولة بفاصلة" wide/><TextField label="تفاصيل التقسيط" value={data.installment_details} onChange={v => patch('installment_details', v)} wide/><TextField label="ملاحظات الدفع" value={data.notes} onChange={v => patch('notes', v)} wide/></div></>
  return <Repeater type={type} rows={rows} updateRow={updateRow} addRow={addRow} removeRow={removeRow}/>
}

function Repeater({ type, rows, updateRow, addRow, removeRow }: { type: KnowledgeType; rows: Row[]; updateRow: (index: number, key: string, value: string | boolean | DoctorScheduleDay[]) => void; addRow: () => void; removeRow: (index: number) => void }) {
  const labels: Record<string, string> = { doctors: 'إضافة طبيب', services: 'إضافة خدمة', branches: 'إضافة فرع', faq: 'إضافة سؤال' }
  return <div className="knowledge-repeater">{type === 'doctors' && <div className="doctor-source-note"><CalendarClock size={18}/><span><strong>مصدر مواعيد الحجز الذكي</strong>أي تعديل هنا يغيّر الأوقات التي يقترحها موظف الاستقبال عبر واتساب والمكالمات.</span></div>}{rows.map((row, index) => <article className={`knowledge-row-card ${type === 'doctors' ? 'doctor-knowledge-card' : ''}`} key={String(row.id || index)}><header><strong>{type === 'doctors' ? row.name || `طبيب ${index + 1}` : type === 'services' ? row.name || `خدمة ${index + 1}` : type === 'branches' ? row.name || `فرع ${index + 1}` : row.question || `سؤال ${index + 1}`}</strong>{type !== 'doctors' && <button onClick={() => removeRow(index)} aria-label="حذف"><Trash2 size={15}/></button>}</header><div className="knowledge-form-grid">{type === 'doctors' && <><Field label="اسم الطبيب" value={row.name} onChange={v => updateRow(index, 'name', v)} required/><Field label="التخصص" value={row.specialty} onChange={v => updateRow(index, 'specialty', v)} required/><Field label="اللغات" value={row.languages} onChange={v => updateRow(index, 'languages', v)}/><Field label="الجنس المفضل في الرد" value={row.gender} onChange={v => updateRow(index, 'gender', v)} placeholder="اختياري"/><Field label="أقصى مواعيد يومياً" value={row.max_appointments} onChange={v => updateRow(index, 'max_appointments', v)} type="number"/><Field label="مواعيد الطوارئ يومياً" value={row.emergency_slots} onChange={v => updateRow(index, 'emergency_slots', v)} type="number"/><TextField label="معلومات مهمة للمرضى" value={row.notes} onChange={v => updateRow(index, 'notes', v)} wide/><DoctorSchedule schedule={(row.schedule as DoctorScheduleDay[]) || defaultDoctorSchedule()} onChange={schedule => updateRow(index, 'schedule', schedule)}/></>}{type === 'services' && <><Field label="اسم الخدمة" value={row.name} onChange={v => updateRow(index, 'name', v)} required/><Field label="السعر شامل الضريبة" value={row.price} onChange={v => updateRow(index, 'price', v)} type="number"/><Field label="المدة بالدقائق" value={row.duration} onChange={v => updateRow(index, 'duration', v)} type="number"/><Field label="الطبيب أو التخصص" value={row.doctor} onChange={v => updateRow(index, 'doctor', v)}/><TextField label="تعليمات ما قبل الموعد" value={row.preparation} onChange={v => updateRow(index, 'preparation', v)} wide/><TextField label="وصف مختصر" value={row.description} onChange={v => updateRow(index, 'description', v)} wide/></>}{type === 'branches' && <><Field label="اسم الفرع" value={row.name} onChange={v => updateRow(index, 'name', v)} required/><Field label="المدينة" value={row.city} onChange={v => updateRow(index, 'city', v)}/><Field label="رقم التواصل" value={row.phone} onChange={v => updateRow(index, 'phone', v)} dir="ltr"/><Field label="العنوان" value={row.address} onChange={v => updateRow(index, 'address', v)}/><Field label="رابط Google Maps" value={row.maps_url} onChange={v => updateRow(index, 'maps_url', v)} dir="ltr" wide/></>}{type === 'faq' && <><Field label="السؤال" value={row.question} onChange={v => updateRow(index, 'question', v)} wide required/><TextField label="الإجابة المعتمدة" value={row.answer} onChange={v => updateRow(index, 'answer', v)} wide/></>}</div></article>)}<button className="knowledge-add-row" onClick={addRow}><Plus size={17}/>{labels[type] || 'إضافة'}</button></div>
}

function DoctorSchedule({ schedule, onChange }: { schedule: DoctorScheduleDay[]; onChange: (schedule: DoctorScheduleDay[]) => void }) {
  const update = (index: number, patch: Partial<DoctorScheduleDay>) => onChange(schedule.map((day, dayIndex) => dayIndex === index ? { ...day, ...patch } : day))
  return <div className="doctor-schedule-editor"><div className="doctor-schedule-title"><CalendarClock size={17}/><div><strong>جدول الحجز الأسبوعي</strong><span>لن يعرض الحجز الذكي وقتاً خارج هذه الفترات أو أثناء الاستراحة.</span></div></div>{schedule.map((day, index) => <div className={`doctor-schedule-row ${day.enabled ? '' : 'closed'}`} key={day.key}><label className="knowledge-switch"><input type="checkbox" checked={day.enabled} onChange={event => update(index, { enabled: event.target.checked })}/><span/></label><strong>{day.label}</strong>{day.enabled ? <><TimeInput label="من" value={day.start} onChange={value => update(index, { start: value })}/><TimeInput label="إلى" value={day.end} onChange={value => update(index, { end: value })}/><TimeInput label="بداية الاستراحة" value={day.break_start} onChange={value => update(index, { break_start: value })}/><TimeInput label="نهاية الاستراحة" value={day.break_end} onChange={value => update(index, { break_end: value })}/></> : <span className="clinic-badge">إجازة</span>}</div>)}</div>
}

function Field({ label, value, onChange, placeholder = '', type = 'text', wide = false, required = false, dir }: { label: string; value: unknown; onChange: (value: string) => void; placeholder?: string; type?: string; wide?: boolean; required?: boolean; dir?: 'ltr' | 'rtl' }) { return <label className={`clinic-field ${wide ? 'wide' : ''}`}><span>{label}{required && <b> *</b>}</span><input type={type} value={String(value || '')} onChange={e => onChange(e.target.value)} placeholder={placeholder} dir={dir}/></label> }
function TextField({ label, value, onChange, placeholder = '', wide = false }: { label: string; value: unknown; onChange: (value: string) => void; placeholder?: string; wide?: boolean }) { return <label className={`clinic-field ${wide ? 'wide' : ''}`}><span>{label}</span><textarea value={String(value || '')} onChange={e => onChange(e.target.value)} placeholder={placeholder}/></label> }
function TimeInput({ label, value, onChange }: { label: string; value: unknown; onChange: (value: string) => void }) { return <label><span>{label}</span><input type="time" value={String(value || '')} onChange={e => onChange(e.target.value)}/></label> }
function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="knowledge-toggle-field"><span>{label}</span><span className="knowledge-switch"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}/><span/></span></label> }
