import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  Building2, Zap, Users2, TrendingUp, ArrowUpRight,
  ArrowDownRight, AlertTriangle, Activity
} from 'lucide-react'
import { StatusBadge } from '../shared/StatusBadge'
import { fetchAdminStats, fetchCompanies, fetchLogs } from '../../../lib/supabase'
import { mockAdminStats, mockCompanies, mockLogs } from '../../../lib/mockData'
import type { DashboardStats, Company, Log } from '../../../types'

const revenueData = [
  { month: 'يناير', revenue: 42, leads: 180, messages: 1200 },
  { month: 'فبراير', revenue: 58, leads: 220, messages: 1800 },
  { month: 'مارس',  revenue: 51, leads: 190, messages: 1500 },
  { month: 'أبريل', revenue: 74, leads: 310, messages: 2400 },
  { month: 'مايو',  revenue: 89, leads: 420, messages: 3100 },
  { month: 'يونيو', revenue: 102, leads: 380, messages: 2800 },
  { month: 'يوليو', revenue: 118, leads: 460, messages: 3420 },
]

const serviceData = [
  { name: 'واتساب AI', value: 38, color: '#00BFFF' },
  { name: 'حجوزات',    value: 27, color: '#F59E0B' },
  { name: 'CRM',        value: 20, color: '#8B5CF6' },
  { name: 'تقارير',     value: 15, color: '#10B981' },
]

const weeklyBar = [
  { day: 'السبت',    msgs: 320 },
  { day: 'الأحد',    msgs: 480 },
  { day: 'الاثنين',  msgs: 560 },
  { day: 'الثلاثاء', msgs: 390 },
  { day: 'الأربعاء', msgs: 720 },
  { day: 'الخميس',   msgs: 640 },
  { day: 'الجمعة',   msgs: 310 },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 rounded-xl text-xs font-tajawal"
      style={{ background: '#1A1D26', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
      <p className="mb-1 opacity-60">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

const KpiCard = ({ label, value, sub, trend, accent, icon: Icon }: {
  label: string; value: string; sub?: string; trend: number; accent: string; icon: React.ElementType
}) => (
  <div className="p-5 rounded-2xl flex flex-col gap-3 relative overflow-hidden cursor-pointer transition-all"
    style={{ background: '#13161E', border: '1px solid rgba(255,255,255,0.07)' }}
    onMouseEnter={e => (e.currentTarget.style.border = `1px solid ${accent}40`)}
    onMouseLeave={e => (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)')}>
    <div className="absolute top-0 left-0 right-0 h-px"
      style={{ background: `linear-gradient(90deg, transparent, ${accent}60, transparent)` }} />
    <div className="flex items-start justify-between">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: `${accent}15`, border: `1px solid ${accent}25` }}>
        <Icon size={18} style={{ color: accent }} />
      </div>
      <div className="flex items-center gap-1 text-xs font-work px-2 py-1 rounded-full"
        style={{
          background: trend >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
          color: trend >= 0 ? '#10B981' : '#F43F5E'
        }}>
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
  const [stats, setStats]         = useState<DashboardStats>(mockAdminStats)
  const [companies, setCompanies] = useState<Company[]>(mockCompanies.slice(0, 5))
  const [logs, setLogs]           = useState<Log[]>(mockLogs)

  useEffect(() => {
    fetchAdminStats().then(d => { if (d) setStats(d) })
    fetchCompanies().then(d => { if (d.length) setCompanies(d.slice(0, 5)) })
    fetchLogs(6).then(d => { if (d.length) setLogs(d) })
  }, [])

  const dateStr = new Date().toLocaleDateString('ar-SA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-cairo">لوحة التحكم</h1>
          <p className="text-xs font-tajawal mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{dateStr}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-tajawal text-emerald-400">مباشر الآن</span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="إجمالي الشركات"  value={String(stats.total_companies)}                        sub="شركة مسجلة"      trend={12}               accent="#F59E0B" icon={Building2}  />
        <KpiCard label="أتمتة نشطة"       value={String(stats.active_automations)}                      sub="نظام يعمل الآن"  trend={8}                accent="#00BFFF" icon={Zap}        />
        <KpiCard label="عملاء محتملون"    value={String(stats.total_leads)}                             sub="في هذا الشهر"    trend={34}               accent="#8B5CF6" icon={Users2}     />
        <KpiCard label="إيراد الشهر"      value={`${(stats.revenue_month / 1000).toFixed(0)}K`}         sub="ريال سعودي"      trend={stats.growth_pct} accent="#10B981" icon={TrendingUp} />
      </div>

      {/* Main charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Area chart — revenue trend */}
        <div className="lg:col-span-2 p-5 rounded-2xl relative overflow-hidden"
          style={{ background: '#13161E', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.5), transparent)' }} />
          {/* subtle glow */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-32 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, rgba(0,191,255,0.06) 0%, transparent 70%)', filter: 'blur(20px)' }} />

          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-white font-cairo">الإيراد الشهري</h3>
              <p className="text-xs font-tajawal mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>آخر 7 أشهر — بالألف ريال</p>
            </div>
            <div className="flex gap-4 text-xs font-tajawal">
              <span className="flex items-center gap-1.5" style={{ color: '#00BFFF' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: '#00BFFF' }} />إيراد
              </span>
              <span className="flex items-center gap-1.5" style={{ color: '#F59E0B' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: '#F59E0B' }} />عملاء
              </span>
            </div>
          </div>

          <div dir="ltr" style={{ direction: 'ltr', width: '100%' }}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'Tajawal' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" name="الإيراد" stroke="#00BFFF" strokeWidth={2} fill="rgba(0,191,255,0.12)" isAnimationActive={false} dot={false} />
                <Area type="monotone" dataKey="leads"   name="العملاء" stroke="#F59E0B" strokeWidth={2} fill="rgba(245,158,11,0.1)"  isAnimationActive={false} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut chart — service distribution */}
        <div className="p-5 rounded-2xl relative overflow-hidden"
          style={{ background: '#13161E', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.5), transparent)' }} />

          <h3 className="text-sm font-bold text-white font-cairo mb-1">توزيع الخدمات</h3>
          <p className="text-xs font-tajawal mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>نسبة الاستخدام</p>

          <div dir="ltr" style={{ direction: 'ltr', width: '100%' }}>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={serviceData} cx="50%" cy="50%" innerRadius={45} outerRadius={72}
                  dataKey="value" paddingAngle={3} strokeWidth={0}>
                  {serviceData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 mt-2">
            {serviceData.map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-xs font-tajawal" style={{ color: 'rgba(255,255,255,0.6)' }}>{s.name}</span>
                </div>
                <span className="text-xs font-work font-bold" style={{ color: s.color }}>{s.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Bar chart — weekly messages */}
        <div className="lg:col-span-2 p-5 rounded-2xl relative overflow-hidden"
          style={{ background: '#13161E', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent)' }} />
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-white font-cairo">الرسائل الأسبوعية</h3>
              <p className="text-xs font-tajawal mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>آخر 7 أيام</p>
            </div>
            <span className="text-2xl font-bold font-sora" style={{ color: '#8B5CF6' }}>
              {weeklyBar.reduce((a, b) => a + b.msgs, 0).toLocaleString()}
            </span>
          </div>
          <div dir="ltr" style={{ direction: 'ltr', width: '100%' }}>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={weeklyBar} margin={{ top: 0, right: 0, left: -25, bottom: 0 }} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'Tajawal' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="msgs" name="الرسائل" fill="#8B5CF6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alert + live feed mini */}
        <div className="flex flex-col gap-4">
          <div className="flex-1 p-5 rounded-2xl relative overflow-hidden"
            style={{ background: '#13161E', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(244,63,94,0.5), transparent)' }} />
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white font-cairo">التنبيهات</h3>
              <AlertTriangle size={14} style={{ color: '#F43F5E' }} />
            </div>
            <p className="text-4xl font-bold font-sora" style={{ color: '#F43F5E' }}>
              {logs.filter(l => l.level === 'error' || l.level === 'warning').length}
            </p>
            <p className="text-xs font-tajawal mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>تنبيه يحتاج مراجعة</p>
          </div>

          <div className="flex-1 p-5 rounded-2xl relative overflow-hidden"
            style={{ background: '#13161E', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.5), transparent)' }} />
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white font-cairo">نشاط مباشر</h3>
              <Activity size={14} style={{ color: '#10B981' }} />
            </div>
            <p className="text-4xl font-bold font-sora text-white">{stats.active_automations}</p>
            <p className="text-xs font-tajawal mt-1" style={{ color: '#10B981' }}>نظام أتمتة نشط الآن</p>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Companies */}
        <div className="p-5 rounded-2xl" style={{ background: '#13161E', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white font-cairo">آخر الشركات</h3>
            <span className="text-xs font-tajawal px-2 py-1 rounded-lg"
              style={{ background: 'rgba(0,191,255,0.08)', color: '#00BFFF', border: '1px solid rgba(0,191,255,0.15)' }}>
              {stats.total_companies} شركة
            </span>
          </div>
          <div className="space-y-2">
            {companies.map((c, i) => {
              const accents = ['#F59E0B', '#00BFFF', '#8B5CF6', '#10B981', '#F43F5E']
              const accent = accents[i % 5]
              return (
                <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}30` }}>
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
              )
            })}
          </div>
        </div>

        {/* Activity feed */}
        <div className="p-5 rounded-2xl" style={{ background: '#13161E', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white font-cairo">آخر الأحداث</h3>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="space-y-2">
            {logs.map(log => {
              const color = log.level === 'error' ? '#F43F5E' : log.level === 'warning' ? '#F59E0B' : '#10B981'
              return (
                <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-xl transition-all cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}>
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
