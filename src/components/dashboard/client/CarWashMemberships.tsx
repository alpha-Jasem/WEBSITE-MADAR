import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, CreditCard, ExternalLink, Loader2, Lock, Plus, QrCode, RefreshCw, Save, Smartphone, Users, WalletCards } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { usePlanGate } from '../../../hooks/usePlanGate'
import { getSelfCheckinUrl } from '../../../lib/selfCheckin'
import { ClientInsightPanel } from './ClientUI'

type Customer = {
  id: string
  name: string | null
  phone: string
  total_visits: number
  wallet_balance?: number | null
  membership_status?: string | null
  membership_plan_id?: string | null
}

type MembershipPlan = {
  id: string
  company_id: string
  name: string
  price: number
  washes_per_month: number
  billing_cycle: string
  active: boolean
  created_at: string
}

type CustomerMembership = {
  id: string
  company_id: string
  customer_id: string
  plan_id: string | null
  status: 'active' | 'paused' | 'cancelled' | 'expired'
  starts_at: string
  ends_at: string | null
  remaining_washes: number
  auto_renew: boolean
}

type WalletTransaction = {
  id: string
  customer_id: string
  amount: number
  type: 'charge' | 'debit' | 'refund' | 'adjustment'
  note: string | null
  created_at: string
}

function money(value: number) {
  return value.toLocaleString('ar-SA', { maximumFractionDigits: 0 })
}

function phoneLabel(phone: string) {
  const p = phone.replace(/\D/g, '')
  if (p.startsWith('966') && p.length === 12) return `0${p.slice(3, 6)} ${p.slice(6, 9)} ${p.slice(9)}`
  return phone
}

function addDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

export function CarWashMemberships() {
  const { companyId, company, loading: authLoading } = useClientCompany()
  const { can } = usePlanGate()
  const featureEnabled = can.memberships || can.wallet || can.onlinePayments

  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [memberships, setMemberships] = useState<CustomerMembership[]>([])
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')

  const [planForm, setPlanForm] = useState({ name: 'اشتراك 4 غسلات', price: '99', washes: '4' })
  const [membershipForm, setMembershipForm] = useState({ customerId: '', planId: '' })
  const [walletForm, setWalletForm] = useState({ customerId: '', amount: '', note: '' })

  const load = async () => {
    if (!companyId) return
    setLoading(true)
    const [{ data: planRows }, { data: customerRows }, { data: membershipRows }, { data: walletRows }] = await Promise.all([
      supabase.from('cw_membership_plans').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
      supabase.from('cw_customers').select('id, name, phone, total_visits, wallet_balance, membership_status, membership_plan_id').eq('company_id', companyId).order('last_visit_at', { ascending: false }).limit(300),
      supabase.from('cw_customer_memberships').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(300),
      supabase.from('cw_wallet_transactions').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(50),
    ])
    setPlans((planRows || []) as MembershipPlan[])
    setCustomers((customerRows || []) as Customer[])
    setMemberships((membershipRows || []) as CustomerMembership[])
    setTransactions((walletRows || []) as WalletTransaction[])
    setLoading(false)
  }

  useEffect(() => {
    if (authLoading || !companyId) return
    load()
  }, [authLoading, companyId])

  const customerMap = useMemo(() => new Map(customers.map(customer => [customer.id, customer])), [customers])
  const planMap = useMemo(() => new Map(plans.map(plan => [plan.id, plan])), [plans])
  const uniquePlans = useMemo(() => {
    const seen = new Set<string>()
    return plans.filter(plan => {
      const key = `${plan.name.trim()}-${Number(plan.price)}-${Number(plan.washes_per_month)}-${plan.active}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [plans])
  const activeMemberships = useMemo(() => {
    const seen = new Set<string>()
    return memberships.filter(item => {
      if (item.status !== 'active') return false
      if (seen.has(item.customer_id)) return false
      seen.add(item.customer_id)
      return true
    })
  }, [memberships])
  const walletBalance = customers.reduce((sum, customer) => sum + Number(customer.wallet_balance || 0), 0)
  const recurringRevenue = activeMemberships.reduce((sum, item) => sum + Number(planMap.get(item.plan_id || '')?.price || 0), 0)
  const activePlans = uniquePlans.filter(plan => plan.active)
  const checkinUrl = getSelfCheckinUrl(company as any)
  const previewUrl = checkinUrl ? `${checkinUrl}?preview=memberships` : ''
  const journey = [
    { label: 'الأدمن فعّل الميزة', done: featureEnabled, icon: CheckCircle2 },
    { label: 'باقات شهرية جاهزة', done: activePlans.length > 0, icon: WalletCards },
    { label: 'QR يعرض الباقات للعميل', done: can.memberships && Boolean(checkinUrl) && activePlans.length > 0, icon: QrCode },
    { label: 'خصم من الاشتراك عند التسليم', done: can.memberships, icon: Save },
    { label: 'المحفظة متاحة كطريقة دفع', done: can.wallet, icon: CreditCard },
    { label: 'الدفع الإلكتروني', done: false, optional: true, icon: Smartphone },
  ]
  const displayJourney = journey.map(item =>
    item.icon === Smartphone
      ? { ...item, label: 'الدفع الإلكتروني', done: false, optional: true }
      : item
  )
  const coreJourney = displayJourney.filter(item => !item.optional)
  const journeyScore = Math.round((coreJourney.filter(item => item.done).length / coreJourney.length) * 100)
  const membershipInsights = [
    activePlans.length > 0
      ? { title: 'الباقات جاهزة للبيع', description: `${activePlans.length} باقة فعالة. الأفضل عرضها في QR بعد تسجيل الخدمة مباشرة.`, tone: 'green' as const }
      : { title: 'أنشئ أول باقة شهرية', description: 'ابدأ بباقة 4 غسلات وباقة 8 غسلات لتجربة تسعير بسيطة وسهلة البيع.', tone: 'amber' as const },
    activeMemberships.length > 0
      ? { title: 'إيراد متكرر بدأ', description: `${activeMemberships.length} مشترك نشط بإيراد شهري متوقع ${money(recurringRevenue)} ر.س.`, tone: 'blue' as const }
      : { title: 'حوّل العملاء المتكررين', description: 'أفضل عميل للبيع هو من زار أكثر من مرتين. اعرض عليه اشتراك شهري عند التسليم.', tone: 'blue' as const },
    can.wallet
      ? { title: 'المحفظة مفعلة', description: `إجمالي أرصدة المحافظ ${money(walletBalance)} ر.س. راقبها كالتزام مالي على المغسلة.`, tone: 'green' as const }
      : { title: 'المحفظة اختيارية من الأدمن', description: 'إذا لا تريدها لبعض المغاسل، اتركها مقفلة واجعل الدفع كاش/POS فقط.', tone: 'slate' as const },
    can.onlinePayments
      ? { title: 'الدفع الإلكتروني تحت التجهيز', description: 'الميزة مفعلة إدارياً، لكن البيع الإلكتروني من جوال العميل يبدأ بعد ربط Moyasar/Apple Pay فعلياً.', tone: 'amber' as const }
      : { title: 'الدفع الإلكتروني ينتظر الربط', description: 'إلى أن يكتمل Moyasar/Apple Pay، خليه خيار مدفوع يتم تفعيله من الأدمن.', tone: 'amber' as const },
  ]

  const createPlan = async () => {
    if (!companyId || !planForm.name.trim()) return
    const duplicate = activePlans.some(plan =>
      plan.name.trim() === planForm.name.trim()
      && Number(plan.price) === Number(planForm.price || 0)
      && Number(plan.washes_per_month) === Number(planForm.washes || 0)
    )
    if (duplicate) {
      setFeedback('هذه الباقة موجودة مسبقاً بنفس السعر وعدد الغسلات.')
      return
    }
    setSaving(true)
    setFeedback('')
    const { error } = await supabase.from('cw_membership_plans').insert({
      company_id: companyId,
      name: planForm.name.trim(),
      price: Number(planForm.price || 0),
      washes_per_month: Number(planForm.washes || 0),
      billing_cycle: 'monthly',
      active: true,
    })
    setSaving(false)
    setFeedback(error ? 'تعذر إنشاء الباقة' : 'تم إنشاء باقة الاشتراك')
    if (!error) load()
  }

  const activateMembership = async () => {
    if (!companyId || !membershipForm.customerId || !membershipForm.planId) return
    const alreadyActive = activeMemberships.some(item => item.customer_id === membershipForm.customerId)
    if (alreadyActive) {
      setFeedback('هذا العميل لديه اشتراك نشط حالياً. لا يمكن تفعيل اشتراك ثاني حتى لا يتم احتسابه مرتين.')
      return
    }
    const plan = planMap.get(membershipForm.planId)
    if (!plan) return
    setSaving(true)
    setFeedback('')

    const { error } = await supabase.from('cw_customer_memberships').insert({
      company_id: companyId,
      customer_id: membershipForm.customerId,
      plan_id: plan.id,
      status: 'active',
      starts_at: new Date().toISOString(),
      ends_at: addDays(30),
      remaining_washes: plan.washes_per_month,
      auto_renew: false,
    })

    if (!error) {
      await supabase.from('cw_customers').update({
        membership_status: 'active',
        membership_plan_id: plan.id,
      } as any).eq('id', membershipForm.customerId)
    }

    setSaving(false)
    setFeedback(error ? 'تعذر تفعيل الاشتراك' : 'تم تفعيل اشتراك العميل')
    if (!error) load()
  }

  const chargeWallet = async () => {
    if (!companyId || !walletForm.customerId || !walletForm.amount) return
    const amount = Number(walletForm.amount)
    if (!amount) return
    const customer = customerMap.get(walletForm.customerId)
    setSaving(true)
    setFeedback('')

    const { error } = await supabase.from('cw_wallet_transactions').insert({
      company_id: companyId,
      customer_id: walletForm.customerId,
      amount,
      type: amount >= 0 ? 'charge' : 'debit',
      note: walletForm.note.trim() || null,
    })

    if (!error) {
      await supabase.from('cw_customers').update({
        wallet_balance: Number(customer?.wallet_balance || 0) + amount,
      } as any).eq('id', walletForm.customerId)
    }

    setSaving(false)
    setFeedback(error ? 'تعذر تحديث المحفظة' : 'تم تحديث رصيد المحفظة')
    if (!error) {
      setWalletForm({ customerId: walletForm.customerId, amount: '', note: '' })
      load()
    }
  }

  if (authLoading || loading) {
    return (
      <div className="madar-center-state">
        <Loader2 size={20} className="animate-spin" />
        <span>جاري تحميل الاشتراكات...</span>
      </div>
    )
  }

  if (!featureEnabled) {
    return (
      <div dir="rtl" className="mx-auto flex min-h-[58vh] max-w-3xl items-center justify-center">
        <section className="w-full rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-slate-50 text-slate-500">
            <Lock size={27} />
          </div>
          <p className="text-sm font-bold text-slate-500 font-tajawal">ميزة اختيارية غير مفعلة</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950 font-cairo">الاشتراكات والمحفظة تحت تحكم الإدارة</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500 font-tajawal">
            هذه الصفحة تظهر فقط للمغاسل التي فعل لها الأدمن ميزات الاشتراكات الشهرية أو المحفظة الرقمية أو الدفع الإلكتروني.
          </p>
        </section>
      </div>
    )
  }

  return (
    <div dir="rtl" className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="text-xs font-bold text-sky-600 font-tajawal">مركز الدخل المتكرر</span>
            <h1 className="mt-1 text-2xl font-black text-slate-950 font-cairo">اشتراكات ومحافظ العملاء</h1>
            <p className="mt-1 text-sm leading-6 text-slate-500 font-tajawal">
              فعل باقات غسيل شهرية أو اشحن محفظة العميل. الميزة اختيارية وتتحكم فيها الإدارة لكل مغسلة.
            </p>
          </div>
          <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 font-tajawal">
            <RefreshCw size={15} />
            تحديث
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Stat icon={Users} label="مشتركون نشطون" value={activeMemberships.length.toLocaleString('en-US')} color="#4F6EF7" />
        <Stat icon={CreditCard} label="دخل شهري متوقع" value={`${money(recurringRevenue)} ر.س`} color="#10B981" />
        <Stat icon={WalletCards} label="أرصدة المحافظ" value={`${money(walletBalance)} ر.س`} color="#F59E0B" />
        <Stat icon={CheckCircle2} label="باقات فعالة" value={activePlans.length.toLocaleString('en-US')} color="#0EA5E9" />
      </section>

      <ClientInsightPanel
        title="فرص الاشتراك والمحفظة"
        description="الهدف هنا أن تكون الميزة قابلة للبيع كإضافة اختيارية للمغسلة، وليست عبئاً على كل عميل."
        items={membershipInsights}
      />

      <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-600 font-tajawal">رحلة العميل من الجوال</span>
            <h2 className="mt-1 text-lg font-black text-slate-950 font-cairo">جاهزية بيع الاشتراك من QR</h2>
            <p className="mt-1 text-xs leading-6 text-slate-500 font-tajawal">
              هذه الخريطة توضح ماذا يرى العميل وماذا يحدث داخل لوحة التشغيل. الدفع النهائي ينتظر ربط Moyasar/Apple Pay.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[190px] rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-emerald-700 font-tajawal">جاهزية الرحلة</span>
                <strong className="font-sora text-lg font-black text-emerald-700">{journeyScore}%</strong>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${journeyScore}%` }} />
              </div>
            </div>
            {previewUrl && (
              <a href={previewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-100 bg-sky-50 px-4 py-2 text-sm font-bold text-sky-700 font-cairo">
                <ExternalLink size={15} />
                معاينة العميل
              </a>
            )}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {displayJourney.map(item => (
            <article key={item.label} className={`rounded-2xl border p-4 ${item.done ? 'border-emerald-100 bg-emerald-50/60' : 'border-slate-200 bg-slate-50'}`}>
              <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-500'}`}>
                <item.icon size={18} />
              </div>
              <strong className="block text-sm leading-6 text-slate-950 font-cairo">{item.label}</strong>
              <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[11px] font-bold font-tajawal ${item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-500'}`}>
                {item.done ? 'جاهز' : item.optional ? 'لاحقاً' : 'ينتظر'}
              </span>
            </article>
          ))}
        </div>
      </section>

      {feedback && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 font-tajawal">{feedback}</div>}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
        {can.memberships && (
          <Panel title="باقات الاشتراك الشهرية" desc="أنشئ باقات مثل 4 غسلات أو 8 غسلات شهريا.">
            <div className="grid gap-3 md:grid-cols-[1.2fr_0.7fr_0.7fr_auto]">
              <Input label="اسم الباقة" value={planForm.name} onChange={value => setPlanForm(current => ({ ...current, name: value }))} />
              <Input label="السعر" value={planForm.price} onChange={value => setPlanForm(current => ({ ...current, price: value }))} dir="ltr" />
              <Input label="الغسلات/شهر" value={planForm.washes} onChange={value => setPlanForm(current => ({ ...current, washes: value }))} dir="ltr" />
              <button disabled={saving} onClick={createPlan} className="mt-auto inline-flex h-[43px] items-center justify-center gap-2 rounded-xl bg-[#0D1B3E] px-4 text-sm font-bold text-white font-cairo disabled:opacity-50">
                <Plus size={15} />
                إضافة
              </button>
            </div>
            <div className="mt-5 space-y-2">
              {uniquePlans.length === 0 ? <Empty text="لا توجد باقات بعد" /> : uniquePlans.map(plan => (
                <div key={plan.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div>
                    <strong className="text-sm text-slate-950 font-cairo">{plan.name}</strong>
                    <p className="text-xs text-slate-500 font-tajawal">{plan.washes_per_month} غسلات / شهر</p>
                  </div>
                  <span className="font-sora text-lg font-black text-slate-950">{money(Number(plan.price))} <small className="text-xs text-slate-400">ر.س</small></span>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {can.memberships && (
          <Panel title="تفعيل اشتراك لعميل" desc="اربط العميل بخطة شهرية يدوياً الآن. الدفع الإلكتروني من جوال العميل يبدأ بعد ربط مزود الدفع.">
            <Select label="العميل" value={membershipForm.customerId} onChange={value => setMembershipForm(current => ({ ...current, customerId: value }))}>
              <option value="">اختر العميل</option>
              {customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name || phoneLabel(customer.phone)} - {phoneLabel(customer.phone)}</option>)}
            </Select>
            <Select label="الباقة" value={membershipForm.planId} onChange={value => setMembershipForm(current => ({ ...current, planId: value }))}>
              <option value="">اختر الباقة</option>
              {activePlans.map(plan => <option key={plan.id} value={plan.id}>{plan.name} - {money(Number(plan.price))} ر.س</option>)}
            </Select>
            <button disabled={saving || !membershipForm.customerId || !membershipForm.planId} onClick={activateMembership} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1565C0] px-4 py-3 text-sm font-bold text-white font-cairo disabled:opacity-50">
              <Save size={15} />
              تفعيل الاشتراك
            </button>
          </Panel>
        )}

        {can.wallet && (
          <Panel title="المحفظة الرقمية" desc="اشحن رصيد العميل أو اخصم منه يدويا الآن. الدفع الآلي لاحقا عبر Moyasar.">
            <Select label="العميل" value={walletForm.customerId} onChange={value => setWalletForm(current => ({ ...current, customerId: value }))}>
              <option value="">اختر العميل</option>
              {customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name || phoneLabel(customer.phone)} - رصيد {money(Number(customer.wallet_balance || 0))} ر.س</option>)}
            </Select>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input label="المبلغ" value={walletForm.amount} onChange={value => setWalletForm(current => ({ ...current, amount: value }))} dir="ltr" />
              <Input label="ملاحظة" value={walletForm.note} onChange={value => setWalletForm(current => ({ ...current, note: value }))} />
            </div>
            <button disabled={saving || !walletForm.customerId || !walletForm.amount} onClick={chargeWallet} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white font-cairo disabled:opacity-50">
              <WalletCards size={15} />
              تحديث الرصيد
            </button>
          </Panel>
        )}

        <Panel title="المشتركون الحاليون" desc="متابعة الاشتراكات النشطة وعدد الغسلات المتبقية.">
          <div className="space-y-2">
            {activeMemberships.length === 0 ? <Empty text="لا توجد اشتراكات مفعلة بعد" /> : activeMemberships.slice(0, 8).map(item => {
              const customer = customerMap.get(item.customer_id)
              const plan = planMap.get(item.plan_id || '')
              return (
                <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-sm text-slate-950 font-cairo">{customer?.name || phoneLabel(customer?.phone || '')}</strong>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 font-tajawal">نشط</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 font-tajawal">{plan?.name || 'باقة محذوفة'} - متبقي {item.remaining_washes} غسلات</p>
                </div>
              )
            })}
          </div>
        </Panel>

        {can.wallet && (
          <Panel title="آخر حركات المحفظة" desc="شحن، خصم، أو تعديل رصيد.">
            <div className="space-y-2">
              {transactions.length === 0 ? <Empty text="لا توجد حركات محفظة" /> : transactions.slice(0, 8).map(tx => {
                const customer = customerMap.get(tx.customer_id)
                return (
                  <div key={tx.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div>
                      <strong className="text-sm text-slate-950 font-cairo">{customer?.name || phoneLabel(customer?.phone || '')}</strong>
                      <p className="text-xs text-slate-500 font-tajawal">{tx.note || tx.type}</p>
                    </div>
                    <span className={`font-sora text-sm font-black ${Number(tx.amount) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{money(Number(tx.amount))} ر.س</span>
                  </div>
                )
              })}
            </div>
          </Panel>
        )}
      </section>

      {can.onlinePayments && (
        <section className="rounded-[24px] border border-blue-100 bg-blue-50 p-5">
          <p className="text-sm font-bold text-blue-800 font-cairo">الدفع الإلكتروني تحت التجهيز</p>
          <p className="mt-1 text-xs leading-6 text-blue-700/80 font-tajawal">
            المرحلة الحالية تجهز الاشتراكات والمحفظة داخل لوحة المغسلة. لا يظهر الدفع الإلكتروني للعميل كخيار نهائي إلا بعد ربط Moyasar وApple Pay / Google Pay.
          </p>
        </section>
      )}
    </div>
  )
}

function Stat({ icon: Icon, label, value, color }: { icon: typeof Users; label: string; value: string; color: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-slate-500 font-tajawal">{label}</span>
        <i className="grid h-9 w-9 place-items-center rounded-xl" style={{ color, background: `${color}14` }}><Icon size={17} /></i>
      </div>
      <strong className="font-sora text-2xl font-black text-slate-950">{value}</strong>
    </article>
  )
}

function Panel({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-base font-black text-slate-950 font-cairo">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500 font-tajawal">{desc}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Input({ label, value, onChange, dir = 'rtl' }: { label: string; value: string; onChange: (value: string) => void; dir?: 'rtl' | 'ltr' }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-500 font-tajawal">{label}</span>
      <input value={value} onChange={event => onChange(event.target.value)} dir={dir} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-sky-400 focus:bg-white font-tajawal" />
    </label>
  )
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-500 font-tajawal">{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-sky-400 focus:bg-white font-tajawal">
        {children}
      </select>
    </label>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 font-tajawal">{text}</div>
}
