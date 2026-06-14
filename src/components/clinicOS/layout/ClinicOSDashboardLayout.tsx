import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ClinicOSSidebar } from './ClinicOSSidebar'
import { ClinicOSTopbar } from './ClinicOSTopbar'
import { DemoModeBanner } from '../ui/DemoModeBanner'
import { NewAppointmentModal } from '../ui/NewAppointmentModal'
import { WelcomeModal } from '../ui/WelcomeModal'
import { useIsMobile } from '../../../lib/useBreakpoint'
import type { Appointment } from '../../../types/clinicOS'

const PAGE_TITLES: Record<string, string> = {
  '/clinic-os/dashboard': 'الرئيسية',
  '/clinic-os/dashboard/value': 'قيمة النظام',
  '/clinic-os/dashboard/conversations': 'المحادثات',
  '/clinic-os/dashboard/bookings': 'الحجوزات',
  '/clinic-os/dashboard/leads': 'العملاء المحتملون',
  '/clinic-os/dashboard/lost-opportunities': 'الفرص الضائعة',
  '/clinic-os/dashboard/smart-calls': 'المكالمات الذكية',
  '/clinic-os/dashboard/missed-calls': 'المكالمات الفائتة',
  '/clinic-os/dashboard/usage': 'الباقة والاستخدام',
  '/clinic-os/dashboard/plans': 'الباقات',
  '/clinic-os/dashboard/knowledge': 'مركز المعرفة',
  '/clinic-os/dashboard/reports': 'التقارير',
  '/clinic-os/dashboard/settings': 'الإعدادات',
}

export const ClinicOSDashboardLayout = () => {
  const location = useLocation()
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showNewAppt, setShowNewAppt] = useState(false)
  const pageTitle = PAGE_TITLES[location.pathname] || 'لوحة التحكم'

  const handleCreated = (_appt: Appointment) => { /* refetch in real app */ }

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F6F8FC', direction: 'rtl' }}>
      <DemoModeBanner />

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          onClick={closeSidebar}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 40 }}
        />
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Sidebar */}
        <div style={{
          position: isMobile ? 'fixed' : 'sticky',
          top: 0,
          right: isMobile ? (sidebarOpen ? 0 : -240) : 'auto',
          height: isMobile ? '100vh' : '100vh',
          zIndex: isMobile ? 50 : 'auto',
          transition: isMobile ? 'right 0.25s ease' : 'none',
          flexShrink: 0,
          width: 232,
        }}>
          <ClinicOSSidebar
            onNewAppointment={() => { setShowNewAppt(true); closeSidebar() }}
            onClose={isMobile ? closeSidebar : undefined}
          />
        </div>

        {/* Main area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', minWidth: 0 }}>
          <ClinicOSTopbar
            pageTitle={pageTitle}
            onMenuToggle={() => setSidebarOpen(o => !o)}
            showMenuBtn={isMobile}
          />
          <main style={{ flex: 1, padding: isMobile ? '14px' : '22px', overflowY: 'auto' }}>
            <Outlet />
          </main>
        </div>
      </div>

      {showNewAppt && (
        <NewAppointmentModal
          onClose={() => setShowNewAppt(false)}
          onCreated={handleCreated}
        />
      )}

      <WelcomeModal />
    </div>
  )
}
