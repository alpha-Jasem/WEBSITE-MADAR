import {
  BarChart3,
  Building2,
  Calendar,
  Car,
  Droplets,
  Home,
  MessageSquare,
  Settings,
  Sparkles,
  Stethoscope,
  Users2,
  Wrench,
  Zap,
} from 'lucide-react'
import type { BusinessType } from '../types'

export type ClientIndustryTemplate = {
  type: BusinessType
  label: string
  shortLabel: string
  accent: string
  icon: typeof Building2
  overviewTitle: string
  overviewSubtitle: string
  entityLabel: string
  activeLabel: string
  closedLabel: string
  activityChartTitle: string
  intakeChartTitle: string
  navLabels: {
    overview: string
    setup: string
    appointments: string
    conversations: string
    automations: string
    leads: string
    reports: string
    settings: string
  }
  stats: Array<{
    key: 'automations' | 'total' | 'today' | 'rate' | 'month' | 'closed'
    label: string
    accent: string
    icon: typeof Zap
  }>
  suggestions: string[]
  setupFocus: string[]
}

const baseNav = {
  overview: 'نظرة عامة',
  setup: 'إعداد النظام',
  appointments: 'المواعيد',
  conversations: 'المحادثات',
  automations: 'الأتمتة',
  leads: 'العملاء المحتملون',
  reports: 'التقارير',
  settings: 'الإعدادات',
}

export const CLIENT_INDUSTRY_TEMPLATES: Record<BusinessType, ClientIndustryTemplate> = {
  real_estate: {
    type: 'real_estate',
    label: 'قطاع العقارات',
    shortLabel: 'عقارات',
    accent: '#14B8FF',
    icon: Building2,
    overviewTitle: 'لوحة العقارات',
    overviewSubtitle: 'متابعة المهتمين، الجولات، المشاريع، ومحادثات الواتساب من مكان واحد.',
    entityLabel: 'المهتمون العقاريون',
    activeLabel: 'فرص وجولات نشطة',
    closedLabel: 'صفقات عقارية مغلقة',
    activityChartTitle: 'نشاط المهتمين هذا الأسبوع',
    intakeChartTitle: 'طلبات جولات جديدة',
    navLabels: {
      ...baseNav,
      appointments: 'الجولات',
      conversations: 'محادثات المهتمين',
      leads: 'المهتمون',
      reports: 'تقارير المبيعات',
    },
    stats: [
      { key: 'automations', label: 'حملات متابعة نشطة', accent: '#4F6EF7', icon: Zap },
      { key: 'total', label: 'إجمالي المهتمين', accent: '#10B981', icon: Users2 },
      { key: 'today', label: 'استفسارات اليوم', accent: '#06B6D4', icon: MessageSquare },
      { key: 'rate', label: 'معدل تحويل الجولات', accent: '#8B5CF6', icon: BarChart3 },
      { key: 'month', label: 'مهتمون هذا الشهر', accent: '#F59E0B', icon: Home },
      { key: 'closed', label: 'صفقات مغلقة', accent: '#EC4899', icon: Building2 },
    ],
    suggestions: [
      'أرسل عرض تمويل وجولة خاصة للمهتمين الذين لم يردوا خلال 72 ساعة.',
      'ارفع أولوية العملاء الذين سألوا عن السعر والموقع في نفس المحادثة.',
      'فعّل تذكير تلقائي قبل الجولة بساعتين مع موقع المشروع.',
    ],
    setupFocus: ['المشاريع', 'أنواع الوحدات', 'مواعيد الجولات', 'روابط المواقع'],
  },
  car_wash: {
    type: 'car_wash',
    label: 'قطاع مغاسل السيارات',
    shortLabel: 'مغسلة سيارات',
    accent: '#22D3EE',
    icon: Droplets,
    overviewTitle: 'لوحة تشغيل مغسلة السيارات',
    overviewSubtitle: 'حجوزات الغسيل، الاشتراكات، العملاء العائدون، واتساب، والولاء: كل 4 غسلات والخامسة مجاناً.',
    entityLabel: 'العملاء',
    activeLabel: 'حجوزات وغسلات نشطة',
    closedLabel: 'غسلات مكتملة',
    activityChartTitle: 'حركة حجوزات الغسيل هذا الأسبوع',
    intakeChartTitle: 'عملاء جدد للمغسلة',
    navLabels: {
      overview: 'الرئيسية',
      setup: 'باقات الغسيل',
      appointments: 'حجوزات الغسيل',
      conversations: 'طلبات واتساب',
      automations: 'واتساب',
      leads: 'العملاء',
      reports: 'تقارير الاشتراك',
      settings: 'إعدادات المغسلة',
    },
    stats: [
      { key: 'automations', label: 'تذكيرات وولاء نشطة', accent: '#06B6D4', icon: Zap },
      { key: 'total', label: 'إجمالي العملاء', accent: '#10B981', icon: Users2 },
      { key: 'today', label: 'طلبات اليوم', accent: '#38BDF8', icon: Car },
      { key: 'rate', label: 'نسبة العملاء العائدين', accent: '#8B5CF6', icon: BarChart3 },
      { key: 'month', label: 'عملاء هذا الشهر', accent: '#F59E0B', icon: Droplets },
      { key: 'closed', label: 'غسلات مكتملة', accent: '#EC4899', icon: Sparkles },
    ],
    suggestions: [
      'أرسل عرض الاشتراك: 4 غسلات مدفوعة والخامسة مجاناً للعملاء العائدين.',
      'فعّل حملة غسيل داخلي وخارجي للأيام الهادئة قبل الظهر.',
      'اربط نقاط الولاء برسالة واتساب تلقائية بعد كل غسلة مكتملة.',
    ],
    setupFocus: ['باقات الغسيل', 'مدة الخدمة', 'المسارات والعمال', '4 غسلات + الخامسة مجاناً'],
  },
  clinic: {
    type: 'clinic',
    label: 'قطاع العيادات',
    shortLabel: 'عيادة',
    accent: '#10B981',
    icon: Stethoscope,
    overviewTitle: 'لوحة العيادة',
    overviewSubtitle: 'مواعيد المرضى، التذكيرات، الاستفسارات، والمتابعات بعد الزيارة.',
    entityLabel: 'المرضى',
    activeLabel: 'مواعيد ومراجعات نشطة',
    closedLabel: 'زيارات مكتملة',
    activityChartTitle: 'نشاط المرضى هذا الأسبوع',
    intakeChartTitle: 'مرضى جدد هذا الأسبوع',
    navLabels: {
      ...baseNav,
      setup: 'إعداد العيادة',
      appointments: 'مواعيد المرضى',
      conversations: 'استفسارات المرضى',
      leads: 'المرضى',
      reports: 'تقارير العيادة',
    },
    stats: [
      { key: 'automations', label: 'تذكيرات نشطة', accent: '#10B981', icon: Zap },
      { key: 'total', label: 'إجمالي المرضى', accent: '#4F6EF7', icon: Users2 },
      { key: 'today', label: 'استفسارات اليوم', accent: '#06B6D4', icon: MessageSquare },
      { key: 'rate', label: 'معدل الحضور', accent: '#8B5CF6', icon: BarChart3 },
      { key: 'month', label: 'مرضى هذا الشهر', accent: '#F59E0B', icon: Stethoscope },
      { key: 'closed', label: 'زيارات مكتملة', accent: '#EC4899', icon: Calendar },
    ],
    suggestions: [
      'أرسل تذكير قبل الموعد ب 24 ساعة وساعتين لتقليل عدم الحضور.',
      'فعّل متابعة بعد الزيارة لطلب التقييم أو حجز مراجعة.',
      'اعرض أقرب موعد متاح تلقائياً عند سؤال المريض عن الحجز.',
    ],
    setupFocus: ['الخدمات الطبية', 'الأطباء', 'أوقات الدوام', 'سياسة الإلغاء'],
  },
  other: {
    type: 'other',
    label: 'قطاع عام',
    shortLabel: 'عام',
    accent: '#8B5CF6',
    icon: Wrench,
    overviewTitle: 'لوحة التشغيل',
    overviewSubtitle: 'أتمتة الرسائل، العملاء، المواعيد، وتقارير النمو حسب نشاطك.',
    entityLabel: 'العملاء',
    activeLabel: 'فرص نشطة',
    closedLabel: 'نتائج مكتملة',
    activityChartTitle: 'نشاط العملاء هذا الأسبوع',
    intakeChartTitle: 'عملاء جدد هذا الأسبوع',
    navLabels: baseNav,
    stats: [
      { key: 'automations', label: 'أتمتة نشطة', accent: '#4F6EF7', icon: Zap },
      { key: 'total', label: 'إجمالي العملاء', accent: '#10B981', icon: Users2 },
      { key: 'today', label: 'نشاط اليوم', accent: '#06B6D4', icon: MessageSquare },
      { key: 'rate', label: 'معدل الإغلاق', accent: '#8B5CF6', icon: BarChart3 },
      { key: 'month', label: 'عملاء هذا الشهر', accent: '#F59E0B', icon: Users2 },
      { key: 'closed', label: 'نتائج مغلقة', accent: '#EC4899', icon: Sparkles },
    ],
    suggestions: [
      'ابدأ بتقسيم العملاء حسب نية الشراء وسرعة الرد.',
      'فعّل متابعة تلقائية للرسائل التي لا تحصل على رد خلال 24 ساعة.',
      'اربط كل مصدر عميل بتقرير أسبوعي واضح للمالك.',
    ],
    setupFocus: ['الخدمات', 'الفريق', 'أوقات العمل', 'رسائل المتابعة'],
  },
}

export function getClientIndustryTemplate(type?: string | null, industry?: string | null) {
  if (type && type in CLIENT_INDUSTRY_TEMPLATES) {
    return CLIENT_INDUSTRY_TEMPLATES[type as BusinessType]
  }

  const text = `${type || ''} ${industry || ''}`.toLowerCase()
  if (text.includes('عقار') || text.includes('real')) return CLIENT_INDUSTRY_TEMPLATES.real_estate
  if (text.includes('مغسل') || text.includes('wash') || text.includes('car')) return CLIENT_INDUSTRY_TEMPLATES.car_wash
  if (text.includes('عياد') || text.includes('clinic') || text.includes('medical')) return CLIENT_INDUSTRY_TEMPLATES.clinic
  return CLIENT_INDUSTRY_TEMPLATES.other
}
