import type { ModuleId } from '@/dashboard/modules'

/**
 * What a team member may do. The account owner always has everything. Everyone else gets their role's
 * preset, unless an explicit list is saved on the member (company_users.permissions), which replaces it.
 */
export const PERMISSION_GROUPS: { id: string; label: string; items: { key: string; label: string }[] }[] = [
  { id: 'conversations', label: 'المحادثات', items: [
    { key: 'conversations.view', label: 'عرض محادثاتي ومحادثات فريقي' },
    { key: 'conversations.view_all', label: 'عرض كل محادثات الشركة' },
    { key: 'conversations.reply', label: 'الرد على العملاء وإضافة ملاحظات' },
    { key: 'conversations.transfer', label: 'الإسناد والتحويل لفريق آخر' },
    { key: 'conversations.close', label: 'إغلاق المحادثات وإعادة فتحها' },
  ] },
  { id: 'customers', label: 'العملاء', items: [
    { key: 'customers.view', label: 'عرض العملاء' },
    { key: 'customers.edit', label: 'تعديل بيانات العملاء' },
  ] },
  { id: 'work', label: 'التشغيل', items: [
    { key: 'bookings.view', label: 'عرض الحجوزات' },
    { key: 'bookings.manage', label: 'إنشاء الحجوزات وتعديلها' },
    { key: 'tickets.view', label: 'عرض التذاكر' },
    { key: 'tickets.manage', label: 'إدارة التذاكر' },
    { key: 'orders.view', label: 'عرض الطلبات' },
    { key: 'reviews.view', label: 'عرض تقييمات Google' },
    { key: 'services.view', label: 'عرض الخدمات' },
    { key: 'reminders.view', label: 'عرض المتابعات' },
    { key: 'outreach.send', label: 'إرسال الرسائل الصادرة' },
  ] },
  { id: 'agent', label: 'الوكيل والمعرفة', items: [
    { key: 'voice.view', label: 'عرض المكالمات وتحليلاتها' },
    { key: 'knowledge.view', label: 'عرض قاعدة المعرفة' },
    { key: 'knowledge.edit', label: 'تعديل قاعدة المعرفة' },
    { key: 'agent.settings', label: 'تغيير إعدادات الوكيل' },
  ] },
  { id: 'admin', label: 'الإدارة', items: [
    { key: 'reports.view', label: 'التقارير والإيرادات' },
    { key: 'audit.view', label: 'سجل التدقيق' },
    { key: 'integrations.manage', label: 'التكاملات ومفاتيح API' },
    { key: 'team.manage', label: 'إدارة الفريق والصلاحيات' },
  ] },
]

export const ALL_PERMISSIONS: string[] = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key))

export const ROLE_LABELS: Record<string, string> = {
  owner: 'مالك الحساب', manager: 'مدير', agent: 'موظف خدمة', staff: 'موظف', viewer: 'مشاهد فقط',
}

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  manager: 'كل شي تقريبًا ما عدا إدارة الفريق',
  agent: 'يرد على العملاء ويحوّل المحادثات ويدير التذاكر والحجوزات',
  viewer: 'يشوف فقط ولا يعدّل شي',
}

const AGENT = [
  'conversations.view', 'conversations.reply', 'conversations.transfer', 'conversations.close',
  'customers.view', 'customers.edit', 'bookings.view', 'bookings.manage', 'tickets.view', 'tickets.manage',
  'orders.view', 'reminders.view', 'services.view', 'knowledge.view', 'outreach.send',
]

export const ROLE_PRESETS: Record<string, string[]> = {
  manager: ALL_PERMISSIONS.filter((p) => p !== 'team.manage'),
  agent: AGENT,
  // The old plain role predates per-conversation visibility, so it keeps seeing every conversation.
  staff: [...AGENT, 'conversations.view_all'],
  viewer: ALL_PERMISSIONS.filter((p) => p.endsWith('.view')),
}

/** The permissions a member effectively has. */
export function effectivePermissions(role: string | null | undefined, saved: unknown): Set<string> {
  if (Array.isArray(saved)) {
    // Older rows hold coarse labels like 'all' or 'bookings'; only the known keys count, otherwise the role decides.
    const known = saved.filter((p): p is string => typeof p === 'string' && ALL_PERMISSIONS.includes(p))
    if (known.length > 0) return new Set(known)
  }
  return new Set(ROLE_PRESETS[role || 'staff'] ?? ROLE_PRESETS.staff)
}

/** The permission that lets someone open a module's page. */
export const MODULE_VIEW_PERMISSION: Record<ModuleId, string> = {
  conversations: 'conversations.view',
  customers: 'customers.view',
  bookings: 'bookings.view',
  reminders: 'reminders.view',
  services: 'services.view',
  voice: 'voice.view',
  reviews: 'reviews.view',
  tickets: 'tickets.view',
  reports: 'reports.view',
  revenue: 'reports.view',
  knowledge_base: 'knowledge.view',
  orders: 'orders.view',
}
