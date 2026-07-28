import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import type { Company } from '../../../types'
import { PLAN_LABELS } from '../../../lib/constants'

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

function formatSar(value: number) {
  return `${Math.round(value).toLocaleString('ar-SA')} ر.س`
}

function planPrice(plan: string) {
  return PLAN_VALUE[plan] ?? 0
}

function getMessageUsage(company: Company) {
  const limit = company.message_limit || 0
  if (!limit) return 0
  return Math.round(((company.messages_used || 0) / limit) * 100)
}

export const AdminCommandDeck = () => {
  const [companies, setCompanies] = useState<Company[]>([])
  const [automations, setAutomations] = useState<AutomationRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const [{ data: companyRows }, { data: automationRows }] = await Promise.all([
      supabase.from('companies').select('*').order('created_at', { ascending: false }),
      supabase.from('automations').select('id, name, type, status').limit(80),
    ])
    setCompanies((companyRows || []) as Company[])
    setAutomations((automationRows || []) as AutomationRow[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const activeCompanies = companies.filter(company => company.status === 'active').length
  const nearLimitCompanies = companies.filter(company => getMessageUsage(company) >= 80)
  const nearLimit = nearLimitCompanies.length

  const billing = useMemo(() => {
    const mrr = companies.reduce((sum, company) => sum + planPrice(company.plan), 0)
    const activeMrr = companies.filter(company => company.status !== 'suspended').reduce((sum, company) => sum + planPrice(company.plan), 0)
    const upgradeCandidates = companies.filter(company => company.plan !== 'enterprise' && getMessageUsage(company) >= 70)
    const renewals = companies
      .filter(company => company.plan_reset_at)
      .sort((a, b) => new Date(a.plan_reset_at).getTime() - new Date(b.plan_reset_at).getTime())
      .slice(0, 4)
    return { mrr, activeMrr, upgradeCandidates, renewals }
  }, [companies])

  const integrationHealth = [
    { name: 'Supabase', desc: 'قاعدة البيانات والمصادقة', status: 'متصل', ok: true, pending: false },
    { name: 'n8n Cloud', desc: 'تدفقات الأتمتة والويب هوك', status: automations.some(i => i.status === 'active') ? 'نشط' : 'يحتاج مراجعة', ok: automations.some(i => i.status === 'active'), pending: false },
    { name: 'WhatsApp API', desc: 'رسائل العملاء', status: automations.some(i => i.type === 'whatsapp' && i.status === 'active') ? 'نشط' : 'بانتظار توثيق Meta', ok: true, pending: !automations.some(i => i.type === 'whatsapp' && i.status === 'active') },
  ]

  const filteredCompanies = companies
    .filter(row => !search || row.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 7)

  const commandAlerts = useMemo(() => {
    const alerts: Array<{ id: string; tone: string; badgeClass: string; title: string; desc: string; to: string; action: string }> = []
    if (nearLimit > 0) alerts.push({ id: 'message-limit', tone: 'var(--red)', badgeClass: 'red', title: 'شركات قريبة من حد الرسائل', desc: `${nearLimit} شركة وصلت 80% أو أكثر. هذه أفضل لحظة لبيع ترقية.`, to: '/admin/settings', action: 'فتح التحكم' })
    if (!automations.some(i => i.type === 'whatsapp' && i.status === 'active')) alerts.push({ id: 'whatsapp-pending', tone: 'oklch(0.60 0.27 258)', badgeClass: 'blue', title: 'واتساب ينتظر توثيق Meta', desc: 'التشغيل الداخلي جاهز، واتساب خارج نطاق التقييم.', to: '/admin/n8n', action: 'متابعة التكامل' })
    if (alerts.length === 0) alerts.push({ id: 'all-clear', tone: 'var(--green)', badgeClass: 'green', title: 'النظام جاهز للعرض', desc: 'لا توجد مشاكل حرجة حسب بيانات الشركات الحالية.', to: '/admin/companies', action: 'عرض الشركات' })
    return alerts
  }, [automations, nearLimit])

  return (
    <div className="page fade-in">
      {/* Header */}
      <div className="sec-head" style={{ marginBottom: 24 }}>
        <div>
          <div className="sec-title">نظرة عامة</div>
          <div className="sec-sub">مركز إدارة مدار OS — تحكم يومي في عملاء SaaS</div>
        </div>
        <button className="btn btn-ghost" onClick={load}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
          تحديث
        </button>
      </div>

      {/* KPI Stats */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'MRR المتوقع', value: formatSar(billing.mrr) },
          { label: 'شركات نشطة', value: `${activeCompanies} / ${companies.length}` },
          { label: 'قريبة من الحد', value: nearLimit, warn: nearLimit > 0 },
          { label: 'فرص ترقية', value: billing.upgradeCandidates.length },
        ].map((s, i) => (
          <div key={i} className="stat">
            <div className="stat-top"><div className="stat-label">{s.label}</div></div>
            <div className="stat-value num" style={s.warn ? { color: 'var(--red)' } : {}}>{s.value}</div>
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

      {/* Main Grid: Companies + Billing */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, marginBottom: 20 }}>
        {/* Companies Panel */}
        <div className="card card-pad">
          <div className="row gap-2" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>الشركات</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>أحدث الشركات المسجلة بالنظام</div>
            </div>
            <div className="card row gap-2" style={{ padding: '7px 12px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--ink-3)' }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." style={{ background: 'none', border: 'none', outline: 'none', fontSize: 12.5, color: 'var(--ink)', width: 120 }} />
            </div>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-3)', fontSize: 13 }}>جاري التحميل...</div>
          ) : filteredCompanies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-3)', fontSize: 13 }}>لا توجد نتائج مطابقة</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredCompanies.map(row => {
                const usage = getMessageUsage(row)
                const color = usage >= 80 ? 'var(--red)' : usage >= 55 ? 'var(--amber)' : 'var(--green)'
                return (
                  <div key={row.id} className="row gap-3" style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12, color, flexShrink: 0 }}>{usage}%</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{row.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{PLAN_LABELS[row.plan] ?? row.plan} · {row.status}</div>
                    </div>
                    <Link to="/admin/companies" style={{ fontSize: 11.5, color: 'var(--primary)', textDecoration: 'none', flexShrink: 0 }}>فتح ←</Link>
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

      {/* Integration Health */}
      <div className="card card-pad" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>صحة التكاملات</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 18 }}>مؤشرات سريعة للتكاملات الأساسية</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
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

      {/* Quick Links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {[
          { to: '/admin/companies', title: 'إضافة / إدارة شركة', desc: 'افتح حساب عميل أو عدل بياناته.' },
          { to: '/admin/settings', title: 'إدارة الباقات والاشتراكات', desc: 'ترقية الباقة أو تعديل الحدود.' },
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
