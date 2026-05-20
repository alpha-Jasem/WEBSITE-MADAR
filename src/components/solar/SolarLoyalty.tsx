import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type LoyaltyMember = { id: string; customer_name: string; points?: number | null; tier?: string | null; last_activity?: string | null }

const TIER_COLOR: Record<string, string> = { platinum: '#e5e7eb', gold: '#f3a64f', silver: '#9ca3af', bronze: '#b45309' }
const TIER_ORDER = ['platinum', 'gold', 'silver', 'bronze']

export const SolarLoyalty = () => {
  const [members, setMembers] = useState<LoyaltyMember[]>([])

  useEffect(() => {
    supabase.from('loyalty_programs').select('*').order('points', { ascending: false })
      .then(({ data }) => setMembers((data ?? []) as LoyaltyMember[]))
  }, [])

  return (
    <div className="se-section">
      <div className="se-section-head">
        <h2>Loyalty Program</h2>
        <Heart size={16} color="#f3a64f" />
      </div>
      <div className="se-stats-row">
        {TIER_ORDER.map(tier => (
          <div key={tier} className="se-stat-chip" style={{ borderColor: `${TIER_COLOR[tier]}40` }}>
            <strong style={{ color: TIER_COLOR[tier] }}>{members.filter(m => m.tier === tier).length}</strong>
            <span style={{ textTransform: 'capitalize' }}>{tier}</span>
          </div>
        ))}
      </div>
      <div className="se-loyalty-list">
        {members.map((m, i) => {
          const color = TIER_COLOR[m.tier || 'bronze'] || '#fff'
          return (
            <motion.div key={m.id} className="se-loyalty-item"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }} whileHover={{ x: 4 }}>
              <div className="se-loyalty-rank" style={{ color, borderColor: `${color}40`, background: `${color}12` }}>
                {i + 1}
              </div>
              <div className="se-loyalty-info">
                <strong>{m.customer_name}</strong>
                <span style={{ color, textTransform: 'capitalize' }}>{m.tier}</span>
              </div>
              <div className="se-loyalty-points">
                <strong style={{ color }}>{(m.points || 0).toLocaleString()}</strong>
                <span>pts</span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
