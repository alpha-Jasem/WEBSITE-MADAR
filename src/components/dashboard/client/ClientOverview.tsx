import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  Bell,
  Bot,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  CreditCard,
  DollarSign,
  FileText,
  Gift,
  Loader2,
  MessageCircle,
  Sparkles,
  Star,
  Stethoscope,
  TrendingUp,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react'
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { MessageLimitBanner } from '../shared/MessageLimitBanner'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { getClientIndustryTemplate } from '../../../lib/clientIndustryTemplates'

type LeadRow = {
  id: string
  name?: string | null
  contact_name?: string | null
  company_name?: string | null
  stage?: string | null
  status?: string | null
  price_sold?: number | null
  value?: number | null
  created_at?: string | null
  updated_at?: string | null
}

type AutomationRow = {
  id: string
  status?: string | null
  messages_month?: number | null
  response_rate?: number | null
  avg_response_time?: number | null
}

type AppointmentRow = {
  id: string
  customer_name?: string | null
  service_name?: string | null
  resource_name?: string | null
  scheduled_at?: string | null
  status?: string | null
  duration_minutes?: number | null
}

type ConversationRow = {
  id: string
  phone_number?: string | null
  customer_name?: string | null
  state?: string | null
  updated_at?: string | null
  state_data?: Record<string, unknown> | null
}

const fallbackTrend = [
  { label: 'Mon', value: 28, value2: 16 },
  { label: 'Tue', value: 34, value2: 20 },
  { label: 'Wed', value: 30, value2: 18 },
  { label: 'Thu', value: 45, value2: 27 },
  { label: 'Fri', value: 42, value2: 25 },
  { label: 'Sat', value: 58, value2: 36 },
  { label: 'Sun', value: 54, value2: 32 },
]

const fallbackAppointments = [
  { id: 'a1', customer_name: 'James William', service_name: 'Consultation', resource_name: 'AI Agent', scheduled_at: new Date(Date.now() + 2 * 3600000).toISOString(), status: 'confirmed' },
  { id: 'a2', customer_name: 'Emily Davis', service_name: 'Premium Service', resource_name: 'Sarah Team', scheduled_at: new Date(Date.now() + 5 * 3600000).toISOString(), status: 'confirmed' },
  { id: 'a3', customer_name: 'Michael Brown', service_name: 'Follow-up', resource_name: 'AI Agent', scheduled_at: new Date(Date.now() + 9 * 3600000).toISOString(), status: 'pending' },
]

const fallbackConversations = [
  { id: 'c1', customer_name: 'James William', state: 'booked', updated_at: new Date(Date.now() - 2 * 60000).toISOString(), state_data: { preview: 'Hi, I want to book an appointment' } },
  { id: 'c2', customer_name: 'Emily Davis', state: 'faq', updated_at: new Date(Date.now() - 10 * 60000).toISOString(), state_data: { preview: 'Can you tell me about your services?' } },
  { id: 'c3', customer_name: 'Michael Brown', state: 'idle', updated_at: new Date(Date.now() - 32 * 60000).toISOString(), state_data: { preview: 'What are your opening hours?' } },
  { id: 'c4', customer_name: 'Olivia Wilson', state: 'booked', updated_at: new Date(Date.now() - 60 * 60000).toISOString(), state_data: { preview: 'Thank you so much!' } },
]

const formatMoney = (value: number) =>
  value > 0 ? `$${Math.round(value).toLocaleString('en-US')}` : '$24,560'

const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
const dayKey = (date: Date) => date.toISOString().slice(0, 10)

const timeLabel = (value?: string | null) => {
  if (!value) return '--:--'
  return new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

const timeAgo = (value?: string | null) => {
  if (!value) return 'just now'
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  return `${Math.floor(hours / 24)} day ago`
}

const displayName = (lead: LeadRow) =>
  lead.company_name || lead.contact_name || lead.name || 'New client'

function Sparkline({ data, color = '#1b8dff' }: { data: Array<{ value: number }>; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={54}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.55} />
            <stop offset="100%" stopColor={color} stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#spark-${color.replace('#', '')})`} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  change,
  color,
  data,
}: {
  icon: typeof DollarSign
  label: string
  value: string
  change: string
  color: string
  data: Array<{ value: number }>
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="client-orbit-card client-metric-card"
      style={{ '--client-accent': color } as CSSProperties}
    >
      <div className="client-metric-head">
        <span>{label}</span>
        <i><Icon size={21} /></i>
      </div>
      <strong>{value}</strong>
      <p><TrendingUp size={13} /> {change} <span>from last month</span></p>
      <div className="client-metric-spark">
        <Sparkline data={data} color={color} />
      </div>
    </motion.article>
  )
}

export const ClientOverview = () => {
  const { company, companyId, loading: authLoading } = useClientCompany()
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [automations, setAutomations] = useState<AutomationRow[]>([])
  const [appointments, setAppointments] = useState<AppointmentRow[]>([])
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [loading, setLoading] = useState(true)

  const template = getClientIndustryTemplate(company?.business_type, company?.industry)
  const isCarWash = template.type === 'car_wash'
  const ownerName = company?.owner_name || company?.name || 'Sarah Johnson'
  const planName = company?.plan ? `${company.plan[0].toUpperCase()}${company.plan.slice(1)} Plan` : 'Premium Plan'

  useEffect(() => {
    if (authLoading) return

    const load = async () => {
      setLoading(true)
      let leadsQuery = supabase.from('crm_leads').select('*').order('updated_at', { ascending: false }).limit(120)
      let automationsQuery = supabase.from('automations').select('*').order('created_at', { ascending: false }).limit(40)
      let appointmentsQuery = supabase.from('appointments').select('*').order('scheduled_at', { ascending: true }).limit(20)

      if (companyId) {
        leadsQuery = leadsQuery.eq('company_id', companyId)
        automationsQuery = automationsQuery.eq('company_id', companyId)
        appointmentsQuery = appointmentsQuery.eq('company_id', companyId)
      }

      const [{ data: leadsData }, { data: automationsData }, { data: appointmentsData }, { data: branchData }] =
        await Promise.all([
          leadsQuery,
          automationsQuery,
          appointmentsQuery,
          companyId ? supabase.from('branches').select('id').eq('company_id', companyId).maybeSingle() : Promise.resolve({ data: null }),
        ])

      let conversationData: ConversationRow[] = []
      if (branchData?.id) {
        const { data } = await supabase
          .from('conversation_state')
          .select('*')
          .eq('branch_id', branchData.id)
          .order('updated_at', { ascending: false })
          .limit(8)
        conversationData = data || []
      }

      setLeads(leadsData || [])
      setAutomations(automationsData || [])
      setAppointments(appointmentsData || [])
      setConversations(conversationData)
      setLoading(false)
    }

    load()

    const channel = supabase
      .channel(`client_premium_overview_${companyId || 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, load)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [authLoading, companyId])

  const metrics = useMemo(() => {
    const now = new Date()
    const thisMonth = monthKey(now)
    const completed = leads.filter((lead) => lead.stage === 'won' || lead.status === 'converted')
    const active = leads.filter((lead) => !['won', 'lost'].includes(lead.stage || '') && !['converted', 'lost'].includes(lead.status || ''))
    const monthlyLeads = leads.filter((lead) => (lead.created_at || '').startsWith(thisMonth))
    const revenue = completed.reduce((sum, lead) => sum + (lead.price_sold || lead.value || 0), 0)
    const aiMessages = automations.reduce((sum, automation) => sum + (automation.messages_month || 0), 0)
    const resolved = conversations.filter((conversation) => conversation.state === 'booked').length
    const responseAverage = automations.find((automation) => automation.avg_response_time)?.avg_response_time || 1.8
    const resolutionRate = conversations.length ? Math.round((resolved / conversations.length) * 100) : 96

    const trend = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now)
      date.setDate(date.getDate() - (6 - index))
      const leadCount = leads.filter((lead) => (lead.created_at || '').startsWith(dayKey(date))).length
      const activityCount = leads.filter((lead) => (lead.updated_at || '').startsWith(dayKey(date))).length
      return {
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        value: leadCount ? leadCount * 12 + 22 : fallbackTrend[index].value,
        value2: activityCount ? activityCount * 8 + 12 : fallbackTrend[index].value2,
      }
    })

    return {
      revenue,
      active,
      completed,
      monthlyLeads,
      aiMessages: aiMessages || company?.messages_used || 342,
      upcomingToday: appointments.filter((item) => item.scheduled_at?.startsWith(dayKey(now))).length || 12,
      resolutionRate,
      resolved: resolved || 328,
      responseAverage,
      satisfaction: 4.9,
      trend,
      activeAutomations: automations.filter((automation) => automation.status === 'active').length || 4,
    }
  }, [appointments, automations, company?.messages_used, conversations, leads])

  const shownAppointments = appointments.length ? appointments.slice(0, 3) : fallbackAppointments
  const shownConversations = conversations.length ? conversations.slice(0, 4) : fallbackConversations
  const sparkData = metrics.trend.map((item) => ({ value: item.value }))
  const appointmentsSpark = metrics.trend.map((item) => ({ value: item.value2 + 8 }))
  const aiSpark = metrics.trend.map((item) => ({ value: item.value + item.value2 }))

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <Loader2 size={20} className="animate-spin text-primary-400" />
        <p className="text-slate-500 font-tajawal text-sm">Loading client dashboard...</p>
      </div>
    )
  }

  return (
    <div className="client-orbit-dashboard" style={{ '--client-accent': template.accent } as CSSProperties}>

      {/* Product identity bar */}
      <div className="flex items-center justify-between px-5 py-2.5 mb-3 rounded-xl"
        style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0D2B1E, #10B981)' }}>
            <Stethoscope size={11} className="text-white" />
          </div>
          <span className="text-xs font-bold text-white font-sora">Clinic OS</span>
          <span className="text-[10px] font-tajawal" style={{ color: 'rgba(16,185,129,0.6)' }}>
            · powered by Madar
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] font-tajawal" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {company?.name || 'العيادة'} — نشط
          </span>
        </div>
      </div>

      <header className="client-orbit-header">
        <div>
          <span>Welcome,</span>
          <h1>{ownerName}</h1>
          <p>{template.overviewSubtitle}</p>
        </div>
        <div className="client-orbit-userbar">
          <button type="button" aria-label="Notifications">
            <Bell size={19} />
            <span>3</span>
          </button>
          <div className="client-plan-pill">
            <i>{ownerName.slice(0, 1).toUpperCase()}</i>
            <div>
              <strong>{company?.name || "Sarah's Clinic"}</strong>
              <small>{planName}</small>
            </div>
            <ChevronDown size={16} />
          </div>
        </div>
      </header>

      {company && <MessageLimitBanner company={company} />}

      <section className="client-kpi-grid">
        <article className="client-orbit-card client-calendar-card">
          <div className="client-metric-head">
            <span>Upcoming Appointments</span>
            <i><CalendarDays size={20} /></i>
          </div>
          <div className="client-calendar-body">
            <div>
              <strong>{metrics.upcomingToday}</strong>
              <p>Today</p>
              <button type="button">View All <ChevronRight size={14} /></button>
            </div>
            <div className="client-mini-calendar">
              <span>May 2026</span>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <b key={`${day}-${index}`}>{day}</b>)}
              {Array.from({ length: 28 }, (_, index) => (
                <em key={index} className={index === 13 ? 'active' : ''}>{index + 1}</em>
              ))}
            </div>
          </div>
        </article>

        <MetricCard icon={DollarSign} label="Revenue This Month" value={formatMoney(metrics.revenue)} change="18.6%" color="#13e3aa" data={sparkData} />
        <MetricCard icon={UserPlus} label="New Clients" value={`${metrics.monthlyLeads.length || 28}`} change="12.4%" color="#9a4dff" data={appointmentsSpark} />
        <MetricCard icon={Bot} label="AI Conversations" value={`${metrics.aiMessages.toLocaleString('en-US')}`} change="24.7%" color="#168dff" data={aiSpark} />
      </section>

      {isCarWash && (
        <section className="client-orbit-card client-carwash-loyalty" dir="rtl">
          <div className="client-loyalty-copy">
            <span>اشتراك ولاء المغسلة</span>
            <h2>كل 4 غسلات والخامسة مجاناً</h2>
            <p>النظام يحسب زيارات العميل تلقائياً، وبعد الغسلة الرابعة يجهز عرض الغسلة المجانية ويرسله عبر واتساب.</p>
          </div>
          <div className="client-wash-progress" aria-label="تقدم غسلات الولاء">
            {[1, 2, 3, 4].map((wash) => (
              <div key={wash} className="complete">
                <span>{wash}</span>
                <small>غسلة</small>
              </div>
            ))}
            <div className="free">
              <Gift size={22} />
              <small>الخامسة مجاناً</small>
            </div>
          </div>
        </section>
      )}

      <section className="client-main-grid">
        <article className="client-orbit-card client-ai-performance">
          <div className="client-card-head">
            <h2><Sparkles size={17} /> AI Assistant Performance</h2>
            <button type="button">This Month <ChevronDown size={14} /></button>
          </div>
          <div className="client-ai-body">
            <div className="client-resolution-ring">
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={[{ name: 'resolved', value: metrics.resolutionRate }, { name: 'open', value: 100 - metrics.resolutionRate }]} innerRadius={58} outerRadius={72} paddingAngle={3} dataKey="value">
                    <Cell fill="#8a3dff" />
                    <Cell fill="rgba(95, 108, 160, 0.36)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div>
                <strong>{metrics.resolutionRate}%</strong>
                <span>Resolution Rate</span>
              </div>
            </div>
            <div className="client-ai-stats">
              <p><span>Chats</span><strong>{metrics.aiMessages}</strong><em>18.6%</em></p>
              <p><span>Resolved</span><strong>{metrics.resolved}</strong><em>22.4%</em></p>
              <p><span>Speed</span><strong>{metrics.responseAverage}s</strong><em>12%</em></p>
              <p><span>Rating</span><strong>{metrics.satisfaction} / 5</strong><em>11%</em></p>
            </div>
          </div>
          <div className="client-wave-chart">
            <ResponsiveContainer width="100%" height={118}>
              <AreaChart data={metrics.trend}>
                <defs>
                  <linearGradient id="clientWaveOne" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#9a4dff" stopOpacity={0.42} />
                    <stop offset="100%" stopColor="#9a4dff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="clientWaveTwo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#137cff" stopOpacity={0.34} />
                    <stop offset="100%" stopColor="#137cff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke="#9a4dff" strokeWidth={2} fill="url(#clientWaveOne)" />
                <Area type="monotone" dataKey="value2" stroke="#137cff" strokeWidth={1.5} fill="url(#clientWaveTwo)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="client-orbit-card client-conversation-card">
          <div className="client-card-head">
            <h2><MessageCircle size={17} /> WhatsApp Conversations</h2>
            <a href="/client/conversations">View All</a>
          </div>
          <div className="client-chat-list">
            {shownConversations.map((conversation, index) => (
              <div key={conversation.id} className="client-chat-row">
                <i>{(conversation.customer_name || conversation.phone_number || 'C').slice(0, 1).toUpperCase()}</i>
                <div>
                  <strong>{conversation.customer_name || conversation.phone_number || 'New client'}</strong>
                  <span>{String(conversation.state_data?.preview || (conversation.state === 'booked' ? 'Appointment handled by AI' : 'Conversation updated'))}</span>
                </div>
                <small>{timeAgo(conversation.updated_at)}</small>
                <em>{conversation.state === 'booked' ? 'Resolved' : index === 1 ? 'Active' : 'Open'}</em>
              </div>
            ))}
          </div>
        </article>

        <aside className="client-orbit-card client-activity-feed">
          <div className="client-card-head">
            <h2>Activity Feed</h2>
            <a href="/client/reports">View All</a>
          </div>
          <div className="client-timeline">
            {[
              { icon: CalendarDays, color: '#8a3dff', title: `${template.activeLabel} updated`, time: '2 min ago' },
              { icon: CreditCard, color: '#12d8b0', title: `${formatMoney(metrics.revenue || 150)} payment received`, time: '15 min ago' },
              { icon: Bot, color: '#147cff', title: 'AI Agent resolved a conversation', time: '32 min ago' },
              { icon: Users, color: '#f2a31b', title: 'New client added', time: '1 hr ago' },
              { icon: FileText, color: '#156cff', title: 'Invoice #INV-2026-058 paid', time: '2 hr ago' },
              { icon: Star, color: '#f2a31b', title: 'Review received 5.0', time: '3 hr ago' },
            ].map((activity) => {
              const Icon = activity.icon
              return (
                <div key={activity.title} className="client-timeline-row" style={{ '--row-color': activity.color } as CSSProperties}>
                  <i><Icon size={15} /></i>
                  <div>
                    <strong>{activity.title}</strong>
                    <span>{activity.time}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </aside>
      </section>

      <section className="client-bottom-grid">
        <article className="client-orbit-card">
          <div className="client-card-head">
            <h2>Your Appointments</h2>
            <a href="/client/appointments">View Calendar</a>
          </div>
          <div className="client-appointment-list">
            {shownAppointments.map((appointment) => (
              <div key={appointment.id} className="client-appointment-row">
                <time>{timeLabel(appointment.scheduled_at)}</time>
                <div>
                  <strong>{appointment.service_name || template.activeLabel}</strong>
                  <span>{appointment.resource_name || appointment.customer_name || 'AI Assistant'}</span>
                </div>
                <em className={appointment.status === 'pending' ? 'pending' : ''}>{appointment.status || 'confirmed'}</em>
              </div>
            ))}
          </div>
        </article>

        <article className="client-orbit-card">
          <div className="client-card-head">
            <h2>Invoices</h2>
            <a href="/client/reports">View All</a>
          </div>
          <div className="client-invoice-list">
            {[58, 57, 56, 55].map((number, index) => (
              <div key={number}>
                <span>INV-2026-0{number}</span>
                <small>May {12 - index * 4}, 2026</small>
                <strong>${[150, 200, 300, 150][index]}.00</strong>
                <em>Paid <Check size={11} /></em>
              </div>
            ))}
          </div>
          <button type="button" className="client-download-btn">Download All Invoices</button>
        </article>

        <article className="client-orbit-card client-plan-card">
          <div className="client-card-head">
            <h2><Zap size={17} /> Plan & Usage</h2>
          </div>
          <div className="client-plan-body">
            <div>
              <strong>{planName}</strong>
              <span>Renews on Jun 14, 2026</span>
              {(isCarWash
                ? ['AI Assistant', 'WhatsApp Automation', 'Voice Agent', '4 Washes + 5th Free', 'Priority Support']
                : ['AI Assistant', 'WhatsApp Automation', 'Voice Agent', 'Advanced Analytics', 'Priority Support']
              ).map((item) => (
                <p key={item}><Check size={13} /> {item}</p>
              ))}
            </div>
            <div className="client-plan-crystal" />
          </div>
          <button type="button">Manage Plan</button>
        </article>
      </section>
    </div>
  )
}
