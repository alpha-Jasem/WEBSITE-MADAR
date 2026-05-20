import { useEffect, useState } from 'react'
import { MessageSquare, Users2, Clock, Play, Pause, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { StatusBadge } from '../shared/StatusBadge'
import { MessageLimitBanner } from '../shared/MessageLimitBanner'
import { fetchClientAutomations, updateAutomationStatus } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import type { Automation } from '../../../types'

const typeLabels: Record<string, string> = {
  whatsapp: 'واتساب', crm: 'CRM', ai_agent: 'وكيل AI', booking: 'حجز', sales: 'مبيعات',
}

export const ClientAutomations = () => {
  const { company, companyId, loading: authLoading } = useClientCompany()
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading || !companyId) { setLoading(false); return }
    setLoading(true)
    fetchClientAutomations(companyId).then(d => {
      setAutomations(d)
      setLoading(false)
    })
  }, [authLoading, companyId])

  const toggle = async (a: Automation) => {
    const newStatus = a.status === 'active' ? 'paused' : 'active'
    await updateAutomationStatus(a.id, newStatus)
    setAutomations(prev => prev.map(x => x.id === a.id ? { ...x, status: newStatus } : x))
  }

  if (authLoading || loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <Loader2 size={20} className="animate-spin text-primary-400" />
      <p className="text-slate-500 font-tajawal text-sm">جاري التحميل...</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-cairo">أتمتتي</h1>
        <p className="text-sm text-slate-500 font-tajawal">{automations.length} أنظمة أتمتة</p>
      </div>

      {/* Message limit alert */}
      {company && <MessageLimitBanner company={company} />}

      {automations.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-slate-600 font-tajawal text-sm">لا توجد أتمتة مرتبطة بحسابك بعد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {automations.map((a, i) => (
            <motion.div key={a.id}
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="p-6 rounded-2xl space-y-5"
              style={{
                background: a.status === 'error' ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${a.status === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}`,
              }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-bold text-white font-cairo">{a.name}</p>
                  <p className="text-xs text-slate-500 font-tajawal mt-0.5">{typeLabels[a.type]}</p>
                </div>
                <StatusBadge status={a.status} size="md" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[
                  { icon: MessageSquare, value: a.messages_month.toLocaleString(), label: 'رسائل الشهر' },
                  { icon: Users2,        value: a.leads_generated,                 label: 'عملاء محتملون' },
                  { icon: Clock,         value: `${a.avg_response_time}ث`,          label: 'متوسط الرد' },
                ].map(({ icon: Icon, value, label }) => (
                  <div key={label} className="p-3 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <Icon size={13} className="text-slate-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-white font-sora">{value}</p>
                    <p className="text-[10px] text-slate-600 font-tajawal">{label}</p>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-500 font-tajawal mb-1.5">
                  <span>معدل الاستجابة</span>
                  <span className="text-white font-semibold">{a.response_rate}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div className="h-full rounded-full"
                    initial={{ width: 0 }} animate={{ width: `${a.response_rate}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                    style={{ background: a.response_rate > 85 ? 'linear-gradient(90deg, #4F6EF7, #10B981)' : 'linear-gradient(90deg, #F59E0B, #EF4444)' }} />
                </div>
              </div>

              {a.status !== 'error' && (
                <button onClick={() => toggle(a)}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-tajawal cursor-pointer transition-all border ${
                    a.status === 'active'
                      ? 'text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/10'
                      : 'text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10'
                  }`}>
                  {a.status === 'active' ? <><Pause size={14} />إيقاف مؤقت</> : <><Play size={14} />تشغيل</>}
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
