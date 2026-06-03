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

const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const ClientPortal = lazy(() => import('./pages/ClientPortal').then(m => ({ default: m.ClientPortal })))
const SolarEngine = lazy(() => import('./pages/SolarEngine').then(m => ({ default: m.SolarEngine })))

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
