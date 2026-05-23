import { useEffect, useState } from 'react'
import { Car, Download, Gift, Phone, Search, Star, Trophy, Users } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'

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

function LoyaltyDots({ visits }: { visits: number }) {
  const prog = visits % 5
  const filled = prog === 0 && visits > 0 ? 4 : Math.min(prog, 4)
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {[1, 2, 3, 4].map(s => (
        <div key={s} style={{
          width: 14, height: 14, borderRadius: '50%',
          background: s <= filled ? '#22D3EE' : 'rgba(255,255,255,0.08)',
          border: `1.5px solid ${s <= filled ? '#22D3EE' : 'rgba(255,255,255,0.12)'}`,
        }} />
      ))}
      <div style={{
        width: 16, height: 16, borderRadius: '50%',
        background: visits > 0 && visits % 5 === 0 ? '#F59E0B' : 'rgba(255,255,255,0.05)',
        border: `1.5px solid ${visits > 0 && visits % 5 === 0 ? '#F59E0B' : 'rgba(255,255,255,0.1)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Gift size={8} color={visits > 0 && visits % 5 === 0 ? '#080C14' : '#475569'} />
      </div>
    </div>
  )
}

export function CarWashLeads() {
  const { companyId, loading: authLoading } = useClientCompany()
  const [customers, setCustomers] = useState<CWCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const load = async () => {
    if (!companyId) return
    setLoading(true)
    const { data } = await supabase
      .from('cw_customers')
      .select('*')
      .eq('company_id', companyId)
      .order('last_visit_at', { ascending: false })
    setCustomers((data as CWCustomer[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    if (authLoading || !companyId) return
    load()
    const ch = supabase.channel('cw_leads_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cw_customers' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [authLoading, companyId])

  const filtered = customers.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !search || (c.name || '').toLowerCase().includes(q) || c.phone.includes(q)
    if (!matchSearch) return false
    if (filter === 'all') return true
    if (filter === 'near') return c.total_visits % 5 === 4
    if (filter === 'milestone') return c.total_visits > 0 && c.total_visits % 5 === 0
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
    XLSX.utils.book_append_sheet(wb, ws, 'عملاء المغسلة')
    XLSX.writeFile(wb, `cw-customers-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const inactive = customers.filter(c => {
    if (!c.last_visit_at) return true
    return (Date.now() - new Date(c.last_visit_at).getTime()) > 30 * 86400000
  }).length

  if (authLoading || loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10 }}>
      <Car size={18} color="#22D3EE" />
      <span style={{ color: '#475569', fontFamily: 'Tajawal, sans-serif', fontSize: 14 }}>جاري تحميل العملاء...</span>
    </div>
  )

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#F1F5F9', fontFamily: 'Cairo, sans-serif', margin: 0 }}>عملاء المغسلة</h1>
          <p style={{ fontSize: 13, color: '#475569', fontFamily: 'Tajawal, sans-serif', marginTop: 4 }}>
            {customers.length} عميل مسجل — {inactive} غير نشط (أكثر من 30 يوم)
          </p>
        </div>
        <button onClick={exportExcel} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
          borderRadius: 10, fontSize: 13, color: '#10B981', fontFamily: 'Tajawal, sans-serif',
          cursor: 'pointer',
        }}>
          <Download size={14} /> تصدير Excel
        </button>
      </div>

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          { icon: Users, label: 'إجمالي', value: customers.length, color: '#22D3EE' },
          { icon: Trophy, label: 'يستحقون مكافأة', value: customers.filter(c => c.total_visits > 0 && c.total_visits % 5 === 0).length, color: '#F59E0B' },
          { icon: Car, label: 'على وشك المكافأة', value: customers.filter(c => c.total_visits % 5 === 4).length, color: '#4F6EF7' },
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
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#F1F5F9', outline: 'none', fontFamily: 'Tajawal, sans-serif', fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TIER_FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontFamily: 'Tajawal, sans-serif',
              background: filter === f.key ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${filter === f.key ? 'rgba(34,211,238,0.3)' : 'rgba(255,255,255,0.07)'}`,
              color: filter === f.key ? '#22D3EE' : '#64748B',
              cursor: 'pointer',
            }}>
              {f.label}
              {f.key !== 'all' && (
                <span style={{ marginRight: 4, opacity: 0.6 }}>
                  ({f.key === 'near' ? customers.filter(c => c.total_visits % 5 === 4).length
                    : f.key === 'milestone' ? customers.filter(c => c.total_visits > 0 && c.total_visits % 5 === 0).length
                    : customers.filter(c => c.loyalty_tier === f.key).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 18, overflow: 'hidden',
      }}>
        {/* Column headers */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 140px 130px 110px 100px 90px',
          padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          fontSize: 11, color: '#475569', fontFamily: 'Tajawal, sans-serif',
          fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          <span>الاسم</span>
          <span>رقم الجوال</span>
          <span>تقدم الولاء</span>
          <span>آخر زيارة</span>
          <span>الزيارات</span>
          <span>المستوى</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#475569', fontFamily: 'Tajawal, sans-serif', fontSize: 14 }}>
            {customers.length === 0 ? 'لا يوجد عملاء مسجلون — سيظهرون هنا فور أول تسجيل walk-in' : 'لا توجد نتائج'}
          </div>
        ) : filtered.map((c, i) => {
          const isInactive = c.last_visit_at && (Date.now() - new Date(c.last_visit_at).getTime()) > 30 * 86400000
          const isMilestone = c.total_visits > 0 && c.total_visits % 5 === 0
          const isNear = c.total_visits % 5 === 4
          return (
            <div key={c.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 140px 130px 110px 100px 90px',
              padding: '13px 20px', alignItems: 'center',
              borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              background: isMilestone ? 'rgba(245,158,11,0.04)' : isNear ? 'rgba(34,211,238,0.03)' : 'transparent',
            }}>
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
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0', fontFamily: 'Tajawal, sans-serif' }}>
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

              <LoyaltyDots visits={c.total_visits} />

              <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>
                {timeAgo(c.last_visit_at)}
              </span>

              <span style={{ fontSize: 16, fontWeight: 800, color: '#F1F5F9', fontFamily: 'Sora, sans-serif', textAlign: 'center' }}>
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
            </div>
          )
        })}
      </div>

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
          لم يزوروا المغسلة منذ أكثر من 30 يوماً — يُنصح بإرسال حملة reactivation عبر n8n.
        </div>
      )}
    </div>
  )
}
