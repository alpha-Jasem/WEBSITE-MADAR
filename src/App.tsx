import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { LanguageProvider } from './context/LanguageContext'
import { ClientCompanyProvider } from './context/ClientCompanyContext'
import { ActiveProfileProvider } from './context/ActiveProfileContext'
import { ProtectedRoute } from './components/shared/ProtectedRoute'
import { LoadingScreen } from './components/shared/LoadingScreen'
import { ErrorBoundary } from './components/shared/ErrorBoundary'
import { HomePage } from './pages/HomePage'
import { Login } from './pages/Login'
import { AuthCallback } from './pages/AuthCallback'
import { Privacy } from './pages/Privacy'
import { Terms } from './pages/Terms'
import { SelfCheckIn } from './pages/SelfCheckIn'
import { CarWashStatus } from './pages/CarWashStatus'

const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const ClientPortal = lazy(() => import('./pages/ClientPortal').then(m => ({ default: m.ClientPortal })))
const SolarEngine = lazy(() => import('./pages/SolarEngine').then(m => ({ default: m.SolarEngine })))

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <ErrorBoundary>
        <Suspense fallback={<LoadingScreen variant="portal" />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<Login />} />
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
      </BrowserRouter>
    </LanguageProvider>
  )
}

export default App
