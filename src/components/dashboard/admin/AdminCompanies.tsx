import { useEffect, useState } from 'react'
import { Search, Plus, Building2, Car, Stethoscope, Briefcase, MessageSquare, Users2, Zap, ChevronLeft, Droplets, DollarSign, TrendingUp, RotateCcw } from 'lucide-react'
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

  const load = () => fetchCompanies().then(setCompanies)

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي العملاء', value: companies.length, color: '#4F6EF7' },
          { label: 'نشط', value: companies.filter(c => c.status === 'active').length, color: '#10B981' },
          { label: 'تجريبي', value: companies.filter(c => c.status === 'trial').length, color: '#F59E0B' },
          { label: 'موقوف', value: companies.filter(c => c.status === 'suspended').length, color: '#EF4444' },
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
