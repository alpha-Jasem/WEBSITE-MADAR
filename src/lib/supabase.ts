import { createClient } from '@supabase/supabase-js'
import type { Company, Automation, Lead, Log, DashboardStats, ClientStats } from '../types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Auth ──────────────────────────────────────────────────────────────────────

export const signInWithPassword = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password })

export const signInWithMagicLink = (email: string) =>
  supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
  })

export const signOut = () => supabase.auth.signOut()

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
  return data ?? { id: user.id, email: user.email, role: 'client', full_name: '' }
}

// ── Admin queries ─────────────────────────────────────────────────────────────

export const fetchAdminStats = async (): Promise<DashboardStats | null> => {
  const { data, error } = await supabase.from('admin_stats').select('*').single()
  if (error) return null
  return data
}

export const fetchCompanies = async (): Promise<Company[]> => {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return []
  return data ?? []
}

export const fetchAllAutomations = async (): Promise<Automation[]> => {
  const { data, error } = await supabase
    .from('automations')
    .select('*, company:companies(name, industry)')
    .order('created_at', { ascending: false })
  if (error) return []
  return data ?? []
}

export const fetchAllLeads = async (): Promise<Lead[]> => {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return []
  return data ?? []
}

export const fetchLogs = async (limit = 100): Promise<Log[]> => {
  const { data, error } = await supabase
    .from('logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return data ?? []
}

// ── Client queries (RLS-scoped to company_id) ─────────────────────────────────

export const fetchClientStats = async (companyId: string): Promise<ClientStats | null> => {
  const { data, error } = await supabase
    .from('client_stats')
    .select('*')
    .eq('company_id', companyId)
    .single()
  if (error) return null
  return data
}

export const fetchClientAutomations = async (companyId: string): Promise<Automation[]> => {
  const { data, error } = await supabase
    .from('automations')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) return []
  return data ?? []
}

export const fetchClientLeads = async (companyId: string): Promise<Lead[]> => {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) return []
  return data ?? []
}

export const updateAutomationStatus = async (id: string, status: string) =>
  supabase.from('automations').update({ status }).eq('id', id)

export const updateLeadStatus = async (id: string, status: string) =>
  supabase.from('leads').update({ status }).eq('id', id)
