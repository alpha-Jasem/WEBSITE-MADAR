import { useEffect, useState } from 'react'
import { Plus, X, Loader2, TrendingUp, TrendingDown, Wallet, Users, DollarSign } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import type { CWExpense, ExpenseCategory } from '../../../types'

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'tools',       label: 'أدوات ومواد'  },
  { value: 'electricity', label: 'كهرباء وماء'  },
  { value: 'rent',        label: 'إيجار'          },
  { value: 'other',       label: 'أخرى'           },
]

const EMPTY_FORM = { amount: '', category: 'other' as ExpenseCategory, description: '' }

function StatCard({ icon: Icon, label, value, color, sub }: { icon: typeof Wallet; label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}22` }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + '22' }}>
          <Icon size={16} style={{ color }} />
        </div>
        <p className="text-xs text-slate-500 font-tajawal">{label}</p>
      </div>
      <p className="text-2xl font-bold font-sora" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-slate-600 font-tajawal mt-1">{sub}</p>}
    </div>
  )
}

export const CarWashFinance = () => {
  const { companyId, loading: authLoading } = useClientCompany()
  const [loading, setLoading] = useState(true)
  const [expenses, setExpenses] = useState<CWExpense[]>([])
  const [revenue, setRevenue] = useState(0)
  const [workerCost, setWorkerCost] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)

  const loadData = async () => {
    if (!companyId) return
    setLoading(true)

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [{ data: visits }, { data: queue }, { data: workers }, { data: exps }] = await Promise.all([
      supabase.from('cw_visits').select('price').eq('company_id', companyId).gte('created_at', todayStart.toISOString()),
      supabase.from('cw_queue').select('price, worker_id, status').eq('company_id', companyId).eq('status', 'delivered').gte('delivered_at', todayStart.toISOString()),
      supabase.from('cw_workers').select('id, commission_type, commission_value').eq('company_id', companyId),
      supabase.from('cw_expenses').select('*').eq('company_id', companyId).eq('expense_date', today).order('created_at', { ascending: false }),
    ])

    const totalRevenue = (visits || []).reduce((s, v) => s + (v.price || 0), 0)
    setRevenue(totalRevenue)

    const workersMap = Object.fromEntries((workers || []).map(w => [w.id, w]))
    const totalWorkerCost = (queue || []).reduce((s, q) => {
      const w = q.worker_id ? workersMap[q.worker_id] : null
      if (!w) return s
      return s + (w.commission_type === 'fixed' ? w.commission_value : (q.price * w.commission_value) / 100)
    }, 0)
    setWorkerCost(totalWorkerCost)
    setExpenses((exps || []) as CWExpense[])
    setLoading(false)
  }

  useEffect(() => {
    if (!authLoading && companyId) loadData()
  }, [authLoading, companyId])

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const netProfit = revenue - totalExpenses - workerCost

  const addExpense = async () => {
    if (!companyId || !form.amount || Number(form.amount) <= 0) return
    setSaving(true)
    await supabase.from('cw_expenses').insert({
      company_id: companyId,
      amount: Number(form.amount),
      category: form.category,
      description: form.description || null,
      expense_date: today,
    })
    setForm(EMPTY_FORM)
    setShowForm(false)
    setSaving(false)
    loadData()
  }

  const deleteExpense = async (id: string) => {
    setDeleting(id)
    await supabase.from('cw_expenses').delete().eq('id', id)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-cairo">المالية</h1>
          <p className="text-sm text-slate-500 font-tajawal">إغلاق يوم {new Date().toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-tajawal font-medium text-white" style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
          <Plus size={16} /> إضافة مصروف
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp}   label="الإيرادات"      value={`${revenue.toFixed(0)} ر.س`}      color="#10B981" sub={`من الغسيل اليوم`} />
        <StatCard icon={TrendingDown} label="المصاريف"       value={`${totalExpenses.toFixed(0)} ر.س`} color="#EF4444" sub={`${expenses.length} بند`} />
        <StatCard icon={Users}        label="تكاليف الموظفين" value={`${workerCost.toFixed(0)} ر.س`}   color="#F59E0B" sub="عمولات اليوم" />
        <StatCard
          icon={DollarSign}
          label="صافي الربح"
          value={`${netProfit.toFixed(0)} ر.س`}
          color={netProfit >= 0 ? '#6366F1' : '#EF4444'}
          sub={netProfit >= 0 ? 'ممتاز اليوم' : 'خسارة — راجع المصاريف'}
        />
      </div>

      {/* Profit bar */}
      <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-sm font-bold text-white font-cairo mb-4">توزيع الإيرادات</p>
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
                <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (item.val / revenue) * 100)}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-600 font-tajawal text-sm text-center py-4">لا توجد إيرادات بعد</p>
        )}
      </div>

      {/* Expenses list */}
      <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-sm font-bold text-white font-cairo mb-4">مصاريف اليوم</p>
        {expenses.length === 0 ? (
          <p className="text-slate-600 font-tajawal text-sm text-center py-4">لا توجد مصاريف مسجّلة</p>
        ) : (
          <div className="space-y-2">
            {expenses.map(e => (
              <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex-1">
                  <p className="text-sm text-white font-tajawal">{e.description || CATEGORIES.find(c => c.value === e.category)?.label}</p>
                  <p className="text-xs text-slate-500 font-tajawal">{CATEGORIES.find(c => c.value === e.category)?.label}</p>
                </div>
                <p className="text-sm font-sora font-bold" style={{ color: '#EF4444' }}>{e.amount.toFixed(0)} ر.س</p>
                <button onClick={() => deleteExpense(e.id)} disabled={deleting === e.id} className="text-slate-600 hover:text-red-400 transition-colors">
                  {deleting === e.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add expense modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-sm p-6 rounded-2xl" style={{ background: '#0D1422', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white font-cairo">إضافة مصروف</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-tajawal mb-1.5 block">المبلغ (ر.س) *</label>
                <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" min={0} className="w-full px-4 py-2.5 rounded-xl text-sm font-sora text-white placeholder-slate-600 outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} dir="ltr" />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-tajawal mb-1.5 block">الفئة</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(c => (
                    <button key={c.value} onClick={() => setForm(f => ({ ...f, category: c.value }))} className="py-2 rounded-xl text-xs font-tajawal transition-all" style={{ background: form.category === c.value ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)', border: `1px solid ${form.category === c.value ? '#6366F1' : 'rgba(255,255,255,0.1)'}`, color: form.category === c.value ? '#A5B4FC' : '#94A3B8' }}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-tajawal mb-1.5 block">وصف (اختياري)</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="تفاصيل المصروف..." className="w-full px-4 py-2.5 rounded-xl text-sm font-tajawal text-white placeholder-slate-600 outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-tajawal text-slate-400" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>إلغاء</button>
              <button onClick={addExpense} disabled={saving || !form.amount || Number(form.amount) <= 0} className="flex-1 py-2.5 rounded-xl text-sm font-tajawal text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {saving ? 'جاري الحفظ...' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
