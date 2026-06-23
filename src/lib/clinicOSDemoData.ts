import type {
  Clinic, Patient, Doctor, Service, Appointment,
  MessageLog, AICallLog, Waitlist, DashboardStats
} from '../types/clinicOS'

const TODAY = new Date().toISOString().split('T')[0]
const YESTERDAY = new Date(Date.now() - 86400000).toISOString().split('T')[0]
const TOMORROW = new Date(Date.now() + 86400000).toISOString().split('T')[0]
const D2 = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0]
const D3 = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0]
const D4 = new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0]
const D5 = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0]

export const DEMO_CLINIC: Clinic = {
  id: 'demo-clinic-001',
  name: 'عيادات نور للأسنان',
  phone: '0112345678',
  email: 'info@noor-dental.sa',
  city: 'جدة',
  address: 'حي الروضة، شارع الأمير سلطان، جدة',
  package_type: 'ai_pro',
  working_hours: {
    sun: { open: true, start: '09:00', end: '21:00', break_start: '13:00', break_end: '16:00' },
    mon: { open: true, start: '09:00', end: '21:00', break_start: '13:00', break_end: '16:00' },
    tue: { open: true, start: '09:00', end: '21:00', break_start: '13:00', break_end: '16:00' },
    wed: { open: true, start: '09:00', end: '21:00', break_start: '13:00', break_end: '16:00' },
    thu: { open: true, start: '09:00', end: '21:00', break_start: '13:00', break_end: '16:00' },
    fri: { open: false, start: '16:00', end: '21:00' },
    sat: { open: true, start: '10:00', end: '18:00' },
  },
  created_at: '2024-01-01T00:00:00Z',
}

export const DEMO_DOCTORS: Doctor[] = [
  {
    id: 'doc-001', clinic_id: 'demo-clinic-001',
    name: 'د. سارة الحربي', specialty: 'طب الأسنان العام',
    active: true, is_available: true, max_appointments_per_day: 14, emergency_slots_per_day: 2,
    working_hours: {
      sun: { open: true, start: '09:00', end: '17:00' },
      mon: { open: true, start: '09:00', end: '17:00' },
      tue: { open: true, start: '09:00', end: '17:00' },
      wed: { open: true, start: '09:00', end: '17:00' },
      thu: { open: true, start: '09:00', end: '17:00' },
    },
    appointments_today: 8, status: 'busy', next_available: '14:30',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'doc-002', clinic_id: 'demo-clinic-001',
    name: 'د. أحمد الزهراني', specialty: 'طب الأسنان العام',
    active: true, is_available: true, max_appointments_per_day: 12, emergency_slots_per_day: 1,
    working_hours: {
      sun: { open: true, start: '16:00', end: '21:00' },
      mon: { open: true, start: '16:00', end: '21:00' },
      tue: { open: true, start: '16:00', end: '21:00' },
      wed: { open: true, start: '16:00', end: '21:00' },
      thu: { open: true, start: '16:00', end: '21:00' },
    },
    appointments_today: 5, status: 'available', next_available: '16:30',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'doc-003', clinic_id: 'demo-clinic-001',
    name: 'د. نورة القحطاني', specialty: 'تقويم الأسنان',
    active: true, is_available: true, max_appointments_per_day: 10, emergency_slots_per_day: 0,
    working_hours: {
      sun: { open: true, start: '09:00', end: '14:00' },
      tue: { open: true, start: '09:00', end: '14:00' },
      thu: { open: true, start: '09:00', end: '14:00' },
    },
    appointments_today: 4, status: 'fully_booked', next_available: null as any,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'doc-004', clinic_id: 'demo-clinic-001',
    name: 'د. خالد العمري', specialty: 'جراحة الفم',
    active: true, is_available: true, max_appointments_per_day: 8, emergency_slots_per_day: 2,
    working_hours: {
      mon: { open: true, start: '10:00', end: '18:00' },
      wed: { open: true, start: '10:00', end: '18:00' },
      sat: { open: true, start: '10:00', end: '16:00' },
    },
    appointments_today: 0, status: 'off_today', next_available: 'غداً 10:00',
    created_at: '2024-01-01T00:00:00Z',
  },
]

export const DEMO_SERVICES: Service[] = [
  {
    id: 'svc-001', clinic_id: 'demo-clinic-001', name: 'كشف عام',
    category: 'فحص', duration_minutes: 30, buffer_minutes: 5, price: 150,
    active: true, available_for_whatsapp: true, available_for_ai: true, requires_approval: false,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'svc-002', clinic_id: 'demo-clinic-001', name: 'تنظيف الأسنان',
    category: 'وقاية', duration_minutes: 45, buffer_minutes: 10, price: 250,
    active: true, available_for_whatsapp: true, available_for_ai: true, requires_approval: false,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'svc-003', clinic_id: 'demo-clinic-001', name: 'استشارة تقويم',
    category: 'تقويم', duration_minutes: 60, buffer_minutes: 15, price: 300,
    required_specialty: 'تقويم الأسنان', allowed_doctor_ids: ['doc-003'],
    active: true, available_for_whatsapp: true, available_for_ai: false, requires_approval: false,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'svc-004', clinic_id: 'demo-clinic-001', name: 'متابعة',
    category: 'متابعة', duration_minutes: 15, buffer_minutes: 5, price: 0,
    active: true, available_for_whatsapp: true, available_for_ai: true, requires_approval: false,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'svc-005', clinic_id: 'demo-clinic-001', name: 'حالة طارئة',
    category: 'طوارئ', duration_minutes: 30, buffer_minutes: 0, price: 200,
    active: true, available_for_whatsapp: false, available_for_ai: false, requires_approval: true,
    created_at: '2024-01-01T00:00:00Z',
  },
]

export const DEMO_PATIENTS: Patient[] = [
  { id: 'pat-001', clinic_id: 'demo-clinic-001', name: 'محمد القحطاني', phone: '0501234567', patient_type: 'returning', tags: ['returning'], no_show_count: 0, total_visits: 7, last_visit_at: YESTERDAY, created_at: D5 },
  { id: 'pat-002', clinic_id: 'demo-clinic-001', name: 'عائشة المطيري', phone: '0502345678', patient_type: 'returning', tags: ['returning', 'vip'], no_show_count: 0, total_visits: 12, last_visit_at: D3, created_at: '2023-06-01T00:00:00Z' },
  { id: 'pat-003', clinic_id: 'demo-clinic-001', name: 'سامي العنزي', phone: '0503456789', patient_type: 'new', tags: ['new_patient'], no_show_count: 0, total_visits: 1, last_visit_at: TODAY, created_at: TODAY },
  { id: 'pat-004', clinic_id: 'demo-clinic-001', name: 'نورة الدوسري', phone: '0504567890', patient_type: 'returning', tags: ['returning', 'high_no_show'], no_show_count: 2, total_visits: 5, last_visit_at: D5, created_at: '2023-09-01T00:00:00Z' },
  { id: 'pat-005', clinic_id: 'demo-clinic-001', name: 'فهد الشمري', phone: '0505678901', patient_type: 'returning', tags: ['returning'], no_show_count: 0, total_visits: 3, last_visit_at: TODAY, created_at: D4 },
  { id: 'pat-006', clinic_id: 'demo-clinic-001', name: 'ليلى الغامدي', phone: '0506789012', patient_type: 'new', tags: ['new_patient'], no_show_count: 0, total_visits: 1, last_visit_at: TODAY, created_at: TODAY },
  { id: 'pat-007', clinic_id: 'demo-clinic-001', name: 'عبدالعزيز الفهد', phone: '0507890123', patient_type: 'returning', tags: ['returning'], no_show_count: 1, total_visits: 4, last_visit_at: D2, created_at: '2023-11-01T00:00:00Z' },
  { id: 'pat-008', clinic_id: 'demo-clinic-001', name: 'منى الزهراني', phone: '0508901234', patient_type: 'returning', tags: ['returning', 'vip', 'whatsapp_only'], no_show_count: 0, total_visits: 9, last_visit_at: D3, created_at: '2023-05-01T00:00:00Z' },
  { id: 'pat-009', clinic_id: 'demo-clinic-001', name: 'خالد الرشيد', phone: '0509012345', patient_type: 'new', tags: ['new_patient'], no_show_count: 0, total_visits: 1, last_visit_at: YESTERDAY, created_at: YESTERDAY },
  { id: 'pat-010', clinic_id: 'demo-clinic-001', name: 'سلمى البقمي', phone: '0501123456', patient_type: 'returning', tags: ['returning', 'needs_followup'], no_show_count: 0, total_visits: 6, last_visit_at: D4, created_at: '2023-08-01T00:00:00Z' },
  { id: 'pat-011', clinic_id: 'demo-clinic-001', name: 'بدر الحربي', phone: '0502234567', patient_type: 'returning', tags: ['returning'], no_show_count: 0, total_visits: 2, last_visit_at: D2, created_at: D5 },
  { id: 'pat-012', clinic_id: 'demo-clinic-001', name: 'رنا الشهري', phone: '0503345678', patient_type: 'new', tags: ['new_patient'], no_show_count: 0, total_visits: 1, last_visit_at: TODAY, created_at: TODAY },
  { id: 'pat-013', clinic_id: 'demo-clinic-001', name: 'يوسف العتيبي', phone: '0504456789', patient_type: 'returning', tags: ['returning'], no_show_count: 0, total_visits: 8, last_visit_at: YESTERDAY, created_at: '2023-07-01T00:00:00Z' },
  { id: 'pat-014', clinic_id: 'demo-clinic-001', name: 'دانة السلمي', phone: '0505567890', patient_type: 'returning', tags: ['returning', 'high_no_show'], no_show_count: 3, total_visits: 5, last_visit_at: D5, created_at: '2023-10-01T00:00:00Z' },
  { id: 'pat-015', clinic_id: 'demo-clinic-001', name: 'عمر الحمدان', phone: '0506678901', patient_type: 'new', tags: ['new_patient'], no_show_count: 0, total_visits: 1, last_visit_at: TODAY, created_at: TODAY },
  { id: 'pat-016', clinic_id: 'demo-clinic-001', name: 'أسماء الجهني', phone: '0507789012', patient_type: 'returning', tags: ['returning'], no_show_count: 0, total_visits: 3, last_visit_at: D3, created_at: '2024-01-15T00:00:00Z' },
  { id: 'pat-017', clinic_id: 'demo-clinic-001', name: 'تركي الدوسري', phone: '0508890123', patient_type: 'returning', tags: ['returning'], no_show_count: 1, total_visits: 4, last_visit_at: D2, created_at: '2023-12-01T00:00:00Z' },
  { id: 'pat-018', clinic_id: 'demo-clinic-001', name: 'هنوف القرشي', phone: '0509901234', patient_type: 'new', tags: ['new_patient'], no_show_count: 0, total_visits: 1, last_visit_at: TODAY, created_at: TODAY },
  { id: 'pat-019', clinic_id: 'demo-clinic-001', name: 'فيصل الزيد', phone: '0501234890', patient_type: 'returning', tags: ['returning', 'payment_pending'], no_show_count: 0, total_visits: 5, last_visit_at: D4, created_at: '2023-09-15T00:00:00Z' },
  { id: 'pat-020', clinic_id: 'demo-clinic-001', name: 'ريم المالكي', phone: '0502345901', patient_type: 'returning', tags: ['returning'], no_show_count: 0, total_visits: 2, last_visit_at: D3, created_at: '2024-02-01T00:00:00Z' },
]

export const DEMO_APPOINTMENTS: Appointment[] = [
  // Today's appointments
  { id: 'apt-001', clinic_id: 'demo-clinic-001', patient_id: 'pat-001', patient_name: 'محمد القحطاني', patient_phone: '0501234567', patient_type: 'returning', doctor_id: 'doc-001', doctor_name: 'د. سارة الحربي', service_id: 'svc-001', service_name: 'كشف عام', appointment_date: TODAY, start_time: '09:00', end_time: '09:35', duration_minutes: 30, buffer_minutes: 5, status: 'completed', source: 'whatsapp', confirmation_status: 'confirmed', message_status: 'read', calendar_sync_status: 'synced', notes: '', created_by: 'reception', created_at: YESTERDAY + 'T10:00:00Z', updated_at: TODAY + 'T09:35:00Z' },
  { id: 'apt-002', clinic_id: 'demo-clinic-001', patient_id: 'pat-002', patient_name: 'عائشة المطيري', patient_phone: '0502345678', patient_type: 'returning', doctor_id: 'doc-001', doctor_name: 'د. سارة الحربي', service_id: 'svc-002', service_name: 'تنظيف الأسنان', appointment_date: TODAY, start_time: '09:40', end_time: '10:35', duration_minutes: 45, buffer_minutes: 10, status: 'checked_in', source: 'ai_booking', confirmation_status: 'confirmed', message_status: 'read', calendar_sync_status: 'synced', notes: '', created_by: 'ai', created_at: D2 + 'T14:00:00Z', updated_at: TODAY + 'T09:38:00Z' },
  { id: 'apt-003', clinic_id: 'demo-clinic-001', patient_id: 'pat-003', patient_name: 'سامي العنزي', patient_phone: '0503456789', patient_type: 'new', doctor_id: 'doc-001', doctor_name: 'د. سارة الحربي', service_id: 'svc-001', service_name: 'كشف عام', appointment_date: TODAY, start_time: '10:40', end_time: '11:15', duration_minutes: 30, buffer_minutes: 5, status: 'confirmed', source: 'website', confirmation_status: 'confirmed', message_status: 'delivered', calendar_sync_status: 'synced', notes: 'مريض جديد', created_by: 'reception', created_at: D3 + 'T09:00:00Z', updated_at: D3 + 'T09:00:00Z' },
  { id: 'apt-004', clinic_id: 'demo-clinic-001', patient_id: 'pat-004', patient_name: 'نورة الدوسري', patient_phone: '0504567890', patient_type: 'returning', doctor_id: 'doc-003', doctor_name: 'د. نورة القحطاني', service_id: 'svc-003', service_name: 'استشارة تقويم', appointment_date: TODAY, start_time: '09:00', end_time: '10:15', duration_minutes: 60, buffer_minutes: 15, status: 'confirmed', source: 'whatsapp', confirmation_status: 'confirmed', message_status: 'read', calendar_sync_status: 'synced', notes: '', created_by: 'reception', created_at: D4 + 'T11:00:00Z', updated_at: D4 + 'T11:00:00Z' },
  { id: 'apt-005', clinic_id: 'demo-clinic-001', patient_id: 'pat-005', patient_name: 'فهد الشمري', patient_phone: '0505678901', patient_type: 'returning', doctor_id: 'doc-001', doctor_name: 'د. سارة الحربي', service_id: 'svc-004', service_name: 'متابعة', appointment_date: TODAY, start_time: '11:20', end_time: '11:40', duration_minutes: 15, buffer_minutes: 5, status: 'confirmed', source: 'reception', confirmation_status: 'confirmed', message_status: 'delivered', calendar_sync_status: 'synced', notes: '', created_by: 'reception', created_at: D2 + 'T08:00:00Z', updated_at: D2 + 'T08:00:00Z' },
  { id: 'apt-006', clinic_id: 'demo-clinic-001', patient_id: 'pat-006', patient_name: 'ليلى الغامدي', patient_phone: '0506789012', patient_type: 'new', doctor_id: 'doc-002', doctor_name: 'د. أحمد الزهراني', service_id: 'svc-001', service_name: 'كشف عام', appointment_date: TODAY, start_time: '16:00', end_time: '16:35', duration_minutes: 30, buffer_minutes: 5, status: 'confirmed', source: 'ai_booking', confirmation_status: 'confirmed', message_status: 'sent', calendar_sync_status: 'synced', notes: '', created_by: 'ai', created_at: TODAY + 'T08:15:00Z', updated_at: TODAY + 'T08:15:00Z' },
  { id: 'apt-007', clinic_id: 'demo-clinic-001', patient_id: 'pat-007', patient_name: 'عبدالعزيز الفهد', patient_phone: '0507890123', patient_type: 'returning', doctor_id: 'doc-002', doctor_name: 'د. أحمد الزهراني', service_id: 'svc-002', service_name: 'تنظيف الأسنان', appointment_date: TODAY, start_time: '16:40', end_time: '17:35', duration_minutes: 45, buffer_minutes: 10, status: 'pending', source: 'whatsapp', confirmation_status: 'pending', message_status: 'delivered', calendar_sync_status: 'synced', notes: '', created_by: 'reception', created_at: TODAY + 'T07:00:00Z', updated_at: TODAY + 'T07:00:00Z' },
  { id: 'apt-008', clinic_id: 'demo-clinic-001', patient_id: 'pat-008', patient_name: 'منى الزهراني', patient_phone: '0508901234', patient_type: 'returning', doctor_id: 'doc-003', doctor_name: 'د. نورة القحطاني', service_id: 'svc-003', service_name: 'استشارة تقويم', appointment_date: TODAY, start_time: '10:30', end_time: '11:45', duration_minutes: 60, buffer_minutes: 15, status: 'checked_in', source: 'manual', confirmation_status: 'confirmed', message_status: 'read', calendar_sync_status: 'synced', notes: 'عميل VIP', created_by: 'reception', created_at: D3 + 'T16:00:00Z', updated_at: TODAY + 'T10:28:00Z' },
  { id: 'apt-009', clinic_id: 'demo-clinic-001', patient_id: 'pat-009', patient_name: 'خالد الرشيد', patient_phone: '0509012345', patient_type: 'new', doctor_id: 'doc-001', doctor_name: 'د. سارة الحربي', service_id: 'svc-001', service_name: 'كشف عام', appointment_date: TODAY, start_time: '12:00', end_time: '12:35', duration_minutes: 30, buffer_minutes: 5, status: 'cancelled', source: 'ai_booking', confirmation_status: 'declined', message_status: 'sent', calendar_sync_status: 'synced', notes: 'ألغى المريض', created_by: 'ai', created_at: D2 + 'T20:00:00Z', updated_at: TODAY + 'T08:00:00Z' },
  { id: 'apt-010', clinic_id: 'demo-clinic-001', patient_id: 'pat-010', patient_name: 'سلمى البقمي', patient_phone: '0501123456', patient_type: 'returning', doctor_id: 'doc-002', doctor_name: 'د. أحمد الزهراني', service_id: 'svc-002', service_name: 'تنظيف الأسنان', appointment_date: TODAY, start_time: '17:40', end_time: '18:35', duration_minutes: 45, buffer_minutes: 10, status: 'confirmed', source: 'whatsapp', confirmation_status: 'confirmed', message_status: 'read', calendar_sync_status: 'synced', notes: '', created_by: 'reception', created_at: D3 + 'T12:00:00Z', updated_at: D3 + 'T12:00:00Z' },
  { id: 'apt-011', clinic_id: 'demo-clinic-001', patient_id: 'pat-011', patient_name: 'بدر الحربي', patient_phone: '0502234567', patient_type: 'returning', doctor_id: 'doc-001', doctor_name: 'د. سارة الحربي', service_id: 'svc-004', service_name: 'متابعة', appointment_date: TODAY, start_time: '13:00', end_time: '13:20', duration_minutes: 15, buffer_minutes: 5, status: 'no_show', source: 'reception', confirmation_status: 'confirmed', message_status: 'read', calendar_sync_status: 'synced', notes: 'لم يحضر', created_by: 'reception', created_at: D4 + 'T10:00:00Z', updated_at: TODAY + 'T13:30:00Z' },
  { id: 'apt-012', clinic_id: 'demo-clinic-001', patient_id: 'pat-012', patient_name: 'رنا الشهري', patient_phone: '0503345678', patient_type: 'new', doctor_id: 'doc-002', doctor_name: 'د. أحمد الزهراني', service_id: 'svc-001', service_name: 'كشف عام', appointment_date: TODAY, start_time: '18:40', end_time: '19:15', duration_minutes: 30, buffer_minutes: 5, status: 'confirmed', source: 'ai_booking', confirmation_status: 'confirmed', message_status: 'sent', calendar_sync_status: 'synced', notes: '', created_by: 'ai', created_at: TODAY + 'T06:00:00Z', updated_at: TODAY + 'T06:00:00Z' },
  { id: 'apt-013', clinic_id: 'demo-clinic-001', patient_id: 'pat-013', patient_name: 'يوسف العتيبي', patient_phone: '0504456789', patient_type: 'returning', doctor_id: 'doc-001', doctor_name: 'د. سارة الحربي', service_id: 'svc-002', service_name: 'تنظيف الأسنان', appointment_date: TODAY, start_time: '14:30', end_time: '15:25', duration_minutes: 45, buffer_minutes: 10, status: 'confirmed', source: 'whatsapp', confirmation_status: 'confirmed', message_status: 'delivered', calendar_sync_status: 'synced', notes: '', created_by: 'reception', created_at: D2 + 'T18:00:00Z', updated_at: D2 + 'T18:00:00Z' },
  { id: 'apt-014', clinic_id: 'demo-clinic-001', patient_id: 'pat-014', patient_name: 'دانة السلمي', patient_phone: '0505567890', patient_type: 'returning', doctor_id: 'doc-003', doctor_name: 'د. نورة القحطاني', service_id: 'svc-003', service_name: 'استشارة تقويم', appointment_date: TODAY, start_time: '12:00', end_time: '13:15', duration_minutes: 60, buffer_minutes: 15, status: 'needs_review', source: 'ai_booking', confirmation_status: 'pending', message_status: 'pending', calendar_sync_status: 'pending', needs_review_reason: 'نظام الحجز لم يتمكن من التحقق من الوقت', notes: '', created_by: 'ai', created_at: TODAY + 'T07:30:00Z', updated_at: TODAY + 'T07:30:00Z' },
  { id: 'apt-015', clinic_id: 'demo-clinic-001', patient_id: 'pat-015', patient_name: 'عمر الحمدان', patient_phone: '0506678901', patient_type: 'new', doctor_id: 'doc-002', doctor_name: 'د. أحمد الزهراني', service_id: 'svc-001', service_name: 'كشف عام', appointment_date: TODAY, start_time: '19:20', end_time: '19:55', duration_minutes: 30, buffer_minutes: 5, status: 'confirmed', source: 'website', confirmation_status: 'confirmed', message_status: 'sent', calendar_sync_status: 'synced', notes: '', created_by: 'reception', created_at: D2 + 'T15:00:00Z', updated_at: D2 + 'T15:00:00Z' },
  { id: 'apt-016', clinic_id: 'demo-clinic-001', patient_id: 'pat-016', patient_name: 'أسماء الجهني', patient_phone: '0507789012', patient_type: 'returning', doctor_id: 'doc-001', doctor_name: 'د. سارة الحربي', service_id: 'svc-004', service_name: 'متابعة', appointment_date: TODAY, start_time: '15:30', end_time: '15:50', duration_minutes: 15, buffer_minutes: 5, status: 'pending', source: 'reception', confirmation_status: 'pending', message_status: 'sent', calendar_sync_status: 'synced', notes: '', created_by: 'reception', created_at: D3 + 'T14:00:00Z', updated_at: D3 + 'T14:00:00Z' },
  { id: 'apt-017', clinic_id: 'demo-clinic-001', patient_id: 'pat-017', patient_name: 'تركي الدوسري', patient_phone: '0508890123', patient_type: 'returning', doctor_id: 'doc-002', doctor_name: 'د. أحمد الزهراني', service_id: 'svc-002', service_name: 'تنظيف الأسنان', appointment_date: TODAY, start_time: '20:00', end_time: '20:55', duration_minutes: 45, buffer_minutes: 10, status: 'confirmed', source: 'ai_booking', confirmation_status: 'confirmed', message_status: 'read', calendar_sync_status: 'synced', notes: '', created_by: 'ai', created_at: D3 + 'T19:00:00Z', updated_at: D3 + 'T19:00:00Z' },
  { id: 'apt-018', clinic_id: 'demo-clinic-001', patient_id: 'pat-018', patient_name: 'هنوف القرشي', patient_phone: '0509901234', patient_type: 'new', doctor_id: 'doc-003', doctor_name: 'د. نورة القحطاني', service_id: 'svc-001', service_name: 'كشف عام', appointment_date: TODAY, start_time: '13:30', end_time: '14:05', duration_minutes: 30, buffer_minutes: 5, status: 'checked_in', source: 'whatsapp', confirmation_status: 'confirmed', message_status: 'read', calendar_sync_status: 'synced', notes: '', created_by: 'reception', created_at: D2 + 'T12:00:00Z', updated_at: TODAY + 'T13:28:00Z' },

  // Historical appointments
  { id: 'apt-101', clinic_id: 'demo-clinic-001', patient_id: 'pat-001', patient_name: 'محمد القحطاني', patient_phone: '0501234567', patient_type: 'returning', doctor_id: 'doc-001', doctor_name: 'د. سارة الحربي', service_id: 'svc-002', service_name: 'تنظيف الأسنان', appointment_date: YESTERDAY, start_time: '10:00', end_time: '10:55', duration_minutes: 45, buffer_minutes: 10, status: 'completed', source: 'whatsapp', confirmation_status: 'confirmed', message_status: 'read', calendar_sync_status: 'synced', notes: '', created_by: 'reception', created_at: D3 + 'T09:00:00Z', updated_at: YESTERDAY + 'T11:00:00Z' },
  { id: 'apt-102', clinic_id: 'demo-clinic-001', patient_id: 'pat-002', patient_name: 'عائشة المطيري', patient_phone: '0502345678', patient_type: 'returning', doctor_id: 'doc-003', doctor_name: 'د. نورة القحطاني', service_id: 'svc-003', service_name: 'استشارة تقويم', appointment_date: YESTERDAY, start_time: '09:00', end_time: '10:15', duration_minutes: 60, buffer_minutes: 15, status: 'completed', source: 'ai_booking', confirmation_status: 'confirmed', message_status: 'read', calendar_sync_status: 'synced', notes: '', created_by: 'ai', created_at: D4 + 'T10:00:00Z', updated_at: YESTERDAY + 'T10:15:00Z' },
  { id: 'apt-103', clinic_id: 'demo-clinic-001', patient_id: 'pat-005', patient_name: 'فهد الشمري', patient_phone: '0505678901', patient_type: 'returning', doctor_id: 'doc-002', doctor_name: 'د. أحمد الزهراني', service_id: 'svc-001', service_name: 'كشف عام', appointment_date: YESTERDAY, start_time: '17:00', end_time: '17:35', duration_minutes: 30, buffer_minutes: 5, status: 'completed', source: 'whatsapp', confirmation_status: 'confirmed', message_status: 'read', calendar_sync_status: 'synced', notes: '', created_by: 'reception', created_at: D4 + 'T11:00:00Z', updated_at: YESTERDAY + 'T17:35:00Z' },
  { id: 'apt-104', clinic_id: 'demo-clinic-001', patient_id: 'pat-019', patient_name: 'فيصل الزيد', patient_phone: '0501234890', patient_type: 'returning', doctor_id: 'doc-001', doctor_name: 'د. سارة الحربي', service_id: 'svc-002', service_name: 'تنظيف الأسنان', appointment_date: YESTERDAY, start_time: '11:00', end_time: '11:55', duration_minutes: 45, buffer_minutes: 10, status: 'no_show', source: 'reception', confirmation_status: 'confirmed', message_status: 'read', calendar_sync_status: 'synced', notes: 'لم يحضر', created_by: 'reception', created_at: D5 + 'T14:00:00Z', updated_at: YESTERDAY + 'T12:00:00Z' },
  { id: 'apt-105', clinic_id: 'demo-clinic-001', patient_id: 'pat-020', patient_name: 'ريم المالكي', patient_phone: '0502345901', patient_type: 'returning', doctor_id: 'doc-003', doctor_name: 'د. نورة القحطاني', service_id: 'svc-004', service_name: 'متابعة', appointment_date: D2, start_time: '09:30', end_time: '09:50', duration_minutes: 15, buffer_minutes: 5, status: 'completed', source: 'manual', confirmation_status: 'confirmed', message_status: 'read', calendar_sync_status: 'synced', notes: '', created_by: 'reception', created_at: D5 + 'T10:00:00Z', updated_at: D2 + 'T09:50:00Z' },

  // Tomorrow appointments
  { id: 'apt-201', clinic_id: 'demo-clinic-001', patient_id: 'pat-013', patient_name: 'يوسف العتيبي', patient_phone: '0504456789', patient_type: 'returning', doctor_id: 'doc-001', doctor_name: 'د. سارة الحربي', service_id: 'svc-001', service_name: 'كشف عام', appointment_date: TOMORROW, start_time: '09:00', end_time: '09:35', duration_minutes: 30, buffer_minutes: 5, status: 'confirmed', source: 'whatsapp', confirmation_status: 'confirmed', message_status: 'sent', calendar_sync_status: 'synced', notes: '', created_by: 'reception', created_at: TODAY + 'T10:00:00Z', updated_at: TODAY + 'T10:00:00Z' },
  { id: 'apt-202', clinic_id: 'demo-clinic-001', patient_id: 'pat-016', patient_name: 'أسماء الجهني', patient_phone: '0507789012', patient_type: 'returning', doctor_id: 'doc-002', doctor_name: 'د. أحمد الزهراني', service_id: 'svc-002', service_name: 'تنظيف الأسنان', appointment_date: TOMORROW, start_time: '17:00', end_time: '17:55', duration_minutes: 45, buffer_minutes: 10, status: 'pending', source: 'ai_booking', confirmation_status: 'pending', message_status: 'sent', calendar_sync_status: 'synced', notes: '', created_by: 'ai', created_at: TODAY + 'T11:00:00Z', updated_at: TODAY + 'T11:00:00Z' },
]

export const DEMO_MESSAGES: MessageLog[] = [
  { id: 'msg-001', clinic_id: 'demo-clinic-001', appointment_id: 'apt-003', patient_id: 'pat-003', channel: 'whatsapp', message_type: 'confirmation', recipient_phone: '0503456789', recipient_name: 'سامي العنزي', body: 'تم تأكيد موعدك في عيادات نور للأسنان يوم اليوم الساعة 10:40. نتطلع لاستقبالك! 😊', status: 'delivered', sent_at: D3 + 'T09:05:00Z', delivered_at: D3 + 'T09:06:00Z', created_at: D3 + 'T09:05:00Z' },
  { id: 'msg-002', clinic_id: 'demo-clinic-001', appointment_id: 'apt-006', patient_id: 'pat-006', channel: 'whatsapp', message_type: 'confirmation', recipient_phone: '0506789012', recipient_name: 'ليلى الغامدي', body: 'تم تأكيد موعدك في عيادات نور للأسنان يوم اليوم الساعة 16:00. نتطلع لاستقبالك! 😊', status: 'sent', sent_at: TODAY + 'T08:20:00Z', created_at: TODAY + 'T08:20:00Z' },
  { id: 'msg-003', clinic_id: 'demo-clinic-001', appointment_id: 'apt-002', patient_id: 'pat-002', channel: 'whatsapp', message_type: 'reminder_24h', recipient_phone: '0502345678', recipient_name: 'عائشة المطيري', body: 'نذكرك بموعدك غداً في عيادات نور للأسنان الساعة 09:40. هل تريد التأكيد؟', status: 'read', sent_at: YESTERDAY + 'T09:00:00Z', delivered_at: YESTERDAY + 'T09:01:00Z', read_at: YESTERDAY + 'T10:00:00Z', created_at: YESTERDAY + 'T09:00:00Z' },
  { id: 'msg-004', clinic_id: 'demo-clinic-001', appointment_id: 'apt-007', patient_id: 'pat-007', channel: 'whatsapp', message_type: 'confirmation', recipient_phone: '0507890123', recipient_name: 'عبدالعزيز الفهد', body: 'تم تأكيد موعدك في عيادات نور للأسنان يوم اليوم الساعة 16:40.', status: 'delivered', sent_at: TODAY + 'T07:05:00Z', delivered_at: TODAY + 'T07:06:00Z', created_at: TODAY + 'T07:05:00Z' },
  { id: 'msg-005', clinic_id: 'demo-clinic-001', appointment_id: 'apt-011', patient_id: 'pat-011', channel: 'whatsapp', message_type: 'reminder_3h', recipient_phone: '0502234567', recipient_name: 'بدر الحربي', body: 'تذكير: موعدك اليوم الساعة 13:00 في عيادات نور للأسنان بعد 3 ساعات.', status: 'read', sent_at: TODAY + 'T10:00:00Z', delivered_at: TODAY + 'T10:01:00Z', read_at: TODAY + 'T10:15:00Z', created_at: TODAY + 'T10:00:00Z' },
  { id: 'msg-006', clinic_id: 'demo-clinic-001', appointment_id: 'apt-104', patient_id: 'pat-019', channel: 'whatsapp', message_type: 'confirmation', recipient_phone: '0501234890', recipient_name: 'فيصل الزيد', body: 'تم تأكيد موعدك في عيادات نور للأسنان.', status: 'failed', sent_at: D5 + 'T14:10:00Z', failed_reason: 'الرقم غير متاح على واتساب', created_at: D5 + 'T14:10:00Z' },
  { id: 'msg-007', clinic_id: 'demo-clinic-001', appointment_id: 'apt-013', patient_id: 'pat-013', channel: 'whatsapp', message_type: 'reminder_24h', recipient_phone: '0504456789', recipient_name: 'يوسف العتيبي', body: 'نذكرك بموعدك غداً الساعة 14:30 في عيادات نور للأسنان.', status: 'delivered', sent_at: YESTERDAY + 'T14:00:00Z', delivered_at: YESTERDAY + 'T14:02:00Z', created_at: YESTERDAY + 'T14:00:00Z' },
  { id: 'msg-008', clinic_id: 'demo-clinic-001', appointment_id: 'apt-014', patient_id: 'pat-014', channel: 'whatsapp', message_type: 'confirmation', recipient_phone: '0505567890', recipient_name: 'دانة السلمي', body: 'طلب حجزك قيد المراجعة. سنتواصل معك قريباً لتأكيد الموعد.', status: 'sent', sent_at: TODAY + 'T07:35:00Z', created_at: TODAY + 'T07:35:00Z' },
  { id: 'msg-009', clinic_id: 'demo-clinic-001', appointment_id: 'apt-201', patient_id: 'pat-013', channel: 'whatsapp', message_type: 'confirmation', recipient_phone: '0504456789', recipient_name: 'يوسف العتيبي', body: 'تم تأكيد موعدك في عيادات نور للأسنان غداً الساعة 09:00.', status: 'sent', sent_at: TODAY + 'T10:05:00Z', created_at: TODAY + 'T10:05:00Z' },
  { id: 'msg-010', clinic_id: 'demo-clinic-001', appointment_id: 'apt-101', patient_id: 'pat-001', channel: 'whatsapp', message_type: 'follow_up', recipient_phone: '0501234567', recipient_name: 'محمد القحطاني', body: 'نتمنى أن تكون بصحة جيدة بعد زيارتك. يسعدنا تقييم تجربتك معنا.', status: 'read', sent_at: TODAY + 'T09:00:00Z', delivered_at: TODAY + 'T09:01:00Z', read_at: TODAY + 'T09:30:00Z', created_at: TODAY + 'T09:00:00Z' },
  { id: 'msg-011', clinic_id: 'demo-clinic-001', appointment_id: 'apt-012', patient_id: 'pat-012', channel: 'whatsapp', message_type: 'confirmation', recipient_phone: '0503345678', recipient_name: 'رنا الشهري', body: 'تم تأكيد موعدك في عيادات نور للأسنان اليوم الساعة 18:40.', status: 'sent', sent_at: TODAY + 'T06:05:00Z', created_at: TODAY + 'T06:05:00Z' },
  { id: 'msg-012', clinic_id: 'demo-clinic-001', appointment_id: 'apt-103', patient_id: 'pat-005', channel: 'whatsapp', message_type: 'confirmation', recipient_phone: '0505678901', recipient_name: 'فهد الشمري', body: 'تم تأكيد موعدك.', status: 'failed', sent_at: D4 + 'T11:10:00Z', failed_reason: 'فشل الإرسال — جرب مجدداً', created_at: D4 + 'T11:10:00Z' },
]

export const DEMO_AI_CALLS: AICallLog[] = [
  {
    id: 'call-001', clinic_id: 'demo-clinic-001', patient_name: 'ليلى الغامدي', phone: '0506789012', call_time: TODAY + 'T08:10:00Z', duration_seconds: 87, intent: 'book_appointment', result: 'booked', status: 'completed',
    transcript: [
      { speaker: 'agent', text: 'أهلاً وسهلاً، عيادات نور للأسنان، أنا مها كيف أقدر أساعدك؟', time: '00:00' },
      { speaker: 'patient', text: 'أبغى أحجز موعد كشف عام لليوم إذا في وقت متاح', time: '00:05' },
      { speaker: 'agent', text: 'بكل سرور! أي وقت يناسبك؟ عندنا وقت متاح الساعة 4 عصراً مع الدكتورة سارة', time: '00:12' },
      { speaker: 'patient', text: 'تمام الساعة 4 زين', time: '00:18' },
      { speaker: 'agent', text: 'ممتاز، اسمك الكريم؟', time: '00:22' },
      { speaker: 'patient', text: 'ليلى الغامدي', time: '00:26' },
      { speaker: 'agent', text: 'شكراً ليلى، تم تأكيد موعدك الساعة 4 عصراً مع د. سارة الحربي، كشف عام. سيصلك تأكيد على واتساب.', time: '00:32' },
    ],
    summary: 'المريضة طلبت كشف عام ليوم اليوم. تم اقتراح الساعة 4 مع د. سارة الحربي وتأكيد الحجز.', service_requested: 'كشف عام', doctor_requested: 'د. سارة الحربي', preferred_date: TODAY, preferred_time: '16:00', appointment_id: 'apt-006', needs_review: false, created_at: TODAY + 'T08:10:00Z',
  },
  {
    id: 'call-002', clinic_id: 'demo-clinic-001', patient_name: 'رنا الشهري', phone: '0503345678', call_time: TODAY + 'T05:55:00Z', duration_seconds: 104, intent: 'book_appointment', result: 'booked', status: 'completed',
    transcript: [
      { speaker: 'agent', text: 'أهلاً وسهلاً، عيادات نور للأسنان، كيف أقدر أساعدك؟', time: '00:00' },
      { speaker: 'patient', text: 'بغيت أحجز تنظيف أسنان ليوم المساء', time: '00:06' },
      { speaker: 'agent', text: 'أوكي! عندنا وقت الساعة 6:40 مساءً مع د. أحمد الزهراني', time: '00:14' },
      { speaker: 'patient', text: 'ماشي', time: '00:18' },
      { speaker: 'agent', text: 'اسمك؟', time: '00:21' },
      { speaker: 'patient', text: 'رنا الشهري', time: '00:24' },
      { speaker: 'agent', text: 'تم التأكيد يا رنا، ستصلك رسالة تأكيد.', time: '00:30' },
    ],
    summary: 'طلب تنظيف أسنان مساءً. تم الحجز مع د. أحمد 6:40 مساءً.', service_requested: 'تنظيف الأسنان', preferred_date: TODAY, preferred_time: '18:40', appointment_id: 'apt-012', needs_review: false, created_at: TODAY + 'T05:55:00Z',
  },
  {
    id: 'call-003', clinic_id: 'demo-clinic-001', patient_name: 'دانة السلمي', phone: '0505567890', call_time: TODAY + 'T07:25:00Z', duration_seconds: 62, intent: 'book_appointment', result: 'needs_review', status: 'needs_review',
    transcript: [
      { speaker: 'agent', text: 'أهلاً، عيادات نور للأسنان، كيف أساعدك؟', time: '00:00' },
      { speaker: 'patient', text: 'أبغى أحجز استشارة تقويم لليوم الضحى', time: '00:05' },
      { speaker: 'agent', text: 'استشارة التقويم مع د. نورة — دعيني أتحقق من جدولها...', time: '00:12' },
      { speaker: 'agent', text: 'يبدو أن الوقت المطلوب متعارض مع موعد آخر، سأحول طلبك لفريق الاستقبال للمتابعة.', time: '00:25' },
    ],
    summary: 'طلب استشارة تقويم في وقت يوجد تعارض محتمل. يحتاج مراجعة من الاستقبال.', service_requested: 'استشارة تقويم', needs_review: true, review_reason: 'تعارض في الجدول مع د. نورة القحطاني', created_at: TODAY + 'T07:25:00Z',
  },
  {
    id: 'call-004', clinic_id: 'demo-clinic-001', phone: '0509888777', call_time: TODAY + 'T06:30:00Z', duration_seconds: 28, intent: 'book_appointment', result: 'failed', status: 'failed',
    transcript: [
      { speaker: 'agent', text: 'أهلاً، عيادات نور للأسنان...', time: '00:00' },
      { speaker: 'patient', text: 'أه أبغى أحجز—', time: '00:05' },
    ],
    summary: 'المتصل قطع المكالمة في البداية. لم يتم الحجز.', needs_review: false, review_reason: 'قطع المتصل المكالمة', created_at: TODAY + 'T06:30:00Z',
  },
  {
    id: 'call-005', clinic_id: 'demo-clinic-001', patient_name: 'تركي الدوسري', phone: '0508890123', call_time: D3 + 'T18:55:00Z', duration_seconds: 95, intent: 'book_appointment', result: 'booked', status: 'completed',
    summary: 'حجز تنظيف أسنان مساءً مع د. أحمد الزهراني.', service_requested: 'تنظيف الأسنان', preferred_date: TODAY, appointment_id: 'apt-017', needs_review: false, created_at: D3 + 'T18:55:00Z',
  },
]

export const DEMO_WAITLIST: Waitlist[] = [
  { id: 'wl-001', clinic_id: 'demo-clinic-001', patient_name: 'عبدالله الرشيد', patient_phone: '0501122334', service_name: 'تنظيف الأسنان', doctor_name: 'د. سارة الحربي', preferred_date: TODAY, preferred_time_range: 'صباحاً', priority: 'high', status: 'waiting', created_at: TODAY + 'T07:00:00Z' },
  { id: 'wl-002', clinic_id: 'demo-clinic-001', patient_name: 'شيماء العوفي', patient_phone: '0502233445', service_name: 'استشارة تقويم', doctor_name: 'أي دكتور', preferred_date: TOMORROW, preferred_time_range: 'مساءً', priority: 'normal', status: 'waiting', created_at: TODAY + 'T09:00:00Z' },
  { id: 'wl-003', clinic_id: 'demo-clinic-001', patient_name: 'وليد السعيد', patient_phone: '0503344556', service_name: 'كشف عام', preferred_date: TOMORROW, preferred_time_range: 'أي وقت', priority: 'low', status: 'offered', offered_slot: TOMORROW + 'T11:00', created_at: TODAY + 'T10:00:00Z' },
]

export const DEMO_STATS: DashboardStats = {
  today_appointments: 18,
  confirmed: 11,
  pending: 2,
  checked_in: 3,
  cancelled: 1,
  no_show: 1,
  needs_review: 1,
  new_patients_month: 8,
  whatsapp_messages: 41,
  no_show_risk: 2,
  ai_bookings_today: 16,
  calls_handled: 37,
  human_review_needed: 5,
}

export const WEEKLY_CHART_DATA = [
  { day: 'أح', appointments: 12, completed: 10 },
  { day: 'إث', appointments: 15, completed: 13 },
  { day: 'ثل', appointments: 9,  completed: 7  },
  { day: 'أر', appointments: 18, completed: 14 },
  { day: 'خم', appointments: 16, completed: 0  },
  { day: 'جم', appointments: 0,  completed: 0  },
  { day: 'سب', appointments: 11, completed: 0  },
]

export function hasConflict(
  date: string, newStart: string, newEnd: string,
  doctorId: string, excludeId?: string
): boolean {
  return DEMO_APPOINTMENTS.filter(a =>
    a.appointment_date === date &&
    a.doctor_id === doctorId &&
    a.id !== excludeId &&
    !['cancelled', 'no_show'].includes(a.status)
  ).some(a => newStart < a.end_time && newEnd > a.start_time)
}

export function getAvailableSlots(date: string, doctorId: string, durationMinutes: number): string[] {
  const doctor = DEMO_DOCTORS.find(d => d.id === doctorId)
  if (!doctor) return []
  const slots: string[] = []
  const start = 9 * 60
  const end = 21 * 60
  for (let m = start; m + durationMinutes <= end; m += 30) {
    const h = String(Math.floor(m / 60)).padStart(2, '0')
    const min = String(m % 60).padStart(2, '0')
    const slotStart = `${h}:${min}`
    const slotEnd = (() => {
      const e = m + durationMinutes
      return `${String(Math.floor(e / 60)).padStart(2, '0')}:${String(e % 60).padStart(2, '0')}`
    })()
    if (!hasConflict(date, slotStart, slotEnd, doctorId)) {
      slots.push(slotStart)
    }
  }
  return slots.slice(0, 12)
}
