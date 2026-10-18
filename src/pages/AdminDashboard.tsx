import { Routes, Route, Navigate } from 'react-router-dom'
import { PlasmaAdminShell } from '../components/dashboard/admin/PlasmaAdminShell'
import { AdminCommandDeck } from '../components/dashboard/admin/AdminCommandDeck'
import { AdminCompanies } from '../components/dashboard/admin/AdminCompanies'
import { AdminLogs } from '../components/dashboard/admin/AdminLogs'
import { AdminSettings } from '../components/dashboard/admin/AdminSettings'
import { AdminN8n } from '../components/dashboard/admin/AdminN8n'
import { AdminPipeline } from '../components/dashboard/admin/AdminPipeline'
import { AdminConversations } from '../components/dashboard/admin/AdminConversations'
import { AdminOverview } from '../components/dashboard/admin/AdminOverview'
import { AdminAIAgents } from '../components/dashboard/admin/AdminAIAgents'
import { AdminClinicAccounts } from '../components/dashboard/admin/AdminClinicAccounts'
import { AdminAPI } from '../components/dashboard/admin/AdminAPI'
import { AdminSalesBlitz } from '../components/dashboard/admin/AdminSalesBlitz'
import { AdminOutreach } from '../components/dashboard/admin/AdminOutreach'

export const AdminDashboard = () => {
  return (
    <PlasmaAdminShell>
      <Routes>
        <Route index element={<AdminCommandDeck />} />
        <Route path="reports" element={<AdminOverview />} />
        <Route path="companies" element={<AdminCompanies />} />
        <Route path="accounts" element={<AdminClinicAccounts />} />
        <Route path="leads" element={<Navigate to="/admin/outreach" replace />} />
        <Route path="logs" element={<AdminLogs />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="n8n" element={<AdminN8n />} />
        <Route path="pipeline" element={<AdminPipeline />} />
        <Route path="conversations" element={<AdminConversations />} />
        <Route path="ai-agents" element={<AdminAIAgents />} />
        <Route path="api" element={<AdminAPI />} />
        <Route path="sales-blitz" element={<AdminSalesBlitz />} />
        <Route path="outreach" element={<AdminOutreach />} />
        <Route path="*" element={<AdminCommandDeck />} />
      </Routes>
    </PlasmaAdminShell>
  )
}
