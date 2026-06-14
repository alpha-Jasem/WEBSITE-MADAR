import type { PackageType } from '../types/clinicOS'

export type ClinicAccountStatus = 'active' | 'warning' | 'usage_limited' | 'expired' | 'suspended'

export interface UsageMetric {
  key: 'whatsapp' | 'ai_messages' | 'smart_calls' | 'reminders'
  label: string
  used: number
  limit: number
}

export const CLINIC_PLANS = {
  whatsapp: {
    name: 'WhatsApp AI Receptionist',
    annualPrice: 15000,
    setupFee: 4000,
    support: 'الدعم والصيانة الأساسية مشمولة',
    limits: { whatsapp: 1500, ai_messages: 3000, smart_calls: 0, reminders: 500 },
  },
  ai_pro: {
    name: 'AI Receptionist + Smart Calls',
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

export const getOverallUsage = (packageType: PackageType) =>
  Math.max(...getUsageMetrics(packageType).map(usagePercentage))

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

export const DEMO_CONVERSATIONS = [
  { name: 'سارة العمري', phone: '055 310 2841', summary: 'تسأل عن تنظيف الأسنان وتفضل موعداً بعد المغرب.', status: 'تم الحجز', last: 'تم تأكيد موعدك الثلاثاء 6:30 م', time: 'منذ 4 دقائق', booked: true, afterHours: true },
  { name: 'محمد القحطاني', phone: '053 920 1744', summary: 'استفسر عن سعر زراعة الأسنان وخيارات التقسيط.', status: 'يحتاج متابعة', last: 'سأراجع الموعد المناسب وأعود لكم', time: 'منذ 18 دقيقة', booked: false, afterHours: false },
  { name: 'نورة الدوسري', phone: '050 441 8092', summary: 'بدأت اختيار موعد تقويم ولم تكمل الخطوة الأخيرة.', status: 'لم يكتمل الحجز', last: 'هل يناسبك يوم الأربعاء؟', time: 'منذ 43 دقيقة', booked: false, afterHours: false },
  { name: 'خالد الشهري', phone: '054 731 6630', summary: 'طلب التحدث مع موظف بخصوص التأمين.', status: 'تم التحويل للموظف', last: 'تم تحويل طلبك لفريق العيادة', time: 'منذ ساعة', booked: false, afterHours: true },
]

export const DEMO_LEADS = [
  { name: 'محمد القحطاني', phone: '053 920 1744', interest: 'زراعة أسنان وتقسيط', score: 'ساخن', last: 'منذ 18 دقيقة', source: 'واتساب', next: 'اتصال خلال 15 دقيقة' },
  { name: 'نورة الدوسري', phone: '050 441 8092', interest: 'تقويم شفاف', score: 'ساخن', last: 'منذ 43 دقيقة', source: 'واتساب', next: 'إرسال الأوقات المتاحة' },
  { name: 'ريم الحربي', phone: '056 884 2150', interest: 'طبيب جلدية', score: 'متوسط', last: 'أمس 9:12 م', source: 'واتساب', next: 'توضيح الفرع المناسب' },
  { name: 'عبدالله المطيري', phone: '050 117 9821', interest: 'كشف عام', score: 'بارد', last: 'منذ يومين', source: 'واتساب', next: 'رسالة متابعة أخيرة' },
]

export const DEMO_LOST_OPPORTUNITIES = [
  { name: 'محمد القحطاني', phone: '053 920 1744', type: 'سأل ولم يحجز', service: 'زراعة أسنان', last: 'منذ 18 دقيقة', priority: 'عالية', action: 'اتصال سريع' },
  { name: 'نورة الدوسري', phone: '050 441 8092', type: 'بدأ الحجز ولم يكمل', service: 'تقويم شفاف', last: 'منذ 43 دقيقة', priority: 'عالية', action: 'إرسال موعد مقترح' },
  { name: 'ريم الحربي', phone: '056 884 2150', type: 'لم ترد بعد عرض المواعيد', service: 'جلدية', last: 'أمس', priority: 'متوسطة', action: 'متابعة واتساب' },
  { name: 'تركي العنزي', phone: '055 620 4118', type: 'مكالمة فائتة', service: 'تنظيف أسنان', last: 'أمس 8:40 م', priority: 'متوسطة', action: 'معاودة الاتصال' },
]

export const DEMO_SMART_CALLS = [
  { name: 'ليلى الغامدي', phone: '050 678 9012', duration: '1:27', reason: 'حجز موعد', summary: 'تريد موعد تنظيف الثلاثاء بعد 6 مساءً.', status: 'تم الحجز', booked: true, date: 'اليوم 10:18 ص' },
  { name: 'رنا الشهري', phone: '050 334 5678', duration: '1:44', reason: 'استفسار سعر', summary: 'سألت عن التقويم الشفاف وخيارات الدفع.', status: 'يحتاج متابعة', booked: false, date: 'اليوم 9:32 ص' },
  { name: 'دانة السلمي', phone: '050 556 7890', duration: '1:02', reason: 'تعديل موعد', summary: 'طلبت نقل الموعد إلى نهاية الأسبوع.', status: 'تم التعديل', booked: true, date: 'أمس 8:15 م' },
]

export const DEMO_TODAY_APPOINTMENTS = [
  { name: 'عائشة المطيري', time: '09:40', service: 'تنظيف أسنان', source: 'واتساب', status: 'مؤكد' },
  { name: 'سامي العنزي', time: '10:40', service: 'كشف عام', source: 'اتصال ذكي', status: 'مؤكد' },
  { name: 'نورة الدوسري', time: '12:00', service: 'استشارة تقويم', source: 'واتساب', status: 'يحتاج مراجعة' },
  { name: 'ليلى الغامدي', time: '16:00', service: 'كشف عام', source: 'يدوي', status: 'بانتظار التأكيد' },
]

