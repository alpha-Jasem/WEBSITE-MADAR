import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowUpLeft,
  BarChart3,
  Car,
  CheckCircle2,
  Clock,
  Droplets,
  Gift,
  Loader2,
  MessageCircle,
  Monitor,
  Plus,
  Receipt,
  Sparkles,
  Trophy,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { getDailyTicketCode } from '../../../lib/carWashTickets'

type QueueStatus = 'received' | 'washing' | 'drying' | 'ready' | 'delivered' | 'cancelled'

type QueueCar = {
  id: string
  customer_name: string
  car_type: string | null
  plate: string | null
  service_name: string | null
  price: number | null
  total_amount: number | null
  status: QueueStatus
  created_at: string
}

type Customer = {
  id: string
  name: string | null
  phone: string
  total_visits: number
  free_washes_available: number | null
  loyalty_tier: 'bronze' | 'silver' | 'gold' | null
  last_visit_at: string | null
}

type Visit = {
  id: string
  customer_name: string | null
  phone: string | null
  service_name: string | null
  total_amount: number | null
  created_at: string
}

type WorkerScore = {
  worker_id: string | null
  price: number | null
  worker?: { name: string } | null
}

const STATUS_META: Record<Exclude<QueueStatus, 'cancelled'>, { label: string; color: string }> = {
  received: { label: 'استلام', color: '#00BFFF' },
  washing: { label: 'قيد الخدمة', color: '#1565C0' },
  drying: { label: 'قيد الخدمة', color: '#1565C0' },
  ready: { label: 'جاهزة', color: '#10B981' },
  delivered: { label: 'تم التسليم', color: '#0D1B3E' },
}

function money(value: number) {
  return value.toLocaleString('ar-SA', { maximumFractionDigits: 0 })
}

function elapsed(value: string) {
  const mins = Math.floor((Date.now() - new Date(value).getTime()) / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `${mins} د`
  return `${Math.floor(mins / 60)} س`
}

function formatPhone(phone?: string | null) {
  if (!phone) return '--'
  const p = phone.replace(/\D/g, '')
  if (p.startsWith('966') && p.length === 12) return `0${p.slice(3, 6)} ${p.slice(6, 9)} ${p.slice(9)}`
  return phone
}

export function CarWashOverview() {
  const { companyId, company, loading: authLoading } = useClientCompany()
  const [loading, setLoading] = useState(true)
  const [queue, setQueue] = useState<QueueCar[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [visits, setVisits] = useState<Visit[]>([])
  const [workers, setWorkers] = useState<WorkerScore[]>([])
  const [pendingReviews, setPendingReviews] = useState(0)

  const load = async () => {
    if (!companyId) return
    setLoading(true)

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayIso = todayStart.toISOString()
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

    const [
      { data: queueData },
      { data: customerData },
      { data: visitData },
      { data: workerData },
      { count: pendingCount },
    ] = await Promise.all([
      supabase
        .from('cw_queue')
        .select('id, customer_name, car_type, plate, service_name, price, total_amount, status, created_at')
        .eq('company_id', companyId)
        .gte('created_at', todayIso)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: true }),
      supabase
        .from('cw_customers')
        .select('id, name, phone, total_visits, free_washes_available, loyalty_tier, last_visit_at')
        .eq('company_id', companyId)
        .order('last_visit_at', { ascending: false })
        .limit(8),
      supabase
        .from('cw_visits')
        .select('id, customer_name, phone, service_name, total_amount, created_at')
        .eq('company_id', companyId)
        .gte('created_at', todayIso)
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('cw_visits')
        .select('worker_id, price, worker:cw_workers(name)')
        .eq('company_id', companyId)
        .gte('created_at', todayIso),
      supabase
        .from('cw_visits')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('review_request_sent', false)
        .lt('created_at', twoHoursAgo),
    ])

    setQueue((queueData || []) as QueueCar[])
    setCustomers((customerData || []) as Customer[])
    setVisits((visitData || []) as Visit[])
    setWorkers((workerData || []) as unknown as WorkerScore[])
    setPendingReviews(pendingCount || 0)
    setLoading(false)
  }

  useEffect(() => {
    if (authLoading || !companyId) return
    load()

    const channel = supabase
      .channel(`cw_command_center_${companyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cw_queue', filter: `company_id=eq.${companyId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cw_visits', filter: `company_id=eq.${companyId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cw_customers', filter: `company_id=eq.${companyId}` }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [authLoading, companyId])

  const stats = useMemo(() => {
    const active = queue.filter(item => item.status !== 'delivered')
    const delivered = queue.filter(item => item.status === 'delivered')
    const ready = queue.filter(item => item.status === 'ready')
    const inService = queue.filter(item => item.status === 'washing' || item.status === 'drying')
    const revenue = delivered.reduce((sum, item) => sum + (item.total_amount ?? item.price ?? 0), 0)
    return { active, delivered, ready, inService, revenue }
  }, [queue])

  const bestWorker = useMemo(() => {
    const scores = new Map<string, { name: string; cars: number; revenue: number }>()
    for (const row of workers) {
      if (!row.worker_id || !row.worker?.name) continue
      const current = scores.get(row.worker_id) || { name: row.worker.name, cars: 0, revenue: 0 }
      current.cars += 1
      current.revenue += row.price || 0
      scores.set(row.worker_id, current)
    }
    return Array.from(scores.values()).sort((a, b) => b.cars - a.cars)[0]
  }, [workers])

  const freeWashCustomers = customers.filter(c => (c.free_washes_available || 0) > 0)
  const nextCars = queue.filter(item => item.status !== 'delivered').slice(0, 5)

  if (authLoading || loading) {
    return (
      <div className="madar-center-state">
        <Loader2 size={22} className="animate-spin" />
        <span>جاري تحميل مركز اليوم...</span>
      </div>
    )
  }

  return (
    <div className="cw-command" dir="rtl">
      <section className="cw-hero">
        <div>
          <span className="cw-eyebrow">مركز يوم المغسلة</span>
          <h1>{company?.name ? `صباح التشغيل، ${company.name}` : 'لوحة تشغيل المغسلة'}</h1>
          <p>تابع السيارات النشطة، التسليمات، الإيراد، العملاء والولاء من شاشة واحدة مصممة لسرعة القرار داخل المغسلة.</p>
        </div>
        <div className="cw-hero-actions">
          <Link to="/client/queue" className="cw-primary-action">
            <Car size={18} />
            فتح لوحة التشغيل
          </Link>
          <Link to="/client/queue-display" className="cw-secondary-action">
            <Monitor size={17} />
            شاشة العرض
          </Link>
          <Link to="/client/finance" className="cw-secondary-action">
            <Receipt size={17} />
            المالية
          </Link>
        </div>
      </section>

      <section className="cw-kpi-grid">
        <Kpi icon={Car} label="سيارات في المسار" value={stats.active.length} hint={`${stats.inService.length} قيد الخدمة`} color="#00BFFF" />
        <Kpi icon={CheckCircle2} label="جاهزة للتسليم" value={stats.ready.length} hint="تحتاج تسليم ودفع" color="#10B981" />
        <Kpi icon={Wallet} label="إيراد اليوم" value={`${money(stats.revenue)} ر.س`} hint={`${stats.delivered.length} سيارة مسلمة`} color="#1565C0" />
        <Kpi icon={MessageCircle} label="تقييمات معلقة" value={pendingReviews} hint="جاهزة لطلب واتساب" color={pendingReviews > 0 ? '#F59E0B' : '#10B981'} />
      </section>

      <section className="cw-main-grid">
        <div className="cw-panel cw-queue-panel">
          <PanelHead icon={Zap} title="المسار السريع الآن" action="إدارة المسار" to="/client/queue" />
          <div className="cw-lane-strip">
            <Lane label="استلام" value={queue.filter(q => q.status === 'received').length} color="#00BFFF" />
            <Lane label="قيد الخدمة" value={stats.inService.length} color="#1565C0" />
            <Lane label="جاهزة" value={stats.ready.length} color="#10B981" />
            <Lane label="تم التسليم" value={stats.delivered.length} color="#0D1B3E" />
          </div>
          <div className="cw-car-list">
            {nextCars.length === 0 ? (
              <EmptyState icon={Droplets} text="لا توجد سيارات نشطة الآن" />
            ) : (
              nextCars.map(car => {
                const meta = STATUS_META[car.status === 'cancelled' ? 'received' : car.status]
                return (
                  <div className="cw-car-row" key={car.id}>
                    <div className="cw-car-icon" style={{ color: meta.color, background: `${meta.color}14` }}><Car size={17} /></div>
                    <div>
                      <strong>{getDailyTicketCode(queue, car.id)} · {car.customer_name}</strong>
                      <span>{car.car_type || 'سيارة'}{car.plate ? ` · ${car.plate}` : ''}</span>
                    </div>
                    <em style={{ color: meta.color, background: `${meta.color}14` }}>{meta.label}</em>
                    <small>{elapsed(car.created_at)}</small>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="cw-panel">
          <PanelHead icon={Trophy} title="أفضل أداء اليوم" />
          <div className="cw-performance-card">
            <div className="cw-trophy"><Trophy size={25} /></div>
            <strong>{bestWorker?.name || 'لا يوجد موظف متصدر بعد'}</strong>
            <span>{bestWorker ? `${bestWorker.cars} سيارة · ${money(bestWorker.revenue)} ر.س` : 'يظهر بعد أول تسليم اليوم'}</span>
          </div>
          <div className="cw-alert-stack">
            <Alert icon={Gift} title="عملاء لديهم مكافآت" value={freeWashCustomers.length} tone="#F59E0B" />
            <Alert icon={MessageCircle} title="طلبات تقييم معلقة" value={pendingReviews} tone={pendingReviews > 0 ? '#F59E0B' : '#10B981'} />
          </div>
        </div>
      </section>

      <section className="cw-bottom-grid">
        <div className="cw-panel">
          <PanelHead icon={Users} title="أفضل العملاء" action="كل العملاء" to="/client/leads" />
          <div className="cw-customer-list">
            {customers.length === 0 ? (
              <EmptyState icon={Users} text="لا يوجد عملاء بعد" />
            ) : customers.slice(0, 6).map(customer => (
              <div className="cw-customer-row" key={customer.id}>
                <i>{(customer.name || customer.phone).slice(0, 1)}</i>
                <div>
                  <strong>{customer.name || 'عميل بدون اسم'}</strong>
                  <span>{formatPhone(customer.phone)}</span>
                </div>
                <em>{customer.total_visits} زيارة</em>
              </div>
            ))}
          </div>
        </div>

        <div className="cw-panel">
          <PanelHead icon={Clock} title="آخر الزيارات" />
          <div className="cw-visit-list">
            {visits.length === 0 ? (
              <EmptyState icon={Clock} text="لا توجد زيارات اليوم" />
            ) : visits.slice(0, 6).map(visit => (
              <div className="cw-visit-row" key={visit.id}>
                <div>
                  <strong>{visit.customer_name || 'عميل'}</strong>
                  <span>{visit.service_name || 'خدمة مغسلة'}</span>
                </div>
                <em>{visit.total_amount ? `${money(visit.total_amount)} ر.س` : '--'}</em>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function Kpi({ icon: Icon, label, value, hint, color }: { icon: typeof Car; label: string; value: string | number; hint: string; color: string }) {
  return (
    <div className="cw-kpi">
      <div className="cw-kpi-top">
        <span>{label}</span>
        <i style={{ color, background: `${color}12` }}><Icon size={19} /></i>
      </div>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  )
}

function Lane({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="cw-lane">
      <span style={{ background: color }} />
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  )
}

function PanelHead({ icon: Icon, title, action, to }: { icon: typeof Car; title: string; action?: string; to?: string }) {
  return (
    <div className="cw-panel-head">
      <h2><Icon size={18} /> {title}</h2>
      {action && to && <Link to={to}>{action}<ArrowUpLeft size={14} /></Link>}
    </div>
  )
}

function Alert({ icon: Icon, title, value, tone }: { icon: typeof Car; title: string; value: number; tone: string }) {
  return (
    <div className="cw-mini-alert">
      <i style={{ color: tone, background: `${tone}12` }}><Icon size={16} /></i>
      <span>{title}</span>
      <strong style={{ color: tone }}>{value}</strong>
    </div>
  )
}

function EmptyState({ icon: Icon, text }: { icon: typeof Car; text: string }) {
  return (
    <div className="cw-empty">
      <Icon size={24} />
      <span>{text}</span>
    </div>
  )
}
