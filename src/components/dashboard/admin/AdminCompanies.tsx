import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Building2,
  Car,
  ChevronLeft,
  MessageSquare,
  Plus,
  QrCode,
  Search,
  ShieldCheck,
  Stethoscope,
  Users2,
  Zap,
} from 'lucide-react'
import { StatusBadge } from '../shared/StatusBadge'
import { fetchCompanies, supabase } from '../../../lib/supabase'
import { AdminAddClientModal } from './AdminAddClientModal'
import { AdminClientDrawer } from './AdminClientDrawer'
import type { Company } from '../../../types'

type TenantHealth = {
  companyId: string
  score: number
  services: number
  workers: number
  carsToday: number
  issues: string[]
}

const planColors: Record<string, string> = {
  starter: '#06B6D4',
  growth: '#4F6EF7',
  enterprise: '#F59E0B',
}

const planLabels: Record<string, string> = {
  starter: 'Starter',
  growth: 'Pro',
  enterprise: 'Premium',
}

const businessLabels: Record<string, string> = {
  clinic: 'عيادة',
  car_wash: 'مغسلة',
  real_estate: 'عقار',
  other: 'أخرى',
}

const businessIcons: Record<string, React.ElementType> = {
  clinic: Stethoscope,
  car_wash: Car,
  real_estate: Building2,
  other: Building2,
}

function getMessageUsage(company: Company) {
  const limit = company.message_limit || 0
  if (!limit) return 0
  return Math.min(100, Math.round(((company.messages_used || 0) / limit) * 100))
}

function featureEnabled(company: Company, key: string) {
  return Boolean((company.cw_automations as any)?.feature_flags?.[key])
}

export const AdminCompanies = () => {
  const [companies, setCompanies] = useState<Company[]>([])
  const [health, setHealth] = useState<Record<string, TenantHealth>>({})
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'trial' | 'suspended'>('all')
  const [showModal, setShowModal] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  const loadTenantHealth = async (list: Company[]) => {
    const carWashes = list.filter(c => c.business_type === 'car_wash' || c.industry === 'car_wash')
    if (carWashes.length === 0) {
      setHealth({})
      return
    }

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [{ data: services }, { data: workers }, { data: queue }] = await Promise.all([
      supabase.from('cw_services').select('company_id, active'),
      supabase.from('cw_workers').select('company_id, active'),
      supabase.from('cw_queue').select('company_id, created_at, status').gte('created_at', todayStart.toISOString()),
    ])

    const countByCompany = <T extends { company_id: string }>(rows: T[], predicate: (row: T) => boolean = () => true) =>
      rows.reduce<Record<string, number>>((acc, row) => {
        if (predicate(row)) acc[row.company_id] = (acc[row.company_id] || 0) + 1
        return acc
      }, {})

    const servicesByCompany = countByCompany((services || []) as Array<{ company_id: string; active?: boolean | null }>, row => row.active !== false)
    const workersByCompany = countByCompany((workers || []) as Array<{ company_id: string; active?: boolean | null }>, row => row.active !== false)
    const carsByCompany = countByCompany((queue || []) as Array<{ company_id: string; status?: string | null }>, row => row.status !== 'cancelled')

    const next: Record<string, TenantHealth> = {}
    for (const company of carWashes) {
      const issues: string[] = []
      let score = 0
      const servicesCount = servicesByCompany[company.id] || 0
      const workersCount = workersByCompany[company.id] || 0
      const carsToday = carsByCompany[company.id] || 0
      const messageUsage = getMessageUsage(company)

      if (company.status === 'active') score += 15
      else issues.push('الحساب غير نشط')
      if (company.public_checkin_token || company.webhook_token) score += 20
      else issues.push('QR غير جاهز')
      if (servicesCount > 0) score += 20
      else issues.push('لا توجد خدمات')
      if (workersCount > 0) score += 20
      else issues.push('لا يوجد موظفون')
      if (carsToday > 0) score += 15
      else issues.push('لا يوجد تشغيل اليوم')
      if (messageUsage < 80) score += 10
      else issues.push('قريب من حد الرسائل')

      next[company.id] = {
        companyId: company.id,
        score,
        services: servicesCount,
        workers: workersCount,
        carsToday,
        issues,
      }
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return companies.filter(company => {
      const matchSearch =
        !q ||
        company.name.toLowerCase().includes(q) ||
        company.owner_name.toLowerCase().includes(q) ||
        company.owner_email.toLowerCase().includes(q)
      const matchFilter = filter === 'all' || company.status === filter
      return matchSearch && matchFilter
    })
  }, [companies, filter, search])

  const carWashCompanies = companies.filter(c => c.business_type === 'car_wash' || c.industry === 'car_wash')
  const qrReadyCompanies = carWashCompanies.filter(c => c.public_checkin_token || c.webhook_token)
  const nearLimitCompanies = companies.filter(c => getMessageUsage(c) >= 80)
  const walletEnabled = companies.filter(c => featureEnabled(c, 'wallet')).length
  const subscriptionsEnabled = companies.filter(c => featureEnabled(c, 'memberships')).length

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

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold text-blue-600 font-tajawal">إدارة العملاء</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900 font-cairo">الشركات والمغاسل</h1>
          <p className="mt-1 text-sm text-slate-500 font-tajawal">راقب الباقات، الصحة التشغيلية، الإضافات، وحدود الرسائل لكل عميل.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white font-cairo"
          style={{ background: 'linear-gradient(135deg, #0EA5E9, #4F6EF7)' }}
        >
          <Plus size={16} />
          إضافة شركة
        </motion.button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {[
          { label: 'إجمالي الشركات', value: companies.length, color: '#4F6EF7', icon: Building2 },
          { label: 'نشطة', value: companies.filter(c => c.status === 'active').length, color: '#10B981', icon: ShieldCheck },
          { label: 'تجريبية', value: companies.filter(c => c.status === 'trial').length, color: '#F59E0B', icon: Zap },
          { label: 'QR جاهز', value: `${qrReadyCompanies.length}/${carWashCompanies.length || 0}`, color: '#0EA5E9', icon: QrCode },
          { label: 'محافظ مفعلة', value: walletEnabled + subscriptionsEnabled, color: '#8B5CF6', icon: Users2 },
          { label: 'قرب حد الرسائل', value: nearLimitCompanies.length, color: '#EF4444', icon: AlertTriangle },
        ].map(item => (
          <div key={item.label} className="rounded-2xl bg-white p-4" style={{ border: '1px solid #E2E8F0', boxShadow: '0 12px 30px rgba(15,23,42,0.04)' }}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500 font-tajawal">{item.label}</p>
              <item.icon size={15} style={{ color: item.color }} />
            </div>
            <p className="text-2xl font-black font-sora" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <label className="relative flex-1">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث باسم الشركة أو المالك أو الإيميل..."
            className="w-full rounded-xl bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none font-tajawal"
            style={{ border: '1px solid #E2E8F0' }}
          />
        </label>
        <div className="flex gap-2 overflow-x-auto">
          {(['all', 'active', 'trial', 'suspended'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className="whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold font-tajawal"
              style={{
                background: filter === status ? '#0F172A' : '#FFFFFF',
                color: filter === status ? '#FFFFFF' : '#475569',
                border: '1px solid #E2E8F0',
              }}
            >
              {status === 'all' ? 'الكل' : status === 'active' ? 'نشطة' : status === 'trial' ? 'تجريبية' : 'موقوفة'}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl bg-white" style={{ border: '1px solid #E2E8F0', boxShadow: '0 18px 45px rgba(15,23,42,0.05)' }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="bg-slate-50">
                {['الشركة', 'النشاط', 'الباقة', 'الحالة', 'الصحة', 'الرسائل', 'الإضافات', ''].map(header => (
                  <th key={header} className="px-4 py-3 text-right text-xs font-bold text-slate-500 font-tajawal">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500 font-tajawal">جاري تحميل الشركات...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500 font-tajawal">لا توجد نتائج مطابقة.</td>
                </tr>
              ) : filtered.map((company, index) => {
                const color = planColors[company.plan] || '#4F6EF7'
                const usage = getMessageUsage(company)
                const rowHealth = health[company.id]
                const BizIcon = businessIcons[company.business_type ?? 'other'] || Building2
                return (
                  <motion.tr
                    key={company.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => setSelectedCompany(company)}
                    className="cursor-pointer border-t border-slate-100 transition-colors hover:bg-slate-50"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black text-white" style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}>
                          {company.name[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900 font-cairo">{company.name}</p>
                          <p className="truncate text-xs text-slate-500 font-sora">{company.owner_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 font-tajawal">
                        <BizIcon size={12} style={{ color }} />
                        {businessLabels[company.business_type ?? 'other'] || 'أخرى'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full px-3 py-1 text-xs font-bold font-sora" style={{ color, background: `${color}16` }}>
                        {planLabels[company.plan] || company.plan}
                      </span>
                    </td>
                    <td className="px-4 py-4"><StatusBadge status={company.status} /></td>
                    <td className="px-4 py-4">
                      {rowHealth ? (
                        <div className="min-w-[130px]">
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-tajawal">{rowHealth.issues[0] || 'جاهزة'}</span>
                            <strong className="font-sora" style={{ color: rowHealth.score >= 80 ? '#059669' : rowHealth.score >= 55 ? '#D97706' : '#DC2626' }}>{rowHealth.score}</strong>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                            <div className="h-full rounded-full" style={{ width: `${rowHealth.score}%`, background: rowHealth.score >= 80 ? '#10B981' : rowHealth.score >= 55 ? '#F59E0B' : '#EF4444' }} />
                          </div>
                        </div>
                      ) : <span className="text-xs text-slate-400 font-tajawal">غير محسوبة</span>}
                    </td>
                    <td className="px-4 py-4">
                      <div className="min-w-[110px]">
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-500 font-sora">
                          <span>{(company.messages_used || 0).toLocaleString('en-US')}</span>
                          <span>{usage}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full rounded-full" style={{ width: `${usage}%`, background: usage >= 85 ? '#EF4444' : color }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(company.public_checkin_token || company.webhook_token) && <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] text-blue-700 font-tajawal">QR</span>}
                        {featureEnabled(company, 'wallet') && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700 font-tajawal">محفظة</span>}
                        {featureEnabled(company, 'memberships') && <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] text-amber-700 font-tajawal">اشتراكات</span>}
                        {!featureEnabled(company, 'wallet') && !featureEnabled(company, 'memberships') && !(company.public_checkin_token || company.webhook_token) && (
                          <span className="text-xs text-slate-400 font-tajawal">أساسي</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <ChevronLeft size={16} className="text-slate-400" />
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
