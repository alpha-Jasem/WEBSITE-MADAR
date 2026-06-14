import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts'
import { AlertTriangle, Calendar, CalendarClock, Car, CheckCircle2, Copy, DollarSign, ExternalLink, Loader2, Plus, QrCode, TrendingDown, TrendingUp, Wrench } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { downloadCSV, formatDateForCSV } from '../../../lib/exportUtils'
import { getSelfCheckinUrl } from '../../../lib/selfCheckin'
import type { QueueStatus } from '../../../types'

type CWVisit = {
  id: string
  created_at: string
  price: number | null
  subtotal: number | null
  vat_amount: number | null
  payment_method: string | null
  is_free_wash: boolean | null
  discount_amount: number | null
  service_name: string | null
  customer_id: string
  worker_id: string | null
}

type CWWorker = {
  id: string
  name: string
  commission_type?: 'fixed' | 'percentage' | null
  commission_value?: number | null
  salary_type?: 'fixed' | 'commission' | null
  fixed_salary?: number | null
}
type CWServiceLite = { id: string; name: string; active: boolean }
type CWExpenseLite = { amount: number; expense_date: string }
type CWQueueOverviewItem = {
  id: string
  created_at: string
  started_at: string | null
  delivered_at: string | null
  customer_name: string | null
  phone: string | null
  service_name: string | null
  price: number | null
  subtotal: number | null
  total_amount: number | null
  worker_id: string | null
  status: QueueStatus
  payment_status: string | null
  notes: string | null
}

type CWCustomer = {
  id: string
  name: string | null
  phone: string
  total_visits: number
  loyalty_tier: string
}

type RevenueRange = 'daily' | 'weekly' | 'monthly' | 'yearly'
type SalesBreakdownTab = 'period' | 'services' | 'workers'

const STATUS_LABELS: Record<QueueStatus, string> = {
  received: 'استلام',
  washing: 'قيد الخدمة',
  drying: 'تجفيف',
  ready: 'جاهزة',
  delivered: 'تم التسليم',
  cancelled: 'ملغاة',
}

const formatSAR = (value: number) =>
  value > 0 ? value.toLocaleString('en-US') : '0'

const isToday = (value?: string | null) =>
  Boolean(value && value.startsWith(new Date().toISOString().slice(0, 10)))

function StatCard({ icon: Icon, label, value, sub, color, trend = 'فعلي', trendDir = 'neutral' }: { icon: typeof Car; label: string; value: string | number; sub?: string; color: string; trend?: string; trendDir?: 'up' | 'down' | 'neutral' }) {
  const badgeStyle = trendDir === 'up'
    ? { color: '#059669', background: '#DCFCE7' }
    : trendDir === 'down'
    ? { color: '#DC2626', background: '#FEE2E2' }
    : { color: '#6B7280', background: '#F3F4F6' }
  const arrow = trendDir === 'up' ? '↑ ' : trendDir === 'down' ? '↓ ' : ''
  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid #E3EAF6',
      borderRadius: 14, padding: '18px 20px',
      boxShadow: '0 10px 26px rgba(13,27,62,0.04)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: '#334155', fontFamily: 'Tajawal, sans-serif', fontWeight: 700 }}>{label}</span>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} color={color} />
        </div>
      </div>
      <strong style={{ fontSize: 28, fontWeight: 900, color: '#0D1B3E', fontFamily: 'Sora, sans-serif', display: 'block', lineHeight: 1 }}>{value}</strong>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 800, borderRadius: 999, padding: '3px 8px', fontFamily: 'Sora, sans-serif', ...badgeStyle }}>{arrow}{trend}</span>
        {sub && <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>{sub}</span>}
      </div>
    </div>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px', boxShadow: '0 4px 16px rgba(15,23,42,0.08)' }}>
      <p style={{ fontSize: 11, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ fontSize: 13, fontWeight: 700, color: p.color, fontFamily: 'Sora, sans-serif', margin: '2px 0 0' }}>
          {p.name === 'revenue' ? `${p.value} ر.س` : `${p.value} زيارة`}
        </p>
      ))}
    </div>
  )
}

function SectionCard({ title, icon: Icon, children, action }: { title: string; icon?: typeof Car; children: any; action?: any }) {
  return (
    <section style={{ background: '#FFFFFF', border: '1px solid #E3EAF6', borderRadius: 16, padding: 18, boxShadow: '0 12px 34px rgba(13,27,62,0.045)', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {Icon && <Icon size={17} color="#0B63F6" />}
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0D1B3E', fontFamily: 'Cairo, sans-serif' }}>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Sparkline({ data, color = '#0B63F6' }: { data: Array<{ date: string; visits: number; revenue: number }>; color?: string }) {
  return (
    <ResponsiveContainer width={118} height={34}>
      <LineChart data={data.slice(-8)}>
        <Line type="monotone" dataKey="visits" stroke={color} strokeWidth={2.2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function LoadingSkeleton() {
  return (
    <div dir="rtl" style={{ color: '#0D1B3E' }}>
      <style>{`
        @keyframes cw-shimmer { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
        .cw-shimmer { background:linear-gradient(90deg,#F0F4FF 25%,#E2EAF8 50%,#F0F4FF 75%); background-size:1200px 100%; animation:cw-shimmer 1.5s infinite linear; border-radius:12px; }
      `}</style>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,minmax(126px,1fr))', gap: 12, marginBottom: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="cw-shimmer" style={{ height: 110 }} />)}
      </div>
      <div className="cw-shimmer" style={{ height: 340, marginBottom: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(118px,1fr))', gap: 14 }}>
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="cw-shimmer" style={{ height: 130 }} />)}
      </div>
    </div>
  )
}

function BreakdownAreaChart({ data, emptyMsg, emptyLink }: { data: { label: string; value: number; hint?: string }[]; emptyMsg?: string; emptyLink?: string }) {
  if (!data.length) {
    return emptyLink
      ? <Link to={emptyLink} style={{ display: 'block', border: '1px dashed #D7E1F0', borderRadius: 14, padding: 14, textAlign: 'center', color: '#64748B', fontSize: 12, fontFamily: 'Tajawal,sans-serif', textDecoration: 'none' }}>{emptyMsg}</Link>
      : <span style={{ color: '#64748B', fontSize: 12, fontFamily: 'Tajawal,sans-serif' }}>{emptyMsg || 'لا توجد بيانات في الفترة.'}</span>
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="bdGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.32} />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="#EDE9FE" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 10, fontFamily: 'Tajawal' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#64748B', fontSize: 10, fontFamily: 'Sora' }} axisLine={false} tickLine={false} tickFormatter={v => v > 0 ? v.toLocaleString('en-US') : '0'} />
        <Tooltip
          formatter={(v: number) => [`${v.toLocaleString('en-US')} ر.س`, 'الإيراد']}
          contentStyle={{ fontFamily: 'Tajawal,sans-serif', fontSize: 12, borderRadius: 8, border: '1px solid #EDE9FE' }}
        />
        <Area type="monotone" dataKey="value" name="revenue" stroke="#7C3AED" strokeWidth={2.5} fill="url(#bdGrad)"
          dot={{ fill: '#7C3AED', r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6, fill: '#7C3AED', stroke: '#EDE9FE', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function CarWashOverview() {
  const { companyId, company, loading: authLoading } = useClientCompany()
  const threshold = (company as any)?.cw_loyalty_threshold || 5
  const [visits, setVisits] = useState<CWVisit[]>([])
  const [customers, setCustomers] = useState<CWCustomer[]>([])
  const [queueItems, setQueueItems] = useState<CWQueueOverviewItem[]>([])
  const [services, setServices] = useState<CWServiceLite[]>([])
  const [loading, setLoading] = useState(true)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [days, setDays] = useState(30)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [workers, setWorkers] = useState<CWWorker[]>([])
  const [expenses, setExpenses] = useState<CWExpenseLite[]>([])
  const [revenueRange, setRevenueRange] = useState<RevenueRange>('daily')
  const [salesBreakdownTab, setSalesBreakdownTab] = useState<SalesBreakdownTab>('period')
  const [qrCopied, setQrCopied] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [chartPeriod, setChartPeriod] = useState<'today' | 'yesterday' | '7days' | '30days'>('today')

  const DATE_FILTERS = [
    { label: 'اليوم', days: 1 },
    { label: '7 أيام', days: 7 },
    { label: '30 يوم', days: 30 },
    { label: '3 أشهر', days: 90 },
    { label: 'سنة', days: 365 },
  ]
  const REVENUE_RANGES: Array<{ key: RevenueRange; label: string; days: number }> = [
    { key: 'daily', label: 'يومي', days: 7 },
    { key: 'weekly', label: 'أسبوعي', days: 60 },
    { key: 'monthly', label: 'شهري', days: 365 },
    { key: 'yearly', label: 'سنوي', days: 365 },
  ]

  const isCustomActive = showCustom && customFrom && customTo

  useEffect(() => {
    if (authLoading || !companyId) return
    const load = async () => {
      setLoading(true)
      setFetchError(null)
      try {
        let since: Date, until: Date
        if (isCustomActive) {
          since = new Date(customFrom + 'T00:00:00')
          until = new Date(customTo + 'T23:59:59')
        } else {
          since = new Date()
          since.setDate(since.getDate() - days)
          until = new Date()
        }
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const expenseFrom = since.toISOString().slice(0, 10)
        const expenseTo = until.toISOString().slice(0, 10)
        const [{ data: v, error: e1 }, { data: c }, { data: w }, { data: q }, { data: s }, { data: exps }] = await Promise.all([
          supabase.from('cw_visits').select('id, created_at, price, subtotal, vat_amount, payment_method, is_free_wash, discount_amount, service_name, customer_id, worker_id')
            .eq('company_id', companyId)
            .gte('created_at', since.toISOString())
            .lte('created_at', until.toISOString())
            .order('created_at', { ascending: true }),
          supabase.from('cw_customers').select('id, name, phone, total_visits, loyalty_tier')
            .eq('company_id', companyId)
            .order('total_visits', { ascending: false })
            .limit(50),
          supabase.from('cw_workers').select('id, name, commission_type, commission_value, salary_type, fixed_salary').eq('company_id', companyId),
          supabase.from('cw_queue').select('id, created_at, started_at, delivered_at, customer_name, phone, service_name, price, subtotal, total_amount, worker_id, status, payment_status, notes')
            .eq('company_id', companyId)
            .gte('created_at', todayStart.toISOString())
            .order('created_at', { ascending: true }),
          supabase.from('cw_services').select('id, name, active').eq('company_id', companyId).order('created_at', { ascending: true }),
          supabase.from('cw_expenses').select('amount, expense_date').eq('company_id', companyId).gte('expense_date', expenseFrom).lte('expense_date', expenseTo),
        ])
        if (e1) throw new Error(e1.message)
        setVisits((v as CWVisit[]) || [])
        setCustomers((c as CWCustomer[]) || [])
        setWorkers((w as CWWorker[]) || [])
        setQueueItems((q as CWQueueOverviewItem[]) || [])
        setServices((s as CWServiceLite[]) || [])
        setExpenses((exps as CWExpenseLite[]) || [])
      } catch (err: any) {
        console.error('Overview load error:', err)
        setFetchError('تعذر تحميل البيانات. تأكد من الاتصال بالإنترنت.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [authLoading, companyId, days, isCustomActive, customFrom, customTo])

  const stats = useMemo(() => {
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const selectedDaysCount = isCustomActive && customFrom && customTo
      ? Math.max(1, Math.ceil((new Date(customTo + 'T23:59:59').getTime() - new Date(customFrom + 'T00:00:00').getTime()) / 86400000))
      : days

    const todayVisits = visits.filter(v => v.created_at.startsWith(todayStr)).length
    const todayQueueItems = queueItems.filter(item => isToday(item.created_at) || isToday(item.delivered_at))
    const activeQueue = todayQueueItems.filter(item => !['delivered', 'cancelled'].includes(item.status))
    const readyQueue = todayQueueItems.filter(item => item.status === 'ready')
    const deliveredQueue = todayQueueItems.filter(item => item.status === 'delivered' || isToday(item.delivered_at))
    const queueStatusCounts = {
      received: todayQueueItems.filter(item => item.status === 'received').length,
      service: todayQueueItems.filter(item => item.status === 'washing' || item.status === 'drying').length,
      ready: readyQueue.length,
      delivered: deliveredQueue.length,
      active: activeQueue.length,
      total: todayQueueItems.filter(item => item.status !== 'cancelled').length,
      unassigned: activeQueue.filter(item => !item.worker_id).length,
    }
    const monthVisits = visits.filter(v => v.created_at.startsWith(thisMonthStr)).length
    const revenue = visits.reduce((sum, v) => sum + (v.subtotal ?? v.price ?? 0), 0)
    const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const workersMap = Object.fromEntries(workers.map(worker => [worker.id, worker]))
    const workerCost = visits.reduce((sum, visit) => {
      const worker = visit.worker_id ? workersMap[visit.worker_id] : null
      if (!worker) return sum
      const visitRevenue = visit.subtotal ?? visit.price ?? 0
      if (worker.salary_type === 'fixed') return sum
      if (worker.commission_type === 'fixed') return sum + Number(worker.commission_value || 0)
      return sum + (visitRevenue * Number(worker.commission_value || 0)) / 100
    }, 0) + workers.reduce((sum, worker) => {
      if (worker.salary_type !== 'fixed') return sum
      return sum + (Number(worker.fixed_salary || 0) / 30) * Math.min(selectedDaysCount, 30)
    }, 0)
    const netProfit = revenue - totalExpenses - workerCost
    const netMargin = revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0
    const milestones = customers.filter(c => c.total_visits > 0 && c.total_visits % threshold === 0).length
    const freeWashCount = visits.filter(v => v.is_free_wash).length
    const freeWashDiscount = visits.filter(v => v.is_free_wash).reduce((s, v) => s + (v.discount_amount || 0), 0)

    // Payment breakdown for the selected period (not just current month)
    const paymentBreakdown: Record<string, number> = {}
    for (const v of visits) {
      const pm = v.payment_method || 'cash'
      paymentBreakdown[pm] = (paymentBreakdown[pm] || 0) + (v.subtotal ?? v.price ?? 0)
    }

    // Daily chart — up to 30 points regardless of selected range
    const chartDays = Math.min(days, 30)
    const dailyChart = Array.from({ length: chartDays }, (_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - (chartDays - 1 - i))
      const key = d.toISOString().slice(0, 10)
      const dayVisits = visits.filter(v => v.created_at.startsWith(key))
      return {
        date: d.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric' }),
        visits: dayVisits.length,
        revenue: dayVisits.reduce((s, v) => s + (v.subtotal ?? v.price ?? 0), 0),
      }
    })

    // Services breakdown
    const serviceMap: Record<string, { count: number; revenue: number }> = {}
    visits.forEach(v => {
      const s = v.service_name || 'غير محدد'
      serviceMap[s] = serviceMap[s] || { count: 0, revenue: 0 }
      serviceMap[s].count += 1
      serviceMap[s].revenue += (v.subtotal ?? v.price ?? 0)
    })
    const topServices = Object.entries(serviceMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)

    const revenueServices = Object.entries(serviceMap)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([name, data]) => ({ name, value: data.revenue, count: data.count }))

    const returningCustomers = customers.filter(c => c.total_visits > 1).length
    const retentionRate = customers.length ? Math.round((returningCustomers / customers.length) * 100) : 0
    // Fixed: use full period visits count, not just current month
    const avgInvoice = visits.length ? Math.round(revenue / visits.length) : 0

    const weekdayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']
    const heatmap = weekdayNames.map((day, dayIndex) => {
      const buckets = [9, 11, 13, 15, 17, 19, 21].map(hour => {
        const count = visits.filter(v => {
          const d = new Date(v.created_at)
          return d.getDay() === dayIndex && d.getHours() >= hour && d.getHours() < hour + 2
        }).length
        return { hour: `${String(hour).padStart(2, '0')}:00`, value: count }
      })
      return { day, buckets }
    })

    // Worker performance
    const workerStats = workers.map(w => {
      const wVisits = visits.filter(v => v.worker_id === w.id)
      const revenue = wVisits.reduce((s, v) => s + (v.subtotal ?? v.price ?? 0), 0)
      return { id: w.id, name: w.name, count: wVisits.length, revenue }
    }).filter(w => w.count > 0).sort((a, b) => b.count - a.count)

    // Trend: today vs yesterday
    const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().slice(0, 10)
    const todayRevenue = visits.filter(v => v.created_at.startsWith(todayStr)).reduce((s, v) => s + (v.subtotal ?? v.price ?? 0), 0)
    const yesterdayRevenue = visits.filter(v => v.created_at.startsWith(yesterdayStr)).reduce((s, v) => s + (v.subtotal ?? v.price ?? 0), 0)
    const yesterdayVisitsCount = visits.filter(v => v.created_at.startsWith(yesterdayStr)).length
    const todayExpenses = expenses.filter(e => e.expense_date === todayStr).reduce((s, e) => s + Number(e.amount), 0)
    const yesterdayExpenses = expenses.filter(e => e.expense_date === yesterdayStr).reduce((s, e) => s + Number(e.amount), 0)
    const todayNetProfit = todayRevenue - todayExpenses
    const yesterdayNetProfit = yesterdayRevenue - yesterdayExpenses
    const todayAvgInvoice = todayVisits > 0 ? Math.round(todayRevenue / todayVisits) : 0
    const yesterdayAvgInvoice = yesterdayVisitsCount > 0 ? Math.round(yesterdayRevenue / yesterdayVisitsCount) : 0
    const revenueTrend: 'up' | 'down' | 'neutral' = todayRevenue > 0 && yesterdayRevenue > 0 ? (todayRevenue >= yesterdayRevenue ? 'up' : 'down') : 'neutral'
    const carsTrend: 'up' | 'down' | 'neutral' = todayVisits > 0 && yesterdayVisitsCount > 0 ? (todayVisits >= yesterdayVisitsCount ? 'up' : 'down') : 'neutral'
    const profitTrend: 'up' | 'down' | 'neutral' = netProfit > 0 ? 'up' : netProfit < 0 ? 'down' : 'neutral'

    return { todayVisits, monthVisits, revenue, totalExpenses, workerCost, netProfit, netMargin, milestones, dailyChart, topServices, revenueServices, freeWashCount, freeWashDiscount, paymentBreakdown, workerStats, returningCustomers, retentionRate, avgInvoice, heatmap, queueStatusCounts, activeQueue, readyQueue, deliveredQueue, todayQueueItems, revenueTrend, carsTrend, profitTrend, todayRevenue, yesterdayRevenue, yesterdayVisitsCount, todayNetProfit, yesterdayNetProfit, todayAvgInvoice, yesterdayAvgInvoice }
  }, [visits, customers, workers, expenses, queueItems, days, isCustomActive, customFrom, customTo])

  const topCustomers = customers.slice(0, 8)

  const hourlyChartData = useMemo(() => {
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().slice(0, 10)
    const makeRevenue = (items: CWVisit[]) => items.reduce((s, v) => s + (v.subtotal ?? v.price ?? 0), 0)
    if (chartPeriod === 'today' || chartPeriod === 'yesterday') {
      const target = chartPeriod === 'today' ? todayStr : yesterdayStr
      return Array.from({ length: 12 }, (_, i) => {
        const h = i * 2
        const dayVisits = visits.filter(v => {
          if (!v.created_at.startsWith(target)) return false
          const vh = new Date(v.created_at).getHours()
          return vh === h || vh === h + 1
        })
        const label = h < 12 ? `${h || 12}:00 ص` : `${h === 12 ? 12 : h - 12}:00 م`
        return { label, revenue: makeRevenue(dayVisits), visits: dayVisits.length }
      })
    }
    const numDays = chartPeriod === '7days' ? 7 : 30
    return Array.from({ length: numDays }, (_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - (numDays - 1 - i))
      const key = d.toISOString().slice(0, 10)
      const dayVisits = visits.filter(v => v.created_at.startsWith(key))
      return {
        label: d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' }),
        revenue: makeRevenue(dayVisits),
        visits: dayVisits.length,
      }
    })
  }, [visits, chartPeriod])

  const alerts = useMemo(() => {
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    const result: Array<{ type: 'warning' | 'loyalty' | 'expense' | 'info'; title: string; desc: string; detail?: string; time: string }> = []
    queueItems
      .filter(item => (item.status === 'washing' || item.status === 'drying') && item.started_at && (now.getTime() - new Date(item.started_at).getTime()) > 30 * 60 * 1000)
      .slice(0, 2)
      .forEach(item => {
        const mins = Math.round((now.getTime() - new Date(item.started_at!).getTime()) / 60000)
        const h = new Date(item.started_at!).getHours(), m = new Date(item.started_at!).getMinutes()
        result.push({ type: 'warning', title: 'سيارة متأخرة', desc: `${item.customer_name || 'عميل'} — ${item.service_name || ''}`, detail: `متأخرة عن الوقت المتوقع بـ ${mins} دقيقة`, time: `${String(h % 12 || 12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${h < 12 ? 'ص' : 'م'}` })
      })
    const todayPhones = new Set(queueItems.filter(q => q.status !== 'cancelled').map(q => q.phone).filter(Boolean))
    customers
      .filter(c => c.total_visits > 0 && c.total_visits % threshold === 0 && c.phone && todayPhones.has(c.phone))
      .slice(0, 1)
      .forEach(c => { result.push({ type: 'loyalty', title: `عميل وصل للغسلة ${c.total_visits}`, desc: c.name || c.phone, time: '' }) })
    expenses
      .filter(e => e.expense_date === todayStr)
      .slice(0, 1)
      .forEach(e => { result.push({ type: 'expense', title: 'مصروف جديد', desc: `${Number(e.amount).toLocaleString('en-US')} ريال`, time: '' }) })
    queueItems
      .filter(item => item.status === 'ready' && item.started_at && (now.getTime() - new Date(item.started_at).getTime()) > 20 * 60 * 1000)
      .slice(0, 1)
      .forEach(item => {
        const h = new Date(item.started_at!).getHours(), m = new Date(item.started_at!).getMinutes()
        result.push({ type: 'info', title: 'سيارة جاهزة ولم يتم استلامها', desc: `${item.customer_name || 'عميل'} — ${item.service_name || ''}`, time: `${String(h % 12 || 12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${h < 12 ? 'ص' : 'م'}` })
      })
    return result
  }, [queueItems, customers, expenses, threshold])

  const exportSalesCSV = () => {
    const rows = visits.map(v => ({
      'التاريخ': formatDateForCSV(v.created_at),
      'الخدمة': v.service_name || '',
      'قبل الضريبة': (v.subtotal ?? v.price ?? 0).toFixed(2),
      'الضريبة': (v.vat_amount ?? 0).toFixed(2),
      'الإجمالي': (v.is_free_wash ? 0 : (v.subtotal ?? v.price ?? 0)).toFixed(2),
      'طريقة الدفع': v.payment_method || 'cash',
      'غسلة مجانية': v.is_free_wash ? 'نعم' : 'لا',
      'خصم الولاء': (v.discount_amount ?? 0).toFixed(2),
    }))
    downloadCSV(rows, `madar-sales-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const exportPDF = async () => {
    setPdfLoading(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const companyName = company?.name || 'المغسلة'
      const dateStr = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })

      // Header
      doc.setFillColor(8, 12, 20)
      doc.rect(0, 0, 210, 40, 'F')
      doc.setTextColor(241, 245, 249)
      doc.setFontSize(20)
      doc.text('Madar OS - ' + companyName, 105, 18, { align: 'center' })
      doc.setFontSize(11)
      doc.setTextColor(148, 163, 184)
      doc.text(`${dateStr}`, 105, 28, { align: 'center' })

      // Stats section
      doc.setTextColor(30, 30, 30)
      doc.setFontSize(14)
      doc.text('ملخص الفترة المحددة', 196, 52, { align: 'right' })

      const rows = [
        ['زيارات اليوم', String(stats.todayVisits)],
        ['زيارات هذا الشهر', String(stats.monthVisits)],
        ['الإيرادات (ر.س)', stats.revenue > 0 ? stats.revenue.toLocaleString('en-US') : '—'],
        ['مكافآت الولاء', String(stats.milestones)],
        ['إجمالي العملاء', String(customers.length)],
      ]

      let y = 60
      doc.setFontSize(11)
      for (const [label, value] of rows) {
        doc.setTextColor(100, 100, 100)
        doc.text(label, 196, y, { align: 'right' })
        doc.setTextColor(30, 30, 30)
        doc.text(value, 40, y, { align: 'right' })
        doc.setDrawColor(220, 220, 220)
        doc.line(14, y + 2, 196, y + 2)
        y += 10
      }

      // Top services
      if (stats.services.length > 0) {
        y += 6
        doc.setFontSize(14)
        doc.setTextColor(30, 30, 30)
        doc.text('أبرز الخدمات', 196, y, { align: 'right' })
        y += 8
        doc.setFontSize(11)
        for (const [name, data] of stats.services) {
          doc.setTextColor(100, 100, 100)
          doc.text(name, 196, y, { align: 'right' })
          doc.setTextColor(30, 30, 30)
          doc.text(`${data.count} سيارة`, 40, y, { align: 'right' })
          doc.setDrawColor(220, 220, 220)
          doc.line(14, y + 2, 196, y + 2)
          y += 9
        }
      }

      // Top customers
      if (topCustomers.length > 0) {
        y += 6
        doc.setFontSize(14)
        doc.setTextColor(30, 30, 30)
        doc.text('أوفى العملاء', 196, y, { align: 'right' })
        y += 8
        doc.setFontSize(10)
        for (const c of topCustomers.slice(0, 8)) {
          doc.setTextColor(100, 100, 100)
          doc.text(c.name || c.phone, 196, y, { align: 'right' })
          doc.setTextColor(30, 30, 30)
          doc.text(`${c.total_visits} زيارة`, 40, y, { align: 'right' })
          doc.setDrawColor(220, 220, 220)
          doc.line(14, y + 2, 196, y + 2)
          y += 8
          if (y > 270) break
        }
      }

      // Footer
      doc.setFontSize(9)
      doc.setTextColor(150, 150, 150)
      doc.text('صادر من نظام Madar OS', 105, 287, { align: 'center' })

      doc.save(`madar-report-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      console.error('PDF error:', err)
    }
    setPdfLoading(false)
  }


  const displayCars = stats.queueStatusCounts.total
  const statusFlow = [
    { label: 'استلام', value: stats.queueStatusCounts.received, icon: Car, color: '#0B63F6', to: '/client/queue' },
    { label: 'قيد الخدمة', value: stats.queueStatusCounts.service, icon: Wrench, color: '#0B63F6', to: '/client/queue' },
    { label: 'جاهزة', value: stats.queueStatusCounts.ready, icon: CheckCircle2, color: '#10B981', to: '/client/queue' },
    { label: 'تم التسليم', value: stats.queueStatusCounts.delivered, icon: Car, color: '#0D1B3E', to: '/client/finance?tab=closing' },
  ]
  const completionRate = displayCars ? Math.round((stats.queueStatusCounts.delivered / displayCars) * 100) : 0
  const topWorkerRevenue = stats.workerStats.slice(0, 4)
  const todayText = new Date().toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', weekday: 'long' })
  const setRevenuePeriod = (range: RevenueRange) => {
    const option = REVENUE_RANGES.find(item => item.key === range)
    setRevenueRange(range)
    if (option) {
      setDays(option.days)
      setShowCustom(false)
    }
  }
  const revenueChartData = (() => {
    const now = new Date()
    const makeRevenue = (items: CWVisit[]) => items.reduce((sum, v) => sum + (v.subtotal ?? v.price ?? 0), 0)
    if (revenueRange === 'yearly') {
      const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - (2 - i))
      return years.map(year => {
        const items = visits.filter(v => new Date(v.created_at).getFullYear() === year)
        return { date: String(year), visits: items.length, revenue: makeRevenue(items) }
      })
    }
    if (revenueRange === 'monthly') {
      return Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
        const year = d.getFullYear()
        const month = d.getMonth()
        const items = visits.filter(v => {
          const created = new Date(v.created_at)
          return created.getFullYear() === year && created.getMonth() === month
        })
        return { date: d.toLocaleDateString('ar-SA', { month: 'short' }), visits: items.length, revenue: makeRevenue(items) }
      })
    }
    if (revenueRange === 'weekly') {
      return Array.from({ length: 8 }, (_, i) => {
        const start = new Date(now)
        start.setHours(0, 0, 0, 0)
        start.setDate(start.getDate() - ((7 * (7 - i)) + 6))
        const end = new Date(start)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59, 999)
        const items = visits.filter(v => {
          const created = new Date(v.created_at)
          return created >= start && created <= end
        })
        return { date: `${start.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}`, visits: items.length, revenue: makeRevenue(items) }
      })
    }
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - (6 - i))
      const key = d.toISOString().slice(0, 10)
      const items = visits.filter(v => v.created_at.startsWith(key))
      return { date: d.toLocaleDateString('ar-SA', { weekday: 'short' }), visits: items.length, revenue: makeRevenue(items) }
    })
  })()
  const salesPeriodRows = revenueChartData
    .slice()
    .reverse()
    .slice(0, 5)
    .map(item => ({ ...item, label: item.date, value: item.revenue, hint: `${item.visits} زيارة` }))
  const maxPeriodRevenue = Math.max(1, ...salesPeriodRows.map(item => item.value))

  if (loading) return <LoadingSkeleton />
  if (fetchError) return (
    <div dir="rtl" style={{ padding: 40, textAlign: 'center', fontFamily: 'Tajawal,sans-serif' }}>
      <AlertTriangle size={36} color="#DC2626" style={{ margin: '0 auto 12px' }} />
      <p style={{ color: '#DC2626', fontWeight: 700, fontSize: 15 }}>{fetchError}</p>
      <button onClick={() => window.location.reload()} style={{ marginTop: 14, padding: '9px 22px', borderRadius: 10, border: '1px solid #FCA5A5', background: '#FFF', color: '#DC2626', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>إعادة المحاولة</button>
    </div>
  )

  const todayRevDiff = stats.todayRevenue - stats.yesterdayRevenue
  const carsDiff = stats.todayVisits - stats.yesterdayVisitsCount
  const avgDiff = stats.todayAvgInvoice - stats.yesterdayAvgInvoice
  const profitDiff = stats.todayNetProfit - stats.yesterdayNetProfit

  const STATUS_DOTS = [
    { label: 'في الانتظار', count: stats.queueStatusCounts.received, color: '#94A3B8' },
    { label: 'قيد الخدمة', count: stats.queueStatusCounts.service, color: '#0B63F6' },
    { label: 'جاهزة', count: stats.queueStatusCounts.ready, color: '#10B981' },
    { label: 'تم التسليم', count: stats.queueStatusCounts.delivered, color: '#64748B' },
  ]

  const OP_DESC: Record<string, string> = {
    received: 'تم استلام سيارة جديدة',
    washing: 'جارٍ غسيل السيارة',
    drying: 'جارٍ تجفيف السيارة',
    ready: 'سيارة جاهزة للاستلام',
    delivered: 'تم تسليم السيارة',
    cancelled: 'تم إلغاء السيارة',
  }
  const OP_COLORS: Record<string, string> = {
    received: '#94A3B8', washing: '#0B63F6', drying: '#F97316',
    ready: '#10B981', delivered: '#64748B', cancelled: '#EF4444',
  }

  const ALERT_ICONS: Record<string, { bg: string; color: string; symbol: string }> = {
    warning: { bg: '#FEE2E2', color: '#DC2626', symbol: '⚠' },
    loyalty: { bg: '#FEF3C7', color: '#D97706', symbol: '🎁' },
    expense: { bg: '#DBEAFE', color: '#2563EB', symbol: '📄' },
    info:    { bg: '#DBEAFE', color: '#2563EB', symbol: 'ℹ' },
  }

  const chartPeriodLabels = [
    { key: 'today' as const, label: 'اليوم' },
    { key: 'yesterday' as const, label: 'أمس' },
    { key: '7days' as const, label: '7 أيام' },
    { key: '30days' as const, label: '30 يوم' },
  ]

  const formatFmtDiff = (diff: number, unit = '') => {
    if (diff === 0) return null
    const sign = diff > 0 ? '+' : ''
    return `${sign}${Math.round(Math.abs(diff)).toLocaleString('en-US')} ${unit} عن أمس`
  }

  const checkinUrl = getSelfCheckinUrl(company as any)

  return (
    <div dir="rtl" style={{ color: '#0D1B3E', fontFamily: 'Tajawal, sans-serif' }}>
      <style>{`
        .ov2-kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:16px; }
        .ov2-mid-row { display:grid; grid-template-columns:270px 1fr; gap:14px; margin-bottom:14px; }
        .ov2-bot-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px; }
        .ov2-panel { background:#fff; border:1px solid #E3EAF6; border-radius:16px; padding:18px; box-shadow:0 8px 24px rgba(13,27,62,.045); }
        .ov2-ph { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
        .ov2-ph h2 { margin:0; font-size:15px; font-weight:900; color:#0D1B3E; font-family:Cairo,sans-serif; }
        .ov2-ph a { color:#0B63F6; font-size:12px; font-weight:700; text-decoration:none; font-family:Tajawal,sans-serif; }
        .ov2-period-tabs { display:flex; gap:4px; background:#F1F5FB; padding:4px; border-radius:10px; }
        .ov2-period-tabs button { border:0; padding:5px 12px; border-radius:7px; font-size:12px; font-weight:700; font-family:Tajawal,sans-serif; cursor:pointer; background:transparent; color:#64748B; }
        .ov2-period-tabs button.act { background:#fff; color:#0B63F6; box-shadow:0 2px 8px rgba(11,99,246,.12); }
        .ov2-kpi-card { background:#fff; border:1px solid #E3EAF6; border-radius:16px; padding:18px; box-shadow:0 8px 24px rgba(13,27,62,.04); }
        .ov2-kpi-card .kpi-label { font-size:12px; color:#64748B; font-family:Tajawal,sans-serif; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; }
        .ov2-kpi-card .kpi-val { font-size:28px; font-weight:900; color:#0D1B3E; font-family:Sora,sans-serif; line-height:1; }
        .ov2-kpi-card .kpi-unit { font-size:13px; color:#64748B; font-family:Tajawal,sans-serif; margin-top:4px; }
        .ov2-kpi-card .kpi-diff { font-size:11px; font-weight:700; border-radius:999px; padding:3px 9px; margin-top:10px; display:inline-block; font-family:Tajawal,sans-serif; }
        .ov2-kpi-icon { width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .ov2-dot-row { display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid #F1F5FB; }
        .ov2-dot-row:last-child { border-bottom:none; }
        .ov2-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
        .ov2-op-row { display:grid; grid-template-columns:auto 1fr auto; gap:10px; align-items:start; padding:10px 0; border-bottom:1px solid #F1F5FB; }
        .ov2-op-row:last-child { border-bottom:none; }
        .ov2-alert-row { display:grid; grid-template-columns:36px 1fr auto; gap:10px; align-items:center; padding:10px 0; border-bottom:1px solid #F1F5FB; }
        .ov2-alert-row:last-child { border-bottom:none; }
        .ov2-qr-bar { background:#fff; border:1px solid #E3EAF6; border-radius:16px; padding:16px; box-shadow:0 8px 24px rgba(13,27,62,.04); display:grid; grid-template-columns:auto 1fr; gap:18px; align-items:center; }
        @media(max-width:1100px) { .ov2-kpi-grid { grid-template-columns:repeat(2,1fr); } }
        @media(max-width:860px) { .ov2-mid-row,.ov2-bot-row { grid-template-columns:1fr; } }
        @media(max-width:480px) { .ov2-kpi-grid { grid-template-columns:1fr 1fr; } .ov2-qr-bar { grid-template-columns:1fr; } }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, fontFamily: 'Cairo,sans-serif', color: '#0D1B3E' }}>{company?.name || 'المغسلة'}</h1>
          <span style={{ fontSize: 13, color: '#64748B' }}>{todayText}</span>
        </div>
        <Link to="/client/queue" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0B63F6', color: '#fff', padding: '9px 18px', borderRadius: 12, textDecoration: 'none', fontSize: 13, fontWeight: 900 }}>
          <Plus size={15} /> إضافة سيارة
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="ov2-kpi-grid">
        {[
          { label: 'إجمالي الإيرادات', val: formatSAR(stats.todayRevenue), unit: 'ريال', diff: todayRevDiff, dunit: '', color: '#10B981', icon: <DollarSign size={17} color="#10B981" />, bg: '#DCFCE7' },
          { label: 'صافي الربح', val: Math.round(stats.todayNetProfit).toLocaleString('en-US'), unit: 'ريال', diff: profitDiff, dunit: '', color: '#0B63F6', icon: <TrendingUp size={17} color="#0B63F6" />, bg: '#DBEAFE' },
          { label: 'متوسط الفاتورة', val: String(stats.todayAvgInvoice), unit: 'ريال', diff: avgDiff, dunit: '', color: '#7C3AED', icon: <CalendarClock size={17} color="#7C3AED" />, bg: '#EDE9FE' },
          { label: 'سيارات اليوم', val: String(stats.todayVisits), unit: 'سيارة', diff: carsDiff, dunit: '', color: '#0099CC', icon: <Car size={17} color="#0099CC" />, bg: '#CFFAFE' },
        ].map(card => {
          const diffText = formatFmtDiff(card.diff, card.dunit)
          const isPos = card.diff >= 0
          return (
            <div className="ov2-kpi-card" key={card.label}>
              <div className="kpi-label">
                <span>{card.label}</span>
                <div className="ov2-kpi-icon" style={{ background: card.bg }}>{card.icon}</div>
              </div>
              <div className="kpi-val">{card.val}</div>
              <div className="kpi-unit">{card.unit}</div>
              {diffText && (
                <div className="kpi-diff" style={{ background: isPos ? '#DCFCE7' : '#FEE2E2', color: isPos ? '#059669' : '#DC2626' }}>
                  {isPos ? '↑' : '↓'} {Math.abs(card.diff) > 0 ? Math.round(Math.abs(card.diff)).toLocaleString('en-US') : '0'} عن أمس
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Middle row */}
      <div className="ov2-mid-row">
        {/* حالات السيارات */}
        <div className="ov2-panel">
          <div className="ov2-ph">
            <h2>حالات السيارات</h2>
            <Link to="/client/queue">عرض الكل ›</Link>
          </div>
          {STATUS_DOTS.map(s => (
            <div key={s.label} className="ov2-dot-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="ov2-dot" style={{ background: s.color }} />
                <span style={{ fontSize: 13, color: '#334155', fontFamily: 'Tajawal,sans-serif' }}>{s.label}</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 900, color: '#0D1B3E', fontFamily: 'Sora,sans-serif' }}>{s.count}</span>
            </div>
          ))}
        </div>

        {/* الإيرادات */}
        <div className="ov2-panel">
          <div className="ov2-ph">
            <h2>الإيرادات خلال اليوم</h2>
            <div className="ov2-period-tabs">
              {chartPeriodLabels.map(p => (
                <button key={p.key} type="button" className={chartPeriod === p.key ? 'act' : ''} onClick={() => setChartPeriod(p.key)}>{p.label}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={hourlyChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="ov2RevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0B63F6" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#0B63F6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F4FF" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'Tajawal' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} width={45} tickFormatter={v => v > 0 ? v.toLocaleString('en-US') : '0'} />
              <Tooltip
                formatter={(v: number) => [`${v.toLocaleString('en-US')} ر.س`, 'الإيراد']}
                contentStyle={{ fontFamily: 'Tajawal,sans-serif', fontSize: 12, borderRadius: 10, border: '1px solid #E3EAF6', boxShadow: '0 4px 16px rgba(0,0,0,.08)' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#0B63F6" strokeWidth={2.5} fill="url(#ov2RevGrad)"
                dot={false} activeDot={{ r: 5, fill: '#0B63F6', stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="ov2-bot-row">
        {/* آخر العمليات */}
        <div className="ov2-panel">
          <div className="ov2-ph">
            <h2>آخر العمليات</h2>
            <Link to="/client/queue">عرض الكل ›</Link>
          </div>
          {stats.todayQueueItems.length === 0 ? (
            <p style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>لا توجد عمليات اليوم</p>
          ) : (
            [...stats.todayQueueItems].reverse().slice(0, 5).map((item, i) => {
              const d = new Date(item.created_at)
              const h = d.getHours(), m = d.getMinutes()
              const timeStr = `${String(h % 12 || 12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${h < 12 ? 'ص' : 'م'}`
              const sc = OP_COLORS[item.status] || '#94A3B8'
              return (
                <div key={item.id} className="ov2-op-row" style={{ borderBottom: i < 4 ? undefined : 'none' }}>
                  <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Sora,sans-serif', paddingTop: 2, minWidth: 55 }}>{timeStr}</span>
                  <span style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: 13, color: '#0D1B3E', fontFamily: 'Tajawal,sans-serif' }}>{OP_DESC[item.status] || 'تحديث حالة'}</strong>
                    <em style={{ fontStyle: 'normal', fontSize: 11, color: '#94A3B8' }}>{item.customer_name || 'عميل'}{item.service_name ? ` — ${item.service_name}` : ''}</em>
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 800, borderRadius: 999, padding: '3px 9px', background: `${sc}18`, color: sc, fontFamily: 'Tajawal,sans-serif', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {STATUS_LABELS[item.status]}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* تنبيهات اليوم */}
        <div className="ov2-panel">
          <div className="ov2-ph">
            <h2>تنبيهات اليوم</h2>
            <Link to="/client/queue">عرض الكل ›</Link>
          </div>
          {alerts.length === 0 ? (
            <p style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>لا توجد تنبيهات اليوم</p>
          ) : (
            alerts.map((a, i) => {
              const ic = ALERT_ICONS[a.type] || ALERT_ICONS.info
              return (
                <div key={i} className="ov2-alert-row" style={{ borderBottom: i < alerts.length - 1 ? undefined : 'none' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: ic.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{ic.symbol}</div>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: 13, color: '#0D1B3E', fontFamily: 'Tajawal,sans-serif' }}>{a.title}</strong>
                    <em style={{ fontStyle: 'normal', fontSize: 11, color: '#64748B' }}>{a.desc}</em>
                    {a.detail && <em style={{ fontStyle: 'normal', fontSize: 10, color: '#94A3B8', display: 'block' }}>{a.detail}</em>}
                  </div>
                  {a.time && <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Sora,sans-serif', whiteSpace: 'nowrap', flexShrink: 0 }}>{a.time}</span>}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* QR Bar */}
      {checkinUrl && (
        <div className="ov2-qr-bar">
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(checkinUrl)}`} alt="QR" style={{ width: 90, height: 90, borderRadius: 10, border: '1px solid #E3EAF6', display: 'block' }} />
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 900, fontFamily: 'Cairo,sans-serif', color: '#0D1B3E', display: 'flex', alignItems: 'center', gap: 6 }}>
              <QrCode size={15} color="#0B63F6" /> تسجيل ذاتي للعملاء
            </h3>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748B', lineHeight: 1.7 }}>اطبع هذا الرمز وضعه عند الاستقبال — العميل يمسح ويسجل سيارته بنفسه</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => { navigator.clipboard.writeText(checkinUrl); setQrCopied(true); setTimeout(() => setQrCopied(false), 2000) }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, border: '1px solid #D7E1F0', background: qrCopied ? '#DCFCE7' : '#F8FBFF', color: qrCopied ? '#059669' : '#0D1B3E', fontSize: 12, fontFamily: 'Tajawal,sans-serif', fontWeight: 900, cursor: 'pointer' }}>
                <Copy size={12} /> {qrCopied ? 'تم النسخ ✓' : 'نسخ الرابط'}
              </button>
              <a href={checkinUrl} target="_blank" rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, border: '1px solid #D7E1F0', background: '#F8FBFF', color: '#0D1B3E', fontSize: 12, fontFamily: 'Tajawal,sans-serif', fontWeight: 900, textDecoration: 'none' }}>
                <ExternalLink size={12} /> معاينة الصفحة
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


