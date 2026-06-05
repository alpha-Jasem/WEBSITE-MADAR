import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { Activity, AlertTriangle, Calendar, CalendarClock, Car, CheckCircle2, DollarSign, Download, FileText, Loader2, Plus, Sparkles, Star, TrendingUp, Users, Wrench } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { downloadCSV, formatDateForCSV } from '../../../lib/exportUtils'
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

type CWWorker = { id: string; name: string }
type CWServiceLite = { id: string; name: string; active: boolean }
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

const STATUS_LABELS: Record<QueueStatus, string> = {
  received: 'استلام',
  washing: 'قيد الخدمة',
  drying: 'تجفيف',
  ready: 'جاهزة',
  delivered: 'تم التسليم',
  cancelled: 'ملغاة',
}

const formatSAR = (value: number) =>
  value > 0 ? value.toLocaleString('ar-SA') : '0'

const isToday = (value?: string | null) =>
  Boolean(value && value.startsWith(new Date().toISOString().slice(0, 10)))

function StatCard({ icon: Icon, label, value, sub, color, trend = 'فعلي' }: { icon: typeof Car; label: string; value: string | number; sub?: string; color: string; trend?: string }) {
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
        <span style={{ fontSize: 11, fontWeight: 800, color: '#059669', background: '#DCFCE7', borderRadius: 999, padding: '3px 8px', fontFamily: 'Sora, sans-serif' }}>{trend}</span>
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

  const DATE_FILTERS = [
    { label: 'اليوم', days: 1 },
    { label: '7 أيام', days: 7 },
    { label: '30 يوم', days: 30 },
    { label: '3 أشهر', days: 90 },
    { label: 'سنة', days: 365 },
  ]

  const isCustomActive = showCustom && customFrom && customTo

  useEffect(() => {
    if (authLoading || !companyId) return
    const load = async () => {
      setLoading(true)
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
      const [{ data: v }, { data: c }, { data: w }, { data: q }, { data: s }] = await Promise.all([
        supabase.from('cw_visits').select('id, created_at, price, subtotal, vat_amount, payment_method, is_free_wash, discount_amount, service_name, customer_id, worker_id')
          .eq('company_id', companyId)
          .gte('created_at', since.toISOString())
          .lte('created_at', until.toISOString())
          .order('created_at', { ascending: true }),
        supabase.from('cw_customers').select('id, name, phone, total_visits, loyalty_tier')
          .eq('company_id', companyId)
          .order('total_visits', { ascending: false })
          .limit(50),
        supabase.from('cw_workers').select('id, name').eq('company_id', companyId),
        supabase.from('cw_queue').select('id, created_at, started_at, delivered_at, customer_name, phone, service_name, price, subtotal, total_amount, worker_id, status, payment_status, notes')
          .eq('company_id', companyId)
          .gte('created_at', todayStart.toISOString())
          .order('created_at', { ascending: true }),
        supabase.from('cw_services').select('id, name, active').eq('company_id', companyId).order('created_at', { ascending: true }),
      ])
      setVisits((v as CWVisit[]) || [])
      setCustomers((c as CWCustomer[]) || [])
      setWorkers((w as CWWorker[]) || [])
      setQueueItems((q as CWQueueOverviewItem[]) || [])
      setServices((s as CWServiceLite[]) || [])
      setLoading(false)
    }
    load()
  }, [authLoading, companyId, days, isCustomActive, customFrom, customTo])

  const stats = useMemo(() => {
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

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
    const milestones = customers.filter(c => c.total_visits > 0 && c.total_visits % threshold === 0).length
    const freeWashCount = visits.filter(v => v.is_free_wash).length
    const freeWashDiscount = visits.filter(v => v.is_free_wash).reduce((s, v) => s + (v.discount_amount || 0), 0)

    // Payment breakdown for month
    const paymentBreakdown: Record<string, number> = {}
    for (const v of visits.filter(v => v.created_at.startsWith(thisMonthStr))) {
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
    const services = Object.entries(serviceMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)

    const revenueServices = Object.entries(serviceMap)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([name, data]) => ({ name, value: data.revenue, count: data.count }))

    const returningCustomers = customers.filter(c => c.total_visits > 1).length
    const retentionRate = customers.length ? Math.round((returningCustomers / customers.length) * 100) : 0
    const avgInvoice = monthVisits ? Math.round(revenue / monthVisits) : 0

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

    return { todayVisits, monthVisits, revenue, milestones, dailyChart, services, revenueServices, freeWashCount, freeWashDiscount, paymentBreakdown, workerStats, returningCustomers, retentionRate, avgInvoice, heatmap, queueStatusCounts, activeQueue, readyQueue, deliveredQueue, todayQueueItems }
  }, [visits, customers, workers, queueItems, days])

  const topCustomers = customers.slice(0, 8)

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
        ['الإيرادات (ر.س)', stats.revenue > 0 ? stats.revenue.toLocaleString('ar-SA') : '—'],
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

  if (authLoading || loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10 }}>
      <Loader2 size={18} className="animate-spin" color="#22D3EE" />
      <span style={{ color: '#475569', fontFamily: 'Tajawal, sans-serif', fontSize: 14 }}>جاري تحميل التقارير...</span>
    </div>
  )

  const serviceColors = ['#0B63F6', '#10B981', '#7C3AED', '#F59E0B', '#38BDF8']
  const activeServices = services.filter(service => service.active).length
  const displayCars = stats.queueStatusCounts.total
  const statusFlow = [
    { label: 'استلام', value: stats.queueStatusCounts.received, icon: Car, color: '#0B63F6', to: '/client/queue' },
    { label: 'قيد الخدمة', value: stats.queueStatusCounts.service, icon: Wrench, color: '#0B63F6', to: '/client/queue' },
    { label: 'جاهزة', value: stats.queueStatusCounts.ready, icon: CheckCircle2, color: '#10B981', to: '/client/queue' },
    { label: 'تم التسليم', value: stats.queueStatusCounts.delivered, icon: Car, color: '#0D1B3E', to: '/client/finance?tab=closing' },
  ]
  const completionRate = displayCars ? Math.round((stats.queueStatusCounts.delivered / displayCars) * 100) : 0
  const aiCards = [
    { icon: TrendingUp, title: 'قرار اليوم', desc: stats.queueStatusCounts.ready > 0 ? `يوجد ${stats.queueStatusCounts.ready} سيارة جاهزة. الأولوية الآن للتسليم والتحصيل.` : 'لا توجد سيارات جاهزة الآن. ركز على إدخال السيارات الجديدة بسرعة.', color: '#0B63F6', to: '/client/queue' },
    { icon: Users, title: `${customers.length} عميل محفوظ`, desc: stats.returningCustomers > 0 ? `${stats.returningCustomers} عميل عائد يمكن متابعته من صفحة العملاء.` : 'ابدأ بتجميع العملاء من QR ولوحة التشغيل.', color: '#6D5DFB', to: '/client/leads' },
    { icon: Star, title: `${stats.freeWashCount} غسلات مجانية`, desc: 'راجع مكافآت الولاء قبل إغلاق اليوم حتى تكون الإيرادات واضحة.', color: '#F59E0B', to: '/client/finance?tab=closing' },
    { icon: Plus, title: activeServices ? `${activeServices} خدمات فعالة` : 'الخدمات غير جاهزة', desc: activeServices ? 'الخدمات مفعلة ويمكن تعديل الأسعار من الإعدادات.' : 'أضف خدمات وأسعار واقعية قبل البيع الفعلي.', color: '#10B981', to: '/client/settings' },
  ]
  const notifications = [
    stats.queueStatusCounts.ready > 0 ? { title: `${stats.queueStatusCounts.ready} سيارات جاهزة للتسليم`, desc: 'افتح لوحة التشغيل وأكمل التسليم والتحصيل', time: 'الآن', icon: Car, color: '#10B981', to: '/client/queue' } : null,
    stats.queueStatusCounts.unassigned > 0 ? { title: `${stats.queueStatusCounts.unassigned} سيارات بدون موظف`, desc: 'عيّن الموظف حتى يظهر أداء العاملين بدقة', time: 'اليوم', icon: Users, color: '#7C3AED', to: '/client/queue' } : null,
    !company?.google_maps_url ? { title: 'رابط تقييم Google غير مضاف', desc: 'أضفه من الإعدادات حتى تعمل طلبات التقييم', time: 'إعداد ناقص', icon: AlertTriangle, color: '#F97316', to: '/client/settings' } : null,
    activeServices === 0 ? { title: 'لا توجد خدمات مفعلة', desc: 'أضف الخدمات والأسعار قبل تشغيل QR', time: 'إعداد ناقص', icon: Wrench, color: '#F97316', to: '/client/settings' } : null,
  ].filter(Boolean) as Array<{ title: string; desc: string; time: string; icon: typeof Car; color: string; to: string }>
  const actionableNotifications = notifications.length ? notifications : [
    { title: 'لا توجد تنبيهات حرجة', desc: 'التشغيل مستقر حالياً حسب بيانات اليوم', time: 'الآن', icon: CheckCircle2, color: '#10B981', to: '/client/queue' },
  ]
  const upcoming = stats.activeQueue.slice(0, 4)
  const paymentRows = Object.entries(stats.paymentBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
  const paymentPie = paymentRows.length
    ? paymentRows.map(([name, value]) => ({ name, value }))
    : [{ name: 'لا توجد مدفوعات', value: 1 }]
  const expectedActiveRevenue = stats.activeQueue.reduce((sum, item) => sum + (item.total_amount || item.subtotal || item.price || stats.avgInvoice || 0), 0)
  const todayText = new Date().toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', weekday: 'long' })

  return (<div dir="rtl" style={{ color: '#0D1B3E' }}>
      <style>{`
        .cw-board { direction:ltr; display:grid; grid-template-columns:minmax(0, 1fr) minmax(285px, 320px); grid-template-areas:"main rail" "main ai"; gap:16px; align-items:start; }
        .cw-main,.cw-rail { direction:rtl; display:grid; gap:14px; min-width:0; }
        .cw-main { grid-area:main; }
        .cw-rail-primary { grid-area:rail; }
        .cw-rail-ai { grid-area:ai; }
        .cw-card { background:rgba(255,255,255,.94); border:1px solid #E3EAF6; border-radius:16px; box-shadow:0 16px 42px rgba(13,27,62,.055); }
        .cw-card-pad { padding:16px; }
        .cw-heading { display:flex; justify-content:space-between; gap:16px; align-items:start; flex-wrap:wrap; padding:4px 2px 0; }
        .cw-stat-grid { display:grid; grid-template-columns:repeat(5,minmax(126px,1fr)); gap:12px; }
        .cw-title { margin:0; color:#0D1B3E; font-family:Cairo,sans-serif; font-weight:950; }
        .cw-muted { color:#64748B; font-family:Tajawal,sans-serif; }
        .cw-link { text-decoration:none; color:inherit; }
        .cw-clickable { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
        .cw-clickable:hover { transform: translateY(-2px); box-shadow:0 18px 46px rgba(13,27,62,.08); border-color:#BFD3F1; }
        .cw-command-bar { display:flex; justify-content:space-between; gap:12px; align-items:center; margin-bottom:16px; padding:10px; background:rgba(255,255,255,.86); border:1px solid #DDE8F7; border-radius:16px; box-shadow:0 14px 34px rgba(13,27,62,.055); backdrop-filter:blur(14px); }
        .cw-command-group { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .cw-main-action { height:40px; border-radius:12px; padding:0 15px; display:inline-flex; align-items:center; justify-content:center; gap:8px; background:#0B63F6; color:#fff; font-size:12px; font-weight:950; font-family:Cairo,sans-serif; box-shadow:0 14px 28px rgba(11,99,246,.18); text-decoration:none; }
        .cw-secondary-action { height:40px; border-radius:12px; padding:0 13px; display:inline-flex; align-items:center; justify-content:center; gap:8px; background:#F8FBFF; color:#0D1B3E; border:1px solid #D7E1F0; font-size:12px; font-weight:900; font-family:Tajawal,sans-serif; text-decoration:none; }
        .cw-soft-button { height:36px; border-radius:11px; border:1px solid #D7E1F0; background:#fff; padding:0 11px; display:inline-flex; align-items:center; gap:7px; color:#0D1B3E; font-weight:900; font-size:11px; font-family:Tajawal,sans-serif; cursor:pointer; }
        .cw-soft-select { height:36px; border-radius:11px; border:1px solid #D7E1F0; background:#fff; padding:0 10px; color:#0D1B3E; font-weight:900; font-size:11px; font-family:Tajawal,sans-serif; }
        .cw-insight-grid { display:grid; grid-template-columns:minmax(290px, 1.1fr) minmax(220px, .8fr) minmax(190px, .65fr); gap:14px; }
        .cw-flow-grid { display:grid; grid-template-columns:repeat(4,minmax(118px,1fr)); gap:14px; align-items:center; }
        .cw-revenue-chart { min-width:0; }
        .cw-stage-arrow { position:absolute; left:-15px; top:50%; color:#0D1B3E; font-size:22px; transform:translateY(-50%); }
        @media (max-width: 1500px) { .cw-stat-grid { grid-template-columns:repeat(3,minmax(150px,1fr)); } .cw-insight-grid { grid-template-columns:minmax(280px,1.1fr) minmax(210px,.75fr); } .cw-insight-grid section:last-child { grid-column:1 / -1; } }
        @media (max-width: 1280px) { .cw-board { grid-template-columns:1fr; grid-template-areas:"main" "rail" "ai"; } .cw-rail-primary,.cw-rail-ai { grid-template-columns:repeat(2,minmax(0,1fr)); } }
        @media (max-width: 920px) { .cw-insight-grid { grid-template-columns:1fr; } .cw-insight-grid section:last-child { grid-column:auto; } .cw-flow-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .cw-stage-arrow { display:none; } .cw-rail-primary,.cw-rail-ai { grid-template-columns:1fr; } }
        @media (max-width: 700px) { .cw-stat-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
        @media (max-width: 640px) { .cw-card-pad { padding:14px; } .cw-board,.cw-main,.cw-rail { gap:12px; } .cw-heading { padding:0; } .cw-command-bar { display:grid; grid-template-columns:1fr; gap:8px; align-items:stretch; padding:10px; } .cw-command-group { width:100%; display:grid; gap:8px; flex-wrap:nowrap; } .cw-command-primary { grid-template-columns:repeat(3,minmax(0,1fr)); } .cw-command-tools { grid-template-columns:minmax(118px,1.15fr) minmax(82px,.85fr) minmax(58px,.55fr) minmax(58px,.55fr); } .cw-main-action,.cw-secondary-action,.cw-soft-button,.cw-soft-select { width:100%; min-width:0; } .cw-main-action,.cw-secondary-action { height:38px; padding:0 8px; white-space:nowrap; font-size:11px; } .cw-soft-button,.cw-soft-select { height:34px; padding:0 7px; white-space:nowrap; font-size:10px; justify-content:center; } .cw-revenue-chart .recharts-xAxis .recharts-cartesian-axis-tick:nth-child(even) { display:none; } }
        @media (max-width: 420px) { .cw-stat-grid,.cw-flow-grid,.cw-command-primary { grid-template-columns:1fr; } .cw-command-tools { grid-template-columns:1fr 1fr; } }
      `}</style>

      <section className="cw-command-bar">
        <div className="cw-command-group cw-command-primary">
          <Link to="/client/queue" className="cw-main-action">
            <Plus size={15} /> إضافة سيارة
          </Link>
          <Link to="/client/queue" className="cw-secondary-action">
            <Car size={15} /> لوحة التشغيل
          </Link>
          <Link to="/client/reports" className="cw-secondary-action">
            <TrendingUp size={15} /> التقارير
          </Link>
        </div>

        <div className="cw-command-group cw-command-tools" style={{ justifyContent: 'flex-end' }}>
          <button onClick={() => setShowCustom(v => !v)} className="cw-soft-button">
            <Calendar size={15} color="#0B63F6" /> {isCustomActive ? `${customFrom} - ${customTo}` : 'اليوم'}
          </button>
          <select value={days} onChange={e => { setDays(Number(e.target.value)); setShowCustom(false) }} className="cw-soft-select">
            {DATE_FILTERS.map(f => <option key={f.days} value={f.days}>{f.label}</option>)}
          </select>
          <button onClick={exportPDF} disabled={pdfLoading} className="cw-soft-button" title="تصدير PDF">
            {pdfLoading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} PDF
          </button>
          <button onClick={exportSalesCSV} className="cw-soft-button" title="تصدير CSV">
            <FileText size={15} color="#0D1B3E" /> CSV
          </button>
        </div>
      </section>

      {showCustom && (
        <div className="cw-card cw-card-pad" style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid #D7E1F0', background: '#F8FBFF', color: '#0D1B3E', fontSize: 12, fontFamily: 'Sora,sans-serif' }} />
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid #D7E1F0', background: '#F8FBFF', color: '#0D1B3E', fontSize: 12, fontFamily: 'Sora,sans-serif' }} />
        </div>
      )}

      <div className="cw-board">
        <aside className="cw-rail cw-rail-primary">
          <div className="cw-card cw-card-pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 className="cw-title" style={{ fontSize: 15 }}>التنبيهات العملية</h3>
              <Link to="/client/queue" style={{ border: 'none', background: 'transparent', color: '#0B63F6', fontWeight: 900, fontSize: 12, fontFamily: 'Tajawal,sans-serif', textDecoration: 'none' }}>لوحة التشغيل</Link>
            </div>
            {actionableNotifications.map((n, i) => {
              const Icon = n.icon
              return (
                <Link to={n.to} className="cw-link cw-clickable" key={n.title} style={{ display: 'grid', gridTemplateColumns: '34px 1fr auto', gap: 10, alignItems: 'center', padding: '11px 8px', borderRadius: 12, borderBottom: i < actionableNotifications.length - 1 ? '1px solid #EEF3FA' : 'none' }}>
                  <span style={{ width: 34, height: 34, borderRadius: 12, background: `${n.color}14`, display: 'grid', placeItems: 'center' }}><Icon size={16} color={n.color} /></span>
                  <span><strong style={{ display: 'block', color: '#0D1B3E', fontSize: 12, fontFamily: 'Tajawal,sans-serif' }}>{n.title}</strong><em className="cw-muted" style={{ display: 'block', fontSize: 11, fontStyle: 'normal' }}>{n.desc}</em></span>
                  <small className="cw-muted" style={{ fontSize: 10 }}>{n.time}</small>
                </Link>
              )
            })}
          </div>

          <div className="cw-card cw-card-pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 className="cw-title" style={{ fontSize: 15 }}>السيارات النشطة الآن</h3>
              <Link to="/client/queue" style={{ border: 'none', background: 'transparent', color: '#0B63F6', fontWeight: 900, fontSize: 12, fontFamily: 'Tajawal,sans-serif', textDecoration: 'none' }}>عرض الكل</Link>
            </div>
            {upcoming.length ? upcoming.map((item, i) => (
              <Link to="/client/queue" className="cw-link cw-clickable" key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', padding: '11px 8px', borderRadius: 12, borderBottom: i < upcoming.length - 1 ? '1px solid #EEF3FA' : 'none' }}>
                <span>
                  <strong style={{ color: '#0D1B3E', fontSize: 12, fontFamily: 'Tajawal,sans-serif' }}>{item.service_name || 'خدمة غير محددة'}</strong>
                  <em className="cw-muted" style={{ display: 'block', fontSize: 11, fontStyle: 'normal' }}>{item.customer_name || item.phone || 'عميل بدون اسم'}</em>
                </span>
                <span style={{ textAlign: 'left' }}>
                  <strong style={{ display: 'block', color: '#0D1B3E', fontSize: 13, fontFamily: 'Sora,sans-serif' }}>{formatSAR(item.total_amount || item.subtotal || item.price || 0)}</strong>
                  <em style={{ fontStyle: 'normal', fontSize: 10, color: item.status === 'ready' ? '#10B981' : '#0B63F6', background: item.status === 'ready' ? '#DCFCE7' : '#DBEAFE', borderRadius: 999, padding: '2px 7px', fontFamily: 'Tajawal,sans-serif' }}>{STATUS_LABELS[item.status]}</em>
                </span>
              </Link>
            )) : (
              <Link to="/client/queue" className="cw-link" style={{ display: 'block', border: '1px dashed #D7E1F0', borderRadius: 14, padding: 14, textAlign: 'center', color: '#64748B', fontSize: 12, fontFamily: 'Tajawal,sans-serif' }}>
                لا توجد سيارات نشطة الآن. افتح لوحة التشغيل لإضافة أول سيارة.
              </Link>
            )}
          </div>
        </aside>

        <main className="cw-main">
          <div className="cw-heading">
            <div><span className="cw-muted" style={{ fontSize: 13, fontWeight: 800 }}>مرحباً بك، {company?.owner_name || 'مدير المغسلة'}</span><h1 className="cw-title" style={{ fontSize: 'clamp(26px, 3vw, 34px)' }}>مركز تشغيل اليوم</h1></div>
            <div style={{ textAlign: 'left' }}><strong style={{ color: '#0D1B3E', fontFamily: 'Cairo,sans-serif' }}>{todayText}</strong><span className="cw-muted" style={{ display: 'block', fontSize: 12 }}>{company?.name || 'المغسلة'}</span></div>
          </div>

          <div className="cw-stat-grid">
            <StatCard icon={DollarSign} label="إجمالي الإيرادات" value={formatSAR(stats.revenue)} sub="ر.س في الفترة" color="#10B981" trend="فعلي" />
            <StatCard icon={Car} label="سيارات اليوم" value={displayCars} sub={`${stats.queueStatusCounts.active} نشطة الآن`} color="#0B63F6" trend="اليوم" />
            <StatCard icon={CalendarClock} label="متوسط الفاتورة" value={stats.avgInvoice || 0} sub="ر.س" color="#7C3AED" trend="محسوب" />
            <StatCard icon={Users} label="العملاء المسجلون" value={customers.length} sub={`${stats.returningCustomers} عائدون`} color="#F97316" trend="CRM" />
            <StatCard icon={Star} label="مكافآت الولاء" value={Math.max(stats.milestones, 0)} sub={`هدف ${threshold} زيارات`} color="#38BDF8" trend="ولاء" />
          </div>

          <div className="cw-card cw-card-pad">
            <h2 className="cw-title" style={{ fontSize: 18, marginBottom: 18 }}>حالة السيارات اليوم</h2>
            <div className="cw-flow-grid">
              {statusFlow.map((step, i) => {
                const Icon = step.icon
                return (
                  <Link to={step.to} className="cw-link cw-clickable" key={step.label} style={{ border: `1.5px solid ${step.color}`, borderRadius: 14, minHeight: 130, display: 'grid', placeItems: 'center', textAlign: 'center', position: 'relative', background: step.label === 'جاهزة' ? '#F0FDF4' : '#FFFFFF' }}>
                    <Icon size={28} color={step.color} />
                    <strong style={{ color: step.color, fontSize: 14, fontWeight: 950, fontFamily: 'Cairo,sans-serif' }}>{step.label}</strong>
                    <span style={{ color: '#0D1B3E', fontSize: 25, fontWeight: 950, fontFamily: 'Sora,sans-serif' }}>{step.value}</span>
                    <em className="cw-muted" style={{ fontSize: 12, fontStyle: 'normal' }}>سيارة</em>
                    {i < statusFlow.length - 1 && <span className="cw-stage-arrow">←</span>}
                  </Link>
                )
              })}
            </div>
            <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
              <div style={{ height: 6, borderRadius: 999, background: '#DDE8F7', position: 'relative', overflow: 'hidden' }}><span style={{ position: 'absolute', inset: `0 0 0 ${100 - completionRate}%`, borderRadius: 999, background: '#0B63F6' }} /></div>
              <strong style={{ color: completionRate >= 70 ? '#10B981' : '#0B63F6', fontFamily: 'Sora,sans-serif' }}>{completionRate}% مكتمل</strong>
            </div>
          </div>

          <div className="cw-insight-grid">
            <SectionCard title="أداء الإيرادات" icon={TrendingUp}>
              <div className="cw-revenue-chart">
                <ResponsiveContainer width="100%" height={190}>
                  <AreaChart data={stats.dailyChart}>
                    <defs><linearGradient id="reportRevenueGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0B63F6" stopOpacity={0.30} /><stop offset="100%" stopColor="#0B63F6" stopOpacity={0.03} /></linearGradient></defs>
                    <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 10, fontFamily: 'Tajawal' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="revenue" name="revenue" stroke="#0B63F6" strokeWidth={3} fill="url(#reportRevenueGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="أفضل الخدمات اليوم" icon={Car}>
              {stats.services.length ? stats.services.slice(0, 4).map(([name, data], i) => (
                <div key={`${name}-${i}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, padding: '9px 0', borderBottom: i < 3 ? '1px solid #EEF3FA' : 'none' }}>
                  <span><strong style={{ display: 'block', color: '#0D1B3E', fontSize: 12, fontFamily: 'Tajawal,sans-serif' }}>{name}</strong><em className="cw-muted" style={{ fontStyle: 'normal', fontSize: 11 }}>{(data as any).count || 0} سيارة</em></span>
                  <strong style={{ color: '#0D1B3E', fontSize: 13, fontFamily: 'Sora,sans-serif' }}>{((data as any).revenue || 0).toLocaleString('ar-SA')}</strong>
                </div>
              )) : (
                <Link to="/client/settings" className="cw-link" style={{ display: 'block', border: '1px dashed #D7E1F0', borderRadius: 14, padding: 14, textAlign: 'center', color: '#64748B', fontSize: 12, fontFamily: 'Tajawal,sans-serif' }}>
                  لا توجد خدمات منفذة في الفترة. راجع إعدادات الخدمات أو أضف سيارة من لوحة التشغيل.
                </Link>
              )}
            </SectionCard>

            <SectionCard title="توزيع طرق الدفع" icon={Activity}>
              <ResponsiveContainer width="100%" height={138}>
                <PieChart><Pie data={paymentPie} innerRadius={38} outerRadius={58} dataKey="value">{paymentPie.map((_, i) => <Cell key={i} fill={serviceColors[i % serviceColors.length]} />)}</Pie></PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'grid', gap: 6 }}>
                {paymentRows.length ? paymentRows.map(([name, value], i) => <span key={name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'Tajawal,sans-serif', color: '#64748B' }}><em style={{ fontStyle: 'normal' }}>{name}</em><b style={{ color: '#0D1B3E' }}>{formatSAR(value)} ر.س</b></span>) : <span className="cw-muted" style={{ fontSize: 12, fontFamily: 'Tajawal,sans-serif' }}>لا توجد مدفوعات في الفترة.</span>}
              </div>
            </SectionCard>
          </div>
        </main>

        <aside className="cw-rail cw-rail-ai">
          <div className="cw-card cw-card-pad">
            <h3 className="cw-title" style={{ fontSize: 17, marginBottom: 14 }}><Sparkles size={18} color="#0B63F6" /> مساعد الذكاء الاصطناعي</h3>
            <Link to={aiCards[0].to} className="cw-link cw-clickable" style={{ width: '100%', minHeight: 40, border: 'none', borderRadius: 10, background: '#F3F7FF', color: '#0B63F6', fontWeight: 950, fontFamily: 'Tajawal,sans-serif', marginBottom: 12, display: 'grid', placeItems: 'center', textAlign: 'center', padding: '10px 12px' }}>{aiCards[0].title}</Link>
            {aiCards.slice(1).map(card => {
              const Icon = card.icon
              return (
                <Link to={card.to} className="cw-link cw-clickable" key={card.title} style={{ display: 'grid', gridTemplateColumns: '38px 1fr', gap: 10, alignItems: 'center', border: '1px solid #EEF3FA', borderRadius: 12, padding: 12, marginBottom: 10 }}>
                  <span style={{ width: 38, height: 38, borderRadius: 12, background: `${card.color}12`, display: 'grid', placeItems: 'center' }}><Icon size={18} color={card.color} /></span>
                  <span><strong style={{ display: 'block', color: '#0D1B3E', fontSize: 12, fontFamily: 'Tajawal,sans-serif' }}>{card.title}</strong><em className="cw-muted" style={{ display: 'block', fontSize: 11, fontStyle: 'normal' }}>{card.desc}</em></span>
                </Link>
              )
            })}
          </div>
          <div className="cw-card cw-card-pad" style={{ textAlign: 'center', background: 'linear-gradient(180deg,#FFFFFF,#F8FBFF)' }}>
            <h3 className="cw-title" style={{ fontSize: 15 }}>إيراد السيارات النشطة</h3>
            <strong style={{ display: 'block', marginTop: 14, color: '#0D1B3E', fontSize: 34, fontWeight: 950, fontFamily: 'Sora,sans-serif' }}>{formatSAR(expectedActiveRevenue)}</strong>
            <span className="cw-muted" style={{ fontSize: 12 }}>ر.س</span>
            <Link to="/client/queue" className="cw-link" style={{ width: '100%', height: 46, border: 'none', borderRadius: 12, background: '#0B63F6', color: '#fff', fontWeight: 950, fontFamily: 'Tajawal,sans-serif', marginTop: 20, display: 'grid', placeItems: 'center' }}>فتح لوحة التشغيل</Link>
          </div>
        </aside>
      </div>
    </div>
  )
}


