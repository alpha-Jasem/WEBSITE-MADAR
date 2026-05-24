import { Routes, Route, useLocation } from 'react-router-dom'
import { BarChart3, Calendar, Car, Droplets, LayoutDashboard, MessageSquare, Settings, Users2, Wrench, Zap, ClipboardList, Wallet, Sparkles } from 'lucide-react'
import { DashShell } from '../components/dash/DashShell'
import type { NavItem } from '../components/dash/DashSidebar'
import { ClientOverview } from '../components/dashboard/client/ClientOverview'
import { CarWashOverview } from '../components/dashboard/client/CarWashOverview'
import { CarWashLeads } from '../components/dashboard/client/CarWashLeads'
import { CarWashReports } from '../components/dashboard/client/CarWashReports'
import { CarWashQueue } from '../components/dashboard/client/CarWashQueue'
import { CarWashWorkers } from '../components/dashboard/client/CarWashWorkers'
import { CarWashFinance } from '../components/dashboard/client/CarWashFinance'
import { ClientAutomations } from '../components/dashboard/client/ClientAutomations'
import { ClientLeads } from '../components/dashboard/client/ClientLeads'
import { ClientReports } from '../components/dashboard/client/ClientReports'
import { ClientSettings } from '../components/dashboard/client/ClientSettings'
import { ClientSetup } from '../components/dashboard/client/ClientSetup'
import { CarWashSetup } from '../components/dashboard/client/CarWashSetup'
import { ClientAppointments } from '../components/dashboard/client/ClientAppointments'
import { ClientConversations } from '../components/dashboard/client/ClientConversations'
import { PricingPage } from '../components/dashboard/client/PricingPage'
import { useClientCompany } from '../hooks/useClientCompany'
import { getClientIndustryTemplate } from '../lib/clientIndustryTemplates'

function buildNavItems(template: ReturnType<typeof getClientIndustryTemplate>): NavItem[] {
  const labels = template.navLabels

  if (template.type === 'car_wash') {
    return [
      { to: '/client',               icon: Droplets,      label: 'لوحة المغسلة',    end: true },
      { to: '/client/queue',         icon: Car,           label: 'لوحة التشغيل'   },
      { to: '/client/leads',         icon: Users2,        label: 'عملاء المغسلة'  },
      { to: '/client/workers',       icon: Users2,        label: 'الموظفون'        },
      { to: '/client/finance',       icon: Wallet,        label: 'المالية'          },
      { to: '/client/conversations', icon: MessageSquare, label: 'طلبات واتساب'   },
      { to: '/client/automations',   icon: Zap,           label: 'تذكيرات وولاء'  },
      { to: '/client/reports',       icon: BarChart3,     label: 'التقارير'        },
      { to: '/client/setup',         icon: ClipboardList, label: 'الإعداد'         },
      { to: '/client/upgrade',       icon: Sparkles,      label: 'ترقية الباقة'   },
      { to: '/client/settings',      icon: Settings,      label: 'الإعدادات'       },
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
    { to: '/client/upgrade', icon: Sparkles, label: 'ترقية الباقة' },
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

export const ClientPortal = () => {
  const { company, loading } = useClientCompany()
  const template = getClientIndustryTemplate(company?.business_type, company?.industry)
  const navItems = buildNavItems(template)
  const pageTitle = usePageTitle(navItems)

  const isCarWash = template.type === 'car_wash'

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#080C14', gap: 12 }}>
      <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#22D3EE', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: '#475569', fontFamily: 'Tajawal, sans-serif', fontSize: 14 }}>جاري التحميل...</span>
    </div>
  )

  return (
    <DashShell navItems={navItems} role="client" pageTitle={pageTitle}>
      <Routes>
        <Route index element={isCarWash ? <CarWashOverview /> : <ClientOverview />} />
        <Route path="queue" element={<CarWashQueue />} />
        <Route path="workers" element={<CarWashWorkers />} />
        <Route path="finance" element={<CarWashFinance />} />
        <Route path="setup" element={isCarWash ? <CarWashSetup /> : <ClientSetup />} />
        <Route path="appointments" element={<ClientAppointments />} />
        <Route path="conversations" element={<ClientConversations />} />
        <Route path="automations" element={<ClientAutomations />} />
        <Route path="leads" element={isCarWash ? <CarWashLeads /> : <ClientLeads />} />
        <Route path="reports" element={isCarWash ? <CarWashReports /> : <ClientReports />} />
        <Route path="upgrade" element={<PricingPage />} />
        <Route path="settings" element={<ClientSettings />} />
        <Route path="*" element={isCarWash ? <CarWashOverview /> : <ClientOverview />} />
      </Routes>
    </DashShell>
  )
}
