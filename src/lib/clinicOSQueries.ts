import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import {
  DEMO_DOCTORS, DEMO_SERVICES, DEMO_PATIENTS, DEMO_APPOINTMENTS,
  DEMO_MESSAGES, DEMO_AI_CALLS, DEMO_WAITLIST, DEMO_STATS,
} from './clinicOSDemoData'
import type {
  Doctor, Service, Patient, Appointment, MessageLog, AICallLog, Waitlist, AppointmentStatus,
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
    return (data ?? []) as Doctor[]
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
    return (data ?? []) as Service[]
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
    return (data ?? []) as Patient[]
  }, [companyId, isDemo])
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export function useClinicAppointments(companyId: string | null, dateFilter?: string, isDemo = false) {
  return useFetch<Appointment[]>(async () => {
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
    return (data ?? []) as Appointment[]
  }, [companyId, dateFilter, isDemo])
}

export function useClinicTodayAppointments(companyId: string | null, isDemo = false) {
  const today = new Date().toISOString().split('T')[0]
  return useClinicAppointments(companyId, today, isDemo)
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export function useClinicMessages(companyId: string | null, isDemo = false) {
  return useFetch<MessageLog[]>(async () => {
    if (isDemo) return DEMO_MESSAGES
    if (!companyId) return []
    const { data, error } = await supabase
      .from('clinic_os_messages')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return (data ?? []) as MessageLog[]
  }, [companyId, isDemo])
}

// ─── AI Calls ─────────────────────────────────────────────────────────────────

export function useClinicAICalls(companyId: string | null, isDemo = false) {
  return useFetch<AICallLog[]>(async () => {
    if (isDemo) return DEMO_AI_CALLS
    if (!companyId) return []
    const { data, error } = await supabase
      .from('clinic_os_ai_calls')
      .select('*')
      .eq('company_id', companyId)
      .order('call_time', { ascending: false })
      .limit(100)
    if (error) throw error
    return (data ?? []) as AICallLog[]
  }, [companyId, isDemo])
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
    return (data ?? []) as Waitlist[]
  }, [companyId, isDemo])
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

  return useFetch<ClinicStats>(async () => {
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
  }, [companyId, isDemo])
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

export async function createAppointment(data: Partial<Appointment>) {
  const { data: result, error } = await supabase
    .from('clinic_os_appointments')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return result as Appointment
}

export async function createPatient(data: Partial<Patient>) {
  const { data: result, error } = await supabase
    .from('clinic_os_patients')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return result as Patient
}

export async function createDoctor(data: Partial<Doctor>) {
  const { data: result, error } = await supabase
    .from('clinic_os_doctors')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return result as Doctor
}

export async function createService(data: Partial<Service>) {
  const { data: result, error } = await supabase
    .from('clinic_os_services')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return result as Service
}

export async function updateService(id: string, data: Partial<Service>) {
  const { error } = await supabase
    .from('clinic_os_services')
    .update(data)
    .eq('id', id)
  if (error) throw error
}

export async function updateAICallStatus(id: string, status: 'confirmed' | 'rejected') {
  const { error } = await supabase
    .from('clinic_os_ai_calls')
    .update({ status, needs_review: false })
    .eq('id', id)
  if (error) throw error
}
