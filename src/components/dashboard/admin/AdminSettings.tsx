import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { logAudit } from '../../../lib/auditLog'
import type { Company, Plan } from '../../../types'
import { PLAN_LABELS, PLAN_PRICES } from '../../../lib/constants'

type TabKey = 'features' | 'plans' | 'onboarding' | 'alerts' | 'security'

type FeatureKey = 'self_checkin' | 'cash_pos' | 'wallet' | 'memberships' | 'online_payments' | 'whatsapp_ai' | 'branches' | 'advanced_reports'

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'features', label: 'ميزات الشركات' },
  { key: 'plans', label: 'الباقات' },
  { key: 'onboarding', label: 'التجهيز' },
  { key: 'alerts', label: 'التنبيهات' },
  { key: 'security', label: 'الأمان' },
]

const planLimits: Record<Plan, number> = { starter: 2000, growth: 10000, enterprise: 50000 }

const featureCatalog: Array<{ key: FeatureKey; title: string; desc: string; paid?: boolean }> = [
  { key: 'self_checkin', title: 'QR التسجيل الذاتي', desc: 'العميل يسجل نفسه من الجوال ويدخل الطابور مباشرة.' },
  { key: 'cash_pos', title: 'كاش ونقاط البيع', desc: 'يبقي الدفع التقليدي متاحا للمنشآت البسيطة.' },
  { key: 'wallet', title: 'المحفظة الرقمية', desc: 'شحن رصيد العميل والخصم التلقائي من الرصيد.', paid: true },
  { key: 'memberships', title: 'اشتراكات العملاء الشهرية', desc: 'باقات غسل شهرية مع تذكير واتساب.', paid: true },
  { key: 'online_payments', title: 'Apple Pay / Google Pay', desc: 'دفع إلكتروني في بداية الرحلة.', paid: true },
  { key: 'whatsapp_ai', title: 'عروض واتساب بالذكاء الاصطناعي', desc: 'اقتراح عروض أسبوعية وإرسالها حسب الباقة.', paid: true },
  { key: 'branches', title: 'تعدد الفروع', desc: 'تشغيل أكثر من فرع تحت نفس حساب الشركة.', paid: true },
  { key: 'advanced_reports', title: 'تقارير متقدمة', desc: 'تصدير وتحليل مالي وتشغيلي مفصل.', paid: true },
]

const launchChecklist = [
  { title: 'Moyasar production', desc: 'تفعيل مفاتيح الإنتاج، Apple Pay / Google Pay.', owner: 'تحتاج منك', done: false },
  { title: 'WhatsApp Business verification', desc: 'توثيق Meta Business وربط رقم إنتاجي.', owner: 'تحتاج منك', done: false },
  { title: 'Supabase Edge Functions', desc: 'نشر cw-public-checkin و trial-signup.', owner: 'نقدر ننشر بعد توفر الأسرار', done: false },
  { title: 'Netlify deployment', desc: 'يتم تلقائياً عند push إلى main.', owner: 'جاهز آلياً', done: true },
]

function getFlags(company: Company) {
  return (((company.cw_automations as any)?.feature_flags || {}) as Record<string, boolean>)
}
function hasFeature(company: Company, key: FeatureKey) { return Boolean(getFlags(company)[key]) }

function getReadiness(company: Company) {
  const checks = [
    { label: 'بيانات المالك', done: Boolean(company.owner_name && company.owner_email) },
    { label: 'حالة الحساب نشطة', done: company.status === 'active' || company.status === 'trial' },
    { label: 'رابط QR جاهز', done: Boolean(company.public_checkin_token || company.webhook_token) },
    { label: 'حد الرسائل محدد', done: Boolean(company.message_limit) },
    { label: 'ميزة الدفع محددة', done: hasFeature(company, 'cash_pos') || hasFeature(company, 'online_payments') || hasFeature(company, 'wallet') },
  ]
  return { checks, score: Math.round((checks.filter(c => c.done).length / checks.length) * 100) }
}

export const AdminSettings = () => {
  const [companies, setCompanies] = useState<Company[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('features')
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    supabase.from('companies').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      const rows = (data ?? []) as Company[]
      setCompanies(rows)
      setSelectedCompanyId(rows[0]?.id ?? '')
    })
  }, [])

  const selectedCompany = companies.find(c => c.id === selectedCompanyId) ?? companies[0]
  const filteredCompanies = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return companies
    return companies.filter(c => [c.name, c.owner_name, c.owner_email, c.plan].filter(Boolean).some(v => String(v).toLowerCase().includes(needle)))
  }, [companies, search])

  const toggleFeature = async (company: Company, key: FeatureKey) => {
    const current = getFlags(company)
    const nextFlags = { ...current, [key]: !current[key] }
    const nextAutomations = { ...((company.cw_automations as any) || {}), feature_flags: nextFlags }
    setSavingKey(`${company.id}:${key}`)
    const { error } = await supabase.from('companies').update({ cw_automations: nextAutomations } as any).eq('id', company.id)
    if (!error) {
      setCompanies(prev => prev.map(item => item.id === company.id ? { ...item, cw_automations: nextAutomations } : item))
      logAudit(company.id, nextFlags[key] ? 'feature_enabled' : 'feature_disabled', { entityType: 'company_feature', entityId: key, oldValue: { enabled: Boolean(current[key]) }, newValue: { enabled: Boolean(nextFlags[key]) } })
      setFeedback('تم حفظ إعدادات الميزات')
    } else setFeedback('تعذر الحفظ، حاول مرة أخرى')
    setSavingKey(null)
  }

  const updatePlan = async (company: Company, plan: Plan) => {
    setSavingKey(`${company.id}:plan`)
    const { error } = await supabase.from('companies').update({ plan, message_limit: planLimits[plan] } as any).eq('id', company.id)
    if (!error) {
      setCompanies(prev => prev.map(item => item.id === company.id ? { ...item, plan, message_limit: planLimits[plan] } : item))
      setFeedback('تم تحديث باقة الشركة')
    } else setFeedback('تعذر تحديث الباقة')
    setSavingKey(null)
  }

  return (
    <div className="page fade-in">
      <div className="sec-head" style={{ marginBottom: 24 }}>
        <div>
          <div className="sec-title">إعدادات النظام</div>
          <div className="sec-sub">تحكم مركزي في ميزات الشركات، الباقات، والأمان</div>
        </div>
        <div className="row gap-3">
          <span className="badge gray">{companies.length} شركة</span>
          {feedback && <span className="badge green">{feedback}</span>}
        </div>
      </div>

      <div className="seg" style={{ marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.key} className={activeTab === t.key ? 'active' : ''} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'features' && (
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20 }}>
          <div className="card" style={{ overflow: 'hidden', height: 'fit-content' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '7px 10px' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--ink-3)', flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن شركة..." style={{ background: 'none', border: 'none', outline: 'none', fontSize: 12, color: 'var(--ink)', flex: 1 }} />
              </div>
            </div>
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {filteredCompanies.map(company => {
                const readiness = getReadiness(company)
                return (
                  <button key={company.id} onClick={() => setSelectedCompanyId(company.id)}
                    style={{ display: 'flex', flexDirection: 'column', width: '100%', textAlign: 'start', padding: '11px 14px', borderBottom: '1px solid var(--border-2)', gap: 2, cursor: 'pointer', background: selectedCompany?.id === company.id ? 'rgba(48,120,255,0.1)' : 'none', borderInlineStart: selectedCompany?.id === company.id ? '2px solid var(--primary)' : '2px solid transparent' }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{company.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{PLAN_LABELS[company.plan] ?? company.plan} · {readiness.score}%</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            {selectedCompany ? (
              <>
                <div className="card card-pad" style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{selectedCompany.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{selectedCompany.owner_name || '—'} · {selectedCompany.owner_email || '—'}</div>
                    </div>
                    <div style={{ textAlign: 'start' }}>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>الرسائل</div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>
                        {(selectedCompany.messages_used || 0).toLocaleString()} / {(selectedCompany.message_limit || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {featureCatalog.map(({ key, title, desc, paid }) => {
                    const enabled = hasFeature(selectedCompany, key)
                    return (
                      <div key={key} className="card card-pad" style={{ borderColor: enabled ? 'rgba(48,120,255,0.35)' : undefined, background: enabled ? 'rgba(48,120,255,0.06)' : undefined }}>
                        <div className="row gap-2" style={{ marginBottom: 6 }}>
                          <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{title}</span>
                          {paid && <span className="badge violet" style={{ fontSize: 10 }}>مدفوعة</span>}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 12 }}>{desc}</div>
                        <div className={`switch ${enabled ? 'on' : ''}`} style={{ cursor: 'pointer' }}
                          onClick={() => !savingKey && toggleFeature(selectedCompany, key)}
                        />
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="card card-pad" style={{ textAlign: 'center', color: 'var(--ink-3)' }}>اختر شركة من القائمة</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'plans' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {(['starter', 'growth', 'enterprise'] as Plan[]).map(plan => (
            <div key={plan} className="card card-pad">
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{PLAN_LABELS[plan] ?? plan}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 16 }}>{PLAN_PRICES[plan]} ر.س / شهر · {planLimits[plan].toLocaleString()} رسالة</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {companies.filter(c => c.plan === plan).slice(0, 6).map(company => (
                  <div key={company.id} className="row gap-2" style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{company.name}</span>
                    <button className="btn btn-ghost btn-sm" disabled={savingKey === `${company.id}:plan`}
                      onClick={() => updatePlan(company, plan)}>تثبيت</button>
                  </div>
                ))}
                {companies.filter(c => c.plan === plan).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '16px', color: 'var(--ink-3)', fontSize: 12 }}>لا توجد شركات</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'onboarding' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {companies.map(company => {
            const readiness = getReadiness(company)
            return (
              <div key={company.id} className="card card-pad">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{company.name}</div>
                  <span className={`badge ${readiness.score >= 80 ? 'green' : readiness.score >= 50 ? 'amber' : 'red'}`}>{readiness.score}%</span>
                </div>
                <div className="prog" style={{ marginBottom: 12 }}>
                  <div className="prog-fill" style={{ width: `${readiness.score}%`, background: readiness.score >= 80 ? 'var(--green)' : readiness.score >= 50 ? 'var(--amber)' : 'var(--red)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {readiness.checks.map(check => (
                    <div key={check.label} className="row gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={check.done ? 'var(--green)' : 'var(--ink-4)'} strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span style={{ fontSize: 12, color: check.done ? 'var(--ink)' : 'var(--ink-3)' }}>{check.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'alerts' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {[
            { title: 'تنبيهات التشغيل', items: ['شركة وصلت 80% من حد رسائل واتساب', 'شركة بدون QR تسجيل ذاتي', 'شركة بدون نشاط سيارات اليوم', 'شركة غير مكتملة التجهيز'] },
            { title: 'تنبيهات المبيعات', items: ['اقتراح ترقية عند قرب الرسائل من الحد', 'اقتراح المحفظة للمنشآت ذات العملاء المتكررين', 'اقتراح الاشتراكات الشهرية للمغاسل النشطة'] },
          ].map(section => (
            <div key={section.title} className="card card-pad">
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>{section.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {section.items.map(item => (
                  <div key={item} className="feat-row">
                    <span style={{ flex: 1, fontSize: 13 }}>{item}</span>
                    <div className="switch on" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'security' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          <div className="card card-pad" style={{ gridColumn: 'span 1' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>قائمة الإطلاق</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {launchChecklist.map(item => (
                <div key={item.title} className="row gap-3" style={{ alignItems: 'flex-start' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={item.done ? 'var(--green)' : 'var(--ink-4)'} strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 2 }}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{item.desc}</div>
                    <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 1 }}>{item.owner}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card card-pad">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>صلاحيات الإدارة</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {['تعديل الباقات', 'تفعيل الدفع الإلكتروني', 'تعطيل شركة', 'عرض سجلات النظام'].map(item => (
                <div key={item} className="feat-row">
                  <span style={{ flex: 1, fontSize: 13 }}>{item}</span>
                  <span className="badge violet" style={{ fontSize: 11 }}>أدمن</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card card-pad">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>بيئة النظام</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['Supabase: aacnqiuwrpzgxhzdavaq', 'n8n: keepcalm.app.n8n.cloud', 'WhatsApp: Meta Cloud API', 'Payments: Moyasar'].map(item => (
                <code key={item} style={{ display: 'block', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-2)', background: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: 7 }}>{item}</code>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
