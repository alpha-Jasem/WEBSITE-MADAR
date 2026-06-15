import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { LanguageProvider } from './context/LanguageContext'
import { ClientCompanyProvider } from './context/ClientCompanyContext'
import { ActiveProfileProvider } from './context/ActiveProfileContext'
import { ClinicOSProvider } from './context/ClinicOSContext'
import { ProtectedRoute } from './components/shared/ProtectedRoute'
import { ErrorBoundary, reloadForFreshAssets } from './components/shared/ErrorBoundary'
import { HomePage } from './pages/HomePage'
import { CarWashPage } from './pages/CarWashPage'
import { ClinicLanding } from './pages/ClinicLanding'
import { ClinicOSLanding } from './pages/ClinicOSLanding'
import { Login } from './pages/Login'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { TrialSignup } from './pages/TrialSignup'
import { AuthCallback } from './pages/AuthCallback'
import { Privacy } from './pages/Privacy'
import { Terms } from './pages/Terms'
// Note: ClinicOSProvider wraps only /clinic-os/dashboard/* routes (protected)

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

const AdminDashboard    = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const ClientPortal      = lazy(() => import('./pages/ClientPortal').then(m => ({ default: m.ClientPortal })))
const SolarEngine       = lazy(() => import('./pages/SolarEngine').then(m => ({ default: m.SolarEngine })))
const SelfCheckIn       = lazy(() => import('./pages/SelfCheckIn').then(m => ({ default: m.SelfCheckIn })))
const CarWashStatus     = lazy(() => import('./pages/CarWashStatus').then(m => ({ default: m.CarWashStatus })))
const LoyaltyCard       = lazy(() => import('./pages/LoyaltyCard').then(m => ({ default: m.LoyaltyCard })))

// ClinicOS
const ClinicOSLoginPage    = lazy(() => import('./pages/clinicOS/ClinicOSLogin').then(m => ({ default: m.ClinicOSLogin })))
const ClinicOSSignupPage   = lazy(() => import('./pages/clinicOS/ClinicOSSignup').then(m => ({ default: m.ClinicOSSignup })))
const DemoSignupPage       = lazy(() => import('./pages/clinicOS/DemoSignup').then(m => ({ default: m.DemoSignup })))
const DemoConfirmPage      = lazy(() => import('./pages/clinicOS/DemoConfirm').then(m => ({ default: m.DemoConfirm })))
const PackageSelectorPage  = lazy(() => import('./pages/clinicOS/PackageSelector').then(m => ({ default: m.PackageSelector })))
const ClinicOSDashLayout   = lazy(() => import('./components/clinicOS/layout/ClinicOSDashboardLayout').then(m => ({ default: m.ClinicOSDashboardLayout })))
const DashboardOverview    = lazy(() => import('./pages/clinicOS/dashboard/DashboardOverview').then(m => ({ default: m.DashboardOverview })))
const AppointmentsPage     = lazy(() => import('./pages/clinicOS/dashboard/Appointments').then(m => ({ default: m.Appointments })))
const AIBookingPage        = lazy(() => import('./pages/clinicOS/dashboard/AIBooking').then(m => ({ default: m.AIBooking })))
const PatientsPage         = lazy(() => import('./pages/clinicOS/dashboard/Patients').then(m => ({ default: m.Patients })))
const DoctorsPage          = lazy(() => import('./pages/clinicOS/dashboard/Doctors').then(m => ({ default: m.Doctors })))
const ServicesPage         = lazy(() => import('./pages/clinicOS/dashboard/Services').then(m => ({ default: m.Services })))
const CalendarPageCO       = lazy(() => import('./pages/clinicOS/dashboard/CalendarPage').then(m => ({ default: m.CalendarPage })))
const MessagesPageCO       = lazy(() => import('./pages/clinicOS/dashboard/Messages').then(m => ({ default: m.Messages })))
const ReportsPageCO        = lazy(() => import('./pages/clinicOS/dashboard/Reports').then(m => ({ default: m.Reports })))
const SettingsPageCO       = lazy(() => import('./pages/clinicOS/dashboard/Settings').then(m => ({ default: m.Settings })))
const SystemValuePage      = lazy(() => import('./pages/clinicOS/dashboard/AIReceptionistPages').then(m => ({ default: m.SystemValuePage })))
const ConversationsPage    = lazy(() => import('./pages/clinicOS/dashboard/AIReceptionistPages').then(m => ({ default: m.ConversationsPage })))
const BookingsPage         = lazy(() => import('./pages/clinicOS/dashboard/AIReceptionistPages').then(m => ({ default: m.BookingsPage })))
const LeadsPage            = lazy(() => import('./pages/clinicOS/dashboard/AIReceptionistPages').then(m => ({ default: m.LeadsPage })))
const LostOpportunitiesPage = lazy(() => import('./pages/clinicOS/dashboard/AIReceptionistPages').then(m => ({ default: m.LostOpportunitiesPage })))
const SmartCallsPage       = lazy(() => import('./pages/clinicOS/dashboard/AIReceptionistPages').then(m => ({ default: m.SmartCallsPage })))
const MissedCallsPage      = lazy(() => import('./pages/clinicOS/dashboard/AIReceptionistPages').then(m => ({ default: m.MissedCallsPage })))
const PlanUsagePage        = lazy(() => import('./pages/clinicOS/dashboard/AIReceptionistPages').then(m => ({ default: m.PlanUsagePage })))
const PlansPage            = lazy(() => import('./pages/clinicOS/dashboard/Plans').then(m => ({ default: m.PlansPage })))
const KnowledgeCenterPage  = lazy(() => import('./pages/clinicOS/dashboard/AIReceptionistPages').then(m => ({ default: m.KnowledgeCenterPage })))
const DemoReviewPage       = lazy(() => import('./pages/clinicOS/DemoReview').then(m => ({ default: m.DemoReview })))
const ClinicOSAdminPage    = lazy(() => import('./pages/clinicOS/admin/ClinicOSAdmin').then(m => ({ default: m.ClinicOSAdmin })))

function App() {
  useEffect(() => {
    const handlePreloadError = (event: Event) => {
      event.preventDefault()
      reloadForFreshAssets('preload')
    }
    window.addEventListener('vite:preloadError', handlePreloadError)
    return () => window.removeEventListener('vite:preloadError', handlePreloadError)
  }, [])

  return (
    <LanguageProvider>
      <BrowserRouter>
        <ErrorBoundary>
        <ScrollToTop />
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/car-wash" element={<CarWashPage />} />
            <Route path="/clinic" element={<ClinicLanding />} />
            <Route path="/clinic-os" element={<ClinicOSLanding />} />

            {/* ── ClinicOS Auth & Onboarding ── */}
            <Route path="/clinic-os/login"    element={<ClinicOSLoginPage />} />
            <Route path="/clinic-os/signup"   element={<ClinicOSSignupPage />} />
            <Route path="/clinic-os/demo"     element={<DemoSignupPage />} />
            <Route path="/clinic-os/demo/confirm" element={<DemoConfirmPage />} />
            <Route path="/demo-review" element={<ClinicOSProvider><DemoReviewPage /></ClinicOSProvider>} />
            <Route path="/clinic-os/admin" element={<ClinicOSAdminPage />} />
            <Route path="/clinic-os/select"   element={
              <ClinicOSProvider><PackageSelectorPage /></ClinicOSProvider>
            } />

            {/* ── ClinicOS Dashboard ── */}
            <Route path="/clinic-os/dashboard/*" element={
              <ClinicOSProvider>
                <ClinicOSDashLayout />
              </ClinicOSProvider>
            }>
              <Route index          element={<DashboardOverview />} />
              <Route path="value" element={<SystemValuePage />} />
              <Route path="conversations" element={<ConversationsPage />} />
              <Route path="bookings" element={<BookingsPage />} />
              <Route path="leads" element={<LeadsPage />} />
              <Route path="lost-opportunities" element={<LostOpportunitiesPage />} />
              <Route path="smart-calls" element={<SmartCallsPage />} />
              <Route path="missed-calls" element={<MissedCallsPage />} />
              <Route path="usage" element={<PlanUsagePage />} />
              <Route path="plans" element={<PlansPage />} />
              <Route path="knowledge" element={<KnowledgeCenterPage />} />
              <Route path="appointments" element={<AppointmentsPage />} />
              <Route path="ai-booking"   element={<AIBookingPage />} />
              <Route path="patients"     element={<PatientsPage />} />
              <Route path="doctors"      element={<DoctorsPage />} />
              <Route path="services"     element={<ServicesPage />} />
              <Route path="calendar"     element={<CalendarPageCO />} />
              <Route path="messages"     element={<MessagesPageCO />} />
              <Route path="reports"      element={<ReportsPageCO />} />
              <Route path="settings"     element={<SettingsPageCO />} />
            </Route>
            <Route path="/real-estate" element={<Navigate to="/#products" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/trial" element={<TrialSignup />} />
            <Route path="/checkin/:token" element={<SelfCheckIn />} />
            <Route path="/card/:customerId" element={<LoyaltyCard />} />
            <Route path="/status/:token/:queueId" element={<CarWashStatus />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/*"
              element={
                <ProtectedRoute requiredRole="client">
                  <ClientCompanyProvider>
                    <ActiveProfileProvider>
                      <ClientPortal />
                    </ActiveProfileProvider>
                  </ClientCompanyProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/solar/*"
              element={
                <ProtectedRoute requiredRole="admin">
                  <SolarEngine />
                </ProtectedRoute>
              }
            />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </LanguageProvider>
  )
}

export default App
