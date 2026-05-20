import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'

type StaffMember = { id: string; name: string; role?: string | null; performance_score?: number | null; is_active?: boolean | null }

export const SolarStaff = () => {
  const [staff, setStaff] = useState<StaffMember[]>([])

  useEffect(() => {
    supabase.from('staff').select('*').order('performance_score', { ascending: false })
      .then(({ data }) => setStaff((data ?? []) as StaffMember[]))
  }, [])

  return (
    <div className="se-section">
      <div className="se-section-head">
        <h2>Staff Power Levels</h2>
        <span className="se-section-meta">{staff.filter(s => s.is_active).length} active</span>
      </div>
      <div className="se-staff-grid">
        {staff.map((s, i) => {
          const score = s.performance_score || 0
          const color = score >= 90 ? '#4f6ef7' : score >= 80 ? '#a855f7' : score >= 70 ? '#06b6d4' : '#f3a64f'
          const r = 40, c = 2 * Math.PI * r
          return (
            <motion.div key={s.id} className="se-staff-card"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }} whileHover={{ y: -4 }}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(79,110,247,0.12)" strokeWidth="6" />
                <motion.circle cx="50" cy="50" r={r} fill="none"
                  stroke={color} strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={c}
                  initial={{ strokeDashoffset: c }}
                  animate={{ strokeDashoffset: c - (c * score) / 100 }}
                  transition={{ duration: 1.4, delay: i * 0.1 }}
                  transform="rotate(-90 50 50)"
                  style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
                <text x="50" y="55" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="800">{score}%</text>
              </svg>
              <h3>{s.name}</h3>
              <p>{s.role}</p>
              <div className="se-perf-bar-wrap">
                <motion.div className="se-perf-bar"
                  style={{ background: color, width: `${score}%` }}
                  initial={{ width: 0 }} animate={{ width: `${score}%` }}
                  transition={{ duration: 1 }} />
              </div>
              <span className={`se-svc-status ${s.is_active ? 'se-active' : 'se-inactive'}`}>
                {s.is_active ? 'Online' : 'Offline'}
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
