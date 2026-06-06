import { useEffect, useMemo, useState } from 'react'
import { Car, CheckCircle2, Clock, Droplets, Loader2, Radio, Sparkles } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { getDailyTicketCode } from '../../../lib/carWashTickets'
import type { QueueStatus } from '../../../types'

type DisplayCar = {
  id: string
  customer_name: string
  car_type: string | null
  plate: string | null
  service_name: string | null
  status: QueueStatus
  created_at: string
  delivered_at: string | null
  worker?: { name: string } | null
}

const DISPLAY_STATUS: Record<QueueStatus, { label: string; short: string }> = {
  received: { label: 'ظپظٹ ط§ظ„ط§ظ†طھط¸ط§ط±', short: 'ط§ظ†طھط¸ط§ط±' },
  washing: { label: 'ظ‚ظٹط¯ ط§ظ„ط؛ط³ظٹظ„', short: 'ط؛ط³ظٹظ„' },
  drying: { label: 'ظ‚ظٹط¯ ط§ظ„طھط¬ظپظٹظپ', short: 'طھط¬ظپظٹظپ' },
  ready: { label: 'ط¬ط§ظ‡ط²ط© ظ„ظ„ط§ط³طھظ„ط§ظ…', short: 'ط¬ط§ظ‡ط²ط©' },
  delivered: { label: 'طھظ… ط§ظ„طھط³ظ„ظٹظ…', short: 'ط³ظ„ظ…طھ' },
  cancelled: { label: 'ظ…ظ„ط؛ظٹط©', short: 'ظ…ظ„ط؛ظٹط©' },
}

function plateCode(items: DisplayCar[], item: DisplayCar) {
  const ticket = getDailyTicketCode(items, item.id)
  const plate = item.plate?.replace(/\s+/g, ' ').trim()
  if (plate) return `${ticket}`
  return ticket
}

function minutesSince(value: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000))
  if (mins < 1) return 'ط§ظ„ط¢ظ†'
  if (mins < 60) return `${mins.toLocaleString('ar-SA')} ط¯`
  const hours = Math.floor(mins / 60)
  const rest = mins % 60
  return `${hours.toLocaleString('ar-SA')} ط³ ${rest.toLocaleString('ar-SA')} ط¯`
}

function currentTime() {
  return new Intl.DateTimeFormat('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(new Date())
}

export function CarWashQueueDisplay() {
  const { companyId, company, loading: authLoading } = useClientCompany()
  const [items, setItems] = useState<DisplayCar[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(currentTime())

  const loadItems = async () => {
    if (!companyId) return
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { data } = await supabase
      .from('cw_queue')
      .select('id, customer_name, car_type, plate, service_name, status, created_at, delivered_at, worker:cw_workers(name)')
      .eq('company_id', companyId)
      .gte('created_at', todayStart.toISOString())
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true })

    setItems((data || []) as unknown as DisplayCar[])
    setLoading(false)
  }

  useEffect(() => {
    if (authLoading || !companyId) return
    loadItems()

    const channel = supabase
      .channel(`cw_queue_display_${companyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cw_queue', filter: `company_id=eq.${companyId}` }, loadItems)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [authLoading, companyId])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(currentTime()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  const groups = useMemo(() => {
    const waiting = items.filter(item => item.status === 'received')
    const working = items.filter(item => item.status === 'washing' || item.status === 'drying')
    const ready = items.filter(item => item.status === 'ready')
    const delivered = items
      .filter(item => item.status === 'delivered')
      .sort((a, b) => new Date(b.delivered_at || b.created_at).getTime() - new Date(a.delivered_at || a.created_at).getTime())
      .slice(0, 6)
    return { waiting, working, ready, delivered }
  }, [items])

  if (authLoading || loading) {
    return (
      <div className="cw-display-loading" dir="rtl">
        <Loader2 className="animate-spin" size={34} />
        <span>ط¬ط§ط±ظٹ طھط¬ظ‡ظٹط² ط´ط§ط´ط© ط§ظ„طھط´ط؛ظٹظ„...</span>
      </div>
    )
  }

  return (
    <main className="cw-display" dir="rtl">
      <header className="cw-display-header">
        <div className="cw-display-brand">
          <div>
            <strong>{company?.name || 'ط´ط§ط´ط© طھط´ط؛ظٹظ„ ط§ظ„ظ…ط؛ط³ظ„ط©'}</strong>
          </div>
        </div>

        <div className="cw-display-live">
          <Radio size={18} />
          <span>ظ…ط¨ط§ط´ط±</span>
          <strong>{now}</strong>
        </div>
      </header>

      <section className="cw-display-hero">
        <div>
          <span>ط´ط§ط´ط© ط§ظ„ط³ظٹط§ط±ط§طھ</span>
          <h1>طھط§ط¨ط¹ ط­ط§ظ„ط© ط³ظٹط§ط±طھظƒ</h1>
        </div>
        <div className="cw-display-counter">
          <small>ط¬ط§ظ‡ط²ط© ط§ظ„ط¢ظ†</small>
          <strong>{groups.ready.length.toLocaleString('ar-SA')}</strong>
        </div>
      </section>

      <section className="cw-display-grid">
        <DisplayColumn
          tone="waiting"
          icon={Clock}
          title="ظپظٹ ط§ظ„ط§ظ†طھط¸ط§ط±"
          subtitle="طھظ… ط§ظ„ط§ط³طھظ„ط§ظ…"
          items={groups.waiting}
          allItems={items}
          limit={6}
        />
        <DisplayColumn
          tone="working"
          icon={Droplets}
          title="ظ‚ظٹط¯ ط§ظ„ط®ط¯ظ…ط©"
          subtitle="ط؛ط³ظٹظ„ ظˆطھط¬ظپظٹظپ"
          items={groups.working}
          allItems={items}
          limit={6}
        />
        <DisplayColumn
          tone="ready"
          icon={CheckCircle2}
          title="ط¬ط§ظ‡ط²ط© ظ„ظ„ط§ط³طھظ„ط§ظ…"
          subtitle="طھظˆط¬ظ‡ ظ„ظ„ط§ط³طھظ„ط§ظ…"
          items={groups.ready}
          allItems={items}
          limit={8}
          featured
        />
      </section>

      <footer className="cw-display-footer">
        <div className="cw-display-footer-title">
          <Sparkles size={18} />
          <span>ط¢ط®ط± ط§ظ„ط³ظٹط§ط±ط§طھ ط§ظ„ظ…ط³ظ„ظ…ط©</span>
        </div>
        <div className="cw-display-ticker">
          {groups.delivered.length === 0 ? (
            <span className="cw-display-muted">ظ„ط§ طھظˆط¬ط¯ ط³ظٹط§ط±ط§طھ ظ…ط³ظ„ظ…ط© ط­طھظ‰ ط§ظ„ط¢ظ†</span>
          ) : (
            groups.delivered.map(item => (
              <span key={item.id}>{plateCode(items, item)}</span>
            ))
          )}
        </div>
      </footer>
    </main>
  )
}

type DisplayColumnProps = {
  tone: 'waiting' | 'working' | 'ready'
  icon: React.ElementType
  title: string
  subtitle: string
  items: DisplayCar[]
  allItems: DisplayCar[]
  limit: number
  featured?: boolean
}

function DisplayColumn({ tone, icon: Icon, title, subtitle, items, allItems, limit, featured }: DisplayColumnProps) {
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(items.length / limit))

  useEffect(() => {
    setPage(0)
  }, [items.length])

  useEffect(() => {
    if (totalPages <= 1) return
    const id = setInterval(() => setPage(p => (p + 1) % totalPages), 5000)
    return () => clearInterval(id)
  }, [totalPages])

  const safePage = Math.min(page, totalPages - 1)
  const visible = items.slice(safePage * limit, (safePage + 1) * limit)

  return (
    <section className={`cw-display-column ${tone}${featured ? ' featured' : ''}`}>
      <div className="cw-display-column-head">
        <div>
          <span>{subtitle}</span>
          <h2>{title}</h2>
        </div>
        <div className="cw-display-column-icon">
          <Icon size={26} />
        </div>
      </div>

      <div className="cw-display-list">
        {visible.length === 0 ? (
          <div className="cw-display-empty">
            <Car size={34} />
            <span>ظ„ط§ طھظˆط¬ط¯ ط³ظٹط§ط±ط§طھ</span>
          </div>
        ) : (
          visible.map(item => (
            <article className="cw-display-car" key={item.id}>
              <div className="cw-display-plate">{getDailyTicketCode(allItems, item.id)}</div>
              <div className="cw-display-car-meta">
                <strong>{DISPLAY_STATUS[item.status].label}</strong>
                <span>{item.plate ? `${item.plate} â€¢ ` : ''}{item.service_name || item.car_type || 'ط®ط¯ظ…ط© ظ…ط؛ط³ظ„ط©'}{item.worker?.name ? ` â€¢ ${item.worker.name}` : ''}</span>
              </div>
              <small>{minutesSince(item.status === 'delivered' ? (item.delivered_at || item.created_at) : item.created_at)}</small>
            </article>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="cw-display-page-dots">
          {Array.from({ length: totalPages }).map((_, i) => (
            <span key={i} className={i === safePage ? 'active' : ''} />
          ))}
        </div>
      )}
    </section>
  )
}
