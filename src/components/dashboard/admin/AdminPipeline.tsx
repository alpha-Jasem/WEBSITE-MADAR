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

type NewDealForm = {
  company_name: string
  contact_name: string
  phone: string
  email: string
  sector: string
  source: string
  price_expected: string
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

function mapDeal(row: any): Deal {
  return {
    id: row.id,
    company_name: row.company_name ?? row.company ?? row.name ?? null,
    contact_name: row.contact_name ?? row.owner_name ?? row.customer_name ?? null,
    phone: row.phone ?? row.owner_phone ?? null,
    email: row.email ?? row.owner_email ?? null,
    sector: row.sector ?? row.industry ?? row.business_type ?? null,
    source: row.source ?? null,
    stage: normalizeStage(row.stage ?? row.status),
    price_expected: row.price_expected ?? row.value ?? row.expected_value ?? null,
    price_sold: row.price_sold ?? row.closed_value ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? row.created_at ?? null,
  }
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
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState<NewDealForm>({
    company_name: '',
    contact_name: '',
    phone: '',
    email: '',
    sector: 'مغسلة سيارات',
    source: 'إدخال يدوي',
    price_expected: '799',
  })

  const load = async () => {
    setLoading(true)
    setLoadError('')
    const { data, error } = await supabase
      .from('crm_leads')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(160)

    if (error) {
      setLoadError(error.message)
      setDeals([])
    } else {
      setDeals(((data ?? []) as any[]).filter(row => row.stage !== 'lost').map(mapDeal))
    }
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

  const createDeal = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.company_name.trim() && !form.contact_name.trim()) return

    setSaving(true)
    const payload = {
      company_name: form.company_name.trim() || form.contact_name.trim(),
      contact_name: form.contact_name.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      sector: form.sector.trim() || null,
      source: form.source.trim() || 'إدخال يدوي',
      price_expected: Number(form.price_expected || 0),
      stage: 'new_lead',
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('crm_leads').insert(payload).select('*').single()
    if (!error && data) {
      setDeals(prev => [mapDeal(data), ...prev])
      setShowCreate(false)
      setForm({
        company_name: '',
        contact_name: '',
        phone: '',
        email: '',
        sector: 'مغسلة سيارات',
        source: 'إدخال يدوي',
        price_expected: '799',
      })
    } else if (error) {
      setLoadError(error.message)
    }
    setSaving(false)
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
        <button type="button" onClick={() => setShowCreate(true)}>
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

      {loadError && (
        <section className="admin-pipeline-warning">
          <AlertTriangle size={17} />
          <span>تعذر تحميل خط المبيعات: {loadError}</span>
        </section>
      )}

      {filteredDeals.length === 0 && (
        <section className="admin-pipeline-zero">
          <div>
            <span>ابدأ البيع من هنا</span>
            <h2>{search ? 'لا توجد نتائج مطابقة للبحث' : 'لا توجد فرص في خط المبيعات حتى الآن'}</h2>
            <p>
              أضف أول فرصة للمغسلة أو العيادة، ثم حركها بين المراحل. الصفحة ستعطيك قيمة مرجحة،
              فرص تحتاج متابعة، وإيراد مغلق تلقائيا من بيانات CRM.
            </p>
          </div>
          <button type="button" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            إضافة أول فرصة
          </button>
        </section>
      )}

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
                    <button type="button" className="admin-pipeline-empty" onClick={() => setShowCreate(true)}>
                      <Plus size={14} />
                      لا توجد فرص هنا
                    </button>
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

      {showCreate && (
        <div className="admin-pipeline-modal-backdrop" onClick={() => setShowCreate(false)}>
          <form className="admin-pipeline-modal" onSubmit={createDeal} onClick={event => event.stopPropagation()}>
            <header>
              <div>
                <span>فرصة جديدة</span>
                <h2>إضافة عميل محتمل إلى خط المبيعات</h2>
              </div>
              <button type="button" onClick={() => setShowCreate(false)}>إغلاق</button>
            </header>

            <div className="admin-pipeline-form-grid">
              <label>
                اسم الشركة
                <input value={form.company_name} onChange={event => setForm(prev => ({ ...prev, company_name: event.target.value }))} placeholder="مثال: مغسلة النخبة" autoFocus />
              </label>
              <label>
                اسم المسؤول
                <input value={form.contact_name} onChange={event => setForm(prev => ({ ...prev, contact_name: event.target.value }))} placeholder="اسم صاحب القرار" />
              </label>
              <label>
                الجوال
                <input value={form.phone} onChange={event => setForm(prev => ({ ...prev, phone: event.target.value }))} placeholder="9665XXXXXXXX" dir="ltr" />
              </label>
              <label>
                البريد
                <input value={form.email} onChange={event => setForm(prev => ({ ...prev, email: event.target.value }))} placeholder="name@example.com" dir="ltr" />
              </label>
              <label>
                القطاع
                <input value={form.sector} onChange={event => setForm(prev => ({ ...prev, sector: event.target.value }))} />
              </label>
              <label>
                قيمة الاشتراك المتوقعة
                <input value={form.price_expected} onChange={event => setForm(prev => ({ ...prev, price_expected: event.target.value }))} inputMode="numeric" dir="ltr" />
              </label>
            </div>

            <footer>
              <button type="button" onClick={() => setShowCreate(false)}>إلغاء</button>
              <button type="submit" disabled={saving}>
                {saving ? 'جاري الحفظ...' : 'إضافة الفرصة'}
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  )
}
