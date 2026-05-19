import { useEffect, useState } from 'react'
import { Building2, Zap, Users2, MessageSquare, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { MiniChart } from '../shared/MiniChart'
import { StatusBadge } from '../shared/StatusBadge'
import { fetchAdminStats, fetchCompanies, fetchLogs } from '../../../lib/supabase'
import { mockAdminStats, mockCompanies, mockLogs, mockChartData } from '../../../lib/mockData'
import type { DashboardStats, Company, Log } from '../../../types'

const KpiCard = ({
  label, value, sub, trend, accent, icon: Icon
}: {
  label: string; value: string; sub?: string; trend: number; accent: string; icon: React.ElementType
}) => (
  <div className="p-5 rounded-2xl flex flex-col gap-3 relative overflow-hidden"
    style={{ background: '#13161E', border: '1px solid rgba(255,255,255,0.07)' }}>
    <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}55, transparent)` }} />
    <div className="flex items-start justify-between">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accent}18` }}>
        <Icon size={16} style={{ color: accent }} />
      </div>
      <div className={`flex items-center gap-1 text-xs font-work px-2 py-0.5 rounded-full`}
        style={{ background: trend >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', color: trend >= 0 ? '#10B981' : '#F43F5E' }}>
        {trend >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
        {Math.abs(trend)}%
      </div>
    </div>
    <div>
      <p className="text-3xl font-bold font-sora" style={{ color: 'white' }}>{value}</p>
      {sub && <p className="text-xs font-tajawal mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{sub}</p>}
    </div>
    <p className="text-xs font-tajawal" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
  </div>
)

export const AdminOverview = () => {
  const [stats, setStats]       = useState<DashboardStats>(mockAdminStats)
  const [companies, setCompanies] = useState<Company[]>(mockCompanies.slice(0, 5))
  const [logs, setLogs]         = useState<Log[]>(mockLogs)

  useEffect(() => {
    fetchAdminStats().then(d => { if (d) setStats(d) })
    fetchCompanies().then(d => { if (d.length) setCompanies(d.slice(0, 5)) })
    fetchLogs(6).then(d => { if (d.length) setLogs(d) })
  }, [])

  const now = new Date()
  const dateStr = now.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-cairo">لوحة التحكم</h1>
          <p className="text-xs font-tajawal mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{dateStr}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-tajawal text-emerald-400">مباشر الآن</span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="إجمالي الشركات"    value={String(stats.total_companies)}   sub="شركة مسجلة"            trend={12}              accent="#F59E0B" icon={Building2}      />
        <KpiCard label="أتمتة نشطة"         value={String(stats.active_automations)} sub="نظام يعمل الآن"       trend={8}               accent="#00BFFF" icon={Zap}            />
        <KpiCard label="عملاء محتملون"      value={String(stats.total_leads)}        sub="في هذا الشهر"         trend={34}              accent="#8B5CF6" icon={Users2}         />
        <KpiCard label="إيراد الشهر"        value={`${(stats.revenue_month/1000).toFixed(0)}K`} sub="ريال سعودي" trend={stats.growth_pct} accent="#10B981" icon={TrendingUp}     />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Main line chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl relative overflow-hidden"
          style={{ background: '#13161E', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.4), transparent)' }} />
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-white font-cairo">الرسائل هذا الأسبوع</h3>
              <p className="text-xs font-tajawal mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>آخر 7 أيام</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-work px-3 py-1.5 rounded-xl"
              style={{ background: 'rgba(0,191,255,0.08)', color: '#00BFFF', border: '1px solid rgba(0,191,255,0.2)' }}>
              <TrendingUp size={11} />
              +{stats.growth_pct}%
            </div>
          </div>
          <div className="flex items-end gap-3 mb-3">
            <span className="text-4xl font-bold font-sora text-white">{stats.messages_today.toLocaleString()}</span>
            <span className="text-sm font-tajawal pb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>رسالة اليوم</span>
          </div>
          <MiniChart data={mockChartData.weeklyMessages} dataKey="messages" color="#00BFFF" height={130} />
        </div>

        {/* Side stats */}
        <div className="flex flex-col gap-4">

          {/* Leads chart */}
          <div className="flex-1 p-5 rounded-2xl relative overflow-hidden"
            style={{ background: '#13161E', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.4), transparent)' }} />
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white font-cairo">العملاء</h3>
              <span className="text-[10px] font-tajawal" style={{ color: 'rgba(255,255,255,0.3)' }}>هذا الأسبوع</span>
            </div>
            <p className="text-3xl font-bold font-sora text-white mb-3">{stats.total_leads}</p>
            <MiniChart data={mockChartData.weeklyLeads} dataKey="leads" type="bar" color="#F59E0B" height={70} />
          </div>

          {/* Alert card */}
          <div className="p-5 rounded-2xl relative overflow-hidden"
            style={{ background: '#13161E', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(244,63,94,0.4), transparent)' }} />
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white font-cairo">التنبيهات</h3>
              <AlertTriangle size={14} style={{ color: '#F43F5E' }} />
            </div>
            <p className="text-3xl font-bold font-sora" style={{ color: '#F43F5E' }}>
              {logs.filter(l => l.level === 'error' || l.level === 'warning').length}
            </p>
            <p className="text-xs font-tajawal mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>تنبيه نشط يحتاج مراجعة</p>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Companies table */}
        <div className="p-5 rounded-2xl" style={{ background: '#13161E', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-white font-cairo">آخر الشركات</h3>
            <span className="text-xs font-tajawal px-2 py-1 rounded-lg" style={{ background: 'rgba(0,191,255,0.08)', color: '#00BFFF' }}>
              {stats.total_companies} شركة
            </span>
          </div>
          <div className="space-y-3">
            {companies.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl transition-colors"
                style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: ['#F59E0B22', '#00BFFF22', '#8B5CF622', '#10B98122', '#F43F5E22'][i % 5],
                           color:      ['#F59E0B',   '#00BFFF',   '#8B5CF6',   '#10B981',   '#F43F5E'  ][i % 5] }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-tajawal truncate">{c.name}</p>
                  <p className="text-xs font-tajawal" style={{ color: 'rgba(255,255,255,0.3)' }}>{c.industry}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={c.status} />
                  <span className="text-[10px] font-work" style={{ color: 'rgba(255,255,255,0.25)' }}>{c.plan}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div className="p-5 rounded-2xl" style={{ background: '#13161E', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-white font-cairo">آخر الأحداث</h3>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="space-y-3">
            {logs.map(log => {
              const color = log.level === 'error' ? '#F43F5E' : log.level === 'warning' ? '#F59E0B' : '#10B981'
              return (
                <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 font-tajawal leading-relaxed">{log.message}</p>
                    <p className="text-[10px] mt-0.5 font-work" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      {new Date(log.created_at).toLocaleTimeString('ar-SA')}
                    </p>
                  </div>
                  <StatusBadge status={log.level} />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
