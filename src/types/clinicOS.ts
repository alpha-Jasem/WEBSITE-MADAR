export type PackageType = 'whatsapp' | 'ai_pro'

export type AppointmentStatus =
  | 'confirmed'
  | 'pending'
  | 'checked_in'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled'
  | 'needs_review'

export type AppointmentSource =
  | 'ai_booking'
  | 'whatsapp'
  | 'reception'
  | 'website'
  | 'manual'

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
export type MessageType =
  | 'confirmation'
  | 'reminder_24h'
  | 'reminder_3h'
  | 'reschedule'
  | 'cancellation'
  | 'follow_up'
  | 'review_request'
  | 'waitlist_offer'
  | 'manual'

export type PatientTag =
  | 'new_patient'
  | 'returning'
  | 'vip'
  | 'high_no_show'
  | 'needs_followup'
  | 'payment_pending'
  | 'whatsapp_only'

export type DoctorStatus = 'available' | 'busy' | 'fully_booked' | 'on_break' | 'off_today' | 'emergency_only'

export type AICallIntent = 'book_appointment' | 'reschedule' | 'cancel' | 'ask_availability' | 'request_human' | 'other'
export type AICallResult = 'booked' | 'needs_review' | 'no_slot' | 'cancelled' | 'failed' | 'transferred'
export type AICallStatus = 'completed' | 'needs_review' | 'failed'

export interface Clinic {
  id: string
  name: string
  logo_url?: string
  phone: string
  email: string
  city: string
  address: string
  working_hours: WorkingHours
  package_type: PackageType
  created_at: string
}

export interface WorkingHours {
  sun?: DayHours
  mon?: DayHours
  tue?: DayHours
  wed?: DayHours
  thu?: DayHours
  fri?: DayHours
  sat?: DayHours
}

export interface DayHours {
  open: boolean
  start: string
  end: string
  break_start?: string
  break_end?: string
}

export interface Patient {
  id: string
  clinic_id: string
  name: string
  phone: string
  email?: string
  national_id?: string
  city?: string
  patient_type: 'new' | 'returning'
  tags: PatientTag[]
  notes?: string
  no_show_count: number
  total_visits: number
  last_visit_at?: string
  next_appointment?: string
  created_at: string
}

export interface Doctor {
  id: string
  clinic_id: string
  name: string
  specialty: string
  phone?: string
  email?: string
  active: boolean
  is_available: boolean
  unavailable_reason?: string
  avatar?: string
  working_hours: WorkingHours
  break_times?: string[]
  days_off?: string[]
  max_appointments_per_day: number
  emergency_slots_per_day: number
  appointments_today?: number
  status?: DoctorStatus
  next_available?: string
  created_at: string
}

export interface Service {
  id: string
  clinic_id: string
  name: string
  category: string
  duration_minutes: number
  buffer_minutes: number
  price: number
  required_specialty?: string
  allowed_doctor_ids?: string[]
  active: boolean
  available_for_whatsapp: boolean
  available_for_ai: boolean
  requires_approval: boolean
  created_at: string
}

export interface Appointment {
  id: string
  clinic_id: string
  patient_id: string
  patient_name: string
  patient_phone: string
  patient_type?: 'new' | 'returning'
  doctor_id: string
  doctor_name: string
  service_id: string
  service_name: string
  appointment_date: string
  start_time: string
  end_time: string
  duration_minutes: number
  buffer_minutes: number
  status: AppointmentStatus
  source: AppointmentSource
  confirmation_status: 'pending' | 'confirmed' | 'declined'
  message_status: MessageStatus
  calendar_sync_status: 'synced' | 'pending' | 'failed'
  needs_review_reason?: string
  notes?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface MessageLog {
  id: string
  clinic_id: string
  appointment_id?: string
  patient_id?: string
  channel: 'whatsapp'
  message_type: MessageType
  recipient_phone: string
  recipient_name: string
  body: string
  status: MessageStatus
  sent_at?: string
  delivered_at?: string
  read_at?: string
  failed_reason?: string
  created_at: string
}

export interface AICallLog {
  id: string
  clinic_id: string
  patient_id?: string
  patient_name?: string
  phone: string
  call_time: string
  duration_seconds: number
  intent: AICallIntent
  result: AICallResult
  status: AICallStatus
  transcript?: AITranscriptLine[]
  summary?: string
  service_requested?: string
  doctor_requested?: string
  preferred_date?: string
  preferred_time?: string
  appointment_id?: string
  needs_review: boolean
  review_reason?: string
  created_at: string
}

export interface AITranscriptLine {
  speaker: 'patient' | 'agent'
  text: string
  time: string
}

export interface Waitlist {
  id: string
  clinic_id: string
  patient_id?: string
  patient_name: string
  patient_phone: string
  service_id?: string
  service_name?: string
  doctor_id?: string
  doctor_name?: string
  preferred_date?: string
  preferred_time_range?: string
  priority: 'high' | 'normal' | 'low'
  status: 'waiting' | 'offered' | 'confirmed' | 'expired'
  offered_slot?: string
  created_at: string
}

export interface ConflictAlert {
  type: 'doctor_booked' | 'room_unavailable' | 'duration_overlap' | 'patient_overlap' | 'calendar_issue'
  message: string
  doctor_name?: string
  suggested_slots?: string[]
}

export interface DashboardStats {
  today_appointments: number
  confirmed: number
  pending: number
  checked_in: number
  cancelled: number
  no_show: number
  needs_review: number
  new_patients_month: number
  whatsapp_messages: number
  no_show_risk: number
  ai_bookings_today?: number
  calls_handled?: number
  human_review_needed?: number
}
