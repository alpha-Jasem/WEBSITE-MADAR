import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, CreditCard, ExternalLink, Loader2, Lock, Plus, QrCode, RefreshCw, Save, Users, WalletCards } from 'lucide-react'
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
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [memberships, setMemberships] = useState<CustomerMembership[]>([])
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')

  const [planForm, setPlanForm] = useState({ name: 'ط§ط´طھط±ط§ظƒ 4 ط؛ط³ظ„ط§طھ', price: '99', washes: '4' })
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
    { label: 'ط§ظ„ط£ط¯ظ…ظ† ظپط¹ظ‘ظ„ ط§ظ„ظ…ظٹط²ط©', done: featureEnabled, icon: CheckCircle2 },
    { label: 'ط¨ط§ظ‚ط§طھ ط´ظ‡ط±ظٹط© ط¬ط§ظ‡ط²ط©', done: activePlans.length > 0, icon: WalletCards },
    { label: 'QR ظٹط¹ط±ط¶ ط§ظ„ط¨ط§ظ‚ط§طھ ظ„ظ„ط¹ظ…ظٹظ„', done: can.memberships && Boolean(checkinUrl) && activePlans.length > 0, icon: QrCode },
    { label: 'ط®طµظ… ظ…ظ† ط§ظ„ط§ط´طھط±ط§ظƒ ط¹ظ†ط¯ ط§ظ„طھط³ظ„ظٹظ…', done: can.memberships, icon: Save },
    { label: 'ط§ظ„ظ…ط­ظپط¸ط© ظ…طھط§ط­ط© ظƒط·ط±ظٹظ‚ط© ط¯ظپط¹', done: can.wallet, icon: CreditCard },
  ]
  const displayJourney = journey
  const coreJourney = displayJourney.filter(item => !item.optional)
  const journeyScore = Math.round((coreJourney.filter(item => item.done).length / coreJourney.length) * 100)
  const membershipInsights = [
    activePlans.length > 0
      ? { title: 'ط§ظ„ط¨ط§ظ‚ط§طھ ط¬ط§ظ‡ط²ط© ظ„ظ„ط¨ظٹط¹', description: `${activePlans.length} ط¨ط§ظ‚ط© ظپط¹ط§ظ„ط©. ط§ظ„ط£ظپط¶ظ„ ط¹ط±ط¶ظ‡ط§ ظپظٹ QR ط¨ط¹ط¯ طھط³ط¬ظٹظ„ ط§ظ„ط®ط¯ظ…ط© ظ…ط¨ط§ط´ط±ط©.`, tone: 'green' as const }
      : { title: 'ط£ظ†ط´ط¦ ط£ظˆظ„ ط¨ط§ظ‚ط© ط´ظ‡ط±ظٹط©', description: 'ط§ط¨ط¯ط£ ط¨ط¨ط§ظ‚ط© 4 ط؛ط³ظ„ط§طھ ظˆط¨ط§ظ‚ط© 8 ط؛ط³ظ„ط§طھ ظ„طھط¬ط±ط¨ط© طھط³ط¹ظٹط± ط¨ط³ظٹط·ط© ظˆط³ظ‡ظ„ط© ط§ظ„ط¨ظٹط¹.', tone: 'amber' as const },
    activeMemberships.length > 0
      ? { title: 'ط¥ظٹط±ط§ط¯ ظ…طھظƒط±ط± ط¨ط¯ط£', description: `${activeMemberships.length} ظ…ط´طھط±ظƒ ظ†ط´ط· ط¨ط¥ظٹط±ط§ط¯ ط´ظ‡ط±ظٹ ظ…طھظˆظ‚ط¹ ${money(recurringRevenue)} ط±.ط³.`, tone: 'blue' as const }
      : { title: 'ط­ظˆظ‘ظ„ ط§ظ„ط¹ظ…ظ„ط§ط، ط§ظ„ظ…طھظƒط±ط±ظٹظ†', description: 'ط£ظپط¶ظ„ ط¹ظ…ظٹظ„ ظ„ظ„ط¨ظٹط¹ ظ‡ظˆ ظ…ظ† ط²ط§ط± ط£ظƒط«ط± ظ…ظ† ظ…ط±طھظٹظ†. ط§ط¹ط±ط¶ ط¹ظ„ظٹظ‡ ط§ط´طھط±ط§ظƒ ط´ظ‡ط±ظٹ ط¹ظ†ط¯ ط§ظ„طھط³ظ„ظٹظ….', tone: 'blue' as const },
    can.wallet
      ? { title: 'ط§ظ„ظ…ط­ظپط¸ط© ظ…ظپط¹ظ„ط©', description: `ط¥ط¬ظ…ط§ظ„ظٹ ط£ط±طµط¯ط© ط§ظ„ظ…ط­ط§ظپط¸ ${money(walletBalance)} ط±.ط³. ط±ط§ظ‚ط¨ظ‡ط§ ظƒط§ظ„طھط²ط§ظ… ظ…ط§ظ„ظٹ ط¹ظ„ظ‰ ط§ظ„ظ…ط؛ط³ظ„ط©.`, tone: 'green' as const }
      : { title: 'ط§ظ„ظ…ط­ظپط¸ط© ط§ط®طھظٹط§ط±ظٹط© ظ…ظ† ط§ظ„ط£ط¯ظ…ظ†', description: 'ط¥ط°ط§ ظ„ط§ طھط±ظٹط¯ظ‡ط§ ظ„ط¨ط¹ط¶ ط§ظ„ظ…ط؛ط§ط³ظ„طŒ ط§طھط±ظƒظ‡ط§ ظ…ظ‚ظپظ„ط© ظˆط§ط¬ط¹ظ„ ط§ظ„ط¯ظپط¹ ظƒط§ط´/POS ظپظ‚ط·.', tone: 'slate' as const },
  ]

  const createPlan = async () => {
    if (!companyId || !planForm.name.trim()) return
    const duplicate = activePlans.some(plan =>
      plan.name.trim() === planForm.name.trim()
      && Number(plan.price) === Number(planForm.price || 0)
      && Number(plan.washes_per_month) === Number(planForm.washes || 0)
    )
    if (duplicate) {
      setFeedback('ظ‡ط°ظ‡ ط§ظ„ط¨ط§ظ‚ط© ظ…ظˆط¬ظˆط¯ط© ظ…ط³ط¨ظ‚ط§ظ‹ ط¨ظ†ظپط³ ط§ظ„ط³ط¹ط± ظˆط¹ط¯ط¯ ط§ظ„ط؛ط³ظ„ط§طھ.')
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
    setFeedback(error ? 'طھط¹ط°ط± ط¥ظ†ط´ط§ط، ط§ظ„ط¨ط§ظ‚ط©' : 'طھظ… ط¥ظ†ط´ط§ط، ط¨ط§ظ‚ط© ط§ظ„ط§ط´طھط±ط§ظƒ')
    if (!error) load()
  }

  const activateMembership = async () => {
    if (!companyId || !membershipForm.customerId || !membershipForm.planId) return
    const alreadyActive = activeMemberships.some(item => item.customer_id === membershipForm.customerId)
    if (alreadyActive) {
      setFeedback('ظ‡ط°ط§ ط§ظ„ط¹ظ…ظٹظ„ ظ„ط¯ظٹظ‡ ط§ط´طھط±ط§ظƒ ظ†ط´ط· ط­ط§ظ„ظٹط§ظ‹. ظ„ط§ ظٹظ…ظƒظ† طھظپط¹ظٹظ„ ط§ط´طھط±ط§ظƒ ط«ط§ظ†ظٹ ط­طھظ‰ ظ„ط§ ظٹطھظ… ط§ط­طھط³ط§ط¨ظ‡ ظ…ط±طھظٹظ†.')
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
    setFeedback(error ? 'طھط¹ط°ط± طھظپط¹ظٹظ„ ط§ظ„ط§ط´طھط±ط§ظƒ' : 'طھظ… طھظپط¹ظٹظ„ ط§ط´طھط±ط§ظƒ ط§ظ„ط¹ظ…ظٹظ„')
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
    setFeedback(error ? 'طھط¹ط°ط± طھط­ط¯ظٹط« ط§ظ„ظ…ط­ظپط¸ط©' : 'طھظ… طھط­ط¯ظٹط« ط±طµظٹط¯ ط§ظ„ظ…ط­ظپط¸ط©')
    if (!error) {
      setWalletForm({ customerId: walletForm.customerId, amount: '', note: '' })
      load()
    }
  }

  if (authLoading || loading) {
    return (
      <div className="madar-center-state">
        <Loader2 size={20} className="animate-spin" />
        <span>ط¬ط§ط±ظٹ طھط­ظ…ظٹظ„ ط§ظ„ط§ط´طھط±ط§ظƒط§طھ...</span>
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
          <p className="text-sm font-bold text-slate-500 font-tajawal">ظ…ظٹط²ط© ط§ط®طھظٹط§ط±ظٹط© ط؛ظٹط± ظ…ظپط¹ظ„ط©</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950 font-cairo">ط§ظ„ط§ط´طھط±ط§ظƒط§طھ ظˆط§ظ„ظ…ط­ظپط¸ط© طھط­طھ طھط­ظƒظ… ط§ظ„ط¥ط¯ط§ط±ط©</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500 font-tajawal">
            ظ‡ط°ظ‡ ط§ظ„طµظپط­ط© طھط¸ظ‡ط± ظپظ‚ط· ظ„ظ„ظ…ط؛ط§ط³ظ„ ط§ظ„طھظٹ ظپط¹ظ„ ظ„ظ‡ط§ ط§ظ„ط£ط¯ظ…ظ† ظ…ظٹط²ط§طھ ط§ظ„ط§ط´طھط±ط§ظƒط§طھ ط§ظ„ط´ظ‡ط±ظٹط© ط£ظˆ ط§ظ„ظ…ط­ظپط¸ط© ط§ظ„ط±ظ‚ظ…ظٹط© ط£ظˆ ط§ظ„ط¯ظپط¹ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ.
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
            <span className="text-xs font-bold text-sky-600 font-tajawal">ظ…ط±ظƒط² ط§ظ„ط¯ط®ظ„ ط§ظ„ظ…طھظƒط±ط±</span>
            <h1 className="mt-1 text-2xl font-black text-slate-950 font-cairo">ط§ط´طھط±ط§ظƒط§طھ ظˆظ…ط­ط§ظپط¸ ط§ظ„ط¹ظ…ظ„ط§ط،</h1>
            <p className="mt-1 text-sm leading-6 text-slate-500 font-tajawal">
              ظپط¹ظ„ ط¨ط§ظ‚ط§طھ ط؛ط³ظٹظ„ ط´ظ‡ط±ظٹط© ط£ظˆ ط§ط´ط­ظ† ظ…ط­ظپط¸ط© ط§ظ„ط¹ظ…ظٹظ„. ط§ظ„ظ…ظٹط²ط© ط§ط®طھظٹط§ط±ظٹط© ظˆطھطھط­ظƒظ… ظپظٹظ‡ط§ ط§ظ„ط¥ط¯ط§ط±ط© ظ„ظƒظ„ ظ…ط؛ط³ظ„ط©.
            </p>
          </div>
          <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 font-tajawal">
            <RefreshCw size={15} />
            طھط­ط¯ظٹط«
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Stat icon={Users} label="ظ…ط´طھط±ظƒظˆظ† ظ†ط´ط·ظˆظ†" value={activeMemberships.length.toLocaleString('en-US')} color="#4F6EF7" />
        <Stat icon={CreditCard} label="ط¯ط®ظ„ ط´ظ‡ط±ظٹ ظ…طھظˆظ‚ط¹" value={`${money(recurringRevenue)} ط±.ط³`} color="#10B981" />
        <Stat icon={WalletCards} label="ط£ط±طµط¯ط© ط§ظ„ظ…ط­ط§ظپط¸" value={`${money(walletBalance)} ط±.ط³`} color="#F59E0B" />
        <Stat icon={CheckCircle2} label="ط¨ط§ظ‚ط§طھ ظپط¹ط§ظ„ط©" value={activePlans.length.toLocaleString('en-US')} color="#0EA5E9" />
      </section>

      <ClientInsightPanel
        title="ظپط±طµ ط§ظ„ط§ط´طھط±ط§ظƒ ظˆط§ظ„ظ…ط­ظپط¸ط©"
        description="ط§ظ„ظ‡ط¯ظپ ظ‡ظ†ط§ ط£ظ† طھظƒظˆظ† ط§ظ„ظ…ظٹط²ط© ظ‚ط§ط¨ظ„ط© ظ„ظ„ط¨ظٹط¹ ظƒط¥ط¶ط§ظپط© ط§ط®طھظٹط§ط±ظٹط© ظ„ظ„ظ…ط؛ط³ظ„ط©طŒ ظˆظ„ظٹط³طھ ط¹ط¨ط¦ط§ظ‹ ط¹ظ„ظ‰ ظƒظ„ ط¹ظ…ظٹظ„."
        items={membershipInsights}
      />

      <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-600 font-tajawal">ط±ط­ظ„ط© ط§ظ„ط¹ظ…ظٹظ„ ظ…ظ† ط§ظ„ط¬ظˆط§ظ„</span>
            <h2 className="mt-1 text-lg font-black text-slate-950 font-cairo">ط¬ط§ظ‡ط²ظٹط© ط¨ظٹط¹ ط§ظ„ط§ط´طھط±ط§ظƒ ظ…ظ† QR</h2>
            <p className="mt-1 text-xs leading-6 text-slate-500 font-tajawal">
              ظ‡ط°ظ‡ ط§ظ„ط®ط±ظٹط·ط© طھظˆط¶ط­ ظ…ط§ط°ط§ ظٹط±ظ‰ ط§ظ„ط¹ظ…ظٹظ„ ظˆظ…ط§ط°ط§ ظٹط­ط¯ط« ط¯ط§ط®ظ„ ظ„ظˆط­ط© ط§ظ„طھط´ط؛ظٹظ„. ط§ظ„ط¯ظپط¹ ط§ظ„ظ†ظ‡ط§ط¦ظٹ ظٹظ†طھط¸ط± ط±ط¨ط· Moyasar/Apple Pay.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[190px] rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-emerald-700 font-tajawal">ط¬ط§ظ‡ط²ظٹط© ط§ظ„طھط´ط؛ظٹظ„</span>
                <strong className="font-sora text-lg font-black text-emerald-700">{journeyScore}%</strong>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${journeyScore}%` }} />
              </div>
            </div>
            {previewUrl && (
              <a href={previewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-100 bg-sky-50 px-4 py-2 text-sm font-bold text-sky-700 font-cairo">
                <ExternalLink size={15} />
                ظ…ط¹ط§ظٹظ†ط© ط§ظ„ط¹ظ…ظٹظ„
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
                {item.done ? 'ط¬ط§ظ‡ط²' : item.optional ? 'ظ„ط§ط­ظ‚ط§ظ‹' : 'ظٹظ†طھط¸ط±'}
              </span>
            </article>
          ))}
        </div>
      </section>

      {feedback && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 font-tajawal">{feedback}</div>}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
        {can.memberships && (
          <Panel title="ط¨ط§ظ‚ط§طھ ط§ظ„ط§ط´طھط±ط§ظƒ ط§ظ„ط´ظ‡ط±ظٹط©" desc="ط£ظ†ط´ط¦ ط¨ط§ظ‚ط§طھ ظ…ط«ظ„ 4 ط؛ط³ظ„ط§طھ ط£ظˆ 8 ط؛ط³ظ„ط§طھ ط´ظ‡ط±ظٹط§.">
            <div className="grid gap-3 md:grid-cols-[1.2fr_0.7fr_0.7fr_auto]">
              <Input label="ط§ط³ظ… ط§ظ„ط¨ط§ظ‚ط©" value={planForm.name} onChange={value => setPlanForm(current => ({ ...current, name: value }))} />
              <Input label="ط§ظ„ط³ط¹ط±" value={planForm.price} onChange={value => setPlanForm(current => ({ ...current, price: value }))} dir="ltr" />
              <Input label="ط§ظ„ط؛ط³ظ„ط§طھ/ط´ظ‡ط±" value={planForm.washes} onChange={value => setPlanForm(current => ({ ...current, washes: value }))} dir="ltr" />
              <button disabled={saving} onClick={createPlan} className="mt-auto inline-flex h-[43px] items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#0B63F6] to-[#00BFFF] px-4 text-sm font-bold !text-white shadow-[0_12px_26px_rgba(11,99,246,0.22)] transition hover:translate-y-[-1px] disabled:opacity-50 font-cairo [&_svg]:text-white">
                <Plus size={15} />
                ط¥ط¶ط§ظپط©
              </button>
            </div>
            <div className="mt-5 space-y-2">
              {uniquePlans.length === 0 ? <Empty text="ظ„ط§ طھظˆط¬ط¯ ط¨ط§ظ‚ط§طھ ط¨ط¹ط¯" /> : uniquePlans.map(plan => (
                <div key={plan.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div>
                    <strong className="text-sm text-slate-950 font-cairo">{plan.name}</strong>
                    <p className="text-xs text-slate-500 font-tajawal">{plan.washes_per_month} ط؛ط³ظ„ط§طھ / ط´ظ‡ط±</p>
                  </div>
                  <span className="font-sora text-lg font-black text-slate-950">{money(Number(plan.price))} <small className="text-xs text-slate-400">ط±.ط³</small></span>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {can.memberships && (
          <Panel title="طھظپط¹ظٹظ„ ط§ط´طھط±ط§ظƒ ظ„ط¹ظ…ظٹظ„" desc="ط§ط±ط¨ط· ط§ظ„ط¹ظ…ظٹظ„ ط¨ط®ط·ط© ط´ظ‡ط±ظٹط© ظٹط¯ظˆظٹط§ظ‹ ط§ظ„ط¢ظ†. ط§ظ„ط¯ظپط¹ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ظ…ظ† ط¬ظˆط§ظ„ ط§ظ„ط¹ظ…ظٹظ„ ظٹط¨ط¯ط£ ط¨ط¹ط¯ ط±ط¨ط· ظ…ط²ظˆط¯ ط§ظ„ط¯ظپط¹.">
            <Select label="ط§ظ„ط¹ظ…ظٹظ„" value={membershipForm.customerId} onChange={value => setMembershipForm(current => ({ ...current, customerId: value }))}>
              <option value="">ط§ط®طھط± ط§ظ„ط¹ظ…ظٹظ„</option>
              {customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name || phoneLabel(customer.phone)} - {phoneLabel(customer.phone)}</option>)}
            </Select>
            <Select label="ط§ظ„ط¨ط§ظ‚ط©" value={membershipForm.planId} onChange={value => setMembershipForm(current => ({ ...current, planId: value }))}>
              <option value="">ط§ط®طھط± ط§ظ„ط¨ط§ظ‚ط©</option>
              {activePlans.map(plan => <option key={plan.id} value={plan.id}>{plan.name} - {money(Number(plan.price))} ط±.ط³</option>)}
            </Select>
            <button disabled={saving || !membershipForm.customerId || !membershipForm.planId} onClick={activateMembership} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1565C0] px-4 py-3 text-sm font-bold text-white font-cairo disabled:opacity-50">
              <Save size={15} />
              طھظپط¹ظٹظ„ ط§ظ„ط§ط´طھط±ط§ظƒ
            </button>
          </Panel>
        )}

        {can.wallet && (
          <Panel title="ط§ظ„ظ…ط­ظپط¸ط© ط§ظ„ط±ظ‚ظ…ظٹط©" desc="ط§ط´ط­ظ† ط±طµظٹط¯ ط§ظ„ط¹ظ…ظٹظ„ ط£ظˆ ط§ط®طµظ… ظ…ظ†ظ‡ ظٹط¯ظˆظٹط§ ط§ظ„ط¢ظ†. ط§ظ„ط¯ظپط¹ ط§ظ„ط¢ظ„ظٹ ظ„ط§ط­ظ‚ط§ ط¹ط¨ط± Moyasar.">
            <Select label="ط§ظ„ط¹ظ…ظٹظ„" value={walletForm.customerId} onChange={value => setWalletForm(current => ({ ...current, customerId: value }))}>
              <option value="">ط§ط®طھط± ط§ظ„ط¹ظ…ظٹظ„</option>
              {customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name || phoneLabel(customer.phone)} - ط±طµظٹط¯ {money(Number(customer.wallet_balance || 0))} ط±.ط³</option>)}
            </Select>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input label="ط§ظ„ظ…ط¨ظ„ط؛" value={walletForm.amount} onChange={value => setWalletForm(current => ({ ...current, amount: value }))} dir="ltr" />
              <Input label="ظ…ظ„ط§ط­ط¸ط©" value={walletForm.note} onChange={value => setWalletForm(current => ({ ...current, note: value }))} />
            </div>
            <button disabled={saving || !walletForm.customerId || !walletForm.amount} onClick={chargeWallet} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white font-cairo disabled:opacity-50">
              <WalletCards size={15} />
              طھط­ط¯ظٹط« ط§ظ„ط±طµظٹط¯
            </button>
          </Panel>
        )}

        <Panel title="ط§ظ„ظ…ط´طھط±ظƒظˆظ† ط§ظ„ط­ط§ظ„ظٹظˆظ†" desc="ظ…طھط§ط¨ط¹ط© ط§ظ„ط§ط´طھط±ط§ظƒط§طھ ط§ظ„ظ†ط´ط·ط© ظˆط¹ط¯ط¯ ط§ظ„ط؛ط³ظ„ط§طھ ط§ظ„ظ…طھط¨ظ‚ظٹط©.">
          <div className="space-y-2">
            {activeMemberships.length === 0 ? <Empty text="ظ„ط§ طھظˆط¬ط¯ ط§ط´طھط±ط§ظƒط§طھ ظ…ظپط¹ظ„ط© ط¨ط¹ط¯" /> : activeMemberships.slice(0, 8).map(item => {
              const customer = customerMap.get(item.customer_id)
              const plan = planMap.get(item.plan_id || '')
              return (
                <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-sm text-slate-950 font-cairo">{customer?.name || phoneLabel(customer?.phone || '')}</strong>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 font-tajawal">ظ†ط´ط·</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 font-tajawal">{plan?.name || 'ط¨ط§ظ‚ط© ظ…ط­ط°ظˆظپط©'} - ظ…طھط¨ظ‚ظٹ {item.remaining_washes} ط؛ط³ظ„ط§طھ</p>
                </div>
              )
            })}
          </div>
        </Panel>

        {can.wallet && (
          <Panel title="ط¢ط®ط± ط­ط±ظƒط§طھ ط§ظ„ظ…ط­ظپط¸ط©" desc="ط´ط­ظ†طŒ ط®طµظ…طŒ ط£ظˆ طھط¹ط¯ظٹظ„ ط±طµظٹط¯.">
            <div className="space-y-2">
              {transactions.length === 0 ? <Empty text="ظ„ط§ طھظˆط¬ط¯ ط­ط±ظƒط§طھ ظ…ط­ظپط¸ط©" /> : transactions.slice(0, 8).map(tx => {
                const customer = customerMap.get(tx.customer_id)
                return (
                  <div key={tx.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div>
                      <strong className="text-sm text-slate-950 font-cairo">{customer?.name || phoneLabel(customer?.phone || '')}</strong>
                      <p className="text-xs text-slate-500 font-tajawal">{tx.note || tx.type}</p>
                    </div>
                    <span className={`font-sora text-sm font-black ${Number(tx.amount) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{money(Number(tx.amount))} ط±.ط³</span>
                  </div>
                )
              })}
            </div>
          </Panel>
        )}
      </section>

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
