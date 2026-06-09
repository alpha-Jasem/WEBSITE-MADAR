import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Clock, Phone, Search, CheckCircle2, XCircle, AlertCircle, Loader2, Plus, User, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'

interface Appointment {
  id: string
  customer_name: string
  customer_phone: string | null
  service_name: string | null
  resource_name: string | null
  scheduled_at: string | null
  status: string | null
  duration_minutes: number | null
  notes: string | null
  source: string | null
  company_id: string | null
  branch_id: string | null
}

interface WbosService { id: string; name: string; duration_minutes: number | null }
interface WbosResource { id: string; name: string }

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  confirmed:  { label: 'مؤكد',       color: '#4F6EF7', bg: 'rgba(79,110,247,0.12)',  icon: AlertCircle  },
  done:       { label: 'مكتمل',      color: '#10B981', bg: 'rgba(16,185,129,0.12)',  icon: CheckCircle2 },
  cancelled:  { label: 'ملغى',       color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   icon: XCircle      },
  no_show:    { label: 'لم يحضر',    color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  icon: AlertCircle  },
  pending:    { label: 'في الانتظار',color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: Clock        },
}

const ALL_STATUSES = Object.keys(STATUS_CONFIG) as (keyof typeof STATUS_CONFIG)[]

function formatDate(d: string | null) {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric', month: 'long' }) +
    ' — ' + dt.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function StatusBadge({ status }: { status: string | null }) {
  const cfg = STATUS_CONFIG[status ?? ''] ?? { label: status ?? '—', color: '#64748b', bg: 'rgba(100,116,139,0.12)', icon: AlertCircle }
  const Icon = cfg.icon
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-tajawal font-medium"
      style={{ color: cfg.color, background: cfg.bg }}>
      <Icon size={10} />
      {cfg.label}
    </span>
  )
}

function NewAppointmentModal({
  companyId, branchId, onClose, onSaved
}: {
  companyId: string; branchId: string | null; onClose: () => void; onSaved: () => void
}) {
  const [services, setServices] = useState<WbosService[]>([])
  const [resources, setResources] = useState<WbosResource[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    service_id: '',
    resource_id: '',
    date: '',
    time: '',
    notes: '',
  })

  useEffect(() => {
    if (!branchId) return
    supabase.from('wbos_services').select('id, name, duration_minutes').eq('branch_id', branchId).eq('is_active', true)
      .then(({ data }) => setServices(data ?? []))
    supabase.from('wbos_resources').select('id, name').eq('branch_id', branchId).eq('is_active', true)
      .then(({ data }) => setResources(data ?? []))
  }, [branchId])

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const save = async () => {
    if (!form.customer_name || !form.date || !form.time) return
    setSaving(true)

    const selectedService = services.find(s => s.id === form.service_id)
    const selectedResource = resources.find(r => r.id === form.resource_id)
    const scheduled_at = new Date(`${form.date}T${form.time}`).toISOString()

    await supabase.from('appointments').insert({
      customer_name: form.customer_name,
      customer_phone: form.customer_phone || null,
      service_name: selectedService?.name ?? null,
      resource_name: selectedResource?.name ?? null,
      scheduled_at,
      duration_minutes: selectedService?.duration_minutes ?? null,
      notes: form.notes || null,
      status: 'confirmed',
      source: 'manual',
      company_id: companyId,
      branch_id: branchId,
    })

    setSaving(false)
    onSaved()
    onClose()
  }

  const inputClass = "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/50 font-tajawal"
  const labelClass = "block text-xs text-slate-500 font-tajawal mb-1.5"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl p-6 relative"
        style={{ background: '#FFFFFF', border: '1px solid #CBD5E1' }}
        dir="rtl">

        <button onClick={onClose}
          className="absolute top-4 left-4 w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] cursor-pointer transition-all">
          <X size={16} />
        </button>

        <h2 className="text-lg font-bold text-white font-cairo mb-5">موعد جديد</h2>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>اسم العميل *</label>
              <input value={form.customer_name} onChange={e => set('customer_name', e.target.value)}
                placeholder="محمد أحمد" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>رقم الهاتف</label>
              <input value={form.customer_phone} onChange={e => set('customer_phone', e.target.value)}
                placeholder="05xxxxxxxx" className={inputClass} dir="ltr" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>الخدمة</label>
              <select value={form.service_id} onChange={e => set('service_id', e.target.value)} className={inputClass}>
                <option value="">— اختر —</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>الموظف</label>
              <select value={form.resource_id} onChange={e => set('resource_id', e.target.value)} className={inputClass}>
                <option value="">— اختر —</option>
                {resources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>التاريخ *</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inputClass} dir="ltr" />
            </div>
            <div>
              <label className={labelClass}>الوقت *</label>
              <input type="time" value={form.time} onChange={e => set('time', e.target.value)} className={inputClass} dir="ltr" />
            </div>
          </div>

          <div>
            <label className={labelClass}>ملاحظات</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="أي تفاصيل إضافية..." rows={2}
              className={`${inputClass} resize-none`} />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-tajawal text-slate-400 hover:text-white cursor-pointer transition-all"
            style={{ border: '1px solid #E2E8F0' }}>
            إلغاء
          </button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={save} disabled={saving || !form.customer_name || !form.date || !form.time}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold font-cairo text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #4F6EF7, #7C3AED)' }}>
            {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'حفظ الموعد'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

export const ClientAppointments = () => {
  const { companyId, loading: authLoading } = useClientCompany()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [branchId, setBranchId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)

  const load = async () => {
    if (!companyId) return
    setLoading(true)

    const { data: branch } = await supabase.from('branches').select('id').eq('company_id', companyId).maybeSingle()
    if (branch) setBranchId(branch.id)

    const { data } = await supabase.from('appointments').select('*').order('scheduled_at', { ascending: false })
    setAppointments((data ?? []).filter((a: Appointment) => a.company_id === companyId || !a.company_id))
    setLoading(false)
  }

  useEffect(() => { if (!authLoading) load() }, [authLoading, companyId])

  useEffect(() => {
    const ch = supabase.channel('apt_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [companyId])

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id)
    const extra = status === 'done' ? { completed_at: new Date().toISOString() } : {}
    const { data } = await supabase.from('appointments').update({ status, ...extra }).eq('id', id).select().single()
    if (data) setAppointments(prev => prev.map(a => a.id === id ? data : a))
    setUpdatingId(null)
  }

  const filtered = appointments.filter(a => {
    const q = search.toLowerCase()
    const matchSearch = !q || (a.customer_name?.toLowerCase().includes(q) ?? false) ||
      (a.customer_phone?.includes(q) ?? false) || (a.service_name?.toLowerCase().includes(q) ?? false)
    const matchStatus = statusFilter === 'all' || a.status === statusFilter
    return matchSearch && matchStatus
  })

  const todayStr = new Date().toISOString().slice(0, 10)
  const todayCount = appointments.filter(a => a.scheduled_at?.startsWith(todayStr)).length
  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length
  const doneCount = appointments.filter(a => a.status === 'done').length


  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white font-cairo">المواعيد</h1>
            <p className="text-sm text-slate-500 font-tajawal">{appointments.length} موعد إجمالي</p>
          </div>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer font-cairo"
            style={{ background: 'linear-gradient(135deg, #4F6EF7, #7C3AED)' }}>
            <Plus size={15} />
            موعد جديد
          </motion.button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'اليوم',   value: todayCount,    color: '#4F6EF7' },
            { label: 'مؤكدة',   value: confirmedCount, color: '#8B5CF6' },
            { label: 'مكتملة', value: doneCount,      color: '#10B981' },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-xl text-center"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <p className="text-2xl font-black font-work" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-slate-500 font-tajawal mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} dir="rtl"
              placeholder="ابحث باسم العميل أو رقمه أو الخدمة..."
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-2.5 pr-9 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/40 font-tajawal" />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            <button onClick={() => setStatusFilter('all')}
              className={`px-3 py-2 rounded-lg text-xs font-tajawal cursor-pointer transition-all whitespace-nowrap ${statusFilter === 'all' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}>
              الكل
            </button>
            {ALL_STATUSES.map(s => {
              const cfg = STATUS_CONFIG[s]
              return (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className="px-3 py-2 rounded-lg text-xs font-tajawal cursor-pointer transition-all whitespace-nowrap"
                  style={{
                    background: statusFilter === s ? cfg.bg : 'transparent',
                    color: statusFilter === s ? cfg.color : '#64748b',
                  }}>
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Calendar size={36} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-600 font-tajawal text-sm">لا توجد مواعيد</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {filtered.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors">

                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #4F6EF7, #7C3AED)' }}>
                    {a.customer_name?.[0] ?? '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold text-white font-tajawal truncate">{a.customer_name}</p>
                      {a.source === 'whatsapp' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full text-emerald-400 font-work"
                          style={{ background: 'rgba(16,185,129,0.12)' }}>WA</span>
                      )}
                      {a.source === 'manual' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full text-slate-400 font-work"
                          style={{ background: 'rgba(100,116,139,0.12)' }}>يدوي</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {a.service_name && (
                        <span className="text-xs text-slate-400 font-tajawal">{a.service_name}</span>
                      )}
                      {a.resource_name && (
                        <span className="flex items-center gap-1 text-xs text-slate-500 font-tajawal">
                          <User size={10} className="text-slate-600" /> {a.resource_name}
                        </span>
                      )}
                      {a.customer_phone && (
                        <span className="flex items-center gap-1 text-xs text-slate-600 font-work">
                          <Phone size={9} /> {a.customer_phone}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right hidden sm:block">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-tajawal justify-end">
                      <Calendar size={11} className="text-slate-600" />
                      {formatDate(a.scheduled_at)}
                    </div>
                    {a.duration_minutes && (
                      <div className="flex items-center gap-1 text-xs text-slate-600 font-tajawal justify-end mt-0.5">
                        <Clock size={10} /> {a.duration_minutes} دقيقة
                      </div>
                    )}
                  </div>

                  <StatusBadge status={a.status} />

                  <div className="flex items-center gap-1.5">
                    {a.status === 'confirmed' && (
                      <>
                        <button onClick={() => updateStatus(a.id, 'done')} disabled={updatingId === a.id}
                          title="تم بنجاح"
                          className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all hover:bg-emerald-500/20"
                          style={{ color: '#10B981' }}>
                          {updatingId === a.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        </button>
                        <button onClick={() => updateStatus(a.id, 'no_show')} disabled={updatingId === a.id}
                          title="لم يحضر"
                          className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all hover:bg-yellow-500/20"
                          style={{ color: '#F59E0B' }}>
                          <AlertCircle size={14} />
                        </button>
                        <button onClick={() => updateStatus(a.id, 'cancelled')} disabled={updatingId === a.id}
                          title="إلغاء"
                          className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all hover:bg-red-500/20"
                          style={{ color: '#EF4444' }}>
                          <XCircle size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showNew && companyId && (
          <NewAppointmentModal
            companyId={companyId}
            branchId={branchId}
            onClose={() => setShowNew(false)}
            onSaved={load}
          />
        )}
      </AnimatePresence>
    </>
  )
}
