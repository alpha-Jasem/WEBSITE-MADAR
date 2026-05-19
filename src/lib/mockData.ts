import type { Company, Automation, Lead, Log, DashboardStats, ClientStats } from '../types'

export const mockAdminStats: DashboardStats = {
  total_companies: 24,
  active_automations: 67,
  total_leads: 1840,
  messages_today: 3420,
  revenue_month: 142000,
  growth_pct: 34,
}

export const mockClientStats: ClientStats = {
  active_automations: 3,
  total_leads: 128,
  messages_today: 247,
  response_rate: 94,
  leads_this_week: 18,
  conversion_rate: 31,
}

export const mockCompanies: Company[] = [
  { id: 'c1', name: 'عيادة الرعاية', industry: 'العيادات والمستشفيات', plan: 'growth', status: 'active', owner_name: 'د. أحمد العمري', owner_email: 'ahmed@clinic.sa', owner_phone: '+966501234567', monthly_messages: 4200, monthly_leads: 89, automations_count: 3, created_at: '2025-11-01T00:00:00Z' },
  { id: 'c2', name: 'مجموعة النخيل العقارية', industry: 'العقارات', plan: 'enterprise', status: 'active', owner_name: 'خالد السعدي', owner_email: 'khaled@palm.sa', owner_phone: '+966502345678', monthly_messages: 9800, monthly_leads: 215, automations_count: 6, created_at: '2025-10-15T00:00:00Z' },
  { id: 'c3', name: 'مطعم البيك الذهبي', industry: 'المطاعم والمقاهي', plan: 'starter', status: 'active', owner_name: 'فيصل المالكي', owner_email: 'faisal@golden.sa', owner_phone: '+966503456789', monthly_messages: 1800, monthly_leads: 34, automations_count: 1, created_at: '2025-12-01T00:00:00Z' },
  { id: 'c4', name: 'سوق التقنية', industry: 'التجارة الإلكترونية', plan: 'growth', status: 'trial', owner_name: 'سارة الحربي', owner_email: 'sara@techsouq.sa', owner_phone: '+966504567890', monthly_messages: 3100, monthly_leads: 72, automations_count: 4, created_at: '2026-01-10T00:00:00Z' },
  { id: 'c5', name: 'أكاديمية المستقبل', industry: 'التعليم والتدريب', plan: 'growth', status: 'active', owner_name: 'نورة القحطاني', owner_email: 'nora@future.sa', owner_phone: '+966505678901', monthly_messages: 2600, monthly_leads: 58, automations_count: 2, created_at: '2025-09-20T00:00:00Z' },
  { id: 'c6', name: 'مركز اللياقة الذهبي', industry: 'الصحة واللياقة', plan: 'starter', status: 'suspended', owner_name: 'محمد الزهراني', owner_email: 'mo@gold.sa', owner_phone: '+966506789012', monthly_messages: 0, monthly_leads: 0, automations_count: 0, created_at: '2025-08-05T00:00:00Z' },
]

export const mockAutomations: Automation[] = [
  { id: 'a1', company_id: 'c1', name: 'رد واتساب عيادة الرعاية', type: 'whatsapp', status: 'active', messages_today: 142, messages_month: 4200, leads_generated: 89, response_rate: 96, avg_response_time: 8, last_active: new Date().toISOString(), created_at: '2025-11-05T00:00:00Z' },
  { id: 'a2', company_id: 'c1', name: 'حجز مواعيد AI', type: 'booking', status: 'active', messages_today: 28, messages_month: 840, leads_generated: 34, response_rate: 100, avg_response_time: 2, last_active: new Date().toISOString(), created_at: '2025-11-10T00:00:00Z' },
  { id: 'a3', company_id: 'c1', name: 'متابعة المرضى CRM', type: 'crm', status: 'paused', messages_today: 0, messages_month: 320, leads_generated: 12, response_rate: 78, avg_response_time: 45, last_active: '2026-04-01T00:00:00Z', created_at: '2025-12-01T00:00:00Z' },
  { id: 'a4', company_id: 'c2', name: 'وكيل مبيعات عقارات', type: 'ai_agent', status: 'active', messages_today: 312, messages_month: 9800, leads_generated: 215, response_rate: 92, avg_response_time: 12, last_active: new Date().toISOString(), created_at: '2025-10-20T00:00:00Z' },
  { id: 'a5', company_id: 'c2', name: 'جدولة الجولات العقارية', type: 'booking', status: 'active', messages_today: 45, messages_month: 1200, leads_generated: 67, response_rate: 98, avg_response_time: 3, last_active: new Date().toISOString(), created_at: '2025-10-22T00:00:00Z' },
  { id: 'a6', company_id: 'c3', name: 'حجوزات واتساب مطعم', type: 'whatsapp', status: 'active', messages_today: 87, messages_month: 1800, leads_generated: 34, response_rate: 88, avg_response_time: 15, last_active: new Date().toISOString(), created_at: '2025-12-05T00:00:00Z' },
  { id: 'a7', company_id: 'c4', name: 'دعم عملاء سوق التقنية', type: 'ai_agent', status: 'error', messages_today: 0, messages_month: 3100, leads_generated: 72, response_rate: 71, avg_response_time: 38, last_active: '2026-05-10T00:00:00Z', created_at: '2026-01-15T00:00:00Z' },
]

export const mockLeads: Lead[] = [
  { id: 'l1', company_id: 'c1', automation_id: 'a1', name: 'عبدالله الفيفي', phone: '+966501111111', email: 'a.fifi@email.com', source: 'واتساب', status: 'converted', value: 1200, notes: 'حجز موعد جراحة', last_contact: new Date().toISOString(), created_at: '2026-05-10T00:00:00Z' },
  { id: 'l2', company_id: 'c1', automation_id: 'a1', name: 'منى العتيبي', phone: '+966502222222', source: 'واتساب', status: 'qualified', value: 450, last_contact: new Date().toISOString(), created_at: '2026-05-12T00:00:00Z' },
  { id: 'l3', company_id: 'c2', automation_id: 'a4', name: 'تركي الغامدي', phone: '+966503333333', email: 't.ghamdi@email.com', source: 'وكيل AI', status: 'new', value: 850000, notes: 'مهتم بشقق جدة', last_contact: new Date().toISOString(), created_at: '2026-05-14T00:00:00Z' },
  { id: 'l4', company_id: 'c2', automation_id: 'a4', name: 'هند السبيعي', phone: '+966504444444', source: 'وكيل AI', status: 'contacted', value: 1200000, last_contact: new Date().toISOString(), created_at: '2026-05-13T00:00:00Z' },
  { id: 'l5', company_id: 'c4', automation_id: 'a7', name: 'يوسف البقمي', phone: '+966505555555', source: 'دعم AI', status: 'lost', last_contact: '2026-05-10T00:00:00Z', created_at: '2026-05-08T00:00:00Z' },
  { id: 'l6', company_id: 'c1', automation_id: 'a2', name: 'ريم الحميدي', phone: '+966506666666', source: 'حجز مواعيد', status: 'new', value: 300, last_contact: new Date().toISOString(), created_at: '2026-05-16T00:00:00Z' },
]

export const mockLogs: Log[] = [
  { id: 'lg1', company_id: 'c1', automation_id: 'a1', level: 'success', event: 'message_sent', message: 'تم إرسال رد تلقائي للمريض عبدالله', created_at: new Date().toISOString() },
  { id: 'lg2', company_id: 'c4', automation_id: 'a7', level: 'error', event: 'api_failure', message: 'فشل الاتصال بـ OpenAI API — timeout بعد 30 ثانية', meta: { status: 504 }, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'lg3', company_id: 'c2', automation_id: 'a4', level: 'info', event: 'lead_created', message: 'تم إنشاء عميل محتمل جديد: تركي الغامدي', created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 'lg4', level: 'warning', event: 'rate_limit', message: 'شركة النخيل اقتربت من حد الرسائل الشهرية (95%)', created_at: new Date(Date.now() - 14400000).toISOString() },
  { id: 'lg5', company_id: 'c3', automation_id: 'a6', level: 'success', event: 'booking_confirmed', message: 'تأكيد حجز طاولة — الجمعة 7 مساءً', created_at: new Date(Date.now() - 18000000).toISOString() },
  { id: 'lg6', level: 'info', event: 'company_created', message: 'تم إضافة شركة جديدة: أكاديمية المستقبل', created_at: new Date(Date.now() - 86400000).toISOString() },
]

export const mockChartData = {
  weeklyMessages: [
    { day: 'الأحد', messages: 2100 },
    { day: 'الاثنين', messages: 3200 },
    { day: 'الثلاثاء', messages: 2800 },
    { day: 'الأربعاء', messages: 3600 },
    { day: 'الخميس', messages: 3420 },
    { day: 'الجمعة', messages: 1900 },
    { day: 'السبت', messages: 2400 },
  ],
  weeklyLeads: [
    { day: 'الأحد', leads: 18 },
    { day: 'الاثنين', leads: 24 },
    { day: 'الثلاثاء', leads: 21 },
    { day: 'الأربعاء', leads: 29 },
    { day: 'الخميس', leads: 26 },
    { day: 'الجمعة', leads: 14 },
    { day: 'السبت', leads: 19 },
  ],
}
