import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Trophy, Car, Loader2, X, Check, AlertTriangle, Users } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { usePlanGate } from '../../../hooks/usePlanGate'
import { FeatureLock } from '../../dash/FeatureLock'
import { logAudit } from '../../../lib/auditLog'
import type { CWWorker, CommissionType, SalaryType } from '../../../types'
import { ClientButton, ClientEmptyState, ClientInsightPanel, ClientPageHeader } from './ClientUI'

interface WorkerStats {
  workerId: string
  carsToday: number
  commissionToday: number
  revenueToday: number
}

const EMPTY_FORM = {
  name: '',
  phone: '',
  salary_type: 'commission' as SalaryType,
  fixed_salary: 0,
  commission_type: 'fixed' as CommissionType,
  commission_value: 5,
}

export const CarWashWorkers = () => {
  const { companyId, company, loading: authLoading } = useClientCompany()
  const { can, planLabel } = usePlanGate()
  const [workers, setWorkers] = useState<CWWorker[]>([])
  const [stats, setStats] = useState<WorkerStats[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<CWWorker | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [unassignedDelivered, setUnassignedDelivered] = useState(0)

  const loadData = async () => {
    if (!companyId) return
    setLoading(true)

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [{ data: w }, { data: queue }] = await Promise.all([
      supabase.from('cw_workers').select('*').eq('company_id', companyId).eq('active', true).order('created_at'),
      supabase.from('cw_queue')
        .select('worker_id, price, subtotal, status')
        .eq('company_id', companyId)
        .eq('status', 'delivered')
        .gte('delivered_at', todayStart.toISOString()),
    ])

    const workersData = w || []
    setWorkers(workersData)
    setUnassignedDelivered((queue || []).filter(item => !item.worker_id).length)

    const statsMap: Record<string, WorkerStats> = {}
    for (const item of queue || []) {
      if (!item.worker_id) continue
      if (!statsMap[item.worker_id]) {
        statsMap[item.worker_id] = { workerId: item.worker_id, carsToday: 0, commissionToday: 0, revenueToday: 0 }
      }
      statsMap[item.worker_id].carsToday += 1
      const itemRevenue = item.subtotal ?? item.price ?? 0
      statsMap[item.worker_id].revenueToday += itemRevenue
      const worker = workersData.find(w => w.id === item.worker_id)
      if (worker) {
        const commission = worker.commission_type === 'fixed'
          ? worker.commission_value
          : (itemRevenue * worker.commission_value) / 100
        statsMap[item.worker_id].commissionToday += commission
      }
    }
    setStats(Object.values(statsMap).sort((a, b) => b.carsToday - a.carsToday))
    setLoading(false)
  }

  useEffect(() => {
    if (!authLoading && companyId) loadData()
  }, [authLoading, companyId])

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true) }
  const openEdit = (w: CWWorker) => {
    setEditing(w)
    setForm({
      name: w.name,
      phone: w.phone || '',
      salary_type: w.salary_type || 'commission',
      fixed_salary: w.fixed_salary || 0,
      commission_type: w.commission_type,
      commission_value: w.commission_value,
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!companyId || !form.name.trim()) return
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      phone: form.phone || null,
      salary_type: form.salary_type,
      fixed_salary: Number(form.fixed_salary),
      commission_type: form.commission_type,
      commission_value: Number(form.commission_value),
    }
    if (editing) {
      await supabase.from('cw_workers').update(payload).eq('id', editing.id)
      logAudit(companyId, 'worker_updated', { entityType: 'cw_workers', entityId: editing.id, newValue: payload })
    } else {
      const { data: inserted } = await supabase.from('cw_workers').insert({ ...payload, company_id: companyId }).select().single()
      if (inserted) logAudit(companyId, 'worker_updated', { entityType: 'cw_workers', entityId: inserted.id, newValue: payload })
    }
    setShowForm(false)
    setSaving(false)
    loadData()
  }

  const deactivate = async (id: string) => {
    setDeletingId(id)
    await supabase.from('cw_workers').update({ active: false }).eq('id', id)
    setDeletingId(null)
    loadData()
  }

  const getWorkerStats = (id: string) => stats.find(s => s.workerId === id) || { carsToday: 0, commissionToday: 0, revenueToday: 0 }
  const rank = (id: string) => { const i = stats.findIndex(s => s.workerId === id); return i === -1 ? null : i + 1 }
  const bestStats = stats[0]
  const bestWorker = bestStats ? workers.find(w => w.id === bestStats.workerId) : null
  const assignedDelivered = stats.reduce((sum, item) => sum + item.carsToday, 0)
  const totalDelivered = assignedDelivered + unassignedDelivered
  const assignmentRate = totalDelivered > 0 ? Math.round((assignedDelivered / totalDelivered) * 100) : 100
  const workerInsights = [
    bestWorker
      ? { title: 'أفضل أداء اليوم', description: `${bestWorker.name} متصدر بعدد ${bestStats.carsToday} سيارة. استخدمه كمرجع للوردية.`, tone: 'green' as const }
      : { title: 'لا يوجد أداء مسجل بعد', description: 'بعد أول تسليم مربوط بموظف ستظهر المقارنة تلقائياً.', tone: 'slate' as const },
    unassignedDelivered > 0
      ? { title: 'أصلح الربط الآن', description: `${unassignedDelivered} سيارة مسلمة بدون موظف. هذا يخرب العمولات والتقييمات.`, tone: 'red' as const }
      : { title: 'الربط جيد', description: 'كل السيارات المسلمة مربوطة بموظفين، وهذا يجعل الأداء قابل للقياس.', tone: 'green' as const },
    totalDelivered > 0
      ? { title: 'دقة توزيع العمل', description: `نسبة السيارات المرتبطة بموظف اليوم ${assignmentRate}%. الهدف التشغيلي 95% أو أعلى.`, tone: assignmentRate >= 95 ? 'green' as const : 'amber' as const }
      : { title: 'ابدأ القياس من أول تسليم', description: 'كل سيارة يجب أن تحمل موظفًا مسؤولًا حتى يظهر الأداء الحقيقي.', tone: 'blue' as const },
    workers.length > 0
      ? { title: 'جهّز تقييم العميل', description: 'المرحلة التالية الأفضل: ربط تقييم 5 نجوم بعد التسليم باسم الموظف المسؤول.', tone: 'blue' as const }
      : { title: 'أضف الفريق أولاً', description: 'بدون موظفين لا يمكن قياس الأداء أو العمولات أو جودة الخدمة.', tone: 'amber' as const },
  ]

  if (authLoading || loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <Loader2 size={20} className="animate-spin text-primary-400" />
      <p className="text-slate-500 font-tajawal text-sm">جاري تحميل الموظفين...</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <ClientPageHeader
        eyebrow="فريق التشغيل"
        title="الموظفون"
        description="أداء اليوم، السيارات المنجزة، العمولات، والتنبيه عند وجود سيارات غير مربوطة بموظف."
        actions={<ClientButton onClick={openAdd}><Plus size={16} /> إضافة موظف</ClientButton>}
      />

      {unassignedDelivered > 0 && (
        <div className="flex items-start gap-3 rounded-2xl p-4" style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}>
          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" style={{ color: '#B45309' }} />
          <div>
            <p className="text-sm font-bold font-cairo" style={{ color: '#92400E' }}>يوجد {unassignedDelivered} سيارة مُسلّمة بدون موظف</p>
            <p className="mt-1 text-xs font-tajawal" style={{ color: '#B45309' }}>اربطها بموظف من لوحة التشغيل حتى تكون العمولات وتقييم الأداء دقيقة.</p>
          </div>
        </div>
      )}

      <ClientInsightPanel
        title="تحسين أداء الفريق"
        description="هذه التوصيات تساعد المالك يعرف من يعمل جيداً وأين تضيع دقة الحسابات."
        items={workerInsights}
      />

      {/* Workers grid */}
      {workers.length === 0 ? (
        <ClientEmptyState
          icon={Users}
          title="لا يوجد موظفون بعد"
          description="أضف الفريق حتى تظهر العمولات والأداء اليومي بشكل صحيح."
          action={<ClientButton onClick={openAdd}><Plus size={16} /> أضف أول موظف</ClientButton>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workers.map((w) => {
            const s = getWorkerStats(w.id)
            const r = rank(w.id)
            return (
              <div key={w.id} className="p-5 rounded-2xl relative" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                {can.workerRanking && r === 1 && (
                  <div className="absolute top-3 left-3">
                    <Trophy size={16} style={{ color: '#F59E0B' }} />
                  </div>
                )}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-slate-900 font-bold font-cairo text-base">{w.name}</p>
                    {w.phone && <p className="text-slate-500 text-xs font-tajawal mt-0.5">{w.phone}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(w)} title="تعديل الموظف" aria-label={`تعديل ${w.name}`} className="p-1.5 rounded-lg hover:bg-sky-50 text-slate-400 hover:text-sky-600 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => deactivate(w.id)} title="إلغاء تفعيل الموظف" aria-label={`إلغاء تفعيل ${w.name}`} disabled={deletingId === w.id} className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors">
                      {deletingId === w.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>

                {can.workerRanking && (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                        <Car size={14} style={{ color: '#6366F1', margin: '0 auto 4px' }} />
                        <p className="text-xl font-bold font-sora text-slate-900">{s.carsToday}</p>
                        <p className="text-xs text-slate-500 font-tajawal">سيارة اليوم</p>
                      </div>
                      <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <p className="text-xl font-bold font-sora" style={{ color: '#10B981' }}>{s.commissionToday.toFixed(0)}</p>
                        <p className="text-xs text-slate-500 font-tajawal">ر.س عمولة</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.18)' }}>
                        <p className="text-lg font-bold font-sora" style={{ color: '#0284C7' }}>{s.revenueToday.toFixed(0)}</p>
                        <p className="text-xs text-slate-500 font-tajawal">ر.س مبيعات</p>
                      </div>
                      <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)' }}>
                        <p className="text-lg font-bold font-sora" style={{ color: '#D97706' }}>{s.carsToday > 0 ? Math.round(s.revenueToday / s.carsToday) : 0}</p>
                        <p className="text-xs text-slate-500 font-tajawal">متوسط السيارة</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-tajawal">الراتب:</span>
                      <span className="text-xs font-tajawal text-slate-700">
                        {w.salary_type === 'fixed'
                          ? `${w.fixed_salary} ر.س / شهر`
                          : w.salary_type === 'mixed'
                          ? `${w.fixed_salary} ر.س + ${w.commission_type === 'fixed' ? `${w.commission_value} ر.س / سيارة` : `${w.commission_value}%`}`
                          : w.commission_type === 'fixed' ? `${w.commission_value} ر.س / سيارة` : `${w.commission_value}% من السعر`}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Performance section — Pro feature */}
      {!can.workerRanking && workers.length > 0 && (
        <FeatureLock
          locked={true}
          requiredPlan="pro"
          featureName="أداء الموظفين والعمولات"
          benefit="تتبع إنتاجية كل موظف، عدد السيارات، والعمولات اليومية — احفّز فريقك بالبيانات"
          companyName={company?.name}
          currentPlan={planLabel}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workers.slice(0, 3).map(w => (
              <div key={w.id} className="p-5 rounded-2xl" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <p className="text-slate-900 font-bold font-cairo text-base mb-4">{w.name}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <p className="text-xl font-bold font-sora text-slate-900">—</p>
                    <p className="text-xs text-slate-500 font-tajawal">سيارة اليوم</p>
                  </div>
                  <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <p className="text-xl font-bold font-sora" style={{ color: '#10B981' }}>—</p>
                    <p className="text-xs text-slate-500 font-tajawal">ر.س عمولة</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </FeatureLock>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div role="dialog" aria-modal="true" aria-label="Worker form" className="w-full max-w-md p-6 rounded-2xl shadow-2xl" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900 font-cairo">{editing ? 'تعديل موظف' : 'إضافة موظف'}</h2>
              <button aria-label="Close dialog" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-900"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 font-tajawal mb-1.5 block">الاسم *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="اسم الموظف" className="w-full px-4 py-2.5 rounded-xl text-sm font-tajawal text-slate-900 placeholder-slate-400 outline-none focus:border-sky-400" style={{ background: '#F8FAFC', border: '1px solid #CBD5E1' }} />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-tajawal mb-1.5 block">رقم الجوال</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="05xxxxxxxx" className="w-full px-4 py-2.5 rounded-xl text-sm font-sora text-slate-900 placeholder-slate-400 outline-none focus:border-sky-400" style={{ background: '#F8FAFC', border: '1px solid #CBD5E1' }} dir="ltr" />
              </div>

              {/* Salary type */}
              <div>
                <label className="text-xs text-slate-500 font-tajawal mb-1.5 block">نوع الراتب</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['fixed', 'commission', 'mixed'] as SalaryType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setForm(f => ({ ...f, salary_type: t }))}
                      className="py-2.5 rounded-xl text-xs font-tajawal transition-all"
                      style={{
                        background: form.salary_type === t ? 'rgba(99,102,241,0.3)' : '#FFFFFF',
                        border: `1px solid ${form.salary_type === t ? '#6366F1' : '#E2E8F0'}`,
                        color: form.salary_type === t ? '#A5B4FC' : '#94A3B8',
                      }}
                    >
                      {t === 'fixed' ? 'ثابت' : t === 'commission' ? 'عمولة' : 'مختلط'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fixed salary */}
              {(form.salary_type === 'fixed' || form.salary_type === 'mixed') && (
                <div>
                  <label className="text-xs text-slate-500 font-tajawal mb-1.5 block">الراتب الثابت (ر.س / شهر)</label>
                  <input
                    type="number"
                    value={form.fixed_salary}
                    onChange={e => setForm(f => ({ ...f, fixed_salary: Number(e.target.value) }))}
                    min={0}
                    className="w-full px-4 py-2.5 rounded-xl text-sm font-sora text-slate-900 outline-none focus:border-sky-400"
                    style={{ background: '#F8FAFC', border: '1px solid #CBD5E1' }}
                    dir="ltr"
                  />
                </div>
              )}

              {/* Commission fields */}
              {(form.salary_type === 'commission' || form.salary_type === 'mixed') && (
                <>
                  <div>
                    <label className="text-xs text-slate-500 font-tajawal mb-1.5 block">نوع العمولة</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['fixed', 'percentage'] as CommissionType[]).map(t => (
                        <button
                          key={t}
                          onClick={() => setForm(f => ({ ...f, commission_type: t }))}
                          className="py-2.5 rounded-xl text-sm font-tajawal transition-all"
                          style={{
                            background: form.commission_type === t ? 'rgba(99,102,241,0.3)' : '#FFFFFF',
                            border: `1px solid ${form.commission_type === t ? '#6366F1' : '#E2E8F0'}`,
                            color: form.commission_type === t ? '#A5B4FC' : '#94A3B8',
                          }}
                        >
                          {t === 'fixed' ? 'ثابت / سيارة' : 'نسبة مئوية'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-tajawal mb-1.5 block">
                      {form.commission_type === 'fixed' ? 'قيمة العمولة (ر.س / سيارة)' : 'نسبة العمولة (%)'}
                    </label>
                    <input
                      type="number"
                      value={form.commission_value}
                      onChange={e => setForm(f => ({ ...f, commission_value: Number(e.target.value) }))}
                      min={0}
                      className="w-full px-4 py-2.5 rounded-xl text-sm font-sora text-slate-900 outline-none focus:border-sky-400"
                      style={{ background: '#F8FAFC', border: '1px solid #CBD5E1' }}
                      dir="ltr"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-tajawal text-slate-600" style={{ background: '#F8FAFC', border: '1px solid #CBD5E1' }}>إلغاء</button>
              <button onClick={save} disabled={saving || !form.name.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-tajawal text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
