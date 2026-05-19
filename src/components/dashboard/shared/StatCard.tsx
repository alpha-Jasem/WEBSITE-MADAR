import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  icon: ReactNode
  trend?: number
  trendLabel?: string
  accent?: string
  delay?: number
}

export const StatCard = ({ label, value, icon, trend, trendLabel, accent = '#4F6EF7', delay = 0 }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className="relative p-5 rounded-2xl overflow-hidden"
    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
  >
    <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none"
      style={{ background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`, transform: 'translate(30%, -30%)' }} />

    <div className="flex items-start justify-between mb-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: `${accent}22`, color: accent }}>
        {icon}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
          style={{ background: trend >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }}>
          {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>

    <p className="text-2xl font-bold text-white font-sora mb-1">{value}</p>
    <p className="text-xs text-slate-500 font-tajawal">{label}</p>
    {trendLabel && <p className="text-xs text-slate-600 font-tajawal mt-0.5">{trendLabel}</p>}
  </motion.div>
)
