import { useEffect, useMemo, useState } from 'react'
import type { ElementType } from 'react'
import {
  Activity,
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle2,
  CreditCard,
  Gauge,
  History,
  ListChecks,
  LockKeyhole,
  MessageSquare,
  PhoneCall,
  QrCode,
  RefreshCw,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  TrendingUp,
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

type OpsLog = {
  id: string
  level?: string | null
  event?: string | null
  message?: string | null
  company_id?: string | null
  created_at: string
}

type OtpLog = {
  id: string
  company_name: string
  phone_tail: string
  provider: string
  status: string
  attempts: number
  created_at: string
}

type OpsOverview = {
  twilio_ready: boolean
  otp: {
    today: number
    month: number
    twilio_today: number
    twilio_month: number
    verified_today: number
    verified_month: number
    estimated_sms_cost_sar: number
    latest: OtpLog[]
  }
  audit: AuditRow[]
  logs: OpsLog[]
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

async function callAdminOps(body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return null
  const baseUrl = import.meta.env.VITE_SUPABASE_URL
  const response = await fetch(`${baseUrl}/functions/v1/admin-ops`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) return { error: payload.error || 'admin_ops_failed', details: payload }
  return payload
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
  const [ops, setOps] = useState<OpsOverview | null>(null)
  const [diagnoseId, setDiagnoseId] = useState('')
  const [testPhone, setTestPhone] = useState('')
  const [testCompanyId, setTestCompanyId] = useState('')
  const [testStatus, setTestStatus] = useState('')
  const [testingOtp, setTestingOtp] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [companiesRes, servicesRes, workersRes, queueRes, logsRes, opsRes] = await Promise.all([
      supabase.from('companies').select('*').order('created_at', { ascending: false }),
      supabase.from('cw_services').select('company_id, active'),
      supabase.from('cw_workers').select('company_id, active'),
      supabase.from('cw_queue').select('company_id, status, created_at').gte('created_at', today.toISOString()),
      supabase.from('cw_audit_logs').select('id, action, entity_type, company_id, created_at').order('created_at', { ascending: false }).limit(12),
      callAdminOps({ action: 'overview' }),
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
    setAudit(((opsRes && !('error' in opsRes) ? opsRes.audit : logsRes.data) || []) as AuditRow[])
    setOps(opsRes && !('error' in opsRes) ? opsRes as OpsOverview : null)
    setDiagnoseId(prev => prev || healthRows[0]?.company.id || '')
    setTestCompanyId(prev => prev || rows[0]?.id || '')
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
    ...(ops && ops.otp.estimated_sms_cost_sar >= 300 ? [{ label: `تكلفة OTP هذا الشهر ${money(ops.otp.estimated_sms_cost_sar)}`, level: 'danger' }] : []),
    ...companies.filter(company => !(company.public_checkin_token || company.webhook_token)).slice(0, 5).map(company => ({ label: `${company.name}: QR غير جاهز`, level: 'warn' })),
    ...health.filter(row => row.score < 65).slice(0, 5).map(row => ({ label: `${row.company.name}: جاهزية ${row.score}%`, level: 'warn' })),
  ].slice(0, 10)

  const salesOpportunities = health
    .map(row => {
      const companyFlags = flags(row.company)
      const usage = messageUsage(row.company)
      const reasons = [
        row.score >= 70 && row.company.status === 'trial' ? 'جاهز للتحويل من تجربة إلى اشتراك' : '',
        usage >= 70 ? `استهلاك رسائل ${usage}%` : '',
        !companyFlags.memberships && row.carsToday >= 3 ? 'مناسب لبيع الاشتراكات الشهرية' : '',
        !companyFlags.wallet && row.carsToday >= 3 ? 'مناسب لبيع المحفظة الرقمية' : '',
        !companyFlags.online_payments && (companyFlags.memberships || companyFlags.wallet) ? 'جاهز لربط الدفع الإلكتروني' : '',
        row.score < 70 ? `ناقص: ${row.issues.slice(0, 2).join('، ')}` : '',
      ].filter(Boolean)
      const priority = (row.company.status === 'trial' ? 20 : 0)
        + (usage >= 70 ? 20 : 0)
        + (row.score >= 70 ? 18 : 0)
        + (row.carsToday >= 3 ? 14 : 0)
        + (!companyFlags.memberships || !companyFlags.wallet ? 8 : 0)
      return { row, reasons, priority }
    })
    .filter(item => item.reasons.length > 0)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 6)

  const diagnosed = health.find(row => row.company.id === diagnoseId) || health[0]

  const onboardingChecks = diagnosed ? [
    { label: 'الحساب نشط', done: diagnosed.company.status === 'active' || diagnosed.company.status === 'trial' },
    { label: 'QR جاهز', done: Boolean(diagnosed.company.public_checkin_token || diagnosed.company.webhook_token) },
    { label: 'الخدمات مضافة', done: diagnosed.services > 0 },
    { label: 'الموظفون مضافون', done: diagnosed.workers > 0 },
    { label: 'VAT مضبوط', done: diagnosed.company.tax_enabled !== undefined },
    { label: 'Twilio OTP جاهز', done: Boolean(ops?.twilio_ready) },
    { label: 'تشغيل اليوم موجود', done: diagnosed.carsToday > 0 },
  ] : []

  const runOtpTest = async () => {
    if (!testCompanyId || testingOtp) return
    const digits = testPhone.replace(/\D/g, '')
    if (!/^05\d{8}$/.test(digits) && !/^9665\d{8}$/.test(digits)) {
      setTestStatus('اكتب رقم سعودي صحيح مثل 05XXXXXXXX')
      return
    }
    setTestingOtp(true)
    setTestStatus('جاري إرسال اختبار OTP...')
    const result = await callAdminOps({ action: 'test_otp', company_id: testCompanyId, phone: testPhone })
    if (result?.sent) {
      setTestStatus(`تم الإرسال عبر ${result.provider}`)
      await load()
    } else {
      setTestStatus('تعذر إرسال الاختبار. راجع Secrets أو رصيد Twilio.')
    }
    setTestingOtp(false)
  }

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
        <SmallCard icon={MessageSquare} label="OTP هذا الشهر" value={ops?.otp.month ?? 0} tone="#10B981" />
        <SmallCard icon={Gauge} label="تكلفة OTP" value={money(ops?.otp.estimated_sms_cost_sar ?? 0)} tone="#F59E0B" />
      </div>

      <section className="admin-control-panel wide">
        <header><TrendingUp size={18} /><h2>فرص البيع والترقية</h2></header>
        <div className="grid gap-3 xl:grid-cols-3">
          {salesOpportunities.length ? salesOpportunities.map(({ row, reasons, priority }) => (
            <article key={row.company.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <strong className="block text-sm text-white font-cairo">{row.company.name}</strong>
                  <span className="text-xs text-slate-500 font-tajawal">{PLAN_LABELS[row.company.plan] ?? row.company.plan} · جاهزية {row.score}%</span>
                </div>
                <em className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold not-italic text-emerald-300 font-sora">{priority}</em>
              </div>
              <div className="space-y-2">
                {reasons.slice(0, 3).map(reason => (
                  <p key={reason} className="flex items-center gap-2 text-xs leading-5 text-slate-300 font-tajawal">
                    <Sparkles size={12} className="text-cyan-300" />
                    {reason}
                  </p>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => setDiagnoseId(row.company.id)} className="inline-flex items-center gap-1 rounded-xl bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 font-tajawal">
                  <SlidersHorizontal size={13} />
                  تشخيص
                </button>
                <a href={`tel:${row.company.owner_phone || ''}`} className="inline-flex items-center gap-1 rounded-xl bg-white/[0.05] px-3 py-2 text-xs font-bold text-slate-200 font-tajawal">
                  <PhoneCall size={13} />
                  اتصال
                </a>
              </div>
            </article>
          )) : (
            <div className="admin-empty-state xl:col-span-3">لا توجد فرص بيع واضحة الآن. شغّل العملاء التجريبيين أو فعّل QR حتى تظهر الفرص.</div>
          )}
        </div>
      </section>

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
          <header><Send size={18} /><h2>اختبار OTP</h2></header>
          <div className="admin-ops-form">
            <select value={testCompanyId} onChange={event => setTestCompanyId(event.target.value)}>
              {companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
            </select>
            <input value={testPhone} onChange={event => setTestPhone(event.target.value)} placeholder="05XXXXXXXX" dir="ltr" />
            <button type="button" onClick={runOtpTest} disabled={testingOtp}>
              {testingOtp ? 'جاري الإرسال...' : 'إرسال اختبار'}
            </button>
            {testStatus && <p>{testStatus}</p>}
          </div>
        </section>

        <section className="admin-control-panel">
          <header><ListChecks size={18} /><h2>تشخيص شركة</h2></header>
          <div className="admin-ops-form">
            <select value={diagnoseId} onChange={event => setDiagnoseId(event.target.value)}>
              {health.map(row => <option key={row.company.id} value={row.company.id}>{row.company.name}</option>)}
            </select>
          </div>
          {diagnosed && (
            <div className="admin-diagnosis">
              <div className="admin-health-meter"><span style={{ width: `${diagnosed.score}%` }} /></div>
              <strong>{diagnosed.score}% جاهزية</strong>
              <p>{diagnosed.issues.join(' · ') || 'الشركة جاهزة للتشغيل'}</p>
            </div>
          )}
        </section>

        <section className="admin-control-panel wide">
          <header><History size={18} /><h2>OTP Logs والتكلفة</h2></header>
          <div className="admin-otp-summary">
            <article><strong>{ops?.otp.today ?? 0}</strong><span>اليوم</span></article>
            <article><strong>{ops?.otp.verified_month ?? 0}</strong><span>تحقق ناجح</span></article>
            <article><strong>{money(ops?.otp.estimated_sms_cost_sar ?? 0)}</strong><span>تكلفة تقديرية</span></article>
          </div>
          <div className="admin-audit-list compact">
            {ops?.otp.latest?.length ? ops.otp.latest.map(item => (
              <article key={item.id}>
                <MessageSquare size={15} />
                <div>
                  <strong>{item.company_name} · ****{item.phone_tail}</strong>
                  <span>{item.provider} · {item.status === 'verified' ? 'تم التحقق' : 'تم الإرسال'} · {new Date(item.created_at).toLocaleString('ar-SA')}</span>
                </div>
              </article>
            )) : <p className="admin-muted">لا توجد OTP logs بعد.</p>}
          </div>
        </section>

        <section className="admin-control-panel">
          <header><Store size={18} /><h2>متجر الإضافات</h2></header>
          <div className="admin-addon-grid">
            {[
              ['Wallet', 'wallet'],
              ['Memberships', 'memberships'],
              ['Payments', 'online_payments'],
              ['Branches', 'branches'],
              ['AI Promo', 'whatsapp_ai'],
              ['Reports', 'advanced_reports'],
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

        <section className="admin-control-panel">
          <header><ListChecks size={18} /><h2>Onboarding Checklist</h2></header>
          <div className="admin-check-mini">
            {onboardingChecks.map(check => (
              <article key={check.label} className={check.done ? 'done' : ''}>
                <CheckCircle2 size={15} />
                <span>{check.label}</span>
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

        <section className="admin-control-panel wide">
          <header><Zap size={18} /><h2>System Logs</h2></header>
          <div className="admin-audit-list compact">
            {ops?.logs?.length ? ops.logs.map(item => (
              <article key={item.id}>
                <Zap size={15} />
                <div>
                  <strong>{item.event || item.level || 'system'}</strong>
                  <span>{item.message || 'بدون تفاصيل'} · {new Date(item.created_at).toLocaleString('ar-SA')}</span>
                </div>
              </article>
            )) : <p className="admin-muted">لا توجد system logs ظاهرة.</p>}
          </div>
        </section>
      </div>
    </div>
  )
}
