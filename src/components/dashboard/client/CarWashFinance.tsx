import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, X, Loader2, TrendingUp, TrendingDown, Wallet, Users, DollarSign, ClipboardCheck, FileDown, Pencil, Save, ShoppingCart } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { usePlanGate } from '../../../hooks/usePlanGate'
import { CarWashDailyClosing } from './CarWashDailyClosing'
import { CarWashSetup } from './CarWashSetup'
import { FeatureLock } from '../../dash/FeatureLock'
import { logAudit } from '../../../lib/auditLog'
import { downloadCSV, formatDateForCSV } from '../../../lib/exportUtils'
import type { CWExpense, ExpenseCategory } from '../../../types'
import { ClientButton, ClientEmptyState, ClientPageHeader, ClientPanel, ClientStatCard } from './ClientUI'
import { CarWashPOS } from './CarWashPOS'

const DATE_PRESETS = [
  { label: 'اليوم',       days: 1  },
  { label: 'هذا الأسبوع', days: 7  },
  { label: 'هذا الشهر',  days: 30 },
]

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'tools',       label: 'أدوات ومواد'  },
  { value: 'electricity', label: 'كهرباء وماء'  },
  { value: 'rent',        label: 'إيجار'          },
  { value: 'other',       label: 'أخرى'           },
]

const EMPTY_FORM = { amount: '', category: 'other' as ExpenseCategory, description: '' }
const PAYMENT_LABELS: Record<string, string> = {
  cash: 'كاش',
  mada: 'مدى',
  visa: 'فيزا',
  bank_transfer: 'تحويل',
  stc_pay: 'STC Pay',
  other: 'أخرى',
}

function ExpensesTab({ companyId, company, can, planLabel }: { companyId: string | null; company: any; can: any; planLabel: string }) {
  const [expenses, setExpenses] = useState<CWExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<CWExpense | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const today = new Date().toISOString().slice(0, 10)

  const loadExpenses = async () => {
    if (!companyId) return
    setLoading(true)
    const { data } = await supabase.from('cw_expenses').select('*').eq('company_id', companyId).order('created_at', { ascending: false })
    setExpenses((data || []) as CWExpense[])
    setLoading(false)
  }

  useEffect(() => { if (companyId) loadExpenses() }, [companyId])

  const closeForm = () => { setShowForm(false); setEditingExpense(null); setForm(EMPTY_FORM) }

  const saveExpense = async () => {
    if (!companyId || !form.amount || Number(form.amount) <= 0) return
    setSaving(true)
    if (editingExpense) {
      await supabase.from('cw_expenses').update({ amount: Number(form.amount), category: form.category, description: form.description || null }).eq('id', editingExpense.id)
      logAudit(companyId, 'expense_updated', { entityType: 'cw_expenses', entityId: editingExpense.id, newValue: { amount: Number(form.amount), category: form.category } })
    } else {
      const { data: inserted } = await supabase.from('cw_expenses').insert({ company_id: companyId, amount: Number(form.amount), category: form.category, description: form.description || null, expense_date: today }).select().single()
      if (inserted) logAudit(companyId, 'expense_added', { entityType: 'cw_expenses', entityId: inserted.id, newValue: { amount: inserted.amount, category: inserted.category } })
    }
    closeForm()
    setSaving(false)
    loadExpenses()
  }

  const deleteExpense = async (id: string) => {
    setDeleting(id)
    const expense = expenses.find(e => e.id === id)
    await supabase.from('cw_expenses').delete().eq('id', id)
    if (companyId && expense) logAudit(companyId, 'expense_deleted', { entityType: 'cw_expenses', entityId: id, oldValue: { amount: expense.amount, category: expense.category } })
    setDeleting(null)
    loadExpenses()
  }

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const byCategory = CATEGORIES.map(c => ({ ...c, total: expenses.filter(e => e.category === c.value).reduce((s, e) => s + e.amount, 0) })).filter(c => c.total > 0)

  return (
    <FeatureLock locked={!can.financeExpenses} requiredPlan="pro" featureName="تتبع المصاريف" benefit="راقب مصاريف التشغيل اليومية بدقة" companyName={company?.name} currentPlan={planLabel}>
      <div className="space-y-4">
        <ClientPageHeader
          eyebrow="السجل المالي"
          title="المصاريف"
          description="جميع مصاريف التشغيل مرتبة بوضوح — أدوات، إيجار، كهرباء، وغيرها."
          actions={<ClientButton onClick={() => { setEditingExpense(null); setForm(EMPTY_FORM); setShowForm(true) }}><Plus size={15} /> إضافة مصروف</ClientButton>}
        />

        {/* Summary cards */}
        {byCategory.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {byCategory.map(c => (
              <div key={c.value} className="rounded-2xl p-4" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                <p className="text-xs text-slate-500 font-tajawal mb-1">{c.label}</p>
                <p className="text-lg font-black font-sora" style={{ color: '#EF4444' }}>{c.total.toFixed(0)} <span className="text-xs font-normal">ر.س</span></p>
              </div>
            ))}
            <div className="rounded-2xl p-4 col-span-2 sm:col-span-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold font-cairo" style={{ color: '#EF4444' }}>إجمالي المصاريف</span>
                <span className="text-xl font-black font-sora" style={{ color: '#EF4444' }}>{totalExpenses.toFixed(0)} ر.س</span>
              </div>
            </div>
          </div>
        )}

        {/* Expense table */}
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-slate-400" /></div>
        ) : expenses.length === 0 ? (
          <ClientEmptyState icon={TrendingDown} title="لا توجد مصاريف مسجلة" description="أضف أول مصروف للبدء في تتبع تكاليف التشغيل." />
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    {['التاريخ', 'الفئة', 'الوصف', 'المبلغ', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-right text-xs font-bold text-slate-500 font-tajawal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e, i) => (
                    <tr key={e.id} style={{ background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA', borderBottom: '1px solid #F1F5F9' }}>
                      <td className="px-4 py-3 text-slate-600 font-tajawal text-xs">{e.expense_date || today}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-lg text-xs font-bold font-tajawal" style={{ background: '#F1F5F9', color: '#475569' }}>
                          {CATEGORIES.find(c => c.value === e.category)?.label || e.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-tajawal">{e.description || '—'}</td>
                      <td className="px-4 py-3 font-black font-sora" style={{ color: '#EF4444' }}>{e.amount.toFixed(0)} ر.س</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => { setEditingExpense(e); setForm({ amount: String(e.amount), category: e.category, description: e.description || '' }); setShowForm(true) }} className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-500 transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => deleteExpense(e.id)} disabled={deleting === e.id} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-400 transition-colors">
                            {deleting === e.id ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add/Edit modal */}
        {showForm && (
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.55)', zIndex: 9999 }}>
            <div role="dialog" aria-modal="true" className="w-full max-w-sm p-6 rounded-2xl" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 20px 60px rgba(15,23,42,0.15)' }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold font-cairo" style={{ color: '#0F172A' }}>{editingExpense ? 'تعديل مصروف' : 'إضافة مصروف'}</h2>
                <button aria-label="Close dialog" onClick={closeForm} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-500 font-tajawal mb-1.5 block">المبلغ (ر.س) *</label>
                  <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" min={0} className="w-full px-4 py-2.5 rounded-xl text-sm font-sora text-slate-900 placeholder-slate-400 outline-none" style={{ background: '#F8FAFC', border: '1px solid #CBD5E1' }} dir="ltr" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-tajawal mb-1.5 block">الفئة</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map(c => (
                      <button key={c.value} onClick={() => setForm(f => ({ ...f, category: c.value }))} className="py-2 rounded-xl text-xs font-tajawal transition-all" style={{ background: form.category === c.value ? 'rgba(99,102,241,0.12)' : '#FFFFFF', border: `1px solid ${form.category === c.value ? '#6366F1' : '#E2E8F0'}`, color: form.category === c.value ? '#6366F1' : '#94A3B8', fontWeight: form.category === c.value ? 700 : 400 }}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-tajawal mb-1.5 block">وصف (اختياري)</label>
                  <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="تفاصيل المصروف..." className="w-full px-4 py-2.5 rounded-xl text-sm font-tajawal text-slate-900 placeholder-slate-400 outline-none" style={{ background: '#F8FAFC', border: '1px solid #CBD5E1' }} />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <ClientButton tone="secondary" onClick={closeForm} className="flex-1">إلغاء</ClientButton>
                <ClientButton onClick={saveExpense} disabled={saving || !form.amount || Number(form.amount) <= 0} className="flex-1">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : editingExpense ? <Pencil size={14} /> : <Plus size={14} />}
                  {saving ? 'جاري الحفظ...' : editingExpense ? 'حفظ التعديل' : 'إضافة'}
                </ClientButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </FeatureLock>
  )
}

export const CarWashFinance = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState<'pos' | 'finance' | 'closing' | 'services' | 'expenses'>('pos')
  const { companyId, company, loading: authLoading } = useClientCompany()
  const { can, planLabel } = usePlanGate()
  const [loading, setLoading] = useState(true)
  const [expenses, setExpenses] = useState<CWExpense[]>([])
  const [revenue, setRevenue] = useState(0)
  const [visitCount, setVisitCount] = useState(0)
  const [workerCost, setWorkerCost] = useState(0)
  const [paymentBreakdown, setPaymentBreakdown] = useState<Record<string, number>>({})
  const [freeWashCount, setFreeWashCount] = useState(0)
  const [freeWashDiscount, setFreeWashDiscount] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<CWExpense | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [days, setDays] = useState(1)
  const [visitsData, setVisitsData] = useState<any[]>([])
  const [customerMap, setCustomerMap] = useState<Record<string, { name: string | null; phone: string }>>({})
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [invoicePaymentFilter, setInvoicePaymentFilter] = useState('all')
  const [targetValue, setTargetValue] = useState('')
  const [savingTarget, setSavingTarget] = useState(false)
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    const requestedTab = searchParams.get('tab')
    setTab(requestedTab === 'pos' ? 'pos' : requestedTab === 'closing' ? 'closing' : requestedTab === 'services' ? 'services' : requestedTab === 'finance' ? 'finance' : requestedTab === 'expenses' ? 'expenses' : 'pos')
  }, [searchParams])

  const selectTab = (nextTab: 'pos' | 'finance' | 'closing' | 'services' | 'expenses') => {
    setTab(nextTab)
    setSearchParams(nextTab === 'pos' ? {} : { tab: nextTab }, { replace: true })
  }

  const getDateRange = (d: number) => {
    const start = new Date()
    start.setDate(start.getDate() - (d - 1))
    start.setHours(0, 0, 0, 0)
    return start
  }

  const loadData = async (selectedDays = days) => {
    if (!companyId) return
    setLoading(true)

    const rangeStart = getDateRange(selectedDays)
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)

    const expFrom = selectedDays === 1 ? today : rangeStart.toISOString().slice(0, 10)

    const [{ data: visits }, { data: queue }, { data: workers }, { data: exps }, { data: customers }] = await Promise.all([
      supabase.from('cw_visits')
        .select('id, customer_id, price, subtotal, vat_amount, total_amount, payment_method, is_free_wash, discount_amount, payment_status, created_at, service_name')
        .eq('company_id', companyId)
        .gte('created_at', rangeStart.toISOString())
        .not('payment_status', 'in', '("refunded","cancelled")'),
      supabase.from('cw_queue').select('price, subtotal, worker_id, status').eq('company_id', companyId).eq('status', 'delivered').gte('delivered_at', rangeStart.toISOString()),
      supabase.from('cw_workers').select('id, commission_type, commission_value, salary_type, fixed_salary').eq('company_id', companyId),
      supabase.from('cw_expenses').select('*').eq('company_id', companyId).gte('expense_date', expFrom).order('created_at', { ascending: false }),
      supabase.from('cw_customers').select('id, name, phone').eq('company_id', companyId),
    ])

    const visitTotal = (v: any) => v.is_free_wash ? 0 : Number(v.total_amount ?? ((v.subtotal ?? v.price ?? 0) + (v.vat_amount ?? 0)))
    const totalRevenue = (visits || []).reduce((s, v) => s + visitTotal(v), 0)
    setRevenue(totalRevenue)
    setVisitCount((visits || []).length)
    setVisitsData(visits || [])

    const breakdown: Record<string, number> = {}
    let freeCount = 0
    let freeDiscount = 0
    for (const v of visits || []) {
      const pm = (v.payment_method as PaymentMethod) || 'cash'
      breakdown[pm] = (breakdown[pm] || 0) + visitTotal(v)
      if (v.is_free_wash) {
        freeCount++
        freeDiscount += v.discount_amount || 0
      }
    }
    setPaymentBreakdown(breakdown)
    setFreeWashCount(freeCount)
    setFreeWashDiscount(freeDiscount)

    const workersMap = Object.fromEntries((workers || []).map(w => [w.id, w]))
    const totalWorkerCost = (queue || []).reduce((s, q) => {
      const w = q.worker_id ? workersMap[q.worker_id] : null
      if (!w) return s
      if (w.salary_type === 'fixed') return s + (w.fixed_salary || 0) / 30
      const commission = w.commission_type === 'fixed' ? w.commission_value : ((q.subtotal ?? q.price) * w.commission_value) / 100
      return s + commission
    }, 0)
    setWorkerCost(totalWorkerCost)
    setExpenses((exps || []) as CWExpense[])
    setCustomerMap(Object.fromEntries((customers || []).map((customer: any) => [customer.id, { name: customer.name, phone: customer.phone }])))
    setLoading(false)
  }

  useEffect(() => {
    if (!authLoading && companyId) loadData(days)
  }, [authLoading, companyId, days])

  useEffect(() => {
    setTargetValue(String(Number((company as any)?.cw_monthly_target || 0) || ''))
  }, [company?.id, (company as any)?.cw_monthly_target])

  const exportCSV = () => {
    const rows = visitsData.map((v: any) => ({
      'التاريخ': formatDateForCSV(v.created_at),
      'الخدمة': v.service_name || '',
      'قبل الضريبة': (v.subtotal ?? v.price ?? 0).toFixed(2),
      'الضريبة': (v.vat_amount ?? 0).toFixed(2),
      'الإجمالي': (v.is_free_wash ? 0 : Number(v.total_amount ?? ((v.subtotal ?? v.price ?? 0) + (v.vat_amount ?? 0)))).toFixed(2),
      'طريقة الدفع': v.payment_method || 'cash',
      'غسلة مجانية': v.is_free_wash ? 'نعم' : 'لا',
    }))
    downloadCSV(rows, `madar-finance-${today}.csv`)
  }

  const visitTotal = (v: any) => v.is_free_wash ? 0 : Number(v.total_amount ?? ((v.subtotal ?? v.price ?? 0) + (v.vat_amount ?? 0)))
  const invoiceRows = visitsData
    .map((visit: any, index: number) => {
      const customer = visit.customer_id ? customerMap[visit.customer_id] : null
      const total = visitTotal(visit)
      const invoiceNo = `INV-${new Date(visit.created_at).toISOString().slice(0, 10).replaceAll('-', '')}-${String(index + 1).padStart(3, '0')}`
      return {
        ...visit,
        invoiceNo,
        customerName: customer?.name || customer?.phone || 'عميل غير مسجل',
        customerPhone: customer?.phone || '',
        total,
        vat: Number(visit.vat_amount || 0),
        subtotalValue: Number(visit.subtotal ?? visit.price ?? 0),
        paymentLabel: PAYMENT_LABELS[visit.payment_method || 'cash'] || visit.payment_method || 'كاش',
        statusLabel: visit.payment_status === 'paid' ? 'مدفوعة' : visit.is_free_wash ? 'مجانية' : 'مسجلة',
      }
    })
    .filter((invoice: any) => {
      const q = invoiceSearch.trim().toLowerCase()
      const matchesSearch = !q || [invoice.invoiceNo, invoice.customerName, invoice.customerPhone, invoice.service_name, invoice.paymentLabel]
        .some(value => String(value || '').toLowerCase().includes(q))
      const matchesPayment = invoicePaymentFilter === 'all' || (invoice.payment_method || 'cash') === invoicePaymentFilter
      return matchesSearch && matchesPayment
    })
  const invoicePaymentOptions = Array.from(new Set(visitsData.map((visit: any) => visit.payment_method || 'cash')))
  const exportInvoicesCSV = () => {
    const rows = invoiceRows.map((invoice: any) => ({
      'رقم الفاتورة': invoice.invoiceNo,
      'العميل': invoice.customerName,
      'الجوال': invoice.customerPhone,
      'الخدمة': invoice.service_name || '',
      'طريقة الدفع': invoice.paymentLabel,
      'قبل الضريبة': invoice.subtotalValue.toFixed(2),
      'VAT': invoice.vat.toFixed(2),
      'قيمة الفاتورة': invoice.total.toFixed(2),
      'الحالة': invoice.statusLabel,
      'التاريخ': formatDateForCSV(invoice.created_at),
    }))
    downloadCSV(rows, `madar-sales-invoices-${today}.csv`)
  }
  const copyInvoice = async (invoice: any) => {
    const text = [
      `فاتورة ${invoice.invoiceNo}`,
      `العميل: ${invoice.customerName}`,
      `الخدمة: ${invoice.service_name || 'خدمة مغسلة'}`,
      `طريقة الدفع: ${invoice.paymentLabel}`,
      `الإجمالي: ${invoice.total.toFixed(2)} ر.س`,
      `التاريخ: ${formatDateForCSV(invoice.created_at)}`,
    ].join('\n')
    await navigator.clipboard?.writeText(text)
  }

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const netProfit = revenue - totalExpenses - workerCost
  const marginPercent = revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0
  const monthlyTarget = Number((company as any)?.cw_monthly_target || 0)
  const targetProgress = monthlyTarget > 0 ? Math.min(100, Math.round((revenue / monthlyTarget) * 100)) : 0
  const saveMonthlyTarget = async () => {
    if (!companyId) return
    setSavingTarget(true)
    const nextTarget = Math.max(0, Math.round(Number(targetValue || 0)))
    await supabase.from('companies').update({ cw_monthly_target: nextTarget } as any).eq('id', companyId)
    logAudit(companyId, 'monthly_revenue_target_updated', { newValue: { cw_monthly_target: nextTarget } })
    setSavingTarget(false)
    window.location.reload()
  }
  const closeForm = () => { setShowForm(false); setEditingExpense(null); setForm(EMPTY_FORM) }

  const addExpense = async () => {
    if (!companyId || !form.amount || Number(form.amount) <= 0) return
    setSaving(true)
    if (editingExpense) {
      await supabase.from('cw_expenses').update({
        amount: Number(form.amount),
        category: form.category,
        description: form.description || null,
      }).eq('id', editingExpense.id)
      logAudit(companyId, 'expense_updated', { entityType: 'cw_expenses', entityId: editingExpense.id, newValue: { amount: Number(form.amount), category: form.category } })
    } else {
      const { data: inserted } = await supabase.from('cw_expenses').insert({
        company_id: companyId,
        amount: Number(form.amount),
        category: form.category,
        description: form.description || null,
        expense_date: today,
      }).select().single()
      if (inserted) logAudit(companyId, 'expense_added', { entityType: 'cw_expenses', entityId: inserted.id, newValue: { amount: inserted.amount, category: inserted.category } })
    }
    closeForm()
    setSaving(false)
    loadData()
  }

  const deleteExpense = async (id: string) => {
    setDeleting(id)
    const expense = expenses.find(e => e.id === id)
    await supabase.from('cw_expenses').delete().eq('id', id)
    if (companyId && expense) logAudit(companyId, 'expense_deleted', { entityType: 'cw_expenses', entityId: id, oldValue: { amount: expense.amount, category: expense.category } })
    setDeleting(null)
    loadData()
  }


  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #E2E8F0', paddingBottom: 0 }}>
        {[
          { key: 'pos',      label: 'شاشة البيع',        icon: ShoppingCart },
          { key: 'finance',  label: 'تحليل مالي',          icon: Wallet },
          { key: 'expenses', label: 'المصاريف',           icon: TrendingDown },
          { key: 'closing',  label: 'إغلاق اليوم',       icon: ClipboardCheck },
          { key: 'services', label: 'الخدمات والضريبة',  icon: DollarSign },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => selectTab(key as typeof tab)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', fontSize: 13, fontFamily: 'Cairo, sans-serif', fontWeight: 700, cursor: 'pointer', border: 'none', background: 'transparent', borderBottom: tab === key ? '2px solid #22D3EE' : '2px solid transparent', color: tab === key ? '#22D3EE' : '#475569', transition: 'all 0.15s', marginBottom: -1 }}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'pos' ? <CarWashPOS /> : tab === 'closing' ? <CarWashDailyClosing /> : tab === 'expenses' ? <ExpensesTab companyId={companyId} company={company} can={can} planLabel={planLabel} /> : tab === 'services' ? (
        <CarWashSetup
          title="الخدمات والضريبة"
          description="عدّل أسعار الخدمات النهائية التي يدفعها العميل، وتأكد أن VAT محسوبة بنفس طريقة المالية."
          visibleTabs={['services', 'vat']}
        />
      ) : <>
      <ClientPageHeader
        eyebrow="مركز الماليات"
        title="تحليل مالي"
        description="إيرادات، مصاريف، تكاليف الموظفين، وصافي الربح في شاشة واحدة واضحة للمغسلة."
        actions={(
          <>
            <ClientButton tone="secondary" onClick={exportCSV}>
              <FileDown size={15} /> تصدير
            </ClientButton>
            <div className="flex gap-2 rounded-2xl bg-white p-1" style={{ border: '1px solid #E2E8F0' }}>
              {DATE_PRESETS.map(p => (
                <button key={p.days} onClick={() => setDays(p.days)}
                  className="rounded-xl px-3 text-xs font-bold font-tajawal transition-all"
                  style={{
                    minHeight: 34,
                    border: 'none',
                    cursor: 'pointer',
                    background: days === p.days ? 'rgba(0,191,255,0.12)' : 'transparent',
                    color: days === p.days ? '#1565C0' : '#64748B',
                  }}>
                  {p.label}
                </button>
              ))}
            </div>
          </>
        )}
      />

      {/* Revenue cards — always visible */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <ClientStatCard icon={TrendingUp} label="الإيرادات" value={`${revenue.toFixed(0)} ر.س`} tone="green" sub={`${visitCount} زيارة — ${DATE_PRESETS.find(p => p.days === days)?.label || ''}`} />
        <ClientStatCard icon={TrendingDown} label="المصاريف" value={`${totalExpenses.toFixed(0)} ر.س`} tone="red" sub={`${expenses.length} بند`} />
        <ClientStatCard icon={DollarSign} label="صافي الربح" value={`${netProfit.toFixed(0)} ر.س`} tone={netProfit >= 0 ? 'blue' : 'red'} sub={netProfit >= 0 ? `${marginPercent}% هامش` : 'راجع المصاريف'} />
        <ClientStatCard icon={DollarSign} label="متوسط الزيارة" value={`${visitCount > 0 ? (revenue / visitCount).toFixed(0) : 0} ر.س`} tone="blue" sub="لكل سيارة" />
        <ClientStatCard icon={TrendingUp} label="هدف الشهر" value={monthlyTarget > 0 ? `${monthlyTarget.toFixed(0)} ر.س` : 'غير محدد'} tone="blue" sub={monthlyTarget > 0 ? `${targetProgress}% من الهدف` : 'حدده من المالية'} />
      </div>

      <ClientPanel title="هدف الإيراد الشهري" description="حدد رقم الشهر المستهدف للمغسلة، وسيظهر تقدمه في المالية والرئيسية.">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900 font-cairo">
              {monthlyTarget > 0 ? `تم تحقيق ${targetProgress}% من الهدف الحالي` : 'لا يوجد هدف شهري محدد حالياً'}
            </p>
            <p className="mt-1 text-xs text-slate-500 font-tajawal">يفضل تحديثه بداية كل شهر حسب متوسط المبيعات المتوقع.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={targetValue}
              onChange={event => setTargetValue(event.target.value.replace(/[^\d]/g, ''))}
              inputMode="numeric"
              dir="ltr"
              className="h-11 w-36 rounded-2xl bg-white px-4 text-center text-sm font-black text-slate-900 outline-none font-sora"
              style={{ border: '1px solid #DDE8F7' }}
              placeholder="20000"
            />
            <ClientButton tone="secondary" onClick={saveMonthlyTarget} disabled={savingTarget}>
              {savingTarget ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              حفظ الهدف
            </ClientButton>
          </div>
        </div>
      </ClientPanel>


      {/* Expenses, profit bar, workers cost — Pro feature */}
      <FeatureLock
        locked={!can.financeExpenses}
        requiredPlan="pro"
        featureName="تتبع المصاريف والربح الصافي"
        benefit="راقب تكاليف التشغيل واحسب أرباحك اليومية بدقة — مصاريف، عمولات، وصافي الربح في مكان واحد"
        companyName={company?.name}
        currentPlan={planLabel}
      >
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ClientStatCard icon={TrendingDown} label="المصاريف"       value={`${totalExpenses.toFixed(0)} ر.س`} tone="red" sub={`${expenses.length} بند`} />
            <ClientStatCard icon={Users}        label="تكاليف الموظفين" value={`${workerCost.toFixed(0)} ر.س`}   tone="amber" sub="عمولات اليوم" />
            <ClientStatCard
              icon={DollarSign}
              label="صافي الربح"
              value={`${netProfit.toFixed(0)} ر.س`}
              tone={netProfit >= 0 ? 'blue' : 'red'}
              sub={netProfit >= 0 ? 'ممتاز اليوم' : 'خسارة — راجع المصاريف'}
            />
          </div>

          {/* Profit bar */}
          <ClientPanel title="توزيع الإيرادات" description="كيف تنقسم مبيعات اليوم بين ربح وتكاليف تشغيل.">
            {revenue > 0 ? (
              <div className="space-y-3">
                {[
                  { label: 'الربح الصافي',   val: Math.max(0, netProfit),   color: '#10B981' },
                  { label: 'تكاليف الموظفين', val: workerCost,               color: '#F59E0B' },
                  { label: 'مصاريف التشغيل', val: totalExpenses,            color: '#EF4444' },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-slate-400 font-tajawal">{item.label}</span>
                      <span className="text-xs font-sora" style={{ color: item.color }}>{item.val.toFixed(0)} ر.س</span>
                    </div>
                    <div className="h-2 rounded-full" style={{ background: '#FFFFFF' }}>
                      <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (item.val / revenue) * 100)}%`, background: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ClientEmptyState icon={Wallet} title="لا توجد إيرادات بعد" description="بمجرد تسليم أول سيارة ستظهر الأرقام هنا." />
            )}
          </ClientPanel>

          {/* Free washes */}
          {freeWashCount > 0 && (
            <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <span className="text-amber-400 text-lg">🎁</span>
              <div className="flex-1">
                <p className="text-sm text-amber-400 font-tajawal">{freeWashCount} غسلة مجانية اليوم</p>
                <p className="text-xs text-slate-500 font-tajawal">خصم ولاء: {freeWashDiscount.toFixed(0)} ر.س</p>
              </div>
            </div>
          )}

        </div>
      </FeatureLock>
      </>}
    </div>
  )
}
