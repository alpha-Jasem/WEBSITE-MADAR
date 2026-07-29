import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { LanguageProvider } from './context/LanguageContext'
import { ClinicOSProvider } from './context/ClinicOSContext'
import { ProtectedRoute } from './components/shared/ProtectedRoute'
import { ErrorBoundary, reloadForFreshAssets } from './components/shared/ErrorBoundary'
import { ClinicAILanding } from './pages/ClinicAILanding'
import { Lumora } from './pages/Lumora'
import { Login } from './pages/Login'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { TrialSignup } from './pages/TrialSignup'
import { AuthCallback } from './pages/AuthCallback'
import { Privacy } from './pages/Privacy'
import { Terms } from './pages/Terms'
import { BookACallPage } from './pages/BookACallPage'
import { NotFound } from './pages/NotFound'
// Note: ClinicOSProvider wraps only /clinic-os/dashboard/* routes (protected)

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

// The old React homepage was replaced by THE SIGNAL cinematic landing
// (public/signal/index.html, forced at "/" in production via public/_redirects).
// This mirrors that behavior in local dev, where _redirects isn't honored.
function SignalRedirect() {
  useEffect(() => { window.location.replace('/signal/index.html') }, [])
  return null
}

// Strip ?fresh= from URL without reload
if (typeof window !== 'undefined') {
  const url = new URL(window.location.href)
  if (url.searchParams.has('fresh')) {
    url.searchParams.delete('fresh')
    window.history.replaceState(null, '', url.pathname + (url.search || '') + url.hash)
  }
}


const AdminDashboard    = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const SolarEngine       = lazy(() => import('./pages/SolarEngine').then(m => ({ default: m.SolarEngine })))

// ClinicOS
const ClinicOSLoginPage    = lazy(() => import('./pages/clinicOS/ClinicOSLogin').then(m => ({ default: m.ClinicOSLogin })))
const DashboardV3Login     = lazy(() => import('./dashboard-v3/views/auth/auth2/login'))
const ClinicOSSignupPage   = lazy(() => import('./pages/clinicOS/ClinicOSSignup').then(m => ({ default: m.ClinicOSSignup })))
const DemoSignupPage       = lazy(() => import('./pages/clinicOS/DemoSignup').then(m => ({ default: m.DemoSignup })))
const DemoConfirmPage      = lazy(() => import('./pages/clinicOS/DemoConfirm').then(m => ({ default: m.DemoConfirm })))
const PackageSelectorPage  = lazy(() => import('./pages/clinicOS/PackageSelector').then(m => ({ default: m.PackageSelector })))
const MfaChallengePage     = lazy(() => import('./pages/clinicOS/MfaChallenge').then(m => ({ default: m.MfaChallenge })))
const ClinicOSAdminPage    = lazy(() => import('./pages/clinicOS/admin/ClinicOSAdmin').then(m => ({ default: m.ClinicOSAdmin })))

// ClinicOS Dashboard v3 (shadcn/ui — official dashboard)
const DashboardV3FullLayout    = lazy(() => import('./dashboard-v3/layouts/full/FullLayout'))
const DashboardV3Modern        = lazy(() => import('./dashboard-v3/views/dashboards/modern'))
const DashboardV3Tables        = lazy(() => import('./dashboard-v3/views/pages/tables'))
const DashboardV3Form          = lazy(() => import('./dashboard-v3/views/pages/form'))
const DashboardV3UserProfile   = lazy(() => import('./dashboard-v3/views/pages/user-profile'))
const DashboardV3Icons         = lazy(() => import('./dashboard-v3/views/icons/iconify'))
const DashboardV3BlogPost      = lazy(() => import('./dashboard-v3/views/apps/blog/post'))
const DashboardV3BlogDetail    = lazy(() => import('./dashboard-v3/views/apps/blog/detail'))
const DashboardV3BlogCreate    = lazy(() => import('./dashboard-v3/views/apps/blog/create'))
const DashboardV3BlogEdit      = lazy(() => import('./dashboard-v3/views/apps/blog/edit'))
const DashboardV3BlogManage    = lazy(() => import('./dashboard-v3/views/apps/blog/manage-blog'))
const DashboardV3Notes         = lazy(() => import('./dashboard-v3/views/apps/notes'))
const DashboardV3Tickets       = lazy(() => import('./dashboard-v3/views/apps/tickets'))
const DashboardV3TicketCreate  = lazy(() => import('./dashboard-v3/views/apps/tickets/create'))

// ClinicOS Dashboard v3 — standalone auth screens (no dashboard shell)
const DashboardV3Register        = lazy(() => import('./dashboard-v3/views/auth/auth2/register'))
const DashboardV3ForgotPassword  = lazy(() => import('./dashboard-v3/views/auth/auth2/forgot-password'))
const DashboardV3TwoSteps        = lazy(() => import('./dashboard-v3/views/auth/auth2/two-steps'))
const DashboardV3AuthError       = lazy(() => import('./dashboard-v3/views/auth/error'))
const DashboardV3Maintenance     = lazy(() => import('./dashboard-v3/views/auth/maintenance'))

// ClinicOS Dashboard v2 (Madar Software Design System) — archived to src/_archive, still used by the /demo-review sales tour
const DashboardV2Layout        = lazy(() => import('./_archive/dashboardV2/components/DashboardV2Layout').then(m => ({ default: m.DashboardV2Layout })))
const DashboardV2Home          = lazy(() => import('./_archive/dashboardV2/pages/Home').then(m => ({ default: m.DashboardV2Home })))
const DashboardV2Bookings      = lazy(() => import('./_archive/dashboardV2/pages/Bookings').then(m => ({ default: m.DashboardV2Bookings })))
const DashboardV2Patients      = lazy(() => import('./_archive/dashboardV2/pages/Patients').then(m => ({ default: m.DashboardV2Patients })))
const DashboardV2Conversations = lazy(() => import('./_archive/dashboardV2/pages/Conversations').then(m => ({ default: m.DashboardV2Conversations })))
const DashboardV2Reviews       = lazy(() => import('./_archive/dashboardV2/pages/Reviews').then(m => ({ default: m.DashboardV2Reviews })))
const DashboardV2Revenue       = lazy(() => import('./_archive/dashboardV2/pages/Revenue').then(m => ({ default: m.DashboardV2Revenue })))
const DashboardV2Reports       = lazy(() => import('./_archive/dashboardV2/pages/Reports').then(m => ({ default: m.DashboardV2Reports })))
const DashboardV2Reminders     = lazy(() => import('./_archive/dashboardV2/pages/Reminders').then(m => ({ default: m.DashboardV2Reminders })))
const DashboardV2Integrations  = lazy(() => import('./_archive/dashboardV2/pages/Integrations').then(m => ({ default: m.DashboardV2Integrations })))
const DashboardV2Settings      = lazy(() => import('./_archive/dashboardV2/pages/Settings').then(m => ({ default: m.DashboardV2Settings })))
const DashboardV2Services      = lazy(() => import('./_archive/dashboardV2/pages/Services').then(m => ({ default: m.DashboardV2Services })))
const DashboardV2AuditLog      = lazy(() => import('./_archive/dashboardV2/pages/AuditLog').then(m => ({ default: m.DashboardV2AuditLog })))
const DashboardV2MadarAgentUsage = lazy(() => import('./_archive/dashboardV2/pages/MadarAgentUsage').then(m => ({ default: m.DashboardV2MadarAgentUsage })))

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
            <Route path="/" element={<SignalRedirect />} />
            <Route path="/clinic-ai" element={<ClinicAILanding />} />
            <Route path="/lumora" element={<Lumora />} />
            <Route path="/car-wash" element={<Navigate to="/" replace />} />
            <Route path="/clinic" element={<Navigate to="/" replace />} />
            <Route path="/clinic-os" element={<Navigate to="/clinic-os/login" replace />} />

            {/* ── ClinicOS Auth & Onboarding ── */}
            <Route path="/clinic-os/login"    element={<DashboardV3Login />} />
            <Route path="/clinic-os/login-legacy" element={<ClinicOSLoginPage />} />
            <Route path="/clinic-os/mfa-challenge" element={<MfaChallengePage />} />
            <Route path="/clinic-os/signup"   element={<ClinicOSSignupPage />} />
            <Route path="/clinic-os/demo"     element={<DemoSignupPage />} />
            <Route path="/clinic-os/demo/confirm" element={<DemoConfirmPage />} />
            <Route path="/demo-review/internal-admin" element={<ClinicOSAdminPage embedded />} />
            <Route path="/clinic-os/admin" element={<ClinicOSAdminPage />} />
            <Route path="/clinic-os/select"   element={
              <ClinicOSProvider><PackageSelectorPage /></ClinicOSProvider>
            } />
            <Route path="/clinic-os/register"        element={<DashboardV3Register />} />
            <Route path="/clinic-os/forgot-password" element={<DashboardV3ForgotPassword />} />
            <Route path="/clinic-os/two-steps"       element={<DashboardV3TwoSteps />} />
            <Route path="/clinic-os/error"           element={<DashboardV3AuthError />} />
            <Route path="/clinic-os/maintenance"     element={<DashboardV3Maintenance />} />

            {/* ── ClinicOS Dashboard v3 (shadcn/ui — official dashboard) ── */}
            <Route path="/clinic-os/dashboard/*" element={
              <ClinicOSProvider>
                <DashboardV3FullLayout />
              </ClinicOSProvider>
            }>
              <Route index element={<DashboardV3Modern />} />
              <Route path="tables" element={<DashboardV3Tables />} />
              <Route path="form" element={<DashboardV3Form />} />
              <Route path="profile" element={<DashboardV3UserProfile />} />
              <Route path="icons" element={<DashboardV3Icons />} />
              <Route path="blog/post" element={<DashboardV3BlogPost />} />
              <Route path="blog/detail/:id" element={<DashboardV3BlogDetail />} />
              <Route path="blog/create" element={<DashboardV3BlogCreate />} />
              <Route path="blog/edit" element={<DashboardV3BlogEdit />} />
              <Route path="blog/manage-blog" element={<DashboardV3BlogManage />} />
              <Route path="notes" element={<DashboardV3Notes />} />
              <Route path="tickets" element={<DashboardV3Tickets />} />
              <Route path="tickets/create" element={<DashboardV3TicketCreate />} />
            </Route>
            {/* ── ClinicOS Demo Tour (internal, unauthenticated preview with fake data) ── */}
            <Route path="/demo-review/*" element={
              <ClinicOSProvider>
                <DashboardV2Layout />
              </ClinicOSProvider>
            }>
              <Route index element={<DashboardV2Home />} />
              <Route path="bookings" element={<DashboardV2Bookings />} />
              <Route path="patients" element={<DashboardV2Patients />} />
              <Route path="conversations" element={<DashboardV2Conversations />} />
              <Route path="reviews" element={<DashboardV2Reviews />} />
              <Route path="revenue" element={<DashboardV2Revenue />} />
              <Route path="reports" element={<DashboardV2Reports />} />
              <Route path="plan-usage" element={<DashboardV2MadarAgentUsage />} />
              <Route path="reminders" element={<DashboardV2Reminders />} />
              <Route path="integrations" element={<DashboardV2Integrations />} />
              <Route path="services" element={<DashboardV2Services />} />
              <Route path="audit-log" element={<DashboardV2AuditLog />} />
              <Route path="settings" element={<DashboardV2Settings />} />
            </Route>
            <Route path="/real-estate" element={<Navigate to="/#products" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/trial" element={<TrialSignup />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/client/*" element={<Navigate to="/clinic-os/dashboard" replace />} />
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
            <Route path="/book-a-call" element={<BookACallPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </LanguageProvider>
  )
}

export default App
