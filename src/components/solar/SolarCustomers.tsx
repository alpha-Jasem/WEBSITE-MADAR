import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Lead = { id: string; company_name?: string | null; stage?: string | null; sector?: string | null; created_at?: string | null; price_sold?: number | null }

const STAGE_COLOR: Record<string, string> = {
  won: '#4ade80', qualified: '#4f6ef7', contacted: '#a855f7', new: '#06b6d4', lost: '#ef4444',
}

export const SolarCustomers = () => {
  const [leads, setLeads] = useState<Lead[]>([])
  const [q, setQ] = useState('')

  useEffect(() => {
    supabase.from('crm_leads').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setLeads((data ?? []) as Lead[]))
  }, [])

  const filtered = leads.filter(l => l.company_name?.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="se-section">
      <div className="se-section-head">
        <h2>Customers</h2>
        <div className="se-search">
          <Search size={14} />
          <input placeholder="Search customers..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
      </div>
      <div className="se-stats-row">
        {[
          { label: 'Total', value: leads.length, color: '#4f6ef7' },
          { label: 'Won', value: leads.filter(l => l.stage === 'won').length, color: '#4ade80' },
          { label: 'Active', value: leads.filter(l => !['won', 'lost'].includes(l.stage || '')).length, color: '#a855f7' },
        ].map(s => (
          <div key={s.label} className="se-stat-chip" style={{ borderColor: `${s.color}40` }}>
            <strong style={{ color: s.color }}>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
      <div className="se-table">
        <div className="se-table-head">
          <span>Company</span><span>Sector</span><span>Stage</span><span>Value</span>
        </div>
        {filtered.slice(0, 20).map((l, i) => (
          <motion.div key={l.id} className="se-table-row"
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }} whileHover={{ x: 4 }}>
            <div className="se-table-cell se-cell-name">
              <div className="se-avatar"><User size={12} /></div>
              <span>{l.company_name || '—'}</span>
            </div>
            <span className="se-table-cell">{l.sector || '—'}</span>
            <span className="se-table-cell">
              <span className="se-badge" style={{ color: STAGE_COLOR[l.stage || ''] || '#fff', borderColor: `${STAGE_COLOR[l.stage || ''] || '#fff'}40` }}>
                {l.stage || 'new'}
              </span>
            </span>
            <span className="se-table-cell">SAR {(l.price_sold || 0).toLocaleString()}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
