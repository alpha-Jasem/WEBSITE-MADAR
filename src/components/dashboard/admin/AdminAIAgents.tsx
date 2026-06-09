import { useEffect, useMemo, useState } from 'react'
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
  updated_at: string
  company?: { name?: string | null } | null
}

type SupportTicket = {
  id: string
  subject: string
  priority: string
  status: string
  company?: { name?: string | null } | null
}

type SalesLead = {
  id: string
  name: string
  phone: string | null
  email: string | null
  business_type: string | null
  status: string
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

  useEffect(() => { load() }, [])

  const filteredConversations = useMemo(() => {
    if (filter === 'all') return conversations
    return conversations.filter(item => item.agent_type === filter)
  }, [conversations, filter])

  const toggleAgent = async (company: Company, agent: Exclude<AgentType, 'sales_website'>) => {
    setSaving(`${company.id}:${agent}`)
    const current = ((company.cw_automations as any) || {}) as Record<string, any>
    const currentAgents = (current.ai_agents || {}) as Record<string, boolean>
    const nextAutomations = { ...current, ai_agents: { ...currentAgents, [agent]: !isEnabled(company, agent) } }
    const { error } = await supabase.from('companies').update({ cw_automations: nextAutomations } as any).eq('id', company.id)
    if (!error) setCompanies(prev => prev.map(item => item.id === company.id ? { ...item, cw_automations: nextAutomations } : item))
    setSaving(null)
  }

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '55vh', gap: 10, color: 'var(--ink-3)' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        جاري تحميل وكلاء مدار AI…
      </div>
    )
  }

  return (
    <div className="page fade-in">
      <div className="sec-head" style={{ marginBottom: 24 }}>
        <div>
          <div className="sec-title">وكلاء AI</div>
          <div className="sec-sub">الوكلاء الصوتيون والمحادثات النشطة</div>
        </div>
        <button className="btn btn-ghost" onClick={load}>تحديث</button>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'المحادثات', value: conversations.length },
          { label: 'تذاكر الدعم المفتوحة', value: tickets.filter(t => t.status !== 'resolved').length },
          { label: 'فرص الموقع', value: salesLeads.length },
          { label: 'مغاسل مفعّلة', value: companies.length },
        ].map((s, i) => (
          <div key={i} className="stat">
            <div className="stat-top"><div className="stat-label">{s.label}</div></div>
            <div className="stat-value num">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-pad" style={{ paddingBottom: 8 }}>
          <div className="sec-title" style={{ marginBottom: 16, fontSize: 15 }}>تفعيل الوكلاء لكل مغسلة</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {companies.slice(0, 10).map(company => (
              <div key={company.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)', marginBottom: 2 }}>{company.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{company.plan} · {company.status}</div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(['client_support', 'end_customer'] as const).map(agent => {
                    const active = isEnabled(company, agent)
                    const busy = saving === `${company.id}:${agent}`
                    return (
                      <button
                        key={agent} type="button"
                        onClick={() => toggleAgent(company, agent)}
                        disabled={busy}
                        className={`badge ${active ? 'green' : 'gray'}`}
                        style={{ cursor: 'pointer', fontSize: 11, padding: '5px 10px' }}
                      >
                        {busy ? 'جاري…' : `${agentLabels[agent]}: ${active ? 'مفعل' : 'متوقف'}`}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20, overflow: 'hidden' }}>
        <div className="row gap-3 card-pad" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>المحادثات الأخيرة</span>
          <div style={{ display: 'flex', gap: 8, marginInlineStart: 'auto', flexWrap: 'wrap' }}>
            {(['all', 'client_support', 'sales_website', 'end_customer'] as const).map(item => (
              <button key={item} className={`pill ${filter === item ? 'active' : ''}`}
                style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setFilter(item)}>
                {item === 'all' ? 'الكل' : agentLabels[item]}
              </button>
            ))}
          </div>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>الوكيل</th>
              <th>العنوان</th>
              <th>الشركة / الزائر</th>
              <th>المسار</th>
              <th>آخر تحديث</th>
            </tr>
          </thead>
          <tbody>
            {filteredConversations.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--ink-3)' }}>لا توجد محادثات بعد</td></tr>
            ) : filteredConversations.slice(0, 14).map(item => (
              <tr key={item.id}>
                <td><span className="badge violet">{agentLabels[item.agent_type]}</span></td>
                <td style={{ fontWeight: 500, maxWidth: 200 }}>{item.title}</td>
                <td style={{ color: 'var(--ink-2)', fontSize: 12 }}>{item.company?.name || item.visitor_name || 'زائر'}</td>
                <td style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>{item.route || '—'}</td>
                <td style={{ fontSize: 12, color: 'var(--ink-3)' }}>{new Date(item.updated_at).toLocaleString('ar-SA')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-pad" style={{ paddingBottom: 0, borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, paddingBottom: 14 }}>تذاكر الدعم</div>
          </div>
          <table className="tbl">
            <tbody>
              {tickets.length === 0 ? (
                <tr><td style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-3)' }}>لا توجد تذاكر مفتوحة</td></tr>
              ) : tickets.slice(0, 8).map(ticket => (
                <tr key={ticket.id}>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{ticket.subject}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{ticket.company?.name} · {ticket.priority}</div>
                  </td>
                  <td><span className={`badge ${ticket.status === 'resolved' ? 'green' : 'amber'}`}>{ticket.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-pad" style={{ paddingBottom: 0, borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, paddingBottom: 14 }}>فرص الموقع</div>
          </div>
          <table className="tbl">
            <tbody>
              {salesLeads.length === 0 ? (
                <tr><td style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-3)' }}>لا توجد فرص بعد</td></tr>
              ) : salesLeads.slice(0, 8).map(lead => (
                <tr key={lead.id}>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{lead.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{lead.phone || lead.email || 'بدون رقم'}</div>
                  </td>
                  <td><span className="badge gray">{lead.business_type || 'غير محدد'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
