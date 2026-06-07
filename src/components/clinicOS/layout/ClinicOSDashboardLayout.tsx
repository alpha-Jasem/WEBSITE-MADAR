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
  '/clinic-os/dashboard': 'لوحة التحكم',
  '/clinic-os/dashboard/appointments': 'المواعيد',
  '/clinic-os/dashboard/ai-booking': 'الحجز الذكي',
  '/clinic-os/dashboard/patients': 'العملاء',
  '/clinic-os/dashboard/doctors': 'الأطباء',
  '/clinic-os/dashboard/services': 'الخدمات',
  '/clinic-os/dashboard/calendar': 'التقويم',
  '/clinic-os/dashboard/messages': 'الرسائل',
  '/clinic-os/dashboard/reports': 'التقارير',
  '/clinic-os/dashboard/settings': 'الإعدادات',
  '/clinic-os/demo': 'لوحة التحكم',
  '/clinic-os/demo/appointments': 'المواعيد',
  '/clinic-os/demo/ai-booking': 'الحجز الذكي',
  '/clinic-os/demo/patients': 'العملاء',
  '/clinic-os/demo/doctors': 'الأطباء',
  '/clinic-os/demo/services': 'الخدمات',
  '/clinic-os/demo/calendar': 'التقويم',
  '/clinic-os/demo/messages': 'الرسائل',
  '/clinic-os/demo/reports': 'التقارير',
  '/clinic-os/demo/settings': 'الإعدادات',
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F8FAFC', direction: 'rtl' }}>
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
          width: 220,
        }}>
          <ClinicOSSidebar
            onNewAppointment={() => { setShowNewAppt(true); closeSidebar() }}
            onClose={closeSidebar}
          />
        </div>

        {/* Main area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', minWidth: 0 }}>
          <ClinicOSTopbar
            pageTitle={pageTitle}
            onMenuToggle={() => setSidebarOpen(o => !o)}
            showMenuBtn={isMobile}
          />
          <main style={{ flex: 1, padding: isMobile ? '16px' : '24px', overflowY: 'auto' }}>
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
