import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarClock,
  Car,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Gauge,
  MessageSquare,
  QrCode,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  TrendingUp,
  WalletCards,
  Workflow,
  Zap,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Company } from '../../../types'
import { PLAN_LABELS, PLAN_PRICES } from '../../../lib/constants'

type HealthRow = {
  id: string
  name: string
  plan: string
  score: number
  issues: string[]
  action: string
  actionTo: string
}

type ActivityRow = {
  id: string
  company_name: string | null
  customer_name: string | null
  service_name: string | null
  status: string | null
  created_at: string
}

type AutomationRow = {
  id: string
  name: string
  type: string
  status: string
}

const PLAN_VALUE: Record<string, number> = {
  starter: 299,
  growth: 799,
  enterprise: 1999,
}

function startOfMonthIso() {
  const date = new Date()
  date.setDate(1)
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

function startOfTodayIso() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

function formatSar(value: number) {
  return `${Math.round(value).toLocaleString('ar-SA')} ر.س`
}

function planPrice(plan: string) {
  return PLAN_VALUE[plan] ?? 0
}

function featureEnabled(company: Company, key: string) {
  return Boolean((company.cw_automations as any)?.feature_flags?.[key])
}

function getMessageUsage(company: Company) {
  const limit = company.message_limit || 0
  if (!limit) return 0
  return Math.round(((company.messages_used || 0) / limit) * 100)
}

export const AdminCommandDeck = () => {
  const [companies, setCompanies] = useState<Company[]>([])
  const [health, setHealth] = useState<HealthRow[]>([])
  const [automations, setAutomations] = useState<AutomationRow[]>([])
  const [revenueMonth, setRevenueMonth] = useState(0)
  const [carsToday, setCarsToday] = useState(0)
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [search, setSearch] = useState('')
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
      { data: automationRows },
    ] = await Promise.all([
      supabase.from('companies').select('*').order('created_at', { ascending: false }),
      supabase.from('cw_visits').select('company_id, price, subtotal, total_amount').gte('created_at', monthStart),
      supabase.from('cw_queue').select('company_id, status').gte('created_at', todayStart),
      supabase.from('cw_services').select('company_id, active'),
      supabase.from('cw_workers').select('company_id, active'),
      supabase
        .from('cw_queue')
        .select('id, customer_name, service_name, status, created_at, company:companies(name)')
        .order('created_at', { ascending: false })
        .limit(7),
      supabase.from('automations').select('id, name, type, status').limit(80),
    ])

    const companyList = (companyRows || []) as Company[]
    const carWashes = companyList.filter(company => company.business_type === 'car_wash' || company.industry === 'car_wash')
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
      if (row.status !== 'cancelled') queueByCompany.set(row.company_id, (queueByCompany.get(row.company_id) || 0) + 1)
    }

    const nextHealth = carWashes.map(company => {
      const issues: string[] = []
      let score = 0
      let action = 'فتح الشركة'
      let actionTo = '/admin/companies'

      if (company.status === 'active' || company.status === 'trial') score += 18
      else {
        issues.push('الحساب موقوف')
        action = 'تفعيل الحساب'
      }

      if (company.public_checkin_token || company.webhook_token) score += 18
      else {
        issues.push('QR غير جاهز')
        action = 'تجهيز QR'
        actionTo = '/admin/settings'
      }

      if ((servicesByCompany.get(company.id) || 0) > 0) score += 18
      else {
        issues.push('لا توجد خدمات')
        action = 'إضافة خدمات'
      }

      if ((workersByCompany.get(company.id) || 0) > 0) score += 18
      else {
        issues.push('لا يوجد موظفون')
        action = 'إضافة موظفين'
      }

      if ((queueByCompany.get(company.id) || 0) > 0) score += 14
      else issues.push('لا يوجد تشغيل اليوم')

      if (getMessageUsage(company) < 80) score += 14
      else {
        issues.push('قريبة من حد الرسائل')
        action = 'اقتراح ترقية'
        actionTo = '/admin/settings'
      }

      return {
        id: company.id,
        name: company.name,
        plan: company.plan,
        score,
        issues,
        action,
        actionTo,
      }
    }).sort((a, b) => a.score - b.score)

    setCompanies(companyList)
    setHealth(nextHealth)
    setAutomations((automationRows || []) as AutomationRow[])
    setRevenueMonth((visits || []).reduce((sum, row) => sum + Number(row.total_amount ?? row.subtotal ?? row.price ?? 0), 0))
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

  const carWashCompanies = companies.filter(company => company.business_type === 'car_wash' || company.industry === 'car_wash')
  const activeCompanies = companies.filter(company => company.status === 'active').length
  const qrReady = carWashCompanies.filter(company => company.public_checkin_token || company.webhook_token).length
  const nearLimit = companies.filter(company => getMessageUsage(company) >= 80).length
  const paidAddons = companies.reduce((sum, company) => {
    return sum + ['wallet', 'memberships', 'online_payments', 'branches', 'advanced_reports', 'whatsapp_ai']
      .filter(key => featureEnabled(company, key)).length
  }, 0)

  const billing = useMemo(() => {
    const mrr = companies.reduce((sum, company) => sum + planPrice(company.plan), 0)
    const activeMrr = companies.filter(company => company.status !== 'suspended').reduce((sum, company) => sum + planPrice(company.plan), 0)
    const upgradeCandidates = companies.filter(company => company.plan !== 'enterprise' && (getMessageUsage(company) >= 70 || featureEnabled(company, 'wallet') || featureEnabled(company, 'memberships')))
    const renewals = companies
      .filter(company => company.plan_reset_at)
      .sort((a, b) => new Date(a.plan_reset_at).getTime() - new Date(b.plan_reset_at).getTime())
      .slice(0, 4)
    return { mrr, activeMrr, upgradeCandidates, renewals }
  }, [companies])

  const integrationHealth = [
    {
      name: 'Supabase',
      desc: 'قاعدة البيانات والمصادقة',
      status: companies.length >= 0 ? 'متصل' : 'غير معروف',
      ok: true,
      icon: ShieldCheck,
    },
    {
      name: 'n8n Cloud',
      desc: 'تدفقات الأتمتة والويب هوك',
      status: automations.some(item => item.status === 'active') ? 'نشط' : 'يحتاج مراجعة',
      ok: automations.some(item => item.status === 'active'),
      icon: Workflow,
    },
    {
      name: 'WhatsApp API',
      desc: 'رسائل العملاء والولاء',
      status: automations.some(item => item.type === 'whatsapp' && item.status === 'active') ? 'نشط' : 'تحقق من الأتمتة',
      ok: automations.some(item => item.type === 'whatsapp' && item.status === 'active'),
      icon: MessageSquare,
    },
    {
      name: 'Moyasar',
      desc: 'المدفوعات والترقيات',
      status: companies.some(company => featureEnabled(company, 'online_payments')) ? 'مفعل لعملاء' : 'جاهز للتفعيل',
      ok: companies.some(company => featureEnabled(company, 'online_payments')),
      icon: CreditCard,
    },
  ]

  const filteredIssues = health
    .filter(row => row.score < 100)
    .filter(row => !search || row.name.toLowerCase().includes(search.toLowerCase()) || row.issues.join(' ').includes(search))
    .slice(0, 7)

  const recentEvents = [
    ...activities.map(item => ({
      id: `activity-${item.id}`,
      title: item.customer_name || 'عميل مغسلة',
      meta: `${item.company_name || 'شركة'} · ${item.service_name || 'خدمة'} · ${item.status || 'received'}`,
      icon: Car,
      color: '#1565C0',
    })),
    ...health.filter(row => row.score < 70).slice(0, 3).map(row => ({
      id: `issue-${row.id}`,
      title: row.name,
      meta: row.issues.slice(0, 2).join(' · '),
      icon: AlertTriangle,
      color: '#F59E0B',
    })),
  ].slice(0, 8)

  if (loading) {
    return (
      <div className="admin-command-loading">
        <div />
        <p>جاري تحميل مركز الإدارة...</p>
      </div>
    )
  }

  return (
    <div className="admin-command">
      <section className="admin-command-hero">
        <div>
          <span>مركز إدارة مدار OS</span>
          <h1>تحكم يومي كامل في عملاء SaaS للمغاسل</h1>
          <p>
            الصفحة الرئيسية الآن تعطيك صورة تنفيذية: من يحتاج تدخل، أين توجد فرصة ترقية،
            هل التكاملات سليمة، وكم قيمة الاشتراكات الشهرية المتوقعة.
          </p>
        </div>
        <div className="admin-command-hero-grid">
          {[
            ['الشركات', companies.length],
            ['النشطة', activeCompanies],
            ['QR جاهز', `${qrReady}/${carWashCompanies.length || 0}`],
            ['إضافات مدفوعة', paidAddons],
          ].map(([label, value]) => (
            <article key={String(label)}>
              <strong>{value}</strong>
              <small>{label}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-quick-actions">
        {[
          { to: '/admin/companies', icon: Building2, label: 'إضافة / إدارة شركة', desc: 'افتح حساب عميل أو عدل بياناته.' },
          { to: '/admin/settings', icon: Settings, label: 'تفعيل ميزات مدفوعة', desc: 'محفظة، اشتراكات، دفع إلكتروني.' },
          { to: '/admin/automations', icon: Zap, label: 'مراجعة الأتمتة', desc: 'أوقف أو شغل تدفقات العميل.' },
          { to: '/admin/n8n', icon: ExternalLink, label: 'فتح n8n', desc: 'راجع الويب هوك والتشغيل.' },
        ].map(item => {
          const Icon = item.icon
          return (
            <Link key={item.label} to={item.to}>
              <Icon size={19} />
              <span>
                <strong>{item.label}</strong>
                <small>{item.desc}</small>
              </span>
              <ArrowLeft size={15} />
            </Link>
          )
        })}
      </section>

      <section className="admin-metric-strip">
        {[
          { label: 'إيراد مغاسل هذا الشهر', value: formatSar(revenueMonth), color: '#10B981', icon: TrendingUp },
          { label: 'سيارات اليوم', value: carsToday.toLocaleString('en-US'), color: '#1565C0', icon: Car },
          { label: 'تحتاج تدخل', value: health.filter(row => row.score < 80).length, color: '#F59E0B', icon: AlertTriangle },
          { label: 'قريبة من حد الرسائل', value: nearLimit, color: '#EF4444', icon: MessageSquare },
        ].map(item => {
          const Icon = item.icon
          return (
            <article key={item.label}>
              <span style={{ background: item.color }} />
              <Icon size={18} style={{ color: item.color, marginBottom: 10 }} />
              <strong>{item.value}</strong>
              <small>{item.label}</small>
            </article>
          )
        })}
      </section>

      <section className="admin-command-grid">
        <article className="admin-command-panel admin-issues-panel">
          <header>
            <div>
              <h2>مركز المشاكل</h2>
              <p>قائمة قابلة للتنفيذ بدل أرقام عامة.</p>
            </div>
            <div className="admin-search compact">
              <Search size={14} />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="بحث..." />
            </div>
          </header>

          <div className="admin-issue-list">
            {filteredIssues.length === 0 ? (
              <div className="admin-empty-state">
                <CheckCircle2 size={30} />
                كل الشركات سليمة حسب الفحوصات الحالية.
              </div>
            ) : filteredIssues.map(row => {
              const color = row.score >= 80 ? '#10B981' : row.score >= 55 ? '#F59E0B' : '#EF4444'
              return (
                <div key={row.id} className="admin-issue-row">
                  <div className="admin-score-ring" style={{ borderColor: `${color}55`, color }}>
                    {row.score}
                  </div>
                  <div>
                    <strong>{row.name}</strong>
                    <small>{PLAN_LABELS[row.plan] ?? row.plan} · {row.issues.slice(0, 3).join(' · ') || 'جاهزة'}</small>
                  </div>
                  <Link to={row.actionTo}>{row.action}<ArrowLeft size={13} /></Link>
                </div>
              )
            })}
          </div>
        </article>

        <aside className="admin-command-panel">
          <header>
            <div>
              <h2>ملخص الفوترة</h2>
              <p>قراءة سريعة لقيمة الاشتراكات وفرص الترقية.</p>
            </div>
            <Receipt size={20} />
          </header>

          <div className="admin-billing-stack">
            <div className="admin-billing-main">
              <small>MRR المتوقع</small>
              <strong>{formatSar(billing.mrr)}</strong>
              <span>النشط فعليًا: {formatSar(billing.activeMrr)}</span>
            </div>
            <div className="admin-billing-grid">
              <span><strong>{billing.upgradeCandidates.length}</strong><small>فرصة ترقية</small></span>
              <span><strong>{billing.renewals.length}</strong><small>تجديد قريب</small></span>
            </div>
            <div className="admin-renewal-list">
              {billing.renewals.length === 0 ? (
                <p>لا توجد تواريخ تجديد مسجلة.</p>
              ) : billing.renewals.map(company => (
                <div key={company.id}>
                  <span>{company.name}</span>
                  <small>{new Date(company.plan_reset_at).toLocaleDateString('ar-SA')}</small>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="admin-command-grid lower">
        <article className="admin-command-panel">
          <header>
            <div>
              <h2>صحة التكاملات</h2>
              <p>مؤشرات سريعة للتكاملات الأساسية.</p>
            </div>
            <Activity size={20} />
          </header>
          <div className="admin-integration-grid">
            {integrationHealth.map(item => {
              const Icon = item.icon
              return (
                <div key={item.name} className={item.ok ? 'ok' : 'warn'}>
                  <Icon size={18} />
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.desc}</small>
                  </span>
                  <em>{item.status}</em>
                </div>
              )
            })}
          </div>
        </article>

        <article className="admin-command-panel">
          <header>
            <div>
              <h2>آخر النشاط</h2>
              <p>آخر حركة تشغيل أو مشكلة تحتاج انتباه.</p>
            </div>
            <CalendarClock size={20} />
          </header>
          <div className="admin-event-feed">
            {recentEvents.length === 0 ? (
              <div className="admin-empty-state">لا توجد حركة حديثة.</div>
            ) : recentEvents.map(event => {
              const Icon = event.icon
              return (
                <div key={event.id}>
                  <span style={{ color: event.color, background: `${event.color}14` }}><Icon size={16} /></span>
                  <div>
                    <strong>{event.title}</strong>
                    <small>{event.meta}</small>
                  </div>
                </div>
              )
            })}
          </div>
        </article>
      </section>

      <section className="admin-command-cards">
        {[
          { icon: QrCode, title: 'QR التسجيل الذاتي', text: 'راقب جاهزية روابط التسجيل الذاتي لكل مغسلة، ثم فعلها من الإعدادات عند بيع الميزة.' },
          { icon: WalletCards, title: 'المحفظة والاشتراكات', text: 'اعرف أي عميل يستحق تفعيل Wallet أو Memberships كإضافة مدفوعة.' },
          { icon: Gauge, title: 'تشغيل قابل للبيع', text: 'لوحة الإدارة صارت تساعدك تعرف هل العميل جاهز للتشغيل قبل تسليمه النظام.' },
        ].map(item => {
          const Icon = item.icon
          return (
            <article key={item.title}>
              <Icon size={22} />
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          )
        })}
      </section>
    </div>
  )
}
