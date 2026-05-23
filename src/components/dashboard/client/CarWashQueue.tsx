import { useEffect, useState, useRef } from 'react'
import { Plus, X, Loader2, Clock, ChevronRight, Car } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import type { CWQueueItem, CWWorker, QueueStatus } from '../../../types'

const COLUMNS: { status: QueueStatus; label: string; color: string; bg: string }[] = [
  { status: 'received',  label: 'استلام',   color: '#94A3B8', bg: 'rgba(148,163,184,0.1)' },
  { status: 'washing',   label: 'غسيل',     color: '#4F6EF7', bg: 'rgba(79,110,247,0.1)'  },
  { status: 'drying',    label: 'تجفيف',    color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)'  },
  { status: 'ready',     label: 'جاهزة',    color: '#10B981', bg: 'rgba(16,185,129,0.1)'  },
  { status: 'delivered', label: 'تسليم',    color: '#F59E0B', bg: 'rgba(245,158,11,0.1)'  },
]

const NEXT_STATUS: Partial<Record<QueueStatus, QueueStatus>> = {
  received: 'washing',
  washing:  'drying',
  drying:   'ready',
  ready:    'delivered',
}

function elapsed(created_at: string) {
  const mins = Math.floor((Date.now() - new Date(created_at).getTime()) / 60000)
  if (mins < 60) return `${mins}د`
  return `${Math.floor(mins / 60)}س ${mins % 60}د`
}

const EMPTY_FORM = { customer_name: '', phone: '', car_type: '', service_name: '', price: '', worker_id: '' }

export const CarWashQueue = () => {
  const { companyId, loading: authLoading } = useClientCompany()
  const [items, setItems] = useState<CWQueueItem[]>([])
  const [workers, setWorkers] = useState<CWWorker[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [movingId, setMovingId] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const [services, setServices] = useState<{ name: string; price: number }[]>([])

  const loadItems = async (cid: string) => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('cw_queue')
      .select('*, worker:cw_workers(id, name, commission_type, commission_value)')
      .eq('company_id', cid)
      .neq('status', 'delivered')
      .gte('created_at', todayStart.toISOString())
      .order('created_at')
    setItems((data as CWQueueItem[]) || [])
  }

  useEffect(() => {
    if (authLoading || !companyId) return
    const cid = companyId

    const init = async () => {
      setLoading(true)
      const [, { data: w }, { data: comp }] = await Promise.all([
        loadItems(cid),
        supabase.from('cw_workers').select('*').eq('company_id', cid).eq('active', true).order('name'),
        supabase.from('companies').select('cw_services').eq('id', cid).single(),
      ])
      setWorkers((w || []) as CWWorker[])
      if (comp?.cw_services) setServices(comp.cw_services)
      setLoading(false)
    }
    init()

    channelRef.current = supabase
      .channel(`queue-${cid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cw_queue', filter: `company_id=eq.${cid}` }, () => loadItems(cid))
      .subscribe()

    return () => { channelRef.current?.unsubscribe() }
  }, [authLoading, companyId])

  const addCar = async () => {
    if (!companyId || !form.customer_name.trim()) return
    setSaving(true)
    await supabase.from('cw_queue').insert({
      company_id: companyId,
      customer_name: form.customer_name.trim(),
      phone: form.phone || null,
      car_type: form.car_type || null,
      service_name: form.service_name || null,
      price: Number(form.price) || 0,
      worker_id: form.worker_id || null,
      status: 'received',
    })
    setForm(EMPTY_FORM)
    setShowForm(false)
    setSaving(false)
  }

  const moveNext = async (item: CWQueueItem) => {
    const next = NEXT_STATUS[item.status]
    if (!next) return
    setMovingId(item.id)

    const updates: Record<string, unknown> = { status: next }
    if (item.status === 'washing' && !item.started_at) updates.started_at = new Date().toISOString()
    if (next === 'delivered') {
      updates.delivered_at = new Date().toISOString()
      // Auto-insert into cw_visits
      await supabase.from('cw_visits').insert({
        company_id: item.company_id,
        service_name: item.service_name,
        price: item.price,
        review_request_sent: false,
      })
    }

    await supabase.from('cw_queue').update(updates).eq('id', item.id)
    setMovingId(null)
  }

  const removeItem = async (id: string) => {
    await supabase.from('cw_queue').delete().eq('id', id)
  }

  const colItems = (status: QueueStatus) => items.filter(i => i.status === status)

  if (authLoading || loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <Loader2 size={20} className="animate-spin text-primary-400" />
      <p className="text-slate-500 font-tajawal text-sm">جاري تحميل لوحة التشغيل...</p>
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-cairo">لوحة التشغيل</h1>
          <p className="text-sm text-slate-500 font-tajawal">سيارات اليوم — مباشر</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-tajawal font-medium text-white" style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
          <Plus size={16} /> إضافة سيارة
        </button>
      </div>

      {/* Kanban board */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-4 min-w-max">
          {COLUMNS.map(col => (
            <div key={col.status} className="w-52 flex-shrink-0">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
                <span className="text-sm font-bold font-cairo" style={{ color: col.color }}>{col.label}</span>
                <span className="text-xs text-slate-600 font-sora ml-auto">{colItems(col.status).length}</span>
              </div>
              <div className="space-y-2 min-h-32">
                {colItems(col.status).map(item => (
                  <div key={item.id} className="p-3 rounded-xl" style={{ background: col.bg, border: `1px solid ${col.color}33` }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white font-cairo truncate">{item.customer_name}</p>
                        {item.car_type && <p className="text-xs text-slate-500 font-tajawal truncate">{item.car_type}</p>}
                      </div>
                      <button onClick={() => removeItem(item.id)} className="text-slate-600 hover:text-red-400 transition-colors mr-1 flex-shrink-0">
                        <X size={12} />
                      </button>
                    </div>

                    {item.service_name && (
                      <p className="text-xs font-tajawal mb-2 truncate" style={{ color: col.color }}>{item.service_name}</p>
                    )}

                    <div className="flex items-center justify-between mb-2">
                      {item.price > 0 && (
                        <span className="text-xs font-sora text-slate-400">{item.price} ر.س</span>
                      )}
                      <span className="text-xs text-slate-600 font-sora flex items-center gap-1 ml-auto">
                        <Clock size={10} /> {elapsed(item.created_at)}
                      </span>
                    </div>

                    {item.worker && (
                      <p className="text-xs text-slate-500 font-tajawal mb-2 truncate">👤 {item.worker.name}</p>
                    )}

                    {col.status !== 'delivered' && NEXT_STATUS[col.status] && (
                      <button
                        onClick={() => moveNext(item)}
                        disabled={movingId === item.id}
                        className="w-full py-1.5 rounded-lg text-xs font-tajawal flex items-center justify-center gap-1 transition-all hover:opacity-80 disabled:opacity-50"
                        style={{ background: col.color + '22', color: col.color, border: `1px solid ${col.color}44` }}
                      >
                        {movingId === item.id ? <Loader2 size={10} className="animate-spin" /> : <ChevronRight size={10} />}
                        {COLUMNS.find(c => c.status === NEXT_STATUS[col.status])?.label}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center h-40 gap-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 }}>
          <Car size={32} className="text-slate-700" />
          <p className="text-slate-500 font-tajawal text-sm">لا توجد سيارات في القائمة</p>
          <button onClick={() => setShowForm(true)} className="text-primary-400 text-sm font-tajawal underline">أضف أول سيارة</button>
        </div>
      )}

      {/* Add car form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md p-6 rounded-2xl" style={{ background: '#0D1422', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white font-cairo">إضافة سيارة</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-tajawal mb-1.5 block">اسم العميل *</label>
                <input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="اسم العميل" className="w-full px-4 py-2.5 rounded-xl text-sm font-tajawal text-white placeholder-slate-600 outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-tajawal mb-1.5 block">رقم الجوال</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="05xxxxxxxx" className="w-full px-4 py-2.5 rounded-xl text-sm font-sora text-white placeholder-slate-600 outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} dir="ltr" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-tajawal mb-1.5 block">نوع السيارة</label>
                  <input value={form.car_type} onChange={e => setForm(f => ({ ...f, car_type: e.target.value }))} placeholder="تويوتا، هيونداي..." className="w-full px-4 py-2.5 rounded-xl text-sm font-tajawal text-white placeholder-slate-600 outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-tajawal mb-1.5 block">الخدمة</label>
                {services.length > 0 ? (
                  <select value={form.service_name} onChange={e => {
                    const svc = services.find(s => s.name === e.target.value)
                    setForm(f => ({ ...f, service_name: e.target.value, price: svc ? String(svc.price) : f.price }))
                  }} className="w-full px-4 py-2.5 rounded-xl text-sm font-tajawal text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <option value="">اختر الخدمة</option>
                    {services.map(s => <option key={s.name} value={s.name}>{s.name} — {s.price} ر.س</option>)}
                  </select>
                ) : (
                  <input value={form.service_name} onChange={e => setForm(f => ({ ...f, service_name: e.target.value }))} placeholder="غسيل عادي، بريميوم..." className="w-full px-4 py-2.5 rounded-xl text-sm font-tajawal text-white placeholder-slate-600 outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-tajawal mb-1.5 block">السعر (ر.س)</label>
                  <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0" min={0} className="w-full px-4 py-2.5 rounded-xl text-sm font-sora text-white placeholder-slate-600 outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} dir="ltr" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-tajawal mb-1.5 block">الموظف</label>
                  <select value={form.worker_id} onChange={e => setForm(f => ({ ...f, worker_id: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl text-sm font-tajawal text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <option value="">بدون تعيين</option>
                    {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-tajawal text-slate-400" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>إلغاء</button>
              <button onClick={addCar} disabled={saving || !form.customer_name.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-tajawal text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Car size={14} />}
                {saving ? 'جاري الإضافة...' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
