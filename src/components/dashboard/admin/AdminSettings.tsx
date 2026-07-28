import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Company, Plan } from '../../../types'
import { PLAN_LABELS, PLAN_PRICES } from '../../../lib/constants'

type TabKey = 'plans' | 'onboarding' | 'alerts' | 'security'

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'plans', label: 'الباقات' },
  { key: 'onboarding', label: 'التجهيز' },
  { key: 'alerts', label: 'التنبيهات' },
  { key: 'security', label: 'الأمان' },
]

const planLimits: Record<Plan, number> = { starter: 2000, growth: 10000, enterprise: 50000 }

const launchChecklist = [
  { title: 'Moyasar production', desc: 'تفعيل مفاتيح الإنتاج، Apple Pay / Google Pay.', owner: 'تحتاج منك', done: false },
  { title: 'WhatsApp Business verification', desc: 'توثيق Meta Business وربط رقم إنتاجي.', owner: 'تحتاج منك', done: false },
  { title: 'Netlify deployment', desc: 'يتم تلقائياً عند push إلى main.', owner: 'جاهز آلياً', done: true },
]

function getReadiness(company: Company) {
  const checks = [
    { label: 'بيانات المالك', done: Boolean(company.owner_name && company.owner_email) },
    { label: 'حالة الحساب نشطة', done: company.status === 'active' || company.status === 'trial' },
    { label: 'حد الرسائل محدد', done: Boolean(company.message_limit) },
  ]
  return { checks, score: Math.round((checks.filter(c => c.done).length / checks.length) * 100) }
}

export const AdminSettings = () => {
  const [companies, setCompanies] = useState<Company[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('plans')
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    supabase.from('companies').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setCompanies((data ?? []) as Company[])
    })
  }, [])

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
            { title: 'تنبيهات التشغيل', items: ['شركة وصلت 80% من حد رسائل واتساب', 'شركة غير مكتملة التجهيز', 'شركة بدون نشاط هذا الأسبوع'] },
            { title: 'تنبيهات المبيعات', items: ['اقتراح ترقية عند قرب الرسائل من الحد', 'تذكير بمتابعة الشركات التجريبية القريبة من الانتهاء'] },
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
              {['Supabase: aacnqiuwrpzgxhzdavaq', 'n8n: n8n.madar.software', 'WhatsApp: Meta Cloud API', 'Payments: Moyasar'].map(item => (
                <code key={item} style={{ display: 'block', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-2)', background: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: 7 }}>{item}</code>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
