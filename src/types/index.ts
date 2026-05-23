export type Language = 'ar' | 'en'
export type UserRole = 'admin' | 'client'
export type Plan = 'starter' | 'growth' | 'enterprise'
export type BusinessType = 'clinic' | 'car_wash' | 'real_estate' | 'other'
export type AutomationType = 'whatsapp' | 'crm' | 'ai_agent' | 'booking' | 'sales'
export type AutomationStatus = 'active' | 'paused' | 'error' | 'building'
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
export type LogLevel = 'info' | 'warning' | 'error' | 'success'
export type CompanyStatus = 'active' | 'suspended' | 'trial'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  company_id?: string
  phone?: string
  avatar_url?: string
  created_at: string
}

export interface Company {
  id: string
  name: string
  industry: string
  business_type?: BusinessType
  plan: Plan
  status: CompanyStatus
  owner_name: string
  owner_email: string
  owner_phone: string
  monthly_messages: number
  monthly_leads: number
  automations_count: number
  message_limit: number
  messages_used: number
  plan_reset_at: string
  auth_user_id?: string
  created_at: string
}

export interface Automation {
  id: string
  company_id: string
  name: string
  type: AutomationType
  status: AutomationStatus
  messages_today: number
  messages_month: number
  leads_generated: number
  response_rate: number
  avg_response_time: number
  last_active: string
  created_at: string
  company?: Company
}

export interface Lead {
  id: string
  company_id: string
  automation_id?: string
  name: string
  phone: string
  email?: string
  source: string
  status: LeadStatus
  value?: number
  notes?: string
  last_contact: string
  created_at: string
}

export interface Log {
  id: string
  company_id?: string
  automation_id?: string
  level: LogLevel
  event: string
  message: string
  meta?: Record<string, unknown>
  created_at: string
}

export interface DashboardStats {
  total_companies: number
  active_automations: number
  total_leads: number
  messages_today: number
  revenue_month: number
  growth_pct: number
}

export interface ClientStats {
  active_automations: number
  total_leads: number
  messages_today: number
  response_rate: number
  leads_this_week: number
  conversion_rate: number
}

// Legacy types kept for compatibility
export interface Project {
  id: string
  client_id: string
  project_name: string
  service_type: string
  status: 'not_started' | 'in_progress' | 'testing' | 'completed' | 'on_hold'
  progress: number
  budget?: number
  start_date?: string
  end_date?: string
  description?: string
  created_at: string
  client?: User
}

export interface LeadFormData {
  name: string
  email: string
  phone: string
  service: string
  message: string
}

// Car Wash types
export type QueueStatus = 'received' | 'washing' | 'drying' | 'ready' | 'delivered'
export type CommissionType = 'fixed' | 'percentage'
export type ExpenseCategory = 'tools' | 'electricity' | 'rent' | 'other'

export interface CWWorker {
  id: string
  company_id: string
  name: string
  phone?: string
  commission_type: CommissionType
  commission_value: number
  active: boolean
  created_at: string
}

export interface CWQueueItem {
  id: string
  company_id: string
  customer_name: string
  phone?: string
  car_type?: string
  service_name?: string
  price: number
  worker_id?: string
  status: QueueStatus
  started_at?: string
  delivered_at?: string
  created_at: string
  worker?: CWWorker
}

export interface CWExpense {
  id: string
  company_id: string
  amount: number
  category: ExpenseCategory
  description?: string
  expense_date: string
  created_at: string
}
