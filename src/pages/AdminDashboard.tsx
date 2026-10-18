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
import { AdminFinance } from '../components/dashboard/admin/AdminFinance'
import { AdminCampaigns } from '../components/dashboard/admin/AdminCampaigns'
import { AdminMarketers } from '../components/dashboard/admin/AdminMarketers'
import { AdminQuotes } from '../components/dashboard/admin/AdminQuotes'
import { AdminExpenses } from '../components/dashboard/admin/AdminExpenses'
import { AdminBankNotices } from '../components/dashboard/admin/AdminBankNotices'
import { AdminOnboarding } from '../components/dashboard/admin/AdminOnboarding'
import { AdminAgentsControl } from '../components/dashboard/admin/AdminAgentsControl'
import { AdminCallAssistant } from '../components/dashboard/admin/AdminCallAssistant'

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
        <Route path="no-website" element={<AdminOutreach mode="no-website" />} />
        <Route path="finance" element={<AdminFinance />} />
        <Route path="campaigns" element={<AdminCampaigns />} />
        <Route path="marketers" element={<AdminMarketers />} />
        <Route path="quotes" element={<AdminQuotes />} />
        <Route path="expenses" element={<AdminExpenses />} />
        <Route path="bank" element={<AdminBankNotices />} />
        <Route path="onboarding" element={<AdminOnboarding />} />
        <Route path="agents-control" element={<AdminAgentsControl />} />
        <Route path="call-assistant" element={<AdminCallAssistant />} />
        <Route path="*" element={<AdminCommandDeck />} />
      </Routes>
    </PlasmaAdminShell>
  )
}
