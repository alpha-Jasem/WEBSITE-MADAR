import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Trophy, Car, Loader2, X, Check, AlertTriangle, Users } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { usePlanGate } from '../../../hooks/usePlanGate'
import { FeatureLock } from '../../dash/FeatureLock'
import { logAudit } from '../../../lib/auditLog'
import type { CWWorker, CommissionType, SalaryType } from '../../../types'
import { ClientButton, ClientPageHeader } from './ClientUI'

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
  const [formError, setFormError] = useState('')
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

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setFormError(''); setShowForm(true) }
  const openEdit = (w: CWWorker) => {
    setEditing(w)
    setFormError('')
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
    setFormError('')
    const payload = {
      name: form.name.trim(),
      phone: form.phone || null,
      salary_type: form.salary_type,
      fixed_salary: Number(form.fixed_salary),
      commission_type: form.commission_type,
      commission_value: Number(form.commission_value),
    }
    const basicPayload = {
      name: payload.name,
      phone: payload.phone,
      commission_type: payload.commission_type,
      commission_value: payload.commission_value,
    }

    let result
    if (editing) {
      result = await supabase.from('cw_workers').update(payload).eq('id', editing.id).select().single()
      if (result.error && /salary_type|fixed_salary|schema cache|column/i.test(result.error.message)) {
        result = await supabase.from('cw_workers').update(basicPayload).eq('id', editing.id).select().single()
      }
      if (result.error) {
        setFormError(result.error.message || 'تعذر حفظ الموظف. حاول مرة ثانية.')
        setSaving(false)
        return
      }
      logAudit(companyId, 'worker_updated', { entityType: 'cw_workers', entityId: editing.id, newValue: payload })
    } else {
      result = await supabase.from('cw_workers').insert({ ...payload, company_id: companyId }).select().single()
      if (result.error && /salary_type|fixed_salary|schema cache|column/i.test(result.error.message)) {
        result = await supabase.from('cw_workers').insert({ ...basicPayload, company_id: companyId }).select().single()
      }
      if (result.error) {
        setFormError(result.error.message || 'تعذر إضافة الموظف. حاول مرة ثانية.')
        setSaving(false)
        return
      }
      if (result.data) logAudit(companyId, 'worker_updated', { entityType: 'cw_workers', entityId: result.data.id, newValue: payload })
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
  const assignedDelivered = stats.reduce((sum, item) => sum + item.carsToday, 0)
  const totalDelivered = assignedDelivered + unassignedDelivered
  const assignmentRate = totalDelivered > 0 ? Math.round((assignedDelivered / totalDelivered) * 100) : 100
  const formatPhone = (phone: string | null | undefined) => {
    if (!phone) return null
    const p = phone.trim()
    if (p.startsWith('966') && p.length === 12) return '0' + p.slice(3)
    if (p.startsWith('+966') && p.length === 13) return '0' + p.slice(4)
    return p
  }

  const avatarColors = ['#6366F1', '#0EA5A5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

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

      {/* Workers grid */}
      {workers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: '#FFFFFF', border: '2px dashed #E2E8F0', borderRadius: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Users size={28} color="#A5B4FC" />
          </div>
          <p style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 800, fontSize: 15, color: '#1E293B', margin: '0 0 6px' }}>لا يوجد موظفون بعد</p>
          <p style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 13, color: '#94A3B8', margin: '0 0 18px' }}>أضف الفريق حتى تظهر العمولات والأداء اليومي</p>
          <ClientButton onClick={openAdd}><Plus size={15} /> أضف أول موظف</ClientButton>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workers.map((w, idx) => {
            const s = getWorkerStats(w.id)
            const r = rank(w.id)
            const avatarColor = avatarColors[idx % avatarColors.length]
            const initials = w.name.trim().split(' ').map(n => n[0]).slice(0, 2).join('')
            const phoneDisplay = formatPhone(w.phone)
            const avgCar = s.carsToday > 0 ? Math.round(s.revenueToday / s.carsToday) : 0
            return (
              <div key={w.id} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div style={{ padding: '16px 18px', background: `${avatarColor}08`, borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 46, height: 46, borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 12px ${avatarColor}44` }}>
                    <span style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 900, fontFamily: 'Cairo, sans-serif' }}>{initials || '👤'}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <p style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 800, fontSize: 15, color: '#0F172A', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.name}</p>
                      {can.workerRanking && r === 1 && <Trophy size={13} style={{ color: '#F59E0B', flexShrink: 0 }} />}
                    </div>
                    {phoneDisplay && (
                      <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 12, color: '#64748B', margin: '2px 0 0', direction: 'ltr', textAlign: 'right' }}>📞 {phoneDisplay}</p>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div style={{ padding: '12px 18px', flex: 1 }}>
                  {can.workerRanking ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        { label: 'سيارات اليوم', value: String(s.carsToday), color: '#6366F1', icon: Car },
                        { label: 'الإيراد', value: `${s.revenueToday.toFixed(0)} ر.س`, color: '#0284C7', icon: null },
                        { label: 'العمولة', value: `${s.commissionToday.toFixed(0)} ر.س`, color: '#10B981', icon: null },
                        { label: 'متوسط السيارة', value: `${avgCar} ر.س`, color: '#D97706', icon: null },
                      ].map(item => (
                        <div key={item.label} style={{ padding: '10px 12px', borderRadius: 12, background: `${item.color}08`, border: `1px solid ${item.color}18`, textAlign: 'center' }}>
                          <p style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 15, color: item.color, margin: '0 0 3px' }}>{item.value}</p>
                          <p style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 11, color: '#94A3B8', margin: 0 }}>{item.label}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '8px 0', color: '#94A3B8', fontSize: 12, fontFamily: 'Tajawal, sans-serif', textAlign: 'center' }}>
                      الإحصائيات متوفرة في باقة Pro
                    </div>
                  )}
                  <div style={{ marginTop: 10, padding: '6px 10px', borderRadius: 8, background: '#F8FAFC', fontSize: 11, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>
                    <span style={{ fontWeight: 700, color: '#334155' }}>الراتب: </span>
                    {w.salary_type === 'fixed'
                      ? `${w.fixed_salary} ر.س / شهر`
                      : w.salary_type === 'mixed'
                      ? `${w.fixed_salary} ر.س + ${w.commission_type === 'fixed' ? `${w.commission_value} ر.س / سيارة` : `${w.commission_value}%`}`
                      : w.commission_type === 'fixed' ? `${w.commission_value} ر.س / سيارة` : `${w.commission_value}% من السعر`}
                  </div>
                </div>

                {/* Footer actions */}
                <div style={{ padding: '10px 18px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => openEdit(w)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#475569', fontSize: 12, fontFamily: 'Cairo, sans-serif', fontWeight: 700, cursor: 'pointer' }}
                  >
                    <Pencil size={13} /> تعديل
                  </button>
                  <button
                    onClick={() => deactivate(w.id)}
                    disabled={deletingId === w.id}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 10, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 12, fontFamily: 'Cairo, sans-serif', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {deletingId === w.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} حذف
                  </button>
                </div>
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
              {formError && (
                <div className="rounded-xl px-3 py-2 text-xs font-bold font-tajawal" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C' }}>
                  {formError}
                </div>
              )}
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
