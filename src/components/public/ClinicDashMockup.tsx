import { motion } from 'framer-motion'
import { Stethoscope, Calendar, UserPlus, CheckCircle, Bot } from 'lucide-react'

const kpis = [
  { icon: Calendar,    value: '١٨',   label: 'موعد اليوم',     color: '#10B981' },
  { icon: UserPlus,    value: '٦',    label: 'مرضى جدد',       color: '#00BFFF' },
  { icon: CheckCircle, value: '٩٤٪',  label: 'نسبة الحضور',    color: '#A78BFA' },
  { icon: Bot,         value: '٤١',   label: 'محادثة AI',      color: '#F59E0B' },
]

const appointments = [
  { time: '٠٩:٠٠', name: 'محمد الأحمدي',  service: 'تنظيف أسنان',   doctor: 'د. خالد',    status: 'confirmed' },
  { time: '١٠:٣٠', name: 'سارة العتيبي',  service: 'حشو عصب',       doctor: 'د. فيصل',    status: 'in_progress' },
  { time: '١١:٠٠', name: 'عبدالله الدوسري', service: 'زراعة',         doctor: 'د. عبدالله', status: 'pending' },
  { time: '١٤:٠٠', name: 'نورة الشهري',   service: 'تقويم',         doctor: 'د. سلطان',   status: 'confirmed' },
]

const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
  confirmed:   { bg: 'rgba(16,185,129,0.15)', color: '#10B981', label: 'مؤكد' },
  in_progress: { bg: 'rgba(0,191,255,0.15)',  color: '#00BFFF', label: 'الآن' },
  pending:     { bg: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)', label: 'قادم' },
}

const weekDays = ['أح', 'إث', 'ثل', 'أر', 'خم']

export const ClinicDashMockup = ({ compact = false }: { compact?: boolean }) => {
  return (
    <div
      className="w-full rounded-2xl overflow-hidden select-none"
      style={{
        background: 'rgba(5,8,16,0.95)',
        border: '1px solid rgba(16,185,129,0.2)',
        boxShadow: '0 24px 60px rgba(16,185,129,0.1)',
        fontFamily: "'Cairo', sans-serif",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ background: 'rgba(16,185,129,0.06)', borderBottom: '1px solid rgba(16,185,129,0.12)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0D2B1E, #10B981)' }}>
            <Stethoscope size={11} className="text-white" />
          </div>
          <span className="text-white text-xs font-bold">Clinic OS</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.45)' }}>عيادات نور</span>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-3">

        {/* KPIs */}
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

        {/* Week strip */}
        {!compact && (
          <div className="flex gap-1.5">
            {weekDays.map((d, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 + i * 0.06 }}
                className="flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg"
                style={{
                  background: i === 1 ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                  border: i === 1 ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <span className="text-[8px]" style={{ color: i === 1 ? '#10B981' : 'rgba(255,255,255,0.3)' }}>{d}</span>
                <div className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold"
                  style={{
                    background: i === 1 ? '#10B981' : 'transparent',
                    color: i === 1 ? 'white' : 'rgba(255,255,255,0.3)',
                  }}>
                  {[12, 18, 9, 15, 11][i]}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Appointments table */}
        <div>
          <p className="text-[9px] font-semibold mb-1.5 px-0.5" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>
            مواعيد اليوم
          </p>
          <div className="flex flex-col gap-1.5">
            {(compact ? appointments.slice(0, 3) : appointments).map((appt, i) => {
              const s = statusStyle[appt.status]
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
                    <span className="text-[9px] font-bold tabular-nums" style={{ color: '#10B981', minWidth: 32 }}>{appt.time}</span>
                    <div>
                      <p className="text-[10px] font-bold text-white leading-none">{appt.name}</p>
                      <p className="text-[8px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {appt.service} · {appt.doctor}
                      </p>
                    </div>
                  </div>
                  <span className="text-[8px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                    style={{ background: s.bg, color: s.color }}>
                    {s.label}
                  </span>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Nora indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}
        >
          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #10B981)' }}>
            <Bot size={10} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold" style={{ color: 'rgba(167,139,250,0.9)' }}>نورة — متصلة الآن</p>
            <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.3)' }}>ردت على ٤١ استفسار اليوم</p>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
        </motion.div>
      </div>
    </div>
  )
}
