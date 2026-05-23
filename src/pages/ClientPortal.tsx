import { Routes, Route, useLocation } from 'react-router-dom'
import { BarChart3, Calendar, LayoutDashboard, MessageSquare, Settings, Users2, Wrench, Zap } from 'lucide-react'
import { DashShell } from '../components/dash/DashShell'
import type { NavItem } from '../components/dash/DashSidebar'
import { ClientOverview } from '../components/dashboard/client/ClientOverview'
import { ClientAutomations } from '../components/dashboard/client/ClientAutomations'
import { ClientLeads } from '../components/dashboard/client/ClientLeads'
import { ClientReports } from '../components/dashboard/client/ClientReports'
import { ClientSettings } from '../components/dashboard/client/ClientSettings'
import { ClientSetup } from '../components/dashboard/client/ClientSetup'
import { ClientAppointments } from '../components/dashboard/client/ClientAppointments'
import { ClientConversations } from '../components/dashboard/client/ClientConversations'
import { useClientCompany } from '../hooks/useClientCompany'
import { getClientIndustryTemplate } from '../lib/clientIndustryTemplates'

function buildNavItems(labels: ReturnType<typeof getClientIndustryTemplate>['navLabels']): NavItem[] {
  return [
    { to: '/client', icon: LayoutDashboard, label: labels.overview, end: true },
    { to: '/client/setup', icon: Wrench, label: labels.setup },
    { to: '/client/appointments', icon: Calendar, label: labels.appointments },
    { to: '/client/conversations', icon: MessageSquare, label: labels.conversations },
    { to: '/client/automations', icon: Zap, label: labels.automations },
    { to: '/client/leads', icon: Users2, label: labels.leads },
    { to: '/client/reports', icon: BarChart3, label: labels.reports },
    { to: '/client/settings', icon: Settings, label: labels.settings },
  ]
}

function usePageTitle(navItems: NavItem[]) {
  const location = useLocation()
  const match = navItems.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  )
  return match?.label ?? navItems[0]?.label ?? 'نظرة عامة'
}

export const ClientPortal = () => {
  const { company } = useClientCompany()
  const template = getClientIndustryTemplate(company?.business_type, company?.industry)
  const navItems = buildNavItems(template.navLabels)
  const pageTitle = usePageTitle(navItems)

  return (
    <DashShell navItems={navItems} role="client" pageTitle={pageTitle}>
      <Routes>
        <Route index element={<ClientOverview />} />
        <Route path="setup" element={<ClientSetup />} />
        <Route path="appointments" element={<ClientAppointments />} />
        <Route path="conversations" element={<ClientConversations />} />
        <Route path="automations" element={<ClientAutomations />} />
        <Route path="leads" element={<ClientLeads />} />
        <Route path="reports" element={<ClientReports />} />
        <Route path="settings" element={<ClientSettings />} />
        <Route path="*" element={<ClientOverview />} />
      </Routes>
    </DashShell>
  )
}
