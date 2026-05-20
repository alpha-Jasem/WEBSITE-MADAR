import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, XCircle, ArrowUpRight, RefreshCw } from 'lucide-react'
import type { Company } from '../../../types'

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter — 2,000 رسالة',
  growth: 'Growth — 10,000 رسالة',
  enterprise: 'Enterprise — غير محدود',
}
const UPGRADE_MAP: Record<string, string> = {
  starter: 'growth',
  growth: 'enterprise',
  enterprise: '',
}
const UPGRADE_LABELS: Record<string, string> = {
  growth: 'ترقية إلى Growth (10,000 رسالة)',
  enterprise: 'ترقية إلى Enterprise (غير محدود)',
}

interface Props {
  company: Company
}

export const MessageLimitBanner = ({ company }: Props) => {
  const limit = company.message_limit ?? 2000
  const used = company.messages_used ?? company.monthly_messages ?? 0
  const pct = limit >= 999999 ? 0 : Math.min(100, Math.round((used / limit) * 100))

  if (pct < 80) return null

  const isHard = pct >= 100
  const nextPlan = UPGRADE_MAP[company.plan]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8 }}
        className="relative overflow-hidden rounded-2xl p-5"
        style={{
          background: isHard
            ? 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.06))'
            : 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.06))',
          border: `1px solid ${isHard ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
        }}
      >
        {/* Glow */}
        <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl"
          style={{ background: isHard ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)' }} />

        <div className="relative flex items-start gap-4">
          <div className="p-2.5 rounded-xl flex-shrink-0"
            style={{ background: isHard ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)' }}>
            {isHard
              ? <XCircle size={20} className="text-red-400" />
              : <AlertTriangle size={20} className="text-yellow-400" />}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white font-cairo mb-0.5">
              {isHard ? 'وصلت حد الرسائل الشهرية!' : `تحذير: استهلكت ${pct}% من رسائلك`}
            </p>
            <p className="text-xs font-tajawal mb-3"
              style={{ color: isHard ? 'rgba(252,165,165,0.9)' : 'rgba(253,230,138,0.9)' }}>
              {isHard
                ? `لقد استنفدت ${used.toLocaleString('ar')} رسالة من أصل ${limit.toLocaleString('ar')} — لن تُرسل رسائل جديدة حتى الترقية أو التجديد الشهري`
                : `استخدمت ${used.toLocaleString('ar')} من ${limit.toLocaleString('ar')} رسالة — باقتك الحالية: ${PLAN_LABELS[company.plan] ?? company.plan}`}
            </p>

            {/* Progress bar */}
            <div className="h-2 rounded-full mb-3 overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.08)' }}>
              <motion.div className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1 }}
                style={{
                  background: isHard
                    ? 'linear-gradient(90deg, #EF4444, #DC2626)'
                    : 'linear-gradient(90deg, #F59E0B, #EF4444)',
                }} />
            </div>

            <div className="flex flex-wrap gap-2">
              {nextPlan && UPGRADE_LABELS[nextPlan] && (
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-tajawal text-white cursor-pointer transition-all hover:opacity-90"
                  style={{ background: isHard ? '#EF4444' : '#F59E0B' }}
                  onClick={() => window.open('mailto:admin@madar.software?subject=طلب ترقية الباقة', '_blank')}
                >
                  <ArrowUpRight size={13} />
                  {UPGRADE_LABELS[nextPlan]}
                </button>
              )}
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-tajawal cursor-pointer transition-all hover:bg-white/10"
                style={{ color: isHard ? '#FCA5A5' : '#FDE68A', border: `1px solid ${isHard ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}` }}
                onClick={() => window.open('mailto:admin@madar.software?subject=استفسار عن الباقة', '_blank')}
              >
                <RefreshCw size={12} />
                تواصل معنا
              </button>
            </div>
          </div>

          {/* Usage counter */}
          <div className="text-left flex-shrink-0">
            <p className="text-2xl font-bold font-sora"
              style={{ color: isHard ? '#F87171' : '#FCD34D' }}>
              {pct}%
            </p>
            <p className="text-[10px] text-slate-500 font-tajawal text-right">مستخدم</p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
