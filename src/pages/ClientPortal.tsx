import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { BarChart3, Calendar, LayoutDashboard, Loader2, MessageSquare, Settings, Users2, Zap } from 'lucide-react'
import { DashShell } from '../components/dash/DashShell'
import type { NavItem } from '../components/dash/DashSidebar'
import { useClientCompany } from '../hooks/useClientCompany'
import { LoadingScreen } from '../components/shared/LoadingScreen'

const ClinicOverview     = lazy(() => import('../components/dashboard/client/ClinicOverview').then(m => ({ default: m.ClinicOverview })))
const ClientOverview     = lazy(() => import('../components/dashboard/client/ClientOverview').then(m => ({ default: m.ClientOverview })))
const ClientAppointments = lazy(() => import('../components/dashboard/client/ClientAppointments').then(m => ({ default: m.ClientAppointments })))
const ClientConversations = lazy(() => import('../components/dashboard/client/ClientConversations').then(m => ({ default: m.ClientConversations })))
const ClientAutomations  = lazy(() => import('../components/dashboard/client/ClientAutomations').then(m => ({ default: m.ClientAutomations })))
const ClientLeads        = lazy(() => import('../components/dashboard/client/ClientLeads').then(m => ({ default: m.ClientLeads })))
const ClientReports      = lazy(() => import('../components/dashboard/client/ClientReports').then(m => ({ default: m.ClientReports })))
const ClientSettings     = lazy(() => import('../components/dashboard/client/ClientSettings').then(m => ({ default: m.ClientSettings })))
const PricingPage        = lazy(() => import('../components/dashboard/client/PricingPage').then(m => ({ default: m.PricingPage })))

const NAV_ITEMS: NavItem[] = [
  { to: '/client',               icon: LayoutDashboard, label: 'نظرة عامة',          end: true },
  { to: '/client/appointments',  icon: Calendar,        label: 'المواعيد'             },
  { to: '/client/conversations', icon: MessageSquare,   label: 'المحادثات'            },
  { to: '/client/automations',   icon: Zap,             label: 'الأتمتة'              },
  { to: '/client/leads',         icon: Users2,          label: 'العملاء'              },
  { to: '/client/reports',       icon: BarChart3,       label: 'التقارير'             },
  { to: '/client/settings',      icon: Settings,        label: 'الإعدادات'            },
]

const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 10 }}>
    <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite', color: '#22D3EE' }} />
    <span style={{ color: '#475569', fontFamily: 'Tajawal, sans-serif', fontSize: 13 }}>جاري التحميل...</span>
  </div>
)

function usePageTitle() {
  const location = useLocation()
  const match = NAV_ITEMS.find(item =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  )
  return match?.label ?? 'الرئيسية'
}

export const ClientPortal = () => {
  const { company, loading } = useClientCompany()
  const pageTitle = usePageTitle()
  const isClinic = company?.business_type === 'clinic' || company?.industry === 'clinic'

  if (loading) return <LoadingScreen variant="portal" />

  return (
    <DashShell navItems={NAV_ITEMS} role="client" pageTitle={pageTitle}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route index element={isClinic ? <ClinicOverview /> : <ClientOverview />} />
          <Route path="appointments"  element={<ClientAppointments />} />
          <Route path="conversations" element={<ClientConversations />} />
          <Route path="automations"   element={<ClientAutomations />} />
          <Route path="leads"         element={<ClientLeads />} />
          <Route path="reports"       element={<ClientReports />} />
          <Route path="upgrade"       element={<PricingPage />} />
          <Route path="settings"      element={<ClientSettings />} />
          <Route path="*"             element={isClinic ? <ClinicOverview /> : <ClientOverview />} />
        </Routes>
      </Suspense>
    </DashShell>
  )
}
