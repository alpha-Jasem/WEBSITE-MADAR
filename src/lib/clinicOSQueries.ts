import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import {
  DEMO_DOCTORS, DEMO_SERVICES, DEMO_PATIENTS, DEMO_APPOINTMENTS,
  DEMO_MESSAGES, DEMO_AI_CALLS, DEMO_WAITLIST, DEMO_STATS,
  DEMO_BRANCHES, DEMO_GOOGLE_REVIEWS, DEMO_SUPPORT_TICKETS,
  DEMO_REMINDER_RULES, DEMO_INTEGRATIONS, DEMO_STAFF, DEMO_NOTIFICATIONS, DEMO_AUDIT_LOG,
} from './clinicOSDemoData'
import type {
  Doctor, Service, Patient, Appointment, MessageLog, AICallLog, Waitlist, AppointmentStatus,
  Branch, GoogleReview, SupportTicket, ReviewStatus,
  ReminderRule, Integration, IntegrationStatus, CompanyStaff, ClinicNotification, NotificationSeverity,
  AuditLogEntry,
} from '../types/clinicOS'

// ─── Generic fetch hook ────────────────────────────────────────────────────────

function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetcher()
      setData(result)
      setError(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'خطأ غير متوقع')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { run() }, [run])

  return { data, loading, error, refetch: run }
}

// ─── Realtime fetch hook (re-fetches on any DB change for the given table) ────

function useFetchRealtime<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  realtimeTable: string,
  companyId: string | null,
  isDemo: boolean,
) {
  const [data, setData] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const instanceId = useState(() => Math.random().toString(36).slice(2))[0]

  const run = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetcher()
      setData(result)
      setError(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'خطأ غير متوقع')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { run() }, [run])

  useEffect(() => {
    if (isDemo || !companyId) return
    const channel = supabase
      .channel(`rt_${realtimeTable}_${companyId}_${instanceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: realtimeTable, filter: `company_id=eq.${companyId}` },
        () => { run() },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [realtimeTable, companyId, isDemo, run, instanceId])

  return { data, loading, error, refetch: run }
}

// ─── Doctors ───────────────────────────────────────────────────────────────────

export function useClinicDoctors(companyId: string | null, isDemo = false) {
  return useFetch<Doctor[]>(async () => {
    if (isDemo) return DEMO_DOCTORS
    if (!companyId) return []
    const { data, error } = await supabase
      .from('clinic_os_doctors')
      .select('*')
      .eq('company_id', companyId)
      .order('name')
    if (error) throw error
    return (data ?? []).map((row: any) => ({ ...row, clinic_id: row.company_id })) as Doctor[]
  }, [companyId, isDemo])
}

// ─── Services ─────────────────────────────────────────────────────────────────

export function useClinicServices(companyId: string | null, isDemo = false) {
  return useFetch<Service[]>(async () => {
    if (isDemo) return DEMO_SERVICES
    if (!companyId) return []
    const { data, error } = await supabase
      .from('clinic_os_services')
      .select('*')
      .eq('company_id', companyId)
      .order('name')
    if (error) throw error
    return (data ?? []).map((row: any) => ({ ...row, clinic_id: row.company_id })) as Service[]
  }, [companyId, isDemo])
}

// ─── Patients ─────────────────────────────────────────────────────────────────

export function useClinicPatients(companyId: string | null, isDemo = false) {
  return useFetch<Patient[]>(async () => {
    if (isDemo) return DEMO_PATIENTS
    if (!companyId) return []
    const { data, error } = await supabase
      .from('clinic_os_patients')
      .select('*')
      .eq('company_id', companyId)
      .order('name')
    if (error) throw error
    return (data ?? []).map((row: any) => ({ ...row, clinic_id: row.company_id, total_visits: row.total_appointments || 0 })) as Patient[]
  }, [companyId, isDemo])
}

export async function updatePatient(id: string, data: Partial<Patient>) {
  const { clinic_id: clinicId, total_visits, ...rest } = data
  const payload: Record<string, unknown> = { ...rest }
  if (total_visits != null) payload.total_appointments = total_visits
  const { error } = await supabase
    .from('clinic_os_patients')
    .update(payload)
    .eq('id', id)
  if (error) throw error
  if (clinicId) {
    await logAuditEvent({ company_id: clinicId, action: 'patient.updated', note: `تحديث بيانات عميل: ${data.name || ''}` }).catch(() => {})
  }
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export function useClinicAppointments(companyId: string | null, dateFilter?: string, isDemo = false) {
  return useFetchRealtime<Appointment[]>(async () => {
    if (isDemo) {
      if (!dateFilter) return DEMO_APPOINTMENTS
      return DEMO_APPOINTMENTS.filter(a => a.appointment_date === dateFilter)
    }
    if (!companyId) return []
    let query = supabase
      .from('clinic_os_appointments')
      .select('*')
      .eq('company_id', companyId)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (dateFilter) query = query.eq('appointment_date', dateFilter)

    const { data, error } = await query
    if (error) throw error
    return (data ?? []).map((row: any) => ({ ...row, clinic_id: row.company_id })) as Appointment[]
  }, [companyId, dateFilter, isDemo], 'clinic_os_appointments', companyId, isDemo)
}

export function useClinicTodayAppointments(companyId: string | null, isDemo = false) {
  const today = new Date().toISOString().split('T')[0]
  return useClinicAppointments(companyId, today, isDemo)
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export function useClinicMessages(companyId: string | null, isDemo = false) {
  return useFetchRealtime<MessageLog[]>(async () => {
    if (isDemo) return DEMO_MESSAGES
    if (!companyId) return []
    const { data, error } = await supabase
      .from('clinic_os_messages')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return (data ?? []).map((row: any) => ({
      ...row,
      clinic_id: row.company_id,
      recipient_phone: row.patient_phone,
    })) as MessageLog[]
  }, [companyId, isDemo], 'clinic_os_messages', companyId, isDemo)
}

// ─── AI Calls ─────────────────────────────────────────────────────────────────

export function useClinicAICalls(companyId: string | null, isDemo = false) {
  return useFetchRealtime<AICallLog[]>(async () => {
    if (isDemo) return DEMO_AI_CALLS
    if (!companyId) return []
    const { data, error } = await supabase
      .from('clinic_os_ai_calls')
      .select('*')
      .eq('company_id', companyId)
      .order('call_time', { ascending: false })
      .limit(100)
    if (error) throw error
    return (data ?? []).map((row: any) => ({ ...row, clinic_id: row.company_id })) as AICallLog[]
  }, [companyId, isDemo], 'clinic_os_ai_calls', companyId, isDemo)
}

// ─── Waitlist ─────────────────────────────────────────────────────────────────

export function useClinicWaitlist(companyId: string | null, isDemo = false) {
  return useFetch<Waitlist[]>(async () => {
    if (isDemo) return DEMO_WAITLIST
    if (!companyId) return []
    const { data, error } = await supabase
      .from('clinic_os_waitlist')
      .select('*')
      .eq('company_id', companyId)
      .order('priority', { ascending: true })
    if (error) throw error
    return (data ?? []).map((row: any) => ({
      ...row,
      clinic_id: row.company_id,
      priority: row.priority >= 3 ? 'high' : row.priority === 2 ? 'normal' : 'low',
    })) as Waitlist[]
  }, [companyId, isDemo])
}

export interface ClinicOpportunity {
  id: string
  company_id: string
  customer_name: string
  customer_phone: string
  opportunity_type: string
  interested_service: string
  priority: string
  last_contact_at: string | null
  status: string
  suggested_action: string
  created_at: string
}

export interface ClinicKnowledgeItem {
  id: string
  company_id: string
  type: string
  title: string
  content: string
  metadata: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

export function useClinicOpportunities(companyId: string | null, isDemo = false) {
  return useFetchRealtime<ClinicOpportunity[]>(async () => {
    if (isDemo || !companyId) return []
    const { data, error } = await supabase
      .from('clinic_os_lost_opportunities')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as ClinicOpportunity[]
  }, [companyId, isDemo], 'clinic_os_lost_opportunities', companyId, isDemo)
}

export function useClinicKnowledge(companyId: string | null, isDemo = false) {
  return useFetchRealtime<ClinicKnowledgeItem[]>(async () => {
    if (isDemo || !companyId) return []
    const { data, error } = await supabase
      .from('clinic_os_knowledge_items')
      .select('*')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as ClinicKnowledgeItem[]
  }, [companyId, isDemo], 'clinic_os_knowledge_items', companyId, isDemo)
}

export async function updateClinicOpportunity(id: string, status: string) {
  const { error } = await supabase
    .from('clinic_os_lost_opportunities')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function saveClinicKnowledgeItem(input: {
  id?: string
  company_id: string
  type: string
  title: string
  content: string
  metadata?: Record<string, unknown>
}) {
  const { id, ...values } = input
  const payload = { ...values, is_active: true, updated_at: new Date().toISOString() }
  const query = id
    ? supabase.from('clinic_os_knowledge_items').update(payload).eq('id', id)
    : supabase.from('clinic_os_knowledge_items').insert(payload)
  const { error } = await query
  if (error) throw error
}

export async function updateClinicCompany(companyId: string, data: Record<string, unknown>) {
  const { error } = await supabase.from('companies').update(data).eq('id', companyId)
  if (error) throw error
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export interface ClinicStats {
  today_appointments: number
  confirmed: number
  pending: number
  needs_review: number
  new_patients_month: number
  whatsapp_messages: number
  ai_bookings_today?: number
  calls_handled?: number
}

export function useClinicStats(companyId: string | null, isDemo = false) {
  const today = new Date().toISOString().split('T')[0]
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  return useFetchRealtime<ClinicStats>(async () => {
    if (isDemo) return {
      today_appointments: DEMO_STATS.today_appointments,
      confirmed: DEMO_STATS.confirmed,
      pending: DEMO_STATS.pending,
      needs_review: DEMO_STATS.needs_review,
      new_patients_month: DEMO_STATS.new_patients_month,
      whatsapp_messages: DEMO_STATS.whatsapp_messages,
      ai_bookings_today: DEMO_STATS.ai_bookings_today,
      calls_handled: DEMO_STATS.calls_handled,
    }
    if (!companyId) return {
      today_appointments: 0, confirmed: 0, pending: 0,
      needs_review: 0, new_patients_month: 0, whatsapp_messages: 0,
    }

    const [todayAppts, newPatients, messages, aiCalls] = await Promise.all([
      supabase
        .from('clinic_os_appointments')
        .select('status')
        .eq('company_id', companyId)
        .eq('appointment_date', today),
      supabase
        .from('clinic_os_patients')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('created_at', monthStart),
      supabase
        .from('clinic_os_messages')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('created_at', today),
      supabase
        .from('clinic_os_ai_calls')
        .select('result, status')
        .eq('company_id', companyId)
        .gte('call_time', today),
    ])

    const appts = (todayAppts.data ?? []) as { status: AppointmentStatus }[]
    const aiCallRows = (aiCalls.data ?? []) as { result: string; status: string }[]

    return {
      today_appointments: appts.length,
      confirmed: appts.filter(a => a.status === 'confirmed').length,
      pending: appts.filter(a => a.status === 'pending').length,
      needs_review: appts.filter(a => a.status === 'needs_review').length,
      new_patients_month: newPatients.count ?? 0,
      whatsapp_messages: messages.count ?? 0,
      ai_bookings_today: aiCallRows.filter(c => c.result === 'booked').length,
      calls_handled: aiCallRows.length,
    }
  }, [companyId, isDemo], 'clinic_os_appointments', companyId, isDemo)
}

// ─── Weekly Chart Data ────────────────────────────────────────────────────────

export interface WeeklyPoint { day: string; appointments: number; completed: number }

export function useClinicWeeklyChart(companyId: string | null, isDemo = false) {
  return useFetch<WeeklyPoint[]>(async () => {
    if (isDemo) {
      // Return a realistic weekly spread from DEMO_APPOINTMENTS
      const DAY_NAMES: Record<string, string> = {
        '0': 'الأحد', '1': 'الإثنين', '2': 'الثلاثاء',
        '3': 'الأربعاء', '4': 'الخميس', '5': 'الجمعة', '6': 'السبت',
      }
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - 6 + i)
        const dateStr = d.toISOString().split('T')[0]
        const dayRows = DEMO_APPOINTMENTS.filter(a => a.appointment_date === dateStr)
        return {
          day: DAY_NAMES[String(d.getDay())],
          appointments: dayRows.length || Math.floor(Math.random() * 8) + 2,
          completed: dayRows.filter(a => a.status === 'completed').length || Math.floor(Math.random() * 5),
        }
      })
    }
    if (!companyId) return []

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - 6 + i)
      return d.toISOString().split('T')[0]
    })

    const { data, error } = await supabase
      .from('clinic_os_appointments')
      .select('appointment_date, status')
      .eq('company_id', companyId)
      .gte('appointment_date', days[0])
      .lte('appointment_date', days[6])

    if (error) throw error

    const rows = (data ?? []) as { appointment_date: string; status: string }[]
    const DAY_NAMES: Record<string, string> = {
      '0': 'الأحد', '1': 'الإثنين', '2': 'الثلاثاء',
      '3': 'الأربعاء', '4': 'الخميس', '5': 'الجمعة', '6': 'السبت',
    }

    return days.map(d => {
      const dayRows = rows.filter(r => r.appointment_date === d)
      const dow = String(new Date(d).getDay())
      return {
        day: DAY_NAMES[dow],
        appointments: dayRows.length,
        completed: dayRows.filter(r => r.status === 'completed').length,
      }
    })
  }, [companyId, isDemo])
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  const { error } = await supabase
    .from('clinic_os_appointments')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

export async function updateAppointmentPatient(id: string, patient_name: string, patient_phone: string) {
  const { error } = await supabase
    .from('clinic_os_appointments')
    .update({ patient_name, patient_phone })
    .eq('id', id)
  if (error) throw error
}

export async function createAppointment(data: Partial<Appointment>) {
  const payload = {
    company_id: data.clinic_id,
    patient_id: data.patient_id,
    patient_name: data.patient_name,
    patient_phone: data.patient_phone,
    doctor_id: data.doctor_id,
    doctor_name: data.doctor_name,
    service_id: data.service_id,
    service_name: data.service_name,
    appointment_date: data.appointment_date,
    start_time: data.start_time,
    end_time: data.end_time,
    duration_minutes: data.duration_minutes,
    status: data.status,
    source: data.source,
    confirmation_status: data.confirmation_status,
    message_status: data.message_status,
    calendar_sync_status: data.calendar_sync_status,
    needs_review_reason: data.needs_review_reason,
    notes: data.notes,
  }
  const { data: result, error } = await supabase
    .from('clinic_os_appointments')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  if (data.clinic_id) {
    await createNotification({
      company_id: data.clinic_id,
      notification_type: 'new_booking',
      title: 'حجز جديد',
      message: `${data.patient_name || 'عميل'} حجز موعد ${data.service_name || ''} بتاريخ ${data.appointment_date}`,
      severity: 'success',
      route: '/clinic-os/dashboard/bookings',
    }).catch(() => {})
  }
  return result as Appointment
}

export async function createPatient(data: Partial<Patient>) {
  const payload = {
    company_id: data.clinic_id,
    name: data.name,
    phone: data.phone,
    national_id: data.national_id,
    patient_type: data.patient_type,
    tags: data.tags || [],
    notes: data.notes,
    no_show_count: data.no_show_count || 0,
    last_visit_at: data.last_visit_at,
    total_appointments: data.total_visits || 0,
  }
  const { data: result, error } = await supabase
    .from('clinic_os_patients')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return result as Patient
}

export async function createDoctor(data: Partial<Doctor>) {
  const payload = {
    company_id: data.clinic_id,
    name: data.name,
    specialty: data.specialty,
    phone: data.phone,
    email: data.email,
    active: data.active ?? true,
    status: data.status,
    max_appointments_per_day: data.max_appointments_per_day,
    emergency_slots_per_day: data.emergency_slots_per_day,
    next_available: data.next_available,
    working_hours: data.working_hours || {},
    days_off: data.days_off || [],
    is_available: data.is_available ?? true,
    unavailable_reason: data.unavailable_reason,
  }
  const { data: result, error } = await supabase
    .from('clinic_os_doctors')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return result as Doctor
}

export async function updateDoctor(id: string, data: Partial<Doctor>) {
  const { clinic_id: _clinicId, avatar: _avatar, break_times: _breakTimes, appointments_today: _appointmentsToday, ...payload } = data
  const { data: result, error } = await supabase
    .from('clinic_os_doctors')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return result as Doctor
}

export async function toggleDoctorAvailability(id: string, isAvailable: boolean, reason?: string) {
  const { data: result, error } = await supabase
    .from('clinic_os_doctors')
    .update({
      is_available: isAvailable,
      unavailable_reason: isAvailable ? null : (reason ?? 'غائب اليوم'),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return result as Doctor
}

export async function createService(data: Partial<Service>) {
  const payload = {
    company_id: data.clinic_id,
    name: data.name,
    category: data.category,
    duration_minutes: data.duration_minutes,
    buffer_minutes: data.buffer_minutes,
    price: data.price,
    active: data.active ?? true,
    requires_approval: data.requires_approval ?? false,
    available_for_ai: data.available_for_ai ?? true,
    available_for_whatsapp: data.available_for_whatsapp ?? true,
  }
  const { data: result, error } = await supabase
    .from('clinic_os_services')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  if (data.clinic_id) {
    await logAuditEvent({ company_id: data.clinic_id, action: 'service.created', note: `إضافة خدمة: ${data.name}` }).catch(() => {})
  }
  return result as Service
}

export async function updateService(id: string, data: Partial<Service>) {
  const { clinic_id: clinicId, required_specialty: _specialty, allowed_doctor_ids: _doctorIds, ...payload } = data
  const { error } = await supabase
    .from('clinic_os_services')
    .update(payload)
    .eq('id', id)
  if (error) throw error
  if (clinicId) {
    await logAuditEvent({ company_id: clinicId, action: 'service.updated', note: `تحديث خدمة: ${data.name || ''}` }).catch(() => {})
  }
}

export async function updateAICallStatus(id: string, status: 'confirmed' | 'rejected') {
  const { error } = await supabase
    .from('clinic_os_ai_calls')
    .update({ status, needs_review: false })
    .eq('id', id)
  if (error) throw error
}

// ─── Branches ─────────────────────────────────────────────────────────────────

export function useClinicBranches(companyId: string | null, isDemo = false) {
  return useFetchRealtime<Branch[]>(async () => {
    if (isDemo) return DEMO_BRANCHES
    if (!companyId) return []
    const [branchesRes, settingsRes] = await Promise.all([
      supabase.from('branches').select('*').eq('company_id', companyId).order('created_at'),
      supabase.from('branch_settings').select('branch_id, key, value'),
    ])
    if (branchesRes.error) throw branchesRes.error
    const settingsByBranch = new Map<string, Record<string, string>>()
    for (const row of settingsRes.data ?? []) {
      const bucket = settingsByBranch.get(row.branch_id) || {}
      bucket[row.key] = row.value
      settingsByBranch.set(row.branch_id, bucket)
    }
    return (branchesRes.data ?? []).map((row: any) => ({
      ...row,
      google_place_id: settingsByBranch.get(row.id)?.google_place_id,
      google_maps_url: settingsByBranch.get(row.id)?.google_maps_url,
    })) as Branch[]
  }, [companyId, isDemo], 'branches', companyId, isDemo)
}

export async function toggleBranchFavorite(id: string, isFavorite: boolean) {
  const { error } = await supabase.from('branches').update({ is_favorite: isFavorite }).eq('id', id)
  if (error) throw error
}

export async function createBranch(input: {
  company_id: string
  name: string
  address?: string
  phone?: string
  google_maps_url?: string
}) {
  const { data: branch, error } = await supabase
    .from('branches')
    .insert({
      company_id: input.company_id,
      name: input.name,
      name_ar: input.name,
      address: input.address,
      phone: input.phone,
      industry_type: 'clinic',
    })
    .select()
    .single()
  if (error) throw error
  if (input.google_maps_url) {
    await supabase.from('branch_settings').insert({
      branch_id: branch.id,
      key: 'google_maps_url',
      value: input.google_maps_url,
    })
  }
  return branch as Branch
}

// ─── Google Reviews ───────────────────────────────────────────────────────────

export function useClinicGoogleReviews(companyId: string | null, isDemo = false) {
  return useFetchRealtime<GoogleReview[]>(async () => {
    if (isDemo) return DEMO_GOOGLE_REVIEWS
    if (!companyId) return []
    const { data, error } = await supabase
      .from('clinic_os_google_reviews')
      .select('*')
      .eq('company_id', companyId)
      .order('review_date', { ascending: false })
    if (error) throw error
    return (data ?? []) as GoogleReview[]
  }, [companyId, isDemo], 'clinic_os_google_reviews', companyId, isDemo)
}

export async function replyToReview(id: string, replyText: string) {
  const { error } = await supabase
    .from('clinic_os_google_reviews')
    .update({ reply_text: replyText, reply_status: 'replied' as ReviewStatus, replied_by: 'human', updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ─── Support Tickets (negative-review escalations, etc.) ──────────────────────

export function useClinicSupportTickets(companyId: string | null, isDemo = false) {
  return useFetchRealtime<SupportTicket[]>(async () => {
    if (isDemo) return DEMO_SUPPORT_TICKETS
    if (!companyId) return []
    const { data, error } = await supabase
      .from('ai_agent_support_tickets')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as SupportTicket[]
  }, [companyId, isDemo], 'ai_agent_support_tickets', companyId, isDemo)
}

export async function resolveTicket(id: string) {
  const { error } = await supabase
    .from('ai_agent_support_tickets')
    .update({ status: 'resolved', updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ─── Reminder Rules ─────────────────────────────────────────────────────────

const DEFAULT_REMINDER_RULES: { rule_key: string; label: string }[] = [
  { rule_key: 'reminder_24h', label: 'تذكير واتساب قبل الموعد بيوم' },
  { rule_key: 'reminder_3h', label: 'تذكير واتساب قبل الموعد بساعتين' },
  { rule_key: 'call_unconfirmed', label: 'اتصال آلي بالعميل عند عدم التأكيد' },
  { rule_key: 'review_request', label: 'طلب تقييم Google بعد الزيارة' },
  { rule_key: 'no_show_alert', label: 'تنبيه للفريق عند موعد لم يُحضر' },
]

export function useClinicReminderRules(companyId: string | null, isDemo = false) {
  return useFetchRealtime<ReminderRule[]>(async () => {
    if (isDemo) return DEMO_REMINDER_RULES
    if (!companyId) return []
    const { data, error } = await supabase
      .from('clinic_os_reminder_rules')
      .select('*')
      .eq('company_id', companyId)
    if (error) throw error
    if ((data ?? []).length === 0) {
      const seeded = DEFAULT_REMINDER_RULES.map((r) => ({ ...r, company_id: companyId, enabled: true }))
      const { data: inserted, error: insertError } = await supabase
        .from('clinic_os_reminder_rules')
        .insert(seeded)
        .select()
      if (insertError) throw insertError
      return (inserted ?? []) as ReminderRule[]
    }
    return data as ReminderRule[]
  }, [companyId, isDemo], 'clinic_os_reminder_rules', companyId, isDemo)
}

export async function toggleReminderRule(id: string, enabled: boolean) {
  const { error } = await supabase
    .from('clinic_os_reminder_rules')
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ─── Integrations ───────────────────────────────────────────────────────────

const DEFAULT_INTEGRATIONS: { provider: string; name: string }[] = [
  { provider: 'whatsapp', name: 'WhatsApp Business' },
  { provider: 'google_calendar', name: 'Google Calendar' },
  { provider: 'google_business', name: 'Google Business Profile' },
  { provider: 'voip', name: 'مركز الاتصال (VoIP)' },
  { provider: 'instagram', name: 'Instagram' },
]

export function useClinicIntegrations(companyId: string | null, isDemo = false) {
  return useFetchRealtime<Integration[]>(async () => {
    if (isDemo) return DEMO_INTEGRATIONS
    if (!companyId) return []
    const { data, error } = await supabase
      .from('clinic_os_integrations')
      .select('*')
      .eq('company_id', companyId)
    if (error) throw error
    if ((data ?? []).length === 0) {
      const seeded = DEFAULT_INTEGRATIONS.map((i) => ({ ...i, company_id: companyId, status: 'disconnected' as IntegrationStatus }))
      const { data: inserted, error: insertError } = await supabase
        .from('clinic_os_integrations')
        .insert(seeded)
        .select()
      if (insertError) throw insertError
      return (inserted ?? []) as Integration[]
    }
    return data as Integration[]
  }, [companyId, isDemo], 'clinic_os_integrations', companyId, isDemo)
}

export async function toggleIntegration(id: string, status: IntegrationStatus) {
  const { error } = await supabase
    .from('clinic_os_integrations')
    .update({ status, connected_at: status === 'connected' ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ─── Staff / permissions ────────────────────────────────────────────────────

export function useClinicStaff(companyId: string | null, isDemo = false) {
  return useFetchRealtime<CompanyStaff[]>(async () => {
    if (isDemo) return DEMO_STAFF
    if (!companyId) return []
    const { data, error } = await supabase
      .from('company_users')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at')
    if (error) throw error
    return (data ?? []) as CompanyStaff[]
  }, [companyId, isDemo], 'company_users', companyId, isDemo)
}

export async function inviteStaffMember(input: { company_id: string; email: string; full_name: string; role: string }) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('missing_session')
  const { data, error } = await supabase.functions.invoke('clinic-staff-invite', {
    body: { company_id: input.company_id, email: input.email, full_name: input.full_name, role: input.role },
    headers: { Authorization: `Bearer ${token}` },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data as { invited: boolean; auth_user_id: string }
}

export async function updateStaffMember(id: string, changes: { full_name?: string; role?: string; permissions?: string[] }) {
  const { error } = await supabase.from('company_users').update(changes).eq('id', id)
  if (error) throw error
}

export async function removeStaffMember(id: string) {
  const { error } = await supabase.from('company_users').delete().eq('id', id)
  if (error) throw error
}

// ─── Company profile (logo, working hours) ─────────────────────────────────

export async function uploadCompanyLogo(companyId: string, file: File) {
  const ext = file.name.split('.').pop() || 'png'
  const path = `${companyId}/logo-${Date.now()}.${ext}`
  const { error: uploadError } = await supabase.storage.from('company-assets').upload(path, file, { upsert: true })
  if (uploadError) throw uploadError
  const { data } = supabase.storage.from('company-assets').getPublicUrl(path)
  const { error: updateError } = await supabase.from('companies').update({ logo_url: data.publicUrl }).eq('id', companyId)
  if (updateError) throw updateError
  return data.publicUrl
}

export async function updateClinicWorkingHours(companyId: string, currentSettings: Record<string, unknown>, workingHours: Record<string, unknown>) {
  const { error } = await supabase
    .from('companies')
    .update({ clinic_settings: { ...currentSettings, working_hours: workingHours } })
    .eq('id', companyId)
  if (error) throw error
}

// ─── Notifications ──────────────────────────────────────────────────────────

export function useClinicNotifications(companyId: string | null, isDemo = false) {
  return useFetchRealtime<ClinicNotification[]>(async () => {
    if (isDemo) return DEMO_NOTIFICATIONS
    if (!companyId) return []
    const { data, error } = await supabase
      .from('clinic_os_notifications')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return (data ?? []) as ClinicNotification[]
  }, [companyId, isDemo], 'clinic_os_notifications', companyId, isDemo)
}

export async function createNotification(input: {
  company_id: string
  notification_type: string
  title: string
  message: string
  severity?: NotificationSeverity
  route?: string
}) {
  const { error } = await supabase.from('clinic_os_notifications').insert({
    company_id: input.company_id,
    notification_type: input.notification_type,
    title: input.title,
    message: input.message,
    severity: input.severity || 'info',
    route: input.route,
  })
  if (error) throw error
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from('clinic_os_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function markAllNotificationsRead(companyId: string) {
  const { error } = await supabase
    .from('clinic_os_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('company_id', companyId)
    .is('read_at', null)
  if (error) throw error
}

// ─── Audit Log ──────────────────────────────────────────────────────────────

export function useClinicAuditLog(companyId: string | null, isDemo = false) {
  return useFetchRealtime<AuditLogEntry[]>(async () => {
    if (isDemo) return DEMO_AUDIT_LOG
    if (!companyId) return []
    const { data, error } = await supabase
      .from('clinic_os_audit_logs')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) throw error
    return (data ?? []) as AuditLogEntry[]
  }, [companyId, isDemo], 'clinic_os_audit_logs', companyId, isDemo)
}

export async function logAuditEvent(input: {
  company_id: string
  action: string
  note?: string
  new_value?: Record<string, unknown>
  old_value?: Record<string, unknown>
}) {
  const { data: userData } = await supabase.auth.getUser()
  const { error } = await supabase.from('clinic_os_audit_logs').insert({
    company_id: input.company_id,
    actor_type: 'user',
    actor_id: userData?.user?.id,
    action: input.action,
    note: input.note,
    new_value: input.new_value,
    old_value: input.old_value,
  })
  if (error) throw error
}
