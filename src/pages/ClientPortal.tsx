import { lazy, Suspense, useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, BarChart3, Calendar, Car, CheckCircle2, CreditCard, Droplets, LayoutDashboard, Loader2, MessageSquare, Monitor, Settings, ShieldCheck, Sparkles, Users2, WalletCards, Wrench, Zap, Wallet } from 'lucide-react'
import { DashShell } from '../components/dash/DashShell'
import type { NavItem } from '../components/dash/DashSidebar'
import { useClientCompany } from '../hooks/useClientCompany'
import { ClientCompanyProvider } from '../context/ClientCompanyContext'
import { getClientIndustryTemplate } from '../lib/clientIndustryTemplates'
import { supabase } from '../lib/supabase'
import { useActiveProfile } from '../context/ActiveProfileContext'

const ClientOverview     = lazy(() => import('../components/dashboard/client/ClientOverview').then(m => ({ default: m.ClientOverview })))
const CarWashOverview    = lazy(() => import('../components/dashboard/client/CarWashOverview').then(m => ({ default: m.CarWashOverview })))
const ClinicOverview     = lazy(() => import('../components/dashboard/client/ClinicOverview').then(m => ({ default: m.ClinicOverview })))
const CarWashLeads       = lazy(() => import('../components/dashboard/client/CarWashLeads').then(m => ({ default: m.CarWashLeads })))
const CarWashReports     = lazy(() => import('../components/dashboard/client/CarWashReports').then(m => ({ default: m.CarWashReports })))
const CarWashQueue       = lazy(() => import('../components/dashboard/client/CarWashQueue').then(m => ({ default: m.CarWashQueue })))
const CarWashQueueDisplay = lazy(() => import('../components/dashboard/client/CarWashQueueDisplay').then(m => ({ default: m.CarWashQueueDisplay })))
const CarWashWorkers     = lazy(() => import('../components/dashboard/client/CarWashWorkers').then(m => ({ default: m.CarWashWorkers })))
const CarWashFinance     = lazy(() => import('../components/dashboard/client/CarWashFinance').then(m => ({ default: m.CarWashFinance })))
const CarWashDailyClosing = lazy(() => import('../components/dashboard/client/CarWashDailyClosing').then(m => ({ default: m.CarWashDailyClosing })))
const CarWashMemberships = lazy(() => import('../components/dashboard/client/CarWashMemberships').then(m => ({ default: m.CarWashMemberships })))
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
      { to: '/client',               icon: Droplets,       label: 'الرئيسية',    end: true },
      { to: '/client/queue',         icon: Car,            label: 'لوحة التشغيل' },
      { to: '/client/queue-display', icon: Monitor,        label: 'شاشة العرض'  },
      { to: '/client/leads',         icon: Users2,         label: 'العملاء'      },
      { to: '/client/memberships',   icon: WalletCards,    label: 'الاشتراكات'  },
      { to: '/client/finance',       icon: Wallet,         label: 'المالية'      },
      { to: '/client/reports',       icon: BarChart3,      label: 'التقارير'     },
      { to: '/client/workers',       icon: Users2,         label: 'الموظفون'     },
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
  return match?.label ?? navItems[0]?.label ?? 'الرئيسية'
}

function isTrialExpired(company: ReturnType<typeof useClientCompany>['company']) {
  return company?.status === 'trial' && company.plan_reset_at && new Date(company.plan_reset_at).getTime() < Date.now()
}

function TrialExpiredGate() {
  const assurances = [
    'بيانات المغسلة محفوظة',
    'رابط QR يرجع للعمل مباشرة',
    'لا تحتاج إعداد جديد',
  ]

  return (
    <div dir="rtl" className="mx-auto flex min-h-[62vh] max-w-5xl items-center justify-center px-2">
      <section className="relative w-full overflow-hidden rounded-[32px] border border-[#DDEBFF] bg-white p-6 text-right shadow-[0_28px_90px_rgba(15,23,42,0.10)] sm:p-8">
        <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-[#0B63F6]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 font-tajawal">
              <AlertTriangle size={14} />
              انتهت التجربة المجانية
            </div>

            <h1 className="mt-4 text-2xl font-black leading-tight text-[#071739] font-cairo sm:text-3xl">
              فعّل اشتراكك لتستمر لوحة مدار بدون انقطاع
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-8 text-slate-600 font-tajawal sm:text-base">
              كل بيانات مغسلتك محفوظة: السيارات، العملاء، الخدمات، التقارير ورابط QR. اختر الباقة المناسبة وسيعود الحساب للعمل مباشرة بنفس الإعدادات.
            </p>

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {assurances.map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700 font-tajawal">
                  <CheckCircle2 size={17} className="shrink-0 text-emerald-500" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a href="/client/upgrade" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0B63F6] px-6 py-3.5 text-sm font-black text-white shadow-[0_18px_34px_rgba(11,99,246,0.24)] transition hover:bg-[#0956D8] font-cairo">
                <CreditCard size={17} />
                اختيار الباقة المناسبة
              </a>
              <a href="https://wa.me/966546666005?text=%D8%A3%D8%A8%D8%BA%D9%89%20%D9%85%D8%B3%D8%A7%D8%B9%D8%AF%D8%A9%20%D9%81%D9%8A%20%D8%AA%D9%81%D8%B9%D9%8A%D9%84%20%D8%A7%D8%B4%D8%AA%D8%B1%D8%A7%D9%83%20%D9%85%D8%AF%D8%A7%D8%B1%20OS" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-2xl border border-[#C8D8F5] bg-white px-6 py-3.5 text-sm font-bold text-[#0D1B3E] transition hover:border-[#0B63F6] hover:text-[#0B63F6] font-cairo">
                تواصل مع الدعم
              </a>
            </div>
          </div>

          <div className="rounded-[26px] border border-[#DDEBFF] bg-gradient-to-br from-[#F8FBFF] to-[#EEF6FF] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#0B63F6] font-tajawal">حالة الحساب</p>
                <h2 className="mt-1 text-lg font-black text-[#071739] font-cairo">جاهز للتفعيل</h2>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#0B63F6] shadow-[0_12px_24px_rgba(11,99,246,0.12)]">
                <ShieldCheck size={23} />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between text-sm font-bold text-slate-700 font-tajawal">
                  <span>الخدمات والعملاء</span>
                  <span className="text-emerald-600">محفوظة</span>
                </div>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between text-sm font-bold text-slate-700 font-tajawal">
                  <span>لوحة التشغيل وQR</span>
                  <span className="text-[#0B63F6]">تعمل بعد التفعيل</span>
                </div>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between text-sm font-bold text-slate-700 font-tajawal">
                  <span>الدعم والمتابعة</span>
                  <span className="text-[#0B63F6]">مشمول</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-blue-100 bg-white/70 px-4 py-3 text-xs font-bold leading-6 text-slate-600 font-tajawal">
              <Sparkles size={16} className="shrink-0 text-[#0B63F6]" />
              التفعيل يحافظ على نفس الحساب والبيانات بدون إعادة تسجيل.
            </div>
          </div>
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
  const isClinic  = template.type === 'clinic'

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
            <Route index element={canAccess('/client') ? (isCarWash ? <CarWashOverview /> : isClinic ? <ClinicOverview /> : <ClientOverview />) : fallback} />
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
            <Route path="*" element={canAccess('/client') ? (isCarWash ? <CarWashOverview /> : isClinic ? <ClinicOverview /> : <ClientOverview />) : fallback} />
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
