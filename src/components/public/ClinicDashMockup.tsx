import { motion } from 'framer-motion'
import { Stethoscope, Calendar, UserPlus, CheckCircle, Bot, TrendingUp } from 'lucide-react'

const EM = '#10B981'
const CY = '#0099CC'

const kpis = [
  { icon: Calendar,   value: '١٨',  label: 'موعد اليوم',  color: EM,         bg: '#ECFDF5', border: '#A7F3D0' },
  { icon: UserPlus,   value: '٦',   label: 'مرضى جدد',    color: CY,         bg: '#EFF9FF', border: '#BAE6FD' },
  { icon: CheckCircle,value: '٩٤٪', label: 'نسبة الحضور', color: '#8B5CF6',  bg: '#F5F3FF', border: '#DDD6FE' },
  { icon: Bot,        value: '٤١',  label: 'رد مها',      color: '#F59E0B',  bg: '#FFFBEB', border: '#FDE68A' },
]

const appointments = [
  { time: '٠٩:٠٠', name: 'محمد الأحمدي',    service: 'تنظيف أسنان', doctor: 'د. خالد',    status: 'confirmed'   },
  { time: '١٠:٣٠', name: 'سارة العتيبي',    service: 'حشو عصب',     doctor: 'د. فيصل',    status: 'in_progress' },
  { time: '١١:٠٠', name: 'عبدالله الدوسري', service: 'زراعة',       doctor: 'د. عبدالله', status: 'pending'     },
  { time: '١٤:٠٠', name: 'نورة الشهري',     service: 'تقويم',       doctor: 'د. سلطان',   status: 'confirmed'   },
]

const statusStyle: Record<string, { bg: string; color: string; border: string; label: string }> = {
  confirmed:   { bg: '#ECFDF5', color: EM,        border: '#A7F3D0', label: 'مؤكد'    },
  in_progress: { bg: '#EFF9FF', color: CY,        border: '#BAE6FD', label: 'الآن'    },
  pending:     { bg: '#F8FAFC', color: '#94A3B8', border: '#E2E8F0', label: 'قادم'    },
}

const weekDays = ['أح', 'إث', 'ثل', 'أر', 'خم']
const weekNums = [12, 18, 9, 15, 11]

export const ClinicDashMockup = ({ compact = false }: { compact?: boolean }) => {
  return (
    <div
      className="w-full select-none"
      style={{
        background: '#F8FAFC',
        fontFamily: "'Cairo', sans-serif",
      }}
    >
      {/* Top nav bar */}
      <div className="flex items-center justify-between px-5 py-3.5"
        style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, #065F46, ${EM})` }}>
            <Stethoscope size={13} className="text-white" />
          </div>
          <span className="font-black text-sm" style={{ color: '#0F172A' }}>Clinic OS</span>
          <div className="h-4 w-px mx-1" style={{ background: '#E2E8F0' }} />
          <span className="text-xs font-medium" style={{ color: '#94A3B8' }}>عيادات نور</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#4ADE80' }} />
            <span className="text-[10px] font-bold" style={{ color: EM }}>نشط</span>
          </div>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-2.5">
          {kpis.map((k, i) => {
            const Icon = k.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.4 }}
                className="flex flex-col gap-2 p-3 rounded-2xl"
                style={{ background: k.bg, border: `1px solid ${k.border}` }}
              >
                <div className="flex items-center justify-between">
                  <Icon size={13} style={{ color: k.color }} />
                  <TrendingUp size={10} style={{ color: '#94A3B8' }} />
                </div>
                <div>
                  <div className="text-lg font-black leading-none" style={{ color: '#0F172A' }}>{k.value}</div>
                  <div className="text-[9px] mt-0.5 font-medium" style={{ color: '#64748B' }}>{k.label}</div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Week strip */}
        {!compact && (
          <div className="flex gap-1.5 p-3 rounded-2xl"
            style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
            <div className="text-[8px] font-semibold flex items-center me-1" style={{ color: '#94A3B8' }}>
              {' الأسبوع'}
            </div>
            {weekDays.map((d, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.06 }}
                className="flex-1 flex flex-col items-center gap-1 py-1.5 rounded-xl"
                style={{
                  background: i === 1 ? '#ECFDF5' : 'transparent',
                  border: i === 1 ? '1px solid #A7F3D0' : '1px solid transparent',
                }}
              >
                <span className="text-[8px] font-medium" style={{ color: i === 1 ? EM : '#94A3B8' }}>{d}</span>
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black"
                  style={{
                    background: i === 1 ? EM : '#F1F5F9',
                    color: i === 1 ? 'white' : '#64748B',
                  }}>
                  {weekNums[i]}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Appointments */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
          <div className="flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: '1px solid #F1F5F9' }}>
            <span className="text-[10px] font-bold" style={{ color: '#0F172A' }}>مواعيد اليوم</span>
            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: '#ECFDF5', color: EM }}>١٨ موعد</span>
          </div>
          <div className="flex flex-col">
            {(compact ? appointments.slice(0, 3) : appointments).map((appt, i) => {
              const s = statusStyle[appt.status]
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.08, duration: 0.35 }}
                  className="flex items-center justify-between px-4 py-2.5"
                  style={{ borderTop: i > 0 ? '1px solid #F8FAFC' : 'none' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black tabular-nums flex-shrink-0"
                      style={{ color: EM, minWidth: 30 }}>{appt.time}</span>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${EM}80, ${EM})` }}>
                      {appt.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold leading-none" style={{ color: '#0F172A' }}>{appt.name}</p>
                      <p className="text-[8px] mt-0.5" style={{ color: '#94A3B8' }}>
                        {appt.service} · {appt.doctor}
                      </p>
                    </div>
                  </div>
                  <span className="text-[8px] px-2 py-0.5 rounded-full font-bold flex-shrink-0"
                    style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
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
          className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #10B981)' }}>
            <Bot size={14} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold" style={{ color: '#92400E' }}>مها — متصلة الآن</p>
            <p className="text-[9px]" style={{ color: '#B45309' }}>ردت على ٤١ استفسار اليوم · ٧٨٪ تحويل</p>
          </div>
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#4ADE80' }} />
        </motion.div>

      </div>
    </div>
  )
}
