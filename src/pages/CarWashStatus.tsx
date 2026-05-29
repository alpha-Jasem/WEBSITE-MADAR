import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Car, CheckCircle2, Clock, Droplets, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getDailyTicketCode } from '../lib/carWashTickets'
import { isSelfCheckinPending } from '../lib/selfCheckin'
import type { QueueStatus } from '../types'

type StatusCompany = {
  id: string
  name: string
  webhook_token: string | null
}

type StatusQueueItem = {
  id: string
  company_id: string
  customer_name: string
  phone: string | null
  car_type: string | null
  plate: string | null
  service_name: string | null
  status: QueueStatus
  notes: string | null
  created_at: string
  delivered_at: string | null
}

const STATUS_STEPS: { status: QueueStatus | 'approved'; label: string; icon: React.ElementType }[] = [
  { status: 'received', label: 'تم التسجيل', icon: Clock },
  { status: 'approved', label: 'اعتمدها الموظف', icon: ShieldCheck },
  { status: 'washing', label: 'قيد الغسيل', icon: Droplets },
  { status: 'ready', label: 'جاهزة للاستلام', icon: Sparkles },
  { status: 'delivered', label: 'تم التسليم', icon: CheckCircle2 },
]

const ORDER: Record<string, number> = {
  received: 1,
  approved: 2,
  washing: 3,
  drying: 3,
  ready: 4,
  delivered: 5,
}

function statusTitle(item: StatusQueueItem) {
  if (isSelfCheckinPending(item.notes)) return 'طلبك بانتظار اعتماد الموظف'
  if (item.status === 'received') return 'تم تسجيل سيارتك'
  if (item.status === 'washing' || item.status === 'drying') return 'سيارتك قيد الخدمة'
  if (item.status === 'ready') return 'سيارتك جاهزة للاستلام'
  if (item.status === 'delivered') return 'تم تسليم السيارة'
  return 'تم تحديث حالة السيارة'
}

export function CarWashStatus() {
  const { token = '', queueId = '' } = useParams()
  const [company, setCompany] = useState<StatusCompany | null>(null)
  const [item, setItem] = useState<StatusQueueItem | null>(null)
  const [dayItems, setDayItems] = useState<{ id: string; created_at: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    let co: any = null
    const rpcResult = await supabase.rpc('get_public_checkin_company', { checkin_token: token })
    if (rpcResult.data?.[0]) {
      co = rpcResult.data[0]
    } else {
      const direct = await supabase
        .from('companies')
        .select('id, name, webhook_token')
        .eq('webhook_token', token)
        .maybeSingle()
      co = direct.data
    }

    if (!co) {
      const fallback = await supabase
        .from('companies')
        .select('id, name, webhook_token')
        .eq('public_checkin_token', token)
        .maybeSingle()
      co = fallback.data
    }

    if (!co) {
      setError('رابط المتابعة غير صحيح.')
      setLoading(false)
      return
    }

    const { data: queueItem } = await supabase
      .from('cw_queue')
      .select('id, company_id, customer_name, phone, car_type, plate, service_name, status, notes, created_at, delivered_at')
      .eq('company_id', co.id)
      .eq('id', queueId)
      .maybeSingle()

    if (!queueItem) {
      setError('لم يتم العثور على السيارة.')
      setLoading(false)
      return
    }

    const todayStart = new Date(queueItem.created_at)
    todayStart.setHours(0, 0, 0, 0)
    const { data: sameDay } = await supabase
      .from('cw_queue')
      .select('id, created_at')
      .eq('company_id', co.id)
      .gte('created_at', todayStart.toISOString())
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true })

    setCompany(co as StatusCompany)
    setItem(queueItem as StatusQueueItem)
    setDayItems((sameDay || []) as { id: string; created_at: string }[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [token, queueId])

  useEffect(() => {
    if (!company?.id) return
    const channel = supabase
      .channel(`public_status_${queueId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cw_queue', filter: `id=eq.${queueId}` }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [company?.id, queueId])

  const ticket = useMemo(() => item ? getDailyTicketCode(dayItems, item.id) : '', [dayItems, item])
  const progress = item ? (isSelfCheckinPending(item.notes) ? 1 : item.status === 'received' ? 2 : ORDER[item.status] || 1) : 1

  if (loading) {
    return (
      <main className="self-checkin-page" dir="rtl">
        <div className="self-checkin-state">
          <Loader2 className="animate-spin" size={28} />
          <span>جاري تحميل حالة السيارة...</span>
        </div>
      </main>
    )
  }

  if (error || !item || !company) {
    return (
      <main className="self-checkin-page" dir="rtl">
        <div className="self-checkin-card self-checkin-state">
          <ShieldCheck size={34} />
          <h1>الرابط غير متاح</h1>
          <p>{error}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="self-checkin-page" dir="rtl">
      <section className="status-page-card">
        <img src="/logo-main.png" alt="Madar" />
        <span>{company.name}</span>
        <h1>{statusTitle(item)}</h1>
        <div className="self-checkin-ticket">{ticket}</div>

        <div className="status-car-summary">
          <div>
            <small>العميل</small>
            <strong>{item.customer_name}</strong>
          </div>
          <div>
            <small>السيارة</small>
            <strong>{item.car_type || 'سيارة'}{item.plate ? ` • ${item.plate}` : ''}</strong>
          </div>
          <div>
            <small>الخدمة</small>
            <strong>{item.service_name || 'خدمة مغسلة'}</strong>
          </div>
        </div>

        <div className="status-timeline">
          {STATUS_STEPS.map((step, index) => {
            const done = progress >= index + 1
            const Icon = step.icon
            return (
              <div className={`status-step${done ? ' done' : ''}`} key={step.label}>
                <div><Icon size={18} /></div>
                <span>{step.label}</span>
              </div>
            )
          })}
        </div>

        <Link to={`/checkin/${token}`} className="self-checkin-status-link">
          <Car size={16} />
          تسجيل سيارة أخرى
        </Link>
      </section>
    </main>
  )
}
