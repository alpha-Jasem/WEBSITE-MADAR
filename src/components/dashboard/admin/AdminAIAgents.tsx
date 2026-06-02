import { useEffect, useMemo, useState } from 'react'
import { Bot, Building2, Headphones, Loader2, MessageSquare, SlidersHorizontal, TicketCheck, UserPlus } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Company } from '../../../types'

type AgentType = 'client_support' | 'sales_website' | 'end_customer'

type Conversation = {
  id: string
  agent_type: AgentType
  company_id: string | null
  route: string | null
  title: string
  status: string
  visitor_name: string | null
  visitor_phone: string | null
  created_at: string
  updated_at: string
  company?: { name?: string | null } | null
}

type SupportTicket = {
  id: string
  subject: string
  priority: string
  status: string
  route: string
  created_at: string
  company?: { name?: string | null } | null
}

type SalesLead = {
  id: string
  name: string
  phone: string | null
  email: string | null
  business_type: string | null
  status: string
  created_at: string
}

const agentLabels: Record<AgentType, string> = {
  client_support: 'دعم بوابة المغسلة',
  sales_website: 'مبيعات الموقع',
  end_customer: 'مساعد العميل النهائي',
}

function isEnabled(company: Company, agent: AgentType) {
  if (agent === 'sales_website') return true
  const agents = ((company.cw_automations as any)?.ai_agents || {}) as Record<string, boolean>
  return agents[agent] !== false
}

const Stat = ({ icon: Icon, label, value }: { icon: typeof Bot; label: string; value: number | string }) => (
  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300">
      <Icon size={19} />
    </div>
    <p className="text-xs font-bold text-slate-500 font-tajawal">{label}</p>
    <strong className="mt-1 block text-2xl font-black text-white font-sora">{value}</strong>
  </div>
)

export const AdminAIAgents = () => {
  const [companies, setCompanies] = useState<Company[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [salesLeads, setSalesLeads] = useState<SalesLead[]>([])
  const [filter, setFilter] = useState<AgentType | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const [companiesRes, conversationsRes, ticketsRes, leadsRes] = await Promise.all([
      supabase.from('companies').select('*').eq('business_type', 'car_wash').order('created_at', { ascending: false }).limit(120),
      supabase.from('ai_agent_conversations').select('*, company:companies(name)').order('updated_at', { ascending: false }).limit(80),
      supabase.from('ai_agent_support_tickets').select('*, company:companies(name)').order('created_at', { ascending: false }).limit(40),
      supabase.from('ai_agent_sales_leads').select('*').order('created_at', { ascending: false }).limit(40),
    ])
    setCompanies((companiesRes.data || []) as Company[])
    setConversations((conversationsRes.data || []) as Conversation[])
    setTickets((ticketsRes.data || []) as SupportTicket[])
    setSalesLeads((leadsRes.data || []) as SalesLead[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filteredConversations = useMemo(() => {
    if (filter === 'all') return conversations
    return conversations.filter(item => item.agent_type === filter)
  }, [conversations, filter])

  const toggleAgent = async (company: Company, agent: Exclude<AgentType, 'sales_website'>) => {
    setSaving(`${company.id}:${agent}`)
    const current = ((company.cw_automations as any) || {}) as Record<string, any>
    const currentAgents = (current.ai_agents || {}) as Record<string, boolean>
    const nextAutomations = {
      ...current,
      ai_agents: {
        ...currentAgents,
        [agent]: !isEnabled(company, agent),
      },
    }
    const { error } = await supabase.from('companies').update({ cw_automations: nextAutomations } as any).eq('id', company.id)
    if (!error) {
      setCompanies(prev => prev.map(item => item.id === company.id ? { ...item, cw_automations: nextAutomations } : item))
    }
    setSaving(null)
  }

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center gap-2 text-slate-400">
        <Loader2 size={18} className="animate-spin" />
        <span className="font-tajawal">جاري تحميل وكلاء مدار AI...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300 font-tajawal">
            <Bot size={14} />
            Madar AI Agents Hub
          </span>
          <h1 className="mt-3 text-3xl font-black text-white font-cairo">وكلاء مدار AI</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500 font-tajawal">
            راقب وكلاء الدعم والمبيعات والعميل النهائي، وشغل أو أوقف ميزات الذكاء لكل مغسلة بدون تدخل في العمليات الحساسة.
          </p>
        </div>
        <button onClick={load} className="rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2 text-sm font-bold text-slate-200 font-tajawal">
          تحديث البيانات
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Stat icon={MessageSquare} label="المحادثات" value={conversations.length} />
        <Stat icon={TicketCheck} label="تذاكر الدعم" value={tickets.filter(item => item.status !== 'resolved').length} />
        <Stat icon={UserPlus} label="فرص الموقع" value={salesLeads.length} />
        <Stat icon={Building2} label="مغاسل قابلة للتفعيل" value={companies.length} />
      </div>

      <section className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-5">
        <div className="mb-4 flex items-center gap-2">
          <SlidersHorizontal size={18} className="text-cyan-300" />
          <h2 className="text-lg font-black text-white font-cairo">تفعيل الوكلاء لكل مغسلة</h2>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {companies.slice(0, 10).map(company => (
            <div key={company.id} className="rounded-2xl border border-white/[0.07] bg-black/10 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <strong className="block text-sm text-white font-cairo">{company.name}</strong>
                  <span className="text-xs text-slate-500 font-tajawal">{company.plan} · {company.status}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['client_support', 'end_customer'] as const).map(agent => {
                  const active = isEnabled(company, agent)
                  const busy = saving === `${company.id}:${agent}`
                  return (
                    <button
                      key={agent}
                      type="button"
                      onClick={() => toggleAgent(company, agent)}
                      disabled={busy}
                      className={`rounded-xl px-3 py-2 text-xs font-bold font-tajawal ${active ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/[0.04] text-slate-500'}`}
                    >
                      {busy ? 'جاري الحفظ...' : `${agentLabels[agent]}: ${active ? 'مفعل' : 'متوقف'}`}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black text-white font-cairo">المحادثات الأخيرة</h2>
          <div className="flex flex-wrap gap-2">
            {(['all', 'client_support', 'sales_website', 'end_customer'] as const).map(item => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`rounded-xl px-3 py-2 text-xs font-bold font-tajawal ${filter === item ? 'bg-cyan-400/20 text-cyan-200' : 'bg-white/[0.04] text-slate-500'}`}
              >
                {item === 'all' ? 'الكل' : agentLabels[item]}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          {filteredConversations.length === 0 ? (
            <p className="rounded-2xl border border-white/[0.06] p-6 text-center text-sm text-slate-500 font-tajawal">لا توجد محادثات بعد.</p>
          ) : filteredConversations.slice(0, 14).map(item => (
            <div key={item.id} className="grid gap-2 rounded-2xl border border-white/[0.06] bg-black/10 p-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-[11px] font-bold text-cyan-300 font-tajawal">{agentLabels[item.agent_type]}</span>
                  <strong className="text-sm text-white font-cairo">{item.title}</strong>
                </div>
                <p className="mt-1 text-xs text-slate-500 font-tajawal">{item.company?.name || item.visitor_name || 'زائر'} · {item.route || 'بدون مسار'}</p>
              </div>
              <span className="text-xs text-slate-500 font-sora">{new Date(item.updated_at).toLocaleString('ar-SA')}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-white font-cairo"><Headphones size={18} /> تذاكر الدعم</h2>
          <div className="space-y-2">
            {tickets.length === 0 ? <p className="text-sm text-slate-500 font-tajawal">لا توجد تذاكر مفتوحة.</p> : tickets.slice(0, 8).map(ticket => (
              <div key={ticket.id} className="rounded-2xl border border-white/[0.06] bg-black/10 p-4">
                <strong className="block text-sm text-white font-cairo">{ticket.subject}</strong>
                <p className="mt-1 text-xs text-slate-500 font-tajawal">{ticket.company?.name || 'منشأة'} · {ticket.priority} · {ticket.status}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-white font-cairo"><UserPlus size={18} /> فرص الموقع</h2>
          <div className="space-y-2">
            {salesLeads.length === 0 ? <p className="text-sm text-slate-500 font-tajawal">لا توجد فرص من الوكيل بعد.</p> : salesLeads.slice(0, 8).map(lead => (
              <div key={lead.id} className="rounded-2xl border border-white/[0.06] bg-black/10 p-4">
                <strong className="block text-sm text-white font-cairo">{lead.name}</strong>
                <p className="mt-1 text-xs text-slate-500 font-tajawal">{lead.phone || lead.email || 'بدون رقم'} · {lead.business_type || 'نشاط غير محدد'}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
