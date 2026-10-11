import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { LanguageProvider } from './context/LanguageContext'
import { WorkspaceProvider } from './context/WorkspaceContext'
import { ProtectedRoute } from './components/shared/ProtectedRoute'
import { ModuleRoute } from './dashboard/components/ModuleRoute'
import { ErrorBoundary, reloadForFreshAssets } from './components/shared/ErrorBoundary'
const ClinicAILanding = lazy(() => import('./pages/ClinicAILanding').then((m) => ({ default: m.ClinicAILanding })))
const RazCaseStudy = lazy(() => import('./pages/RazCaseStudy'))
const RazNabrahDemo = lazy(() => import('./pages/RazNabrahDemo'))
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
// Note: WorkspaceProvider wraps only /clinic-os/dashboard/* routes (protected)

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

// ClinicOS
const ClinicOSLoginPage    = lazy(() => import('./pages/clinicOS/ClinicOSLogin').then(m => ({ default: m.ClinicOSLogin })))
const ClinicOSSignupPage   = lazy(() => import('./pages/clinicOS/ClinicOSSignup').then(m => ({ default: m.ClinicOSSignup })))
const DemoSignupPage       = lazy(() => import('./pages/clinicOS/DemoSignup').then(m => ({ default: m.DemoSignup })))
const DemoConfirmPage      = lazy(() => import('./pages/clinicOS/DemoConfirm').then(m => ({ default: m.DemoConfirm })))
const PackageSelectorPage  = lazy(() => import('./pages/clinicOS/PackageSelector').then(m => ({ default: m.PackageSelector })))
const MfaChallengePage     = lazy(() => import('./pages/clinicOS/MfaChallenge').then(m => ({ default: m.MfaChallenge })))
const ClinicOSAdminPage    = lazy(() => import('./pages/clinicOS/admin/ClinicOSAdmin').then(m => ({ default: m.ClinicOSAdmin })))

// The dashboard, shared by real tenants and the /demo-review sales tour.
const DashboardV2Layout        = lazy(() => import('./dashboard/components/DashboardV2Layout').then(m => ({ default: m.DashboardV2Layout })))
const DashboardV2Home          = lazy(() => import('./dashboard/pages/Home').then(m => ({ default: m.DashboardV2Home })))
const DashboardV2Bookings      = lazy(() => import('./dashboard/pages/Bookings').then(m => ({ default: m.DashboardV2Bookings })))
const DashboardV2Customers      = lazy(() => import('./dashboard/pages/Customers').then(m => ({ default: m.DashboardV2Customers })))
const DashboardV2Conversations = lazy(() => import('./dashboard/pages/Conversations').then(m => ({ default: m.DashboardV2Conversations })))
const DashboardV2Reviews       = lazy(() => import('./dashboard/pages/Reviews').then(m => ({ default: m.DashboardV2Reviews })))
const DashboardV2Revenue       = lazy(() => import('./dashboard/pages/Revenue').then(m => ({ default: m.DashboardV2Revenue })))
const DashboardV2Reports       = lazy(() => import('./dashboard/pages/Reports').then(m => ({ default: m.DashboardV2Reports })))
const DashboardV2Reminders     = lazy(() => import('./dashboard/pages/Reminders').then(m => ({ default: m.DashboardV2Reminders })))
const DashboardV2Integrations  = lazy(() => import('./dashboard/pages/Integrations').then(m => ({ default: m.DashboardV2Integrations })))
const DashboardV2Settings      = lazy(() => import('./dashboard/pages/Settings').then(m => ({ default: m.DashboardV2Settings })))
const DashboardV2Services      = lazy(() => import('./dashboard/pages/Services').then(m => ({ default: m.DashboardV2Services })))
const DashboardV2AuditLog      = lazy(() => import('./dashboard/pages/AuditLog').then(m => ({ default: m.DashboardV2AuditLog })))
const DashboardV2MadarAgentUsage = lazy(() => import('./dashboard/pages/MadarAgentUsage').then(m => ({ default: m.DashboardV2MadarAgentUsage })))
const DashboardV2Tickets       = lazy(() => import('./dashboard/pages/Tickets').then(m => ({ default: m.DashboardV2Tickets })))
const DashboardV2CallsAnalytics    = lazy(() => import('./dashboard/pages/CallsAnalytics').then(m => ({ default: m.DashboardV2CallsAnalytics })))
const DashboardV2WhatsAppAnalytics = lazy(() => import('./dashboard/pages/WhatsAppAnalytics').then(m => ({ default: m.DashboardV2WhatsAppAnalytics })))
const DashboardV2Agents            = lazy(() => import('./dashboard/pages/Agents').then(m => ({ default: m.DashboardV2Agents })))
const DashboardV2KnowledgeBase      = lazy(() => import('./dashboard/pages/KnowledgeBase').then(m => ({ default: m.DashboardV2KnowledgeBase })))
const DashboardV2Tools             = lazy(() => import('./dashboard/pages/ComingSoon').then(m => ({ default: m.DashboardV2Tools })))
const DashboardV2AnalysisGroups    = lazy(() => import('./dashboard/pages/ComingSoon').then(m => ({ default: m.DashboardV2AnalysisGroups })))
const DashboardV2InboundServices   = lazy(() => import('./dashboard/pages/ComingSoon').then(m => ({ default: m.DashboardV2InboundServices })))
const DashboardV2OutboundServices  = lazy(() => import('./dashboard/pages/ComingSoon').then(m => ({ default: m.DashboardV2OutboundServices })))
const DashboardV2CallLogs          = lazy(() => import('./dashboard/pages/CallLogs').then(m => ({ default: m.DashboardV2CallLogs })))

// The dashboard is mounted twice — once for real tenants and once for the
// unauthenticated sales tour — and both render the identical tree. isDemo is
// derived from the pathname, so the children need no per-mount difference.
// Declared once so a new page can never be added to only one of them.
const dashboardChildRoutes = (
  <>
    {/* Pages tied to an industry module redirect home when the company doesn't have it. */}
    <Route index element={<DashboardV2Home />} />
    <Route path="bookings" element={<ModuleRoute module="bookings"><DashboardV2Bookings /></ModuleRoute>} />
    <Route path="patients" element={<ModuleRoute module="customers"><DashboardV2Customers /></ModuleRoute>} />
    <Route path="conversations" element={<ModuleRoute module="conversations"><DashboardV2Conversations /></ModuleRoute>} />
    <Route path="reviews" element={<ModuleRoute module="reviews"><DashboardV2Reviews /></ModuleRoute>} />
    <Route path="revenue" element={<ModuleRoute module="revenue"><DashboardV2Revenue /></ModuleRoute>} />
    <Route path="reports" element={<ModuleRoute module="reports"><DashboardV2Reports /></ModuleRoute>} />
    <Route path="plan-usage" element={<DashboardV2MadarAgentUsage />} />
    <Route path="reminders" element={<ModuleRoute module="reminders"><DashboardV2Reminders /></ModuleRoute>} />
    <Route path="integrations" element={<DashboardV2Integrations />} />
    <Route path="services" element={<ModuleRoute module="services"><DashboardV2Services /></ModuleRoute>} />
    <Route path="audit-log" element={<DashboardV2AuditLog />} />
    <Route path="tickets" element={<ModuleRoute module="tickets"><DashboardV2Tickets /></ModuleRoute>} />
    <Route path="calls-analytics" element={<ModuleRoute module="voice"><DashboardV2CallsAnalytics /></ModuleRoute>} />
    <Route path="whatsapp-analytics" element={<ModuleRoute module="conversations"><DashboardV2WhatsAppAnalytics /></ModuleRoute>} />
    <Route path="agents" element={<DashboardV2Agents />} />
    <Route path="knowledge-base" element={<ModuleRoute module="knowledge_base"><DashboardV2KnowledgeBase /></ModuleRoute>} />
    <Route path="tools" element={<DashboardV2Tools />} />
    <Route path="analysis-groups" element={<DashboardV2AnalysisGroups />} />
    <Route path="inbound-services" element={<DashboardV2InboundServices />} />
    <Route path="outbound-services" element={<DashboardV2OutboundServices />} />
    <Route path="call-logs" element={<ModuleRoute module="voice"><DashboardV2CallLogs /></ModuleRoute>} />
    <Route path="settings" element={<DashboardV2Settings />} />
    {/* Retired pages keep their links alive instead of rendering a blank outlet. */}
    <Route path="*" element={<Navigate to="." replace />} />
  </>
)

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
            <Route path="/case-studies/raz" element={<RazCaseStudy />} />
            <Route path="/demo/raz" element={<RazNabrahDemo />} />
            <Route path="/lumora" element={<Lumora />} />
            <Route path="/car-wash" element={<Navigate to="/" replace />} />
            <Route path="/clinic" element={<Navigate to="/" replace />} />
            <Route path="/clinic-os" element={<Navigate to="/clinic-os/login" replace />} />

            {/* ── ClinicOS Auth & Onboarding ── */}
            <Route path="/clinic-os/login"    element={<ClinicOSLoginPage />} />
            <Route path="/clinic-os/mfa-challenge" element={<MfaChallengePage />} />
            <Route path="/clinic-os/signup"   element={<ClinicOSSignupPage />} />
            <Route path="/clinic-os/demo"     element={<DemoSignupPage />} />
            <Route path="/clinic-os/demo/confirm" element={<DemoConfirmPage />} />
            <Route path="/demo-review/internal-admin" element={<ClinicOSAdminPage embedded />} />
            <Route path="/clinic-os/admin" element={<ClinicOSAdminPage />} />
            <Route path="/clinic-os/select"   element={
              <WorkspaceProvider><PackageSelectorPage /></WorkspaceProvider>
            } />

            {/* ── ClinicOS Dashboard v2 (Madar Software Design System — official dashboard) ── */}
            <Route path="/clinic-os/dashboard/*" element={
              <WorkspaceProvider>
                <DashboardV2Layout />
              </WorkspaceProvider>
            }>
              {dashboardChildRoutes}
            </Route>
            {/* ── ClinicOS Demo Tour (internal, unauthenticated preview with fake data) ── */}
            <Route path="/demo-review/*" element={
              <WorkspaceProvider>
                <DashboardV2Layout />
              </WorkspaceProvider>
            }>
              {dashboardChildRoutes}
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
