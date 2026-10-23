// Builds the static, crawlable SEO pages under public/<slug>/index.html, plus sitemap.xml and llms.txt.
// Run: node scripts/build-seo-pages.mjs
// Plain HTML (no JS framework) so search engines and AI crawlers read the full text without rendering.
import fs from 'node:fs'
import path from 'node:path'

const ORIGIN = 'https://madar.software'
const CAL = 'https://cal.eu/jasem-altubaishi-mvxhz5/madar-.-ai'
const MAIL = 'Jasemaltubaishi@gmail.com'
const root = path.resolve(import.meta.dirname, '..')
const TODAY = new Date().toISOString().slice(0, 10)

/** Every page: slug, title (<=60 chars ideally), description (~150), h1, intro, sections, faqs, related. */
const PAGES = [
  {
    slug: 'whatsapp-chatbot', kind: 'service',
    title: 'شات بوت واتساب للشركات في السعودية | مدار',
    description: 'شات بوت واتساب بالذكاء الاصطناعي يرد على عملائك بالعربي واللهجة السعودية 24/7، يجاوب ويحجز ويتابع، ويحوّل لفريقك عند الحاجة. ابدأ مع مدار.',
    h1: 'شات بوت واتساب للشركات: يرد على عملائك 24 ساعة',
    intro: 'أغلب عملائك يراسلونك على واتساب، وكل رسالة تتأخر عليها قد تروح لمنافس. شات بوت واتساب من مدار هو وكيل ذكاء اصطناعي يستقبل الرسائل، يفهم طلب العميل بلغته، ويرد فورًا بمعلومات شركتك الحقيقية، ثم يحجز أو يسجّل الطلب أو يحوّله لموظف عندك.',
    sections: [
      { h2: 'ما الذي يسويه شات بوت واتساب من مدار؟', p: ['يستقبل كل رسالة تصل لرقم واتساب الأعمال عندك، في أي ساعة، ويرد خلال ثواني بدل ما العميل ينتظر ساعات.', 'يجاوب على الأسئلة المتكررة (الأسعار، المواعيد، الموقع، الخدمات) من قاعدة معرفة تكتبها أنت، فلا يخترع معلومات.'], ul: ['يرد بالعربية الفصحى أو باللهجة السعودية حسب كلام العميل', 'يجمع بيانات العميل (الاسم، الرقم، الاهتمام، الوقت المناسب)', 'يحجز المواعيد أو يسجّل طلب الزيارة أو المعاينة', 'يفتح تذكرة متابعة لفريقك عندما يطلب العميل اتصالًا أو يحتاج قرار إدارة', 'يرسل لك إشعارًا بكل محادثة جديدة'] },
      { h2: 'الفرق بين الشات بوت الجاهز ووكيل مدار', p: ['الشات بوت التقليدي يعتمد على أزرار وقوائم ثابتة، وأي عميل يكتب خارج السيناريو يتوقف عنده. وكيل مدار يفهم النص الحر، ويكمل المحادثة كما يسويها موظف مدرّب، ويرجع لقاعدة معرفتك في كل رد.', 'وتشوف كل محادثة في لوحة تحكم واحدة: نص المحادثة، ملخصها، وسومها التلقائية (مبيعات، استفسار، شكوى)، وتقييم نتيجتها.'] },
      { h2: 'كيف يبدأ التشغيل؟', p: ['نربط رقم واتساب الأعمال عندك، ونعبّي قاعدة المعرفة بخدماتك وأسعارك وأسئلة عملائك، ونضبط الوكيل على أسلوب شركتك. التشغيل يتم خلال أيام، ولا يحتاج تغيّر نظامك الحالي.'] },
      { h2: 'لمن يناسب؟', p: ['لأي نشاط يستقبل استفسارات وطلبات على واتساب: شركات العقار، العيادات والمراكز الطبية، المتاجر الإلكترونية، شركات الخدمات، والمطاعم والفعاليات. لكل قطاع صفحة توضح الاستخدام.'] },
    ],
    faqs: [
      ['هل شات بوت واتساب يفهم اللهجة السعودية؟', 'نعم، الوكيل مصمم للعربية بلهجاتها الخليجية والسعودية، ويرد بنفس أسلوب العميل.'],
      ['هل أحتاج رقم واتساب جديد؟', 'تحتاج رقم واتساب للأعمال (WhatsApp Business API) مربوط بالوكيل. نساعدك في الربط.'],
      ['ماذا لو ما عرف الوكيل الجواب؟', 'يوضّح للعميل أنه سيحوّل طلبه لفريقك، ويسجّل السؤال في قاعدة المعرفة عشان تضيف جوابه، وتصلك تذكرة متابعة.'],
      ['هل أقدر أشوف المحادثات؟', 'نعم، كل المحادثات في لوحة التحكم مع ملخصاتها وتحليلها وإمكانية الرد من جوالك.'],
    ],
    related: ['ai-sales-agent', 'arabic-chatbot', 'chatbot-vs-ai-agent', 'ecommerce-ai'],
  },
  {
    slug: 'ai-sales-agent', kind: 'service',
    title: 'وكيل مبيعات بالذكاء الاصطناعي يرد ويتابع العملاء | مدار',
    description: 'وكيل مبيعات بالذكاء الاصطناعي يرد على الاستفسارات، يؤهل العملاء المحتملين، يحجز المواعيد ويتابع من يحتاج متابعة. يعمل على واتساب والمكالمات.',
    h1: 'وكيل مبيعات بالذكاء الاصطناعي: لا يضيع عليك عميل',
    intro: 'فريق المبيعات ما يقدر يرد على الجميع في كل وقت، والعميل المهتم لا ينتظر. وكيل المبيعات من مدار يرد فورًا، يسأل الأسئلة الصحيحة ليفهم احتياج العميل، ويسلّم لفريقك عميلًا جاهزًا بدل رسالة خام.',
    sections: [
      { h2: 'من أول رسالة إلى عميل جاهز للمتابعة', p: ['يبدأ الوكيل المحادثة بتحية مناسبة لشركتك، ثم يعرف الاهتمام (شراء، استثمار، استفسار)، ويجمع الاسم ورقم التواصل والوقت المناسب، ويعطي معلومات من قاعدة معرفتك فقط.'], ul: ['تأهيل العملاء المحتملين بأسئلة تحددها أنت', 'تسجيل طلب الزيارة أو الموعد وقراءة وقته من كلام العميل', 'تذكرة متابعة تلقائية لفريقك عند طلب اتصال أو عرض سعر', 'وسوم تلقائية لكل محادثة: مبيعات، استفسار، شكوى، استرجاع'] },
      { h2: 'تحليل كل محادثة', p: ['كل محادثة تنحلل: هل نجحت أم لا، مشاعر العميل، البيانات اللي جمعها الوكيل، وملخص بسطرين. هذا يعطيك صورة عن جودة المبيعات بدون ما تقرأ آلاف الرسائل.', 'وتقدر تضيف وسومك الخاصة وتحدد كلماتها، وتغيّر ألوانها وأسماءها.'] },
      { h2: 'يشتغل مع فريقك مو بدالهم', p: ['الوكيل يستلم الرد الأول والمتكرر، وفريقك يركز على الإغلاق. وعند الحاجة تقدر تسند أي محادثة لموظف وتكتب ملاحظة داخلية يشوفها الفريق فقط.'] },
    ],
    faqs: [
      ['هل يحل محل مندوب المبيعات؟', 'لا. يرد على الأسئلة الأولى ويجمع بيانات العميل ويتابع، وتبقى صفقات الإغلاق والتفاوض عند فريقك.'],
      ['هل يعطي أسعارًا غير صحيحة؟', 'يجاوب فقط من قاعدة المعرفة التي تكتبها. وما يعرفه يحوّله لفريقك بدل ما يخمّن.'],
      ['على أي قنوات يعمل؟', 'واتساب والمكالمات الهاتفية وموقعك الإلكتروني.'],
    ],
    related: ['whatsapp-chatbot', 'ai-voice-agent', 'real-estate-ai', 'ai-for-business-guide'],
  },
  {
    slug: 'ai-voice-agent', kind: 'service',
    title: 'موظف استقبال ذكي: رد آلي على المكالمات بالعربي | مدار',
    description: 'موظف استقبال بالذكاء الاصطناعي يرد على المكالمات الهاتفية بصوت طبيعي وباللهجة السعودية، يحجز المواعيد ويسجّل الطلبات ويحوّل للفريق عند الحاجة.',
    h1: 'موظف استقبال ذكي يرد على مكالماتك بصوت طبيعي',
    intro: 'المكالمة الفائتة عميل ضايع. موظف الاستقبال الذكي من مدار (Voice Agent) يرد على مكالمات شركتك على مدار الساعة، يفهم العميل بلهجته، يجاوب ويحجز ويسجّل، ثم يرسل لك ملخص المكالمة.',
    sections: [
      { h2: 'كيف يتعامل مع المكالمة؟', p: ['يرد خلال ثواني بتحية باسم شركتك، يسمع طلب العميل ويسأل أسئلة توضيحية مثل أي موظف استقبال، ثم ينفذ: يعطي معلومة، يحجز موعدًا، أو يسجّل طلبًا لفريقك.'], ul: ['يفهم اللهجات الخليجية والسعودية', 'يحجز على تقويمك الفعلي ويتجنب التعارض', 'يحوّل المكالمة أو يسجّلها لفريقك عند الحاجة', 'تسجيل صوتي لكل مكالمة وملخص مكتوب وتحليل للنتيجة'] },
      { h2: 'تسجيلات وتحليل في لوحة واحدة', p: ['كل مكالمة تظهر في لوحة التحكم مع التسجيل الصوتي، نص المحادثة، ملخصها، ووسومها، وهل نجحت. تقدر تفلتر المكالمات التي تحتاج تدخلًا وتصدّرها إلى Excel.'] },
      { h2: 'مع واتساب في نظام واحد', p: ['الوكيل نفسه يستقبل المكالمات ورسائل واتساب، فيشوف فريقك تاريخ العميل كاملًا في مكان واحد بدل ما يتفرق بين رقمين وتطبيقين.'] },
    ],
    faqs: [
      ['هل الصوت طبيعي؟', 'نعم، صوت عربي طبيعي، وتختار الصوت المناسب لشركتك.'],
      ['هل أستخدم رقمي الحالي؟', 'نربط وكيل الصوت بخطك أو برقم جديد حسب وضعك.'],
      ['كم يستغرق التشغيل؟', 'أيام وليس شهور، حسب جاهزية رقمك ومحتوى قاعدة المعرفة.'],
    ],
    related: ['ai-sales-agent', 'whatsapp-chatbot', 'clinics-ai', 'arabic-chatbot'],
  },
  {
    slug: 'arabic-chatbot', kind: 'service',
    title: 'شات بوت عربي يفهم اللهجة السعودية | مدار',
    description: 'شات بوت عربي بالذكاء الاصطناعي مبني للهجة السعودية والخليجية. يفهم العميل مثل ما يتكلم ويرد بأسلوب طبيعي على واتساب والمكالمات.',
    h1: 'شات بوت عربي يفهم عميلك مثل ما يتكلم',
    intro: 'أغلب أدوات الشات بوت مبنية للإنجليزية ثم تُترجم، فتطلع ردودها جامدة وتغلط في اللهجة. مدار يبني الوكيل للعربية من الأساس، بالفصحى واللهجة السعودية، ويفهم صيغ مثل «أبغى» و«وش عندكم» و«كم السعر» بدون ما يتلخبط.',
    sections: [
      { h2: 'ليش اللغة تفرق في المبيعات؟', p: ['العميل يرتاح أكثر لما يحس أن الطرف الثاني يفهمه. الرد الطبيعي بنفس أسلوبه يرفع الثقة ويقلل التسرب من المحادثة.'] },
      { h2: 'ماذا يفهم الوكيل؟', ul: ['الأرقام والمواعيد بصيغ مختلفة (بكرة الساعة ٥ العصر)', 'الأسماء العربية وأرقام الجوال السعودية', 'الأسئلة المختصرة والأخطاء الإملائية الشائعة', 'التنقل بين الفصحى والعامية في نفس المحادثة'], p: [] },
      { h2: 'تحكم كامل في المحتوى', p: ['الوكيل يجاوب من قاعدة معرفة تكتبها أنت، وتغيّر نبرته وطريقة ترحيبه وساعات عمله من لوحة التحكم، فيبقى صوت شركتك أنت.'] },
    ],
    faqs: [
      ['هل يدعم الإنجليزية؟', 'نعم، يتبع لغة العميل، لكن تركيزنا الأول العربية.'],
      ['هل يخطئ في اللهجة؟', 'بُني للهجة الخليجية والسعودية، ونراجع المحادثات الفعلية ونحسّن القاعدة باستمرار.'],
    ],
    related: ['whatsapp-chatbot', 'chatbot-vs-ai-agent', 'ai-for-business-guide'],
  },
  {
    slug: 'real-estate-ai', kind: 'service',
    title: 'وكيل ذكاء اصطناعي لشركات العقار: ردود وحجز زيارات | مدار',
    description: 'وكيل ذكاء اصطناعي لشركات التطوير والتسويق العقاري: يرد على استفسارات المشاريع والوحدات، يسجّل طلبات الزيارة ويؤهل المشترين على واتساب والاتصال.',
    h1: 'وكيل ذكاء اصطناعي لشركات العقار والمشاريع',
    intro: 'حملات العقار تجيب استفسارات بالمئات: «وش المشاريع؟ كم السعر؟ أقدر أزور؟». وكيل مدار يرد على كل استفسار فورًا، يفرز الجاد من المتصفح، ويسجّل طلب الزيارة بوقته ورقم العميل ليتابعه فريق المبيعات.',
    sections: [
      { h2: 'ماذا يسوي مع المشتري؟', ul: ['يعرّف بالمشروع والوحدات المتاحة من قاعدة معرفتك', 'يسأل: سكن أم استثمار؟ الميزانية؟ طريقة الدفع؟', 'يسجّل طلب زيارة المشروع ويقرأ الوقت المطلوب', 'يفتح تذكرة لفريق المبيعات برقم العميل وملخص طلبه', 'يتابع من طلب عرضًا أو اتصالًا'], p: [] },
      { h2: 'لا تفوّت عميلًا بعد الدوام', p: ['كثير من المشترين يراسلون مساءً أو في الإجازة. الوكيل يرد بنفس اللحظة ويحفظ بياناتهم، وفريقك يتابع صباحًا وهم جاهزين.'] },
      { h2: 'تقارير تفهمك مصدر العملاء', p: ['تشوف عدد المحادثات حسب اليوم والساعة، الموضوعات الأكثر سؤالًا (أسعار، تمويل، مواقع)، وما الأسئلة التي ما عرف الوكيل جوابها لتضيفها.'] },
    ],
    faqs: [
      ['هل يعطي أسعار الوحدات؟', 'يعطي الأسعار التي تضيفها أنت في قاعدة المعرفة، ولا يخترع أرقامًا.'],
      ['هل يحجز الزيارة فعليًا؟', 'يسجّل طلب الزيارة كموعد معلّق، ويؤكده فريقك مع العميل.'],
    ],
    related: ['ai-sales-agent', 'whatsapp-chatbot', 'ai-voice-agent'],
  },
  {
    slug: 'clinics-ai', kind: 'service',
    title: 'موظف استقبال ذكي للعيادات: حجز مواعيد واتساب | مدار',
    description: 'موظف استقبال بالذكاء الاصطناعي للعيادات والمراكز الطبية: يرد على واتساب والمكالمات، يحجز المواعيد، يذكّر المراجعين ويقلل ضياع الحجوزات.',
    h1: 'موظف استقبال ذكي للعيادات والمراكز',
    intro: 'استقبال العيادة مشغول بين المراجعين والهاتف والواتساب. موظف الاستقبال الذكي من مدار يرد على الحجوزات والاستفسارات في أي وقت، ويترك لفريقك الاهتمام بمن في الصالة.',
    sections: [
      { h2: 'حجز المواعيد بدون ازدحام', ul: ['يعرض المواعيد المتاحة ويحجز على التقويم', 'يعيد الجدولة أو يلغي بطلب المراجع', 'يرسل تذكيرًا قبل الموعد لتقليل التغيّب', 'يسجّل ملاحظات المراجع لفريق الاستقبال'], p: [] },
      { h2: 'استفسارات متكررة بدون جهد', p: ['أوقات الدوام، الموقع، الخدمات، والأسعار المعلنة، كلها يجاوب عليها الوكيل من قاعدة معرفتك، ولا يقدّم نصيحة طبية ولا تشخيصًا.'] },
      { h2: 'لوحة تحكم لفريقك', p: ['تشوف الحجوزات والمراجعين والمحادثات والتذاكر في مكان واحد، ويستطيع كل موظف استلام المحادثة التي تخصه.'] },
    ],
    faqs: [
      ['هل يعطي نصائح طبية؟', 'لا. يجاوب عن الخدمات والمواعيد والمعلومات المعلنة فقط، ويحوّل أي سؤال طبي للفريق.'],
      ['هل يرتبط بتقويم العيادة؟', 'يرتبط بتقويم Google ويحجز فيه ويتجنب التعارض.'],
    ],
    related: ['ai-voice-agent', 'whatsapp-chatbot', 'ai-sales-agent'],
  },
  {
    slug: 'ecommerce-ai', kind: 'service',
    title: 'شات بوت للمتاجر الإلكترونية: ردود الطلبات والاستفسارات | مدار',
    description: 'شات بوت بالذكاء الاصطناعي للمتاجر الإلكترونية: يجاوب عن المنتجات والشحن والاسترجاع، ويتابع العملاء المترددين على واتساب بالعربي.',
    h1: 'شات بوت للمتاجر الإلكترونية على واتساب',
    intro: 'عملاء المتاجر يسألون عن التوفر والمقاسات والشحن قبل ما يشترون، وكل ساعة تأخير ترفع احتمال التراجع. وكيل مدار يرد على استفسارات المنتجات والطلبات فورًا ويتابع العميل المتردد.',
    sections: [
      { h2: 'ما الذي يغطيه؟', ul: ['أسئلة المنتجات والتوفر والمقاسات', 'سياسة الشحن والاسترجاع والاستبدال', 'تسجيل طلبات الاتصال والشكاوى بتذكرة للفريق', 'متابعة العملاء الذين سألوا ولم يكملوا الشراء'], p: [] },
      { h2: 'يعرف متجرك لأنك أنت من يعلّمه', p: ['تضيف معلومات المنتجات والسياسات في قاعدة المعرفة، والوكيل يجاوب منها. وما لا يعرفه يسجّله كسؤال بلا جواب لتضيفه.'] },
    ],
    faqs: [
      ['هل يرتبط بمتجري في سلة أو زد؟', 'الربط حسب المتجر والمتطلبات، ونناقشه في الجلسة التعريفية. تواصل معنا لتأكيد التفاصيل.'],
      ['هل يرد على الشكاوى؟', 'يستمع للعميل ويسجّل الشكوى بتذكرة لفريقك، ويتجنب وعودًا لا يملك صلاحيتها.'],
    ],
    related: ['whatsapp-chatbot', 'ai-sales-agent', 'chatbot-vs-ai-agent'],
  },
  {
    slug: 'chatbot-vs-ai-agent', kind: 'article',
    title: 'الفرق بين الشات بوت التقليدي ووكيل الذكاء الاصطناعي | مدار',
    description: 'ما الفرق بين الشات بوت التقليدي ووكيل الذكاء الاصطناعي؟ مقارنة واضحة في الفهم والمرونة والتكامل، ومتى تحتاج كل واحد لشركتك.',
    h1: 'الفرق بين الشات بوت التقليدي ووكيل الذكاء الاصطناعي',
    intro: 'كثير يسمي أي برنامج يرد تلقائيًا «شات بوت»، لكن الفرق بين الشات بوت التقليدي ووكيل الذكاء الاصطناعي كبير في تجربة العميل ونتيجة العمل. هذا الدليل يوضح الفرق ومتى يناسبك كل نوع.',
    sections: [
      { h2: 'الشات بوت التقليدي', p: ['يعمل بسيناريو ثابت: أزرار وخيارات وأسئلة محددة. مناسب للحالات البسيطة جدًا، لكنه يتوقف عند أي سؤال خارج الشجرة، ويحتاج تعديلًا يدويًا كلما تغيّر شيء.'] },
      { h2: 'وكيل الذكاء الاصطناعي', p: ['يفهم النص الحر والصوت، يتذكر سياق المحادثة، ويرجع لقاعدة معرفة محدثة قبل كل رد. ويقدر ينفذ إجراءات مثل حجز موعد أو تسجيل طلب أو فتح تذكرة.'] },
      { h2: 'مقارنة سريعة', ul: ['الفهم: الشات بوت التقليدي كلمات مفتاحية، الوكيل يفهم المعنى', 'المرونة: التقليدي يحتاج سيناريو لكل حالة، الوكيل يتعامل مع الصياغات المختلفة', 'اللغة: الوكيل الجيد يدعم اللهجة، التقليدي غالبًا فصحى جامدة', 'التنفيذ: الوكيل يحجز ويسجّل ويتابع، التقليدي يوجّه فقط', 'الصيانة: الوكيل يتحدث بتحديث قاعدة المعرفة بدل إعادة بناء السيناريوهات'], p: [] },
      { h2: 'متى تختار كل واحد؟', p: ['إذا احتياجك قائمة خيارات بسيطة ومحدودة فالتقليدي يكفي. إذا عندك عملاء يسألون بطرق مختلفة ويحتاجون حجزًا أو متابعة، فوكيل الذكاء الاصطناعي هو الأنسب، وهذا ما تبنيه مدار.'] },
    ],
    faqs: [
      ['هل وكيل الذكاء الاصطناعي أغلى؟', 'التكلفة تختلف حسب القنوات والحجم، ويُقاس العائد بالمحادثات التي يغطيها وبالعملاء الذين لا تفوتهم.'],
      ['هل يمكن الاعتماد عليه بدون مراجعة؟', 'الأفضل مراجعة المحادثات في الأسابيع الأولى وتحسين قاعدة المعرفة، والوكيل يحوّل ما لا يعرفه لفريقك.'],
    ],
    related: ['whatsapp-chatbot', 'ai-for-business-guide', 'arabic-chatbot'],
  },
  {
    slug: 'ai-for-business-guide', kind: 'article',
    title: 'الذكاء الاصطناعي للشركات في السعودية: دليل البداية | مدار',
    description: 'دليل عملي لاستخدام الذكاء الاصطناعي في خدمة العملاء والمبيعات للشركات الصغيرة والمتوسطة في السعودية: من أين تبدأ وكيف تقيس النتيجة.',
    h1: 'الذكاء الاصطناعي للشركات في السعودية: من أين تبدأ؟',
    intro: 'الذكاء الاصطناعي ما عاد حكرًا على الشركات الكبرى. أبسط وأسرع مكان تبدأ منه هو خدمة العملاء والمبيعات: الرد على الرسائل والمكالمات، وتسجيل الطلبات، ومتابعة من يحتاج متابعة. هذا الدليل يختصر الخطوات.',
    sections: [
      { h2: 'ابدأ من المشكلة وليس من الأداة', p: ['اسأل نفسك: كم عميل يراسلني ولا أرد في وقته؟ كم مكالمة تفوتني؟ كم ساعة يقضيها فريقي في أسئلة متكررة؟ الجواب يحدد أين يفيدك الذكاء الاصطناعي أولًا.'] },
      { h2: 'جهّز قاعدة معرفتك', p: ['جودة رد الوكيل من جودة المعلومات التي يرجع لها. اكتب خدماتك وأسعارك وسياساتك وأسئلة عملائك الشائعة بوضوح، وحدّثها كلما تغير شيء.'] },
      { h2: 'ابدأ بقناة واحدة', p: ['واتساب غالبًا أنسب نقطة بداية في السعودية، ثم تضيف المكالمات. لا تغيّر كل شيء مرة وحدة.'] },
      { h2: 'قِس النتيجة', ul: ['زمن الرد الأول', 'عدد المحادثات التي غطاها الوكيل بدون تدخل', 'عدد الطلبات والمواعيد المسجّلة', 'الأسئلة التي لم يعرف جوابها وأضفتها للقاعدة', 'رضا العملاء ومشاعرهم في المحادثات'], p: [] },
      { h2: 'لا تلغي العنصر البشري', p: ['أفضل استخدام يجعل الوكيل يستلم المتكرر والأولي، وفريقك يتعامل مع الحالات التي تحتاج حكمًا وعلاقة. لذلك تأكد أن الأداة تحوّل للبشر بسهولة وتعطيهم ملخصًا.'] },
    ],
    faqs: [
      ['كم يستغرق تطبيق وكيل ذكاء اصطناعي؟', 'مع مدار يتم التشغيل خلال أيام بعد ربط القنوات وتجهيز قاعدة المعرفة.'],
      ['هل بيانات العملاء آمنة؟', 'بياناتك معزولة لحسابك، وتبقى أنت مالكها. اقرأ سياسة الخصوصية للتفاصيل.'],
    ],
    related: ['chatbot-vs-ai-agent', 'whatsapp-chatbot', 'ai-sales-agent', 'faq'],
  },
  {
    slug: 'faq', kind: 'faq',
    title: 'الأسئلة الشائعة عن وكيل الذكاء الاصطناعي من مدار',
    description: 'إجابات عن أسئلة الشركات حول وكيل مدار: اللهجة السعودية، واتساب، المكالمات، الأمان، مدة التشغيل، التحويل للفريق ولوحة التحكم.',
    h1: 'الأسئلة الشائعة عن مدار',
    intro: 'جمعنا هنا أكثر الأسئلة التي يسألها أصحاب الأعمال قبل ما يبدأون مع وكيل الذكاء الاصطناعي. ما لقيت سؤالك؟ تواصل معنا ونجاوبك.',
    sections: [],
    faqs: [
      ['ما هو مدار؟', 'مدار شركة سعودية تبني وكيل ذكاء اصطناعي يرد على عملاء شركتك على واتساب والمكالمات، يحجز ويسجّل الطلبات ويتابع، مع لوحة تحكم تعرض كل المحادثات وتحليلها.'],
      ['هل يفهم اللهجة السعودية؟', 'نعم، الوكيل مصمم للعربية بلهجاتها الخليجية والسعودية ويتبع أسلوب العميل.'],
      ['على أي قنوات يعمل؟', 'واتساب (WhatsApp Business API) والمكالمات الهاتفية وموقعك الإلكتروني.'],
      ['كم يستغرق التشغيل؟', 'أيام وليس شهور. نربط القنوات، ونجهّز قاعدة المعرفة، ونضبط الوكيل على أسلوب شركتك.'],
      ['ماذا لو ما عرف الوكيل الجواب؟', 'يوضّح للعميل أنه سيحوّل طلبه، ويسجّل السؤال في قاعدة المعرفة لتضيف جوابه، وتصلك تذكرة متابعة.'],
      ['هل أقدر أستلم المحادثة بنفسي؟', 'نعم. تقدر تسند أي محادثة لموظف، وتكتب ملاحظات داخلية، وتراسل العميل من جوالك.'],
      ['هل بياناتي وبيانات عملائي آمنة؟', 'بيانات كل حساب معزولة عن غيرها، وأنت المالك الوحيد لبيانات عملائك. التفاصيل في سياسة الخصوصية.'],
      ['كيف أبدأ؟', 'احجز جلسة تعريفية مجانية من الصفحة الرئيسية، ونحدد معك القناة الأنسب وخطة التشغيل.'],
    ],
    related: ['whatsapp-chatbot', 'ai-sales-agent', 'ai-voice-agent', 'arabic-chatbot'],
  },
]

const byslug = Object.fromEntries(PAGES.map((p) => [p.slug, p]))
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const NAV = [['whatsapp-chatbot', 'شات بوت واتساب'], ['ai-sales-agent', 'وكيل المبيعات'], ['ai-voice-agent', 'الرد على المكالمات'], ['faq', 'الأسئلة الشائعة']]

const CSS = `
:root{--bg:#070b14;--card:#0e1524;--ink:#eaf1fb;--ink2:#9fb2cc;--line:rgba(255,255,255,.09);--accent:#4fa3ff;--accent2:#7aa2ff}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--ink);font-family:'IBM Plex Sans Arabic',system-ui,'Segoe UI',Tahoma,sans-serif;line-height:1.95;font-size:16.5px}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
header.site{position:sticky;top:0;z-index:10;background:rgba(7,11,20,.88);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.bar{max-width:1040px;margin:0 auto;padding:12px 20px;display:flex;align-items:center;gap:18px;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:9px;color:var(--ink);font-weight:700;font-size:18px;margin-inline-end:auto}
.brand img{height:30px;width:auto}.brand b{color:var(--accent2)}
.bar nav{display:flex;gap:16px;flex-wrap:wrap;font-size:14.5px}.bar nav a{color:var(--ink2)}
.cta{background:linear-gradient(135deg,#3a78ff,#6b4dff);color:#fff!important;padding:8px 18px;border-radius:99px;font-weight:600;font-size:14px}
main{max-width:820px;margin:0 auto;padding:40px 20px 64px}
.crumbs{font-size:13px;color:var(--ink2);margin-bottom:18px}.crumbs a{color:var(--ink2)}
h1{font-size:clamp(28px,4.6vw,42px);line-height:1.45;margin-bottom:16px;text-wrap:balance}
h2{font-size:clamp(21px,3vw,27px);margin:38px 0 12px;line-height:1.5}
p{margin-bottom:14px;color:#d3deef}
.intro{font-size:18px;color:#e4ecf8}
ul{margin:8px 22px 16px 0;padding:0}li{margin-bottom:8px;color:#d3deef}
details{border:1px solid var(--line);border-radius:12px;background:var(--card);padding:14px 18px;margin-bottom:10px}
summary{cursor:pointer;font-weight:600;color:var(--ink)}details p{margin:10px 0 2px}
.box{margin:42px 0 10px;padding:26px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(160deg,#0f1a33,#0b1020);text-align:center}
.box h2{margin:0 0 8px}.box p{margin-bottom:16px}
.rel{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:10px}
.rel a{display:block;padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink);font-size:15px}
footer.site{border-top:1px solid var(--line);background:#050810;padding:34px 20px;color:var(--ink2);font-size:14px}
.fgrid{max-width:1040px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:22px}
.fgrid h3{color:var(--ink);font-size:15px;margin-bottom:8px}.fgrid a{display:block;color:var(--ink2);margin-bottom:5px}
.copy{max-width:1040px;margin:22px auto 0;padding-top:16px;border-top:1px solid var(--line)}
@media (max-width:640px){.bar nav{display:none}}
`

function footer() {
  const services = PAGES.filter((p) => p.kind === 'service').map((p) => `<a href="/${p.slug}/">${esc(p.title.split(' | ')[0])}</a>`).join('')
  const guides = PAGES.filter((p) => p.kind !== 'service').map((p) => `<a href="/${p.slug}/">${esc(p.title.split(' | ')[0])}</a>`).join('')
  return `<footer class="site"><div class="fgrid">
<div><h3>مدار</h3><p style="color:var(--ink2)">وكيل ذكاء اصطناعي عربي يرد على عملائك على واتساب والمكالمات 24/7. جدة، المملكة العربية السعودية.</p></div>
<div><h3>خدماتنا</h3>${services}</div>
<div><h3>أدلة وأسئلة</h3>${guides}</div>
<div><h3>روابط</h3><a href="/">الصفحة الرئيسية</a><a href="/login">تسجيل الدخول</a><a href="/privacy">سياسة الخصوصية</a><a href="/terms">شروط الاستخدام</a><a href="mailto:${MAIL}">${MAIL}</a></div>
</div><div class="copy">© ٢٠٢٦ مدار (madar.software). جميع الحقوق محفوظة.</div></footer>`
}

function render(p) {
  const url = `${ORIGIN}/${p.slug}/`
  const crumbName = p.title.split(' | ')[0]
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': `${ORIGIN}/#organization`, name: 'مدار', alternateName: ['MADAR', 'Madar Software'], url: `${ORIGIN}/`, logo: `${ORIGIN}/favicon-logo.png`, email: MAIL, address: { '@type': 'PostalAddress', addressLocality: 'جدة', addressCountry: 'SA' } },
      { '@type': p.kind === 'article' ? 'Article' : p.kind === 'faq' ? 'FAQPage' : 'Service', '@id': `${url}#main`, name: p.h1, headline: p.h1, description: p.description, url, inLanguage: 'ar-SA',
        ...(p.kind === 'article' ? { author: { '@id': `${ORIGIN}/#organization` }, publisher: { '@id': `${ORIGIN}/#organization` }, datePublished: TODAY, dateModified: TODAY, mainEntityOfPage: url }
          : p.kind === 'service' ? { provider: { '@id': `${ORIGIN}/#organization` }, areaServed: { '@type': 'Country', name: 'Saudi Arabia' }, serviceType: p.h1 } : {}) },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'مدار', item: `${ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: crumbName, item: url } ] },
      ...(p.faqs?.length ? [{ '@type': 'FAQPage', '@id': `${url}#faq`, mainEntity: p.faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }] : []),
    ],
  }
  if (p.kind === 'faq') ld['@graph'][1] = { '@type': 'WebPage', '@id': `${url}#main`, name: p.h1, description: p.description, url, inLanguage: 'ar-SA' }
  const sections = p.sections.map((s) => `<h2>${esc(s.h2)}</h2>${(s.p || []).map((t) => `<p>${esc(t)}</p>`).join('')}${s.ul ? `<ul>${s.ul.map((li) => `<li>${esc(li)}</li>`).join('')}</ul>` : ''}`).join('\n')
  const faqs = p.faqs?.length ? `<h2>أسئلة شائعة</h2>${p.faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}` : ''
  const rel = p.related?.length ? `<h2>مواضيع ذات صلة</h2><div class="rel">${p.related.map((s) => `<a href="/${s}/">${esc(byslug[s].title.split(' | ')[0])}</a>`).join('')}</div>` : ''
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="ar-SA" href="${url}">
<link rel="alternate" hreflang="x-default" href="${url}">
<meta property="og:type" content="${p.kind === 'article' ? 'article' : 'website'}">
<meta property="og:site_name" content="مدار">
<meta property="og:locale" content="ar_SA">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.description)}">
<meta property="og:image" content="${ORIGIN}/og-image.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(p.title)}">
<meta name="twitter:description" content="${esc(p.description)}">
<meta name="twitter:image" content="${ORIGIN}/og-image.jpg">
<meta name="theme-color" content="#070b14">
<link rel="icon" type="image/png" href="/favicon-logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" media="print" onload="this.media='all'">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>${CSS}</style>
</head>
<body>
<header class="site"><div class="bar">
<a class="brand" href="/"><img src="/signal/logo-main.png" alt="مدار" width="30" height="30"><span dir="ltr">madar<b>.software</b></span></a>
<nav aria-label="روابط رئيسية">${NAV.map(([s, n]) => `<a href="/${s}/">${n}</a>`).join('')}<a href="/login">تسجيل الدخول</a></nav>
<a class="cta" href="${CAL}" rel="noopener">احجز جلسة مجانية</a>
</div></header>
<main>
<nav class="crumbs" aria-label="مسار التنقل"><a href="/">مدار</a> › ${esc(crumbName)}</nav>
<h1>${esc(p.h1)}</h1>
<p class="intro">${esc(p.intro)}</p>
${sections}
${faqs}
<div class="box"><h2>جاهز تبدأ؟</h2><p>احجز جلسة تعريفية مجانية ونوريك كيف يشتغل الوكيل على قطاعك وأرقامك.</p><a class="cta" href="${CAL}" rel="noopener">احجز جلسة تعريفية مجانية</a></div>
${rel}
</main>
${footer()}
</body>
</html>
`
}

for (const p of PAGES) {
  const dir = path.join(root, 'public', p.slug)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'index.html'), render(p))
}

const urls = [['/', '1.0'], ...PAGES.map((p) => [`/${p.slug}/`, p.kind === 'service' ? '0.9' : '0.7']), ['/privacy', '0.3'], ['/terms', '0.3']]
fs.writeFileSync(path.join(root, 'public', 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, pr]) => `  <url><loc>${ORIGIN}${u}</loc><lastmod>${TODAY}</lastmod><priority>${pr}</priority></url>`).join('\n')}\n</urlset>\n`)

fs.writeFileSync(path.join(root, 'public', 'llms.txt'),
  `# مدار (madar.software)\n\n> شركة سعودية في جدة تبني وكيل ذكاء اصطناعي عربي يرد على عملاء الشركات على واتساب والمكالمات 24/7، يحجز ويسجّل الطلبات ويتابع، مع لوحة تحكم للمحادثات والتحليل.\n\n## الصفحات الرئيسية\n${PAGES.map((p) => `- [${p.title.split(' | ')[0]}](${ORIGIN}/${p.slug}/): ${p.description}`).join('\n')}\n\n## التواصل\n- جلسة تعريفية: ${CAL}\n- البريد: ${MAIL}\n`)

console.log(`built ${PAGES.length} pages, sitemap.xml, llms.txt`)
