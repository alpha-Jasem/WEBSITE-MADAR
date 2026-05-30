import { useEffect, useMemo, useState } from 'react'
import type { ElementType } from 'react'
import {
  Activity,
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle2,
  CreditCard,
  History,
  LockKeyhole,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  WalletCards,
  Workflow,
  Zap,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Company } from '../../../types'
import { PLAN_LABELS } from '../../../lib/constants'

type HealthRow = {
  company: Company
  score: number
  services: number
  workers: number
  carsToday: number
  issues: string[]
}

type AuditRow = {
  id: string
  action: string
  entity_type?: string | null
  created_at: string
  company_id?: string | null
}

const planValue: Record<string, number> = {
  starter: 299,
  growth: 799,
  enterprise: 1999,
}

const paidFeatures = ['wallet', 'memberships', 'online_payments', 'whatsapp_ai', 'branches', 'advanced_reports']

function flags(company: Company) {
  return ((company.cw_automations as any)?.feature_flags || {}) as Record<string, boolean>
}

function hasFeature(company: Company, key: string) {
  return Boolean(flags(company)[key])
}

function messageUsage(company: Company) {
  if (!company.message_limit) return 0
  return Math.min(100, Math.round(((company.messages_used || 0) / company.message_limit) * 100))
}

function money(value: number) {
  return `${value.toLocaleString('en-US')} ر.س`
}

function SmallCard({ icon: Icon, label, value, tone = '#0EA5E9' }: { icon: ElementType; label: string; value: string | number; tone?: string }) {
  return (
    <article className="admin-control-stat">
      <div style={{ color: tone }}><Icon size={18} /></div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

export const AdminControlCenter = () => {
  const [companies, setCompanies] = useState<Company[]>([])
  const [health, setHealth] = useState<HealthRow[]>([])
  const [audit, setAudit] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [companiesRes, servicesRes, workersRes, queueRes, logsRes] = await Promise.all([
      supabase.from('companies').select('*').order('created_at', { ascending: false }),
      supabase.from('cw_services').select('company_id, active'),
      supabase.from('cw_workers').select('company_id, active'),
      supabase.from('cw_queue').select('company_id, status, created_at').gte('created_at', today.toISOString()),
      supabase.from('cw_audit_logs').select('id, action, entity_type, company_id, created_at').order('created_at', { ascending: false }).limit(12),
    ])

    const rows = (companiesRes.data || []) as Company[]
    const count = <T extends { company_id: string; active?: boolean | null; status?: string | null }>(items: T[] | null, predicate: (item: T) => boolean) =>
      (items || []).reduce<Record<string, number>>((acc, item) => {
        if (predicate(item)) acc[item.company_id] = (acc[item.company_id] || 0) + 1
        return acc
      }, {})

    const servicesByCompany = count(servicesRes.data as any, item => item.active !== false)
    const workersByCompany = count(workersRes.data as any, item => item.active !== false)
    const carsByCompany = count(queueRes.data as any, item => item.status !== 'cancelled')

    const healthRows = rows.map(company => {
      const issues: string[] = []
      let score = 0
      const services = servicesByCompany[company.id] || 0
      const workers = workersByCompany[company.id] || 0
      const carsToday = carsByCompany[company.id] || 0
      if (company.status === 'active') score += 15
      else issues.push('الحساب غير نشط')
      if (company.public_checkin_token || company.webhook_token) score += 20
      else issues.push('QR غير جاهز')
      if (services > 0) score += 20
      else issues.push('لا توجد خدمات')
      if (workers > 0) score += 15
      else issues.push('لا يوجد موظفون')
      if (carsToday > 0) score += 15
      else issues.push('لا يوجد تشغيل اليوم')
      if (messageUsage(company) < 80) score += 15
      else issues.push('قريب من حد الرسائل')
      return { company, score, services, workers, carsToday, issues }
    })

    setCompanies(rows)
    setHealth(healthRows.sort((a, b) => a.score - b.score))
    setAudit(((logsRes.data || []) as AuditRow[]))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const stats = useMemo(() => {
    const active = companies.filter(company => company.status === 'active').length
    const mrr = companies
      .filter(company => company.status !== 'suspended')
      .reduce((sum, company) => sum + (planValue[company.plan] || 0), 0)
    const addonCount = companies.reduce((sum, company) => sum + paidFeatures.filter(key => hasFeature(company, key)).length, 0)
    const qrReady = companies.filter(company => company.public_checkin_token || company.webhook_token).length
    const nearLimit = companies.filter(company => messageUsage(company) >= 80).length
    return { active, mrr, addonCount, qrReady, nearLimit }
  }, [companies])

  const integrations = [
    { name: 'Supabase', desc: 'قاعدة البيانات والمصادقة', ok: companies.length > 0, icon: ShieldCheck },
    { name: 'WhatsApp', desc: 'إرسال OTP ورسائل العملاء', ok: companies.some(company => company.webhook_token || hasFeature(company, 'whatsapp_ai')), icon: MessageSquare },
    { name: 'n8n', desc: 'تشغيل workflows والـ webhooks', ok: true, icon: Workflow },
    { name: 'Moyasar', desc: 'الدفع، الفواتير، والمحافظ', ok: companies.some(company => hasFeature(company, 'online_payments') || hasFeature(company, 'wallet')), icon: CreditCard },
  ]

  const alerts = [
    ...companies.filter(company => messageUsage(company) >= 80).map(company => ({ label: `${company.name}: قريب من حد الرسائل`, level: 'danger' })),
    ...companies.filter(company => !(company.public_checkin_token || company.webhook_token)).slice(0, 5).map(company => ({ label: `${company.name}: QR غير جاهز`, level: 'warn' })),
    ...health.filter(row => row.score < 65).slice(0, 5).map(row => ({ label: `${row.company.name}: جاهزية ${row.score}%`, level: 'warn' })),
  ].slice(0, 10)

  if (loading) {
    return (
      <div className="admin-command-loading">
        <div className="admin-command-loading-status"><span /><p>جاري تجهيز مركز التحكم...</p></div>
        <section className="admin-command-loading-hero"><div><i /><b /><em /></div><div className="admin-command-loading-grid"><span /><span /><span /><span /></div></section>
      </div>
    )
  }

  return (
    <div className="admin-control-center">
      <section className="admin-control-center-hero">
        <div>
          <span>مركز تحكم SaaS</span>
          <h1>إدارة مدار OS من مكان واحد</h1>
          <p>صحة الشركات، التكاملات، المزايا المدفوعة، الفوترة، التنبيهات، وسجل التغييرات في شاشة واحدة.</p>
        </div>
        <button type="button" onClick={load}><RefreshCw size={15} /> تحديث</button>
      </section>

      <div className="admin-control-stat-grid">
        <SmallCard icon={Building2} label="الشركات النشطة" value={`${stats.active}/${companies.length}`} />
        <SmallCard icon={CreditCard} label="MRR تقديري" value={money(stats.mrr)} tone="#4F46E5" />
        <SmallCard icon={WalletCards} label="مزايا مدفوعة" value={stats.addonCount} tone="#8B5CF6" />
        <SmallCard icon={QrCode} label="QR جاهز" value={`${stats.qrReady}/${companies.length}`} tone="#0EA5E9" />
        <SmallCard icon={AlertTriangle} label="قرب حد الرسائل" value={stats.nearLimit} tone="#EF4444" />
      </div>

      <div className="admin-control-grid">
        <section className="admin-control-panel">
          <header><ShieldCheck size={18} /><h2>صحة التكاملات</h2></header>
          <div className="admin-integration-list">
            {integrations.map(({ name, desc, ok, icon: Icon }) => (
              <article key={name} className={ok ? 'ok' : 'warn'}>
                <Icon size={18} />
                <div><strong>{name}</strong><span>{desc}</span></div>
                <em>{ok ? 'جاهز' : 'يحتاج ضبط'}</em>
              </article>
            ))}
          </div>
        </section>

        <section className="admin-control-panel">
          <header><Bell size={18} /><h2>مركز التنبيهات</h2></header>
          <div className="admin-alert-list">
            {alerts.length ? alerts.map((alert, index) => (
              <article key={`${alert.label}-${index}`} className={alert.level}>
                <AlertTriangle size={16} />
                <span>{alert.label}</span>
              </article>
            )) : <p className="admin-muted">لا توجد تنبيهات حرجة الآن.</p>}
          </div>
        </section>

        <section className="admin-control-panel wide">
          <header><Activity size={18} /><h2>صحة العملاء</h2></header>
          <div className="admin-health-table">
            {health.slice(0, 8).map(row => (
              <article key={row.company.id}>
                <div>
                  <strong>{row.company.name}</strong>
                  <span>{PLAN_LABELS[row.company.plan] ?? row.company.plan} · {row.issues.slice(0, 2).join(' · ') || 'جاهز'}</span>
                </div>
                <div className="admin-health-meter"><span style={{ width: `${row.score}%` }} /></div>
                <em>{row.score}%</em>
              </article>
            ))}
          </div>
        </section>

        <section className="admin-control-panel">
          <header><SlidersHorizontal size={18} /><h2>إدارة المزايا</h2></header>
          <div className="admin-addon-grid">
            {[
              ['المحافظ الرقمية', 'wallet'],
              ['الاشتراكات الشهرية', 'memberships'],
              ['Apple Pay / Google Pay', 'online_payments'],
              ['الفروع المتعددة', 'branches'],
            ].map(([label, key]) => (
              <article key={key}>
                <strong>{companies.filter(company => hasFeature(company, key)).length}</strong>
                <span>{label}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="admin-control-panel">
          <header><LockKeyhole size={18} /><h2>صلاحيات الإدارة</h2></header>
          <div className="admin-permission-list">
            {['Super Admin', 'Sales', 'Support', 'Finance'].map((role, index) => (
              <article key={role}>
                <CheckCircle2 size={16} />
                <span>{role}</span>
                <em>{index === 0 ? 'كامل' : 'مقيد'}</em>
              </article>
            ))}
          </div>
        </section>

        <section className="admin-control-panel wide">
          <header><History size={18} /><h2>آخر تغييرات الإدارة</h2></header>
          <div className="admin-audit-list">
            {audit.length ? audit.map(item => (
              <article key={item.id}>
                <History size={15} />
                <div>
                  <strong>{item.action}</strong>
                  <span>{item.entity_type || 'system'} · {new Date(item.created_at).toLocaleString('ar-SA')}</span>
                </div>
              </article>
            )) : <p className="admin-muted">سيظهر هنا سجل تعديل الباقات والمزايا بعد أول تغيير.</p>}
          </div>
        </section>
      </div>
    </div>
  )
}
