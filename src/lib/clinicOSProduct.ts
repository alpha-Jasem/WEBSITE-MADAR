import type { PackageType } from '../types/dashboard'

export type ClinicAccountStatus = 'active' | 'warning' | 'usage_limited' | 'expired' | 'suspended'

export interface UsageMetric {
  key: 'whatsapp' | 'ai_messages' | 'smart_calls' | 'reminders'
  label: string
  used: number
  limit: number
}

export const CLINIC_PLANS = {
  whatsapp: {
    name: 'واتساب AI',
    annualPrice: 15000,
    setupFee: 4000,
    support: 'الدعم والصيانة الأساسية مشمولة',
    limits: { whatsapp: 1500, ai_messages: 3000, smart_calls: 0, reminders: 500 },
  },
  ai_pro: {
    name: 'AI Pro',
    annualPrice: 27000,
    setupFee: 5000,
    support: 'الدعم والصيانة الأولوية مشمولة',
    limits: { whatsapp: 2500, ai_messages: 5000, smart_calls: 300, reminders: 700 },
  },
} satisfies Record<PackageType, unknown>

export const AI_RECEPTIONIST_DEMO = {
  bookings: 42,
  conversations: 148,
  afterHours: 27,
  lostOpportunities: 13,
  smartCalls: 36,
  recoveredCalls: 11,
  humanHandoffs: 18,
  conversionRate: 28,
  averageServiceValue: 250,
  usage: {
    whatsapp: 1020,
    ai_messages: 2200,
    smart_calls: 126,
    reminders: 340,
  },
}

export const getUsageMetrics = (packageType: PackageType): UsageMetric[] => {
  const limits = CLINIC_PLANS[packageType].limits
  return [
    { key: 'whatsapp', label: 'محادثات واتساب', used: AI_RECEPTIONIST_DEMO.usage.whatsapp, limit: limits.whatsapp },
    { key: 'ai_messages', label: 'ردود المساعد الذكي', used: AI_RECEPTIONIST_DEMO.usage.ai_messages, limit: limits.ai_messages },
    { key: 'smart_calls', label: 'دقائق الاتصال الذكي', used: packageType === 'ai_pro' ? AI_RECEPTIONIST_DEMO.usage.smart_calls : 0, limit: limits.smart_calls },
    { key: 'reminders', label: 'تذكيرات المواعيد', used: AI_RECEPTIONIST_DEMO.usage.reminders, limit: limits.reminders },
  ]
}

export const usagePercentage = ({ used, limit }: Pick<UsageMetric, 'used' | 'limit'>) =>
  limit <= 0 ? 0 : Math.min(100, Math.round((used / limit) * 100))

export const getOverallUsage = (packageType: PackageType, metrics = getUsageMetrics(packageType)) =>
  Math.max(0, ...metrics.map(usagePercentage))

export const getAccountStatus = (packageType: PackageType): ClinicAccountStatus => {
  const usage = getOverallUsage(packageType)
  if (usage >= 100) return 'usage_limited'
  if (usage >= 80) return 'warning'
  return 'active'
}

export const STATUS_COPY: Record<ClinicAccountStatus, string> = {
  active: 'الخدمات الذكية تعمل بشكل طبيعي',
  warning: 'اقتربت من الحد الشهري',
  usage_limited: 'الخدمات الذكية متوقفة مؤقتاً',
  expired: 'انتهى الاشتراك السنوي',
  suspended: 'الحساب موقوف مؤقتاً',
}
