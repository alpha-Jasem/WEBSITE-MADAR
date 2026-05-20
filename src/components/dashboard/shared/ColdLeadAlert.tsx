import { motion } from 'framer-motion'
import { Snowflake } from 'lucide-react'

interface Props {
  leads: any[]
  daysThreshold?: number
}

export const ColdLeadAlert = ({ leads, daysThreshold = 7 }: Props) => {
  const now = Date.now()
  const cold = leads.filter(l => {
    if (['won', 'lost'].includes(l.stage)) return false
    const last = new Date(l.updated_at || l.created_at).getTime()
    return (now - last) > daysThreshold * 86400000
  })

  if (!cold.length) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl"
      style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Snowflake size={15} className="text-cyan-400" />
        <p className="text-sm font-bold text-white font-cairo">
          {cold.length} عميل بارد — لم يُحدَّث منذ +{daysThreshold} أيام
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {cold.slice(0, 6).map(l => (
          <span key={l.id}
            className="px-2.5 py-1 rounded-lg text-xs font-tajawal"
            style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)', color: 'rgba(6,182,212,0.9)' }}>
            {l.company_name || l.contact_name || 'عميل'}
          </span>
        ))}
        {cold.length > 6 && (
          <span className="px-2.5 py-1 rounded-lg text-xs font-tajawal text-slate-500">
            +{cold.length - 6} آخرين
          </span>
        )}
      </div>
    </motion.div>
  )
}
