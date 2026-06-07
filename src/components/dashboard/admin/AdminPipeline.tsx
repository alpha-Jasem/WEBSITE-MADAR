import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Company } from '../../../types'

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

type NewDealForm = { company_name: string; contact_name: string; phone: string; email: string; sector: string; source: string; price_expected: string }

const stages: Array<{ key: StageKey; label: string; hint: string; color: string; probability: number }> = [
  { key: 'new_lead',       label: 'جديد',       hint: 'دخل للنظام',      color: '#64748B', probability: 10 },
  { key: 'contacted',      label: 'تم التواصل', hint: 'مكالمة / واتساب', color: '#00BFFF', probability: 25 },
  { key: 'qualified',      label: 'مؤهل',       hint: 'مناسب للبيع',     color: '#3078FF', probability: 45 },
  { key: 'meeting_booked', label: 'اجتماع',     hint: 'عرض مباشر',       color: '#8B5CF6', probability: 65 },
  { key: 'proposal_sent',  label: 'عرض مرسل',   hint: 'بانتظار القرار',  color: '#F59E0B', probability: 80 },
  { key: 'won',            label: 'مغلق',        hint: 'تم البيع',        color: '#10B981', probability: 100 },
]

const stageAliases: Record<string, StageKey> = {
  new: 'new_lead', new_lead: 'new_lead', contacted: 'contacted', qualified: 'qualified',
  proposal: 'proposal_sent', proposal_sent: 'proposal_sent', meeting_booked: 'meeting_booked',
  negotiation: 'proposal_sent', won: 'won', converted: 'won',
}

function normalizeStage(value?: string | null): StageKey { return stageAliases[value || ''] ?? 'new_lead' }
function dealValue(deal: Deal) { return Number(deal.price_sold ?? deal.price_expected ?? 0) }
function formatSar(value: number) { return `${Math.round(value).toLocaleString('ar-SA')} ر.س` }
function timeAgo(iso?: string | null) {
  if (!iso) return 'غير محدد'
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000)
  if (hours < 1) return 'قبل قليل'
  if (hours < 24) return `قبل ${hours} ساعة`
  return `قبل ${Math.floor(hours / 24)} يوم`
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
    price_expected: row.price_expected ?? row.value ?? null,
    price_sold: row.price_sold ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? row.created_at ?? null,
  }
}

const EMPTY_FORM: NewDealForm = { company_name: '', contact_name: '', phone: '', email: '', sector: 'مغسلة سيارات', source: 'إدخال يدوي', price_expected: '799' }

export const AdminPipeline = () => {
  const [deals, setDeals] = useState<Deal[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<StageKey | null>(null)
  const [view, setView] = useState<'board' | 'table'>('board')
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState<NewDealForm>(EMPTY_FORM)

  const load = async () => {
    setLoading(true); setLoadError('')
    const [{ data, error }, { data: companyRows }] = await Promise.all([
      supabase.from('crm_leads').select('*').order('updated_at', { ascending: false }).limit(160),
      supabase.from('companies').select('*').order('created_at', { ascending: false }),
    ])
    if (error) { setLoadError(error.message); setDeals([]) }
    else setDeals(((data ?? []) as any[]).filter(r => r.stage !== 'lost').map(mapDeal))
    setCompanies((companyRows ?? []) as Company[])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const ch = supabase.channel('admin_pipeline_live').on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, load).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const filteredDeals = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return deals
    return deals.filter(d => [d.company_name, d.contact_name, d.phone, d.email, d.sector, d.source].filter(Boolean).some(v => String(v).toLowerCase().includes(needle)))
  }, [deals, search])

  const totals = useMemo(() => {
    const open = filteredDeals.filter(d => d.stage !== 'won')
    const weighted = open.reduce((s, d) => s + dealValue(d) * ((stages.find(st => st.key === d.stage)?.probability ?? 10) / 100), 0)
    const won = filteredDeals.filter(d => d.stage === 'won')
    const wonRevenue = won.reduce((s, d) => s + dealValue(d), 0)
    const stale = open.filter(d => { const u = d.updated_at || d.created_at; return u && Date.now() - new Date(u).getTime() > 7 * 24 * 3600000 }).length
    return { open, weighted, won, wonRevenue, stale }
  }, [filteredDeals])

  const upgradeSignals = useMemo(() => {
    return companies.filter(c => c.business_type === 'car_wash' || c.industry === 'car_wash').map(c => {
      const flags = ((c.cw_automations as any)?.feature_flags || {}) as Record<string, boolean>
      const msgUsage = c.message_limit ? Math.round(((c.messages_used || 0) / c.message_limit) * 100) : 0
      const reasons = [
        msgUsage >= 70 ? `استهلاك الرسائل ${msgUsage}%` : '',
        !(c.public_checkin_token || c.webhook_token) ? 'QR غير جاهز' : '',
        !flags.wallet ? 'المحفظة غير مفعلة' : '',
        !flags.memberships ? 'الاشتراكات غير مفعلة' : '',
      ].filter(Boolean)
      return { company: c, reasons, score: Math.min(100, msgUsage + reasons.length * 12 + (c.plan === 'starter' ? 18 : 0)) }
    }).filter(r => r.reasons.length > 0).sort((a, b) => b.score - a.score).slice(0, 4)
  }, [companies])

  const moveDeal = async (id: string, stage: StageKey) => {
    setDeals(prev => prev.map(d => d.id === id ? { ...d, stage, updated_at: new Date().toISOString() } : d))
    await supabase.from('crm_leads').update({ stage, updated_at: new Date().toISOString() }).eq('id', id)
  }

  const createDeal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.company_name.trim() && !form.contact_name.trim()) return
    setSaving(true)
    const payload = { company_name: form.company_name.trim() || form.contact_name.trim(), contact_name: form.contact_name.trim() || null, phone: form.phone.trim() || null, email: form.email.trim() || null, sector: form.sector.trim() || null, source: form.source.trim() || 'إدخال يدوي', price_expected: Number(form.price_expected || 0), stage: 'new_lead', updated_at: new Date().toISOString() }
    const { data, error } = await supabase.from('crm_leads').insert(payload).select('*').single()
    if (!error && data) { setDeals(prev => [mapDeal(data), ...prev]); setShowCreate(false); setForm(EMPTY_FORM) }
    else if (error) setLoadError(error.message)
    setSaving(false)
  }

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '55vh', gap: 10, color: 'var(--ink-3)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      جاري تحميل خط المبيعات…
    </div>
  )

  return (
    <div className="page fade-in">
      <div className="sec-head" style={{ marginBottom: 24 }}>
        <div>
          <div className="sec-title">خط المبيعات</div>
          <div className="sec-sub">تابع الفرص من أول تواصل إلى الإغلاق</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          فرصة جديدة
        </button>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'القيمة المرجحة', value: formatSar(totals.weighted) },
          { label: 'فرص مفتوحة', value: totals.open.length },
          { label: 'إيراد مغلق', value: formatSar(totals.wonRevenue) },
          { label: 'تحتاج متابعة', value: totals.stale },
        ].map((s, i) => (
          <div key={i} className="stat">
            <div className="stat-top"><div className="stat-label">{s.label}</div></div>
            <div className="stat-value num">{s.value}</div>
          </div>
        ))}
      </div>

      {upgradeSignals.length > 0 && (
        <div className="card card-pad" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>فرص ترقية تلقائية</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {upgradeSignals.map(signal => (
              <div key={signal.company.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{signal.company.name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 8 }}>{signal.reasons.slice(0, 2).join(' · ')}</div>
                <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ company_name: signal.company.name, contact_name: signal.company.owner_name || '', phone: '', email: signal.company.owner_email || '', sector: 'مغسلة سيارات', source: `فرصة ترقية: ${signal.reasons[0]}`, price_expected: signal.company.plan === 'starter' ? '799' : '1999' }); setShowCreate(true) }}>
                  تحويل لفرصة
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="row gap-3" style={{ marginBottom: 16 }}>
        <div className="card row gap-2" style={{ padding: '9px 14px', flex: 1 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--ink-3)', flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن شركة، عميل، قطاع..." style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--ink)', flex: 1 }} />
        </div>
        <div className="seg">
          <button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')}>المراحل</button>
          <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>جدول</button>
        </div>
      </div>

      {loadError && <div className="badge red" style={{ display: 'block', marginBottom: 16, padding: '8px 12px', borderRadius: 8 }}>{loadError}</div>}

      {view === 'board' ? (
        <div className="kanban" style={{ gridTemplateColumns: `repeat(${stages.length}, 1fr)` }}>
          {stages.map(stage => {
            const colDeals = filteredDeals.filter(d => d.stage === stage.key)
            const total = colDeals.reduce((s, d) => s + dealValue(d), 0)
            const isOver = dragOverStage === stage.key
            return (
              <div key={stage.key} className={`kcol ${isOver ? 'drop-target' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOverStage(stage.key) }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={() => { if (draggingId) moveDeal(draggingId, stage.key); setDraggingId(null); setDragOverStage(null) }}>
                <div className="kcol-head">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: stage.color }}>{stage.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{stage.hint}</div>
                  </div>
                  <span className="badge gray">{colDeals.length}</span>
                </div>
                <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-2)', padding: '0 8px 10px', fontWeight: 600 }}>{formatSar(total)}</div>
                {colDeals.map(deal => (
                  <div key={deal.id} className="kcard" draggable onDragStart={() => setDraggingId(deal.id)} onDragEnd={() => setDraggingId(null)}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{deal.company_name || deal.contact_name || 'فرصة بدون اسم'}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 8 }}>{deal.sector || deal.source || 'مدار OS'}</div>
                    <div className="row gap-2" style={{ justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: 12, fontFamily: 'var(--mono)', color: stage.color }}>{formatSar(dealValue(deal))}</span>
                      <span style={{ fontSize: 10, color: 'var(--ink-4)' }}>{stage.probability}%</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 6 }}>{timeAgo(deal.updated_at || deal.created_at)}</div>
                  </div>
                ))}
                {colDeals.length === 0 && (
                  <button onClick={() => setShowCreate(true)} style={{ width: '100%', padding: '12px 8px', textAlign: 'center', fontSize: 12, color: 'var(--ink-4)', border: '1px dashed var(--border)', borderRadius: 8, cursor: 'pointer', background: 'none' }}>
                    + إضافة فرصة
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>الشركة</th><th>القطاع</th><th>القيمة</th><th>المرحلة</th><th>التواصل</th><th>آخر تحديث</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeals.map(deal => {
                const stage = stages.find(s => s.key === deal.stage)
                return (
                  <tr key={deal.id}>
                    <td style={{ fontWeight: 500 }}>{deal.company_name || deal.contact_name || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--ink-2)' }}>{deal.sector || '—'}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{formatSar(dealValue(deal))}</td>
                    <td><span className="badge" style={{ background: (stage?.color ?? '#64748B') + '20', color: stage?.color ?? 'var(--ink-3)' }}>{stage?.label ?? deal.stage}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--ink-2)' }}>{deal.phone || deal.email || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--ink-3)' }}>{timeAgo(deal.updated_at || deal.created_at)}</td>
                  </tr>
                )
              })}
              {filteredDeals.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--ink-3)' }}>لا توجد فرص</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,5,18,0.8)', backdropFilter: 'blur(4px)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: 480, maxWidth: '95vw', padding: 28, background: 'rgba(8,15,36,0.98)' }}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 20 }}>فرصة جديدة</div>
            <form onSubmit={createDeal} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {([['company_name', 'اسم الشركة'], ['contact_name', 'اسم المسؤول'], ['phone', 'رقم الجوال'], ['email', 'البريد الإلكتروني'], ['price_expected', 'القيمة المتوقعة (ر.س)']]) .map(([k, label]) => (
                <div key={k}>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 4 }}>{label}</div>
                  <input value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div className="row gap-3" style={{ marginTop: 8 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'جاري الحفظ…' : 'إضافة'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => { setShowCreate(false); setForm(EMPTY_FORM) }}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
