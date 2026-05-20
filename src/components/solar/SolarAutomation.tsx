import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Auto = { id: string; name?: string | null; status?: string | null; trigger_type?: string | null }

export const SolarAutomation = () => {
  const [autos, setAutos] = useState<Auto[]>([])

  useEffect(() => {
    supabase.from('automations').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setAutos((data ?? []) as Auto[]))
  }, [])

  const active = autos.filter(a => a.status === 'active').length

  return (
    <div className="se-section">
      <div className="se-section-head">
        <h2>Automation</h2>
        <span className="se-section-meta" style={{ color: '#4ade80' }}>{active} active</span>
      </div>
      <div className="se-stats-row">
        {[
          { label: 'Total', value: autos.length, color: '#4f6ef7' },
          { label: 'Active', value: active, color: '#4ade80' },
          { label: 'Paused', value: autos.filter(a => a.status === 'paused').length, color: '#f3a64f' },
        ].map(s => (
          <div key={s.label} className="se-stat-chip" style={{ borderColor: `${s.color}40` }}>
            <strong style={{ color: s.color }}>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
      <div className="se-auto-list">
        {autos.map((a, i) => (
          <motion.div key={a.id} className="se-auto-item"
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }} whileHover={{ x: 4 }}>
            <div className="se-auto-item-icon">
              <Zap size={14} color={a.status === 'active' ? '#4ade80' : '#f3a64f'} />
            </div>
            <div className="se-auto-item-info">
              <strong>{a.name || 'Automation'}</strong>
              <span>{a.trigger_type || 'Trigger'}</span>
            </div>
            <span className="se-badge" style={{
              color: a.status === 'active' ? '#4ade80' : '#f3a64f',
              borderColor: a.status === 'active' ? '#4ade8040' : '#f3a64f40',
            }}>{a.status}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
