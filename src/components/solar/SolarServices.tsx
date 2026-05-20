import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Wrench } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Service = { id: string; name: string; revenue?: number | null; color_hex?: string | null; is_active?: boolean | null }

export const SolarServices = () => {
  const [services, setServices] = useState<Service[]>([])

  useEffect(() => {
    supabase.from('services').select('*').order('revenue', { ascending: false })
      .then(({ data }) => setServices((data ?? []) as Service[]))
  }, [])

  const total = services.reduce((s, v) => s + (v.revenue || 0), 0)

  return (
    <div className="se-section">
      <div className="se-section-head">
        <h2>Powered Services</h2>
        <span className="se-section-meta">Total: SAR {total.toLocaleString()}</span>
      </div>
      <div className="se-services-grid">
        {services.map((svc, i) => {
          const pct = total ? Math.round(((svc.revenue || 0) / total) * 100) : 0
          return (
            <motion.div key={svc.id} className="se-svc-card"
              style={{ '--svc-color': svc.color_hex || '#4f6ef7' } as React.CSSProperties}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }} whileHover={{ y: -4 }}>
              <div className="se-svc-card-icon" style={{ background: `${svc.color_hex}22`, borderColor: `${svc.color_hex}44` }}>
                <Wrench size={18} color={svc.color_hex || '#4f6ef7'} />
              </div>
              <h3>{svc.name}</h3>
              <strong style={{ color: svc.color_hex || '#4f6ef7' }}>SAR {(svc.revenue || 0).toLocaleString()}</strong>
              <div className="se-svc-track">
                <motion.div className="se-svc-fill"
                  style={{ background: svc.color_hex || '#4f6ef7' }}
                  initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                  transition={{ duration: 1.2, delay: i * 0.1 }} />
              </div>
              <span>{pct}% of total</span>
              <div className={`se-svc-status ${svc.is_active ? 'se-active' : 'se-inactive'}`}>
                {svc.is_active ? 'Active' : 'Inactive'}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
