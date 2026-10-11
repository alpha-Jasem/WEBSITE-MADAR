// Example data for the /demo-review tour of the tickets, knowledge base and agent
// settings pages. Times are relative to "now" so the board always looks live.
import type { OpsTicket, TicketNote, TeamMember, UnansweredQuestion, OpsKnowledgeItem, AgentSettings } from './ops'

const COMPANY = 'demo-clinic-001'
const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString()
const ahead = (mins: number) => new Date(Date.now() + mins * 60_000).toISOString()

export const DEMO_ME = 'demo-user-reem'

export const DEMO_TEAM: TeamMember[] = [
  { id: 'cu-1', auth_user_id: 'demo-user-owner', full_name: 'د. أحمد الزهراني', role: 'owner' },
  { id: 'cu-2', auth_user_id: DEMO_ME, full_name: 'ريم', role: 'manager' },
  { id: 'cu-3', auth_user_id: 'demo-user-khalid', full_name: 'خالد', role: 'staff' },
]

function t(p: Partial<OpsTicket> & Pick<OpsTicket, 'id' | 'subject' | 'status' | 'priority' | 'created_at'>): OpsTicket {
  return {
    company_id: COMPANY, description: '', route: 'ai-receptionist', updated_at: p.created_at,
    assignee_user_id: null, assignee_name: null, customer_name: null, customer_phone: null,
    ticket_type: null, due_at: null, ai_call_id: null, ...p,
  }
}

export const DEMO_OPS_TICKETS: OpsTicket[] = [
  t({ id: 'demo-tk-1042', subject: 'تأكيد تغطية بوبا لتقويم الأسنان', ticket_type: 'استفسار تأمين', priority: 'high', status: 'open', customer_name: 'نورة القحطاني', customer_phone: '0556546543', assignee_user_id: DEMO_ME, assignee_name: 'ريم', created_at: ago(6), due_at: ahead(30), ai_call_id: 'call-003', description: 'تسأل عن تغطية تأمين بوبا لتقويم الأسنان وتبي أحد يتأكد من فئة البوليصة.' }),
  t({ id: 'demo-tk-1041', subject: 'موعد أسنان أطفال، يطلب اتصال الصبح', ticket_type: 'طلب اتصال', priority: 'normal', status: 'open', customer_name: 'فهد العتيبي', customer_phone: '0564434433', created_at: ago(9 * 60), due_at: ahead(3 * 60), ai_call_id: 'call-004', description: 'اتصل خارج الدوام. يبي موعد لولده ويطلب اتصال الصبح.' }),
  t({ id: 'demo-tk-1040', subject: 'يسأل عن خطة تقسيط لزراعة الأسنان', ticket_type: 'متابعة', priority: 'low', status: 'open', customer_name: 'عبدالله الشهري', customer_phone: '0504554556', route: 'tickets-page', created_at: ago(50), due_at: ahead(26 * 60) }),
  t({ id: 'demo-tk-1038', subject: 'شكوى من طول الانتظار في العيادة', ticket_type: 'شكوى', priority: 'high', status: 'in_progress', customer_name: 'سلطان الدوسري', assignee_user_id: 'demo-user-khalid', assignee_name: 'خالد', created_at: ago(20 * 60), due_at: ago(120), description: 'انتظر أكثر من ساعة عن موعده بدون اعتذار.' }),
  t({ id: 'demo-tk-1035', subject: 'طلب تقرير طبي لجهة العمل', ticket_type: 'طلب خاص', priority: 'low', status: 'in_progress', customer_name: 'منيرة العنزي', assignee_user_id: DEMO_ME, assignee_name: 'ريم', route: 'tickets-page', created_at: ago(26 * 60), due_at: ahead(20 * 60) }),
  t({ id: 'demo-tk-1031', subject: 'استرداد مبلغ موعد ملغي', ticket_type: 'استرداد', priority: 'normal', status: 'resolved', customer_name: 'خالد الزهراني', assignee_user_id: 'demo-user-khalid', assignee_name: 'خالد', created_at: ago(2 * 24 * 60), due_at: ago(24 * 60), ai_call_id: 'call-001' }),
]

export const DEMO_TICKET_NOTES: TicketNote[] = [
  { id: 'n1', ticket_id: 'demo-tk-1038', company_id: COMPANY, kind: 'assign', body: 'معيّنة لـ خالد', author_name: 'د. أحمد الزهراني', created_at: ago(19 * 60) },
  { id: 'n2', ticket_id: 'demo-tk-1038', company_id: COMPANY, kind: 'status', body: 'بدأت المعالجة', author_name: 'خالد', created_at: ago(18 * 60) },
  { id: 'n3', ticket_id: 'demo-tk-1038', company_id: COMPANY, kind: 'note', body: 'اتصلت عليه واعتذرت، يبي خصم على الزيارة الجاية. أنتظر موافقة المدير.', author_name: 'خالد', created_at: ago(17 * 60) },
  { id: 'n4', ticket_id: 'demo-tk-1031', company_id: COMPANY, kind: 'status', body: 'تم الحل', author_name: 'خالد', created_at: ago(30 * 60) },
]

export const DEMO_UNANSWERED: UnansweredQuestion[] = [
  { id: 'uq-1', company_id: COMPANY, question: 'عندكم جلسات تبييض بالليزر؟', count: 3, last_asked_at: ago(40), answered_at: null, knowledge_item_id: null, ai_call_id: null },
  { id: 'uq-2', company_id: COMPANY, question: 'تقبلون تأمين التعاونية؟', count: 2, last_asked_at: ago(180), answered_at: null, knowledge_item_id: null, ai_call_id: null },
  { id: 'uq-3', company_id: COMPANY, question: 'وش أقرب فرع لحي النرجس؟', count: 1, last_asked_at: ago(26 * 60), answered_at: null, knowledge_item_id: null, ai_call_id: null },
]

function kb(id: string, category: string, title: string, content: string): OpsKnowledgeItem {
  return { id, company_id: COMPANY, type: 'faq', title, content, metadata: { category }, is_active: true, created_at: ago(30 * 24 * 60), updated_at: ago(30 * 24 * 60) }
}

export const DEMO_KB: OpsKnowledgeItem[] = [
  kb('kb-1', 'الأسعار', 'كم سعر الكشف العام؟', '150 ريال، ومع التأمين حسب التغطية.'),
  kb('kb-2', 'الأسعار', 'كم سعر تنظيف الأسنان؟', '300 ريال.'),
  kb('kb-3', 'الأسعار', 'كم سعر زراعة السن؟', 'يبدأ من 3000 ريال حسب الحالة.'),
  kb('kb-4', 'المواعيد والدوام', 'وش أوقات الدوام؟', 'الأحد إلى الخميس 9 الصبح إلى 9 الليل، والسبت 10 إلى 8.'),
  kb('kb-5', 'المواعيد والدوام', 'أقدر ألغي موعدي؟', 'إيه، مجانًا إذا قبل الموعد بـ 24 ساعة.'),
  kb('kb-6', 'التأمين', 'وش شركات التأمين المقبولة؟', 'بوبا، ميدغلف، ملاذ، AXA.'),
  kb('kb-7', 'الموقع', 'وين موقعكم؟', 'جدة، حي الروضة، شارع الأمير سلطان، ومواقف مجانية قدام العيادة.'),
]

export const DEMO_AGENT_SETTINGS: AgentSettings = {
  company_id: COMPANY,
  agent_name: 'مها',
  voice_label: 'نسائي سعودي (نجدي)',
  greeting: 'هلا وغلا، معك مها من عيادات نور للأسنان، كيف أقدر أخدمك؟',
  transfer_number: '0112345678',
  channels: { phone: true, whatsapp: true, web: false },
  working_hours: [
    { day: 0, open: true, from: '09:00', to: '21:00' },
    { day: 1, open: true, from: '09:00', to: '21:00' },
    { day: 2, open: true, from: '09:00', to: '21:00' },
    { day: 3, open: true, from: '09:00', to: '21:00' },
    { day: 4, open: true, from: '09:00', to: '21:00' },
    { day: 5, open: false, from: '', to: '' },
    { day: 6, open: true, from: '10:00', to: '20:00' },
  ],
  after_hours_mode: 'take',
  paused: false,
  updated_at: ago(3 * 24 * 60),
}

export const DEMO_TEST_LINES: ['a' | 'c', string][] = [
  ['a', 'هلا وغلا، معك مها من عيادات نور للأسنان، كيف أقدر أخدمك؟'],
  ['c', 'أبغى موعد تنظيف أسنان الأسبوع الجاي'],
  ['a', 'أبشر، عندي الأحد الساعة عشر ونص الصبح أو الاثنين أربع العصر، وش يناسبك؟'],
  ['c', 'الأحد عشر ونص'],
  ['a', 'تم حجز موعدك الأحد 10:30 الصبح، وبيوصلك تأكيد على الواتساب.'],
]
