import { Routes, Route } from 'react-router-dom'
import { ClientSidebarNew } from '../components/dashboard/client/ClientSidebarNew'
import { ClientOverview } from '../components/dashboard/client/ClientOverview'
import { ClientAutomations } from '../components/dashboard/client/ClientAutomations'
import { ClientLeads } from '../components/dashboard/client/ClientLeads'
import { ClientReports } from '../components/dashboard/client/ClientReports'
import { ClientSettings } from '../components/dashboard/client/ClientSettings'

export const ClientPortal = () => (
  <div className="flex h-screen overflow-hidden" style={{ background: '#05060A', direction: 'rtl' }}>
    <ClientSidebarNew />
    <main className="flex-1 overflow-y-auto p-6 lg:p-8">
      <Routes>
        <Route index              element={<ClientOverview />} />
        <Route path="automations" element={<ClientAutomations />} />
        <Route path="leads"       element={<ClientLeads />} />
        <Route path="reports"     element={<ClientReports />} />
        <Route path="settings"    element={<ClientSettings />} />
        <Route path="*"           element={<ClientOverview />} />
      </Routes>
    </main>
  </div>
)
