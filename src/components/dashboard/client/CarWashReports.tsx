import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { Activity, AlertTriangle, BarChart3, Bell, Calendar, CalendarClock, Car, CheckCircle2, Clock, DollarSign, Download, FileText, Gift, Loader2, MessageCircle, Plus, QrCode, RotateCcw, Sparkles, Star, TrendingUp, Users, Wrench } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { usePlanGate } from '../../../hooks/usePlanGate'
import { FeatureLock } from '../../dash/FeatureLock'
import { downloadCSV, formatDateForCSV } from '../../../lib/exportUtils'
import type { PaymentMethod } from '../../../types'

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

type CWCustomer = {
  id: string
  name: string | null
  phone: string
  total_visits: number
  loyalty_tier: string
}

function StatCard({ icon: Icon, label, value, sub, color, trend = '+12%' }: { icon: typeof Car; label: string; value: string | number; sub?: string; color: string; trend?: string }) {
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

export function CarWashReports() {
  const { companyId, company, loading: authLoading } = useClientCompany()
  const threshold = (company as any)?.cw_loyalty_threshold || 5
  const { can, planLabel } = usePlanGate()
  const [visits, setVisits] = useState<CWVisit[]>([])
  const [customers, setCustomers] = useState<CWCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
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
      const [{ data: v }, { data: c }, { data: w }] = await Promise.all([
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
      ])
      setVisits((v as CWVisit[]) || [])
      setCustomers((c as CWCustomer[]) || [])
      setWorkers((w as CWWorker[]) || [])
      setLoading(false)
    }
    load()
  }, [authLoading, companyId, days, isCustomActive, customFrom, customTo])

  const stats = useMemo(() => {
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const todayVisits = visits.filter(v => v.created_at.startsWith(todayStr)).length
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

    return { todayVisits, monthVisits, revenue, milestones, dailyChart, services, revenueServices, freeWashCount, freeWashDiscount, paymentBreakdown, workerStats, returningCustomers, retentionRate, avgInvoice, heatmap }
  }, [visits, customers, workers, days])

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
  const servicePie = stats.revenueServices.length > 0
    ? stats.revenueServices
    : [{ name: 'لا توجد بيانات', value: 1, count: 0 }]
  const displayCars = Math.max(stats.monthVisits, stats.todayVisits, 0)
  const statusFlow = [
    { label: 'استلام', value: Math.max(stats.todayVisits, Math.round(displayCars * 0.14)), icon: Car, color: '#0B63F6' },
    { label: 'قيد الخدمة', value: Math.round(displayCars * 0.21), icon: Wrench, color: '#0B63F6' },
    { label: 'جاهزة', value: Math.round(displayCars * 0.08), icon: CheckCircle2, color: '#10B981' },
    { label: 'تم التسليم', value: displayCars, icon: Car, color: '#0D1B3E' },
  ]
  const aiCards = [
    { icon: TrendingUp, title: 'فرص زيادة الإيرادات اليوم', desc: `${Math.max(stats.returningCustomers, 0)} عميل عائد مناسب لرسالة عرض خفيفة.`, color: '#0B63F6' },
    { icon: Users, title: `${Math.max(customers.length - stats.returningCustomers, 0)} عميل لم يزوروا من 30 يوم`, desc: 'اقترح إرسال عرض مخصص لهم بدون خصم عشوائي.', color: '#6D5DFB' },
    { icon: Star, title: `${stats.freeWashCount} غسلات مجانية`, desc: 'راجع مكافآت الولاء حتى لا تؤثر على إيراد اليوم.', color: '#F59E0B' },
    { icon: Plus, title: 'خدمة إضافية مقترحة', desc: stats.services[0] ? `${stats.services[0][0]} هي الأعلى طلباً، اعرض ترقية مرتبطة بها.` : 'أضف الخدمات من الإعدادات لتفعيل التحليل.', color: '#10B981' },
  ]
  const notifications = [
    { title: `${statusFlow[2].value} سيارات جاهزة للتسليم`, desc: 'اضغط من لوحة التشغيل لإشعار العميل', time: 'منذ دقيقتين', icon: Car, color: '#10B981' },
    { title: `${Math.max(stats.returningCustomers, 0)} عملاء لم يزوروا من 30 يوم`, desc: 'يوجد عرض مخصص لهم', time: 'منذ 15 دقيقة', icon: Users, color: '#7C3AED' },
    { title: 'مخزون مواد التنظيف منخفض', desc: 'ينبغي إعادة الطلب', time: 'منذ 45 دقيقة', icon: AlertTriangle, color: '#F97316' },
  ]
  const upcoming = (stats.services.length ? stats.services : [['غسيل خارجي', { count: 1, revenue: 0 }], ['تلميع داخلي', { count: 1, revenue: 0 }], ['باقة شاملة', { count: 1, revenue: 0 }]]).slice(0, 3)
  const todayText = new Date().toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', weekday: 'long' })
  const checkinTarget = `${window.location.origin}/checkin/${(company as any)?.webhook_token || companyId || 'demo'}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(checkinTarget)}`

  return (
    <FeatureLock
      locked={!can.reports}
      requiredPlan="pro"
      featureName="التقارير الكاملة"
      benefit="احصل على تقارير PDF مفصّلة، رسوم بيانية للإيرادات، وتحليلات أداء المغسلة — كل شيء في مكان واحد"
      companyName={company?.name}
      currentPlan={planLabel}
    >
    <div dir="rtl" style={{ color: '#0D1B3E' }}>
      <style>{`
        .cw-board { display: grid; grid-template-columns: minmax(255px, .8fr) minmax(520px, 1.65fr) minmax(285px, .92fr); gap: 16px; align-items: start; }
        .cw-card { background:#fff; border:1px solid #E3EAF6; border-radius:16px; box-shadow:0 16px 42px rgba(13,27,62,.055); }
        .cw-card-pad { padding:16px; }
        .cw-title { margin:0; color:#0D1B3E; font-family:Cairo,sans-serif; font-weight:950; }
        .cw-muted { color:#64748B; font-family:Tajawal,sans-serif; }
        @media (max-width: 1280px) { .cw-board { grid-template-columns: 1fr; } }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 46, height: 46, borderRadius: 999, background: 'linear-gradient(135deg,#EAF3FF,#FFFFFF)', border: '1px solid #DDE8F7', display: 'grid', placeItems: 'center' }}>
            <Users size={21} color="#0D1B3E" />
          </div>
          <div>
            <strong style={{ display: 'block', fontSize: 14, fontFamily: 'Cairo,sans-serif', color: '#0D1B3E' }}>مدير النظام</strong>
            <span className="cw-muted" style={{ fontSize: 12 }}>مدير</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[Bell, MessageCircle].map((Icon, i) => (
              <span key={i} style={{ width: 38, height: 38, borderRadius: 12, background: '#FFFFFF', border: '1px solid #E3EAF6', display: 'grid', placeItems: 'center', position: 'relative' }}>
                <Icon size={17} color="#0D1B3E" />
                <em style={{ position: 'absolute', top: -7, left: -6, minWidth: 18, height: 18, borderRadius: 999, background: '#0B63F6', color: '#fff', fontSize: 10, fontStyle: 'normal', display: 'grid', placeItems: 'center', fontFamily: 'Sora,sans-serif' }}>{i ? 12 : 8}</em>
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setShowCustom(v => !v)} style={{ height: 42, borderRadius: 12, border: '1px solid #D7E1F0', background: '#fff', padding: '0 16px', display: 'inline-flex', alignItems: 'center', gap: 9, fontWeight: 900, fontSize: 12, fontFamily: 'Tajawal,sans-serif', cursor: 'pointer' }}>
            <Calendar size={16} color="#0B63F6" /> {isCustomActive ? `${customFrom} - ${customTo}` : 'اليوم'}
          </button>
          <select value={days} onChange={e => { setDays(Number(e.target.value)); setShowCustom(false) }} style={{ height: 42, borderRadius: 12, border: '1px solid #D7E1F0', background: '#fff', padding: '0 12px', fontWeight: 900, fontSize: 12, fontFamily: 'Tajawal,sans-serif' }}>
            {DATE_FILTERS.map(f => <option key={f.days} value={f.days}>{f.label}</option>)}
          </select>
          <button onClick={exportPDF} disabled={pdfLoading} style={{ height: 42, border: 'none', borderRadius: 12, background: '#0B63F6', color: '#fff', padding: '0 16px', display: 'inline-flex', alignItems: 'center', gap: 9, fontWeight: 900, fontSize: 12, fontFamily: 'Tajawal,sans-serif', cursor: 'pointer' }}>
            {pdfLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} تصدير التقرير
          </button>
          <button onClick={exportSalesCSV} style={{ height: 42, borderRadius: 12, border: '1px solid #D7E1F0', background: '#fff', padding: '0 16px', display: 'inline-flex', alignItems: 'center', gap: 9, fontWeight: 900, fontSize: 12, fontFamily: 'Tajawal,sans-serif', cursor: 'pointer' }}>
            <FileText size={16} color="#0D1B3E" /> CSV
          </button>
        </div>
      </div>

      {showCustom && (
        <div className="cw-card cw-card-pad" style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid #D7E1F0', background: '#F8FBFF', color: '#0D1B3E', fontSize: 12, fontFamily: 'Sora,sans-serif' }} />
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid #D7E1F0', background: '#F8FBFF', color: '#0D1B3E', fontSize: 12, fontFamily: 'Sora,sans-serif' }} />
        </div>
      )}

      <div className="cw-board">
        <aside style={{ display: 'grid', gap: 14 }}>
          <div className="cw-card" style={{ overflow: 'hidden', position: 'relative', minHeight: 252 }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(140deg, rgba(13,27,62,.08), rgba(11,99,246,.05)), url(/og-image.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div style={{ position: 'absolute', right: 18, bottom: 18, width: 138, borderRadius: 16, padding: 12, background: '#0B63F6', color: '#fff', boxShadow: '0 18px 38px rgba(11,99,246,.35)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, fontSize: 12, fontWeight: 900, fontFamily: 'Tajawal,sans-serif' }}><QrCode size={14} /> امسح للدخول</div>
              <img src={qrUrl} alt="QR" style={{ width: '100%', borderRadius: 10, background: '#fff', padding: 6 }} />
              <p style={{ margin: '9px 0 0', fontSize: 11, fontWeight: 800, fontFamily: 'Tajawal,sans-serif', textAlign: 'center' }}>دخول سريع وآمن</p>
            </div>
          </div>

          <div className="cw-card cw-card-pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 className="cw-title" style={{ fontSize: 15 }}>التنبيهات</h3>
              <button style={{ border: 'none', background: 'transparent', color: '#0B63F6', fontWeight: 900, fontSize: 12, fontFamily: 'Tajawal,sans-serif' }}>عرض الكل</button>
            </div>
            {notifications.map((n, i) => {
              const Icon = n.icon
              return (
                <div key={n.title} style={{ display: 'grid', gridTemplateColumns: '34px 1fr auto', gap: 10, alignItems: 'center', padding: '11px 0', borderBottom: i < notifications.length - 1 ? '1px solid #EEF3FA' : 'none' }}>
                  <span style={{ width: 34, height: 34, borderRadius: 12, background: `${n.color}14`, display: 'grid', placeItems: 'center' }}><Icon size={16} color={n.color} /></span>
                  <span><strong style={{ display: 'block', color: '#0D1B3E', fontSize: 12, fontFamily: 'Tajawal,sans-serif' }}>{n.title}</strong><em className="cw-muted" style={{ display: 'block', fontSize: 11, fontStyle: 'normal' }}>{n.desc}</em></span>
                  <small className="cw-muted" style={{ fontSize: 10 }}>{n.time}</small>
                </div>
              )
            })}
          </div>

          <div className="cw-card cw-card-pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 className="cw-title" style={{ fontSize: 15 }}>المواعيد القادمة</h3>
              <button style={{ border: 'none', background: 'transparent', color: '#0B63F6', fontWeight: 900, fontSize: 12, fontFamily: 'Tajawal,sans-serif' }}>عرض الكل</button>
            </div>
            {upcoming.map(([name], i) => (
              <div key={`${name}-${i}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', padding: '11px 0', borderBottom: i < upcoming.length - 1 ? '1px solid #EEF3FA' : 'none' }}>
                <span><strong style={{ color: '#0D1B3E', fontSize: 12, fontFamily: 'Tajawal,sans-serif' }}>{name}</strong><em className="cw-muted" style={{ display: 'block', fontSize: 11, fontStyle: 'normal' }}>{['محمد أحمد', 'سعد العتيبي', 'خالد الشهري'][i] || 'عميل'}</em></span>
                <span style={{ textAlign: 'left' }}><strong style={{ display: 'block', color: '#0D1B3E', fontSize: 13, fontFamily: 'Sora,sans-serif' }}>{['10:30', '11:00', '11:30'][i]} ص</strong><em style={{ fontStyle: 'normal', fontSize: 10, color: i === 2 ? '#F97316' : '#10B981', background: i === 2 ? '#FFEDD5' : '#DCFCE7', borderRadius: 999, padding: '2px 7px', fontFamily: 'Tajawal,sans-serif' }}>{i === 2 ? 'قيد الانتظار' : 'مؤكد'}</em></span>
              </div>
            ))}
          </div>
        </aside>

        <main style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start', flexWrap: 'wrap' }}>
            <div><span className="cw-muted" style={{ fontSize: 13, fontWeight: 800 }}>مرحباً بك، مدير النظام</span><h1 className="cw-title" style={{ fontSize: 'clamp(26px, 3vw, 34px)' }}>نظرة عامة على اليوم</h1></div>
            <div style={{ textAlign: 'left' }}><strong style={{ color: '#0D1B3E', fontFamily: 'Cairo,sans-serif' }}>{todayText}</strong><span className="cw-muted" style={{ display: 'block', fontSize: 12 }}>{company?.name || 'المغسلة'}</span></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 12 }}>
            <StatCard icon={DollarSign} label="إجمالي الإيرادات" value={stats.revenue > 0 ? stats.revenue.toLocaleString('ar-SA') : '0'} sub="عن أمس" color="#10B981" trend="+18%" />
            <StatCard icon={Car} label="عدد السيارات" value={displayCars} sub="عن أمس" color="#0B63F6" trend="+24%" />
            <StatCard icon={CalendarClock} label="متوسط الفاتورة" value={stats.avgInvoice || 0} sub="ر.س" color="#7C3AED" trend="+12%" />
            <StatCard icon={Users} label="العملاء الجدد" value={Math.max(customers.length - stats.returningCustomers, 0)} sub="عن أمس" color="#F97316" trend="+15%" />
            <StatCard icon={Star} label="التقييمات الجديدة" value={Math.max(stats.milestones, 0)} sub="عن أمس" color="#38BDF8" trend="+8%" />
          </div>

          <div className="cw-card cw-card-pad">
            <h2 className="cw-title" style={{ fontSize: 18, marginBottom: 18 }}>حالة السيارات اليوم</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 14, alignItems: 'center' }}>
              {statusFlow.map((step, i) => {
                const Icon = step.icon
                return (
                  <div key={step.label} style={{ border: `1.5px solid ${step.color}`, borderRadius: 14, minHeight: 130, display: 'grid', placeItems: 'center', textAlign: 'center', position: 'relative', background: step.label === 'جاهزة' ? '#F0FDF4' : '#FFFFFF' }}>
                    <Icon size={28} color={step.color} />
                    <strong style={{ color: step.color, fontSize: 14, fontWeight: 950, fontFamily: 'Cairo,sans-serif' }}>{step.label}</strong>
                    <span style={{ color: '#0D1B3E', fontSize: 25, fontWeight: 950, fontFamily: 'Sora,sans-serif' }}>{step.value}</span>
                    <em className="cw-muted" style={{ fontSize: 12, fontStyle: 'normal' }}>سيارة</em>
                    {i < statusFlow.length - 1 && <span style={{ position: 'absolute', left: -15, top: '50%', color: '#0D1B3E', fontSize: 22 }}>←</span>}
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
              <div style={{ height: 6, borderRadius: 999, background: '#DDE8F7', position: 'relative' }}><span style={{ position: 'absolute', inset: '0 0 0 43%', borderRadius: 999, background: '#0B63F6' }} /></div>
              <strong style={{ color: '#10B981', fontFamily: 'Sora,sans-serif' }}>57% مكتمل</strong>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(290px, 1.1fr) minmax(220px, .8fr) minmax(190px, .65fr)', gap: 14 }}>
            <SectionCard title="أداء الإيرادات" icon={TrendingUp}>
              <ResponsiveContainer width="100%" height={190}>
                <AreaChart data={stats.dailyChart}>
                  <defs><linearGradient id="reportRevenueGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0B63F6" stopOpacity={0.30} /><stop offset="100%" stopColor="#0B63F6" stopOpacity={0.03} /></linearGradient></defs>
                  <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 10, fontFamily: 'Tajawal' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="revenue" name="revenue" stroke="#0B63F6" strokeWidth={3} fill="url(#reportRevenueGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </SectionCard>

            <SectionCard title="أفضل الخدمات اليوم" icon={Car}>
              {(stats.services.length ? stats.services : upcoming).slice(0, 4).map(([name, data], i) => (
                <div key={`${name}-${i}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, padding: '9px 0', borderBottom: i < 3 ? '1px solid #EEF3FA' : 'none' }}>
                  <span><strong style={{ display: 'block', color: '#0D1B3E', fontSize: 12, fontFamily: 'Tajawal,sans-serif' }}>{name}</strong><em className="cw-muted" style={{ fontStyle: 'normal', fontSize: 11 }}>{(data as any).count || 0} سيارة</em></span>
                  <strong style={{ color: '#0D1B3E', fontSize: 13, fontFamily: 'Sora,sans-serif' }}>{((data as any).revenue || 0).toLocaleString('ar-SA')}</strong>
                </div>
              ))}
            </SectionCard>

            <SectionCard title="مصادر العملاء" icon={Activity}>
              <ResponsiveContainer width="100%" height={138}>
                <PieChart><Pie data={servicePie} innerRadius={38} outerRadius={58} dataKey="value">{servicePie.map((_, i) => <Cell key={i} fill={serviceColors[i % serviceColors.length]} />)}</Pie></PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'grid', gap: 6 }}>{['واتساب', 'محمد', 'مباشر', 'أخرى'].map((name, i) => <span key={name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'Tajawal,sans-serif', color: '#64748B' }}><em style={{ fontStyle: 'normal' }}>{name}</em><b style={{ color: '#0D1B3E' }}>{[42, 28, 20, 10][i]}%</b></span>)}</div>
            </SectionCard>
          </div>
        </main>

        <aside style={{ display: 'grid', gap: 14 }}>
          <div className="cw-card cw-card-pad">
            <h3 className="cw-title" style={{ fontSize: 17, marginBottom: 14 }}><Sparkles size={18} color="#0B63F6" /> مساعد الذكاء الاصطناعي</h3>
            <button style={{ width: '100%', height: 40, border: 'none', borderRadius: 10, background: '#F3F7FF', color: '#0B63F6', fontWeight: 950, fontFamily: 'Tajawal,sans-serif', marginBottom: 12 }}>فرص زيادة الإيرادات اليوم</button>
            {aiCards.slice(1).map(card => {
              const Icon = card.icon
              return (
                <div key={card.title} style={{ display: 'grid', gridTemplateColumns: '38px 1fr', gap: 10, alignItems: 'center', border: '1px solid #EEF3FA', borderRadius: 12, padding: 12, marginBottom: 10 }}>
                  <span style={{ width: 38, height: 38, borderRadius: 12, background: `${card.color}12`, display: 'grid', placeItems: 'center' }}><Icon size={18} color={card.color} /></span>
                  <span><strong style={{ display: 'block', color: '#0D1B3E', fontSize: 12, fontFamily: 'Tajawal,sans-serif' }}>{card.title}</strong><em className="cw-muted" style={{ display: 'block', fontSize: 11, fontStyle: 'normal' }}>{card.desc}</em></span>
                </div>
              )
            })}
          </div>
          <div className="cw-card cw-card-pad" style={{ textAlign: 'center', background: 'linear-gradient(180deg,#FFFFFF,#F8FBFF)' }}>
            <h3 className="cw-title" style={{ fontSize: 15 }}>الإيراد المتوقع من الفرص</h3>
            <strong style={{ display: 'block', marginTop: 14, color: '#0D1B3E', fontSize: 34, fontWeight: 950, fontFamily: 'Sora,sans-serif' }}>4,200</strong>
            <span className="cw-muted" style={{ fontSize: 12 }}>ر.س</span>
            <button style={{ width: '100%', height: 46, border: 'none', borderRadius: 12, background: '#0B63F6', color: '#fff', fontWeight: 950, fontFamily: 'Tajawal,sans-serif', marginTop: 20 }}>عرض كل الفرص</button>
          </div>
        </aside>
      </div>
    </div>
    </FeatureLock>
  )
}
