import { useCallback, useEffect, useState } from 'react'
import {
  Car, Check, ChevronDown, ChevronUp, Copy, ExternalLink, Key, Loader2,
  QrCode, RefreshCw, Search, Settings, Shield, X, Zap,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { getSelfCheckinUrl } from '../../../lib/selfCheckin'
import type { Company, Plan } from '../../../types'

type CWCompany = Company & { carsToday?: number; servicesCount?: number }

const PLAN_LABELS: Record<Plan, string> = { starter: 'Starter', growth: 'Pro', enterprise: 'Premium' }
const PLAN_COLORS: Record<Plan, string> = { starter: '#00BFFF', growth: '#1565C0', enterprise: '#F59E0B' }
const PLAN_LIMITS: Record<Plan, number> = { starter: 500, growth: 2000, enterprise: 10000 }
const STATUS_LABELS: Record<string, string> = { active: 'نشط', trial: 'تجريبي', suspended: 'موقوف' }
const STATUS_COLORS: Record<string, string> = { active: '#10B981', trial: '#F59E0B', suspended: '#EF4444' }

function generateToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: 24 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function timeAgo(iso?: string | null) {
  if (!iso) return '—'
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `منذ ${mins} دقيقة`
  if (mins < 1440) return `منذ ${Math.floor(mins / 60)} ساعة`
  return `منذ ${Math.floor(mins / 1440)} يوم`
}

function MsgBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const color = pct >= 90 ? '#EF4444' : pct >= 70 ? '#F59E0B' : '#10B981'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 5, borderRadius: 4, background: '#EEF2F8', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 10, color: '#64748B', fontFamily: 'Sora,sans-serif', whiteSpace: 'nowrap' }}>{used.toLocaleString('en-US')}/{limit.toLocaleString('en-US')}</span>
    </div>
  )
}

export function AdminCarWashAccounts() {
  const [companies, setCompanies] = useState<CWCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'trial' | 'suspended' | 'no_qr'>('all')
  const [selected, setSelected] = useState<CWCompany | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [copiedToken, setCopiedToken] = useState(false)
  const [generatingToken, setGeneratingToken] = useState(false)

  // Edit draft
  const [draftPlan, setDraftPlan] = useState<Plan>('starter')
  const [draftStatus, setDraftStatus] = useState<string>('trial')
  const [draftMsgLimit, setDraftMsgLimit] = useState(500)
  const [draftGwId, setDraftGwId] = useState('')
  const [draftGwToken, setDraftGwToken] = useState('')
  const [expandSection, setExpandSection] = useState<'main' | 'api' | 'qr'>('main')

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const { data } = await supabase
      .from('companies')
      .select('*')
      .or('business_type.eq.car_wash,industry.eq.car_wash')
      .order('created_at', { ascending: false })
    if (data) {
      // Enrich with today's cars count
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const { data: queue } = await supabase
        .from('cw_queue')
        .select('company_id')
        .gte('created_at', today.toISOString())
      const { data: services } = await supabase
        .from('cw_services')
        .select('company_id')
        .eq('active', true)
      const carsByC: Record<string, number> = {}
      const svcByC: Record<string, number> = {}
      queue?.forEach(r => { carsByC[r.company_id] = (carsByC[r.company_id] || 0) + 1 })
      services?.forEach(r => { svcByC[r.company_id] = (svcByC[r.company_id] || 0) + 1 })
      setCompanies(data.map(c => ({ ...c, carsToday: carsByC[c.id] || 0, servicesCount: svcByC[c.id] || 0 })))
    }
    if (!silent) setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openCompany = (c: CWCompany) => {
    setSelected(c)
    setDraftPlan(c.plan)
    setDraftStatus(c.status)
    setDraftMsgLimit(c.message_limit || PLAN_LIMITS[c.plan])
    setDraftGwId((c.cw_automations as any)?.green_api?.idInstance || '')
    setDraftGwToken((c.cw_automations as any)?.green_api?.apiTokenInstance || '')
    setExpandSection('main')
  }

  const save = async () => {
    if (!selected) return
    setSaving(true)
    const existingAutomations = (selected.cw_automations as any) || {}
    const { error } = await supabase.from('companies').update({
      plan: draftPlan,
      status: draftStatus,
      message_limit: draftMsgLimit,
      cw_automations: {
        ...existingAutomations,
        green_api: { idInstance: draftGwId.trim(), apiTokenInstance: draftGwToken.trim() },
      },
    } as any).eq('id', selected.id)
    setSaving(false)
    if (error) { setNotice('خطأ في الحفظ: ' + error.message); return }
    setNotice('تم الحفظ ✓')
    setTimeout(() => setNotice(''), 2500)
    await load(true)
    const updated = await supabase.from('companies').select('*').eq('id', selected.id).single()
    if (updated.data) setSelected({ ...selected, ...updated.data })
  }

  const generateQrToken = async () => {
    if (!selected) return
    setGeneratingToken(true)
    const token = generateToken()
    const { error } = await supabase.from('companies').update({ public_checkin_token: token } as any).eq('id', selected.id)
    setGeneratingToken(false)
    if (error) { setNotice('خطأ: ' + error.message); return }
    setSelected(prev => prev ? { ...prev, public_checkin_token: token } : prev)
    setNotice('تم إنشاء رمز QR ✓')
    setTimeout(() => setNotice(''), 2500)
    load(true)
  }

  const filtered = companies.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.name.toLowerCase().includes(q) || (c.owner_email || '').toLowerCase().includes(q) || (c.owner_phone || '').includes(q)
    if (!matchSearch) return false
    if (filter === 'active') return c.status === 'active'
    if (filter === 'trial') return c.status === 'trial'
    if (filter === 'suspended') return c.status === 'suspended'
    if (filter === 'no_qr') return !c.public_checkin_token && !c.webhook_token
    return true
  })

  const checkinUrl = selected ? getSelfCheckinUrl(selected as any) : ''
  const qrSrc = checkinUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=14&data=${encodeURIComponent(checkinUrl)}`
    : ''

  return (
    <div style={{ padding: '24px 28px', minHeight: '100vh', fontFamily: 'Tajawal, Cairo, sans-serif', direction: 'rtl' }}>
      {/* Title */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Car size={20} color="#0EA5E9" />
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#0D1B3E', fontFamily: 'Cairo,sans-serif' }}>حسابات Car Wash OS</h1>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>إدارة الباقات والصلاحيات والرموز لجميع مغاسل السيارات</p>
      </div>

      {/* Notice */}
      {notice && (
        <div style={{ marginBottom: 16, padding: '10px 16px', borderRadius: 10, background: notice.includes('خطأ') ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${notice.includes('خطأ') ? '#FCA5A5' : '#86EFAC'}`, fontSize: 13, color: notice.includes('خطأ') ? '#DC2626' : '#16A34A', fontWeight: 600 }}>
          {notice}
        </div>
      )}

      {/* Search + Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو الجوال..."
            style={{ width: '100%', padding: '9px 36px 9px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, outline: 'none', fontFamily: 'Tajawal,sans-serif', boxSizing: 'border-box' }} />
        </div>
        {(['all', 'active', 'trial', 'suspended', 'no_qr'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '7px 14px', borderRadius: 9, border: '1.5px solid', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Tajawal,sans-serif',
            background: filter === f ? '#0EA5E9' : '#F8FAFC',
            borderColor: filter === f ? '#0EA5E9' : '#E2E8F0',
            color: filter === f ? '#fff' : '#475569',
          }}>
            {f === 'all' ? 'الكل' : f === 'active' ? 'نشط' : f === 'trial' ? 'تجريبي' : f === 'suspended' ? 'موقوف' : 'بدون QR'}
          </button>
        ))}
        <button onClick={() => load()} style={{ padding: '7px 14px', borderRadius: 9, border: '1.5px solid #E2E8F0', background: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569' }}>
          <RefreshCw size={13} /> تحديث
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'إجمالي', val: companies.length, color: '#0EA5E9' },
          { label: 'نشط', val: companies.filter(c => c.status === 'active').length, color: '#10B981' },
          { label: 'تجريبي', val: companies.filter(c => c.status === 'trial').length, color: '#F59E0B' },
          { label: 'بدون QR', val: companies.filter(c => !c.public_checkin_token && !c.webhook_token).length, color: '#EF4444' },
        ].map(s => (
          <div key={s.label} style={{ padding: '10px 18px', borderRadius: 12, background: '#fff', border: '1.5px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: s.color, fontFamily: 'Sora,sans-serif' }}>{s.val}</span>
            <span style={{ fontSize: 12, color: '#64748B' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}><Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8', fontSize: 14 }}>لا توجد نتائج</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #E2E8F0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                {['المغسلة', 'الباقة / الحالة', 'الرسائل', 'سيارات اليوم', 'QR', 'آخر تسجيل', ''].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 800, color: '#475569', fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const hasQr = !!(c.public_checkin_token || c.webhook_token)
                return (
                  <tr key={c.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F1F5F9' : 'none', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFF')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 800, color: '#0D1B3E' }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{c.owner_phone || c.owner_email || '—'}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: `${PLAN_COLORS[c.plan]}18`, color: PLAN_COLORS[c.plan], marginBottom: 3 }}>
                        {PLAN_LABELS[c.plan]}
                      </span>
                      <br />
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: `${STATUS_COLORS[c.status] || '#94A3B8'}18`, color: STATUS_COLORS[c.status] || '#94A3B8' }}>
                        {STATUS_LABELS[c.status] || c.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', minWidth: 150 }}>
                      <MsgBar used={c.messages_used || 0} limit={c.message_limit || 0} />
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: c.carsToday ? '#0EA5E9' : '#94A3B8' }}>
                      {c.carsToday || 0}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: hasQr ? '#F0FDF4' : '#FEF2F2', color: hasQr ? '#16A34A' : '#DC2626' }}>
                        <QrCode size={11} /> {hasQr ? 'جاهز' : 'مفقود'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#94A3B8', fontSize: 11 }}>
                      {timeAgo(c.created_at)}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button onClick={() => openCompany(c)} style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px solid #CBD5E1', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#0D1B3E', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Settings size={12} /> إدارة
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Side drawer */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,27,62,0.45)' }} onClick={() => setSelected(null)} />
          <div style={{
            position: 'absolute', top: 0, left: 0, height: '100%', width: '100%', maxWidth: 480,
            background: '#FFFFFF', boxShadow: '4px 0 40px rgba(0,0,0,0.18)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            {/* Drawer header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F0F4FF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: '#FAFBFF' }}>
              <button onClick={() => setSelected(null)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 900, fontSize: 15, color: '#0D1B3E', fontFamily: 'Cairo,sans-serif' }}>{selected.name}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{selected.owner_phone || selected.owner_email}</div>
              </div>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Car size={18} color="#0EA5E9" />
              </div>
            </div>

            {/* Drawer body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>

              {notice && (
                <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 9, background: notice.includes('خطأ') ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${notice.includes('خطأ') ? '#FCA5A5' : '#86EFAC'}`, fontSize: 12, color: notice.includes('خطأ') ? '#DC2626' : '#16A34A', fontWeight: 600 }}>
                  {notice}
                </div>
              )}

              {/* ─── Section 1: Main settings ─── */}
              <div style={{ marginBottom: 14, borderRadius: 12, border: '1.5px solid #E2E8F0', overflow: 'hidden' }}>
                <button onClick={() => setExpandSection(s => s === 'main' ? 'api' : 'main')} style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC', border: 'none', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Shield size={14} color="#0EA5E9" />
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#0D1B3E', fontFamily: 'Cairo,sans-serif' }}>الباقة والاشتراك</span>
                  </div>
                  {expandSection === 'main' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {expandSection === 'main' && (
                  <div style={{ padding: '16px' }}>
                    {/* Plan */}
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 7 }}>الباقة</label>
                      <div style={{ display: 'flex', gap: 7 }}>
                        {(['starter', 'growth', 'enterprise'] as Plan[]).map(p => (
                          <button key={p} onClick={() => { setDraftPlan(p); setDraftMsgLimit(PLAN_LIMITS[p]) }}
                            style={{ flex: 1, padding: '9px 4px', borderRadius: 9, border: `2px solid ${draftPlan === p ? PLAN_COLORS[p] : '#E2E8F0'}`, background: draftPlan === p ? `${PLAN_COLORS[p]}15` : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 800, color: draftPlan === p ? PLAN_COLORS[p] : '#475569', fontFamily: 'Cairo,sans-serif' }}>
                            {PLAN_LABELS[p]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Status */}
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 7 }}>الحالة</label>
                      <div style={{ display: 'flex', gap: 7 }}>
                        {(['active', 'trial', 'suspended'] as const).map(s => (
                          <button key={s} onClick={() => setDraftStatus(s)}
                            style={{ flex: 1, padding: '9px 4px', borderRadius: 9, border: `2px solid ${draftStatus === s ? STATUS_COLORS[s] : '#E2E8F0'}`, background: draftStatus === s ? `${STATUS_COLORS[s]}15` : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 800, color: draftStatus === s ? STATUS_COLORS[s] : '#475569', fontFamily: 'Cairo,sans-serif' }}>
                            {STATUS_LABELS[s]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Message limit */}
                    <div style={{ marginBottom: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 7 }}>حد الرسائل الشهري</label>
                      <input type="number" min={0} value={draftMsgLimit} onChange={e => setDraftMsgLimit(Number(e.target.value))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1.5px solid #CBD5E1', fontSize: 14, fontFamily: 'Sora,sans-serif', outline: 'none', boxSizing: 'border-box', fontWeight: 700 }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 12 }}>مستخدمة: {(selected.messages_used || 0).toLocaleString('en-US')} رسالة</div>

                    <button onClick={save} disabled={saving} style={{ width: '100%', padding: '11px 0', borderRadius: 10, border: 'none', background: saving ? '#86EFAC' : 'linear-gradient(135deg,#0EA5E9,#0369A1)', color: '#fff', fontSize: 14, fontWeight: 900, fontFamily: 'Cairo,sans-serif', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                      {saving ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Check size={14} />}
                      {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                    </button>
                  </div>
                )}
              </div>

              {/* ─── Section 2: Green API ─── */}
              <div style={{ marginBottom: 14, borderRadius: 12, border: '1.5px solid #E2E8F0', overflow: 'hidden' }}>
                <button onClick={() => setExpandSection(s => s === 'api' ? 'main' : 'api')} style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC', border: 'none', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Zap size={14} color="#10B981" />
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#0D1B3E', fontFamily: 'Cairo,sans-serif' }}>Green API (واتساب)</span>
                  </div>
                  {expandSection === 'api' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {expandSection === 'api' && (
                  <div style={{ padding: '16px' }}>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 5 }}>idInstance</label>
                      <input value={draftGwId} onChange={e => setDraftGwId(e.target.value)} placeholder="7107650352"
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1.5px solid #CBD5E1', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace', direction: 'ltr' }} />
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 5 }}>apiTokenInstance</label>
                      <input value={draftGwToken} onChange={e => setDraftGwToken(e.target.value)} placeholder="token..."
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1.5px solid #CBD5E1', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace', direction: 'ltr' }} />
                    </div>
                    <button onClick={save} disabled={saving} style={{ width: '100%', padding: '11px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', fontSize: 13, fontWeight: 900, fontFamily: 'Cairo,sans-serif', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                      {saving ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Check size={14} />}
                      حفظ إعدادات API
                    </button>
                  </div>
                )}
              </div>

              {/* ─── Section 3: QR Token ─── */}
              <div style={{ borderRadius: 12, border: '1.5px solid #E2E8F0', overflow: 'hidden' }}>
                <button onClick={() => setExpandSection(s => s === 'qr' ? 'main' : 'qr')} style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC', border: 'none', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <QrCode size={14} color="#7C3AED" />
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#0D1B3E', fontFamily: 'Cairo,sans-serif' }}>رمز QR للتسجيل الذاتي</span>
                  </div>
                  {expandSection === 'qr' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {expandSection === 'qr' && (
                  <div style={{ padding: '16px' }}>
                    {checkinUrl ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                        <img src={qrSrc} alt="QR" style={{ width: 180, height: 180, borderRadius: 14, border: '1px solid #E2E8F0', padding: 8, background: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
                        <div style={{ width: '100%', background: '#F1F5F9', borderRadius: 9, padding: '9px 12px', fontSize: 11, color: '#475569', wordBreak: 'break-all', direction: 'ltr', fontFamily: 'monospace' }}>
                          {checkinUrl}
                        </div>
                        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                          <button onClick={() => { navigator.clipboard.writeText(checkinUrl); setCopiedToken(true); setTimeout(() => setCopiedToken(false), 2000) }}
                            style={{ flex: 1, padding: '9px 0', borderRadius: 9, border: '1.5px solid #E2E8F0', background: copiedToken ? '#F0FDF4' : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: copiedToken ? '#16A34A' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                            {copiedToken ? <Check size={13} /> : <Copy size={13} />} {copiedToken ? 'تم النسخ' : 'نسخ'}
                          </button>
                          <a href={checkinUrl} target="_blank" rel="noopener noreferrer"
                            style={{ flex: 1, padding: '9px 0', borderRadius: 9, border: '1.5px solid rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.07)', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, textDecoration: 'none' }}>
                            <ExternalLink size={13} /> فتح
                          </a>
                        </div>
                        <button onClick={generateQrToken} disabled={generatingToken} style={{ width: '100%', padding: '9px 0', borderRadius: 9, border: '1.5px solid #E2E8F0', background: '#F8FAFC', cursor: 'pointer', fontSize: 12, color: '#EF4444', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <Key size={12} /> إعادة إنشاء رمز جديد
                        </button>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '10px 0' }}>
                        <QrCode size={40} color="#CBD5E1" style={{ marginBottom: 10 }} />
                        <p style={{ margin: '0 0 14px', fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>لا يوجد رمز QR لهذه المغسلة بعد. أنشئ رمزاً فريداً الآن.</p>
                        <button onClick={generateQrToken} disabled={generatingToken} style={{ padding: '11px 28px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', color: '#fff', fontSize: 14, fontWeight: 900, fontFamily: 'Cairo,sans-serif', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          {generatingToken ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Key size={14} />}
                          {generatingToken ? 'جاري الإنشاء...' : 'إنشاء رمز QR'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
