import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  Mail,
  Phone,
  Plus,
  Search,
  Target,
  TrendingUp,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'

type StageKey = 'new_lead' | 'contacted' | 'qualified' | 'meeting_booked' | 'proposal_sent' | 'won'

type Deal = {
  id: string
  company_name: string | null
  contact_name: string | null
  phone: string | null
  email: string | null
  sector: string | null
  source: string | null
  stage: StageKey
  price_expected: number | null
  price_sold: number | null
  created_at: string | null
  updated_at: string | null
}

const stages: Array<{ key: StageKey; label: string; hint: string; color: string; probability: number }> = [
  { key: 'new_lead', label: 'جديد', hint: 'دخل للنظام', color: '#64748B', probability: 10 },
  { key: 'contacted', label: 'تم التواصل', hint: 'مكالمة أو واتساب', color: '#00BFFF', probability: 25 },
  { key: 'qualified', label: 'مؤهل', hint: 'مناسب للبيع', color: '#1565C0', probability: 45 },
  { key: 'meeting_booked', label: 'اجتماع', hint: 'عرض مباشر', color: '#8B5CF6', probability: 65 },
  { key: 'proposal_sent', label: 'عرض مرسل', hint: 'بانتظار القرار', color: '#F59E0B', probability: 80 },
  { key: 'won', label: 'مغلق', hint: 'تم البيع', color: '#10B981', probability: 100 },
]

const stageAliases: Record<string, StageKey> = {
  new: 'new_lead',
  new_lead: 'new_lead',
  contacted: 'contacted',
  qualified: 'qualified',
  proposal: 'proposal_sent',
  proposal_sent: 'proposal_sent',
  meeting_booked: 'meeting_booked',
  negotiation: 'proposal_sent',
  won: 'won',
  converted: 'won',
}

function normalizeStage(value?: string | null): StageKey {
  return stageAliases[value || ''] ?? 'new_lead'
}

function dealValue(deal: Deal) {
  return Number(deal.price_sold ?? deal.price_expected ?? 0)
}

function formatSar(value: number) {
  return `${Math.round(value).toLocaleString('ar-SA')} ر.س`
}

function timeAgo(iso?: string | null) {
  if (!iso) return 'غير محدد'
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000)
  if (hours < 1) return 'قبل قليل'
  if (hours < 24) return `قبل ${hours} ساعة`
  return `قبل ${Math.floor(hours / 24)} يوم`
}

export const AdminPipeline = () => {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<StageKey | null>(null)
  const [view, setView] = useState<'board' | 'table'>('board')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('crm_leads')
      .select('id, company_name, contact_name, phone, email, sector, source, stage, price_expected, price_sold, created_at, updated_at')
      .not('stage', 'in', '(lost)')
      .order('updated_at', { ascending: false })
      .limit(160)

    setDeals(((data ?? []) as any[]).map(row => ({ ...row, stage: normalizeStage(row.stage) })))
    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel('admin_pipeline_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const filteredDeals = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return deals
    return deals.filter(deal =>
      [deal.company_name, deal.contact_name, deal.phone, deal.email, deal.sector, deal.source]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(needle))
    )
  }, [deals, search])

  const totals = useMemo(() => {
    const openDeals = filteredDeals.filter(deal => deal.stage !== 'won')
    const weighted = openDeals.reduce((sum, deal) => {
      const stage = stages.find(item => item.key === deal.stage)
      return sum + dealValue(deal) * ((stage?.probability ?? 10) / 100)
    }, 0)
    const wonDeals = filteredDeals.filter(deal => deal.stage === 'won')
    const wonRevenue = wonDeals.reduce((sum, deal) => sum + dealValue(deal), 0)
    const staleDeals = openDeals.filter(deal => {
      const updated = deal.updated_at || deal.created_at
      return updated && Date.now() - new Date(updated).getTime() > 7 * 24 * 3600000
    }).length
    return { openDeals, weighted, wonDeals, wonRevenue, staleDeals }
  }, [filteredDeals])

  const moveDeal = async (id: string, stage: StageKey) => {
    setDeals(prev => prev.map(deal => deal.id === id ? { ...deal, stage, updated_at: new Date().toISOString() } : deal))
    await supabase.from('crm_leads').update({ stage, updated_at: new Date().toISOString() }).eq('id', id)
  }

  if (loading) {
    return (
      <div className="admin-command-loading">
        <div />
        <p>جاري تحميل خط المبيعات...</p>
      </div>
    )
  }

  return (
    <div className="admin-pipeline">
      <section className="admin-pipeline-hero">
        <div>
          <span>CRM المبيعات</span>
          <h1>خط مبيعات واضح لبيع مدار للمغاسل والعيادات</h1>
          <p>تابع الفرص من أول تواصل إلى الإغلاق، حرّك الصفقة بين المراحل، واعرف أين تضيع القيمة قبل نهاية الشهر.</p>
        </div>
        <button type="button">
          <Plus size={16} />
          فرصة جديدة
        </button>
      </section>

      <section className="admin-metric-strip">
        {[
          { label: 'القيمة المرجحة', value: formatSar(totals.weighted), color: '#1565C0', icon: TrendingUp },
          { label: 'فرص مفتوحة', value: totals.openDeals.length, color: '#00BFFF', icon: Target },
          { label: 'إيراد مغلق', value: formatSar(totals.wonRevenue), color: '#10B981', icon: CheckCircle2 },
          { label: 'تحتاج متابعة', value: totals.staleDeals, color: '#F59E0B', icon: AlertTriangle },
        ].map(item => {
          const Icon = item.icon
          return (
            <article key={item.label}>
              <span style={{ background: item.color }} />
              <Icon size={18} style={{ color: item.color, marginBottom: 10 }} />
              <strong>{item.value}</strong>
              <small>{item.label}</small>
            </article>
          )
        })}
      </section>

      <section className="admin-pipeline-toolbar">
        <div className="admin-search">
          <Search size={15} />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="ابحث عن شركة، عميل، رقم، قطاع..." />
        </div>
        <div className="admin-pipeline-tabs">
          <button type="button" className={view === 'board' ? 'active' : ''} onClick={() => setView('board')}>المراحل</button>
          <button type="button" className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>جدول</button>
        </div>
      </section>

      {view === 'board' ? (
        <section className="admin-pipeline-board">
          {stages.map(stage => {
            const columnDeals = filteredDeals.filter(deal => deal.stage === stage.key)
            const total = columnDeals.reduce((sum, deal) => sum + dealValue(deal), 0)
            const isOver = dragOverStage === stage.key

            return (
              <article
                key={stage.key}
                className={isOver ? 'drag-over' : ''}
                style={{ '--stage-color': stage.color } as React.CSSProperties}
                onDragOver={event => { event.preventDefault(); setDragOverStage(stage.key) }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={() => {
                  if (draggingId) moveDeal(draggingId, stage.key)
                  setDraggingId(null)
                  setDragOverStage(null)
                }}
              >
                <header>
                  <div>
                    <h2>{stage.label}</h2>
                    <p>{stage.hint}</p>
                  </div>
                  <span>{columnDeals.length}</span>
                </header>
                <div className="admin-pipeline-column-total">{formatSar(total)}</div>

                <div className="admin-pipeline-card-list">
                  {columnDeals.map(deal => (
                    <div
                      key={deal.id}
                      className="admin-deal-card"
                      draggable
                      onDragStart={() => setDraggingId(deal.id)}
                      onDragEnd={() => setDraggingId(null)}
                    >
                      <div className="admin-deal-card-head">
                        <span><Building2 size={16} /></span>
                        <strong>{deal.company_name || deal.contact_name || 'فرصة بدون اسم'}</strong>
                      </div>
                      <p>{deal.sector || deal.source || 'خدمة مدار OS'}</p>
                      <div className="admin-deal-value">
                        <strong>{formatSar(dealValue(deal))}</strong>
                        <small>{stage.probability}%</small>
                      </div>
                      <div className="admin-deal-meta">
                        {deal.phone && <span><Phone size={12} />{deal.phone}</span>}
                        {deal.email && <span><Mail size={12} />{deal.email}</span>}
                      </div>
                      <footer>
                        <span><Clock size={12} />{timeAgo(deal.updated_at || deal.created_at)}</span>
                        <ArrowLeft size={13} />
                      </footer>
                    </div>
                  ))}

                  {columnDeals.length === 0 && (
                    <div className="admin-pipeline-empty">لا توجد فرص هنا</div>
                  )}
                </div>
              </article>
            )
          })}
        </section>
      ) : (
        <section className="admin-pipeline-table">
          <table>
            <thead>
              <tr>
                {['الشركة', 'القطاع', 'القيمة', 'المرحلة', 'التواصل', 'آخر تحديث'].map(header => <th key={header}>{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {filteredDeals.map(deal => {
                const stage = stages.find(item => item.key === deal.stage) ?? stages[0]
                return (
                  <tr key={deal.id}>
                    <td><strong>{deal.company_name || deal.contact_name || 'فرصة بدون اسم'}</strong></td>
                    <td>{deal.sector || deal.source || '-'}</td>
                    <td>{formatSar(dealValue(deal))}</td>
                    <td><span style={{ color: stage.color, background: `${stage.color}16` }}>{stage.label}</span></td>
                    <td>{deal.phone || deal.email || '-'}</td>
                    <td>{timeAgo(deal.updated_at || deal.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}

      <section className="admin-pipeline-side-grid">
        <article>
          <FileText size={20} />
          <h3>ملاحظات تشغيلية</h3>
          <p>الصفقات التي لا تتحرك خلال 7 أيام تظهر في مؤشر “تحتاج متابعة”. الأفضل ربطها لاحقًا بتذكير واتساب أو مهمة داخل الأدمن.</p>
        </article>
        <article>
          <TrendingUp size={20} />
          <h3>فرص الترقية</h3>
          <p>أي عميل يطلب Wallet أو Memberships أو Online Payments يجب أن يتحول مباشرة إلى مرحلة عرض مرسل أو اجتماع.</p>
        </article>
      </section>
    </div>
  )
}
