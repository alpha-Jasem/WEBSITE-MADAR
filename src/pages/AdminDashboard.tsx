import { Routes, Route } from 'react-router-dom'
import { AdminSidebar } from '../components/dashboard/admin/AdminSidebar'
import { AdminOverview } from '../components/dashboard/admin/AdminOverview'
import { AdminCompanies } from '../components/dashboard/admin/AdminCompanies'
import { AdminAutomations } from '../components/dashboard/admin/AdminAutomations'
import { AdminLeads } from '../components/dashboard/admin/AdminLeads'
import { AdminLogs } from '../components/dashboard/admin/AdminLogs'
import { AdminSettings } from '../components/dashboard/admin/AdminSettings'
import { AdminN8n } from '../components/dashboard/admin/AdminN8n'

export const AdminDashboard = () => (
  <div className="flex h-screen overflow-hidden" style={{ background: '#0B0D12', direction: 'rtl' }}>
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div style={{ position: 'absolute', top: '-10%', right: '20%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.04) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      <div style={{ position: 'absolute', bottom: '10%', left: '10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,191,255,0.04) 0%, transparent 70%)', filter: 'blur(40px)' }} />
    </div>

    <AdminSidebar />
    <main className="flex-1 overflow-y-auto relative z-10" style={{ padding: '28px 32px' }}>
      <Routes>
        <Route index              element={<AdminOverview />} />
        <Route path="companies"   element={<AdminCompanies />} />
        <Route path="automations" element={<AdminAutomations />} />
        <Route path="leads"       element={<AdminLeads />} />
        <Route path="logs"        element={<AdminLogs />} />
        <Route path="settings"    element={<AdminSettings />} />
        <Route path="n8n"         element={<AdminN8n />} />
        <Route path="analytics"   element={<AdminOverview />} />
        <Route path="pipeline"    element={<AdminLeads />} />
        <Route path="messages"    element={<AdminLogs />} />
        <Route path="*"           element={<AdminOverview />} />
      </Routes>
    </main>
  </div>
)
