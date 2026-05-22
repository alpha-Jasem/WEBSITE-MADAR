import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, Phone, Search, CheckCircle2, XCircle, AlertCircle, Loader2, Building2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'

interface AppointmentRow {
  id: string
  customer_name: string
  customer_phone: string | null
  service_name: string | null
  resource_name: string | null
  scheduled_at: string | null
  status: string | null
  duration_minutes: number | null
  source: string | null
  company_id: string | null
  company_name: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  confirmed:  { label: 'مؤكد',       color: '#4F6EF7', bg: 'rgba(79,110,247,0.12)',  icon: AlertCircle  },
  done:       { label: 'مكتمل',      color: '#10B981', bg: 'rgba(16,185,129,0.12)',  icon: CheckCircle2 },
  cancelled:  { label: 'ملغى',       color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   icon: XCircle      },
  no_show:    { label: 'لم يحضر',    color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  icon: AlertCircle  },
  pending:    { label: 'في الانتظار',color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: Clock        },
}

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

export const AdminAppointments = () => {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([])
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [companyFilter, setCompanyFilter] = useState('all')

  const load = async () => {
    setLoading(true)
    const { data: apt } = await supabase
      .from('appointments')
      .select('*')
      .order('scheduled_at', { ascending: false })
      .limit(500)

    const { data: comp } = await supabase.from('companies').select('id, name')

    const compMap: Record<string, string> = {}
    for (const c of comp ?? []) compMap[c.id] = c.name

    const rows: AppointmentRow[] = (apt ?? []).map((a: AppointmentRow) => ({
      ...a,
      company_name: a.company_id ? (compMap[a.company_id] ?? null) : null,
    }))

    setAppointments(rows)
    setCompanies(comp ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const ch = supabase.channel('admin_apt_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const filtered = appointments.filter(a => {
    const q = search.toLowerCase()
    const matchSearch = !q || (a.customer_name?.toLowerCase().includes(q) ?? false) ||
      (a.customer_phone?.includes(q) ?? false) || (a.service_name?.toLowerCase().includes(q) ?? false) ||
      (a.company_name?.toLowerCase().includes(q) ?? false)
    const matchStatus = statusFilter === 'all' || a.status === statusFilter
    const matchCompany = companyFilter === 'all' || a.company_id === companyFilter
    return matchSearch && matchStatus && matchCompany
  })

  const todayStr = new Date().toISOString().slice(0, 10)
  const todayCount = appointments.filter(a => a.scheduled_at?.startsWith(todayStr)).length
  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length
  const doneCount = appointments.filter(a => a.status === 'done').length

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <Loader2 size={20} className="animate-spin text-indigo-400" />
      <p className="text-slate-500 font-tajawal text-sm">جاري التحميل...</p>
    </div>
  )

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-cairo">جميع المواعيد</h1>
          <p className="text-sm text-slate-500 font-tajawal">{appointments.length} موعد إجمالي عبر كل العملاء</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer transition-all"
          style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          تحديث
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'الإجمالي', value: appointments.length, color: '#64748b' },
          { label: 'اليوم',    value: todayCount,           color: '#4F6EF7' },
          { label: 'مؤكدة',   value: confirmedCount,        color: '#8B5CF6' },
          { label: 'مكتملة',  value: doneCount,             color: '#10B981' },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
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
            placeholder="ابحث باسم العميل أو الخدمة أو الشركة..."
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-2.5 pr-9 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/40 font-tajawal" />
        </div>

        <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}
          className="bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-slate-300 outline-none font-tajawal cursor-pointer">
          <option value="all">كل العملاء</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <div className="flex gap-2 overflow-x-auto">
          {[
            { key: 'all', label: 'الكل' },
            ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ key: k, label: v.label }))
          ].map(f => (
            <button key={f.key} onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-2 rounded-lg text-xs font-tajawal cursor-pointer transition-all whitespace-nowrap ${statusFilter === f.key ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Calendar size={36} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-600 font-tajawal text-sm">لا توجد مواعيد</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {filtered.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors">

                {/* Avatar */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #4F6EF7, #7C3AED)' }}>
                  {a.customer_name?.[0] ?? '?'}
                </div>

                {/* Name + service */}
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
                    {a.customer_phone && (
                      <span className="flex items-center gap-1 text-xs text-slate-600 font-work">
                        <Phone size={9} /> {a.customer_phone}
                      </span>
                    )}
                    {a.company_name && (
                      <span className="flex items-center gap-1 text-xs text-slate-500 font-tajawal">
                        <Building2 size={9} /> {a.company_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Date */}
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
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
