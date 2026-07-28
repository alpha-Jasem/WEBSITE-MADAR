import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { PackageType } from '../types/clinicOS'
import { supabase, signOut } from '../lib/supabase'
import { useLocation, useNavigate } from 'react-router-dom'
import { ToastProvider } from '../components/clinicOS/ui/Toast'
import { CLINIC_PLANS, AI_RECEPTIONIST_DEMO, getUsageMetrics, type UsageMetric } from '../lib/clinicOSProduct'
import { DEMO_CLINIC } from '../lib/clinicOSDemoData'

export interface ClinicUsageSummary {
  bookings: number
  conversations: number
  afterHours: number
  lostOpportunities: number
  smartCallMinutes: number
  recoveredCalls: number
  humanHandoffs: number
}

interface ClinicOSContextValue {
  packageType: PackageType
  setPackageType: (p: PackageType) => void
  clinicName: string
  userName: string
  userEmail: string
  clinicPhone: string
  clinicEmail: string
  clinicCity: string
  clinicLogoUrl: string
  clinicSettings: Record<string, unknown>
  companyId: string | null
  isOwner: boolean
  staffRole: string | null
  accountLoading: boolean
  accountError: string | null
  isDemo: boolean
  isSubscribed: boolean
  subscriptionStatus: string | null
  subscriptionStartDate: string | null
  subscriptionEndDate: string | null
  usageCycleStart: string | null
  usageCycleEnd: string | null
  usageMetrics: UsageMetric[]
  usageSummary: ClinicUsageSummary
  refreshAccount: () => Promise<void>
  logout: () => void
}

const ClinicOSContext = createContext<ClinicOSContextValue | null>(null)

const PACKAGE_KEY = 'clinicos_package'

export const ClinicOSProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [packageType, setPackageTypeState] = useState<PackageType>(() =>
    (localStorage.getItem(PACKAGE_KEY) as PackageType) || 'whatsapp'
  )
  const [clinicName, setClinicName] = useState('')
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [clinicPhone, setClinicPhone] = useState('')
  const [clinicEmail, setClinicEmail] = useState('')
  const [clinicCity, setClinicCity] = useState('')
  const [clinicLogoUrl, setClinicLogoUrl] = useState('')
  const [clinicSettings, setClinicSettings] = useState<Record<string, unknown>>({})
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [staffRole, setStaffRole] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [accountLoading, setAccountLoading] = useState(true)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
  const [subscriptionStartDate, setSubscriptionStartDate] = useState<string | null>(null)
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(null)
  const [usageCycleStart, setUsageCycleStart] = useState<string | null>(null)
  const [usageCycleEnd, setUsageCycleEnd] = useState<string | null>(null)
  const [usageMetrics, setUsageMetrics] = useState<UsageMetric[]>([])
  const [usageSummary, setUsageSummary] = useState<ClinicUsageSummary>({ bookings: 0, conversations: 0, afterHours: 0, lostOpportunities: 0, smartCallMinutes: 0, recoveredCalls: 0, humanHandoffs: 0 })

  const load = async () => {
      setAccountLoading(true)
      setAccountError(null)
      try {
        const demoRoute = location.pathname.includes('/demo-review') || location.pathname.includes('/clinic-os/demo')
        setIsDemo(demoRoute)

        if (demoRoute) {
          setCompanyId(DEMO_CLINIC.id)
          setClinicName(DEMO_CLINIC.name)
          setUserName('مستخدم تجريبي')
          setUserEmail(DEMO_CLINIC.email)
          setClinicPhone(DEMO_CLINIC.phone)
          setClinicEmail(DEMO_CLINIC.email)
          setClinicCity(DEMO_CLINIC.city)
          setClinicLogoUrl('')
          setClinicSettings({})
          setIsOwner(true)
          setStaffRole(null)
          setIsSubscribed(true)
          setSubscriptionStatus('active')
          const cycleStart = new Date().toISOString().slice(0, 10)
          const cycleEnd = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
          setSubscriptionStartDate(cycleStart)
          setSubscriptionEndDate(cycleEnd)
          setUsageCycleStart(cycleStart)
          setUsageCycleEnd(cycleEnd)
          setUsageMetrics(getUsageMetrics(packageType))
          setUsageSummary({
            bookings: AI_RECEPTIONIST_DEMO.bookings,
            conversations: AI_RECEPTIONIST_DEMO.conversations,
            afterHours: AI_RECEPTIONIST_DEMO.afterHours,
            lostOpportunities: AI_RECEPTIONIST_DEMO.lostOpportunities,
            smartCallMinutes: AI_RECEPTIONIST_DEMO.smartCalls,
            recoveredCalls: AI_RECEPTIONIST_DEMO.recoveredCalls,
            humanHandoffs: AI_RECEPTIONIST_DEMO.humanHandoffs,
          })
          return
        }

        const { data: authData } = await supabase.auth.getUser()
        const user = authData?.user
        if (!user) {
          navigate(`/clinic-os/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true })
          return
        }

        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
          navigate(`/clinic-os/mfa-challenge?redirect=${encodeURIComponent(location.pathname)}`, { replace: true })
          return
        }

        setUserEmail(user.email || '')

        const companyColumns = 'id, name, owner_phone, owner_email, city, logo_url, clinic_settings, package_type, clinic_plan_code, status, subscription_status, subscription_start_date, subscription_end_date, monthly_usage_cycle_start, monthly_usage_cycle_end'
        const [companyRes, userRes] = await Promise.allSettled([
          supabase.from('companies').select(companyColumns).eq('auth_user_id', user.id).single(),
          supabase.from('users').select('full_name').eq('id', user.id).single(),
        ])

        let company = companyRes.status === 'fulfilled' ? companyRes.value.data : null
        const userRow = userRes.status === 'fulfilled' ? userRes.value.data : null
        let ownerAccount = Boolean(company)
        let resolvedStaffRole: string | null = null

        if (!company) {
          const { data: staffRow } = await supabase
            .from('company_users')
            .select('company_id, role, full_name')
            .eq('auth_user_id', user.id)
            .maybeSingle()
          if (staffRow?.company_id) {
            resolvedStaffRole = staffRow.role
            const { data: staffCompany } = await supabase
              .from('companies')
              .select(companyColumns)
              .eq('id', staffRow.company_id)
              .single()
            company = staffCompany
            ownerAccount = false
            if (staffRow.full_name) setUserName(staffRow.full_name)
          }
        }
        setIsOwner(ownerAccount)
        setStaffRole(resolvedStaffRole)

        if (!company) {
          setAccountError('تعذر تحميل بيانات حساب العيادة. تواصل مع فريق دعم مدار.')
        }

        if (company?.id) setCompanyId(company.id)
        if (company?.name) setClinicName(company.name)
        setClinicPhone(company?.owner_phone || '')
        setClinicEmail(company?.owner_email || user.email || '')
        setClinicCity(company?.city || '')
        setClinicLogoUrl(company?.logo_url || '')
        setClinicSettings((company?.clinic_settings as Record<string, unknown>) || {})
        setSubscriptionStatus(company?.subscription_status || null)
        setSubscriptionStartDate(company?.subscription_start_date || null)
        setSubscriptionEndDate(company?.subscription_end_date || null)
        setUsageCycleStart(company?.monthly_usage_cycle_start || null)
        setUsageCycleEnd(company?.monthly_usage_cycle_end || null)
        const subscribed = Boolean(company && company.status !== 'trial' && company.subscription_status === 'active' && company.subscription_start_date && company.subscription_end_date)
        setIsSubscribed(subscribed)
        if (userRow?.full_name) setUserName(userRow.full_name)
        if (company?.clinic_plan_code || company?.package_type) {
          const pkg = (company.clinic_plan_code || company.package_type) as PackageType
          setPackageTypeState(pkg)
          localStorage.setItem(PACKAGE_KEY, pkg)

          if (subscribed && company.id) {
            const [limitsRes, usageRes] = await Promise.all([
              supabase.from('clinic_os_usage_limits').select('*').eq('company_id', company.id).maybeSingle(),
              supabase.from('clinic_os_usage').select('*').eq('company_id', company.id).order('cycle_start', { ascending: false }).limit(1).maybeSingle(),
            ])
            const limits = limitsRes.data
            const usage = usageRes.data
            const defaults = CLINIC_PLANS[pkg].limits
            setUsageMetrics([
              { key: 'whatsapp', label: 'محادثات واتساب', used: usage?.whatsapp_conversations_used || 0, limit: limits?.whatsapp_conversations_limit ?? defaults.whatsapp },
              { key: 'ai_messages', label: 'ردود المساعد الذكي', used: usage?.ai_messages_used || 0, limit: limits?.ai_messages_limit ?? defaults.ai_messages },
              { key: 'smart_calls', label: 'دقائق الاتصال الذكي', used: usage?.smart_call_minutes_used || 0, limit: limits?.smart_call_minutes_limit ?? defaults.smart_calls },
              { key: 'reminders', label: 'تذكيرات المواعيد', used: usage?.appointment_reminders_used || 0, limit: limits?.appointment_reminders_limit ?? defaults.reminders },
            ])
            setUsageSummary({
              bookings: usage?.bookings_created || 0,
              conversations: usage?.whatsapp_conversations_used || 0,
              afterHours: usage?.after_hours_conversations || 0,
              lostOpportunities: usage?.lost_opportunities || 0,
              smartCallMinutes: usage?.smart_call_minutes_used || 0,
              recoveredCalls: usage?.missed_call_recoveries || 0,
              humanHandoffs: usage?.human_handoffs || 0,
            })
          } else {
            setUsageMetrics([])
            setUsageSummary({ bookings: 0, conversations: 0, afterHours: 0, lostOpportunities: 0, smartCallMinutes: 0, recoveredCalls: 0, humanHandoffs: 0 })
          }
        }
      } catch {
        // Individual pages expose their own recoverable error states.
      } finally {
        setAccountLoading(false)
      }
    }

  useEffect(() => {
    load()
  }, [location.pathname])

  const setPackageType = (p: PackageType) => {
    setPackageTypeState(p)
    localStorage.setItem(PACKAGE_KEY, p)
  }

  const logout = async () => {
    await signOut()
    localStorage.removeItem(PACKAGE_KEY)
    navigate('/login', { replace: true })
  }

  return (
    <ClinicOSContext.Provider value={{ packageType, setPackageType, clinicName, userName, userEmail, clinicPhone, clinicEmail, clinicCity, clinicLogoUrl, clinicSettings, companyId, isOwner, staffRole, accountLoading, accountError, isDemo, isSubscribed, subscriptionStatus, subscriptionStartDate, subscriptionEndDate, usageCycleStart, usageCycleEnd, usageMetrics, usageSummary, refreshAccount: load, logout }}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ClinicOSContext.Provider>
  )
}

export const useClinicOS = () => {
  const ctx = useContext(ClinicOSContext)
  if (!ctx) throw new Error('useClinicOS must be used inside ClinicOSProvider')
  return ctx
}
