import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, Clock, Droplets, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getDailyTicketCode } from '../lib/carWashTickets'
import { isSelfCheckinPending } from '../lib/selfCheckin'
import type { QueueStatus } from '../types'

type StatusCompany = {
  id: string
  name: string
  logo_url?: string | null
  webhook_token: string | null
}

type StatusQueueItem = {
  id: string
  company_id: string
  customer_name: string
  phone: string | null
  plate: string | null
  service_name: string | null
  status: QueueStatus
  notes: string | null
  created_at: string
  delivered_at: string | null
}

type DayQueueItem = Pick<StatusQueueItem, 'id' | 'created_at' | 'status'>

const STATUS_STEPS: { key: string; label: string; sub: string; icon: React.ElementType }[] = [
  { key: 'waiting', label: 'بانتظار الدور', sub: 'سيارتك مسجلة في المسار', icon: Clock },
  { key: 'washing', label: 'جاري الغسيل', sub: 'الفريق يعمل على السيارة', icon: Droplets },
  { key: 'ready', label: 'جاهزة للاستلام', sub: 'تقدر تتوجه للكاشير', icon: Sparkles },
  { key: 'delivered', label: 'تم التسليم', sub: 'شكراً لزيارتك', icon: CheckCircle2 },
]

function statusLevel(item: StatusQueueItem) {
  if (item.status === 'delivered') return 4
  if (item.status === 'ready') return 3
  if (item.status === 'washing' || item.status === 'drying') return 2
  return 1
}

function statusTitle(item: StatusQueueItem) {
  if (isSelfCheckinPending(item.notes)) return 'طلبك بانتظار اعتماد الموظف'
  if (item.status === 'received') return 'رقمك في المسار'
  if (item.status === 'washing' || item.status === 'drying') return 'سيارتك جاري غسلها'
  if (item.status === 'ready') return 'سيارتك جاهزة للاستلام'
  if (item.status === 'delivered') return 'تم تسليم السيارة'
  return 'تم تحديث حالة السيارة'
}

function statusHint(item: StatusQueueItem) {
  if (isSelfCheckinPending(item.notes)) return 'سيتم اعتماد التسجيل من الموظف، وبعدها تبدأ متابعة الحالة مباشرة.'
  if (item.status === 'ready') return 'احتفظ برقمك وتوجه للاستلام عند الكاشير.'
  if (item.status === 'delivered') return 'نتمنى كانت تجربتك ممتازة.'
  return 'هذه الصفحة تتحدث تلقائياً عند تحريك السيارة في لوحة التشغيل.'
}

export function CarWashStatus() {
  const { token = '', queueId = '' } = useParams()
  const [company, setCompany] = useState<StatusCompany | null>(null)
  const [item, setItem] = useState<StatusQueueItem | null>(null)
  const [dayItems, setDayItems] = useState<DayQueueItem[]>([])
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
        .select('id, name, logo_url, webhook_token')
        .eq('webhook_token', token)
        .maybeSingle()
      co = direct.data
    }

    if (!co) {
      const fallback = await supabase
        .from('companies')
        .select('id, name, logo_url, webhook_token')
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
      .select('id, company_id, customer_name, phone, plate, service_name, status, notes, created_at, delivered_at')
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
      .select('id, created_at, status')
      .eq('company_id', co.id)
      .gte('created_at', todayStart.toISOString())
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true })

    setCompany(co as StatusCompany)
    setItem(queueItem as StatusQueueItem)
    setDayItems((sameDay || []) as DayQueueItem[])
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
  const progress = item ? statusLevel(item) : 1
  const position = useMemo(() => {
    if (!item) return { ahead: 0, estimate: 0 }
    const currentTime = new Date(item.created_at).getTime()
    const ahead = dayItems.filter(row =>
      row.id !== item.id &&
      row.status !== 'delivered' &&
      new Date(row.created_at).getTime() < currentTime
    ).length
    return { ahead, estimate: ahead > 0 ? ahead * 12 : 0 }
  }, [dayItems, item])

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
        <img src={company.logo_url || '/logo-main.png'} alt={company.name} />
        <span>{company.name}</span>
        <h1>{statusTitle(item)}</h1>
        <p className="status-live-copy">{statusHint(item)}</p>
        <div className="self-checkin-ticket">{ticket}</div>

        <div className="status-car-summary">
          <div>
            <small>العميل</small>
            <strong>{item.customer_name}</strong>
          </div>
          <div>
            <small>الخدمة</small>
            <strong>{item.service_name || 'خدمة مغسلة'}</strong>
          </div>
          <div>
            <small>المتابعة</small>
            <strong>Live</strong>
          </div>
        </div>

        {item.status !== 'delivered' && (
          <div className="status-queue-position">
            <div>
              <small>ترتيبك الآن</small>
              <strong>{position.ahead > 0 ? `قبلك ${position.ahead} سيارة` : 'أنت التالي تقريباً'}</strong>
            </div>
            <div>
              <small>تقدير الانتظار</small>
              <strong>{position.estimate > 0 ? `${position.estimate} دقيقة تقريباً` : 'قريب جداً'}</strong>
            </div>
          </div>
        )}

        <div className="status-timeline simple">
          {STATUS_STEPS.map((step, index) => {
            const done = progress >= index + 1
            const active = progress === index + 1
            const Icon = step.icon
            return (
              <div className={`status-step${done ? ' done' : ''}${active ? ' active' : ''}`} key={step.key}>
                <div><Icon size={18} /></div>
                <span>{step.label}</span>
                <small>{step.sub}</small>
              </div>
            )
          })}
        </div>

      </section>
    </main>
  )
}
