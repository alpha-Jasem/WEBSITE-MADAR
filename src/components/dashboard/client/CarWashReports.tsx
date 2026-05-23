import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { BarChart3, Car, DollarSign, Loader2, Star, TrendingUp, Users } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'

type CWVisit = {
  id: string
  created_at: string
  price: number | null
  service_name: string | null
  customer_id: string
}

type CWCustomer = {
  id: string
  name: string | null
  phone: string
  total_visits: number
  loyalty_tier: string
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: typeof Car; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16, padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>{label}</span>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} color={color} />
        </div>
      </div>
      <strong style={{ fontSize: 26, fontWeight: 800, color: '#F1F5F9', fontFamily: 'Sora, sans-serif', display: 'block', lineHeight: 1 }}>{value}</strong>
      {sub && <span style={{ fontSize: 12, color: '#475569', fontFamily: 'Tajawal, sans-serif', marginTop: 4, display: 'block' }}>{sub}</span>}
    </div>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#0D1422', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px' }}>
      <p style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ fontSize: 13, fontWeight: 700, color: p.color, fontFamily: 'Sora, sans-serif', margin: '2px 0 0' }}>
          {p.name === 'revenue' ? `${p.value} ر.س` : `${p.value} زيارة`}
        </p>
      ))}
    </div>
  )
}

export function CarWashReports() {
  const { companyId, loading: authLoading } = useClientCompany()
  const [visits, setVisits] = useState<CWVisit[]>([])
  const [customers, setCustomers] = useState<CWCustomer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading || !companyId) return
    const load = async () => {
      setLoading(true)
      const since = new Date()
      since.setDate(since.getDate() - 30)
      const [{ data: v }, { data: c }] = await Promise.all([
        supabase.from('cw_visits').select('id, created_at, price, service_name, customer_id')
          .eq('company_id', companyId)
          .gte('created_at', since.toISOString())
          .order('created_at', { ascending: true }),
        supabase.from('cw_customers').select('id, name, phone, total_visits, loyalty_tier')
          .eq('company_id', companyId)
          .order('total_visits', { ascending: false })
          .limit(50),
      ])
      setVisits((v as CWVisit[]) || [])
      setCustomers((c as CWCustomer[]) || [])
      setLoading(false)
    }
    load()
  }, [authLoading, companyId])

  const stats = useMemo(() => {
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const todayVisits = visits.filter(v => v.created_at.startsWith(todayStr)).length
    const monthVisits = visits.filter(v => v.created_at.startsWith(thisMonthStr)).length
    const revenue = visits.filter(v => v.created_at.startsWith(thisMonthStr))
      .reduce((sum, v) => sum + (v.price || 0), 0)
    const milestones = customers.filter(c => c.total_visits > 0 && c.total_visits % 5 === 0).length

    // Daily chart (last 14 days)
    const dailyChart = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - (13 - i))
      const key = d.toISOString().slice(0, 10)
      const dayVisits = visits.filter(v => v.created_at.startsWith(key))
      return {
        date: d.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric' }),
        visits: dayVisits.length,
        revenue: dayVisits.reduce((s, v) => s + (v.price || 0), 0),
      }
    })

    // Services breakdown
    const serviceMap: Record<string, number> = {}
    visits.forEach(v => {
      const s = v.service_name || 'غير محدد'
      serviceMap[s] = (serviceMap[s] || 0) + 1
    })
    const services = Object.entries(serviceMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    return { todayVisits, monthVisits, revenue, milestones, dailyChart, services }
  }, [visits, customers])

  const topCustomers = customers.slice(0, 8)

  if (authLoading || loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10 }}>
      <Loader2 size={18} className="animate-spin" color="#22D3EE" />
      <span style={{ color: '#475569', fontFamily: 'Tajawal, sans-serif', fontSize: 14 }}>جاري تحميل التقارير...</span>
    </div>
  )

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#F1F5F9', fontFamily: 'Cairo, sans-serif', margin: 0 }}>تقارير المغسلة</h1>
        <p style={{ fontSize: 13, color: '#475569', fontFamily: 'Tajawal, sans-serif', marginTop: 4 }}>آخر 30 يوم</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard icon={Car} label="زيارات اليوم" value={stats.todayVisits} color="#22D3EE" />
        <StatCard icon={TrendingUp} label="زيارات هذا الشهر" value={stats.monthVisits} color="#4F6EF7" />
        <StatCard icon={DollarSign} label="إيرادات الشهر" value={stats.revenue > 0 ? `${stats.revenue.toLocaleString()} ر.س` : '—'} sub="من الزيارات المُسعَّرة" color="#10B981" />
        <StatCard icon={Star} label="مكافآت ولاء" value={stats.milestones} sub="وصلوا الزيارة الخامسة" color="#F59E0B" />
        <StatCard icon={Users} label="إجمالي العملاء" value={customers.length} sub="مسجلون في النظام" color="#8B5CF6" />
      </div>

      {/* Daily visits chart */}
      <div style={{
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 18, padding: '20px 22px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <BarChart3 size={16} color="#22D3EE" />
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Cairo, sans-serif', margin: 0 }}>
            الزيارات اليومية — آخر 14 يوم
          </h2>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={stats.dailyChart}>
            <defs>
              <linearGradient id="cwVisitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10, fontFamily: 'Tajawal' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="visits" name="visits" stroke="#22D3EE" strokeWidth={2} fill="url(#cwVisitGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>

        {/* Revenue chart */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 18, padding: '20px 22px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <DollarSign size={15} color="#10B981" />
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Cairo, sans-serif', margin: 0 }}>الإيرادات اليومية</h2>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={stats.dailyChart.slice(-7)}>
              <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="revenue" name="revenue" fill="#10B981" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top customers */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 18, overflow: 'hidden',
        }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={15} color="#8B5CF6" />
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Cairo, sans-serif', margin: 0 }}>أكثر العملاء زيارة</h2>
          </div>
          {topCustomers.length === 0 ? (
            <div style={{ padding: '28px 20px', textAlign: 'center', color: '#475569', fontFamily: 'Tajawal, sans-serif', fontSize: 13 }}>
              لا يوجد بيانات بعد
            </div>
          ) : topCustomers.map((c, i) => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px',
              borderBottom: i < topCustomers.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#475569', fontFamily: 'Sora, sans-serif', width: 20, textAlign: 'center' }}>
                {i + 1}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0', fontFamily: 'Tajawal, sans-serif' }}>
                  {c.name || '—'}
                </div>
                <div style={{ fontSize: 11, color: '#475569', fontFamily: 'Sora, sans-serif', direction: 'ltr', display: 'inline-block' }}>
                  {c.phone}
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <strong style={{ fontSize: 16, fontWeight: 800, color: '#22D3EE', fontFamily: 'Sora, sans-serif' }}>
                  {c.total_visits}
                </strong>
                <div style={{ fontSize: 10, color: '#475569', fontFamily: 'Tajawal, sans-serif' }}>زيارة</div>
              </div>
            </div>
          ))}
        </div>

        {/* Services breakdown */}
        {stats.services.length > 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 18, overflow: 'hidden',
          }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Car size={15} color="#4F6EF7" />
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Cairo, sans-serif', margin: 0 }}>أكثر الخدمات طلباً</h2>
            </div>
            {stats.services.map(([name, count], i) => {
              const max = stats.services[0][1]
              return (
                <div key={name} style={{ padding: '12px 20px', borderBottom: i < stats.services.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: '#E2E8F0', fontFamily: 'Tajawal, sans-serif' }}>{name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#4F6EF7', fontFamily: 'Sora, sans-serif' }}>{count}</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${(count / max) * 100}%`, background: '#4F6EF7', borderRadius: 2 }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
