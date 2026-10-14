import type { BusinessType } from '@/types'

/**
 * Dashboard sections a company can have. Which ones are on comes from the company's industry
 * preset, then per-company overrides an admin sets (stored in `companies.dashboard_modules`).
 * Settings, integrations, audit log and plan usage are not modules: every company keeps them.
 */
export type ModuleId =
  | 'conversations'
  | 'customers'
  | 'bookings'
  | 'reminders'
  | 'services'
  | 'voice'
  | 'reviews'
  | 'tickets'
  | 'reports'
  | 'revenue'
  | 'knowledge_base'
  | 'orders'

export const ALL_MODULES: ModuleId[] = [
  'conversations', 'customers', 'bookings', 'reminders', 'services', 'voice',
  'reviews', 'tickets', 'reports', 'revenue', 'knowledge_base', 'orders',
]

/** Arabic names, shown on the admin toggles. */
export const MODULE_LABELS: Record<ModuleId, string> = {
  conversations: 'المحادثات',
  customers: 'العملاء',
  bookings: 'الحجوزات والمواعيد',
  reminders: 'المتابعات والتذكيرات',
  services: 'الخدمات',
  voice: 'الوكيل الصوتي والمكالمات',
  reviews: 'تقييمات Google',
  tickets: 'التذاكر',
  reports: 'التقارير',
  revenue: 'الإيرادات',
  knowledge_base: 'قاعدة المعرفة',
  orders: 'الطلبات والسلات المتروكة',
}

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  clinic: 'عيادة / مركز صحي',
  real_estate: 'شركة عقارية',
  ecommerce: 'تجارة إلكترونية',
  other: 'أخرى',
}

const ALWAYS: ModuleId[] = ['conversations', 'customers', 'tickets', 'reports', 'revenue', 'knowledge_base']

export const INDUSTRY_PRESETS: Record<BusinessType, ModuleId[]> = {
  clinic: [...ALWAYS, 'bookings', 'reminders', 'services', 'voice', 'reviews'],
  real_estate: [...ALWAYS, 'bookings', 'reminders', 'voice'],
  ecommerce: [...ALWAYS, 'orders'],
  // Unknown businesses get the booking toolkit without the clinic-only pieces.
  other: [...ALWAYS, 'bookings', 'reminders', 'voice'],
}

/** Per-company overrides: only modules that differ from the preset are stored. */
export type ModuleOverrides = Partial<Record<ModuleId, boolean>>

export function resolveModules(businessType: BusinessType, overrides: ModuleOverrides | null | undefined): Set<ModuleId> {
  const enabled = new Set<ModuleId>(INDUSTRY_PRESETS[businessType] ?? INDUSTRY_PRESETS.other)
  for (const id of ALL_MODULES) {
    const v = overrides?.[id]
    if (v === true) enabled.add(id)
    else if (v === false) enabled.delete(id)
  }
  return enabled
}

/** Keeps only known module ids with boolean values, so a malformed JSON column can't break the UI. */
export function parseOverrides(raw: unknown): ModuleOverrides {
  if (!raw || typeof raw !== 'object') return {}
  const out: ModuleOverrides = {}
  for (const id of ALL_MODULES) {
    const v = (raw as Record<string, unknown>)[id]
    if (typeof v === 'boolean') out[id] = v
  }
  return out
}

/** Integrations that only make sense with a given module (others are always listed). */
const INTEGRATION_MODULE: Record<string, ModuleId> = {
  google_business: 'reviews',
  google_calendar: 'bookings',
  voip: 'voice',
}

export function isIntegrationVisible(provider: string, hasModule: (id: ModuleId) => boolean): boolean {
  const needed = INTEGRATION_MODULE[provider]
  return !needed || hasModule(needed)
}

/** Real estate calls them viewings, not bookings. */
export function bookingsLabel(businessType: BusinessType): string {
  return businessType === 'real_estate' ? 'المواعيد' : 'الحجوزات'
}

export function isBusinessType(v: unknown): v is BusinessType {
  return v === 'clinic' || v === 'real_estate' || v === 'ecommerce' || v === 'other'
}
