import { useEffect, useState } from 'react'
import { Search, Plus, Building2, Car, Stethoscope, Briefcase, MessageSquare, Users2, Zap, ChevronLeft, Droplets, DollarSign, TrendingUp, RotateCcw, ShieldCheck, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import { StatusBadge } from '../shared/StatusBadge'
import { fetchCompanies, supabase } from '../../../lib/supabase'
import { AdminAddClientModal } from './AdminAddClientModal'
import { AdminClientDrawer } from './AdminClientDrawer'
import type { Company } from '../../../types'

interface CWKPIs {
  revenueThisMonth: number
  activeWashes: number
  topWashName: string
  topWashVisits: number
  retentionRate: number
  totalVisitsMonth: number
}

interface TenantHealth {
  companyId: string
  name: string
  score: number
  services: number
  workers: number
  carsToday: number
  messageUsage: number
  issues: string[]
}

const planColors: Record<string, string> = {
  starter: '#06B6D4',
  growth: '#4F6EF7',
  enterprise: '#F59E0B',
}

const planLabels: Record<string, string> = {
  starter: 'ابتدائي',
  growth: 'نمو',
  enterprise: 'مؤسسي',
}

const businessIcons: Record<string, React.ElementType> = {
  clinic: Stethoscope,
  car_wash: Car,
  real_estate: Building2,
  other: Briefcase,
}

export const AdminCompanies = () => {
  const [companies, setCompanies] = useState<Company[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'trial' | 'suspended'>('all')
  const [showModal, setShowModal] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [cwKPIs, setCwKPIs] = useState<CWKPIs | null>(null)
  const [tenantHealth, setTenantHealth] = useState<TenantHealth[]>([])

  const load = async () => {
    const list = await fetchCompanies()
    setCompanies(list)
    loadTenantHealth(list)
  }

  const loadTenantHealth = async (list: Company[]) => {
    const carWashes = list.filter(c => c.business_type === 'car_wash' || c.industry === 'car_wash')
    if (carWashes.length === 0) {
      setTenantHealth([])
      return
    }

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [{ data: services }, { data: workers }, { data: queue }] = await Promise.all([
      supabase.from('cw_services').select('company_id, active'),
      supabase.from('cw_workers').select('company_id, active'),
      supabase.from('cw_queue').select('company_id, created_at').gte('created_at', todayStart.toISOString()),
    ])

    const serviceRows = (services || []) as Array<{ company_id: string; active?: boolean | null }>
    const workerRows = (workers || []) as Array<{ company_id: string; active?: boolean | null }>
    const queueRows = (queue || []) as Array<{ company_id: string }>

    const countByCompany = <T extends { company_id: string }>(rows: T[], predicate: (row: T) => boolean = () => true) =>
      rows.reduce<Record<string, number>>((acc, row) => {
        if (predicate(row)) acc[row.company_id] = (acc[row.company_id] || 0) + 1
        return acc
      }, {})

    const servicesByCompany = countByCompany(serviceRows, row => row.active !== false)
    const workersByCompany = countByCompany(workerRows, row => row.active !== false)
    const carsByCompany = countByCompany(queueRows)

    const health = carWashes.map(company => {
      const servicesCount = servicesByCompany[company.id] || 0
      const workersCount = workersByCompany[company.id] || 0
      const carsToday = carsByCompany[company.id] || 0
      const limit = company.message_limit || 0
      const messageUsage = limit > 0 ? Math.round(((company.messages_used || 0) / limit) * 100) : 0
      const issues: string[] = []
      let score = 0

      if (company.status === 'active') score += 15
      else issues.push('الحساب غير نشط')
      if (company.webhook_token) score += 15
      else issues.push('QR التسجيل غير مفعّل')
      if (servicesCount > 0) score += 20
      else issues.push('لا توجد خدمات مغسلة')
      if (workersCount > 0) score += 20
      else issues.push('لا يوجد موظفون')
      if (carsToday > 0) score += 15
      else issues.push('لا توجد سيارات اليوم')
      if (!limit || messageUsage < 80) score += 15
      else issues.push('قريب من حد الرسائل')

      return {
        companyId: company.id,
        name: company.name,
        score,
        services: servicesCount,
        workers: workersCount,
        carsToday,
        messageUsage,
        issues,
      }
    }).sort((a, b) => a.score - b.score)

    setTenantHealth(health)
  }

  const loadCWKPIs = async () => {
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const monthStr = monthStart.toISOString()

    const [{ data: visits }, { data: customers }] = await Promise.all([
      supabase.from('cw_visits')
        .select('company_id, price, subtotal')
        .gte('created_at', monthStr),
      supabase.from('cw_customers')
        .select('company_id, total_visits'),
    ])

    if (!visits) return

    const revenue = visits.reduce((s, v) => s + (v.subtotal ?? v.price ?? 0), 0)
    const activeWashSet = new Set(visits.map(v => v.company_id))
    const visitsByCompany: Record<string, number> = {}
    for (const v of visits) {
      visitsByCompany[v.company_id] = (visitsByCompany[v.company_id] || 0) + 1
    }
    const topId = Object.entries(visitsByCompany).sort((a, b) => b[1] - a[1])[0]

    const totalCustomers = customers?.length ?? 0
    const returningCustomers = customers?.filter(c => c.total_visits > 1).length ?? 0
    const retentionRate = totalCustomers > 0 ? Math.round((returningCustomers / totalCustomers) * 100) : 0

    let topWashName = '—'
    if (topId) {
      const { data: co } = await supabase.from('companies').select('name').eq('id', topId[0]).single()
      topWashName = co?.name ?? '—'
    }

    setCwKPIs({
      revenueThisMonth: revenue,
      activeWashes: activeWashSet.size,
      topWashName,
      topWashVisits: topId?.[1] ?? 0,
      retentionRate,
      totalVisitsMonth: visits.length,
    })
  }

  useEffect(() => { load(); loadCWKPIs() }, [])

  const filtered = companies.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = c.name.toLowerCase().includes(q) || c.owner_name.toLowerCase().includes(q) || c.owner_email.toLowerCase().includes(q)
    const matchFilter = filter === 'all' || c.status === filter
    return matchSearch && matchFilter
  })

  const carWashCompanies = companies.filter(c => c.business_type === 'car_wash' || c.industry === 'car_wash')
  const qrReadyCompanies = carWashCompanies.filter(c => !!c.webhook_token)
  const nearLimitCompanies = companies.filter(c => {
    const limit = c.message_limit || 0
    if (!limit) return false
    return ((c.messages_used || 0) / limit) >= 0.8
  })

  return (
    <div className="space-y-6">
      {showModal && (
        <AdminAddClientModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); load() }}
        />
      )}

      {selectedCompany && (
        <AdminClientDrawer
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
          onUpdated={() => { load(); setSelectedCompany(null) }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-cairo">الحسابات</h1>
          <p className="text-sm text-slate-500 font-tajawal">{companies.length} عميل مسجّل</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer font-cairo"
          style={{ background: 'linear-gradient(135deg, #4F6EF7, #7C3AED)' }}>
          <Plus size={15} />
          إضافة عميل
        </motion.button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو الإيميل..."
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-2.5 pr-9 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/40 font-tajawal transition-colors"
            dir="rtl"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'trial', 'suspended'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-tajawal cursor-pointer transition-all ${filter === f ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-white bg-white/[0.03]'}`}>
              {f === 'all' ? 'الكل' : f === 'active' ? 'نشط' : f === 'trial' ? 'تجريبي' : 'موقوف'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {[
          { label: 'إجمالي العملاء', value: companies.length, color: '#4F6EF7' },
          { label: 'نشط', value: companies.filter(c => c.status === 'active').length, color: '#10B981' },
          { label: 'تجريبي', value: companies.filter(c => c.status === 'trial').length, color: '#F59E0B' },
          { label: 'موقوف', value: companies.filter(c => c.status === 'suspended').length, color: '#EF4444' },
          { label: 'QR جاهز', value: `${qrReadyCompanies.length}/${carWashCompanies.length || 0}`, color: '#22D3EE' },
          { label: 'قريب من حد الرسائل', value: nearLimitCompanies.length, color: '#F97316' },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs text-slate-500 font-tajawal mb-1">{s.label}</p>
            <p className="text-2xl font-black font-work" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Car Wash OS KPIs */}
      {cwKPIs && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Droplets size={14} color="#22D3EE" />
            <span className="text-xs font-bold text-slate-400 font-tajawal tracking-widest uppercase">Car Wash OS — هذا الشهر</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                icon: DollarSign,
                label: 'إيرادات الشهر',
                value: cwKPIs.revenueThisMonth > 0 ? `${cwKPIs.revenueThisMonth.toLocaleString()} ر.س` : '—',
                sub: `${cwKPIs.totalVisitsMonth} زيارة`,
                color: '#10B981',
              },
              {
                icon: Droplets,
                label: 'مغسلات نشطة',
                value: cwKPIs.activeWashes,
                sub: 'لديها زيارات هذا الشهر',
                color: '#22D3EE',
              },
              {
                icon: TrendingUp,
                label: 'أكثر مغسلة نشاطاً',
                value: cwKPIs.topWashName,
                sub: cwKPIs.topWashVisits > 0 ? `${cwKPIs.topWashVisits} زيارة` : undefined,
                color: '#4F6EF7',
              },
              {
                icon: RotateCcw,
                label: 'معدل الاستبقاء',
                value: `${cwKPIs.retentionRate}%`,
                sub: 'عملاء زاروا أكثر من مرة',
                color: '#F59E0B',
              },
            ].map(s => (
              <div key={s.label} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${s.color}22` }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-500 font-tajawal">{s.label}</p>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <s.icon size={13} style={{ color: s.color }} />
                  </div>
                </div>
                <p className="text-lg font-black font-work truncate" style={{ color: s.color }}>{s.value}</p>
                {s.sub && <p className="text-xs text-slate-600 font-tajawal mt-0.5">{s.sub}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tenantHealth.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} color="#22D3EE" />
              <div>
                <p className="text-sm font-bold text-white font-cairo">صحة مغاسل السيارات</p>
                <p className="text-xs text-slate-500 font-tajawal">أقل الحسابات جاهزية تظهر أولاً حتى تعرف أين تتدخل.</p>
              </div>
            </div>
            <span className="rounded-full px-3 py-1 text-xs font-bold font-sora" style={{ color: '#22D3EE', background: 'rgba(34,211,238,0.12)' }}>
              {tenantHealth.filter(item => item.score >= 85).length}/{tenantHealth.length} جاهزة
            </span>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {tenantHealth.slice(0, 6).map(item => {
              const tone = item.score >= 85 ? '#10B981' : item.score >= 60 ? '#F59E0B' : '#EF4444'
              return (
                <button
                  key={item.companyId}
                  onClick={() => setSelectedCompany(companies.find(c => c.id === item.companyId) || null)}
                  className="rounded-xl p-4 text-right transition-all hover:bg-white/[0.04]"
                  style={{ border: `1px solid ${tone}33`, background: `${tone}0D` }}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white font-cairo">{item.name}</p>
                      <p className="mt-1 text-xs text-slate-500 font-tajawal">
                        خدمات {item.services} • موظفون {item.workers} • سيارات اليوم {item.carsToday}
                      </p>
                    </div>
                    <span className="text-xl font-black font-sora" style={{ color: tone }}>{item.score}</span>
                  </div>
                  <div className="mb-3 h-2 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full" style={{ width: `${item.score}%`, background: tone }} />
                  </div>
                  {item.issues.length > 0 ? (
                    <div className="flex items-start gap-2 text-xs text-slate-400 font-tajawal">
                      <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" style={{ color: tone }} />
                      <span>{item.issues.slice(0, 2).join('، ')}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-400 font-tajawal">جاهزة للتشغيل والبيع.</p>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl overflow-hidden overflow-x-auto" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <table className="w-full min-w-[700px]">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['العميل', 'نوع النشاط', 'الباقة', 'الحالة', 'الرسائل', 'العملاء', 'الأتمتة', ''].map(h => (
                <th key={h} className="px-4 py-3 text-right text-xs text-slate-500 font-tajawal font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => {
              const BizIcon = businessIcons[c.business_type ?? 'other'] ?? Briefcase
              const used = c.messages_used ?? 0
              const limit = c.message_limit ?? 1000
              const pct = Math.min(100, Math.round((used / limit) * 100))
              const color = planColors[c.plan]
              return (
                <motion.tr key={c.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  onClick={() => setSelectedCompany(c)}
                  className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors cursor-pointer group">

                  {/* Company + email */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}>
                        {c.name[0]}
                      </div>
                      <div>
                        <p className="text-sm text-white font-tajawal">{c.name}</p>
                        <p className="text-xs text-slate-600 font-work">{c.owner_email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Business type */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <BizIcon size={12} style={{ color }} />
                      <span className="text-xs text-slate-400 font-tajawal">
                        {c.business_type === 'clinic' ? 'عيادة' : c.business_type === 'car_wash' ? 'مغسلة' : c.business_type === 'real_estate' ? 'عقارية' : 'أخرى'}
                      </span>
                    </div>
                  </td>

                  {/* Plan */}
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium px-2 py-1 rounded-full font-work"
                      style={{ color, background: `${color}18` }}>
                      {planLabels[c.plan] || c.plan}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>

                  {/* Messages usage bar */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 min-w-[96px]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <MessageSquare size={10} className="text-slate-600" />
                          <span>{used.toLocaleString()}</span>
                        </div>
                        <span className="text-xs text-slate-600">/{limit.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <motion.div className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8 }}
                          style={{ background: pct > 85 ? '#EF4444' : color }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Leads */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Users2 size={11} className="text-slate-600" />
                      {c.monthly_leads ?? 0}
                    </div>
                  </td>

                  {/* Automations */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Zap size={11} className="text-slate-600" />
                      {c.automations_count ?? 0}
                    </div>
                  </td>

                  {/* Arrow */}
                  <td className="px-3 py-3">
                    <ChevronLeft size={14} className="text-slate-700 group-hover:text-slate-400 transition-colors" />
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <Building2 size={36} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-600 font-tajawal text-sm mb-1">لا توجد حسابات</p>
            <p className="text-slate-700 font-tajawal text-xs">اضغط "إضافة عميل" لإنشاء أول حساب</p>
          </div>
        )}
      </div>
    </div>
  )
}
