import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'الآن'
  if (m < 60) return `منذ ${m} دقيقة`
  const h = Math.floor(m / 60)
  if (h < 24) return `منذ ${h} ساعة`
  return `منذ ${Math.floor(h / 24)} يوم`
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
    { name: 'Supabase', desc: 'قاعدة البيانات والمصادقة', status: companies.length >= 0 ? 'متصل' : 'غير معروف', ok: true, pending: false },
    { name: 'n8n Cloud', desc: 'تدفقات الأتمتة والويب هوك', status: automations.some(i => i.status === 'active') ? 'نشط' : 'يحتاج مراجعة', ok: automations.some(i => i.status === 'active'), pending: false },
    { name: 'WhatsApp API', desc: 'رسائل العملاء والولاء', status: automations.some(i => i.type === 'whatsapp' && i.status === 'active') ? 'نشط' : 'بانتظار توثيق Meta', ok: true, pending: !automations.some(i => i.type === 'whatsapp' && i.status === 'active') },
    { name: 'Moyasar', desc: 'المدفوعات والترقيات', status: companies.some(c => featureEnabled(c, 'online_payments')) ? 'مفعل لعملاء' : 'بانتظار تفعيل', ok: true, pending: !companies.some(c => featureEnabled(c, 'online_payments')) },
  ]

  const filteredIssues = health
    .filter(row => row.score < 100)
    .filter(row => !search || row.name.toLowerCase().includes(search.toLowerCase()) || row.issues.join(' ').includes(search))
    .slice(0, 7)

  const commandAlerts = useMemo(() => {
    const alerts: Array<{ id: string; tone: string; badgeClass: string; title: string; desc: string; to: string; action: string }> = []
    if (nearLimit > 0) alerts.push({ id: 'message-limit', tone: 'var(--red)', badgeClass: 'red', title: 'شركات قريبة من حد الرسائل', desc: `${nearLimit} شركة وصلت 80% أو أكثر. هذه أفضل لحظة لبيع ترقية.`, to: '/admin/settings', action: 'فتح التحكم' })
    const missingQr = carWashCompanies.filter(c => !(c.public_checkin_token || c.webhook_token))
    if (missingQr.length > 0) alerts.push({ id: 'missing-qr', tone: 'var(--amber)', badgeClass: 'amber', title: 'QR التسجيل الذاتي غير جاهز', desc: `${missingQr.length} مغسلة تحتاج رابط QR قبل تسليم النظام.`, to: '/admin/settings', action: 'تجهيز QR' })
    const unhealthy = health.filter(row => row.score < 70)
    if (unhealthy.length > 0) alerts.push({ id: 'unhealthy-tenants', tone: 'var(--primary)', badgeClass: 'violet', title: 'حسابات تحتاج إنقاذ', desc: `${unhealthy.length} حساب ناقص خدمات أو موظفين أو نشاط.`, to: '/admin/companies', action: 'مراجعة الشركات' })
    if (!automations.some(i => i.type === 'whatsapp' && i.status === 'active')) alerts.push({ id: 'whatsapp-pending', tone: 'oklch(0.60 0.27 258)', badgeClass: 'blue', title: 'واتساب ينتظر توثيق Meta', desc: 'التشغيل الداخلي جاهز، واتساب خارج نطاق التقييم.', to: '/admin/n8n', action: 'متابعة التكامل' })
    if (alerts.length === 0) alerts.push({ id: 'all-clear', tone: 'var(--green)', badgeClass: 'green', title: 'النظام جاهز للعرض', desc: 'لا توجد مشاكل حرجة حسب بيانات الشركات والتشغيل الحالية.', to: '/admin/companies', action: 'عرض الشركات' })
    return alerts
  }, [automations, carWashCompanies, health, nearLimit])


  return (
    <div className="page fade-in">
      {/* Header */}
      <div className="sec-head" style={{ marginBottom: 24 }}>
        <div>
          <div className="sec-title">نظرة عامة</div>
          <div className="sec-sub">مركز إدارة مدار OS — تحكم يومي كامل في عملاء SaaS للمغاسل</div>
        </div>
        <button className="btn btn-ghost" onClick={load}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
          تحديث
        </button>
      </div>

      {/* KPI Stats */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'إيراد الشهر', value: formatSar(revenueMonth) },
          { label: 'سيارات اليوم', value: carsToday.toLocaleString() },
          { label: 'شركات نشطة', value: `${activeCompanies} / ${companies.length}` },
          { label: 'قريبة من الحد', value: nearLimit, warn: nearLimit > 0 },
        ].map((s, i) => (
          <div key={i} className="stat">
            <div className="stat-top"><div className="stat-label">{s.label}</div></div>
            <div className="stat-value num" style={s.warn ? { color: 'var(--red)' } : {}}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="stat-grid" style={{ marginBottom: 24, gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'QR جاهز', value: `${qrReady} / ${carWashCompanies.length}` },
          { label: 'إضافات مدفوعة', value: paidAddons },
          { label: 'MRR المتوقع', value: formatSar(billing.mrr) },
          { label: 'فرص ترقية', value: billing.upgradeCandidates.length },
        ].map((s, i) => (
          <div key={i} className="stat">
            <div className="stat-top"><div className="stat-label">{s.label}</div></div>
            <div className="stat-value num" style={{ fontSize: 18 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {commandAlerts.slice(0, 4).map(alert => (
          <div key={alert.id} className="card" style={{ padding: '14px 18px', borderInlineStart: `3px solid ${alert.tone}`, display: 'flex', alignItems: 'center', gap: 14 }}>
            <span className={`badge ${alert.badgeClass}`} style={{ flexShrink: 0 }}>{alert.badgeClass === 'green' ? '✓' : '!'}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{alert.title}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{alert.desc}</div>
            </div>
            <Link to={alert.to} style={{ fontSize: 12, color: alert.tone, textDecoration: 'none', flexShrink: 0, fontWeight: 600 }}>{alert.action} ←</Link>
          </div>
        ))}
      </div>

      {/* Main Grid: Issues + Billing */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, marginBottom: 20 }}>
        {/* Issues Panel */}
        <div className="card card-pad">
          <div className="row gap-2" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>مركز المشاكل</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>قائمة قابلة للتنفيذ بدل أرقام عامة</div>
            </div>
            <div className="card row gap-2" style={{ padding: '7px 12px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--ink-3)' }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." style={{ background: 'none', border: 'none', outline: 'none', fontSize: 12.5, color: 'var(--ink)', width: 120 }} />
            </div>
          </div>
          {filteredIssues.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--green)', fontSize: 13 }}>✓ كل الشركات سليمة حسب الفحوصات الحالية</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredIssues.map(row => {
                const color = row.score >= 80 ? 'var(--green)' : row.score >= 55 ? 'var(--amber)' : 'var(--red)'
                return (
                  <div key={row.id} className="row gap-3" style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12, color, flexShrink: 0 }}>{row.score}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{row.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{PLAN_LABELS[row.plan] ?? row.plan} · {row.issues.slice(0, 3).join(' · ') || 'جاهزة'}</div>
                    </div>
                    <Link to={row.actionTo} style={{ fontSize: 11.5, color: 'var(--primary)', textDecoration: 'none', flexShrink: 0 }}>{row.action} ←</Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Billing Panel */}
        <div className="card card-pad">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>ملخص الفوترة</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 20 }}>قراءة سريعة لقيمة الاشتراكات وفرص الترقية</div>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>MRR المتوقع</div>
            <div className="num" style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)', margin: '4px 0' }}>{formatSar(billing.mrr)}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>النشط فعليًا: {formatSar(billing.activeMrr)}</div>
          </div>
          <div className="row gap-2" style={{ marginBottom: 16 }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
              <div className="num" style={{ fontWeight: 700, fontSize: 18, color: 'var(--amber)' }}>{billing.upgradeCandidates.length}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>فرصة ترقية</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
              <div className="num" style={{ fontWeight: 700, fontSize: 18, color: 'var(--green)' }}>{billing.renewals.length}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>تجديد قريب</div>
            </div>
          </div>
          {billing.renewals.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'center' }}>لا توجد تواريخ تجديد مسجلة</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {billing.renewals.map(c => (
                <div key={c.id} className="row gap-2" style={{ fontSize: 12 }}>
                  <span style={{ flex: 1 }}>{c.name}</span>
                  <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>{new Date(c.plan_reset_at).toLocaleDateString('ar-SA')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lower Grid: Integrations + Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Integration Health */}
        <div className="card card-pad">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>صحة التكاملات</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 18 }}>مؤشرات سريعة للتكاملات الأساسية</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {integrationHealth.map(item => (
              <div key={item.name} className="card" style={{ padding: '12px 14px', borderColor: item.pending ? 'rgba(245,158,11,0.3)' : item.ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.3)' }}>
                <div className="row gap-2" style={{ marginBottom: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.pending ? 'var(--amber)' : item.ok ? 'var(--green)' : 'var(--red)', flexShrink: 0, marginTop: 3 }} />
                  <span style={{ fontWeight: 600, fontSize: 12 }}>{item.name}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>{item.desc}</div>
                <span className={`badge ${item.pending ? 'amber' : item.ok ? 'green' : 'red'}`} style={{ fontSize: 10 }}>{item.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="card card-pad">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>آخر النشاط</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 18 }}>آخر حركة تشغيل أو مشكلة تحتاج انتباه</div>
          {activities.length === 0 && health.filter(r => r.score < 70).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--ink-3)', fontSize: 13 }}>لا توجد حركة حديثة</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activities.slice(0, 5).map(item => (
                <div key={`act-${item.id}`} className="row gap-3">
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(21,101,192,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="oklch(0.60 0.27 258)" strokeWidth="2"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" /><rect x="9" y="11" width="14" height="10" rx="2" /><circle cx="12" cy="16" r="1" /></svg>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 12 }}>{item.customer_name || 'عميل مغسلة'}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{item.company_name || 'شركة'} · {item.service_name || 'خدمة'} · {timeAgo(item.created_at)}</div>
                  </div>
                </div>
              ))}
              {health.filter(r => r.score < 70).slice(0, 3).map(row => (
                <div key={`issue-${row.id}`} className="row gap-3">
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 12 }}>{row.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{row.issues.slice(0, 2).join(' · ')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 20 }}>
        {[
          { to: '/admin/companies', title: 'إضافة / إدارة شركة', desc: 'افتح حساب عميل أو عدل بياناته.' },
          { to: '/admin/settings', title: 'تفعيل ميزات مدفوعة', desc: 'محفظة، اشتراكات، دفع إلكتروني.' },
          { to: '/admin/n8n', title: 'مراجعة الأتمتة', desc: 'أوقف أو شغل تدفقات العميل من n8n.' },
        ].map(item => (
          <Link key={item.to} to={item.to} style={{ textDecoration: 'none' }}>
            <div className="card card-pad" style={{ cursor: 'pointer', transition: 'border-color 0.2s' }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.18)'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = ''}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{item.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
