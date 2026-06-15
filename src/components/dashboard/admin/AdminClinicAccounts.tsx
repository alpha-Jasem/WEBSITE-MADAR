import { useCallback, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import {
  Activity, AlertTriangle, Ban, CalendarDays, CheckCircle2, ChevronLeft,
  CircleDollarSign, Clock3, Loader2, RefreshCw, RotateCcw, Search, ShieldCheck,
  SlidersHorizontal, Sparkles, UsersRound, X,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'

type PlanCode = 'whatsapp' | 'ai_pro'
type AccountStatus = 'active' | 'trial' | 'inactive' | 'expired' | 'suspended' | 'warning' | 'usage_limited'

type Usage = {
  whatsapp_conversations_used?: number
  ai_messages_used?: number
  smart_call_minutes_used?: number
  appointment_reminders_used?: number
}

type Limits = {
  whatsapp_conversations_limit?: number
  ai_messages_limit?: number
  smart_call_minutes_limit?: number
  appointment_reminders_limit?: number
  extra_whatsapp_conversations?: number
  extra_ai_messages?: number
  extra_smart_call_minutes?: number
  extra_appointment_reminders?: number
  extra_limits_expire_at?: string | null
}

type AuditRow = { id: string; action: string; note?: string; actor_type: string; created_at: string }

type ClinicAccount = {
  id: string
  company_id?: string | null
  name: string
  owner_name?: string
  owner_email?: string
  owner_phone?: string
  city?: string
  status: string
  auth_user_id?: string
  clinic_plan_code?: PlanCode
  subscription_status?: AccountStatus
  subscription_start_date?: string
  subscription_end_date?: string
  monthly_usage_cycle_start?: string
  monthly_usage_cycle_end?: string
  payment_provider?: string
  last_payment_status?: string
  last_payment_at?: string
  created_at: string
  email_confirmed_at?: string | null
  last_sign_in_at?: string | null
  pending_company?: boolean
  usage?: Usage | null
  limits?: Limits | null
  audit?: AuditRow[]
}

type AccountDraft = {
  plan_code: PlanCode
  subscription_status: AccountStatus
  subscription_start_date: string
  subscription_end_date: string
  cycle_start: string
  cycle_end: string
  payment_provider: string
  payment_status: string
  limits: { whatsapp: number; ai_messages: number; smart_calls: number; reminders: number }
  extras: { whatsapp: number; ai_messages: number; smart_calls: number; reminders: number }
  extra_limits_expire_at: string
  note: string
}

const PLAN_DEFAULTS: Record<PlanCode, AccountDraft['limits']> = {
  whatsapp: { whatsapp: 1500, ai_messages: 3000, smart_calls: 0, reminders: 500 },
  ai_pro: { whatsapp: 2500, ai_messages: 5000, smart_calls: 300, reminders: 700 },
}

const planLabel: Record<PlanCode, string> = {
  whatsapp: 'WhatsApp AI',
  ai_pro: 'AI + المكالمات الذكية',
}

const statusLabel: Record<AccountStatus, string> = {
  active: 'نشط', trial: 'تجريبي', inactive: 'غير مشترك', expired: 'منتهي',
  suspended: 'موقوف', warning: 'قريب من الحد', usage_limited: 'تجاوز الحد',
}

const statusTone: Record<AccountStatus, string> = {
  active: 'green', trial: 'blue', inactive: 'gray', expired: 'red',
  suspended: 'red', warning: 'amber', usage_limited: 'red',
}

const isoDate = (date: Date) => date.toISOString().slice(0, 10)
const addDays = (date: string, days: number) => {
  const next = new Date(`${date || isoDate(new Date())}T12:00:00`)
  next.setDate(next.getDate() + days)
  return isoDate(next)
}

const numberValue = (value: unknown) => Math.max(0, Number(value) || 0)

function toDraft(account: ClinicAccount): AccountDraft {
  const plan = account.clinic_plan_code || 'whatsapp'
  const defaults = PLAN_DEFAULTS[plan]
  return {
    plan_code: plan,
    subscription_status: account.subscription_status || 'inactive',
    subscription_start_date: account.subscription_start_date || '',
    subscription_end_date: account.subscription_end_date || '',
    cycle_start: account.monthly_usage_cycle_start || isoDate(new Date()),
    cycle_end: account.monthly_usage_cycle_end || addDays(isoDate(new Date()), 29),
    payment_provider: account.payment_provider || 'manual',
    payment_status: account.last_payment_status || 'pending',
    limits: {
      whatsapp: numberValue(account.limits?.whatsapp_conversations_limit ?? defaults.whatsapp),
      ai_messages: numberValue(account.limits?.ai_messages_limit ?? defaults.ai_messages),
      smart_calls: numberValue(account.limits?.smart_call_minutes_limit ?? defaults.smart_calls),
      reminders: numberValue(account.limits?.appointment_reminders_limit ?? defaults.reminders),
    },
    extras: {
      whatsapp: numberValue(account.limits?.extra_whatsapp_conversations),
      ai_messages: numberValue(account.limits?.extra_ai_messages),
      smart_calls: numberValue(account.limits?.extra_smart_call_minutes),
      reminders: numberValue(account.limits?.extra_appointment_reminders),
    },
    extra_limits_expire_at: account.limits?.extra_limits_expire_at?.slice(0, 10) || '',
    note: '',
  }
}

function usagePercent(account: ClinicAccount) {
  const rows = [
    [account.usage?.whatsapp_conversations_used, account.limits?.whatsapp_conversations_limit, account.limits?.extra_whatsapp_conversations],
    [account.usage?.ai_messages_used, account.limits?.ai_messages_limit, account.limits?.extra_ai_messages],
    [account.usage?.smart_call_minutes_used, account.limits?.smart_call_minutes_limit, account.limits?.extra_smart_call_minutes],
    [account.usage?.appointment_reminders_used, account.limits?.appointment_reminders_limit, account.limits?.extra_appointment_reminders],
  ]
  return Math.max(0, ...rows.map(([used = 0, base = 0, extra = 0]) => {
    const limit = Number(base) + Number(extra)
    return limit ? Math.round((Number(used) / limit) * 100) : 0
  }))
}

function daysRemaining(date?: string) {
  if (!date) return null
  return Math.ceil((new Date(`${date}T23:59:59`).getTime() - Date.now()) / 86400000)
}

export function AdminClinicAccounts() {
  const [accounts, setAccounts] = useState<ClinicAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'trial' | 'attention'>('all')
  const [selected, setSelected] = useState<ClinicAccount | null>(null)
  const [draft, setDraft] = useState<AccountDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [resetUsage, setResetUsage] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError('')
    const { data, error: invokeError } = await supabase.functions.invoke('admin-ops', {
      body: { action: 'clinic_clients' },
    })
    if (invokeError || data?.error) setError('تعذر تحميل حسابات العيادات. تحقق من صلاحية حساب الإدارة ثم أعد المحاولة.')
    else setAccounts(data?.clients || [])
    if (!silent) setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const channel = supabase
      .channel('admin-clinic-accounts-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, () => load(true))
      .subscribe()
    const timer = window.setInterval(() => load(true), 20000)
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') load(true)
    }
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      supabase.removeChannel(channel)
    }
  }, [load])

  const openAccount = (account: ClinicAccount) => {
    if (account.pending_company || !account.company_id) {
      setNotice('الحساب مسجل، ويجري تجهيز سجل العيادة تلقائياً. ستظهر أدوات الإدارة فور اكتمال الربط.')
      return
    }
    setSelected(account)
    setDraft(toDraft(account))
    setResetUsage(false)
    setError('')
    setNotice('')
  }

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return accounts.filter(account => {
      const matchesSearch = !needle || [account.name, account.owner_name, account.owner_email, account.owner_phone, account.city]
        .filter(Boolean).some(value => String(value).toLowerCase().includes(needle))
      const status = account.subscription_status || 'inactive'
      const attention = ['expired', 'suspended', 'warning', 'usage_limited', 'inactive'].includes(status)
        || usagePercent(account) >= 80 || account.subscription_status === 'active' && (!account.subscription_start_date || !account.subscription_end_date)
      const matchesFilter = filter === 'all' || (filter === 'active' && status === 'active')
        || (filter === 'trial' && status === 'trial') || (filter === 'attention' && attention)
      return matchesSearch && matchesFilter
    })
  }, [accounts, filter, search])

  const stats = useMemo(() => ({
    total: accounts.length,
    active: accounts.filter(a => a.subscription_status === 'active').length,
    trials: accounts.filter(a => a.subscription_status === 'trial').length,
    attention: accounts.filter(a => usagePercent(a) >= 80 || !a.subscription_end_date || ['expired', 'suspended', 'inactive'].includes(a.subscription_status || 'inactive')).length,
  }), [accounts])

  const changePlan = (plan: PlanCode) => setDraft(current => current ? ({
    ...current,
    plan_code: plan,
    limits: { ...PLAN_DEFAULTS[plan] },
  }) : current)

  const quickActivate = (days: number) => setDraft(current => {
    if (!current) return current
    const today = isoDate(new Date())
    return {
      ...current,
      subscription_status: 'active',
      subscription_start_date: today,
      subscription_end_date: addDays(today, days),
      cycle_start: today,
      cycle_end: addDays(today, 29),
      payment_provider: 'manual',
      payment_status: 'paid',
    }
  })

  const save = async () => {
    if (!selected || !draft || !selected.company_id) return
    if (draft.subscription_start_date && draft.subscription_end_date && draft.subscription_end_date < draft.subscription_start_date) {
      setError('تاريخ نهاية الاشتراك يجب أن يكون بعد تاريخ البداية.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    const { data, error: invokeError } = await supabase.functions.invoke('admin-ops', {
      body: { action: 'manage_clinic_account', company_id: selected.company_id, changes: { ...draft, reset_usage: resetUsage } },
    })
    if (invokeError || data?.error) {
      setError('تعذر حفظ التغييرات. لم يتم تعديل الحساب.')
    } else {
      setNotice(resetUsage ? 'تم حفظ الحساب وتصفير استخدام الدورة الحالية.' : 'تم حفظ إعدادات الحساب بنجاح.')
      await load()
      const updated = accounts.find(a => a.id === selected.id)
      if (updated) setSelected(updated)
      setResetUsage(false)
    }
    setSaving(false)
  }

  return (
    <div className="page fade-in admin-accounts-page">
      <div className="sec-head admin-accounts-heading">
        <div>
          <div className="sec-title">الحسابات</div>
          <div className="sec-sub">إدارة اشتراكات Clinic OS والباقات والحدود ودورات الاستخدام من مكان واحد</div>
        </div>
        <button className="btn btn-ghost" onClick={() => load()} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''}/> تحديث</button>
      </div>

      <div className="stat-grid admin-account-stats">
        <AccountStat label="إجمالي الحسابات" value={stats.total} icon={UsersRound} tone="blue" />
        <AccountStat label="اشتراكات نشطة" value={stats.active} icon={ShieldCheck} tone="green" />
        <AccountStat label="حسابات تجريبية" value={stats.trials} icon={Clock3} tone="violet" />
        <AccountStat label="تحتاج مراجعة" value={stats.attention} icon={AlertTriangle} tone="amber" />
      </div>

      {error && !selected && <div className="admin-account-alert error"><AlertTriangle size={17}/>{error}</div>}
      {notice && !selected && <div className="admin-account-alert success"><CheckCircle2 size={17}/>{notice}</div>}

      <div className="admin-account-toolbar">
        <label className="admin-account-search"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث باسم العيادة أو البريد أو رقم الجوال..."/></label>
        <div className="pills">
          {([['all', 'الكل'], ['active', 'نشطة'], ['trial', 'تجريبية'], ['attention', 'تحتاج مراجعة']] as const).map(([key, label]) => (
            <button key={key} className={`pill ${filter === key ? 'active' : ''}`} onClick={() => setFilter(key)}>{label}</button>
          ))}
        </div>
      </div>

      <div className="card admin-account-table-wrap">
        <table className="tbl admin-account-table">
          <thead><tr><th>الحساب</th><th>الباقة</th><th>الحالة</th><th>مدة الاشتراك</th><th>الاستخدام</th><th>الدفع</th><th></th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7}><div className="admin-account-empty"><Loader2 className="spin"/> جاري تحميل الحسابات</div></td></tr> :
              filtered.length === 0 ? <tr><td colSpan={7}><div className="admin-account-empty">لا توجد حسابات مطابقة</div></td></tr> :
              filtered.map(account => {
                const status = account.subscription_status || 'inactive'
                const usage = usagePercent(account)
                const days = daysRemaining(account.subscription_end_date)
                const missingDates = status === 'active' && (!account.subscription_start_date || !account.subscription_end_date)
                return <tr key={account.id} onClick={() => openAccount(account)}>
                  <td><div className="admin-account-identity"><span>{account.name?.[0] || 'ع'}</span><div><strong>{account.name}</strong><small>{account.owner_email || account.owner_phone || 'لا توجد بيانات تواصل'}</small></div></div></td>
                  <td><strong>{planLabel[account.clinic_plan_code || 'whatsapp']}</strong><small className="admin-account-cell-note">{account.clinic_plan_code === 'ai_pro' ? 'الصوت + واتساب' : 'واتساب فقط'}</small></td>
                  <td><span className={`badge ${account.pending_company ? 'amber' : statusTone[status]}`}>{account.pending_company ? 'جاري تجهيز الحساب' : statusLabel[status]}</span>{!account.pending_company && missingDates && <small className="admin-account-warning">التواريخ ناقصة</small>}<small className={`admin-account-cell-note ${account.email_confirmed_at ? '' : 'admin-account-warning'}`}>{account.email_confirmed_at ? 'البريد مؤكد' : 'بانتظار تأكيد البريد'}</small></td>
                  <td>{account.subscription_end_date ? <><strong>{days !== null && days >= 0 ? `${days} يوم` : 'منتهي'}</strong><small className="admin-account-cell-note">حتى {account.subscription_end_date}</small></> : <span className="admin-account-warning">غير محددة</span>}</td>
                  <td><div className="admin-account-usage"><div><span>{usage}%</span><small>{usage >= 80 ? 'قريب من الحد' : 'ضمن الحدود'}</small></div><div className="prog"><div className="prog-fill" style={{ width: `${Math.min(100, usage)}%`, background: usage >= 100 ? 'var(--red)' : usage >= 80 ? 'var(--amber)' : 'var(--green)' }}/></div></div></td>
                  <td><span className={`badge ${account.last_payment_status === 'paid' ? 'green' : 'gray'}`}>{account.last_payment_status === 'paid' ? 'مدفوع' : 'يدوي / معلق'}</span></td>
                  <td><button className="admin-account-open" onClick={event => { event.stopPropagation(); openAccount(account) }}>{account.pending_company ? 'قيد التجهيز' : 'إدارة'} {!account.pending_company && <ChevronLeft size={15}/>}</button></td>
                </tr>
              })}
          </tbody>
        </table>
      </div>

      {selected && draft && <AccountDrawer account={selected} draft={draft} setDraft={setDraft} onPlanChange={changePlan} onQuickActivate={quickActivate} onClose={() => setSelected(null)} onSave={save} saving={saving} error={error} notice={notice} resetUsage={resetUsage} setResetUsage={setResetUsage}/>} 
    </div>
  )
}

function AccountStat({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof UsersRound; tone: string }) {
  return <div className="stat admin-account-stat"><div className={`admin-account-stat-icon ${tone}`}><Icon size={19}/></div><div><div className="stat-label">{label}</div><div className="stat-value num">{value}</div></div></div>
}

function AccountDrawer({ account, draft, setDraft, onPlanChange, onQuickActivate, onClose, onSave, saving, error, notice, resetUsage, setResetUsage }: {
  account: ClinicAccount; draft: AccountDraft; setDraft: Dispatch<SetStateAction<AccountDraft | null>>
  onPlanChange: (plan: PlanCode) => void; onQuickActivate: (days: number) => void; onClose: () => void; onSave: () => void
  saving: boolean; error: string; notice: string; resetUsage: boolean; setResetUsage: (value: boolean) => void
}) {
  const patch = (next: Partial<AccountDraft>) => setDraft(current => current ? { ...current, ...next } : current)
  const patchGroup = (group: 'limits' | 'extras', key: keyof AccountDraft['limits'], value: string) => setDraft(current => current ? ({ ...current, [group]: { ...current[group], [key]: numberValue(value) } }) : current)
  const status = account.subscription_status || 'inactive'
  return <div className="admin-account-drawer-scrim" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <aside className="admin-account-drawer">
      <header><div className="admin-account-identity large"><span>{account.name?.[0] || 'ع'}</span><div><strong>{account.name}</strong><small>{account.owner_email}</small></div></div><button className="tb-icon-btn" onClick={onClose} aria-label="إغلاق"><X size={18}/></button></header>
      <div className="admin-account-drawer-body">
        <div className="admin-account-summary">
          <div><small>الحالة الحالية</small><span className={`badge ${statusTone[status]}`}>{statusLabel[status]}</span></div>
          <div><small>صاحب الحساب</small><strong>{account.owner_name || 'غير محدد'}</strong></div>
          <div><small>رقم الجوال</small><strong dir="ltr">{account.owner_phone || 'غير محدد'}</strong></div>
          <div><small>تاريخ الإنشاء</small><strong>{account.created_at.slice(0, 10)}</strong></div>
        </div>

        <section className="admin-account-panel"><div className="admin-account-panel-title"><Sparkles size={17}/><div><strong>الباقة والحالة</strong><small>الترقية أو التخفيض تطبق الحدود الأساسية تلقائيًا</small></div></div>
          <div className="admin-account-plan-picker">
            {(['whatsapp', 'ai_pro'] as PlanCode[]).map(plan => <button key={plan} className={draft.plan_code === plan ? 'active' : ''} onClick={() => onPlanChange(plan)}><span>{plan === 'whatsapp' ? 'WhatsApp AI' : 'AI Pro'}</span><small>{plan === 'whatsapp' ? '15,000 ر.س / سنة' : '27,000 ر.س / سنة'}</small></button>)}
          </div>
          <div className="admin-account-form-grid">
            <Field label="حالة الاشتراك"><select value={draft.subscription_status} onChange={e => patch({ subscription_status: e.target.value as AccountStatus })}><option value="active">نشط</option><option value="trial">تجريبي</option><option value="inactive">غير مشترك</option><option value="suspended">موقوف</option><option value="expired">منتهي</option></select></Field>
            <Field label="حالة الدفع"><select value={draft.payment_status} onChange={e => patch({ payment_status: e.target.value })}><option value="paid">مدفوع</option><option value="pending">معلق</option><option value="failed">فشل</option><option value="refunded">مسترجع</option></select></Field>
          </div>
          <div className="admin-account-quick-actions"><button onClick={() => onQuickActivate(365)}><CheckCircle2 size={15}/> تفعيل سنة</button><button onClick={() => onQuickActivate(30)}><CalendarDays size={15}/> تفعيل 30 يوم</button><button className="danger" onClick={() => patch({ subscription_status: 'suspended' })}><Ban size={15}/> إيقاف الحساب</button></div>
        </section>

        <section className="admin-account-panel"><div className="admin-account-panel-title"><CalendarDays size={17}/><div><strong>تواريخ الاشتراك والدورة</strong><small>تتحكم في الصلاحية ومتى يبدأ عدّ الاستخدام من جديد</small></div></div>
          <div className="admin-account-form-grid"><Field label="بداية الاشتراك"><input type="date" value={draft.subscription_start_date} onChange={e => patch({ subscription_start_date: e.target.value })}/></Field><Field label="نهاية الاشتراك"><input type="date" value={draft.subscription_end_date} onChange={e => patch({ subscription_end_date: e.target.value })}/></Field><Field label="بداية دورة الاستخدام"><input type="date" value={draft.cycle_start} onChange={e => patch({ cycle_start: e.target.value })}/></Field><Field label="نهاية دورة الاستخدام"><input type="date" value={draft.cycle_end} onChange={e => patch({ cycle_end: e.target.value })}/></Field></div>
        </section>

        <section className="admin-account-panel"><div className="admin-account-panel-title"><SlidersHorizontal size={17}/><div><strong>حدود الاستخدام</strong><small>الحد الأساسي لكل دورة شهرية</small></div></div>
          <div className="admin-account-form-grid compact"><NumberField label="محادثات واتساب" value={draft.limits.whatsapp} onChange={v => patchGroup('limits', 'whatsapp', v)}/><NumberField label="رسائل الذكاء" value={draft.limits.ai_messages} onChange={v => patchGroup('limits', 'ai_messages', v)}/><NumberField label="دقائق المكالمات" value={draft.limits.smart_calls} onChange={v => patchGroup('limits', 'smart_calls', v)}/><NumberField label="تذكيرات المواعيد" value={draft.limits.reminders} onChange={v => patchGroup('limits', 'reminders', v)}/></div>
        </section>

        <section className="admin-account-panel"><div className="admin-account-panel-title"><CircleDollarSign size={17}/><div><strong>رصيد إضافي مؤقت</strong><small>أضف سعة استثنائية دون تغيير الباقة</small></div></div>
          <div className="admin-account-form-grid compact"><NumberField label="واتساب إضافي" value={draft.extras.whatsapp} onChange={v => patchGroup('extras', 'whatsapp', v)}/><NumberField label="رسائل AI إضافية" value={draft.extras.ai_messages} onChange={v => patchGroup('extras', 'ai_messages', v)}/><NumberField label="دقائق إضافية" value={draft.extras.smart_calls} onChange={v => patchGroup('extras', 'smart_calls', v)}/><NumberField label="تذكيرات إضافية" value={draft.extras.reminders} onChange={v => patchGroup('extras', 'reminders', v)}/><Field label="انتهاء الرصيد الإضافي"><input type="date" value={draft.extra_limits_expire_at} onChange={e => patch({ extra_limits_expire_at: e.target.value })}/></Field></div>
        </section>

        <section className="admin-account-panel admin-account-reset"><div><RotateCcw size={17}/><span><strong>تصفير استخدام الدورة الحالية</strong><small>استخدمه عند بداية دورة جديدة أو بعد تصحيح خطأ في العدّ.</small></span></div><label><input type="checkbox" checked={resetUsage} onChange={e => setResetUsage(e.target.checked)}/><span/></label></section>

        <Field label="ملاحظة إدارية"><textarea rows={3} value={draft.note} onChange={e => patch({ note: e.target.value })} placeholder="مثال: تم تفعيل الباقة بعد استلام التحويل البنكي"/></Field>

        {account.audit && account.audit.length > 0 && <section className="admin-account-panel"><div className="admin-account-panel-title"><Activity size={17}/><div><strong>آخر التغييرات</strong><small>سجل تدقيق غير قابل للتعديل</small></div></div><div className="admin-account-audit">{account.audit.slice(0, 6).map(row => <div key={row.id}><span/><div><strong>{row.note || row.action}</strong><small>{new Date(row.created_at).toLocaleString('ar-SA')}</small></div></div>)}</div></section>}
        {error && <div className="admin-account-alert error"><AlertTriangle size={16}/>{error}</div>}
        {notice && <div className="admin-account-alert success"><CheckCircle2 size={16}/>{notice}</div>}
      </div>
      <footer><button className="btn btn-ghost" onClick={onClose}>إلغاء</button><button className="btn btn-primary" onClick={onSave} disabled={saving}>{saving ? <><Loader2 className="spin" size={16}/> جاري الحفظ</> : 'حفظ التغييرات'}</button></footer>
    </aside>
  </div>
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="admin-account-field"><span>{label}</span>{children}</label> }
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: string) => void }) { return <Field label={label}><input type="number" min="0" value={value} onChange={e => onChange(e.target.value)}/></Field> }
