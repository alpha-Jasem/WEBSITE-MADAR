import { useEffect, useState } from 'react'
import { BarChart3, MessageSquare, Users2, TrendingUp, Clock, Loader2 } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#0D1422', border: '1px solid #CBD5E1', borderRadius: 8, padding: '8px 12px' }}>
      <p style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ fontSize: 13, fontWeight: 700, color: p.color, fontFamily: 'Sora, sans-serif', margin: '2px 0 0' }}>
          {p.value}
        </p>
      ))}
    </div>
  )
}

function StatBox({ icon: Icon, label, value, color }: { icon: typeof MessageSquare; label: string; value: string; color: string }) {
  return (
    <div className="p-4 rounded-xl text-center" style={{ background: '#FAFAFA', border: `1px solid ${color}22` }}>
      <Icon size={18} style={{ color, margin: '0 auto 8px' }} />
      <p className="text-2xl font-bold font-sora mb-1" style={{ color }}>{value}</p>
      <p className="text-xs text-slate-500 font-tajawal">{label}</p>
    </div>
  )
}

export const ClientReports = () => {
  const { companyId, loading: authLoading } = useClientCompany()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ messages: 0, leads: 0, wonLeads: 0, appointments: 0 })
  const [weeklyMessages, setWeeklyMessages] = useState<any[]>([])
  const [weeklyLeads, setWeeklyLeads] = useState<any[]>([])

  useEffect(() => {
    if (authLoading || !companyId) return
    const load = async () => {
      setLoading(true)
      const since30 = new Date()
      since30.setDate(since30.getDate() - 30)
      const since7 = new Date()
      since7.setDate(since7.getDate() - 7)

      const [{ data: msgs }, { data: leads }, { data: appts }] = await Promise.all([
        supabase.from('message_logs').select('id, created_at').eq('company_id', companyId).gte('created_at', since30.toISOString()),
        supabase.from('crm_leads').select('id, stage, created_at').eq('company_id', companyId),
        supabase.from('appointments').select('id, status, created_at').eq('company_id', companyId).gte('created_at', since30.toISOString()),
      ])

      const wonLeads = (leads || []).filter(l => l.stage === 'won').length
      setStats({
        messages: (msgs || []).length,
        leads: (leads || []).length,
        wonLeads,
        appointments: (appts || []).length,
      })

      // Build last 7 days charts
      const now = new Date()
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now)
        d.setDate(d.getDate() - (6 - i))
        const key = d.toISOString().slice(0, 10)
        const label = d.toLocaleDateString('ar-SA', { weekday: 'short' })
        return {
          label,
          messages: (msgs || []).filter(m => m.created_at?.startsWith(key)).length,
          leads: (leads || []).filter(l => l.created_at?.startsWith(key)).length,
        }
      })
      setWeeklyMessages(days.map(d => ({ day: d.label, messages: d.messages })))
      setWeeklyLeads(days.map(d => ({ day: d.label, leads: d.leads })))

      setLoading(false)
    }
    load()
  }, [authLoading, companyId])

  const convRate = stats.leads > 0 ? Math.round((stats.wonLeads / stats.leads) * 100) : 0

  if (authLoading || loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <Loader2 size={20} className="animate-spin text-primary-400" />
      <p className="text-slate-500 font-tajawal text-sm">جاري تحميل التقارير...</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-cairo">التقارير</h1>
        <p className="text-sm text-slate-500 font-tajawal">آخر 30 يوم</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatBox icon={MessageSquare} label="الرسائل المرسلة" value={stats.messages.toLocaleString()} color="#4F6EF7" />
        <StatBox icon={Users2} label="العملاء المحتملون" value={stats.leads.toLocaleString()} color="#10B981" />
        <StatBox icon={TrendingUp} label="معدل التحويل" value={`${convRate}%`} color="#8B5CF6" />
        <StatBox icon={Clock} label="المواعيد" value={stats.appointments.toLocaleString()} color="#F59E0B" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-5 rounded-2xl" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={15} style={{ color: '#4F6EF7' }} />
            <h3 className="text-sm font-bold text-white font-cairo">الرسائل اليومية — آخر 7 أيام</h3>
          </div>
          {weeklyMessages.some(d => d.messages > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={weeklyMessages}>
                <defs>
                  <linearGradient id="msgGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F6EF7" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#4F6EF7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 10, fontFamily: 'Tajawal' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="messages" stroke="#4F6EF7" strokeWidth={2} fill="url(#msgGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-slate-600 font-tajawal text-sm">
              لا توجد بيانات بعد
            </div>
          )}
        </div>

        <div className="p-5 rounded-2xl" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <div className="flex items-center gap-2 mb-4">
            <Users2 size={15} style={{ color: '#10B981' }} />
            <h3 className="text-sm font-bold text-white font-cairo">العملاء الجدد — آخر 7 أيام</h3>
          </div>
          {weeklyLeads.some(d => d.leads > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyLeads}>
                <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 10, fontFamily: 'Tajawal' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="leads" fill="#10B981" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-slate-600 font-tajawal text-sm">
              لا توجد بيانات بعد
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
