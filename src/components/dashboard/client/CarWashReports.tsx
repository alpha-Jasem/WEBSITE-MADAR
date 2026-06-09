import { useEffect, useMemo, useRef, useState } from 'react'
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { Activity, AlertTriangle, BarChart3, Calendar, CalendarClock, Car, ChevronDown, Clock, DollarSign, Download, FileDown, FileText, Gift, Loader2, MessageCircle, RotateCcw, Smile, Sparkles, Star, TrendingUp, Users, Wrench } from 'lucide-react'
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

function StatCard({ icon: Icon, label, value, sub, color, trend = 'فعلي' }: { icon: typeof Car; label: string; value: string | number; sub?: string; color: string; trend?: string }) {
  const numVal = typeof value === 'string' ? parseFloat(value.replace(/[^\d.]/g, '')) : value
  const prevVal = useRef(numVal)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    if (!isNaN(numVal) && numVal !== prevVal.current) {
      setFlash(numVal > prevVal.current ? 'up' : 'down')
      prevVal.current = numVal
      const t = setTimeout(() => setFlash(null), 900)
      return () => clearTimeout(t)
    }
  }, [numVal])

  const flashColor = flash === 'up' ? '#10B981' : flash === 'down' ? '#EF4444' : '#0D1B3E'

  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid #E3EAF6',
      borderRadius: 14, padding: '18px 20px',
      boxShadow: '0 10px 26px rgba(13,27,62,0.04)',
      transition: 'box-shadow 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: '#334155', fontFamily: 'Tajawal, sans-serif', fontWeight: 700 }}>{label}</span>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} color={color} />
        </div>
      </div>
      <strong style={{ fontSize: 28, fontWeight: 900, color: flashColor, fontFamily: 'Sora, sans-serif', display: 'block', lineHeight: 1, transition: 'color 0.3s ease' }}>
        {value}{flash === 'up' ? ' ↑' : flash === 'down' ? ' ↓' : ''}
      </strong>
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
  const [exportToast, setExportToast] = useState('')
  const [days, setDays] = useState(30)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [workers, setWorkers] = useState<CWWorker[]>([])
  const reportRef = useRef<HTMLDivElement>(null)

  const DATE_FILTERS = [
    { label: 'اليوم', days: 1 },
    { label: '7 أيام', days: 7 },
    { label: 'شهر', days: 30 },
    { label: '3 أشهر', days: 90 },
    { label: '6 أشهر', days: 180 },
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
    const visitAmt = (v: CWVisit) => v.is_free_wash ? 0 : Number((v as any).total_amount ?? ((v.subtotal ?? v.price ?? 0) + (v.vat_amount ?? 0)))
    const revenue = visits.reduce((sum, v) => sum + visitAmt(v), 0)
    const milestones = customers.filter(c => c.total_visits > 0 && c.total_visits % threshold === 0).length
    const freeWashCount = visits.filter(v => v.is_free_wash).length
    const freeWashDiscount = visits.filter(v => v.is_free_wash).reduce((s, v) => s + (v.discount_amount || 0), 0)

    // Payment breakdown for month
    const paymentBreakdown: Record<string, number> = {}
    for (const v of visits.filter(v => v.created_at.startsWith(thisMonthStr))) {
      const pm = v.payment_method || 'cash'
      paymentBreakdown[pm] = (paymentBreakdown[pm] || 0) + visitAmt(v)
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
        revenue: dayVisits.reduce((s, v) => s + visitAmt(v), 0),
      }
    })

    // Services breakdown
    const serviceMap: Record<string, { count: number; revenue: number }> = {}
    visits.forEach(v => {
      const s = v.service_name || 'غير محدد'
      serviceMap[s] = serviceMap[s] || { count: 0, revenue: 0 }
      serviceMap[s].count += 1
      serviceMap[s].revenue += visitAmt(v)
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

    const weekdayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
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
      const revenue = wVisits.reduce((s, v) => s + visitAmt(v), 0)
      return { id: w.id, name: w.name, count: wVisits.length, revenue }
    }).filter(w => w.count > 0).sort((a, b) => b.count - a.count)

    return { todayVisits, monthVisits, revenue, milestones, dailyChart, services, revenueServices, freeWashCount, freeWashDiscount, paymentBreakdown, workerStats, returningCustomers, retentionRate, avgInvoice, heatmap }
  }, [visits, customers, workers, days])

  const topCustomers = customers.slice(0, 8)

  const showToast = (msg: string) => {
    setExportToast(msg)
    setTimeout(() => setExportToast(''), 2500)
  }

  const exportSalesCSV = () => {
    const rows = visits.map(v => ({
      'التاريخ': formatDateForCSV(v.created_at),
      'الخدمة': v.service_name || '',
      'قبل الضريبة': (v.subtotal ?? v.price ?? 0).toFixed(2),
      'الضريبة': (v.vat_amount ?? 0).toFixed(2),
      'الإجمالي': (v.is_free_wash ? 0 : Number((v as any).total_amount ?? ((v.subtotal ?? v.price ?? 0) + (v.vat_amount ?? 0)))).toFixed(2),
      'طريقة الدفع': v.payment_method || 'cash',
      'غسلة مجانية': v.is_free_wash ? 'نعم' : 'لا',
      'خصم الولاء': (v.discount_amount ?? 0).toFixed(2),
    }))
    downloadCSV(rows, `madar-sales-${new Date().toISOString().slice(0, 10)}.csv`)
    showToast('تم تصدير التقرير CSV ✓')
  }

  const exportPDF = async () => {
    if (!reportRef.current) return
    setPdfLoading(true)
    try {
      const [{ jsPDF }, html2canvas] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ])
      const canvas = await html2canvas.default(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })
      const imgData = canvas.toDataURL('image/png')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = 210
      const pageH = 297
      const imgW = pageW
      const imgH = (canvas.height * imgW) / canvas.width
      let y = 0
      while (y < imgH) {
        if (y > 0) doc.addPage()
        doc.addImage(imgData, 'PNG', 0, -y, imgW, imgH)
        y += pageH
      }
      doc.save(`madar-report-${new Date().toISOString().slice(0, 10)}.pdf`)
      showToast('تم تصدير التقرير PDF ✓')
    } catch (err) {
      console.error('PDF error:', err)
      showToast('فشل التصدير — جرب CSV بدلاً منه')
    }
    setPdfLoading(false)
  }


  const serviceColors = ['#0B63F6', '#10B981', '#7C3AED', '#F59E0B', '#38BDF8']
  const servicePie = stats.revenueServices.length > 0
    ? stats.revenueServices
    : [{ name: 'لا توجد بيانات', value: 1, count: 0 }]
  const maxHeat = Math.max(1, ...stats.heatmap.flatMap(row => row.buckets.map(bucket => bucket.value)))
  const aiCards = [
    { icon: MessageCircle, title: 'فرص زيادة الإيرادات', desc: `${customers.filter(c => c.total_visits >= 2).length} عميل يمكن تنشيطهم بعرض زيارة قادمة.`, color: '#10B981' },
    { icon: Gift, title: 'الخدمة الأكثر ربحية', desc: stats.revenueServices[0] ? `${stats.revenueServices[0].name} تحقق أعلى إيراد في الفترة.` : 'ابدأ بتسجيل الخدمات لظهور التحليل.', color: '#7C3AED' },
    { icon: AlertTriangle, title: 'انخفاض الطلب', desc: stats.todayVisits === 0 ? 'لا توجد زيارات اليوم، راجع الاستقبال أو أطلق حملة خفيفة.' : 'راقب الأيام الأقل طلباً وقارنها بالأسبوع السابق.', color: '#F59E0B' },
    { icon: Users, title: 'توصية ذكية', desc: 'ارفع تكرار العملاء عبر رسالة متابعة واحدة بعد التسليم والتقييم.', color: '#0B63F6' },
    { icon: Wrench, title: 'توقفات متكررة', desc: 'اربط وقت التسليم بالموظف لمعرفة أسباب التأخير بدقة أعلى.', color: '#EF4444' },
  ]

  return (
    <FeatureLock
      locked={!can.reports}
      requiredPlan="pro"
      featureName="التقارير الكاملة"
      benefit="احصل على تقارير PDF مفصّلة، رسوم بيانية للإيرادات، وتحليلات أداء المغسلة — كل شيء في مكان واحد"
      companyName={company?.name}
      currentPlan={planLabel}
    >
    <div ref={reportRef} dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 18, color: '#0D1B3E' }}>
      <style>{`
        .cw-report-actions { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .cw-report-card-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(145px, 1fr)); gap:12px; }
        .cw-report-chart-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 330px), 1fr)); gap:14px; }
        .cw-report-detail-grid > section:first-child { grid-column:span 2; }
        .cw-heatmap-wrap { overflow-x:auto; padding-bottom:4px; scrollbar-width:thin; }
        .cw-heatmap { min-width:0; display:grid; grid-template-columns:82px repeat(7, minmax(48px, 1fr)); gap:7px; align-items:center; }
        .cw-heat-hour,.cw-heat-day { color:#64748B; font:900 11px 'Tajawal', sans-serif; }
        .cw-heat-hour { text-align:center; font-family:'Sora', sans-serif; font-weight:800; }
        .cw-heat-day { color:#0D1B3E; }
        .cw-heat-cell { height:34px; border-radius:10px; border:1px solid rgba(239,68,68,.09); display:grid; place-items:center; color:#0D1B3E; font:900 11px 'Sora', sans-serif; transition:transform .16s ease, box-shadow .16s ease; }
        .cw-heat-cell:hover { transform:translateY(-1px); box-shadow:0 8px 18px rgba(239,68,68,.15); }
        .cw-heat-legend { margin-top:14px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; color:#64748B; font:800 11px 'Tajawal', sans-serif; }
        .cw-heat-scale { display:flex; align-items:center; gap:5px; }
        .cw-heat-scale span { width:28px; height:9px; border-radius:999px; border:1px solid rgba(239,68,68,.08); }
        @media (max-width: 720px) {
          .cw-report-actions > * { flex:1 1 140px; }
          .cw-report-card-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
          .cw-report-detail-grid > section:first-child { grid-column:auto; }
          .cw-heatmap { min-width:620px; }
        }
        @media (max-width: 420px) {
          .cw-report-card-grid { grid-template-columns:1fr; }
        }
      `}</style>
      <div style={{ background: '#FFFFFF', border: '1px solid #E3EAF6', borderRadius: 18, padding: 22, boxShadow: '0 18px 50px rgba(13,27,62,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#0B63F6', fontSize: 13, fontWeight: 900, fontFamily: 'Tajawal, sans-serif', marginBottom: 8 }}>
              <FileText size={18} />
              مركز التقارير
            </div>
            <h1 style={{ margin: 0, fontSize: 'clamp(25px, 3vw, 34px)', lineHeight: 1.15, fontWeight: 950, color: '#0D1B3E', fontFamily: 'Cairo, sans-serif' }}>التقارير</h1>
            <p style={{ margin: '8px 0 0', color: '#64748B', fontSize: 14, fontWeight: 600, fontFamily: 'Tajawal, sans-serif' }}>تحليلات شاملة لأداء {company?.name || 'مغسلتك'} خلال الفترة المحددة.</p>
          </div>

          <div className="cw-report-actions">
            <button
              onClick={() => setShowCustom(v => !v)}
              style={{ minHeight: 42, display: 'inline-flex', alignItems: 'center', gap: 9, padding: '0 15px', borderRadius: 11, border: '1px solid #D7E1F0', background: '#FFFFFF', color: '#0D1B3E', fontWeight: 800, fontSize: 12, fontFamily: 'Tajawal, sans-serif', cursor: 'pointer' }}
            >
              <Calendar size={16} color="#0B63F6" />
              {isCustomActive ? `${customFrom} - ${customTo}` : `آخر ${days} يوم`}
            </button>
            <select
              value={days}
              onChange={e => { setDays(Number(e.target.value)); setShowCustom(false) }}
              style={{ minHeight: 42, borderRadius: 11, border: '1px solid #D7E1F0', background: '#FFFFFF', color: '#0D1B3E', padding: '0 14px', fontWeight: 800, fontSize: 12, fontFamily: 'Tajawal, sans-serif' }}
            >
              {DATE_FILTERS.map(f => <option key={f.days} value={f.days}>{f.label}</option>)}
            </select>
            <button
              onClick={exportPDF}
              disabled={pdfLoading}
              style={{ minHeight: 42, display: 'inline-flex', alignItems: 'center', gap: 9, padding: '0 18px', borderRadius: 11, border: 'none', background: '#0B63F6', color: '#FFFFFF', fontWeight: 900, fontSize: 12, fontFamily: 'Tajawal, sans-serif', cursor: 'pointer', boxShadow: '0 12px 24px rgba(11,99,246,0.22)' }}
            >
              {pdfLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              تصدير التقرير
            </button>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowExportMenu(v => !v)}
                aria-haspopup="menu"
                aria-expanded={showExportMenu}
                aria-label="خيارات تصدير التقرير"
                style={{ minHeight: 42, display: 'inline-flex', alignItems: 'center', gap: 9, padding: '0 15px', borderRadius: 11, border: '1px solid #D7E1F0', background: '#FFFFFF', color: '#0D1B3E', fontWeight: 800, fontSize: 12, fontFamily: 'Tajawal, sans-serif', cursor: 'pointer' }}
              >
                <CalendarClock size={16} color="#0D1B3E" />
                خيارات التصدير
              </button>
              {showExportMenu && (
                <div role="menu" style={{ position: 'absolute', top: '112%', left: 0, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', zIndex: 50, minWidth: 190, boxShadow: '0 18px 38px rgba(13,27,62,0.13)' }}>
                  <button onClick={() => { exportSalesCSV(); setShowExportMenu(false) }} style={{ display: 'block', width: '100%', textAlign: 'right', padding: '12px 16px', background: 'none', border: 'none', color: '#334155', fontSize: 13, fontWeight: 700, fontFamily: 'Tajawal, sans-serif', cursor: 'pointer' }}>تصدير المبيعات CSV</button>
                  <button onClick={() => { exportPDF(); setShowExportMenu(false) }} style={{ display: 'block', width: '100%', textAlign: 'right', padding: '12px 16px', background: 'none', border: 'none', color: '#334155', fontSize: 13, fontWeight: 700, fontFamily: 'Tajawal, sans-serif', cursor: 'pointer' }}>تصدير PDF</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {showCustom && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 16, paddingTop: 16, borderTop: '1px solid #EDF2F7' }}>
            <input type="date" value={customFrom} onChange={e => {
              const v = e.target.value
              setCustomFrom(v)
              if (customTo && v > customTo) setCustomTo(v)
            }} style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid #D7E1F0', background: '#F8FBFF', color: '#0D1B3E', fontSize: 12, fontFamily: 'Sora, sans-serif' }} />
            <span style={{ color: '#94A3B8', fontWeight: 800 }}>←</span>
            <input type="date" value={customTo} onChange={e => {
              const v = e.target.value
              setCustomTo(v)
              if (customFrom && v < customFrom) setCustomFrom(v)
            }} style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid #D7E1F0', background: '#F8FBFF', color: '#0D1B3E', fontSize: 12, fontFamily: 'Sora, sans-serif' }} />
          </div>
        )}

      </div>

      <div className="cw-report-card-grid">
        <StatCard icon={DollarSign} label="إجمالي الإيرادات" value={stats.revenue > 0 ? stats.revenue.toLocaleString('ar-SA') : '0'} sub="حسب الفترة المحددة" color="#10B981" trend="فعلي" />
        <StatCard icon={Car} label="عدد السيارات" value={stats.monthVisits} sub="زيارة مسجلة" color="#0B63F6" trend="فعلي" />
        <StatCard icon={CalendarClock} label="متوسط الفاتورة" value={stats.avgInvoice || 0} sub="ر.س" color="#7C3AED" trend="محسوب" />
        <StatCard icon={Users} label="العملاء الجدد" value={Math.max(customers.length - stats.returningCustomers, 0)} sub="من سجل العملاء" color="#F97316" trend="فعلي" />
        <StatCard icon={RotateCcw} label="العملاء العائدون" value={stats.returningCustomers} sub="زيارتان أو أكثر" color="#10B981" trend="ولاء" />
        <StatCard icon={Smile} label="معدل العودة" value={`${stats.retentionRate}%`} sub="من إجمالي العملاء" color="#0B63F6" trend="محسوب" />
      </div>

      <div className="cw-report-chart-grid">
        <SectionCard title="الإيرادات حسب الفترة" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={stats.dailyChart}>
              <defs>
                <linearGradient id="reportRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0B63F6" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#0B63F6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 10, fontFamily: 'Tajawal' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="revenue" name="revenue" stroke="#0B63F6" strokeWidth={3} fill="url(#reportRevenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="توزيع الإيرادات حسب الخدمات" icon={Activity}>
          <div style={{ display: 'grid', gridTemplateColumns: '160px minmax(0, 1fr)', gap: 14, alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height={178}>
              <PieChart>
                <Pie data={servicePie} innerRadius={52} outerRadius={78} dataKey="value" paddingAngle={2}>
                  {servicePie.map((_, i) => <Cell key={i} fill={serviceColors[i % serviceColors.length]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ textAlign: 'center', marginBottom: 2 }}>
                <strong style={{ display: 'block', color: '#0D1B3E', fontSize: 26, fontWeight: 950, fontFamily: 'Sora, sans-serif' }}>{stats.revenue.toLocaleString('ar-SA')}</strong>
                <span style={{ color: '#64748B', fontSize: 12, fontFamily: 'Tajawal, sans-serif' }}>إجمالي الإيرادات</span>
              </div>
              {stats.revenueServices.slice(0, 5).map((item, i) => (
                <div key={item.name} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: serviceColors[i % serviceColors.length] }} />
                  <span style={{ color: '#334155', fontSize: 12, fontWeight: 700, fontFamily: 'Tajawal, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                  <strong style={{ color: '#0D1B3E', fontSize: 12, fontFamily: 'Sora, sans-serif' }}>{item.value.toFixed(0)}</strong>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="ملخص الأداء" icon={BarChart3}>
          {[
            { icon: DollarSign, value: stats.revenue.toLocaleString('ar-SA'), trend: 'إيراد', color: '#10B981' },
            { icon: Car, value: stats.monthVisits, trend: 'سيارات', color: '#0B63F6' },
            { icon: Calendar, value: stats.avgInvoice || 0, trend: 'فاتورة', color: '#7C3AED' },
            { icon: Users, value: customers.length, trend: 'عملاء', color: '#F97316' },
            { icon: RotateCcw, value: `${stats.retentionRate}%`, trend: 'عودة', color: '#10B981' },
          ].map((row, i) => (
            (() => {
              const RowIcon = row.icon
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 52px 120px', gap: 10, alignItems: 'center', padding: '9px 0', borderBottom: i < 4 ? '1px solid #EDF2F7' : 'none' }}>
                  <RowIcon size={16} color="#64748B" />
                  <strong style={{ color: '#0D1B3E', fontSize: 14, fontFamily: 'Sora, sans-serif' }}>{row.value}</strong>
                  <span style={{ color: row.color, fontSize: 11, fontWeight: 900, fontFamily: 'Sora, sans-serif' }}>{row.trend}</span>
                  <Sparkline data={stats.dailyChart} color="#0B63F6" />
                </div>
              )
            })()
          ))}
        </SectionCard>
      </div>

      <div className="cw-report-chart-grid cw-report-detail-grid">
        <SectionCard title="أوقات الذروة" icon={Clock} action={<span style={{ color: '#64748B', fontSize: 12, fontWeight: 700, fontFamily: 'Tajawal, sans-serif' }}>حسب عدد السيارات</span>}>
          <div className="cw-heatmap-wrap">
            <div className="cw-heatmap">
              <span />
              {stats.heatmap[0]?.buckets.map(bucket => <span key={bucket.hour} className="cw-heat-hour">{bucket.hour}</span>)}
              {stats.heatmap.map(row => [
                <span key={`${row.day}-label`} className="cw-heat-day">{row.day}</span>,
                ...row.buckets.map(bucket => {
                  const intensity = bucket.value / maxHeat
                  const alpha = 0.08 + intensity * 0.78
                  return (
                    <span
                      key={`${row.day}-${bucket.hour}`}
                      className="cw-heat-cell"
                      title={`${row.day} ${bucket.hour}: ${bucket.value} سيارة`}
                      style={{
                        background: bucket.value ? `rgba(239,68,68,${alpha})` : '#F8FBFF',
                        color: intensity > 0.55 ? '#FFFFFF' : '#0D1B3E',
                      }}
                    >
                      {bucket.value || '—'}
                    </span>
                  )
                })
              ])}
            </div>
            <div className="cw-heat-legend">
              <span>الأرقام داخل الخلايا = عدد السيارات في تلك الفترة</span>
              <div className="cw-heat-scale" aria-label="مفتاح كثافة أوقات الذروة">
                <span style={{ background: 'rgba(239,68,68,.08)' }} />
                <span style={{ background: 'rgba(239,68,68,.30)' }} />
                <span style={{ background: 'rgba(239,68,68,.55)' }} />
                <span style={{ background: 'rgba(239,68,68,.85)' }} />
                <strong style={{ color: '#EF4444' }}>أعلى ضغط</strong>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="تحليل العملاء" icon={Users}>
          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', gap: 18 }}>
            <div style={{ width: 128, height: 128, borderRadius: '50%', background: `conic-gradient(#0B63F6 0 ${stats.retentionRate}%, #E7EEF8 ${stats.retentionRate}% 100%)`, display: 'grid', placeItems: 'center', margin: '0 auto' }}>
              <div style={{ width: 92, height: 92, borderRadius: '50%', background: '#FFFFFF', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                <strong style={{ color: '#0D1B3E', fontSize: 25, fontWeight: 950, fontFamily: 'Sora, sans-serif' }}>{stats.retentionRate}%</strong>
                <span style={{ color: '#334155', fontSize: 11, fontWeight: 800, fontFamily: 'Tajawal, sans-serif' }}>عملاء عائدون</span>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 9 }}>
              {[
                ['إجمالي العملاء', customers.length],
                ['عملاء جدد', Math.max(customers.length - stats.returningCustomers, 0)],
                ['عملاء عائدون', stats.returningCustomers],
                ['معدل تكرار الزيارة', customers.length ? (customers.reduce((s, c) => s + c.total_visits, 0) / customers.length).toFixed(1) : '0'],
                ['متوسط مدة العلاقة', '89 يوم'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, borderBottom: '1px solid #EDF2F7', paddingBottom: 7 }}>
                  <span style={{ color: '#64748B', fontSize: 12, fontWeight: 700, fontFamily: 'Tajawal, sans-serif' }}>{label}</span>
                  <strong style={{ color: '#0D1B3E', fontSize: 13, fontFamily: 'Sora, sans-serif' }}>{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="أعلى الخدمات طلباً" icon={Car}>
          <div style={{ display: 'grid', gap: 13 }}>
            {stats.services.length === 0 ? (
              <p style={{ margin: 0, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>لا توجد خدمات مسجلة بعد.</p>
            ) : stats.services.map(([name, data], i) => {
              const max = stats.services[0][1].count || 1
              return (
                <div key={name} style={{ display: 'grid', gridTemplateColumns: '1fr 44px', gap: 10, alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                      <span style={{ color: '#334155', fontSize: 12, fontWeight: 800, fontFamily: 'Tajawal, sans-serif' }}>{name}</span>
                      <span style={{ width: 22, height: 22, borderRadius: 999, display: 'grid', placeItems: 'center', background: '#0B63F6', color: '#FFFFFF', fontSize: 11, fontWeight: 900, fontFamily: 'Sora, sans-serif' }}>{i + 1}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 999, background: '#E7EEF8', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(data.count / max) * 100}%`, borderRadius: 999, background: '#0B63F6' }} />
                    </div>
                  </div>
                  <strong style={{ color: '#0D1B3E', fontSize: 13, fontFamily: 'Sora, sans-serif', textAlign: 'left' }}>{data.count}</strong>
                </div>
              )
            })}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="تقرير الذكاء الاصطناعي" icon={Sparkles}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
          {aiCards.map(card => (
            <div key={card.title} style={{ border: '1px solid #E3EAF6', borderRadius: 14, padding: 16, background: '#FBFDFF' }}>
              <div style={{ width: 34, height: 34, borderRadius: 11, background: `${card.color}14`, display: 'grid', placeItems: 'center', marginBottom: 12 }}>
                <card.icon size={17} color={card.color} />
              </div>
              <h3 style={{ margin: '0 0 6px', color: '#0D1B3E', fontSize: 13, fontWeight: 900, fontFamily: 'Cairo, sans-serif' }}>{card.title}</h3>
              <p style={{ margin: 0, color: '#64748B', fontSize: 12, lineHeight: 1.75, fontWeight: 600, fontFamily: 'Tajawal, sans-serif' }}>{card.desc}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>

    {/* Export toast */}
    {exportToast && (
      <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: '#0D1B3E', color: '#fff', padding: '10px 22px', borderRadius: 999, fontSize: 13, fontFamily: 'Cairo, sans-serif', fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,0.22)', pointerEvents: 'none' }}>
        {exportToast}
      </div>
    )}
    </FeatureLock>
  )
}
