import { useEffect, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../../lib/supabase'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']

export const SolarAnalytics = () => {
  const [leads, setLeads] = useState<{ price_sold?: number | null; stage?: string | null; created_at?: string | null; updated_at?: string | null }[]>([])

  useEffect(() => {
    supabase.from('crm_leads').select('price_sold,stage,created_at,updated_at')
      .then(({ data }) => setLeads(data ?? []))
  }, [])

  const now = new Date()
  const monthlyData = MONTHS.map((month, i) => {
    const d = new Date(now); d.setMonth(now.getMonth() - (5 - i))
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const rev = leads.filter(l => l.stage === 'won' && (l.updated_at || '').startsWith(key))
      .reduce((s, l) => s + (l.price_sold || 0), 0)
    const cnt = leads.filter(l => (l.created_at || '').startsWith(key)).length
    return { month, revenue: Math.round(rev / 1000), leads: cnt }
  })

  const tt = { contentStyle: { background: '#0a0e1a', border: '1px solid rgba(79,110,247,0.3)', borderRadius: 8, color: '#fff' }, labelStyle: { color: '#4f6ef7' } }

  return (
    <div className="se-section">
      <div className="se-section-head"><h2>Analytics</h2></div>
      <div className="se-analytics-grid">
        <div className="se-chart-card">
          <p className="se-chart-title">Revenue Trend (SAR k)</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="seRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f6ef7" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#4f6ef7" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="month" stroke="#3a4a6b" tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis stroke="#3a4a6b" tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip {...tt} />
              <Area type="monotone" dataKey="revenue" name="Revenue (k)" stroke="#4f6ef7" strokeWidth={2.5} fill="url(#seRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="se-chart-card">
          <p className="se-chart-title">New Leads per Month</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="month" stroke="#3a4a6b" tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis stroke="#3a4a6b" tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip {...tt} />
              <Bar dataKey="leads" name="Leads" fill="#a855f7" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
