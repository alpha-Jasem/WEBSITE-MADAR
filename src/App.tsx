import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { LanguageProvider } from './context/LanguageContext'
import { ClientCompanyProvider } from './context/ClientCompanyContext'
import { ActiveProfileProvider } from './context/ActiveProfileContext'
import { ProtectedRoute } from './components/shared/ProtectedRoute'
import { LoadingScreen } from './components/shared/LoadingScreen'
import { ErrorBoundary, reloadForFreshAssets } from './components/shared/ErrorBoundary'
import { PlatformHome } from './pages/PlatformHome'
import { HomePage } from './pages/HomePage'
import { Login } from './pages/Login'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { TrialSignup } from './pages/TrialSignup'
import { AuthCallback } from './pages/AuthCallback'
import { Privacy } from './pages/Privacy'
import { Terms } from './pages/Terms'
import { SelfCheckIn } from './pages/SelfCheckIn'
import { CarWashStatus } from './pages/CarWashStatus'
import { ClinicLanding } from './pages/ClinicLanding'
import { ClinicOSProvider } from './context/ClinicOSContext'

const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const ClientPortal = lazy(() => import('./pages/ClientPortal').then(m => ({ default: m.ClientPortal })))
const SolarEngine = lazy(() => import('./pages/SolarEngine').then(m => ({ default: m.SolarEngine })))

// Clinic OS public pages
const ClinicOSLanding = lazy(() => import('./pages/clinicOS/ClinicOSLanding').then(m => ({ default: m.ClinicOSLanding })))
const DemoSignup = lazy(() => import('./pages/clinicOS/DemoSignup').then(m => ({ default: m.DemoSignup })))
const DemoConfirm = lazy(() => import('./pages/clinicOS/DemoConfirm').then(m => ({ default: m.DemoConfirm })))
const ClinicOSLogin = lazy(() => import('./pages/clinicOS/ClinicOSLogin').then(m => ({ default: m.ClinicOSLogin })))
const PackageSelector = lazy(() => import('./pages/clinicOS/PackageSelector').then(m => ({ default: m.PackageSelector })))

// Clinic OS dashboard
const ClinicOSDashboardLayout = lazy(() => import('./components/clinicOS/layout/ClinicOSDashboardLayout').then(m => ({ default: m.ClinicOSDashboardLayout })))
const DashboardOverview = lazy(() => import('./pages/clinicOS/dashboard/DashboardOverview').then(m => ({ default: m.DashboardOverview })))
const Appointments = lazy(() => import('./pages/clinicOS/dashboard/Appointments').then(m => ({ default: m.Appointments })))
const AIBooking = lazy(() => import('./pages/clinicOS/dashboard/AIBooking').then(m => ({ default: m.AIBooking })))
const Patients = lazy(() => import('./pages/clinicOS/dashboard/Patients').then(m => ({ default: m.Patients })))
const Doctors = lazy(() => import('./pages/clinicOS/dashboard/Doctors').then(m => ({ default: m.Doctors })))
const Services = lazy(() => import('./pages/clinicOS/dashboard/Services').then(m => ({ default: m.Services })))
const CalendarPage = lazy(() => import('./pages/clinicOS/dashboard/CalendarPage').then(m => ({ default: m.CalendarPage })))
const Messages = lazy(() => import('./pages/clinicOS/dashboard/Messages').then(m => ({ default: m.Messages })))
const Settings = lazy(() => import('./pages/clinicOS/dashboard/Settings').then(m => ({ default: m.Settings })))

function AppRoutes() {
  const location = useLocation()

  return (
    <ErrorBoundary resetKey={location.pathname}>
      <Suspense fallback={<LoadingScreen variant="portal" />}>
        <Routes>
          <Route path="/" element={<PlatformHome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/trial" element={<TrialSignup />} />
          <Route path="/clinic"      element={<ClinicLanding />} />
          <Route path="/car-wash"    element={<HomePage />} />
          <Route path="/real-estate" element={<Navigate to="/" replace />} />
          <Route path="/checkin/:token" element={<SelfCheckIn />} />
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
          {/* Clinic OS public */}
          <Route path="/clinic-os" element={<ClinicOSProvider><ClinicOSLanding /></ClinicOSProvider>} />
          <Route path="/clinic-os/demo-signup" element={<ClinicOSProvider><DemoSignup /></ClinicOSProvider>} />
          <Route path="/clinic-os/demo-confirm" element={<ClinicOSProvider><DemoConfirm /></ClinicOSProvider>} />
          <Route path="/clinic-os/login" element={<ClinicOSProvider><ClinicOSLogin /></ClinicOSProvider>} />
          <Route path="/clinic-os/demo/select" element={<ClinicOSProvider><PackageSelector /></ClinicOSProvider>} />

          {/* Clinic OS dashboard */}
          <Route
            path="/clinic-os/dashboard"
            element={<ClinicOSProvider><ClinicOSDashboardLayout /></ClinicOSProvider>}
          >
            <Route index element={<DashboardOverview />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="ai-booking" element={<AIBooking />} />
            <Route path="patients" element={<Patients />} />
            <Route path="doctors" element={<Doctors />} />
            <Route path="services" element={<Services />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="messages" element={<Messages />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

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
        <AppRoutes />
      </BrowserRouter>
    </LanguageProvider>
  )
}

export default App
