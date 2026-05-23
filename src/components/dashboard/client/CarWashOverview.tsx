import { useEffect, useRef, useState } from 'react'
import {
  Car,
  Check,
  Gift,
  Loader2,
  Phone,
  Plus,
  RotateCcw,
  Star,
  Trophy,
  Users,
  Droplets,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react'
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
  created_at: string
}

type CWVisit = {
  id: string
  customer_id: string
  service_name: string | null
  review_request_sent: boolean
  created_at: string
  cw_customers?: { name: string | null; phone: string } | null
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

function LoyaltyBar({ visits }: { visits: number }) {
  const progress = visits % 5
  const stepsCompleted = progress === 0 && visits > 0 ? 4 : Math.min(progress, 4)
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {[1, 2, 3, 4].map((step) => (
        <div
          key={step}
          title={`غسلة ${step}`}
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: step <= stepsCompleted ? '#22D3EE' : 'rgba(255,255,255,0.08)',
            border: `2px solid ${step <= stepsCompleted ? '#22D3EE' : 'rgba(255,255,255,0.12)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 9,
            color: step <= stepsCompleted ? '#080C14' : '#475569',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {step <= stepsCompleted ? '✓' : step}
        </div>
      ))}
      <div
        title="الخامسة مجانية"
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: visits > 0 && visits % 5 === 0 ? '#F59E0B' : 'rgba(255,255,255,0.05)',
          border: `2px solid ${visits > 0 && visits % 5 === 0 ? '#F59E0B' : 'rgba(255,255,255,0.1)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Gift size={11} color={visits > 0 && visits % 5 === 0 ? '#080C14' : '#475569'} />
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: typeof Users
  label: string
  value: string | number
  sub?: string
  color: string
}) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>{label}</span>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `${color}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={18} color={color} />
        </div>
      </div>
      <strong style={{ fontSize: 28, fontWeight: 800, color: '#F1F5F9', fontFamily: 'Sora, sans-serif', lineHeight: 1 }}>
        {value}
      </strong>
      {sub && <span style={{ fontSize: 12, color: '#475569', fontFamily: 'Tajawal, sans-serif' }}>{sub}</span>}
    </div>
  )
}

function timeAgo(val?: string | null) {
  if (!val) return '--'
  const mins = Math.floor((Date.now() - new Date(val).getTime()) / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `منذ ${mins} دقيقة`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `منذ ${hrs} ساعة`
  return `منذ ${Math.floor(hrs / 24)} يوم`
}

function formatPhone(phone: string) {
  const p = phone.replace(/\D/g, '')
  if (p.startsWith('966') && p.length === 12) {
    return `0${p.slice(3, 6)} ${p.slice(6, 9)} ${p.slice(9)}`
  }
  return phone
}

type WalkInForm = { name: string; phone: string; service: string; price: string }
type Toast = { id: number; message: string; type: 'milestone' | 'success' }

const SERVICES = ['غسيل عادي', 'غسيل بريميوم', 'غسيل داخلي وخارجي', 'تلميع', 'غسيل سريع']

export function CarWashOverview() {
  const { companyId, loading: authLoading } = useClientCompany()
  const [customers, setCustomers] = useState<CWCustomer[]>([])
  const [recentVisits, setRecentVisits] = useState<CWVisit[]>([])
  const [pendingReviews, setPendingReviews] = useState(0)
  const [todayVisits, setTodayVisits] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)
  const [form, setForm] = useState<WalkInForm>({ name: '', phone: '', service: SERVICES[0], price: '' })

  const addToast = (message: string, type: Toast['type'] = 'success') => {
    const id = ++toastId.current
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000)
  }

  const load = async () => {
    if (!companyId) return
    setLoading(true)

    const today = new Date().toISOString().slice(0, 10)
    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString()

    const [
      { data: customersData },
      { count: todayCount },
      { count: pendingCount },
      { data: visitsData },
    ] = await Promise.all([
      supabase
        .from('cw_customers')
        .select('*')
        .eq('company_id', companyId)
        .order('last_visit_at', { ascending: false })
        .limit(100),
      supabase
        .from('cw_visits')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('created_at', today),
      supabase
        .from('cw_visits')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('review_request_sent', false)
        .lt('created_at', twoHoursAgo),
      supabase
        .from('cw_visits')
        .select('id, customer_id, service_name, review_request_sent, created_at, cw_customers(name, phone)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    setCustomers((customersData as CWCustomer[]) || [])
    setTodayVisits(todayCount || 0)
    setPendingReviews(pendingCount || 0)
    setRecentVisits((visitsData as unknown as CWVisit[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    if (authLoading || !companyId) return
    load()

    const channel = supabase
      .channel(`cw_overview_${companyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cw_visits' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cw_customers' }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [authLoading, companyId])

  // Walk-in registration
  const handleWalkIn = async () => {
    const phone = form.phone.replace(/\D/g, '')
    if (!phone || phone.length < 9) return
    if (!companyId) return
    setSubmitting(true)

    // Normalize phone to 966XXXXXXXXX
    const normalizedPhone = phone.startsWith('966') ? phone : phone.startsWith('0') ? `966${phone.slice(1)}` : `966${phone}`

    // Check if customer exists
    const { data: existing } = await supabase
      .from('cw_customers')
      .select('id, total_visits, name')
      .eq('company_id', companyId)
      .eq('phone', normalizedPhone)
      .maybeSingle()

    const newVisitCount = (existing?.total_visits || 0) + 1
    const isMilestone = newVisitCount > 1 && newVisitCount % 5 === 0

    let customerId = existing?.id

    if (existing) {
      // Update visit count
      let tier = 'bronze'
      if (newVisitCount >= 20) tier = 'gold'
      else if (newVisitCount >= 10) tier = 'silver'
      await supabase.from('cw_customers').update({
        total_visits: newVisitCount,
        last_visit_at: new Date().toISOString(),
        loyalty_tier: tier,
        name: form.name || existing.name,
      }).eq('id', existing.id)
    } else {
      // Insert new customer
      const { data: newCustomer } = await supabase.from('cw_customers').insert({
        company_id: companyId,
        phone: normalizedPhone,
        name: form.name || null,
        total_visits: 1,
        last_visit_at: new Date().toISOString(),
      }).select('id').single()
      customerId = newCustomer?.id
    }

    // Insert visit
    if (customerId) {
      await supabase.from('cw_visits').insert({
        company_id: companyId,
        customer_id: customerId,
        service_name: form.service || null,
        price: form.price ? parseFloat(form.price) : 0,
      })
    }

    setSubmitting(false)
    setShowModal(false)
    setForm({ name: '', phone: '', service: SERVICES[0], price: '' })

    if (isMilestone) {
      addToast(`🎉 ${form.name || 'العميل'} وصل الزيارة ${newVisitCount} — يستحق غسيل مجاني!`, 'milestone')
    } else {
      addToast(`✅ تم تسجيل الزيارة رقم ${newVisitCount} لـ ${form.name || normalizedPhone}`)
    }

    load()
  }

  const milestones = customers.filter(c => c.total_visits > 0 && c.total_visits % 5 === 0).length
  const filteredCustomers = customers.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (c.name || '').toLowerCase().includes(q) || c.phone.includes(q)
  })

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280, gap: 12 }}>
        <Loader2 size={20} className="animate-spin" color="#22D3EE" />
        <span style={{ color: '#475569', fontFamily: 'Tajawal, sans-serif', fontSize: 14 }}>جاري تحميل بيانات المغسلة...</span>
      </div>
    )
  }

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 24, position: 'relative' }}>

      {/* Toast notifications */}
      <div style={{ position: 'fixed', top: 20, left: 20, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding: '12px 18px', borderRadius: 12, fontSize: 14, fontFamily: 'Tajawal, sans-serif',
            background: t.type === 'milestone' ? '#0D1422' : '#0D1422',
            border: `1px solid ${t.type === 'milestone' ? '#F59E0B' : '#10B981'}`,
            color: t.type === 'milestone' ? '#F59E0B' : '#10B981',
            boxShadow: `0 4px 24px ${t.type === 'milestone' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.15)'}`,
            maxWidth: 320, direction: 'rtl',
          }}>
            {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#F1F5F9', fontFamily: 'Cairo, sans-serif', margin: 0 }}>
            لوحة المغسلة
          </h1>
          <p style={{ fontSize: 13, color: '#475569', fontFamily: 'Tajawal, sans-serif', marginTop: 4 }}>
            عملاء الـ walk-in، الولاء، وطلبات التقييم — كل شي من مكان واحد
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
            background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)',
            borderRadius: 10, fontSize: 12, color: '#22D3EE', fontFamily: 'Tajawal, sans-serif'
          }}>
            <Droplets size={14} />
            كل 4 غسلات والخامسة مجانية
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px',
              background: 'linear-gradient(135deg, #22D3EE, #4F6EF7)',
              border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700,
              color: '#080C14', fontFamily: 'Cairo, sans-serif', cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            تسجيل زيارة
          </button>
        </div>
      </div>

      {/* Walk-in Modal */}
      {showModal && (
        <div
          onClick={e => e.target === e.currentTarget && setShowModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <div style={{
            background: '#0C0D14', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20, width: '100%', maxWidth: 420, overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.07)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(34,211,238,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Car size={18} color="#22D3EE" />
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Cairo, sans-serif', margin: 0 }}>تسجيل زيارة جديدة</h3>
                  <p style={{ fontSize: 11, color: '#475569', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>walk-in مباشر بدون واتساب</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div dir="rtl" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'اسم العميل', key: 'name', placeholder: 'مثال: أحمد العتيبي', type: 'text' },
                { label: 'رقم الجوال *', key: 'phone', placeholder: '05XXXXXXXX', type: 'tel' },
                { label: 'السعر (ريال)', key: 'price', placeholder: '0', type: 'number' },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', display: 'block', marginBottom: 6 }}>{label}</label>
                  <input
                    type={type}
                    value={form[key as keyof WalkInForm]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    dir={key === 'phone' || key === 'price' ? 'ltr' : 'rtl'}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      color: '#F1F5F9', outline: 'none', fontFamily: key === 'phone' ? 'Sora, sans-serif' : 'Tajawal, sans-serif',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', display: 'block', marginBottom: 6 }}>نوع الخدمة</label>
                <select
                  value={form.service}
                  onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
                  dir="rtl"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    color: '#F1F5F9', outline: 'none', fontFamily: 'Tajawal, sans-serif',
                    boxSizing: 'border-box', cursor: 'pointer',
                  }}
                >
                  {SERVICES.map(s => <option key={s} value={s} style={{ background: '#0D1422' }}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ padding: '0 22px 22px', display: 'flex', gap: 10 }}>
              <button
                onClick={handleWalkIn}
                disabled={submitting || !form.phone}
                style={{
                  flex: 1, padding: '11px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                  background: submitting || !form.phone ? '#1E293B' : 'linear-gradient(135deg, #22D3EE, #4F6EF7)',
                  color: submitting || !form.phone ? '#475569' : '#080C14',
                  border: 'none', cursor: submitting || !form.phone ? 'not-allowed' : 'pointer',
                  fontFamily: 'Cairo, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {submitting ? 'جاري التسجيل...' : 'تسجيل الزيارة'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '11px 20px', borderRadius: 12, fontSize: 13,
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                  color: '#64748B', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <StatCard icon={Users} label="إجمالي العملاء" value={customers.length} sub="مسجلون في النظام" color="#22D3EE" />
        <StatCard icon={Car} label="زيارات اليوم" value={todayVisits} sub="walk-in مسجّل" color="#4F6EF7" />
        <StatCard icon={Trophy} label="مكافآت ولاء" value={milestones} sub="وصلوا الغسلة الخامسة" color="#F59E0B" />
        <StatCard
          icon={pendingReviews > 0 ? AlertCircle : CheckCircle2}
          label="طلبات تقييم معلقة"
          value={pendingReviews}
          sub={pendingReviews > 0 ? 'تنتظر الإرسال (بعد ساعتين)' : 'كل الطلبات أُرسلت ✓'}
          color={pendingReviews > 0 ? '#EF4444' : '#10B981'}
        />
      </div>

      {/* Customers Table */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 18,
        overflow: 'hidden',
      }}>
        {/* Table Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexWrap: 'wrap', gap: 12,
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Cairo, sans-serif', margin: 0 }}>
            قائمة العملاء
          </h2>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث باسم أو رقم جوال..."
            dir="rtl"
            style={{
              padding: '8px 14px', borderRadius: 10, fontSize: 13,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#F1F5F9', outline: 'none', fontFamily: 'Tajawal, sans-serif',
              width: 220,
            }}
          />
        </div>

        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 140px 120px 140px 90px 90px',
          padding: '10px 22px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          fontSize: 11, fontWeight: 600, color: '#475569',
          fontFamily: 'Tajawal, sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          <span>الاسم</span>
          <span>رقم الجوال</span>
          <span>تقدم الولاء</span>
          <span>آخر زيارة</span>
          <span>الزيارات</span>
          <span>المستوى</span>
        </div>

        {/* Rows */}
        {filteredCustomers.length === 0 ? (
          <div style={{ padding: '40px 22px', textAlign: 'center', color: '#475569', fontFamily: 'Tajawal, sans-serif', fontSize: 14 }}>
            {customers.length === 0
              ? 'لا يوجد عملاء مسجلون بعد — سيظهرون هنا بمجرد أول walk-in'
              : 'لا توجد نتائج'}
          </div>
        ) : (
          filteredCustomers.map((c, i) => (
            <div
              key={c.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 140px 120px 140px 90px 90px',
                padding: '14px 22px',
                borderBottom: i < filteredCustomers.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                alignItems: 'center',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.025)')}
              onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
            >
              {/* Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'rgba(34,211,238,0.12)',
                  border: '1px solid rgba(34,211,238,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: '#22D3EE', flexShrink: 0,
                }}>
                  {(c.name || c.phone).slice(0, 1)}
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#E2E8F0', fontFamily: 'Tajawal, sans-serif' }}>
                  {c.name || '—'}
                </span>
              </div>

              {/* Phone */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8', fontSize: 13, fontFamily: 'Sora, sans-serif', direction: 'ltr' }}>
                <Phone size={12} color="#475569" />
                {formatPhone(c.phone)}
              </div>

              {/* Loyalty bar */}
              <LoyaltyBar visits={c.total_visits} />

              {/* Last visit */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>
                <Clock size={12} color="#475569" />
                {timeAgo(c.last_visit_at)}
              </div>

              {/* Total visits */}
              <span style={{ fontSize: 15, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Sora, sans-serif', textAlign: 'center' }}>
                {c.total_visits}
              </span>

              {/* Tier */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: `${TIER_COLORS[c.loyalty_tier] || '#CD7F32'}18`,
                color: TIER_COLORS[c.loyalty_tier] || '#CD7F32',
                fontFamily: 'Tajawal, sans-serif',
                border: `1px solid ${TIER_COLORS[c.loyalty_tier] || '#CD7F32'}30`,
              }}>
                <Star size={10} />
                {TIER_LABELS[c.loyalty_tier] || 'برونزي'}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Recent Walk-ins */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 16,
      }}>

        {/* Recent visits */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 18, overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <RotateCcw size={15} color="#22D3EE" />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Cairo, sans-serif', margin: 0 }}>
              آخر الزيارات
            </h3>
          </div>
          {recentVisits.length === 0 ? (
            <div style={{ padding: '28px 20px', textAlign: 'center', color: '#475569', fontFamily: 'Tajawal, sans-serif', fontSize: 13 }}>
              لا توجد زيارات مسجلة بعد
            </div>
          ) : (
            recentVisits.map((v, i) => {
              const customer = v.cw_customers
              return (
                <div key={v.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 20px',
                  borderBottom: i < recentVisits.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: 'rgba(79,110,247,0.12)', border: '1px solid rgba(79,110,247,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: '#4F6EF7', flexShrink: 0,
                  }}>
                    <Car size={13} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0', fontFamily: 'Tajawal, sans-serif' }}>
                      {customer?.name || 'عميل'}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'Sora, sans-serif', direction: 'ltr', display: 'inline-block' }}>
                      {customer ? formatPhone(customer.phone) : '—'}
                      {v.service_name ? <span style={{ color: '#475569', marginRight: 8 }}> · {v.service_name}</span> : null}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span style={{ fontSize: 11, color: '#475569', fontFamily: 'Tajawal, sans-serif' }}>{timeAgo(v.created_at)}</span>
                    {v.review_request_sent
                      ? <span style={{ fontSize: 10, color: '#10B981', fontFamily: 'Tajawal, sans-serif' }}>✓ طلب تقييم أُرسل</span>
                      : <span style={{ fontSize: 10, color: '#F59E0B', fontFamily: 'Tajawal, sans-serif' }}>⏳ في انتظار التقييم</span>
                    }
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Loyalty milestones */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 18, overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Trophy size={15} color="#F59E0B" />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Cairo, sans-serif', margin: 0 }}>
              عملاء يستحقون مكافأة ولاء
            </h3>
          </div>
          {customers.filter(c => c.total_visits % 5 === 0 && c.total_visits > 0).length === 0 ? (
            <div style={{ padding: '28px 20px', textAlign: 'center', color: '#475569', fontFamily: 'Tajawal, sans-serif', fontSize: 13 }}>
              لا يوجد عملاء وصلوا المكافأة حالياً
            </div>
          ) : (
            customers.filter(c => c.total_visits % 5 === 0 && c.total_visits > 0).slice(0, 6).map((c, i, arr) => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 20px',
                borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Gift size={14} color="#F59E0B" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0', fontFamily: 'Tajawal, sans-serif' }}>
                    {c.name || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'Sora, sans-serif', direction: 'ltr', display: 'inline-block' }}>
                    {formatPhone(c.phone)}
                  </div>
                </div>
                <div style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: 'rgba(245,158,11,0.12)', color: '#F59E0B',
                  border: '1px solid rgba(245,158,11,0.25)', fontFamily: 'Tajawal, sans-serif',
                }}>
                  {c.total_visits} زيارة 🎉
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}
