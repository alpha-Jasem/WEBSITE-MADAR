import { lazy, Suspense, useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, BarChart3, Calendar, Car, ClipboardCheck, CreditCard, Droplets, LayoutDashboard, Loader2, MessageSquare, Monitor, Settings, Users2, WalletCards, Wrench, Zap, Wallet } from 'lucide-react'
import { DashShell } from '../components/dash/DashShell'
import type { NavItem } from '../components/dash/DashSidebar'
import { useClientCompany } from '../hooks/useClientCompany'
import { ClientCompanyProvider } from '../context/ClientCompanyContext'
import { getClientIndustryTemplate } from '../lib/clientIndustryTemplates'
import { supabase } from '../lib/supabase'
import { useActiveProfile } from '../context/ActiveProfileContext'

const ClientOverview     = lazy(() => import('../components/dashboard/client/ClientOverview').then(m => ({ default: m.ClientOverview })))
const CarWashOverview    = lazy(() => import('../components/dashboard/client/CarWashOverview').then(m => ({ default: m.CarWashOverview })))
const CarWashLeads       = lazy(() => import('../components/dashboard/client/CarWashLeads').then(m => ({ default: m.CarWashLeads })))
const CarWashReports     = lazy(() => import('../components/dashboard/client/CarWashReports').then(m => ({ default: m.CarWashReports })))
const CarWashQueue       = lazy(() => import('../components/dashboard/client/CarWashQueue').then(m => ({ default: m.CarWashQueue })))
const CarWashQueueDisplay = lazy(() => import('../components/dashboard/client/CarWashQueueDisplay').then(m => ({ default: m.CarWashQueueDisplay })))
const CarWashWorkers     = lazy(() => import('../components/dashboard/client/CarWashWorkers').then(m => ({ default: m.CarWashWorkers })))
const CarWashFinance     = lazy(() => import('../components/dashboard/client/CarWashFinance').then(m => ({ default: m.CarWashFinance })))
const CarWashMemberships = lazy(() => import('../components/dashboard/client/CarWashMemberships').then(m => ({ default: m.CarWashMemberships })))
const CarWashDailyClosing = lazy(() => import('../components/dashboard/client/CarWashDailyClosing').then(m => ({ default: m.CarWashDailyClosing })))
const CarWashSeedDemo    = lazy(() => import('../components/dashboard/client/CarWashSeedDemo').then(m => ({ default: m.CarWashSeedDemo })))
const ClientAutomations  = lazy(() => import('../components/dashboard/client/ClientAutomations').then(m => ({ default: m.ClientAutomations })))
const CarWashAutomations = lazy(() => import('../components/dashboard/client/CarWashAutomations').then(m => ({ default: m.CarWashAutomations })))
const ClientLeads        = lazy(() => import('../components/dashboard/client/ClientLeads').then(m => ({ default: m.ClientLeads })))
const ClientReports      = lazy(() => import('../components/dashboard/client/ClientReports').then(m => ({ default: m.ClientReports })))
const ClientSettings     = lazy(() => import('../components/dashboard/client/ClientSettings').then(m => ({ default: m.ClientSettings })))
const ClientSetup        = lazy(() => import('../components/dashboard/client/ClientSetup').then(m => ({ default: m.ClientSetup })))
const CarWashSetup       = lazy(() => import('../components/dashboard/client/CarWashSetup').then(m => ({ default: m.CarWashSetup })))
const ClientAppointments = lazy(() => import('../components/dashboard/client/ClientAppointments').then(m => ({ default: m.ClientAppointments })))
const ClientConversations = lazy(() => import('../components/dashboard/client/ClientConversations').then(m => ({ default: m.ClientConversations })))
const PricingPage        = lazy(() => import('../components/dashboard/client/PricingPage').then(m => ({ default: m.PricingPage })))

const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 10 }}>
    <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite', color: '#22D3EE' }} />
    <span style={{ color: '#475569', fontFamily: 'Tajawal, sans-serif', fontSize: 13 }}>جاري التحميل...</span>
  </div>
)

function buildNavItems(template: ReturnType<typeof getClientIndustryTemplate>): NavItem[] {
  const labels = template.navLabels

  if (template.type === 'car_wash') {
    return [
      { to: '/client',               icon: Droplets,       label: 'لوحة المغسلة',  end: true },
      { to: '/client/queue',         icon: Car,            label: 'لوحة التشغيل' },
      { to: '/client/queue-display', icon: Monitor,        label: 'شاشة العرض'  },
      { to: '/client/leads',         icon: Users2,         label: 'العملاء'      },
      { to: '/client/memberships',   icon: WalletCards,    label: 'الاشتراكات'  },
      { to: '/client/finance',       icon: Wallet,         label: 'المالية'      },
      { to: '/client/closing',       icon: ClipboardCheck, label: 'إغلاق اليوم' },
      { to: '/client/reports',       icon: BarChart3,      label: 'التقارير'     },
      { to: '/client/workers',       icon: Users2,         label: 'الموظفون'     },
      { to: '/client/automations',   icon: Zap,            label: 'الأتمتة'      },
      { to: '/client/settings',      icon: Settings,       label: 'الإعدادات'    },
    ]
  }

  return [
    { to: '/client', icon: LayoutDashboard, label: labels.overview, end: true },
    { to: '/client/setup', icon: Wrench, label: labels.setup },
    { to: '/client/appointments', icon: Calendar, label: labels.appointments },
    { to: '/client/conversations', icon: MessageSquare, label: labels.conversations },
    { to: '/client/automations', icon: Zap, label: labels.automations },
    { to: '/client/leads', icon: Users2, label: labels.leads },
    { to: '/client/reports', icon: BarChart3, label: labels.reports },
    { to: '/client/settings', icon: Settings, label: labels.settings },
  ]
}

function usePageTitle(navItems: NavItem[]) {
  const location = useLocation()
  const match = navItems.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  )
  return match?.label ?? navItems[0]?.label ?? 'نظرة عامة'
}

function isTrialExpired(company: ReturnType<typeof useClientCompany>['company']) {
  return company?.status === 'trial' && company.plan_reset_at && new Date(company.plan_reset_at).getTime() < Date.now()
}

function TrialExpiredGate() {
  return (
    <div dir="rtl" className="mx-auto flex min-h-[62vh] max-w-3xl items-center justify-center">
      <section className="w-full rounded-[28px] border border-amber-200 bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-amber-50 text-amber-600">
          <AlertTriangle size={28} />
        </div>
        <p className="text-sm font-bold text-amber-600 font-tajawal">انتهت التجربة المجانية</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950 font-cairo">ثبّت اشتراكك عشان تستمر لوحة التشغيل وQR</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500 font-tajawal">
          بيانات المغسلة محفوظة. بعد الدفع تتحول المنشأة إلى حساب نشط وتبقى الخدمات، العملاء، والتقارير كما هي.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <a href="/client/upgrade" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0D1B3E] px-5 py-3 text-sm font-bold text-white font-cairo">
            <CreditCard size={16} />
            اختيار الباقة والدفع
          </a>
          <a href="mailto:info@madar.software" className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 font-cairo">
            تواصل مع الدعم
          </a>
        </div>
      </section>
    </div>
  )
}

export const ClientPortal = () => {
  const { company, companyId, loading } = useClientCompany()
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useActiveProfile()
  const template = getClientIndustryTemplate(company?.business_type, company?.industry)
  const isCarWash = template.type === 'car_wash'

  const allNavItems = buildNavItems(template)
  const flags = ((company?.cw_automations as any)?.feature_flags || {}) as Record<string, boolean>
  const paidCustomerRevenueEnabled = Boolean(flags.wallet || flags.memberships || flags.online_payments)
  const visibleNavItems = isCarWash && !paidCustomerRevenueEnabled
    ? allNavItems.filter(item => item.to !== '/client/memberships')
    : allNavItems
  const navItems = (isCarWash && !profile.isOwner)
    ? visibleNavItems.filter(item => item.to === '/client/queue-display'
      ? profile.permissions.includes('/client/queue')
      : profile.permissions.includes(item.to))
    : visibleNavItems

  const pageTitle = usePageTitle(navItems)
  const trialExpired = isTrialExpired(company)

  const [showSeedDemo, setShowSeedDemo] = useState(false)
  const [seedChecked, setSeedChecked] = useState(false)

  // Show seed demo if fresh car wash account (no services, no workers)
  useEffect(() => {
    if (!isCarWash || !companyId || loading || seedChecked) return
    setSeedChecked(true)
    const check = async () => {
      const [{ count: svcCount }, { count: wrkCount }] = await Promise.all([
        supabase.from('cw_services').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('cw_workers').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      ])
      if ((svcCount || 0) === 0 && (wrkCount || 0) === 0) {
        setShowSeedDemo(true)
      }
    }
    check()
  }, [isCarWash, companyId, loading, seedChecked])

  const canAccess = (path: string) =>
    profile.isOwner || !isCarWash || profile.permissions.includes(path)

  const displayMode = isCarWash && location.pathname.startsWith('/client/queue-display')

  const noAccessPage = (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
      <div style={{ fontSize: 40 }}>🔒</div>
      <p style={{ color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', fontSize: 15, textAlign: 'center' }}>
        ليس لديك صلاحية الوصول لهذه الصفحة<br />
        <span style={{ fontSize: 12, color: '#475569' }}>افتح القائمة لتبديل المستخدم أو الرجوع للمالك</span>
      </p>
    </div>
  )

  const fallback = profile.permissions[0]
    ? <Navigate to={profile.permissions[0]} replace />
    : noAccessPage

  if (loading) return (
    <DashShell navItems={[]} role="client" pageTitle="">
      <PageLoader />
    </DashShell>
  )

  if (displayMode) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="queue-display" element={canAccess('/client/queue') ? <CarWashQueueDisplay /> : fallback} />
          <Route path="*" element={<Navigate to="/client/queue-display" replace />} />
        </Routes>
      </Suspense>
    )
  }

  return (
    <DashShell navItems={navItems} role="client" pageTitle={pageTitle}>
      <Suspense fallback={<PageLoader />}>
        {trialExpired && !location.pathname.startsWith('/client/upgrade') ? (
          <TrialExpiredGate />
        ) : (
          <Routes>
            <Route index element={canAccess('/client') ? (isCarWash ? <CarWashOverview /> : <ClientOverview />) : fallback} />
            <Route path="queue" element={canAccess('/client/queue') ? <CarWashQueue /> : fallback} />
            <Route path="queue-display" element={canAccess('/client/queue') ? <CarWashQueueDisplay /> : fallback} />
            <Route path="workers" element={canAccess('/client/workers') ? <CarWashWorkers /> : fallback} />
            <Route path="finance" element={canAccess('/client/finance') ? <CarWashFinance /> : fallback} />
            <Route path="closing" element={canAccess('/client/closing') ? <CarWashDailyClosing /> : fallback} />
            <Route path="setup" element={isCarWash ? <CarWashSetup /> : <ClientSetup />} />
            <Route path="appointments" element={<ClientAppointments />} />
            <Route path="conversations" element={<ClientConversations />} />
            <Route path="automations" element={canAccess('/client/automations') ? (isCarWash ? <CarWashAutomations /> : <ClientAutomations />) : fallback} />
            <Route path="leads" element={canAccess('/client/leads') ? (isCarWash ? <CarWashLeads /> : <ClientLeads />) : fallback} />
            <Route path="memberships" element={isCarWash ? <CarWashMemberships /> : fallback} />
            <Route path="reports" element={canAccess('/client/reports') ? (isCarWash ? <CarWashReports /> : <ClientReports />) : fallback} />
            <Route path="upgrade" element={<PricingPage />} />
            <Route path="settings" element={canAccess('/client/settings') ? <ClientSettings /> : fallback} />
            <Route path="*" element={canAccess('/client') ? (isCarWash ? <CarWashOverview /> : <ClientOverview />) : fallback} />
          </Routes>
        )}

        {!trialExpired && showSeedDemo && companyId && (
          <CarWashSeedDemo
            companyId={companyId}
            onDone={() => { setShowSeedDemo(false); navigate('/client/queue') }}
            onClose={() => setShowSeedDemo(false)}
          />
        )}
      </Suspense>
    </DashShell>
  )
}
