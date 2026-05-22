import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Clock, Phone, Loader2, RefreshCw, User, Building2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'

interface ConvRow {
  id: string
  branch_id: string
  phone_number: string
  customer_name: string | null
  state: string
  state_data: Record<string, string>
  reminder_sent: boolean
  created_at: string
  updated_at: string
  company_name?: string | null
}

const STATE_CONFIG: Record<string, { label: string; color: string }> = {
  idle:                     { label: 'خامل',                  color: '#64748b' },
  greeting:                 { label: 'ترحيب',                 color: '#06B6D4' },
  selecting_service:        { label: 'يختار الخدمة',          color: '#4F6EF7' },
  selecting_resource:       { label: 'يختار الموظف',          color: '#8B5CF6' },
  selecting_date:           { label: 'يختار التاريخ',         color: '#F59E0B' },
  selecting_time:           { label: 'يختار الوقت',           color: '#F59E0B' },
  confirming:               { label: 'ينتظر التأكيد',         color: '#EC4899' },
  booked:                   { label: 'تم الحجز ✅',           color: '#10B981' },
  rescheduling_select_date: { label: 'يعيد الجدولة',          color: '#F59E0B' },
  rescheduling_select_time: { label: 'يعيد الجدولة',          color: '#F59E0B' },
  rescheduling_confirm:     { label: 'تأكيد إعادة جدولة',    color: '#EC4899' },
  cancelling_confirm:       { label: 'ينتظر تأكيد الإلغاء',  color: '#EF4444' },
  cancelled:                { label: 'ملغى ❌',               color: '#EF4444' },
  abandoned:                { label: 'لم يكمل',               color: '#64748b' },
  faq:                      { label: 'سؤال',                  color: '#06B6D4' },
}

const ACTIVE_STATES = ['greeting', 'selecting_service', 'selecting_resource', 'selecting_date', 'selecting_time', 'confirming', 'rescheduling_select_date', 'rescheduling_select_time', 'rescheduling_confirm', 'cancelling_confirm', 'faq']

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'الآن'
  if (m < 60) return `منذ ${m} دقيقة`
  const h = Math.floor(m / 60)
  if (h < 24) return `منذ ${h} ساعة`
  return `منذ ${Math.floor(h / 24)} يوم`
}

export const AdminConversations = () => {
  const [conversations, setConversations] = useState<ConvRow[]>([])
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'booked' | 'abandoned'>('all')
  const [companyFilter, setCompanyFilter] = useState('all')

  const load = async () => {
    setLoading(true)

    const { data: convs } = await supabase
      .from('conversation_state')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(500)

    const { data: branches } = await supabase.from('branches').select('id, company_id')
    const { data: comps } = await supabase.from('companies').select('id, name')

    const compMap: Record<string, string> = {}
    for (const c of comps ?? []) compMap[c.id] = c.name

    const branchToCompany: Record<string, string> = {}
    for (const b of branches ?? []) branchToCompany[b.id] = b.company_id

    const rows: ConvRow[] = (convs ?? []).map((c: ConvRow) => ({
      ...c,
      company_name: branchToCompany[c.branch_id] ? (compMap[branchToCompany[c.branch_id]] ?? null) : null,
    }))

    setConversations(rows)
    setCompanies(comps ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const ch = supabase.channel('admin_conv_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_state' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const filtered = conversations.filter(c => {
    const matchState =
      filter === 'active' ? ACTIVE_STATES.includes(c.state) :
      filter === 'booked' ? c.state === 'booked' :
      filter === 'abandoned' ? c.state === 'abandoned' : true
    const matchCompany = companyFilter === 'all' || conversations
      .filter(x => x.company_name === companies.find(co => co.id === companyFilter)?.name)
      .some(x => x.id === c.id)
    return matchState && matchCompany
  })

  const activeCount = conversations.filter(c => ACTIVE_STATES.includes(c.state)).length
  const bookedCount = conversations.filter(c => c.state === 'booked').length
  const abandonedCount = conversations.filter(c => c.state === 'abandoned').length

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
          <h1 className="text-2xl font-bold text-white font-cairo">جميع المحادثات</h1>
          <p className="text-sm text-slate-500 font-tajawal">
            {activeCount > 0 ? (
              <span className="text-emerald-400">{activeCount} محادثة نشطة الآن</span>
            ) : 'لا توجد محادثات نشطة الآن'}
          </p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer transition-all"
          style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <RefreshCw size={13} />
          تحديث
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي',   value: conversations.length, color: '#64748b' },
          { label: 'نشط',      value: activeCount,           color: '#4F6EF7' },
          { label: 'تم الحجز', value: bookedCount,           color: '#10B981' },
          { label: 'لم يكمل', value: abandonedCount,         color: '#EF4444' },
        ].map(s => (
          <div key={s.label} className="p-3 rounded-xl text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xl font-black font-work" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-slate-600 font-tajawal mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2">
          {[
            { key: 'all',      label: 'الكل' },
            { key: 'active',   label: '🟢 نشط' },
            { key: 'booked',   label: '✅ محجوز' },
            { key: 'abandoned',label: '⚠️ مهجور' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key as typeof filter)}
              className={`px-3 py-2 rounded-lg text-xs font-tajawal cursor-pointer transition-all ${filter === f.key ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
              {f.label}
            </button>
          ))}
        </div>

        <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}
          className="bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2 text-xs text-slate-300 outline-none font-tajawal cursor-pointer">
          <option value="all">كل العملاء</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Conversations */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <MessageSquare size={36} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-600 font-tajawal text-sm">لا توجد محادثات في هذا التصنيف</p>
          </div>
        ) : filtered.map((conv, i) => {
          const cfg = STATE_CONFIG[conv.state] ?? { label: conv.state, color: '#64748b' }
          const isActive = ACTIVE_STATES.includes(conv.state)
          const sd = conv.state_data as Record<string, string>

          return (
            <motion.div key={conv.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="flex items-center gap-4 p-4 rounded-xl transition-colors hover:bg-white/[0.02]"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${isActive ? cfg.color + '25' : 'rgba(255,255,255,0.06)'}` }}>

              <div className="flex-shrink-0 relative">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: cfg.color + '15' }}>
                  <User size={15} style={{ color: cfg.color }} />
                </div>
                {isActive && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 animate-pulse"
                    style={{ background: cfg.color, borderColor: '#0C0D14' }} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <p className="text-sm font-bold text-white font-tajawal">
                    {conv.customer_name ?? conv.phone_number}
                  </p>
                  {conv.customer_name && (
                    <span className="flex items-center gap-1 text-xs text-slate-600 font-work">
                      <Phone size={9} /> {conv.phone_number}
                    </span>
                  )}
                  {conv.company_name && (
                    <span className="flex items-center gap-1 text-xs text-slate-500 font-tajawal">
                      <Building2 size={9} /> {conv.company_name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-tajawal font-medium" style={{ color: cfg.color }}>
                    {cfg.label}
                  </span>
                  {sd?.selected_service_name && (
                    <span className="text-xs text-slate-500 font-tajawal">الخدمة: {sd.selected_service_name}</span>
                  )}
                  {sd?.selected_date && (
                    <span className="text-xs text-slate-500 font-tajawal">التاريخ: {sd.selected_date}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-tajawal flex-shrink-0">
                <Clock size={11} />
                {timeAgo(conv.updated_at)}
              </div>

              {conv.reminder_sent && (
                <span className="text-xs px-2 py-0.5 rounded-full font-tajawal"
                  style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
                  أُرسل تذكير
                </span>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
