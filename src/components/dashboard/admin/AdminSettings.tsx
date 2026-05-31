import { useEffect, useMemo, useState } from 'react'
import type { ElementType } from 'react'
import {
  Bell,
  Building2,
  CheckCircle2,
  CreditCard,
  Gauge,
  LockKeyhole,
  MessageSquare,
  QrCode,
  Save,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  WalletCards,
  Zap,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { logAudit } from '../../../lib/auditLog'
import type { Company, Plan } from '../../../types'
import { PLAN_LABELS, PLAN_PRICES } from '../../../lib/constants'

type TabKey = 'features' | 'plans' | 'onboarding' | 'alerts' | 'security'

type FeatureKey =
  | 'self_checkin'
  | 'cash_pos'
  | 'wallet'
  | 'memberships'
  | 'online_payments'
  | 'whatsapp_ai'
  | 'branches'
  | 'advanced_reports'

const tabs: Array<{ key: TabKey; label: string; icon: ElementType }> = [
  { key: 'features', label: 'ميزات الشركات', icon: SlidersHorizontal },
  { key: 'plans', label: 'الباقات', icon: CreditCard },
  { key: 'onboarding', label: 'التجهيز', icon: CheckCircle2 },
  { key: 'alerts', label: 'التنبيهات', icon: Bell },
  { key: 'security', label: 'الأمان', icon: ShieldCheck },
]

const planLimits: Record<Plan, number> = {
  starter: 2000,
  growth: 10000,
  enterprise: 50000,
}

const featureCatalog: Array<{
  key: FeatureKey
  title: string
  desc: string
  icon: ElementType
  paid?: boolean
}> = [
  { key: 'self_checkin', title: 'QR التسجيل الذاتي', desc: 'العميل يسجل نفسه من الجوال ويدخل الطابور مباشرة.', icon: QrCode },
  { key: 'cash_pos', title: 'كاش ونقاط البيع', desc: 'يبقي الدفع التقليدي متاحا للمنشآت البسيطة.', icon: CreditCard },
  { key: 'wallet', title: 'المحفظة الرقمية', desc: 'شحن رصيد العميل والخصم التلقائي من الرصيد.', icon: WalletCards, paid: true },
  { key: 'memberships', title: 'اشتراكات العملاء الشهرية', desc: 'باقات غسل شهرية مع تذكير واتساب قبل موعد العميل.', icon: Gauge, paid: true },
  { key: 'online_payments', title: 'Apple Pay / Google Pay', desc: 'دفع إلكتروني في بداية الرحلة وربطه بالمحفظة.', icon: CreditCard, paid: true },
  { key: 'whatsapp_ai', title: 'عروض واتساب بالذكاء الاصطناعي', desc: 'اقتراح عروض أسبوعية وإرسالها حسب الباقة.', icon: MessageSquare, paid: true },
  { key: 'branches', title: 'تعدد الفروع', desc: 'تشغيل أكثر من فرع تحت نفس حساب الشركة.', icon: Building2, paid: true },
  { key: 'advanced_reports', title: 'تقارير متقدمة', desc: 'تصدير وتحليل مالي وتشغيلي مفصل.', icon: Zap, paid: true },
]

const launchChecklist = [
  {
    title: 'Moyasar production',
    desc: 'تفعيل مفاتيح الإنتاج، Apple Pay / Google Pay، وتجربة callback على خطة حقيقية.',
    owner: 'تحتاج منك',
    done: false,
  },
  {
    title: 'WhatsApp Business verification',
    desc: 'توثيق Meta Business وربط رقم إنتاجي لإرسال OTP ورسائل التشغيل بدون رقم testing.',
    owner: 'تحتاج منك',
    done: false,
  },
  {
    title: 'Supabase Edge Functions',
    desc: 'نشر آخر نسخة من cw-public-checkin و trial-signup بعد اعتماد أسرار Twilio/Moyasar.',
    owner: 'نقدر ننشر بعد توفر الأسرار',
    done: false,
  },
  {
    title: 'Netlify deployment',
    desc: 'يتم تلقائياً عند push إلى main، مع مراجعة آخر build قبل تسليم العميل.',
    owner: 'جاهز آلياً',
    done: true,
  },
]

function getFlags(company: Company) {
  return (((company.cw_automations as any)?.feature_flags || {}) as Record<string, boolean>)
}

function hasFeature(company: Company, key: FeatureKey) {
  return Boolean(getFlags(company)[key])
}

function getReadiness(company: Company) {
  const checks = [
    { label: 'بيانات المالك', done: Boolean(company.owner_name && company.owner_email) },
    { label: 'حالة الحساب نشطة', done: company.status === 'active' || company.status === 'trial' },
    { label: 'رابط QR جاهز', done: Boolean(company.public_checkin_token || company.webhook_token) },
    { label: 'حد الرسائل محدد', done: Boolean(company.message_limit) },
    { label: 'ميزة الدفع محددة', done: hasFeature(company, 'cash_pos') || hasFeature(company, 'online_payments') || hasFeature(company, 'wallet') },
  ]
  const done = checks.filter(check => check.done).length
  return { checks, score: Math.round((done / checks.length) * 100) }
}

function SettingCard({
  title,
  desc,
  icon: Icon,
  children,
}: {
  title: string
  desc: string
  icon: ElementType
  children: React.ReactNode
}) {
  return (
    <section className="admin-control-card">
      <div className="admin-control-card-head">
        <div className="admin-control-icon">
          <Icon size={18} />
        </div>
        <div>
          <h3>{title}</h3>
          <p>{desc}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

export const AdminSettings = () => {
  const [companies, setCompanies] = useState<Company[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('features')
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('companies').select('*').order('created_at', { ascending: false })
      const rows = (data ?? []) as Company[]
      setCompanies(rows)
      setSelectedCompanyId(rows[0]?.id ?? '')
    }
    load()
  }, [])

  const selectedCompany = companies.find(company => company.id === selectedCompanyId) ?? companies[0]
  const filteredCompanies = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return companies
    return companies.filter(company =>
      [company.name, company.owner_name, company.owner_email, company.plan]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(needle))
    )
  }, [companies, search])

  const platformStats = useMemo(() => {
    const active = companies.filter(company => company.status === 'active').length
    const paidAddons = companies.reduce((sum, company) => {
      const flags = getFlags(company)
      return sum + featureCatalog.filter(feature => feature.paid && flags[feature.key]).length
    }, 0)
    const nearLimit = companies.filter(company => {
      const limit = company.message_limit || 0
      return limit > 0 && ((company.messages_used || 0) / limit) >= 0.8
    }).length
    return { active, paidAddons, nearLimit }
  }, [companies])

  const toggleFeature = async (company: Company, key: FeatureKey) => {
    const current = getFlags(company)
    const nextFlags = { ...current, [key]: !current[key] }
    const nextAutomations = {
      ...((company.cw_automations as any) || {}),
      feature_flags: nextFlags,
    }

    setSavingKey(`${company.id}:${key}`)
    setFeedback('')
    const { error } = await supabase
      .from('companies')
      .update({ cw_automations: nextAutomations } as any)
      .eq('id', company.id)

    if (!error) {
      setCompanies(prev => prev.map(item => item.id === company.id ? { ...item, cw_automations: nextAutomations } : item))
      logAudit(company.id, nextFlags[key] ? 'feature_enabled' : 'feature_disabled', {
        entityType: 'company_feature',
        entityId: key,
        oldValue: { enabled: Boolean(current[key]) },
        newValue: { enabled: Boolean(nextFlags[key]) },
      })
      setFeedback('تم حفظ إعدادات الميزات')
    } else {
      setFeedback('تعذر الحفظ، حاول مرة أخرى')
    }
    setSavingKey(null)
  }

  const updatePlan = async (company: Company, plan: Plan) => {
    setSavingKey(`${company.id}:plan`)
    setFeedback('')
    const { error } = await supabase
      .from('companies')
      .update({ plan, message_limit: planLimits[plan] } as any)
      .eq('id', company.id)

    if (!error) {
      setCompanies(prev => prev.map(item => item.id === company.id ? { ...item, plan, message_limit: planLimits[plan] } : item))
      logAudit(company.id, 'plan_updated', {
        entityType: 'company_plan',
        entityId: plan,
        oldValue: { plan: company.plan, message_limit: company.message_limit },
        newValue: { plan, message_limit: planLimits[plan] },
      })
      setFeedback('تم تحديث باقة الشركة')
    } else {
      setFeedback('تعذر تحديث الباقة')
    }
    setSavingKey(null)
  }

  return (
    <div className="admin-control">
      <section className="admin-control-hero">
        <div>
          <span>لوحة تحكم النظام</span>
          <h1>إعدادات مدار OS</h1>
          <p>تحكم مركزي في ميزات الشركات، الباقات، جاهزية التشغيل، التنبيهات، والأمان بدون صفحات طويلة مرهقة.</p>
        </div>
        <div className="admin-control-hero-stats">
          <strong>{companies.length}</strong>
          <small>شركة</small>
          <strong>{platformStats.paidAddons}</strong>
          <small>ميزة مدفوعة مفعلة</small>
          <strong>{platformStats.nearLimit}</strong>
          <small>قريبة من حد الرسائل</small>
        </div>
      </section>

      <div className="admin-control-tabs" role="tablist" aria-label="إعدادات الإدارة">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className={activeTab === key ? 'active' : ''}
            onClick={() => setActiveTab(key)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {feedback && <div className="admin-control-feedback">{feedback}</div>}

      {activeTab === 'features' && (
        <div className="admin-control-layout">
          <aside className="admin-company-picker">
            <div className="admin-search">
              <Search size={15} />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="ابحث عن شركة..." />
            </div>
            <div className="admin-company-list">
              {filteredCompanies.map(company => {
                const readiness = getReadiness(company)
                return (
                  <button
                    key={company.id}
                    type="button"
                    className={selectedCompany?.id === company.id ? 'active' : ''}
                    onClick={() => setSelectedCompanyId(company.id)}
                  >
                    <span>
                      <strong>{company.name}</strong>
                      <small>{PLAN_LABELS[company.plan] ?? company.plan} · جاهزية {readiness.score}%</small>
                    </span>
                    <em>{company.status === 'active' ? 'نشطة' : company.status === 'trial' ? 'تجربة' : 'موقوفة'}</em>
                  </button>
                )
              })}
            </div>
          </aside>

          <main className="admin-feature-panel">
            {selectedCompany ? (
              <>
                <div className="admin-selected-company">
                  <div>
                    <span>الشركة المحددة</span>
                    <h2>{selectedCompany.name}</h2>
                    <p>{selectedCompany.owner_name || 'بدون مالك'} · {selectedCompany.owner_email || 'بدون بريد'}</p>
                  </div>
                  <div>
                    <small>الرسائل</small>
                    <strong>{(selectedCompany.messages_used || 0).toLocaleString('en-US')} / {(selectedCompany.message_limit || 0).toLocaleString('en-US')}</strong>
                  </div>
                </div>

                <div className="admin-feature-grid">
                  {featureCatalog.map(({ key, title, desc, icon: Icon, paid }) => {
                    const enabled = hasFeature(selectedCompany, key)
                    return (
                      <article key={key} className={enabled ? 'enabled' : ''}>
                        <div>
                          <Icon size={18} />
                          {paid && <span>إضافة مدفوعة</span>}
                        </div>
                        <h3>{title}</h3>
                        <p>{desc}</p>
                        <button
                          type="button"
                          className={enabled ? 'enabled' : ''}
                          disabled={savingKey === `${selectedCompany.id}:${key}`}
                          onClick={() => toggleFeature(selectedCompany, key)}
                        >
                          {enabled ? 'مفعلة' : 'تفعيل'}
                        </button>
                      </article>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="admin-empty-state">لا توجد شركات حتى الآن</div>
            )}
          </main>
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="admin-plan-grid">
          {(['starter', 'growth', 'enterprise'] as Plan[]).map(plan => (
            <SettingCard
              key={plan}
              icon={CreditCard}
              title={PLAN_LABELS[plan] ?? plan}
              desc={`${PLAN_PRICES[plan]} ر.س / شهر · ${planLimits[plan].toLocaleString('en-US')} رسالة`}
            >
              <div className="admin-plan-company-list">
                {companies.filter(company => company.plan === plan).slice(0, 6).map(company => (
                  <div key={company.id}>
                    <span>{company.name}</span>
                    <button type="button" onClick={() => updatePlan(company, plan)} disabled={savingKey === `${company.id}:plan`}>
                      <Save size={13} />
                      تثبيت
                    </button>
                  </div>
                ))}
                {companies.filter(company => company.plan === plan).length === 0 && <p>لا توجد شركات على هذه الباقة.</p>}
              </div>
            </SettingCard>
          ))}
        </div>
      )}

      {activeTab === 'onboarding' && (
        <div className="admin-onboarding-grid">
          {companies.map(company => {
            const readiness = getReadiness(company)
            return (
              <SettingCard key={company.id} icon={Building2} title={company.name} desc={`جاهزية التشغيل ${readiness.score}%`}>
                <div className="admin-readiness-bar"><span style={{ width: `${readiness.score}%` }} /></div>
                <div className="admin-check-list">
                  {readiness.checks.map(check => (
                    <div key={check.label} className={check.done ? 'done' : ''}>
                      <CheckCircle2 size={15} />
                      {check.label}
                    </div>
                  ))}
                </div>
              </SettingCard>
            )
          })}
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="admin-settings-grid">
          <SettingCard icon={Bell} title="تنبيهات التشغيل" desc="تنبيهات تلقائية للمنشآت التي تحتاج تدخل سريع.">
            {[
              'شركة وصلت 80% من حد رسائل واتساب',
              'شركة بدون QR تسجيل ذاتي',
              'شركة بدون نشاط سيارات اليوم',
              'شركة غير مكتملة التجهيز بعد التسجيل',
            ].map(item => <div key={item} className="admin-setting-row"><span>{item}</span><button type="button">مفعل</button></div>)}
          </SettingCard>
          <SettingCard icon={MessageSquare} title="تنبيهات المبيعات" desc="فرص ترقية وتفعيل إضافات مدفوعة.">
            {[
              'اقتراح ترقية عند قرب الرسائل من الحد',
              'اقتراح المحفظة للمنشآت ذات العملاء المتكررين',
              'اقتراح الاشتراكات الشهرية للمغاسل النشطة',
            ].map(item => <div key={item} className="admin-setting-row"><span>{item}</span><button type="button">مفعل</button></div>)}
          </SettingCard>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="admin-settings-grid">
          <SettingCard icon={CheckCircle2} title="قائمة الإطلاق الخارجي" desc="الأشياء التي تحدد هل المنصة جاهزة للبيع المدفوع بكامل الثقة.">
            <div className="admin-check-list">
              {launchChecklist.map(item => (
                <div key={item.title} className={item.done ? 'done' : ''}>
                  <CheckCircle2 size={15} />
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.desc}</small>
                    <em>{item.owner}</em>
                  </span>
                </div>
              ))}
            </div>
          </SettingCard>
          <SettingCard icon={LockKeyhole} title="صلاحيات الإدارة" desc="ضبط الوصول الحساس قبل تفعيل ميزات مدفوعة أو تعديل الباقات.">
            {['تعديل الباقات', 'تفعيل الدفع الإلكتروني', 'تعطيل شركة', 'عرض سجلات النظام'].map(item => (
              <div key={item} className="admin-setting-row"><span>{item}</span><button type="button">يتطلب أدمن</button></div>
            ))}
          </SettingCard>
          <SettingCard icon={Settings} title="بيئة النظام" desc="مراجع التشغيل الحرجة لهذا المشروع.">
            <div className="admin-env-list">
              <code>Supabase: aacnqiuwrpzgxhzdavaq</code>
              <code>n8n: keepcalm.app.n8n.cloud</code>
              <code>WhatsApp: Meta Cloud API</code>
              <code>Payments: Moyasar</code>
            </div>
          </SettingCard>
        </div>
      )}
    </div>
  )
}
