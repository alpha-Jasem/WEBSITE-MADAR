import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Apt = { id: string; customer_name: string; service_name?: string | null; scheduled_at?: string | null; status?: string | null; price?: number | null }

const STATUS_COLOR: Record<string, string> = { confirmed: '#4ade80', pending: '#f3a64f', cancelled: '#ef4444', done: '#4f6ef7' }

export const SolarAppointments = () => {
  const [apts, setApts] = useState<Apt[]>([])

  useEffect(() => {
    supabase.from('appointments').select('*').order('scheduled_at')
      .then(({ data }) => setApts((data ?? []) as Apt[]))
  }, [])

  const fmt = (iso?: string | null) => iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <div className="se-section">
      <div className="se-section-head">
        <h2>Appointments</h2>
        <button type="button" className="se-btn-primary"><Plus size={14} /> New</button>
      </div>
      <div className="se-stats-row">
        {[
          { label: 'Total', value: apts.length, color: '#4f6ef7' },
          { label: 'Confirmed', value: apts.filter(a => a.status === 'confirmed').length, color: '#4ade80' },
          { label: 'Pending', value: apts.filter(a => a.status === 'pending').length, color: '#f3a64f' },
        ].map(s => (
          <div key={s.label} className="se-stat-chip" style={{ borderColor: `${s.color}40` }}>
            <strong style={{ color: s.color }}>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
      <div className="se-apt-grid">
        {apts.map((a, i) => (
          <motion.div key={a.id} className="se-apt-card"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }} whileHover={{ y: -3 }}>
            <div className="se-apt-top">
              <div className="se-apt-icon"><Calendar size={14} color="#4f6ef7" /></div>
              <span className="se-badge" style={{ color: STATUS_COLOR[a.status || ''] || '#fff', borderColor: `${STATUS_COLOR[a.status || ''] || '#fff'}40` }}>
                {a.status}
              </span>
            </div>
            <strong>{a.service_name}</strong>
            <p>{a.customer_name}</p>
            <div className="se-apt-time">
              <Clock size={12} color="rgba(255,255,255,0.4)" />
              <span>{fmt(a.scheduled_at)}</span>
            </div>
            <div className="se-apt-price">SAR {(a.price || 0).toLocaleString()}</div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
