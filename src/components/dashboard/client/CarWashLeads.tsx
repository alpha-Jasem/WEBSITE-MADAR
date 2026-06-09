import { useEffect, useState } from 'react'
import { Car, Clock, Download, Gift, Phone, Search, Send, Star, Trophy, Users, X, Check, Loader2, Lock, Plus, Pencil, Trash2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { usePlanGate } from '../../../hooks/usePlanGate'
import { ClientButton, ClientPageHeader } from './ClientUI'

const N8N_BASE             = 'https://keepcalm.app.n8n.cloud/webhook'
const N8N_REGISTER_WEBHOOK = `${N8N_BASE}/cw-registration`

function fireWebhook(url: string, body: Record<string, unknown>) {
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(r => { if (!r.ok) console.warn('[n8n]', url, r.status) })
    .catch(e => console.warn('[n8n]', url, e))
}

type CWCustomer = {
  id: string
  name: string | null
  phone: string
  total_visits: number
  loyalty_tier: 'bronze' | 'silver' | 'gold'
  last_visit_at: string | null
  google_review_requested: boolean
  welcome_sent: boolean
  created_at: string
}

const TIER_COLORS: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#94A3B8',
  gold: '#F59E0B',
}
const TIER_LABELS: Record<string, string> = {
  bronze: 'برونزي',
  silver: 'فضي',
  gold: 'ذهبي',
}

const TIER_FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'near', label: 'على وشك المكافأة 🎯' },
  { key: 'milestone', label: 'يستحق مكافأة 🎉' },
  { key: 'gold', label: 'ذهبي' },
  { key: 'silver', label: 'فضي' },
  { key: 'bronze', label: 'برونزي' },
]

function timeAgo(val?: string | null) {
  if (!val) return '—'
  const days = Math.floor((Date.now() - new Date(val).getTime()) / 86400000)
  if (days === 0) return 'اليوم'
  if (days === 1) return 'أمس'
  if (days < 30) return `منذ ${days} يوم`
  return `منذ ${Math.floor(days / 30)} شهر`
}

function formatPhone(phone: string) {
  const p = phone.replace(/\D/g, '')
  if (p.startsWith('966') && p.length === 12) return `0${p.slice(3, 6)} ${p.slice(6, 9)} ${p.slice(9)}`
  return phone
}

function LoyaltyDots({ visits, threshold = 5 }: { visits: number; threshold?: number }) {
  const steps = threshold - 1
  const prog = visits % threshold
  const filled = prog === 0 && visits > 0 ? steps : Math.min(prog, steps)
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
      {Array.from({ length: steps }, (_, i) => i + 1).map(s => (
        <div key={s} style={{
          width: 14, height: 14, borderRadius: '50%',
          background: s <= filled ? '#22D3EE' : '#E2E8F0',
          border: `1.5px solid ${s <= filled ? '#22D3EE' : '#CBD5E1'}`,
        }} />
      ))}
      <div style={{
        width: 16, height: 16, borderRadius: '50%',
        background: visits > 0 && visits % threshold === 0 ? '#F59E0B' : '#FFFFFF',
        border: `1.5px solid ${visits > 0 && visits % threshold === 0 ? '#F59E0B' : '#E2E8F0'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Gift size={8} color={visits > 0 && visits % threshold === 0 ? '#FFFFFF' : '#475569'} />
      </div>
    </div>
  )
}

type CRUDForm = { name: string; phone: string }

export function CarWashLeads() {
  const { companyId, company, loading: authLoading } = useClientCompany()
  const { can } = usePlanGate()
  const threshold = company?.cw_loyalty_threshold || 5
  const [customers, setCustomers] = useState<CWCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showCampaign, setShowCampaign] = useState(false)
  const [campaignMsg, setCampaignMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  // CRUD state
  const [showAddModal, setShowAddModal] = useState(false)
  const [editTarget, setEditTarget] = useState<CWCustomer | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CWCustomer | null>(null)
  const [crudForm, setCrudForm] = useState<CRUDForm>({ name: '', phone: '' })
  // History state
  const [historyCustomer, setHistoryCustomer] = useState<CWCustomer | null>(null)
  const [historyVisits, setHistoryVisits] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [crudSaving, setCrudSaving] = useState(false)
  const [crudDeleting, setCrudDeleting] = useState(false)

  const sortCustomers = (rows: CWCustomer[]) => rows.sort((a, b) => {
    const aTime = new Date(a.last_visit_at || a.created_at || 0).getTime()
    const bTime = new Date(b.last_visit_at || b.created_at || 0).getTime()
    return bTime - aTime
  })

  const upsertCustomerLive = (row: CWCustomer) => {
    setCustomers(prev => sortCustomers([row, ...prev.filter(customer => customer.id !== row.id)]))
  }

  const load = async (silent = false) => {
    if (!companyId) return
    if (!silent) setLoading(true)
    const { data } = await supabase
      .from('cw_customers')
      .select('*')
      .eq('company_id', companyId)
      .order('last_visit_at', { ascending: false })
    setCustomers((data as CWCustomer[]) || [])
    if (!silent) setLoading(false)
  }

  useEffect(() => {
    if (authLoading || !companyId) return
    load()
    const ch = supabase.channel('cw_leads_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cw_customers', filter: `company_id=eq.${companyId}` }, (payload: any) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          upsertCustomerLive(payload.new as CWCustomer)
          return
        }
        if (payload.eventType === 'DELETE') {
          setCustomers(prev => prev.filter(customer => customer.id !== payload.old?.id))
          return
        }
        load(true)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [authLoading, companyId])

  const filtered = customers.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !search || (c.name || '').toLowerCase().includes(q) || c.phone.includes(q)
    if (!matchSearch) return false
    if (filter === 'all') return true
    if (filter === 'near') return c.total_visits % threshold === threshold - 1
    if (filter === 'milestone') return c.total_visits > 0 && c.total_visits % threshold === 0
    return c.loyalty_tier === filter
  })

  const exportExcel = () => {
    const rows = filtered.map(c => ({
      'الاسم': c.name || '—',
      'رقم الجوال': formatPhone(c.phone),
      'عدد الزيارات': c.total_visits,
      'المستوى': TIER_LABELS[c.loyalty_tier] || 'برونزي',
      'آخر زيارة': c.last_visit_at ? new Date(c.last_visit_at).toLocaleDateString('ar-SA') : '—',
      'تم إرسال رسالة ترحيب': c.welcome_sent ? 'نعم' : 'لا',
      'تم طلب تقييم Google': c.google_review_requested ? 'نعم' : 'لا',
      'تاريخ التسجيل': new Date(c.created_at).toLocaleDateString('ar-SA'),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'العملاء')
    XLSX.writeFile(wb, `cw-customers-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const sendCampaign = async () => {
    if (!companyId || !campaignMsg.trim() || selected.size === 0) return
    setSending(true)
    const phones = customers.filter(c => selected.has(c.id)).map(c => c.phone)
    const { data: campaign, error: campaignError } = await supabase
      .from('cw_campaigns')
      .insert({ company_id: companyId, message: campaignMsg.trim(), phones, status: 'pending' })
      .select('id')
      .single()

    if (campaignError || !campaign?.id) {
      setSending(false)
      alert('تعذر إنشاء الحملة. حاول مرة أخرى.')
      return
    }

    setSending(false)
    setSent(true)
    setTimeout(() => { setSent(false); setShowCampaign(false); setSelected(new Set()); setCampaignMsg('') }, 2500)
  }

  const toggleSelect = (id: string) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const openAdd = () => { setCrudForm({ name: '', phone: '' }); setShowAddModal(true) }
  const openEdit = (c: CWCustomer) => { setEditTarget(c); setCrudForm({ name: c.name || '', phone: c.phone }); }

  const openHistory = async (c: CWCustomer) => {
    setHistoryCustomer(c)
    setHistoryLoading(true)
    const { data } = await supabase
      .from('cw_visits')
      .select('id, service_name, total_amount, payment_method, created_at')
      .eq('company_id', companyId)
      .eq('phone', c.phone)
      .order('created_at', { ascending: false })
      .limit(30)
    setHistoryVisits(data || [])
    setHistoryLoading(false)
  }

  const addCustomer = async () => {
    if (!companyId || !crudForm.phone.trim()) return
    setCrudSaving(true)
    const raw = crudForm.phone.replace(/\D/g, '')
    const phone = raw.startsWith('966') ? raw : raw.startsWith('0') ? `966${raw.slice(1)}` : `966${raw}`
    const { data: existing } = await supabase.from('cw_customers').select('id').eq('company_id', companyId).eq('phone', phone).maybeSingle()
    if (existing) {
      setCrudSaving(false)
      alert('هذا الرقم مسجّل مسبقاً')
      return
    }
    const now = new Date().toISOString()
    const tempId = `temp-${Date.now()}`
    const optimisticCustomer: CWCustomer = {
      id: tempId,
      company_id: companyId,
      phone,
      name: crudForm.name.trim() || null,
      total_visits: 0,
      loyalty_tier: 'bronze',
      last_visit_at: now,
      google_review_requested: false,
      welcome_sent: true,
      created_at: now,
    } as CWCustomer

    setSearch('')
    setFilter('all')
    upsertCustomerLive(optimisticCustomer)
    setShowAddModal(false)

    const { data: inserted, error } = await supabase.from('cw_customers').insert({
      company_id: companyId, phone, name: crudForm.name.trim() || null,
      total_visits: 0, welcome_sent: true, last_visit_at: now,
    }).select('*').single()
    if (error) {
      setCustomers(prev => prev.filter(customer => customer.id !== tempId))
      setCrudSaving(false)
      alert('تعذر إضافة العميل. حاول مرة أخرى.')
      return
    }
    if (inserted) {
      setCustomers(prev => sortCustomers([(inserted as CWCustomer), ...prev.filter(customer => customer.id !== tempId && customer.id !== inserted.id)]))
    }
    fireWebhook(N8N_REGISTER_WEBHOOK, {
      phone, customer_name: crudForm.name.trim() || '',
      company_name: company?.name ?? 'المغسلة', company_id: companyId,
    })
    load(true)
    setCrudSaving(false)
  }

  const updateCustomer = async () => {
    if (!editTarget || !companyId) return
    setCrudSaving(true)
    const raw = crudForm.phone.replace(/\D/g, '')
    const phone = raw.startsWith('966') ? raw : raw.startsWith('0') ? `966${raw.slice(1)}` : `966${raw}`
    const { data } = await supabase.from('cw_customers').update({ name: crudForm.name.trim() || null, phone }).eq('id', editTarget.id).select('*').single()
    if (data) upsertCustomerLive(data as CWCustomer)
    setCrudSaving(false)
    setEditTarget(null)
  }

  const deleteCustomer = async () => {
    if (!deleteTarget) return
    setCrudDeleting(true)
    await supabase.from('cw_customers').delete().eq('id', deleteTarget.id)
    setCustomers(prev => prev.filter(customer => customer.id !== deleteTarget.id))
    setCrudDeleting(false)
    setDeleteTarget(null)
  }

  const inactive = customers.filter(c => {
    if (!c.last_visit_at) return true
    return (Date.now() - new Date(c.last_visit_at).getTime()) > 30 * 86400000
  }).length


  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <ClientPageHeader
        eyebrow="ملف العملاء والولاء"
        title="العملاء"
        description={`${customers.length} عميل مسجل — ${inactive} غير نشط أكثر من 30 يوم.`}
        actions={(
          <>
          {selected.size > 0 && (
            can.campaigns ? (
              <ClientButton onClick={() => setShowCampaign(true)}>
                <Send size={14} /> إرسال لـ {selected.size} عميل
              </ClientButton>
            ) : (
              <ClientButton
                tone="secondary"
                onClick={() => window.location.href = '/client/upgrade'}
                title="ميزة Pro — ارتقِ لتفعيل الحملات"
              >
                <Lock size={13} /> حملة واتساب — Pro
              </ClientButton>
            )
          )}
          <ClientButton onClick={openAdd}>
            <Plus size={14} /> إضافة عميل
          </ClientButton>
          <ClientButton tone="secondary" onClick={exportExcel}>
            <Download size={14} /> تصدير Excel
          </ClientButton>
          </>
        )}
      />

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          { icon: Users, label: 'إجمالي', value: customers.length, color: '#22D3EE' },
          { icon: Trophy, label: 'يستحقون مكافأة', value: customers.filter(c => c.total_visits > 0 && c.total_visits % threshold === 0).length, color: '#F59E0B' },
          { icon: Car, label: 'على وشك المكافأة', value: customers.filter(c => c.total_visits % threshold === threshold - 1).length, color: '#4F6EF7' },
          { icon: Star, label: 'غير نشط', value: inactive, color: '#EF4444' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
            background: `${color}0f`, border: `1px solid ${color}22`,
            borderRadius: 10, fontSize: 13, color,
          }}>
            <Icon size={14} />
            <span style={{ fontFamily: 'Tajawal, sans-serif', color: '#94A3B8' }}>{label}</span>
            <strong style={{ fontFamily: 'Sora, sans-serif' }}>{value}</strong>
          </div>
        ))}
      </div>

      {/* Filter + Search */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ابحث باسم أو رقم جوال..."
            dir="rtl"
            style={{
              width: '100%', padding: '9px 36px 9px 14px', borderRadius: 10,
              background: '#FFFFFF', border: '1px solid #E2E8F0',
              color: '#0F172A', outline: 'none', fontFamily: 'Tajawal, sans-serif', fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TIER_FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontFamily: 'Tajawal, sans-serif',
              background: filter === f.key ? 'rgba(34,211,238,0.12)' : '#F8FAFC',
              border: `1px solid ${filter === f.key ? 'rgba(34,211,238,0.3)' : '#F8FAFC'}`,
              color: filter === f.key ? '#22D3EE' : '#64748B',
              cursor: 'pointer',
            }}>
              {f.label}
              {f.key !== 'all' && (
                <span style={{ marginRight: 4, opacity: 0.6 }}>
                  ({f.key === 'near' ? customers.filter(c => c.total_visits % threshold === threshold - 1).length
                    : f.key === 'milestone' ? customers.filter(c => c.total_visits > 0 && c.total_visits % threshold === 0).length
                    : customers.filter(c => c.loyalty_tier === f.key).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="cw-leads-table" style={{
        background: '#FAFAFA', border: '1px solid #E2E8F0',
        borderRadius: 18, overflow: 'hidden',
      }}>
        {/* Column headers */}
        <div className="cw-leads-table-head" style={{
          display: 'grid', gridTemplateColumns: '36px 1fr 140px 130px 110px 100px 90px 72px',
          padding: '10px 20px', borderBottom: '1px solid #E2E8F0',
          fontSize: 11, color: '#475569', fontFamily: 'Tajawal, sans-serif',
          fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
          alignItems: 'center',
        }}>
          <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0}
            onChange={e => setSelected(e.target.checked ? new Set(filtered.map(c => c.id)) : new Set())}
            style={{ accentColor: '#6366F1', width: 14, height: 14, cursor: 'pointer' }} />
          <span>الاسم</span>
          <span>رقم الجوال</span>
          <span>تقدم الولاء</span>
          <span>آخر زيارة</span>
          <span>الزيارات</span>
          <span>المستوى</span>
          <span></span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#475569', fontFamily: 'Tajawal, sans-serif', fontSize: 14 }}>
            {customers.length === 0 ? 'لا يوجد عملاء مسجلون — سيظهرون هنا فور أول تسجيل walk-in' : 'لا توجد نتائج'}
          </div>
        ) : filtered.map((c, i) => {
          const isInactive = c.last_visit_at && (Date.now() - new Date(c.last_visit_at).getTime()) > 30 * 86400000
          const isMilestone = c.total_visits > 0 && c.total_visits % threshold === 0
          const isNear = c.total_visits % threshold === threshold - 1
          return (
            <div key={c.id} className="cw-leads-table-row" style={{
              display: 'grid', gridTemplateColumns: '36px 1fr 140px 130px 110px 100px 90px 72px',
              padding: '13px 20px', alignItems: 'center',
              borderBottom: i < filtered.length - 1 ? '1px solid #E2E8F0' : 'none',
              background: selected.has(c.id) ? 'rgba(99,102,241,0.06)' : isMilestone ? 'rgba(245,158,11,0.04)' : isNear ? 'rgba(34,211,238,0.03)' : 'transparent',
            }}>
              <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)}
                style={{ accentColor: '#6366F1', width: 14, height: 14, cursor: 'pointer' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: isMilestone ? 'rgba(245,158,11,0.15)' : 'rgba(34,211,238,0.1)',
                  border: `1px solid ${isMilestone ? 'rgba(245,158,11,0.3)' : 'rgba(34,211,238,0.2)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: isMilestone ? '#F59E0B' : '#22D3EE',
                }}>
                  {isMilestone ? '🎉' : (c.name || c.phone).slice(0, 1)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', fontFamily: 'Tajawal, sans-serif' }}>
                    {c.name || '—'}
                    {isMilestone && <span style={{ marginRight: 6, fontSize: 10, color: '#F59E0B', background: 'rgba(245,158,11,0.1)', padding: '1px 6px', borderRadius: 4 }}>مكافأة ✓</span>}
                    {isNear && !isMilestone && <span style={{ marginRight: 6, fontSize: 10, color: '#22D3EE', background: 'rgba(34,211,238,0.08)', padding: '1px 6px', borderRadius: 4 }}>زيارة أخيرة</span>}
                  </div>
                  {isInactive && <div style={{ fontSize: 10, color: '#EF4444', fontFamily: 'Tajawal, sans-serif' }}>غير نشط</div>}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#94A3B8', fontSize: 12, fontFamily: 'Sora, sans-serif', direction: 'ltr' }}>
                <Phone size={11} color="#475569" />
                {formatPhone(c.phone)}
              </div>

              <LoyaltyDots visits={c.total_visits} threshold={company?.cw_loyalty_threshold || 5} />

              <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>
                {timeAgo(c.last_visit_at)}
              </span>

              <span style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', fontFamily: 'Sora, sans-serif', textAlign: 'center' }}>
                {c.total_visits}
              </span>

              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: `${TIER_COLORS[c.loyalty_tier]}15`,
                color: TIER_COLORS[c.loyalty_tier] || '#CD7F32',
                border: `1px solid ${TIER_COLORS[c.loyalty_tier]}30`,
                fontFamily: 'Tajawal, sans-serif',
              }}>
                <Star size={9} />
                {TIER_LABELS[c.loyalty_tier] || 'برونزي'}
              </div>

              {/* Row actions */}
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                <button onClick={() => openHistory(c)} title="سجل الزيارات" aria-label={`سجل زيارات ${c.name || c.phone}`} style={{
                  width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(99,102,241,0.2)',
                  background: 'rgba(99,102,241,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#6366F1',
                }}>
                  <Clock size={12} />
                </button>
                <button onClick={() => openEdit(c)} title="تعديل" aria-label={`تعديل ${c.name || c.phone}`} style={{
                  width: 28, height: 28, borderRadius: 7, border: '1px solid #E2E8F0',
                  background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#64748B',
                }}>
                  <Pencil size={12} />
                </button>
                <button onClick={() => setDeleteTarget(c)} title="حذف" aria-label={`حذف ${c.name || c.phone}`} style={{
                  width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(239,68,68,0.15)',
                  background: 'rgba(239,68,68,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#EF4444',
                }}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="cw-leads-mobile-list">
        {filtered.length === 0 ? (
          <div className="cw-leads-mobile-empty">
            {customers.length === 0 ? 'لا يوجد عملاء مسجلون حتى الآن' : 'لا توجد نتائج'}
          </div>
        ) : filtered.map(c => {
          const isInactive = c.last_visit_at && (Date.now() - new Date(c.last_visit_at).getTime()) > 30 * 86400000
          const isMilestone = c.total_visits > 0 && c.total_visits % threshold === 0
          const isNear = c.total_visits % threshold === threshold - 1
          return (
            <article key={`mobile-${c.id}`} className={`cw-leads-mobile-card${selected.has(c.id) ? ' selected' : ''}`}>
              <div className="cw-leads-mobile-top">
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() => toggleSelect(c.id)}
                  aria-label="تحديد العميل"
                />
                <div className="cw-leads-mobile-avatar">
                  {isMilestone ? <Trophy size={15} /> : (c.name || c.phone).slice(0, 1)}
                </div>
                <div className="cw-leads-mobile-name">
                  <strong>{c.name || 'عميل بدون اسم'}</strong>
                  <span><Phone size={11} /> {formatPhone(c.phone)}</span>
                </div>
                <div className="cw-leads-mobile-visits">
                  <strong>{c.total_visits}</strong>
                  <span>زيارة</span>
                </div>
              </div>

              <div className="cw-leads-mobile-meta">
                <span style={{ color: TIER_COLORS[c.loyalty_tier] || '#CD7F32', background: `${TIER_COLORS[c.loyalty_tier]}15`, borderColor: `${TIER_COLORS[c.loyalty_tier]}30` }}>
                  <Star size={10} /> {TIER_LABELS[c.loyalty_tier] || 'برونزي'}
                </span>
                {isMilestone && <span className="gold"><Gift size={10} /> يستحق مكافأة</span>}
                {isNear && !isMilestone && <span className="cyan"><Car size={10} /> قريب من المكافأة</span>}
                {isInactive && <span className="red"><Clock size={10} /> غير نشط</span>}
                <span><Clock size={10} /> {timeAgo(c.last_visit_at)}</span>
              </div>

              <div className="cw-leads-mobile-loyalty">
                <span>تقدم الولاء</span>
                <LoyaltyDots visits={c.total_visits} threshold={company?.cw_loyalty_threshold || 5} />
              </div>

              <div className="cw-leads-mobile-actions">
                <button type="button" onClick={() => openHistory(c)}><Clock size={12} /> السجل</button>
                <button type="button" onClick={() => openEdit(c)}><Pencil size={12} /> تعديل</button>
                <button type="button" className="danger" onClick={() => setDeleteTarget(c)}><Trash2 size={12} /> حذف</button>
              </div>
            </article>
          )
        })}
      </div>

      {/* Campaign Modal */}
      {showCampaign && (
        <div onClick={e => e.target === e.currentTarget && setShowCampaign(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div role="dialog" aria-modal="true" aria-label="WhatsApp campaign" style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 20, width: '100%', maxWidth: 460, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Send size={17} color="#818CF8" />
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: 0 }}>إرسال حملة واتساب</h3>
                  <p style={{ fontSize: 11, color: '#475569', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>{selected.size} عميل محدد</p>
                </div>
              </div>
              <button aria-label="Close dialog" onClick={() => setShowCampaign(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}><X size={18} /></button>
            </div>
            <div dir="rtl" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', display: 'block', marginBottom: 6 }}>نص الرسالة</label>
                <textarea value={campaignMsg} onChange={e => setCampaignMsg(e.target.value)} rows={5}
                  placeholder="اكتب رسالتك هنا... مثال: عروض نهاية الأسبوع 🚗✨"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14, background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#0F172A', outline: 'none', fontFamily: 'Tajawal, sans-serif', resize: 'vertical', boxSizing: 'border-box' }} />
                <p style={{ fontSize: 11, color: '#334155', fontFamily: 'Tajawal, sans-serif', marginTop: 4 }}>
                  ستُرسل للعملاء المحددين عبر واتساب بعد الضغط على إرسال
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={sendCampaign} disabled={sending || sent || !campaignMsg.trim()}
                  style={{ flex: 1, padding: 11, borderRadius: 12, fontSize: 14, fontWeight: 700, border: 'none', cursor: sending || sent || !campaignMsg.trim() ? 'not-allowed' : 'pointer', background: sent ? 'rgba(16,185,129,0.15)' : sending || !campaignMsg.trim() ? '#1E293B' : 'linear-gradient(135deg, #6366F1, #818CF8)', color: sent ? '#10B981' : sending || !campaignMsg.trim() ? '#475569' : '#fff', fontFamily: 'Cairo, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {sending ? <Loader2 size={15} className="animate-spin" /> : sent ? <Check size={15} /> : <Send size={15} />}
                  {sent ? 'تمت جدولة الإرسال ✓' : sending ? 'جاري الإرسال...' : `إرسال لـ ${selected.size} عميل`}
                </button>
                <button onClick={() => setShowCampaign(false)} style={{ padding: '11px 18px', borderRadius: 12, fontSize: 13, background: 'transparent', border: '1px solid #E2E8F0', color: '#64748B', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif' }}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div onClick={e => e.target === e.currentTarget && setShowAddModal(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div role="dialog" aria-modal="true" aria-label="Add customer" style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 20, width: '100%', maxWidth: 400, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(34,211,238,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={17} color="#22D3EE" />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: 0 }}>إضافة عميل جديد</h3>
              </div>
              <button aria-label="Close dialog" onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}><X size={18} /></button>
            </div>
            <div dir="rtl" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', display: 'block', marginBottom: 6 }}>رقم الجوال *</label>
                <input value={crudForm.phone} onChange={e => setCrudForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="05XXXXXXXX أو 966XXXXXXXXX"
                  style={{ width: '100%', padding: '9px 14px', borderRadius: 10, background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#0F172A', outline: 'none', fontFamily: 'Sora, sans-serif', fontSize: 13, boxSizing: 'border-box', direction: 'ltr' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', display: 'block', marginBottom: 6 }}>اسم العميل (اختياري)</label>
                <input value={crudForm.name} onChange={e => setCrudForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="محمد العلي"
                  style={{ width: '100%', padding: '9px 14px', borderRadius: 10, background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#0F172A', outline: 'none', fontFamily: 'Tajawal, sans-serif', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <p style={{ fontSize: 11, color: '#334155', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>
                ✅ سيُرسل له واتساب ترحيب فوري عند الإضافة
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={addCustomer} disabled={crudSaving || !crudForm.phone.trim()}
                  style={{ flex: 1, padding: 11, borderRadius: 12, fontSize: 14, fontWeight: 700, border: 'none', cursor: crudSaving || !crudForm.phone.trim() ? 'not-allowed' : 'pointer', background: crudSaving || !crudForm.phone.trim() ? '#1E293B' : 'linear-gradient(135deg, #22D3EE, #06B6D4)', color: crudSaving || !crudForm.phone.trim() ? '#475569' : '#F4F6FB', fontFamily: 'Cairo, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {crudSaving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  {crudSaving ? 'جاري الإضافة...' : 'إضافة وإرسال ترحيب'}
                </button>
                <button onClick={() => setShowAddModal(false)} style={{ padding: '11px 18px', borderRadius: 12, fontSize: 13, background: 'transparent', border: '1px solid #E2E8F0', color: '#64748B', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif' }}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editTarget && (
        <div onClick={e => e.target === e.currentTarget && setEditTarget(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div role="dialog" aria-modal="true" aria-label="Edit customer" style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 20, width: '100%', maxWidth: 400, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Pencil size={15} color="#818CF8" />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: 0 }}>تعديل بيانات العميل</h3>
              </div>
              <button aria-label="Close dialog" onClick={() => setEditTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}><X size={18} /></button>
            </div>
            <div dir="rtl" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', display: 'block', marginBottom: 6 }}>رقم الجوال</label>
                <input value={crudForm.phone} onChange={e => setCrudForm(f => ({ ...f, phone: e.target.value }))}
                  style={{ width: '100%', padding: '9px 14px', borderRadius: 10, background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#0F172A', outline: 'none', fontFamily: 'Sora, sans-serif', fontSize: 13, boxSizing: 'border-box', direction: 'ltr' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', display: 'block', marginBottom: 6 }}>الاسم</label>
                <input value={crudForm.name} onChange={e => setCrudForm(f => ({ ...f, name: e.target.value }))}
                  style={{ width: '100%', padding: '9px 14px', borderRadius: 10, background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#0F172A', outline: 'none', fontFamily: 'Tajawal, sans-serif', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={updateCustomer} disabled={crudSaving}
                  style={{ flex: 1, padding: 11, borderRadius: 12, fontSize: 14, fontWeight: 700, border: 'none', cursor: crudSaving ? 'not-allowed' : 'pointer', background: crudSaving ? '#1E293B' : 'linear-gradient(135deg, #6366F1, #818CF8)', color: crudSaving ? '#475569' : '#fff', fontFamily: 'Cairo, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {crudSaving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  {crudSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
                <button onClick={() => setEditTarget(null)} style={{ padding: '11px 18px', borderRadius: 12, fontSize: 13, background: 'transparent', border: '1px solid #E2E8F0', color: '#64748B', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif' }}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div onClick={e => e.target === e.currentTarget && setDeleteTarget(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div role="dialog" aria-modal="true" aria-label="Delete customer confirmation" style={{ background: '#FFFFFF', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 20, width: '100%', maxWidth: 380, overflow: 'hidden' }}>
            <div style={{ padding: '24px 22px', textAlign: 'center' }} dir="rtl">
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Trash2 size={22} color="#EF4444" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 8px' }}>حذف العميل؟</h3>
              <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: '0 0 20px' }}>
                سيتم حذف <strong style={{ color: '#0F172A' }}>{deleteTarget.name || deleteTarget.phone}</strong> وجميع بياناته. هذا الإجراء لا يمكن التراجع عنه.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={deleteCustomer} disabled={crudDeleting}
                  style={{ flex: 1, padding: 11, borderRadius: 12, fontSize: 14, fontWeight: 700, border: 'none', cursor: crudDeleting ? 'not-allowed' : 'pointer', background: crudDeleting ? '#1E293B' : 'rgba(239,68,68,0.15)', color: crudDeleting ? '#475569' : '#EF4444', fontFamily: 'Cairo, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {crudDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  {crudDeleting ? 'جاري الحذف...' : 'نعم، احذف'}
                </button>
                <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: 11, borderRadius: 12, fontSize: 13, background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#94A3B8', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif' }}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visit History Modal */}
      {historyCustomer && (
        <div onClick={e => e.target === e.currentTarget && setHistoryCustomer(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div role="dialog" aria-modal="true" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(15,23,42,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #E2E8F0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>سجل الزيارات</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>{historyCustomer.name || historyCustomer.phone} — {historyCustomer.total_visits} زيارة</p>
              </div>
              <button onClick={() => setHistoryCustomer(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X size={18} /></button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }} dir="rtl">
              {historyLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, gap: 8 }}>
                  <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite', color: '#6366F1' }} />
                  <span style={{ color: '#64748B', fontFamily: 'Tajawal, sans-serif', fontSize: 13 }}>جاري التحميل...</span>
                </div>
              ) : historyVisits.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', fontSize: 13 }}>لا توجد زيارات مسجّلة</div>
              ) : historyVisits.map((v, i) => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: i === 0 ? 'rgba(99,102,241,0.04)' : '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Car size={15} color="#6366F1" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0F172A', fontFamily: 'Cairo, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {v.service_name || 'خدمة مغسلة'}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>
                      {new Date(v.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div style={{ textAlign: 'left', flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#10B981', fontFamily: 'Sora, sans-serif' }}>{v.total_amount ? `${Number(v.total_amount).toFixed(0)} ر.س` : '—'}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>{v.payment_method || ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Inactive customers warning */}
      {inactive > 0 && (
        <div style={{
          padding: '14px 18px',
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.15)',
          borderRadius: 12, fontSize: 13,
          color: '#94A3B8', fontFamily: 'Tajawal, sans-serif',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ color: '#EF4444', fontWeight: 700 }}>⚠️ {inactive} عميل</span>
          لم يزوروا المغسلة منذ أكثر من 30 يوماً — يُنصح بإرسال حملة إعادة تنشيط من محرك مدار.
        </div>
      )}
    </div>
  )
}
