import { useEffect, useState } from 'react'
import { Plus, X, Loader2, TrendingUp, TrendingDown, Wallet, Users, DollarSign, ClipboardCheck, FileDown, Pencil } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { usePlanGate } from '../../../hooks/usePlanGate'
import { CarWashDailyClosing } from './CarWashDailyClosing'
import { FeatureLock } from '../../dash/FeatureLock'
import { logAudit } from '../../../lib/auditLog'
import { downloadCSV, formatDateForCSV } from '../../../lib/exportUtils'
import type { CWExpense, ExpenseCategory, PaymentMethod } from '../../../types'
import { ClientButton, ClientEmptyState, ClientInsightPanel, ClientPageHeader, ClientPanel, ClientStatCard } from './ClientUI'

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

export const CarWashFinance = () => {
  const [tab, setTab] = useState<'finance' | 'closing'>('finance')
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

  const today = new Date().toISOString().slice(0, 10)

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

    const [{ data: visits }, { data: queue }, { data: workers }, { data: exps }] = await Promise.all([
      supabase.from('cw_visits')
        .select('price, subtotal, vat_amount, payment_method, is_free_wash, discount_amount, payment_status, created_at, service_name')
        .eq('company_id', companyId)
        .gte('created_at', rangeStart.toISOString())
        .not('payment_status', 'in', '("refunded","cancelled")'),
      supabase.from('cw_queue').select('price, subtotal, worker_id, status').eq('company_id', companyId).eq('status', 'delivered').gte('delivered_at', rangeStart.toISOString()),
      supabase.from('cw_workers').select('id, commission_type, commission_value, salary_type, fixed_salary').eq('company_id', companyId),
      supabase.from('cw_expenses').select('*').eq('company_id', companyId).gte('expense_date', expFrom).order('created_at', { ascending: false }),
    ])

    const totalRevenue = (visits || []).reduce((s, v) => s + (v.subtotal ?? v.price ?? 0), 0)
    setRevenue(totalRevenue)
    setVisitCount((visits || []).length)
    setVisitsData(visits || [])

    const breakdown: Record<string, number> = {}
    let freeCount = 0
    let freeDiscount = 0
    for (const v of visits || []) {
      const pm = (v.payment_method as PaymentMethod) || 'cash'
      breakdown[pm] = (breakdown[pm] || 0) + (v.subtotal ?? v.price ?? 0)
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
    setLoading(false)
  }

  useEffect(() => {
    if (!authLoading && companyId) loadData(days)
  }, [authLoading, companyId, days])

  const exportCSV = () => {
    const rows = visitsData.map((v: any) => ({
      'التاريخ': formatDateForCSV(v.created_at),
      'الخدمة': v.service_name || '',
      'قبل الضريبة': (v.subtotal ?? v.price ?? 0).toFixed(2),
      'الضريبة': (v.vat_amount ?? 0).toFixed(2),
      'الإجمالي': (v.subtotal ?? v.price ?? 0).toFixed(2),
      'طريقة الدفع': v.payment_method || 'cash',
      'غسلة مجانية': v.is_free_wash ? 'نعم' : 'لا',
    }))
    downloadCSV(rows, `madar-finance-${today}.csv`)
  }

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const netProfit = revenue - totalExpenses - workerCost
  const financeInsights = [
    netProfit >= 0
      ? { title: 'الربح اليومي صحي', description: `صافي الربح الحالي ${netProfit.toFixed(0)} ر.س بعد المصاريف وتكاليف الموظفين.`, tone: 'green' as const }
      : { title: 'راجع المصاريف فوراً', description: `صافي الربح بالسالب ${netProfit.toFixed(0)} ر.س. تحقق من مصاريف اليوم والعمولات.`, tone: 'red' as const },
    visitCount > 0
      ? { title: 'متوسط فاتورة العميل', description: `متوسط الزيارة ${Math.round(revenue / visitCount)} ر.س. ارفعها بخدمة إضافية بسيطة عند التسجيل.`, tone: 'blue' as const }
      : { title: 'لا توجد زيارات في الفترة', description: 'ابدأ بتسليم أول سيارة حتى تظهر مؤشرات الإيراد والمتوسطات.', tone: 'slate' as const },
    totalExpenses > revenue * 0.35 && revenue > 0
      ? { title: 'المصاريف مرتفعة', description: 'المصاريف تجاوزت 35% من الإيراد. افصل المواد والكهرباء والإيجار للمراجعة.', tone: 'amber' as const }
      : { title: 'المصاريف تحت السيطرة', description: 'نسبة المصاريف الحالية لا تظهر كخطر مباشر على هامش اليوم.', tone: 'green' as const },
  ]

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

  if (authLoading || loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <Loader2 size={20} className="animate-spin text-primary-400" />
      <p className="text-slate-500 font-tajawal text-sm">جاري تحميل المالية...</p>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #E2E8F0', paddingBottom: 0 }}>
        {[
          { key: 'finance', label: 'المالية',     icon: Wallet },
          { key: 'closing', label: 'إغلاق اليوم', icon: ClipboardCheck },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as typeof tab)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', fontSize: 13, fontFamily: 'Cairo, sans-serif', fontWeight: 700, cursor: 'pointer', border: 'none', background: 'transparent', borderBottom: tab === key ? '2px solid #22D3EE' : '2px solid transparent', color: tab === key ? '#22D3EE' : '#475569', transition: 'all 0.15s', marginBottom: -1 }}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'closing' ? <CarWashDailyClosing /> : <>
      <ClientPageHeader
        eyebrow="مركز الماليات"
        title="المالية"
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
          {can.financeExpenses && (
            <ClientButton onClick={() => setShowForm(true)}>
              <Plus size={16} /> إضافة مصروف
            </ClientButton>
          )}
          </>
        )}
      />

      {/* Revenue cards — always visible */}
      <div className="grid grid-cols-2 gap-4">
        <ClientStatCard icon={TrendingUp} label="الإيرادات" value={`${revenue.toFixed(0)} ر.س`} tone="green" sub={`${visitCount} زيارة — ${DATE_PRESETS.find(p => p.days === days)?.label || ''}`} />
        <ClientStatCard icon={DollarSign} label="متوسط الزيارة" value={`${visitCount > 0 ? (revenue / visitCount).toFixed(0) : 0} ر.س`} tone="blue" sub="لكل سيارة" />
      </div>

      <ClientInsightPanel
        title="قراءة مالية سريعة"
        description="مؤشرات عملية للمالك قبل نهاية اليوم: هل نربح، أين الهدر، وكيف نرفع متوسط الفاتورة."
        items={financeInsights}
      />

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

          {/* Payment method breakdown */}
          {Object.keys(paymentBreakdown).length > 0 && (
            <ClientPanel title="توزيع طرق الدفع" description="تابع النقد، مدى، التحويل، وباقي القنوات بسرعة.">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(paymentBreakdown).map(([pm, amount]) => {
                  const labels: Record<string, string> = { cash: 'كاش', mada: 'مدى', visa: 'فيزا', bank_transfer: 'تحويل', stc_pay: 'STC Pay', other: 'أخرى' }
                  return (
                    <div key={pm} className="p-3 rounded-xl text-center" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
                      <p className="text-xs text-slate-400 font-tajawal mb-1">{labels[pm] || pm}</p>
                      <p className="text-base font-bold text-slate-900 font-sora">{amount.toFixed(0)}</p>
                      <p className="text-xs text-slate-600 font-tajawal">ر.س</p>
                    </div>
                  )
                })}
              </div>
            </ClientPanel>
          )}

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

          {/* Expenses list */}
          <ClientPanel title="مصاريف اليوم" description="سجل المصاريف التشغيلية اليومية وراجع أثرها على الربح.">
            {expenses.length === 0 ? (
              <ClientEmptyState icon={TrendingDown} title="لا توجد مصاريف مسجلة" description="أضف مصروفًا عند شراء مواد أو تسجيل تكلفة تشغيل." />
            ) : (
              <div className="space-y-2">
                {expenses.map(e => (
                  <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                    <div className="flex-1">
                      <p className="text-sm font-tajawal" style={{ color: '#1E293B' }}>{e.description || CATEGORIES.find(c => c.value === e.category)?.label}</p>
                      <p className="text-xs text-slate-500 font-tajawal">{CATEGORIES.find(c => c.value === e.category)?.label}</p>
                    </div>
                    <p className="text-sm font-sora font-bold" style={{ color: '#EF4444' }}>{e.amount.toFixed(0)} ر.س</p>
                    <button
                      onClick={() => { setEditingExpense(e); setForm({ amount: String(e.amount), category: e.category, description: e.description || '' }); setShowForm(true) }}
                      className="text-slate-400 hover:text-indigo-500 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => deleteExpense(e.id)} disabled={deleting === e.id} className="text-slate-400 hover:text-red-400 transition-colors">
                      {deleting === e.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </ClientPanel>
        </div>
      </FeatureLock>

      {/* Add expense modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.5)' }}>
          <div role="dialog" aria-modal="true" className="w-full max-w-sm p-6 rounded-2xl" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 20px 60px rgba(15,23,42,0.15)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold font-cairo" style={{ color: '#0F172A' }}>{editingExpense ? 'تعديل مصروف' : 'إضافة مصروف'}</h2>
              <button aria-label="Close dialog" onClick={closeForm} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 font-tajawal mb-1.5 block">المبلغ (ر.س) *</label>
                <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" min={0} className="w-full px-4 py-2.5 rounded-xl text-sm font-sora text-slate-900 placeholder-slate-400 outline-none focus:border-sky-400" style={{ background: '#F8FAFC', border: '1px solid #CBD5E1' }} dir="ltr" />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-tajawal mb-1.5 block">الفئة</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(c => (
                    <button key={c.value} onClick={() => setForm(f => ({ ...f, category: c.value }))} className="py-2 rounded-xl text-xs font-tajawal transition-all" style={{ background: form.category === c.value ? 'rgba(99,102,241,0.3)' : '#FFFFFF', border: `1px solid ${form.category === c.value ? '#6366F1' : '#E2E8F0'}`, color: form.category === c.value ? '#A5B4FC' : '#94A3B8' }}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 font-tajawal mb-1.5 block">وصف (اختياري)</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="تفاصيل المصروف..." className="w-full px-4 py-2.5 rounded-xl text-sm font-tajawal text-slate-900 placeholder-slate-400 outline-none focus:border-sky-400" style={{ background: '#F8FAFC', border: '1px solid #CBD5E1' }} />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <ClientButton tone="secondary" onClick={closeForm} className="flex-1">إلغاء</ClientButton>
              <ClientButton onClick={addExpense} disabled={saving || !form.amount || Number(form.amount) <= 0} className="flex-1">
                {saving ? <Loader2 size={14} className="animate-spin" /> : editingExpense ? <Pencil size={14} /> : <Plus size={14} />}
                {saving ? 'جاري الحفظ...' : editingExpense ? 'حفظ التعديل' : 'إضافة'}
              </ClientButton>
            </div>
          </div>
        </div>
      )}
      </>}
    </div>
  )
}
