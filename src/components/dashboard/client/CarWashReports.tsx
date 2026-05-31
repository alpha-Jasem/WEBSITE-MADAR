import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts'
import { BarChart3, Car, DollarSign, FileDown, Gift, Loader2, Star, TrendingUp, Users, ChevronDown } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { usePlanGate } from '../../../hooks/usePlanGate'
import { FeatureLock } from '../../dash/FeatureLock'
import { downloadCSV, formatDateForCSV } from '../../../lib/exportUtils'
import type { PaymentMethod } from '../../../types'
import { ClientButton, ClientInsightPanel, ClientPageHeader } from './ClientUI'

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

function StatCard({ icon: Icon, label, value, sub, color }: { icon: typeof Car; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div style={{
      background: '#F8FAFC', border: '1px solid #E2E8F0',
      borderRadius: 16, padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>{label}</span>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} color={color} />
        </div>
      </div>
      <strong style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', fontFamily: 'Sora, sans-serif', display: 'block', lineHeight: 1 }}>{value}</strong>
      {sub && <span style={{ fontSize: 12, color: '#475569', fontFamily: 'Tajawal, sans-serif', marginTop: 4, display: 'block' }}>{sub}</span>}
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
    const serviceMap: Record<string, number> = {}
    visits.forEach(v => {
      const s = v.service_name || 'غير محدد'
      serviceMap[s] = (serviceMap[s] || 0) + 1
    })
    const services = Object.entries(serviceMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    // Worker performance
    const workerStats = workers.map(w => {
      const wVisits = visits.filter(v => v.worker_id === w.id)
      const revenue = wVisits.reduce((s, v) => s + (v.subtotal ?? v.price ?? 0), 0)
      return { id: w.id, name: w.name, count: wVisits.length, revenue }
    }).filter(w => w.count > 0).sort((a, b) => b.count - a.count)

    return { todayVisits, monthVisits, revenue, milestones, dailyChart, services, freeWashCount, freeWashDiscount, paymentBreakdown, workerStats }
  }, [visits, customers, workers, days])

  const topCustomers = customers.slice(0, 8)
  const avgTicket = stats.todayVisits > 0 ? Math.round(stats.revenue / Math.max(1, visits.length)) : 0
  const reportInsights = [
    stats.services.length > 0
      ? { title: 'ادفع الخدمة الأعلى طلباً', description: `الخدمة الأكثر طلباً هي "${stats.services[0][0]}" بعدد ${stats.services[0][1]} طلب. اجعلها واضحة في QR والعروض.`, tone: 'blue' as const }
      : { title: 'لا توجد خدمات كافية للتحليل', description: 'بعد تسجيل عدة زيارات ستظهر أفضل الخدمات تلقائياً.', tone: 'slate' as const },
    stats.workerStats.length > 0
      ? { title: 'استفد من أفضل موظف', description: `${stats.workerStats[0].name} أنجز ${stats.workerStats[0].count} سيارة. استخدمه كنموذج للوردية.`, tone: 'green' as const }
      : { title: 'اربط الزيارات بالموظفين', description: 'تحديد الموظف في لوحة التشغيل يجعل تقرير الأداء قابل للبيع والإدارة.', tone: 'amber' as const },
    stats.milestones > 0
      ? { title: 'مكافآت جاهزة للبيع العكسي', description: `${stats.milestones} عميل وصلوا مرحلة مكافأة. هذه فرصة ممتازة لعرض اشتراك شهري.`, tone: 'amber' as const }
      : { title: 'ابنِ ولاء تدريجي', description: 'استمر بتسجيل الزيارات حتى يبدأ النظام باكتشاف فرص المكافآت والرجوع.', tone: 'blue' as const },
    avgTicket > 0
      ? { title: 'متوسط قيمة العميل', description: `متوسط الفاتورة في الفترة حوالي ${avgTicket} ر.س. ارفعها بإضافة خدمة تلميع أو عطر كخيار سريع.`, tone: avgTicket < 35 ? 'amber' as const : 'green' as const }
      : { title: 'انتظر بيانات أكثر', description: 'كلما زادت الزيارات أصبحت توصيات الإيراد أدق.', tone: 'slate' as const },
  ]

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
        for (const [name, count] of stats.services) {
          doc.setTextColor(100, 100, 100)
          doc.text(name, 196, y, { align: 'right' })
          doc.setTextColor(30, 30, 30)
          doc.text(`${count} سيارة`, 40, y, { align: 'right' })
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

  return (
    <FeatureLock
      locked={!can.reports}
      requiredPlan="pro"
      featureName="التقارير الكاملة"
      benefit="احصل على تقارير PDF مفصّلة، رسوم بيانية للإيرادات، وتحليلات أداء المغسلة — كل شيء في مكان واحد"
      companyName={company?.name}
      currentPlan={planLabel}
    >
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <ClientPageHeader
        eyebrow="تحليل الأداء"
        title="تقارير المغسلة"
        description="رسوم بيانية، إيرادات، ولاء العملاء، وأداء الخدمات بفلاتر جاهزة للتصدير."
        actions={(
          <>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {DATE_FILTERS.map(f => (
              <button key={f.days} onClick={() => { setDays(f.days); setShowCustom(false) }}
                style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontFamily: 'Tajawal, sans-serif', cursor: 'pointer', border: `1px solid ${!showCustom && days === f.days ? '#1565C0' : 'rgba(0,191,255,0.2)'}`, background: !showCustom && days === f.days ? 'rgba(21,101,192,0.12)' : 'transparent', color: !showCustom && days === f.days ? '#1565C0' : '#5A6E85', fontWeight: !showCustom && days === f.days ? 700 : 400, transition: 'all 0.15s' }}>
                {f.label}
              </button>
            ))}
            <button onClick={() => setShowCustom(v => !v)}
              style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontFamily: 'Tajawal, sans-serif', cursor: 'pointer', border: `1px solid ${showCustom ? '#1565C0' : 'rgba(0,191,255,0.2)'}`, background: showCustom ? 'rgba(21,101,192,0.12)' : 'transparent', color: showCustom ? '#1565C0' : '#5A6E85', fontWeight: showCustom ? 700 : 400 }}>
              مخصص 📅
            </button>
            {showCustom && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="date" value={customFrom} onChange={e => {
                  const v = e.target.value
                  setCustomFrom(v)
                  if (customTo && v > customTo) setCustomTo(v)
                }}
                  style={{ padding: '4px 10px', borderRadius: 10, border: '1px solid rgba(0,191,255,0.3)', background: '#F4F9FF', color: '#0D1B3E', fontSize: 12, fontFamily: 'Sora, sans-serif' }} />
                <span style={{ color: '#5A6E85', fontSize: 12 }}>←</span>
                <input type="date" value={customTo} onChange={e => {
                  const v = e.target.value
                  setCustomTo(v)
                  if (customFrom && v < customFrom) setCustomFrom(v)
                }}
                  style={{ padding: '4px 10px', borderRadius: 10, border: '1px solid rgba(0,191,255,0.3)', background: '#F4F9FF', color: '#0D1B3E', fontSize: 12, fontFamily: 'Sora, sans-serif' }} />
              </div>
            )}
          </div>
        <div style={{ position: 'relative' }}>
          <ClientButton
            onClick={() => setShowExportMenu(v => !v)}
          >
            <FileDown size={15} />
            تصدير
            <ChevronDown size={13} />
          </ClientButton>
          {showExportMenu && (
            <div style={{ position: 'absolute', top: '110%', left: 0, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', zIndex: 50, minWidth: 180, boxShadow: '0 8px 24px rgba(15,23,42,0.10)' }}>
              {[
                { label: 'تصدير المبيعات CSV', action: () => { exportSalesCSV(); setShowExportMenu(false) } },
                { label: 'تصدير PDF', action: () => { exportPDF(); setShowExportMenu(false) } },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.action}
                  style={{ display: 'block', width: '100%', textAlign: 'right', padding: '10px 16px', background: 'none', border: 'none', color: '#475569', fontSize: 13, fontFamily: 'Tajawal, sans-serif', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F1F5F9')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
          </>
        )}
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard icon={Car} label="زيارات اليوم" value={stats.todayVisits} color="#22D3EE" />
        <StatCard icon={TrendingUp} label="زيارات هذا الشهر" value={stats.monthVisits} color="#4F6EF7" />
        <StatCard icon={DollarSign} label={`إيرادات آخر ${days === 1 ? 'يوم' : days + ' يوم'}`} value={stats.revenue > 0 ? `${stats.revenue.toLocaleString()} ر.س` : '—'} sub="قبل الضريبة" color="#10B981" />
        <StatCard icon={Star} label="مكافآت ولاء" value={stats.milestones} sub={`وصلوا الغسلة ${threshold}`} color="#F59E0B" />
        <StatCard icon={Gift} label="غسلات مجانية" value={stats.freeWashCount} sub={stats.freeWashDiscount > 0 ? `خصم ${stats.freeWashDiscount.toFixed(0)} ر.س` : undefined} color="#F97316" />
        <StatCard icon={Users} label="إجمالي العملاء" value={customers.length} sub="مسجلون في النظام" color="#8B5CF6" />
      </div>

      <ClientInsightPanel
        title="قرارات جاهزة من التقرير"
        description="بدل قراءة الرسوم فقط، هذه توصيات مباشرة للمالك لرفع المبيعات وتقليل الهدر."
        items={reportInsights}
      />

      {/* Daily visits chart */}
      <div style={{
        background: '#FAFAFA', border: '1px solid #E2E8F0',
        borderRadius: 18, padding: '20px 22px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <BarChart3 size={16} color="#22D3EE" />
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: 0 }}>
            الزيارات اليومية — آخر {Math.min(days, 30)} يوم
          </h2>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={stats.dailyChart}>
            <defs>
              <linearGradient id="cwVisitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1565C0" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#1565C0" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fill: '#415169', fontSize: 10, fontFamily: 'Tajawal' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#415169', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="visits" name="visits" stroke="#1565C0" strokeWidth={2.5} fill="url(#cwVisitGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Payment breakdown */}
      {Object.keys(stats.paymentBreakdown).length > 0 && (
        <div style={{ background: '#FAFAFA', border: '1px solid #E2E8F0', borderRadius: 18, padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <DollarSign size={15} color="#6366F1" />
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: 0 }}>توزيع طرق الدفع — هذا الشهر</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12 }}>
            {Object.entries(stats.paymentBreakdown).map(([pm, amount]) => {
              const labels: Record<string, string> = { cash: 'كاش', mada: 'مدى', visa: 'فيزا', bank_transfer: 'تحويل', stc_pay: 'STC Pay', other: 'أخرى' }
              return (
                <div key={pm} style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', marginBottom: 4 }}>{labels[pm] || pm}</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', fontFamily: 'Sora, sans-serif' }}>{amount.toFixed(0)}</p>
                  <p style={{ fontSize: 10, color: '#475569', fontFamily: 'Tajawal, sans-serif' }}>ر.س</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>

        {/* Revenue chart */}
        <div style={{
          background: '#FAFAFA', border: '1px solid #E2E8F0',
          borderRadius: 18, padding: '20px 22px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <DollarSign size={15} color="#10B981" />
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: 0 }}>الإيرادات اليومية</h2>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={stats.dailyChart.slice(-7)}>
              <XAxis dataKey="date" tick={{ fill: '#415169', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#415169', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="revenue" name="revenue" fill="#059669" radius={[4, 4, 0, 0]} fillOpacity={0.88} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top customers */}
        <div style={{
          background: '#FAFAFA', border: '1px solid #E2E8F0',
          borderRadius: 18, overflow: 'hidden',
        }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={15} color="#8B5CF6" />
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: 0 }}>أكثر العملاء زيارة</h2>
          </div>
          {topCustomers.length === 0 ? (
            <div style={{ padding: '28px 20px', textAlign: 'center', color: '#475569', fontFamily: 'Tajawal, sans-serif', fontSize: 13 }}>
              لا يوجد بيانات بعد
            </div>
          ) : topCustomers.map((c, i) => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px',
              borderBottom: i < topCustomers.length - 1 ? '1px solid #E2E8F0' : 'none',
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#475569', fontFamily: 'Sora, sans-serif', width: 20, textAlign: 'center' }}>
                {i + 1}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', fontFamily: 'Tajawal, sans-serif' }}>
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
            background: '#FAFAFA', border: '1px solid #E2E8F0',
            borderRadius: 18, overflow: 'hidden',
          }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Car size={15} color="#4F6EF7" />
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: 0 }}>أكثر الخدمات طلباً</h2>
            </div>
            {stats.services.map(([name, count], i) => {
              const max = stats.services[0][1]
              return (
                <div key={name} style={{ padding: '12px 20px', borderBottom: i < stats.services.length - 1 ? '1px solid #E2E8F0' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: '#1E293B', fontFamily: 'Tajawal, sans-serif' }}>{name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#4F6EF7', fontFamily: 'Sora, sans-serif' }}>{count}</span>
                  </div>
                  <div style={{ height: 4, background: '#F8FAFC', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${(count / max) * 100}%`, background: '#4F6EF7', borderRadius: 2 }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Worker performance */}
        {stats.workerStats.length > 0 && (
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,191,255,0.22)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 16px rgba(13,27,62,0.07)' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(0,191,255,0.15)', display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(90deg,#EAF4FF,#F0F7FF)' }}>
              <Users size={15} color="#1565C0" />
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0D1B3E', fontFamily: 'Cairo, sans-serif', margin: 0 }}>أداء الموظفين</h2>
            </div>
            {stats.workerStats.map((w, i) => {
              const max = stats.workerStats[0].count
              return (
                <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px', borderBottom: i < stats.workerStats.length - 1 ? '1px solid rgba(0,191,255,0.08)' : 'none' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#8EA4C0', fontFamily: 'Sora, sans-serif', width: 22, textAlign: 'center' }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0D1B3E', fontFamily: 'Tajawal, sans-serif', marginBottom: 5 }}>{w.name}</div>
                    <div style={{ height: 6, borderRadius: 4, background: 'rgba(0,191,255,0.12)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg,#1565C0,#00BFFF)', width: `${(w.count / max) * 100}%`, transition: 'width 0.4s' }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: 48 }}>
                    <strong style={{ fontSize: 18, fontWeight: 800, color: '#1565C0', fontFamily: 'Sora, sans-serif' }}>{w.count}</strong>
                    <div style={{ fontSize: 10, color: '#5A6E85', fontFamily: 'Tajawal, sans-serif' }}>سيارة</div>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: 72 }}>
                    <strong style={{ fontSize: 14, fontWeight: 700, color: '#059669', fontFamily: 'Sora, sans-serif' }}>{w.revenue.toFixed(0)}</strong>
                    <div style={{ fontSize: 10, color: '#5A6E85', fontFamily: 'Tajawal, sans-serif' }}>ر.س</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
    </FeatureLock>
  )
}
