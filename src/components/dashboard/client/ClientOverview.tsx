import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Loader2, MessageSquare, Sparkles, TrendingUp, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { StatCard } from '../shared/StatCard'
import { MiniChart } from '../shared/MiniChart'
import { MessageLimitBanner } from '../shared/MessageLimitBanner'
import { ClientPackageCard } from './ClientPackageCard'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { getClientIndustryTemplate } from '../../../lib/clientIndustryTemplates'

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

const STAGE_LABELS: Record<string, string> = {
  new_lead: 'جديد',
  contacted: 'تم التواصل',
  qualified: 'مؤهل',
  meeting_booked: 'موعد محجوز',
  demo_done: 'تم العرض',
  proposal_sent: 'عرض أرسل',
  negotiation: 'تفاوض',
  won: 'مغلق',
  lost: 'خسارة',
  on_hold: 'معلق',
}

const formatSar = (value: number) =>
  value > 0 ? `${value.toLocaleString('ar-SA')} ر.س` : 'لا يوجد بعد'

export const ClientOverview = () => {
  const { company, companyId, loading: authLoading } = useClientCompany()
  const [leads, setLeads] = useState<any[]>([])
  const [automations, setAutomations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const template = getClientIndustryTemplate(company?.business_type, company?.industry)
  const IndustryIcon = template.icon

  useEffect(() => {
    if (authLoading) return

    const load = async () => {
      setLoading(true)
      let leadsQuery = supabase.from('crm_leads').select('*').order('updated_at', { ascending: false })
      let automationsQuery = supabase.from('automations').select('*').order('created_at', { ascending: false })

      if (companyId) {
        leadsQuery = leadsQuery.eq('company_id', companyId)
        automationsQuery = automationsQuery.eq('company_id', companyId)
      }

      const [{ data: leadsData }, { data: automationsData }] = await Promise.all([leadsQuery, automationsQuery])
      setLeads(leadsData || [])
      setAutomations(automationsData || [])
      setLoading(false)
    }

    load()

    const channel = supabase
      .channel('client_overview_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, load)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [authLoading, companyId])

  const metrics = useMemo(() => {
    const now = new Date()
    const thisMonth = monthKey(now)
    const previousDate = new Date(now)
    previousDate.setMonth(previousDate.getMonth() - 1)
    const previousMonth = monthKey(previousDate)

    const wonLeads = leads.filter((lead) => lead.stage === 'won')
    const leadsThisMonth = leads.filter((lead) => (lead.created_at || '').startsWith(thisMonth)).length
    const leadsPreviousMonth = leads.filter((lead) => (lead.created_at || '').startsWith(previousMonth)).length
    const activeAutomations = automations.filter((automation) => automation.status === 'active').length
    const closeRate = leads.length ? Math.round((wonLeads.length / leads.length) * 100) : 0
    const todayActivity = leads.filter((lead) => (lead.updated_at || '').startsWith(dayKey(now))).length
    const monthTrend = leadsPreviousMonth
      ? Math.round(((leadsThisMonth - leadsPreviousMonth) / leadsPreviousMonth) * 100)
      : 0
    const revenueThisMonth = wonLeads
      .filter((lead) => (lead.updated_at || '').startsWith(thisMonth))
      .reduce((sum, lead) => sum + (lead.price_sold || 0), 0)

    return {
      now,
      wonLeads,
      activeLeads: leads.filter((lead) => !['won', 'lost'].includes(lead.stage)),
      leadsThisMonth,
      activeAutomations,
      closeRate,
      todayActivity,
      monthTrend,
      revenueThisMonth,
    }
  }, [automations, leads])

  const statValues = {
    automations: metrics.activeAutomations,
    total: leads.length,
    today: metrics.todayActivity,
    rate: `${metrics.closeRate}%`,
    month: metrics.leadsThisMonth,
    closed: metrics.wonLeads.length,
  }

  const weeklyLeads = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(metrics.now)
    date.setDate(date.getDate() - (6 - index))
    return {
      day: date.toLocaleDateString('ar-SA', { weekday: 'short' }),
      leads: leads.filter((lead) => (lead.created_at || '').startsWith(dayKey(date))).length,
    }
  })

  const weeklyActivity = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(metrics.now)
    date.setDate(date.getDate() - (6 - index))
    return {
      day: date.toLocaleDateString('ar-SA', { weekday: 'short' }),
      messages: leads.filter((lead) => (lead.updated_at || '').startsWith(dayKey(date))).length,
    }
  })

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <Loader2 size={20} className="animate-spin text-primary-400" />
        <p className="text-slate-500 font-tajawal text-sm">جاري تحميل لوحة العميل...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      <section
        className="client-industry-hero"
        style={{ '--industry-accent': template.accent } as React.CSSProperties}
      >
        <div className="client-industry-icon">
          <IndustryIcon size={24} />
        </div>
        <div>
          <span>{template.label}</span>
          <h1>{template.overviewTitle}{company ? ` — ${company.name}` : ''}</h1>
          <p>{template.overviewSubtitle}</p>
        </div>
      </section>

      {company && <ClientPackageCard company={company} />}
      {company && <MessageLimitBanner company={company} />}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {template.stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <StatCard
              key={stat.key}
              label={stat.label}
              value={statValues[stat.key]}
              icon={<Icon size={18} />}
              trend={stat.key === 'month' ? metrics.monthTrend : 0}
              accent={stat.accent}
              delay={index * 0.08}
            />
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 client-panel">
          <div className="client-panel-title">
            <h3>{template.activityChartTitle}</h3>
            <span>Live</span>
          </div>
          <MiniChart data={weeklyActivity} dataKey="messages" color={template.accent} height={150} />
        </div>
        <div className="client-panel">
          <div className="client-panel-title">
            <h3>{template.intakeChartTitle}</h3>
            <span>{metrics.leadsThisMonth} هذا الشهر</span>
          </div>
          <MiniChart data={weeklyLeads} dataKey="leads" type="bar" color="#10B981" height={150} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="client-panel xl:col-span-2">
          <div className="client-panel-title">
            <h3>{template.activeLabel} ({metrics.activeLeads.length})</h3>
            <span>{template.entityLabel}</span>
          </div>

          {metrics.activeLeads.length === 0 ? (
            <p className="client-empty-state">لا توجد بيانات نشطة بعد. أول محادثة أو حجز سيظهر هنا تلقائياً.</p>
          ) : (
            <div className="space-y-3">
              {metrics.activeLeads.slice(0, 6).map((lead) => (
                <div key={lead.id} className="client-live-row">
                  <div>
                    <strong>{lead.company_name || lead.contact_name || lead.name || 'عميل جديد'}</strong>
                    <span>{STAGE_LABELS[lead.stage] || lead.stage || 'جديد'}</span>
                  </div>
                  <em>{lead.price_sold ? `${lead.price_sold.toLocaleString('ar-SA')} ر.س` : 'قيد المتابعة'}</em>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="client-panel">
          <div className="client-panel-title">
            <h3>اقتراحات AI</h3>
            <Sparkles size={16} color={template.accent} />
          </div>
          <div className="client-ai-actions">
            {template.suggestions.map((suggestion, index) => (
              <motion.button
                key={suggestion}
                type="button"
                whileHover={{ x: -3 }}
                style={{ '--industry-accent': template.accent } as React.CSSProperties}
              >
                <span>{`0${index + 1}`}</span>
                <p>{suggestion}</p>
                <ArrowUpRight size={15} />
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="client-panel">
          <div className="client-panel-title">
            <h3>{template.closedLabel}</h3>
            <span>{formatSar(metrics.revenueThisMonth)}</span>
          </div>

          {metrics.wonLeads.length === 0 ? (
            <p className="client-empty-state">لا توجد نتائج مكتملة بعد.</p>
          ) : (
            <div className="space-y-3">
              {metrics.wonLeads.slice(0, 5).map((lead) => (
                <motion.div key={lead.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="client-won-row">
                  <p>{lead.company_name || lead.contact_name || lead.name || 'عميل'}</p>
                  <span>{lead.price_sold ? `${lead.price_sold.toLocaleString('ar-SA')} ر.س` : 'مكتمل'}</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="client-panel">
          <div className="client-panel-title">
            <h3>إعدادات مهمة لهذا القطاع</h3>
            <Zap size={16} color={template.accent} />
          </div>
          <div className="client-setup-focus">
            {template.setupFocus.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <p className="client-hint">
            كل عميل تضيفه من لوحة الإدارة يأخذ هذه التجربة تلقائياً حسب نوع النشاط المختار.
          </p>
        </div>
      </div>
    </div>
  )
}
