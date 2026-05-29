import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Car,
  CheckCircle2,
  MessageSquare,
  QrCode,
  ShieldCheck,
  TrendingUp,
  Users2,
  WalletCards,
  Zap,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Company } from '../../../types'

type HealthRow = {
  id: string
  name: string
  score: number
  issues: string[]
}

type Activity = {
  id: string
  company_name: string | null
  customer_name: string | null
  service_name: string | null
  status: string | null
  created_at: string
}

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString('ar-SA')} ر.س`
}

function startOfMonthIso() {
  const date = new Date()
  date.setDate(1)
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

function formatSar(value: number) {
  return `${Math.round(value).toLocaleString('ar-SA')} ر.س`
}

function startOfTodayIso() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

function StatCard({
  title,
  value,
  note,
  icon: Icon,
  color,
}: {
  title: string
  value: string | number
  note: string
  icon: typeof Building2
  color: string
}) {
  return (
    <article className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 14px 36px rgba(15,23,42,0.06)' }}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-500 font-tajawal">{title}</p>
          <strong className="mt-2 block text-3xl font-black text-slate-900 font-sora">{value}</strong>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${color}16`, border: `1px solid ${color}2E` }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
      <p className="text-xs leading-5 text-slate-500 font-tajawal">{note}</p>
    </article>
  )
}

export const AdminCommandDeck = () => {
  const [companies, setCompanies] = useState<Company[]>([])
  const [health, setHealth] = useState<HealthRow[]>([])
  const [revenueMonth, setRevenueMonth] = useState(0)
  const [carsToday, setCarsToday] = useState(0)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const monthStart = startOfMonthIso()
    const todayStart = startOfTodayIso()

    const [
      { data: companyRows },
      { data: visits },
      { data: queueToday },
      { data: services },
      { data: workers },
      { data: latest },
    ] = await Promise.all([
      supabase.from('companies').select('*').order('created_at', { ascending: false }),
      supabase.from('cw_visits').select('company_id, price, subtotal').gte('created_at', monthStart),
      supabase.from('cw_queue').select('company_id, status').gte('created_at', todayStart),
      supabase.from('cw_services').select('company_id, active'),
      supabase.from('cw_workers').select('company_id, active'),
      supabase.from('cw_queue')
        .select('id, customer_name, service_name, status, created_at, company:companies(name)')
        .order('created_at', { ascending: false })
        .limit(6),
    ])

    const companyList = (companyRows || []) as Company[]
    const carWashes = companyList.filter(c => c.business_type === 'car_wash' || c.industry === 'car_wash')
    const servicesByCompany = new Map<string, number>()
    const workersByCompany = new Map<string, number>()
    const queueByCompany = new Map<string, number>()

    for (const row of services || []) {
      if (row.active !== false) servicesByCompany.set(row.company_id, (servicesByCompany.get(row.company_id) || 0) + 1)
    }
    for (const row of workers || []) {
      if (row.active !== false) workersByCompany.set(row.company_id, (workersByCompany.get(row.company_id) || 0) + 1)
    }
    for (const row of queueToday || []) {
      queueByCompany.set(row.company_id, (queueByCompany.get(row.company_id) || 0) + 1)
    }

    const nextHealth = carWashes.map(company => {
      const issues: string[] = []
      let score = 0

      if (company.status === 'active') score += 20
      else issues.push('الحساب غير نشط')
      if (company.public_checkin_token || company.webhook_token) score += 20
      else issues.push('QR غير جاهز')
      if ((servicesByCompany.get(company.id) || 0) > 0) score += 20
      else issues.push('لا توجد خدمات')
      if ((workersByCompany.get(company.id) || 0) > 0) score += 20
      else issues.push('لا يوجد موظفون')
      if ((queueByCompany.get(company.id) || 0) > 0) score += 20
      else issues.push('لا يوجد تشغيل اليوم')

      return { id: company.id, name: company.name, score, issues }
    }).sort((a, b) => a.score - b.score)

    setCompanies(companyList)
    setHealth(nextHealth)
    setRevenueMonth((visits || []).reduce((sum, row) => sum + Number(row.subtotal ?? row.price ?? 0), 0))
    setCarsToday((queueToday || []).filter(row => row.status !== 'cancelled').length)
    setActivities((latest || []).map((row: any) => ({
      id: row.id,
      company_name: row.company?.name || null,
      customer_name: row.customer_name || null,
      service_name: row.service_name || null,
      status: row.status || null,
      created_at: row.created_at,
    })))
    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel('admin_command_center')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cw_queue' }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const activeCompanies = companies.filter(company => company.status === 'active').length
  const carWashCompanies = companies.filter(company => company.business_type === 'car_wash' || company.industry === 'car_wash')
  const qrReady = carWashCompanies.filter(company => company.public_checkin_token || company.webhook_token).length
  const nearLimit = companies.filter(company => {
    const limit = company.message_limit || 0
    return limit > 0 && ((company.messages_used || 0) / limit) >= 0.8
  }).length
  const healthyTenants = health.filter(row => row.score >= 80).length

  const worstHealth = useMemo(() => health.slice(0, 5), [health])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />
        <p className="text-sm text-slate-500 font-tajawal">جاري تحميل مركز الإدارة...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl p-6" style={{ background: 'linear-gradient(135deg, #FFFFFF, #F0F7FF)', border: '1px solid #DCEBFF', boxShadow: '0 20px 50px rgba(15,23,42,0.06)' }}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold text-blue-600 font-tajawal">مركز إدارة مدار OS</p>
            <h1 className="text-3xl font-black text-slate-950 font-cairo">تابع صحة عملاء المغاسل من مكان واحد</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 font-tajawal">
              هذه اللوحة مخصصة لك كمشغل SaaS: تعرف من يعمل، من يحتاج تجهيز، من اقترب من حد الرسائل، وأين توجد فرصة ترقية.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4 lg:min-w-[430px]">
            {[
              ['الشركات', companies.length],
              ['النشطة', activeCompanies],
              ['QR جاهز', `${qrReady}/${carWashCompanies.length || 0}`],
              ['صحة عالية', `${healthyTenants}/${health.length || 0}`],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl bg-white p-4" style={{ border: '1px solid #E2E8F0' }}>
                <strong className="block text-2xl font-black text-slate-900 font-sora">{value}</strong>
                <span className="mt-1 block text-xs text-slate-500 font-tajawal">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <StatCard title="إيراد المغاسل هذا الشهر" value={formatSar(revenueMonth)} note="محسوب من زيارات cw_visits المسجلة هذا الشهر." icon={TrendingUp} color="#10B981" />
        <StatCard title="سيارات اليوم" value={carsToday} note="إجمالي السيارات غير الملغاة التي دخلت المسار اليوم." icon={Car} color="#0EA5E9" />
        <StatCard title="مغاسل تحتاج تدخل" value={health.filter(row => row.score < 80).length} note="حسابات ناقصة خدمات، موظفين، QR، أو نشاط تشغيل." icon={AlertTriangle} color="#F59E0B" />
        <StatCard title="قريبة من حد الرسائل" value={nearLimit} note="عملاء تجاوزوا 80% من حد الرسائل الشهري." icon={MessageSquare} color="#EF4444" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-3xl bg-white p-5" style={{ border: '1px solid #E2E8F0', boxShadow: '0 16px 42px rgba(15,23,42,0.05)' }}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-cairo">صحة عملاء المغاسل</h2>
              <p className="text-xs text-slate-500 font-tajawal">الأقل جاهزية تظهر أولاً.</p>
            </div>
            <Link to="/admin/companies" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-blue-700 font-tajawal" style={{ background: '#EFF6FF' }}>
              إدارة الشركات <ArrowLeft size={13} />
            </Link>
          </div>
          <div className="space-y-3">
            {worstHealth.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <ShieldCheck className="mx-auto mb-2 text-emerald-500" size={26} />
                <p className="text-sm font-bold text-slate-700 font-cairo">لا توجد مغاسل مضافة بعد</p>
              </div>
            ) : worstHealth.map(row => {
              const color = row.score >= 80 ? '#10B981' : row.score >= 55 ? '#F59E0B' : '#EF4444'
              return (
                <div key={row.id} className="rounded-2xl p-4" style={{ background: '#F8FAFC', border: `1px solid ${color}30` }}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <strong className="block truncate text-sm text-slate-900 font-cairo">{row.name}</strong>
                      <span className="mt-1 block text-xs text-slate-500 font-tajawal">
                        {row.issues.length ? row.issues.slice(0, 3).join('، ') : 'جاهزة للتشغيل'}
                      </span>
                    </div>
                    <span className="text-xl font-black font-sora" style={{ color }}>{row.score}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full" style={{ width: `${row.score}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </article>

        <article className="rounded-3xl bg-white p-5" style={{ border: '1px solid #E2E8F0', boxShadow: '0 16px 42px rgba(15,23,42,0.05)' }}>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900 font-cairo">آخر حركة تشغيل</h2>
            <p className="text-xs text-slate-500 font-tajawal">آخر سيارات دخلت مسارات العملاء.</p>
          </div>
          <div className="space-y-3">
            {activities.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <Car className="mx-auto mb-2 text-slate-400" size={26} />
                <p className="text-sm text-slate-500 font-tajawal">لا توجد حركة حديثة.</p>
              </div>
            ) : activities.map(item => (
              <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3" style={{ border: '1px solid #E2E8F0' }}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Car size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900 font-cairo">{item.customer_name || 'عميل مغسلة'}</p>
                  <p className="truncate text-xs text-slate-500 font-tajawal">{item.company_name || 'شركة'} - {item.service_name || 'خدمة'} - {item.status || 'received'}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          { icon: QrCode, title: 'QR التسجيل الذاتي', text: 'راقب جاهزية روابط التسجيل لكل مغسلة، وعدد العملاء الذين دخلوا من QR.' },
          { icon: WalletCards, title: 'الإضافات المدفوعة', text: 'المحفظة، الاشتراكات الشهرية، والدفع الإلكتروني تبقى قابلة للتفعيل لكل عميل.' },
          { icon: Zap, title: 'فرص الترقية', text: 'اقترب من العملاء الذين وصلوا حد الرسائل أو يحتاجون QR أو تقارير متقدمة.' },
        ].map(item => (
          <article key={item.title} className="rounded-3xl bg-white p-5" style={{ border: '1px solid #E2E8F0' }}>
            <item.icon size={22} className="mb-4 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900 font-cairo">{item.title}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-500 font-tajawal">{item.text}</p>
          </article>
        ))}
      </section>
    </div>
  )
}
