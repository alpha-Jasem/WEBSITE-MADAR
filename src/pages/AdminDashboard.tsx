import { Routes, Route, useLocation } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  Building2,
  Calendar,
  GitBranch,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users2,
  Workflow,
  Zap,
} from 'lucide-react'
import { DashShell } from '../components/dash/DashShell'
import type { NavItem } from '../components/dash/DashSidebar'
import { AdminCommandDeck } from '../components/dashboard/admin/AdminCommandDeck'
import { AdminCompanies } from '../components/dashboard/admin/AdminCompanies'
import { AdminAutomations } from '../components/dashboard/admin/AdminAutomations'
import { AdminLeads } from '../components/dashboard/admin/AdminLeads'
import { AdminLogs } from '../components/dashboard/admin/AdminLogs'
import { AdminSettings } from '../components/dashboard/admin/AdminSettings'
import { AdminN8n } from '../components/dashboard/admin/AdminN8n'
import { AdminPipeline } from '../components/dashboard/admin/AdminPipeline'
import { AdminAppointments } from '../components/dashboard/admin/AdminAppointments'
import { AdminConversations } from '../components/dashboard/admin/AdminConversations'
import { AdminOverview } from '../components/dashboard/admin/AdminOverview'

const navItems: NavItem[] = [
  { to: '/admin', icon: LayoutDashboard, label: 'مركز الإدارة', end: true },
  { to: '/admin/analytics', icon: BarChart3, label: 'التحليلات' },
  { to: '/admin/companies', icon: Building2, label: 'الشركات' },
  { to: '/admin/leads', icon: Users2, label: 'العملاء المحتملون' },
  { to: '/admin/pipeline', icon: GitBranch, label: 'خط المبيعات' },
  { to: '/admin/appointments', icon: Calendar, label: 'الحجوزات' },
  { to: '/admin/conversations', icon: MessageSquare, label: 'المحادثات' },
  { to: '/admin/automations', icon: Zap, label: 'الأتمتة' },
  { to: '/admin/n8n', icon: Workflow, label: 'n8n' },
  { to: '/admin/logs', icon: Activity, label: 'السجلات' },
  { to: '/admin/settings', icon: Settings, label: 'الإعدادات' },
]

function usePageTitle() {
  const location = useLocation()
  const match = navItems.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  )
  return match?.label ?? 'Overview'
}

export const AdminDashboard = () => {
  const pageTitle = usePageTitle()

  return (
    <DashShell navItems={navItems} role="admin" pageTitle={pageTitle}>
      <Routes>
        <Route index element={<AdminCommandDeck />} />
        <Route path="companies" element={<AdminCompanies />} />
        <Route path="automations" element={<AdminAutomations />} />
        <Route path="leads" element={<AdminLeads />} />
        <Route path="logs" element={<AdminLogs />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="n8n" element={<AdminN8n />} />
        <Route path="analytics" element={<AdminOverview />} />
        <Route path="pipeline" element={<AdminPipeline />} />
        <Route path="appointments" element={<AdminAppointments />} />
        <Route path="conversations" element={<AdminConversations />} />
        <Route path="*" element={<AdminOverview />} />
      </Routes>
    </DashShell>
  )
}
