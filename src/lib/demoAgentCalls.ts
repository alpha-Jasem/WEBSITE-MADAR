import type { AICallAnalysis, AICallLog, AITranscriptLine } from '../types/dashboard'

// Agent conversations with full post-call analysis for the /demo-review tour: titles,
// verdicts, evaluation criteria, collected fields, sentiment and cost. All names are
// fictional and numbers are masked.

const ago = (hours: number) => new Date(Date.now() - hours * 3600000).toISOString()

type Field = { value: unknown; rationale: string }
const f = (value: unknown, rationale: string): Field => ({ value, rationale })

function analysis(a: Partial<AICallAnalysis> & { data?: Record<string, Field> }): AICallAnalysis {
  return { warnings: [], language: 'ar', has_audio: false, termination_reason: 'end_call tool was called.', ...a }
}

const ev = (result: 'success' | 'failure' | 'unknown', rationale: string) => ({ result, rationale })

function lines(...pairs: [('a' | 'c'), string][]): AITranscriptLine[] {
  return pairs.map(([who, text], i) => ({ speaker: who === 'a' ? 'agent' : 'patient', text, time: `00:${String(i * 9).padStart(2, '0')}` }))
}

const base = { company_id: 'demo-clinic-001', provider: 'elevenlabs' as const, agent_id: 'demo-agent' }

export const DEMO_AGENT_CALLS: AICallLog[] = [
  {
    ...base, id: 'call-101', external_id: 'conv_demo_101', channel: 'whatsapp', caller_name: 'هيا الزهراني', phone: '055•••4821',
    call_time: ago(1.5), created_at: ago(1.5), duration_seconds: 214, intent: 'new_booking', result: 'booked', status: 'completed', needs_review: false,
    summary: 'سألت عن تبييض الأسنان وأسعاره، ثم حجزت جلسة يوم الأحد مساءً وطلبت تذكيراً قبل الموعد.',
    transcript: lines(
      ['c', 'السلام عليكم، كم سعر تبييض الأسنان عندكم؟'],
      ['a', 'وعليكم السلام! جلسة التبييض بالليزر تبدأ من 900 ريال وتشمل فحص قبلها. تحبين أحجز لك؟'],
      ['c', 'إيه، يناسبني الأحد بعد العصر'],
      ['a', 'عندنا الأحد الساعة 5:30 مساءً متاح. أحجزه باسم مين؟'],
      ['c', 'هيا الزهراني'],
      ['a', 'تم الحجز يا هيا، بيوصلك تأكيد وتذكير قبل الموعد بيوم.'],
    ),
    analysis: analysis({
      call_successful: 'success', title: 'حجز جلسة تبييض', success_score: 0.94, cost_credits: 182,
      sentiment: { label: 'positive', score: 0.71, frustration: 0.04 }, user_id: 'wa-9665•••4821',
      evaluation: {
        'جمع بيانات التواصل': ev('success', 'حصل الموظف على الاسم الكامل ورقم واتساب العميلة.'),
        'تحديد موعد واضح': ev('success', 'اتفق مع العميلة على يوم ووقت محددين وأكدهما.'),
        'الالتزام بالأسعار المعتمدة': ev('success', 'ذكر السعر المطابق لقائمة الخدمات.'),
      },
      data: {
        customer_name: f('هيا الزهراني', 'ذكرت اسمها عند طلب الحجز.'),
        contact_number: f('055•••4821', 'رقم واتساب المحادثة.'),
        interest: f('تبييض الأسنان', 'سألت عن سعر التبييض.'),
        visit_preference: f('الأحد 5:30 مساءً', 'اختارت الوقت المقترح.'),
        requested_next_step: f('تذكير قبل الموعد', 'طلبت تذكيراً.'),
      },
    }),
  },
  {
    ...base, id: 'call-102', external_id: 'conv_demo_102', channel: 'web', caller_name: null, phone: '',
    call_time: ago(4), created_at: ago(4), duration_seconds: 96, intent: 'inquiry', result: 'no_action', status: 'completed', needs_review: false,
    summary: 'زائر سأل عن تقويم الأسنان الشفاف ومدته، ولم يترك بيانات تواصل.',
    transcript: lines(
      ['c', 'هل عندكم تقويم شفاف؟ وكم ياخذ وقت؟'],
      ['a', 'نعم، التقويم الشفاف متوفر، ومدته عادة من 6 إلى 18 شهر حسب الحالة. تحب أحجز لك استشارة مجانية؟'],
      ['c', 'بفكر وأرجع لكم'],
      ['a', 'على راحتك! إذا حاب نتواصل معك اترك رقمك هنا.'],
    ),
    analysis: analysis({
      call_successful: 'failure', title: 'استفسار عن التقويم الشفاف', success_score: 0.32, cost_credits: 64,
      sentiment: { label: 'neutral', score: 0.05, frustration: 0.1 }, user_id: 'web-4f1c',
      termination_reason: 'Client disconnected',
      evaluation: {
        'جمع بيانات التواصل': ev('failure', 'لم يترك الزائر اسماً أو رقماً رغم طلب الموظف.'),
        'تحديد موعد واضح': ev('failure', 'لم يتم الاتفاق على استشارة.'),
        'الالتزام بالأسعار المعتمدة': ev('unknown', 'لم يُطرح سؤال عن السعر.'),
      },
      data: {
        customer_name: f(null, 'لم يذكر اسمه.'),
        contact_number: f(null, 'لم يترك رقماً.'),
        interest: f('تقويم شفاف', 'سأل عن التقويم الشفاف.'),
        visit_preference: f(null, ''),
        requested_next_step: f('سيعود لاحقاً', 'قال إنه سيفكر ويرجع.'),
      },
    }),
  },
  {
    ...base, id: 'call-103', external_id: 'conv_demo_103', channel: 'whatsapp', caller_name: 'ماجد الشهراني', phone: '050•••7310',
    call_time: ago(20), created_at: ago(20), duration_seconds: 305, intent: 'reschedule', result: 'referred', status: 'needs_review', needs_review: true,
    review_reason: 'يطلب استرجاع مبلغ العربون بعد التأجيل',
    summary: 'أراد تأجيل موعد الزراعة وطلب استرجاع العربون، فحُوّل الطلب للاستقبال لأن الاسترجاع يحتاج موافقة.',
    transcript: lines(
      ['c', 'أبغى أأجل موعد الزراعة وأسترجع العربون'],
      ['a', 'أقدر أأجل الموعد لك. بالنسبة للعربون، الاسترجاع يحتاج موافقة الإدارة. أرفع طلبك لهم؟'],
      ['c', 'ليش ما ينرجع مباشرة؟ هذا ثالث مرة أكلمكم'],
      ['a', 'أعتذر عن الإزعاج، رفعت طلبك كأولوية وبيتواصل معك فريق الاستقبال اليوم.'],
    ),
    analysis: analysis({
      call_successful: 'failure', title: 'تأجيل موعد واسترجاع عربون', success_score: 0.41, cost_credits: 240,
      sentiment: { label: 'negative', score: -0.58, frustration: 0.72 }, user_id: 'wa-9665•••7310',
      warnings: ['العميل ذكر أنه تواصل ثلاث مرات بدون حل.'],
      evaluation: {
        'جمع بيانات التواصل': ev('success', 'الرقم معروف من المحادثة.'),
        'تحديد موعد واضح': ev('failure', 'لم يُحدد موعد بديل.'),
        'التحويل عند الحاجة': ev('success', 'حوّل طلب الاسترجاع للإدارة كما هو مطلوب.'),
      },
      data: {
        customer_name: f('ماجد الشهراني', 'من ملف العميل.'),
        contact_number: f('050•••7310', 'رقم واتساب.'),
        interest: f('زراعة الأسنان', 'لديه موعد زراعة.'),
        visit_preference: f(null, 'لم يحدد موعداً بديلاً.'),
        requested_next_step: f('اتصال من الاستقبال بخصوص العربون', 'طلب الاسترجاع.'),
      },
    }),
  },
  {
    ...base, id: 'call-104', external_id: 'conv_demo_104', channel: 'phone', caller_name: 'نوف العمري', phone: '053•••1984',
    call_time: ago(27), created_at: ago(27), duration_seconds: 142, intent: 'new_booking', result: 'booked', status: 'completed', needs_review: false,
    summary: 'حجزت كشفاً عاماً لطفلها يوم الثلاثاء صباحاً.',
    transcript: lines(
      ['a', 'أهلاً بك في عيادات نور، كيف أقدر أخدمك؟'],
      ['c', 'أبغى موعد كشف لولدي عمره سبع سنوات'],
      ['a', 'عندنا طبيبة أسنان أطفال، الثلاثاء 10 صباحاً يناسبك؟'],
      ['c', 'ممتاز'],
    ),
    analysis: analysis({
      call_successful: 'success', title: 'حجز كشف أطفال', success_score: 0.9, cost_credits: 118, has_audio: true,
      sentiment: { label: 'positive', score: 0.52, frustration: 0.02 }, user_id: null,
      evaluation: {
        'جمع بيانات التواصل': ev('success', 'أكد الاسم والرقم.'),
        'تحديد موعد واضح': ev('success', 'الثلاثاء 10 صباحاً.'),
      },
      data: {
        customer_name: f('نوف العمري', 'ذكرت اسمها.'),
        contact_number: f('053•••1984', 'رقم المتصل.'),
        interest: f('كشف أسنان أطفال', 'طلبت كشفاً لطفلها.'),
        visit_preference: f('الثلاثاء 10 صباحاً', 'قبلت الوقت المقترح.'),
        requested_next_step: f(null, ''),
      },
    }),
  },
  {
    ...base, id: 'call-105', external_id: 'conv_demo_105', channel: 'web', caller_name: 'عبدالله القرني', phone: '056•••5502',
    call_time: ago(50), created_at: ago(50), duration_seconds: 188, intent: 'inquiry', result: 'no_action', status: 'completed', needs_review: false,
    summary: 'سأل عن تكلفة زراعة سن واحد وطرق الدفع، وطلب اتصالاً من المختص.',
    transcript: lines(
      ['c', 'كم تكلفة زراعة سن واحد؟ وهل فيه تقسيط؟'],
      ['a', 'تبدأ الزراعة من 3,500 ريال، ونوفر التقسيط عبر تمارا وتابي. تحب يتصل فيك المختص؟'],
      ['c', 'إيه، هذا رقمي 056•••5502'],
    ),
    analysis: analysis({
      call_successful: 'success', title: 'استفسار عن الزراعة والتقسيط', success_score: 0.82, cost_credits: 96,
      sentiment: { label: 'positive', score: 0.34, frustration: 0.05 }, user_id: 'web-8a22',
      evaluation: {
        'جمع بيانات التواصل': ev('success', 'ترك اسمه ورقمه.'),
        'الالتزام بالأسعار المعتمدة': ev('success', 'ذكر السعر الصحيح وخيارات التقسيط.'),
      },
      data: {
        customer_name: f('عبدالله القرني', 'كتب اسمه في المحادثة.'),
        contact_number: f('056•••5502', 'كتب رقمه.'),
        interest: f('زراعة سن', 'سأل عن الزراعة.'),
        budget: f('يفضّل التقسيط', 'سأل عن التقسيط.'),
        visit_preference: f(null, ''),
        requested_next_step: f('اتصال من المختص', 'طلب أن يتصل به المختص.'),
      },
    }),
  },
  {
    ...base, id: 'call-106', external_id: 'conv_demo_106', channel: 'whatsapp', caller_name: 'هيا الزهراني', phone: '055•••4821',
    call_time: ago(75), created_at: ago(75), duration_seconds: 58, intent: 'inquiry', result: 'no_action', status: 'completed', needs_review: false,
    summary: 'سألت عن مواعيد العمل يوم الجمعة.',
    transcript: lines(['c', 'تفتحون يوم الجمعة؟'], ['a', 'الجمعة من 4 العصر إلى 9 مساءً.'], ['c', 'شكراً']),
    analysis: analysis({
      call_successful: 'success', title: 'مواعيد العمل', success_score: 0.88, cost_credits: 31,
      sentiment: { label: 'neutral', score: 0.12, frustration: 0 }, user_id: 'wa-9665•••4821',
      evaluation: { 'إجابة دقيقة': ev('success', 'المواعيد مطابقة لساعات العمل المسجلة.') },
      data: { customer_name: f('هيا الزهراني', ''), contact_number: f('055•••4821', ''), interest: f('مواعيد العمل', '') },
    }),
  },
  {
    ...base, id: 'call-107', external_id: 'conv_demo_107', channel: 'web', caller_name: null, phone: '',
    call_time: ago(98), created_at: ago(98), duration_seconds: 74, intent: 'inquiry', result: 'no_action', status: 'completed', needs_review: false,
    summary: 'سأل عن تبييض الأسنان وهل يسبب حساسية.',
    transcript: lines(['c', 'التبييض يسبب حساسية؟'], ['a', 'قد تظهر حساسية بسيطة لمدة يوم أو يومين وتزول.'], ['c', 'طيب شكراً']),
    analysis: analysis({
      call_successful: 'unknown', title: 'استفسار عن تبييض الأسنان', success_score: null, cost_credits: 42,
      sentiment: { label: 'neutral', score: 0.02, frustration: 0.08 }, user_id: 'web-c901',
      evaluation: { 'جمع بيانات التواصل': ev('failure', 'لم يُطلب الرقم.') },
      data: { customer_name: f(null, ''), contact_number: f(null, ''), interest: f('تبييض الأسنان', 'سأل عن الحساسية بعد التبييض.') },
    }),
  },
  {
    ...base, id: 'call-108', external_id: 'conv_demo_108', channel: 'whatsapp', caller_name: 'سلمان الحارثي', phone: '059•••2266',
    call_time: ago(122), created_at: ago(122), duration_seconds: 167, intent: 'new_booking', result: 'booked', status: 'completed', needs_review: false,
    summary: 'حجز تنظيف أسنان وتلميع يوم السبت ظهراً.',
    transcript: lines(['c', 'أبغى تنظيف وتلميع'], ['a', 'السبت 12 الظهر متاح، أحجزه؟'], ['c', 'تمام']),
    analysis: analysis({
      call_successful: 'success', title: 'حجز تنظيف وتلميع', success_score: 0.91, cost_credits: 88,
      sentiment: { label: 'positive', score: 0.45, frustration: 0.01 }, user_id: 'wa-9665•••2266',
      evaluation: { 'جمع بيانات التواصل': ev('success', 'الاسم والرقم متوفران.'), 'تحديد موعد واضح': ev('success', 'السبت 12 ظهراً.') },
      data: {
        customer_name: f('سلمان الحارثي', ''), contact_number: f('059•••2266', ''), interest: f('تنظيف وتلميع', ''),
        visit_preference: f('السبت 12 ظهراً', ''), requested_next_step: f(null, ''),
      },
    }),
  },
  {
    ...base, id: 'call-109', external_id: 'conv_demo_109', channel: 'web', caller_name: 'ريم الدوسري', phone: '054•••9013',
    call_time: ago(146), created_at: ago(146), duration_seconds: 233, intent: 'new_booking', result: 'failed', status: 'completed', needs_review: false,
    summary: 'أرادت موعداً مسائياً لاستشارة تقويم، ولم يتوفر وقت يناسبها هذا الأسبوع.',
    transcript: lines(['c', 'أبغى استشارة تقويم بعد الساعة 8'], ['a', 'آخر موعد متاح 7:30 مساءً هذا الأسبوع.'], ['c', 'ما يناسبني للأسف']),
    analysis: analysis({
      call_successful: 'failure', title: 'استشارة تقويم بدون موعد مناسب', success_score: 0.28, cost_credits: 121,
      sentiment: { label: 'negative', score: -0.21, frustration: 0.38 }, user_id: 'web-71be',
      evaluation: {
        'جمع بيانات التواصل': ev('success', 'تركت اسمها ورقمها.'),
        'تحديد موعد واضح': ev('failure', 'لم يتوفر موعد في الوقت المطلوب ولم يُعرض الأسبوع القادم.'),
      },
      data: {
        customer_name: f('ريم الدوسري', ''), contact_number: f('054•••9013', ''), interest: f('استشارة تقويم', ''),
        visit_preference: f('بعد الساعة 8 مساءً', 'طلبت موعداً متأخراً.'), requested_next_step: f('إشعار عند توفر موعد مسائي', ''),
      },
    }),
  },
  {
    // Nabrah-style row: only collected data, no verdict or sentiment.
    company_id: 'demo-clinic-001', provider: 'nabrah', id: 'call-110', external_id: 'nbr_demo_110', channel: 'phone', caller_name: 'خالد المالكي', phone: '058•••6640',
    call_time: ago(170), created_at: ago(170), duration_seconds: 121, intent: 'new_booking', result: 'booked', status: 'completed', needs_review: false,
    summary: 'حجز حشوة تجميلية يوم الأربعاء.',
    analysis: { data: { customer_name: 'خالد المالكي', contact_number: '058•••6640', interest: 'حشوة تجميلية' } },
  },
  {
    ...base, id: 'call-111', external_id: 'conv_demo_111', channel: 'whatsapp', caller_name: 'لمى الغامدي', phone: '057•••3391',
    call_time: ago(260), created_at: ago(260), duration_seconds: 140, intent: 'new_booking', result: 'booked', status: 'completed', needs_review: false,
    summary: 'حجزت جلسة تبييض ثانية بعد شهر من الأولى.',
    transcript: lines(['c', 'أبغى أحجز جلسة التبييض الثانية'], ['a', 'تم، الاثنين 6 مساءً.']),
    analysis: analysis({
      call_successful: 'success', title: 'حجز جلسة تبييض', success_score: 0.89, cost_credits: 77,
      sentiment: { label: 'positive', score: 0.6, frustration: 0 }, user_id: 'wa-9665•••3391',
      evaluation: { 'تحديد موعد واضح': ev('success', 'الاثنين 6 مساءً.') },
      data: { customer_name: f('لمى الغامدي', ''), contact_number: f('057•••3391', ''), interest: f('تبييض الأسنان', ''), visit_preference: f('الاثنين 6 مساءً', '') },
    }),
  },
]

/** Analysis added to the original clinic demo calls so the older rows aren't bare. */
export const DEMO_CALL_ANALYSIS: Record<string, AICallAnalysis> = {
  'call-001': analysis({
    call_successful: 'success', title: 'حجز كشف عام', success_score: 0.93, cost_credits: 74, has_audio: true,
    sentiment: { label: 'positive', score: 0.58, frustration: 0.02 },
    evaluation: { 'جمع بيانات التواصل': ev('success', 'أكدت اسمها.'), 'تحديد موعد واضح': ev('success', 'الساعة 4 عصراً مع د. سارة.') },
    data: { customer_name: f('ليلى الغامدي', ''), contact_number: f('0506789012', ''), interest: f('كشف عام', ''), visit_preference: f('اليوم 4 عصراً', '') },
  }),
  'call-003': analysis({
    call_successful: 'failure', title: 'استشارة تقويم مع تعارض', success_score: 0.4, cost_credits: 55,
    sentiment: { label: 'neutral', score: -0.05, frustration: 0.22 },
    warnings: ['تعارض محتمل في جدول د. نورة.'],
    evaluation: { 'تحديد موعد واضح': ev('failure', 'لم يُثبت الموعد بسبب التعارض.'), 'التحويل عند الحاجة': ev('success', 'حُوّل الطلب للاستقبال.') },
    data: { customer_name: f('دانة السلمي', ''), contact_number: f('0505567890', ''), interest: f('استشارة تقويم', ''), visit_preference: f('اليوم الضحى', ''), requested_next_step: f('تأكيد من الاستقبال', '') },
  }),
  'call-004': analysis({
    call_successful: 'failure', title: 'مكالمة انقطعت', success_score: 0.05, cost_credits: 12,
    sentiment: { label: 'neutral', score: 0, frustration: 0.1 }, termination_reason: 'Remote party ended call',
    data: { customer_name: f(null, ''), contact_number: f('0509888777', 'رقم المتصل.') },
  }),
}
