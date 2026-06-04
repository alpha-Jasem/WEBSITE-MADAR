import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ClinicOSSidebar } from './ClinicOSSidebar'
import { ClinicOSTopbar } from './ClinicOSTopbar'
import { DemoModeBanner } from '../ui/DemoModeBanner'
import { NewAppointmentModal } from '../ui/NewAppointmentModal'
import type { Appointment } from '../../../types/clinicOS'

const PAGE_TITLES: Record<string, string> = {
  '/clinic-os/dashboard': 'لوحة التحكم',
  '/clinic-os/dashboard/appointments': 'المواعيد',
  '/clinic-os/dashboard/ai-booking': 'الحجز الذكي',
  '/clinic-os/dashboard/patients': 'المرضى',
  '/clinic-os/dashboard/doctors': 'الأطباء',
  '/clinic-os/dashboard/services': 'الخدمات',
  '/clinic-os/dashboard/calendar': 'التقويم',
  '/clinic-os/dashboard/messages': 'الرسائل',
  '/clinic-os/dashboard/settings': 'الإعدادات',
}

export const ClinicOSDashboardLayout = () => {
  const location = useLocation()
  const [showNewAppt, setShowNewAppt] = useState(false)
  const pageTitle = PAGE_TITLES[location.pathname] || 'لوحة التحكم'

  const handleCreated = (_appt: Appointment) => {
    // In a real app, add to state/refetch
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F8FAFC', direction: 'rtl' }}>
      <DemoModeBanner />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <ClinicOSSidebar onNewAppointment={() => setShowNewAppt(true)} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          <ClinicOSTopbar pageTitle={pageTitle} />
          <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
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
    </div>
  )
}
