import { motion } from 'framer-motion'
import { Car, CheckCircle2, Clock, DollarSign, MessageCircle, Monitor, Star, TrendingUp } from 'lucide-react'

const kpis = [
  { icon: DollarSign, value: '12,540', label: 'إيراد اليوم', sub: 'ر.س', color: '#0B74FF', trend: '+18%' },
  { icon: Car, value: '86', label: 'السيارات', sub: 'سيارة', color: '#071739', trend: '+24%' },
  { icon: Star, value: '4.8', label: 'تقييم اليوم', sub: 'من 5', color: '#10B981', trend: '+12%' },
  { icon: MessageCircle, value: '42', label: 'رسائل تلقائية', sub: 'واتساب', color: '#00A884', trend: 'live' },
]

const stages = [
  { title: 'استلام', code: 'A-014', count: '12', color: '#0B74FF' },
  { title: 'قيد الخدمة', code: 'A-015', count: '18', color: '#2563EB' },
  { title: 'جاهزة', code: 'A-016', count: '7', color: '#10B981' },
  { title: 'تم التسليم', code: '49', count: 'سيارة', color: '#071739' },
]

const queue = [
  { customer: 'محمد خالد', ticket: 'A-014', service: 'غسيل بخار كامل', amount: '200 ر.س', status: 'قيد الخدمة', tone: '#2563EB' },
  { customer: 'أحمد السبيعي', ticket: 'A-016', service: 'تلميع خارجي', amount: '145 ر.س', status: 'جاهزة', tone: '#10B981' },
  { customer: 'عبدالله الشهري', ticket: 'A-018', service: 'غسيل سريع', amount: '45 ر.س', status: 'استلام', tone: '#0B74FF' },
]

const bars = [44, 58, 52, 72, 64, 86, 92]
const days = ['س', 'ج', 'خ', 'ر', 'ث', 'ن', 'ح']

export const CarWashDashMockup = ({ compact = false }: { compact?: boolean }) => {
  return (
    <div
      className="w-full overflow-hidden rounded-[28px] select-none"
      dir="rtl"
      style={{
        background: 'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(240,247,255,0.96))',
        border: '1px solid rgba(11,116,255,0.16)',
        boxShadow: '0 34px 90px rgba(7,23,57,0.20)',
        fontFamily: "'Cairo', sans-serif",
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4" style={{ borderBottom: '1px solid rgba(7,23,57,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: 'linear-gradient(135deg, #071739, #0B74FF)' }}>
            <Monitor size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-extrabold leading-none" style={{ color: '#071739' }}>مركز تشغيل اليوم</p>
            <p className="mt-1 text-[11px]" style={{ color: '#6B7A99' }}>مغسلة نايف</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: 'rgba(16,185,129,0.10)', color: '#059669' }}>
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-bold">مباشر</span>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((kpi, index) => {
            const Icon = kpi.icon
            return (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-2xl bg-white p-3"
                style={{ border: '1px solid rgba(7,23,57,0.08)', boxShadow: '0 12px 32px rgba(7,23,57,0.06)' }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <Icon size={15} style={{ color: kpi.color }} />
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `${kpi.color}12`, color: kpi.color }}>{kpi.trend}</span>
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-xl font-black leading-none" style={{ color: '#071739', fontFamily: 'Sora, Cairo, sans-serif' }}>{kpi.value}</span>
                  <span className="text-[10px] font-bold" style={{ color: '#7B8AA8' }}>{kpi.sub}</span>
                </div>
                <p className="mt-1 text-[11px]" style={{ color: '#6B7A99' }}>{kpi.label}</p>
              </motion.div>
            )
          })}
        </div>

        <div className="rounded-3xl bg-white p-4" style={{ border: '1px solid rgba(7,23,57,0.08)', boxShadow: '0 18px 46px rgba(7,23,57,0.07)' }}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-extrabold" style={{ color: '#071739' }}>مسار السيارات</p>
              <p className="text-[11px]" style={{ color: '#7B8AA8' }}>تحديث مباشر من الاستلام إلى التسليم</p>
            </div>
            <Clock size={17} style={{ color: '#0B74FF' }} />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stages.map((stage, index) => (
              <motion.div
                key={stage.title}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + index * 0.08, duration: 0.4 }}
                className="relative rounded-2xl p-3 text-center"
                style={{ background: `${stage.color}08`, border: `1px solid ${stage.color}42` }}
              >
                {index < stages.length - 1 && <div className="absolute -left-3 top-1/2 hidden h-px w-3 lg:block" style={{ background: stage.color }} />}
                <Car size={18} className="mx-auto mb-2" style={{ color: stage.color }} />
                <p className="text-xs font-bold" style={{ color: stage.color }}>{stage.title}</p>
                <p className="mt-1 text-2xl font-black" style={{ color: '#071739', fontFamily: 'Sora, Cairo, sans-serif' }}>{stage.code}</p>
                <p className="text-[11px]" style={{ color: '#7B8AA8' }}>{stage.count}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {!compact && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl bg-white p-4" style={{ border: '1px solid rgba(7,23,57,0.08)' }}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-extrabold" style={{ color: '#071739' }}>السيارات النشطة</p>
                <CheckCircle2 size={16} style={{ color: '#10B981' }} />
              </div>
              <div className="space-y-2">
                {queue.map((item, index) => (
                  <motion.div
                    key={item.ticket}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.38 + index * 0.08, duration: 0.35 }}
                    className="flex items-center justify-between rounded-2xl px-3 py-2"
                    style={{ background: `${item.tone}08`, border: `1px solid ${item.tone}18` }}
                  >
                    <div>
                      <p className="text-xs font-extrabold" style={{ color: '#071739' }}>{item.customer} <span style={{ color: item.tone }}>{item.ticket}</span></p>
                      <p className="mt-0.5 text-[10px]" style={{ color: '#7B8AA8' }}>{item.service}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black" style={{ color: '#071739' }}>{item.amount}</p>
                      <p className="text-[10px] font-bold" style={{ color: item.tone }}>{item.status}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-4" style={{ border: '1px solid rgba(7,23,57,0.08)' }}>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-extrabold" style={{ color: '#071739' }}>سيارات الأسبوع</p>
                <div className="flex items-center gap-1 text-[11px] font-bold" style={{ color: '#10B981' }}>
                  <TrendingUp size={13} />
                  +12%
                </div>
              </div>
              <div className="flex h-28 items-end gap-2">
                {bars.map((bar, index) => (
                  <div key={days[index]} className="flex flex-1 flex-col items-center gap-1">
                    <motion.div
                      className="w-full rounded-t-lg"
                      initial={{ height: 0 }}
                      animate={{ height: `${bar}%` }}
                      transition={{ delay: 0.42 + index * 0.05, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                      style={{ background: index >= 5 ? 'linear-gradient(to top, #071739, #0B74FF)' : 'rgba(11,116,255,0.18)' }}
                    />
                    <span className="text-[10px] font-bold" style={{ color: '#8EA0BD' }}>{days[index]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
