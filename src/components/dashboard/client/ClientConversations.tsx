import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Clock, Phone, Loader2, RefreshCw, User } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'

interface ConvState {
  id: string
  branch_id: string
  phone_number: string
  customer_name: string | null
  state: string
  state_data: Record<string, unknown>
  reminder_sent: boolean
  created_at: string
  updated_at: string
}

const STATE_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  idle:                     { label: 'خامل',            color: '#64748b', dot: '#64748b' },
  greeting:                 { label: 'ترحيب',           color: '#06B6D4', dot: '#06B6D4' },
  selecting_service:        { label: 'يختار الخدمة',    color: '#4F6EF7', dot: '#4F6EF7' },
  selecting_resource:       { label: 'يختار الموظف',    color: '#8B5CF6', dot: '#8B5CF6' },
  selecting_date:           { label: 'يختار التاريخ',   color: '#F59E0B', dot: '#F59E0B' },
  selecting_time:           { label: 'يختار الوقت',     color: '#F59E0B', dot: '#F59E0B' },
  confirming:               { label: 'ينتظر التأكيد',   color: '#EC4899', dot: '#EC4899' },
  booked:                   { label: 'تم الحجز ✅',     color: '#10B981', dot: '#10B981' },
  rescheduling_select_date: { label: 'يعيد الجدولة',    color: '#F59E0B', dot: '#F59E0B' },
  rescheduling_select_time: { label: 'يعيد الجدولة',    color: '#F59E0B', dot: '#F59E0B' },
  rescheduling_confirm:     { label: 'تأكيد إعادة جدولة',color:'#EC4899', dot: '#EC4899' },
  cancelling_confirm:       { label: 'ينتظر تأكيد الإلغاء',color:'#EF4444',dot:'#EF4444' },
  cancelled:                { label: 'ملغى ❌',          color: '#EF4444', dot: '#EF4444' },
  abandoned:                { label: 'لم يكمل',         color: '#64748b', dot: '#64748b' },
  faq:                      { label: 'سؤال',            color: '#06B6D4', dot: '#06B6D4' },
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'الآن'
  if (m < 60) return `منذ ${m} دقيقة`
  const h = Math.floor(m / 60)
  if (h < 24) return `منذ ${h} ساعة`
  return `منذ ${Math.floor(h / 24)} يوم`
}

export const ClientConversations = () => {
  const { companyId, loading: authLoading } = useClientCompany()
  const [conversations, setConversations] = useState<ConvState[]>([])
  const [branchId, setBranchId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'booked' | 'abandoned'>('all')

  const load = async () => {
    if (!companyId) return
    setLoading(true)
    const { data: branch } = await supabase.from('branches').select('id').eq('company_id', companyId).maybeSingle()
    if (branch) {
      setBranchId(branch.id)
      const { data } = await supabase.from('conversation_state')
        .select('*').eq('branch_id', branch.id)
        .order('updated_at', { ascending: false })
        .limit(100)
      setConversations(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { if (!authLoading) load() }, [authLoading, companyId])

  // Real-time subscription
  useEffect(() => {
    if (!branchId) return
    const ch = supabase.channel('conv_rt')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'conversation_state',
        filter: `branch_id=eq.${branchId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setConversations(prev => [payload.new as ConvState, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setConversations(prev => prev.map(c => c.id === payload.new.id ? payload.new as ConvState : c))
        } else if (payload.eventType === 'DELETE') {
          setConversations(prev => prev.filter(c => c.id !== payload.old.id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [branchId])

  const activeStates = ['greeting', 'selecting_service', 'selecting_resource', 'selecting_date', 'selecting_time', 'confirming', 'rescheduling_select_date', 'rescheduling_select_time', 'rescheduling_confirm', 'cancelling_confirm', 'faq']

  const filtered = conversations.filter(c => {
    if (filter === 'active') return activeStates.includes(c.state)
    if (filter === 'booked') return c.state === 'booked'
    if (filter === 'abandoned') return c.state === 'abandoned'
    return true
  })

  const activeCount = conversations.filter(c => activeStates.includes(c.state)).length
  const bookedCount = conversations.filter(c => c.state === 'booked').length
  const abandonedCount = conversations.filter(c => c.state === 'abandoned').length


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-cairo">المحادثات الحية</h1>
          <p className="text-sm text-slate-500 font-tajawal">
            {activeCount > 0 ? (
              <span className="text-emerald-400">{activeCount} محادثة نشطة الآن</span>
            ) : 'لا توجد محادثات نشطة الآن'}
          </p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer transition-all"
          style={{ border: '1px solid #E2E8F0' }}>
          <RefreshCw size={13} />
          تحديث
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي',    value: conversations.length, color: '#64748b' },
          { label: 'نشط',       value: activeCount,           color: '#4F6EF7' },
          { label: 'تم الحجز',  value: bookedCount,           color: '#10B981' },
          { label: 'لم يكمل',  value: abandonedCount,         color: '#EF4444' },
        ].map(s => (
          <div key={s.label} className="p-3 rounded-xl text-center"
            style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <p className="text-xl font-black font-work" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-slate-600 font-tajawal mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
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

      {/* No branch */}
      {!branchId && !loading && (
        <div className="py-16 text-center">
          <MessageSquare size={36} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 font-tajawal text-sm">أنشئ الفرع أولاً من صفحة الإعداد</p>
        </div>
      )}

      {/* Conversations list */}
      {branchId && (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <MessageSquare size={36} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-600 font-tajawal text-sm">لا توجد محادثات في هذا التصنيف</p>
            </div>
          ) : filtered.map((conv, i) => {
            const cfg = STATE_CONFIG[conv.state] ?? { label: conv.state, color: '#64748b', dot: '#64748b' }
            const isActive = activeStates.includes(conv.state)
            const sd = conv.state_data as Record<string, string>

            return (
              <motion.div key={conv.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 p-4 rounded-xl transition-colors hover:bg-white/[0.02]"
                style={{ background: '#F8FAFC', border: `1px solid ${isActive ? cfg.color + '25' : '#F8FAFC'}` }}>

                {/* Status dot */}
                <div className="flex-shrink-0 relative">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: cfg.color + '15' }}>
                    <User size={15} style={{ color: cfg.color }} />
                  </div>
                  {isActive && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 animate-pulse"
                      style={{ background: cfg.dot, borderColor: '#FFFFFF' }} />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-bold text-white font-tajawal">
                      {conv.customer_name ?? conv.phone_number}
                    </p>
                    {conv.customer_name && (
                      <span className="flex items-center gap-1 text-xs text-slate-600 font-work">
                        <Phone size={9} /> {conv.phone_number}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-tajawal font-medium" style={{ color: cfg.color }}>
                      {cfg.label}
                    </span>
                    {sd.selected_service_name && (
                      <span className="text-xs text-slate-500 font-tajawal">الخدمة: {sd.selected_service_name}</span>
                    )}
                    {sd.selected_resource_name && (
                      <span className="text-xs text-slate-500 font-tajawal">مع: {sd.selected_resource_name}</span>
                    )}
                    {sd.selected_date && (
                      <span className="text-xs text-slate-500 font-tajawal">التاريخ: {sd.selected_date}</span>
                    )}
                  </div>
                </div>

                {/* Time */}
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-tajawal flex-shrink-0">
                  <Clock size={11} />
                  {timeAgo(conv.updated_at)}
                </div>

                {/* Reminder badge */}
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
      )}
    </div>
  )
}
