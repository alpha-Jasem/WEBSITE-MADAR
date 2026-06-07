import { useEffect, useMemo, useState } from 'react'
import { fetchCompanies, supabase } from '../../../lib/supabase'
import { AdminAddClientModal } from './AdminAddClientModal'
import { AdminClientDrawer } from './AdminClientDrawer'
import type { Company } from '../../../types'

type TenantHealth = { companyId: string; score: number; services: number; workers: number; carsToday: number; issues: string[] }

const planColors: Record<string, string> = { starter: '#00BFFF', growth: '#3078FF', enterprise: '#F59E0B' }
const planLabels: Record<string, string> = { starter: 'Starter', growth: 'Pro', enterprise: 'Premium' }
const businessLabels: Record<string, string> = { clinic: 'عيادة', car_wash: 'مغسلة', real_estate: 'عقار', other: 'أخرى' }

function getMessageUsage(c: Company) { const l = c.message_limit || 0; if (!l) return 0; return Math.min(100, Math.round(((c.messages_used || 0) / l) * 100)) }
function featureEnabled(c: Company, key: string) { return Boolean((c.cw_automations as any)?.feature_flags?.[key]) }
function daysUntil(date?: string | null) { if (!date) return null; return Math.ceil((new Date(date).getTime() - Date.now()) / (24 * 60 * 60 * 1000)) }

const statusBadge: Record<string, string> = { active: 'green', trial: 'amber', suspended: 'red' }
const statusLabel: Record<string, string> = { active: 'نشطة', trial: 'تجريبية', suspended: 'موقوفة' }

export const AdminCompanies = () => {
  const [companies, setCompanies] = useState<Company[]>([])
  const [health, setHealth] = useState<Record<string, TenantHealth>>({})
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'trial' | 'suspended'>('all')
  const [showModal, setShowModal] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyCompanyId, setBusyCompanyId] = useState<string | null>(null)

  const loadTenantHealth = async (list: Company[]) => {
    const carWashes = list.filter(c => c.business_type === 'car_wash' || c.industry === 'car_wash')
    if (!carWashes.length) { setHealth({}); return }
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const [{ data: services }, { data: workers }, { data: queue }] = await Promise.all([
      supabase.from('cw_services').select('company_id, active'),
      supabase.from('cw_workers').select('company_id, active'),
      supabase.from('cw_queue').select('company_id, created_at, status').gte('created_at', todayStart.toISOString()),
    ])
    const countBy = <T extends { company_id: string }>(rows: T[], pred: (r: T) => boolean = () => true) =>
      rows.reduce<Record<string, number>>((acc, r) => { if (pred(r)) acc[r.company_id] = (acc[r.company_id] || 0) + 1; return acc }, {})
    const svcByC = countBy((services || []) as any[], r => r.active !== false)
    const wrkByC = countBy((workers || []) as any[], r => r.active !== false)
    const carsByC = countBy((queue || []) as any[], r => r.status !== 'cancelled')
    const next: Record<string, TenantHealth> = {}
    for (const c of carWashes) {
      const issues: string[] = []; let score = 0
      const svc = svcByC[c.id] || 0, wrk = wrkByC[c.id] || 0, cars = carsByC[c.id] || 0, msg = getMessageUsage(c)
      if (c.status === 'active') score += 15; else issues.push('الحساب غير نشط')
      if (c.public_checkin_token || c.webhook_token) score += 20; else issues.push('QR غير جاهز')
      if (svc > 0) score += 20; else issues.push('لا توجد خدمات')
      if (wrk > 0) score += 20; else issues.push('لا يوجد موظفون')
      if (cars > 0) score += 15; else issues.push('لا يوجد تشغيل اليوم')
      if (msg < 80) score += 10; else issues.push('قريب من حد الرسائل')
      next[c.id] = { companyId: c.id, score, services: svc, workers: wrk, carsToday: cars, issues }
    }
    setHealth(next)
  }

  const load = async () => {
    setLoading(true)
    const list = await fetchCompanies()
    setCompanies(list)
    await loadTenantHealth(list)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const updateCompany = async (company: Company, patch: Partial<Company>, action: string) => {
    setBusyCompanyId(company.id)
    const { error } = await supabase.from('companies').update(patch as any).eq('id', company.id)
    if (!error) {
      await supabase.from('logs').insert({ company_id: company.id, level: 'success', event: action, message: `Admin updated company ${company.name}`, meta: patch })
      await load()
    }
    setBusyCompanyId(null)
  }

  const activateTrial = (c: Company) => updateCompany(c, { status: 'active', plan_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() } as Partial<Company>, 'admin_trial_activated')
  const extendTrial = (c: Company) => updateCompany(c, { status: 'trial', plan_reset_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() } as Partial<Company>, 'admin_trial_extended')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return companies.filter(c => {
      const matchSearch = !q || c.name.toLowerCase().includes(q) || c.owner_name.toLowerCase().includes(q) || c.owner_email.toLowerCase().includes(q)
      return matchSearch && (filter === 'all' || c.status === filter)
    })
  }, [companies, filter, search])

  const nearLimit = companies.filter(c => getMessageUsage(c) >= 80)
  const expiringTrials = companies.filter(c => c.status === 'trial' && (daysUntil(c.plan_reset_at) ?? 99) <= 3)
  const healthRows = Object.values(health)
  const readyTenants = healthRows.filter(r => r.score >= 85).length
  const atRisk = healthRows.filter(r => r.score < 55).length
  const commonIssue = Object.entries(healthRows.flatMap(r => r.issues).reduce<Record<string, number>>((a, i) => { a[i] = (a[i] || 0) + 1; return a }, {})).sort((a, b) => b[1] - a[1])[0]

  return (
    <div className="page fade-in">
      {showModal && <AdminAddClientModal onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); load() }} />}
      {selectedCompany && <AdminClientDrawer company={selectedCompany} onClose={() => setSelectedCompany(null)} onUpdated={() => { load(); setSelectedCompany(null) }} />}

      <div className="sec-head" style={{ marginBottom: 24 }}>
        <div>
          <div className="sec-title">الشركات</div>
          <div className="sec-sub">راقب الباقات، الصحة التشغيلية، والإضافات لكل عميل</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          إضافة شركة
        </button>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'إجمالي الشركات', value: companies.length },
          { label: 'نشطة', value: companies.filter(c => c.status === 'active').length },
          { label: 'تجريبية تنتهي قريباً', value: expiringTrials.length },
          { label: 'قرب حد الرسائل', value: nearLimit.length },
        ].map((s, i) => (
          <div key={i} className="stat">
            <div className="stat-top"><div className="stat-label">{s.label}</div></div>
            <div className="stat-value num">{s.value}</div>
          </div>
        ))}
      </div>

      {(readyTenants > 0 || atRisk > 0) && (
        <div className="row gap-3" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
          <div className="card row gap-3" style={{ padding: '10px 16px', flex: 1, minWidth: 200 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
            <span style={{ fontSize: 13 }}>جاهزة للتسليم: <strong style={{ color: 'var(--green)' }}>{readyTenants}</strong></span>
          </div>
          <div className="card row gap-3" style={{ padding: '10px 16px', flex: 1, minWidth: 200 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
            <span style={{ fontSize: 13 }}>خطر تجربة سيئة: <strong style={{ color: 'var(--red)' }}>{atRisk}</strong></span>
          </div>
          {commonIssue && (
            <div className="card row gap-3" style={{ padding: '10px 16px', flex: 1, minWidth: 200 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--amber)', flexShrink: 0 }} />
              <span style={{ fontSize: 13 }}>أكثر نقص: <strong style={{ color: 'var(--amber)' }}>{commonIssue[0]} ({commonIssue[1]})</strong></span>
            </div>
          )}
        </div>
      )}

      <div className="row gap-3" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="card row gap-2" style={{ padding: '9px 14px', flex: 1, minWidth: 220 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--ink-3)', flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث باسم الشركة أو المالك أو البريد..."
            style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--ink)', flex: 1 }} />
        </div>
        <div className="pills">
          {(['all', 'active', 'trial', 'suspended'] as const).map(s => (
            <button key={s} className={`pill ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
              {s === 'all' ? 'الكل' : statusLabel[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>الشركة</th>
              <th>النشاط</th>
              <th>الباقة</th>
              <th>الحالة</th>
              <th>الصحة</th>
              <th>الرسائل</th>
              <th>الإضافات</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--ink-3)' }}>جاري تحميل الشركات…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--ink-3)' }}>لا توجد نتائج مطابقة</td></tr>
            ) : filtered.map(company => {
              const color = planColors[company.plan] || 'var(--primary)'
              const usage = getMessageUsage(company)
              const rowHealth = health[company.id]
              const trialDays = company.status === 'trial' ? daysUntil(company.plan_reset_at) : null
              return (
                <tr key={company.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedCompany(company)}>
                  <td>
                    <div className="row gap-3">
                      <div className="av" style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}>{company.name[0]}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{company.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{company.owner_email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge gray">{businessLabels[company.business_type ?? 'other'] || 'أخرى'}</span>
                  </td>
                  <td>
                    <span className="badge" style={{ background: color + '20', color }}>{planLabels[company.plan] || company.plan}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span className={`badge ${statusBadge[company.status] || 'gray'}`}>{statusLabel[company.status] || company.status}</span>
                      {trialDays !== null && <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>{trialDays > 0 ? `باقي ${trialDays} يوم` : 'انتهت'}</span>}
                    </div>
                  </td>
                  <td>
                    {rowHealth ? (
                      <div style={{ minWidth: 100 }}>
                        <div className="row gap-2" style={{ marginBottom: 4 }}>
                          <span style={{ flex: 1, fontSize: 11, color: 'var(--ink-3)' }}>{rowHealth.issues[0] || 'جاهزة'}</span>
                          <strong style={{ fontSize: 11, fontFamily: 'var(--mono)', color: rowHealth.score >= 80 ? 'var(--green)' : rowHealth.score >= 55 ? 'var(--amber)' : 'var(--red)' }}>{rowHealth.score}</strong>
                        </div>
                        <div className="prog">
                          <div className="prog-fill" style={{ width: `${rowHealth.score}%`, background: rowHealth.score >= 80 ? 'var(--green)' : rowHealth.score >= 55 ? 'var(--amber)' : 'var(--red)' }} />
                        </div>
                      </div>
                    ) : <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>—</span>}
                  </td>
                  <td>
                    <div style={{ minWidth: 100 }}>
                      <div className="row gap-2" style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--ink-3)', flex: 1 }}>{(company.messages_used || 0).toLocaleString()}</span>
                        <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: usage >= 80 ? 'var(--red)' : 'var(--ink-3)' }}>{usage}%</span>
                      </div>
                      <div className="prog">
                        <div className="prog-fill" style={{ width: `${usage}%`, background: usage >= 80 ? 'var(--red)' : color }} />
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(company.public_checkin_token || company.webhook_token) && <span className="badge blue">QR</span>}
                      {featureEnabled(company, 'wallet') && <span className="badge green">محفظة</span>}
                      {featureEnabled(company, 'memberships') && <span className="badge amber">اشتراكات</span>}
                      {!featureEnabled(company, 'wallet') && !featureEnabled(company, 'memberships') && !(company.public_checkin_token || company.webhook_token) && (
                        <span className="badge gray">أساسي</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                      {company.status === 'trial' && (
                        <>
                          <button className="btn btn-green btn-sm" disabled={busyCompanyId === company.id} onClick={() => activateTrial(company)}>تفعيل</button>
                          <button className="btn btn-ghost btn-sm" disabled={busyCompanyId === company.id} onClick={() => extendTrial(company)}>تمديد</button>
                        </>
                      )}
                      {company.status !== 'trial' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelectedCompany(company)}>تفاصيل</button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
