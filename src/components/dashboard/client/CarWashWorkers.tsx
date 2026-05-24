import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Trophy, Car, Loader2, X, Check } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { usePlanGate } from '../../../hooks/usePlanGate'
import { FeatureLock } from '../../dash/FeatureLock'
import { logAudit } from '../../../lib/auditLog'
import type { CWWorker, CommissionType, SalaryType } from '../../../types'

interface WorkerStats {
  workerId: string
  carsToday: number
  commissionToday: number
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

  const loadData = async () => {
    if (!companyId) return
    setLoading(true)

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [{ data: w }, { data: queue }] = await Promise.all([
      supabase.from('cw_workers').select('*').eq('company_id', companyId).eq('active', true).order('created_at'),
      supabase.from('cw_queue')
        .select('worker_id, price, status')
        .eq('company_id', companyId)
        .eq('status', 'delivered')
        .gte('delivered_at', todayStart.toISOString()),
    ])

    const workersData = w || []
    setWorkers(workersData)

    const statsMap: Record<string, WorkerStats> = {}
    for (const item of queue || []) {
      if (!item.worker_id) continue
      if (!statsMap[item.worker_id]) {
        statsMap[item.worker_id] = { workerId: item.worker_id, carsToday: 0, commissionToday: 0 }
      }
      statsMap[item.worker_id].carsToday += 1
      const worker = workersData.find(w => w.id === item.worker_id)
      if (worker) {
        const commission = worker.commission_type === 'fixed'
          ? worker.commission_value
          : (item.price * worker.commission_value) / 100
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

  const getWorkerStats = (id: string) => stats.find(s => s.workerId === id) || { carsToday: 0, commissionToday: 0 }
  const rank = (id: string) => { const i = stats.findIndex(s => s.workerId === id); return i === -1 ? null : i + 1 }

  if (authLoading || loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <Loader2 size={20} className="animate-spin text-primary-400" />
      <p className="text-slate-500 font-tajawal text-sm">جاري تحميل الموظفين...</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-cairo">الموظفون</h1>
          <p className="text-sm text-slate-500 font-tajawal">أداء اليوم والعمولات</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-tajawal font-medium text-white" style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
          <Plus size={16} /> إضافة موظف
        </button>
      </div>

      {/* Workers grid */}
      {workers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 }}>
          <p className="text-slate-500 font-tajawal text-sm">لا يوجد موظفون بعد</p>
          <button onClick={openAdd} className="text-primary-400 text-sm font-tajawal underline">أضف أول موظف</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workers.map((w) => {
            const s = getWorkerStats(w.id)
            const r = rank(w.id)
            return (
              <div key={w.id} className="p-5 rounded-2xl relative" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {can.workerRanking && r === 1 && (
                  <div className="absolute top-3 left-3">
                    <Trophy size={16} style={{ color: '#F59E0B' }} />
                  </div>
                )}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-white font-bold font-cairo text-base">{w.name}</p>
                    {w.phone && <p className="text-slate-500 text-xs font-tajawal mt-0.5">{w.phone}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(w)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => deactivate(w.id)} disabled={deletingId === w.id} className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors">
                      {deletingId === w.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>

                {can.workerRanking && (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                        <Car size={14} style={{ color: '#6366F1', margin: '0 auto 4px' }} />
                        <p className="text-xl font-bold font-sora text-white">{s.carsToday}</p>
                        <p className="text-xs text-slate-500 font-tajawal">سيارة اليوم</p>
                      </div>
                      <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <p className="text-xl font-bold font-sora" style={{ color: '#10B981' }}>{s.commissionToday.toFixed(0)}</p>
                        <p className="text-xs text-slate-500 font-tajawal">ر.س عمولة</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-tajawal">الراتب:</span>
                      <span className="text-xs font-tajawal text-slate-300">
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
              <div key={w.id} className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-white font-bold font-cairo text-base mb-4">{w.name}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <p className="text-xl font-bold font-sora text-white">—</p>
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
          <div className="w-full max-w-md p-6 rounded-2xl" style={{ background: '#0D1422', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white font-cairo">{editing ? 'تعديل موظف' : 'إضافة موظف'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-tajawal mb-1.5 block">الاسم *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="اسم الموظف" className="w-full px-4 py-2.5 rounded-xl text-sm font-tajawal text-white placeholder-slate-600 outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-tajawal mb-1.5 block">رقم الجوال</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="05xxxxxxxx" className="w-full px-4 py-2.5 rounded-xl text-sm font-sora text-white placeholder-slate-600 outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} dir="ltr" />
              </div>

              {/* Salary type */}
              <div>
                <label className="text-xs text-slate-400 font-tajawal mb-1.5 block">نوع الراتب</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['fixed', 'commission', 'mixed'] as SalaryType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setForm(f => ({ ...f, salary_type: t }))}
                      className="py-2.5 rounded-xl text-xs font-tajawal transition-all"
                      style={{
                        background: form.salary_type === t ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${form.salary_type === t ? '#6366F1' : 'rgba(255,255,255,0.1)'}`,
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
                  <label className="text-xs text-slate-400 font-tajawal mb-1.5 block">الراتب الثابت (ر.س / شهر)</label>
                  <input
                    type="number"
                    value={form.fixed_salary}
                    onChange={e => setForm(f => ({ ...f, fixed_salary: Number(e.target.value) }))}
                    min={0}
                    className="w-full px-4 py-2.5 rounded-xl text-sm font-sora text-white outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    dir="ltr"
                  />
                </div>
              )}

              {/* Commission fields */}
              {(form.salary_type === 'commission' || form.salary_type === 'mixed') && (
                <>
                  <div>
                    <label className="text-xs text-slate-400 font-tajawal mb-1.5 block">نوع العمولة</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['fixed', 'percentage'] as CommissionType[]).map(t => (
                        <button
                          key={t}
                          onClick={() => setForm(f => ({ ...f, commission_type: t }))}
                          className="py-2.5 rounded-xl text-sm font-tajawal transition-all"
                          style={{
                            background: form.commission_type === t ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${form.commission_type === t ? '#6366F1' : 'rgba(255,255,255,0.1)'}`,
                            color: form.commission_type === t ? '#A5B4FC' : '#94A3B8',
                          }}
                        >
                          {t === 'fixed' ? 'ثابت / سيارة' : 'نسبة مئوية'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-tajawal mb-1.5 block">
                      {form.commission_type === 'fixed' ? 'قيمة العمولة (ر.س / سيارة)' : 'نسبة العمولة (%)'}
                    </label>
                    <input
                      type="number"
                      value={form.commission_value}
                      onChange={e => setForm(f => ({ ...f, commission_value: Number(e.target.value) }))}
                      min={0}
                      className="w-full px-4 py-2.5 rounded-xl text-sm font-sora text-white outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                      dir="ltr"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-tajawal text-slate-400" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>إلغاء</button>
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
