import { useEffect, useState } from 'react'
import { Zap, Users2, MessageSquare, TrendingUp, ArrowUpRight, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { StatCard } from '../shared/StatCard'
import { MiniChart } from '../shared/MiniChart'
import { MessageLimitBanner } from '../shared/MessageLimitBanner'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function dayKey(d: Date) { return d.toISOString().slice(0, 10) }

const STAGE_AR: Record<string, string> = {
  new_lead: 'جديد', contacted: 'تم التواصل', qualified: 'مؤهل',
  meeting_booked: 'موعد محجوز', demo_done: 'تم العرض', proposal_sent: 'عرض أُرسل',
  negotiation: 'تفاوض', won: 'مغلق ✅', lost: 'خسارة ❌', on_hold: 'معلّق',
}

export const ClientOverview = () => {
  const { company, companyId, loading: authLoading } = useClientCompany()
  const [leads, setLeads] = useState<any[]>([])
  const [automations, setAutomations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return

    const load = async () => {
      setLoading(true)
      let leadsQ = supabase.from('crm_leads').select('*').order('updated_at', { ascending: false })
      let autoQ  = supabase.from('automations').select('*').order('created_at', { ascending: false })

      if (companyId) {
        leadsQ = leadsQ.eq('company_id', companyId)
        autoQ  = autoQ.eq('company_id', companyId)
      }

      const [{ data: leadsData }, { data: autoData }] = await Promise.all([leadsQ, autoQ])
      setLeads(leadsData || [])
      setAutomations(autoData || [])
      setLoading(false)
    }

    load()

    const ch = supabase.channel('client_overview_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [authLoading, companyId])

  const now = new Date()
  const thisMonth = monthKey(now)
  const prevDate = new Date(now); prevDate.setMonth(prevDate.getMonth() - 1)
  const prevMonth = monthKey(prevDate)

  const wonLeads    = leads.filter(l => l.stage === 'won')
  const activeLeads = leads.filter(l => !['won', 'lost'].includes(l.stage))
  const leadsThisMonth = leads.filter(l => (l.created_at || '').startsWith(thisMonth)).length
  const leadsPrevMonth = leads.filter(l => (l.created_at || '').startsWith(prevMonth)).length
  const revenueThis    = wonLeads.filter(l => (l.updated_at || '').startsWith(thisMonth)).reduce((s, l) => s + (l.price_sold || 0), 0)
  const closeRate      = leads.length ? Math.round(wonLeads.length / leads.length * 100) : 0
  const activeAutomations = automations.filter(a => a.status === 'active').length

  const weeklyLeads = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() - (6 - i))
    return { day: d.toLocaleDateString('ar', { weekday: 'short' }), leads: leads.filter(l => (l.created_at || '').startsWith(dayKey(d))).length }
  })

  const weeklyMessages = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() - (6 - i))
    return { day: d.toLocaleDateString('ar', { weekday: 'short' }), messages: leads.filter(l => (l.updated_at || '').startsWith(dayKey(d))).length }
  })

  if (authLoading || loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <Loader2 size={20} className="animate-spin text-primary-400" />
      <p className="text-slate-500 font-tajawal text-sm">جاري التحميل...</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-cairo">
          نظرة عامة{company ? ` — ${company.name}` : ''}
        </h1>
        <p className="text-sm text-slate-500 font-tajawal">بيانات مباشرة من Supabase</p>
      </div>

      {/* Message limit alert */}
      {company && <MessageLimitBanner company={company} />}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="أتمتة نشطة"       value={activeAutomations}            icon={<Zap size={18} />}           trend={0}  accent="#4F6EF7" delay={0.0} />
        <StatCard label="إجمالي العملاء"    value={leads.length}                 icon={<Users2 size={18} />}        trend={leadsPrevMonth ? Math.round((leadsThisMonth - leadsPrevMonth) / leadsPrevMonth * 100) : 0} accent="#10B981" delay={0.1} />
        <StatCard label="نشاط اليوم"        value={leads.filter(l => (l.updated_at || '').startsWith(dayKey(now))).length} icon={<MessageSquare size={18} />} trend={0} accent="#06B6D4" delay={0.2} />
        <StatCard label="معدل الإغلاق"      value={`${closeRate}%`}             icon={<TrendingUp size={18} />}    trend={0}  accent="#8B5CF6" delay={0.3} />
        <StatCard label="عملاء هذا الشهر"  value={leadsThisMonth}               icon={<ArrowUpRight size={18} />}  trend={0}  accent="#F59E0B" delay={0.4} />
        <StatCard label="صفقات مغلقة"       value={wonLeads.length}              icon={<TrendingUp size={18} />}    trend={0}  accent="#EC4899" delay={0.5} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 className="text-sm font-bold text-white font-cairo mb-4">نشاط العملاء هذا الأسبوع</h3>
          <MiniChart data={weeklyMessages} dataKey="messages" color="#4F6EF7" height={140} />
        </div>
        <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 className="text-sm font-bold text-white font-cairo mb-4">عملاء جدد هذا الأسبوع</h3>
          <MiniChart data={weeklyLeads} dataKey="leads" type="bar" color="#10B981" height={140} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 className="text-sm font-bold text-white font-cairo mb-4">الصفقات النشطة ({activeLeads.length})</h3>
          {activeLeads.length === 0 ? (
            <p className="text-xs text-slate-600 font-tajawal py-4 text-center">لا توجد صفقات نشطة بعد</p>
          ) : (
            <div className="space-y-3">
              {activeLeads.slice(0, 5).map(l => (
                <div key={l.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-white font-tajawal truncate">{l.company_name}</p>
                      <span className="text-xs text-slate-500 font-tajawal">{STAGE_AR[l.stage] || l.stage}</span>
                    </div>
                    {l.price_sold ? <p className="text-xs text-emerald-400 font-tajawal">{l.price_sold.toLocaleString('ar')} ر.س</p> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 className="text-sm font-bold text-white font-cairo mb-4">صفقات مغلقة — {revenueThis > 0 ? `${(revenueThis / 1000).toFixed(1)}K ر.س هذا الشهر` : 'لا يوجد بعد'}</h3>
          {wonLeads.length === 0 ? (
            <p className="text-xs text-slate-600 font-tajawal py-4 text-center">لا توجد صفقات مغلقة بعد</p>
          ) : (
            <div className="space-y-3">
              {wonLeads.slice(0, 5).map(l => (
                <motion.div key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center justify-between p-2.5 rounded-xl"
                  style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <p className="text-xs text-white font-tajawal truncate">{l.company_name}</p>
                  <span className="text-xs font-bold text-emerald-400 font-tajawal shrink-0 mr-2">
                    {l.price_sold ? l.price_sold.toLocaleString('ar') + ' ر.س' : '✅'}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
