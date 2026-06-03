import { motion } from 'framer-motion'
import { Car, DollarSign, Clock, Star, TrendingUp } from 'lucide-react'

const kpis = [
  { icon: Car,         value: '٢٣',      label: 'سيارة اليوم',   color: '#00BFFF' },
  { icon: DollarSign,  value: '٤٢٠٠',    label: 'إيراد (ر.س)',   color: '#10B981' },
  { icon: Clock,       value: '٤',        label: 'في الطابور',     color: '#F59E0B' },
  { icon: Star,        value: '٤.٩',      label: 'تقييم اليوم',   color: '#A78BFA' },
]

const queue = [
  { plate: 'أ ب ج ١٢٣', service: 'غسلة شاملة',   status: 'في الخدمة', statusEn: 'in_service',  elapsed: '١٢ د' },
  { plate: 'د هـ و ٤٥٦', service: 'تلميع خارجي',  status: 'جاهزة',     statusEn: 'ready',       elapsed: '٢٨ د' },
  { plate: 'ز ح ط ٧٨٩', service: 'غسلة سريعة',   status: 'استلام',    statusEn: 'received',    elapsed: '٣ د'  },
]

const statusStyle: Record<string, { bg: string; color: string }> = {
  in_service: { bg: 'rgba(0,191,255,0.15)',  color: '#00BFFF' },
  ready:      { bg: 'rgba(16,185,129,0.15)', color: '#10B981' },
  received:   { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' },
}

const barData = [65, 82, 54, 91, 73, 88, 60]
const barDays = ['أح', 'إث', 'ثل', 'أر', 'خم', 'جم', 'سب']

export const CarWashDashMockup = ({ compact = false }: { compact?: boolean }) => {
  return (
    <div
      className="w-full rounded-2xl overflow-hidden select-none"
      style={{
        background: 'rgba(5,8,16,0.95)',
        border: '1px solid rgba(0,191,255,0.2)',
        boxShadow: '0 24px 60px rgba(0,191,255,0.12)',
        fontFamily: "'Cairo', sans-serif",
      }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ background: 'rgba(0,191,255,0.06)', borderBottom: '1px solid rgba(0,191,255,0.12)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0D1B3E, #00BFFF)' }}>
            <Car size={12} className="text-white" />
          </div>
          <span className="text-white text-xs font-bold">Car Wash OS</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.45)' }}>مغسلة نايف</span>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-3">

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-2">
          {kpis.map((k, i) => {
            const Icon = k.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.4 }}
                className="flex flex-col items-center gap-1 p-2 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <Icon size={12} style={{ color: k.color }} />
                <span className="text-sm font-bold leading-none" style={{ color: k.color }}>{k.value}</span>
                <span className="text-[8px] text-center leading-tight" style={{ color: 'rgba(255,255,255,0.35)' }}>{k.label}</span>
              </motion.div>
            )
          })}
        </div>

        {/* Queue cards */}
        <div>
          <p className="text-[9px] font-semibold mb-1.5 px-0.5" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>
            الطابور الحالي
          </p>
          <div className="flex flex-col gap-1.5">
            {queue.map((item, i) => {
              const s = statusStyle[item.statusEn]
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08, duration: 0.35 }}
                  className="flex items-center justify-between px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(0,191,255,0.1)', border: '1px solid rgba(0,191,255,0.2)' }}>
                      <Car size={10} style={{ color: '#00BFFF' }} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-white leading-none">{item.plate}</p>
                      <p className="text-[8px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.service}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{item.elapsed}</span>
                    <span className="text-[8px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: s.bg, color: s.color }}>
                      {item.status}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Mini bar chart */}
        {!compact && (
          <div>
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <p className="text-[9px] font-semibold" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>
                سيارات الأسبوع
              </p>
              <div className="flex items-center gap-1">
                <TrendingUp size={8} style={{ color: '#10B981' }} />
                <span className="text-[8px]" style={{ color: '#10B981' }}>+١٢٪</span>
              </div>
            </div>
            <div className="flex items-end gap-1 h-12">
              {barData.map((v, i) => (
                <motion.div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: 0.55 + i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformOrigin: 'bottom' }}
                >
                  <div
                    className="w-full rounded-sm"
                    style={{
                      height: `${(v / 100) * 36}px`,
                      background: i === 5 ? 'linear-gradient(to top, #0D1B3E, #00BFFF)' : 'rgba(0,191,255,0.2)',
                    }}
                  />
                  <span className="text-[7px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{barDays[i]}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
