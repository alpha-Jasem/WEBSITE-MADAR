const fs = require('fs');
const API_KEY = fs.readFileSync('c:\\Users\\acer\\Desktop\\ملفي الشركة\\.env', 'utf8').match(/^ELEVENLABS_API_KEY=(.+)$/m)[1].trim();
const AGENT_ID = 'agent_7501kzx1z7xaekxbegasw7cpqs7n';

const GREET = /هلا|أهلين|اهلين|حياك|مرحبا|أبشر|ابشر|وعليكم السلام|السلام عليكم/;
const GENERIC = /وش حاب تعرف|وش تحب تعرف|كيف أقدر أساعدك|سكن ولا استثمار|أي منطقة/;
const ACK = /حقك علينا|فاهم|معك حق|أعتذر|آسف|مزعج|نأسف/;
const ASKS_NAME = /اسم(ك)?\s*(ال)?كامل|اسم العائلة|وش اسمك|ممكن اسمك/;
const CLOSE = /سيتم التواصل مع(ك|كم)\s*من قبل فريق الدعم/;

// Every scenario is a complaint, varying only in how much the customer volunteers
// and how they behave — the axis that broke routing before.
const CASES = [
  { id: 'شكوى + كل البيانات من أول رسالة',
    first: 'ابغا ارفع شكوى واصعدها للمدير. انا عبدالله الغامدي ورقمي 0551234567 والمشكلة تأخر تسليم راز 41',
    // Must restate the complaint verbatim: told only that its data "is already
    // given", the simulated user says just that and never mentions a complaint,
    // which tests nothing.
    persona: 'رسالتك الأولى بالضبط: "ابغا ارفع شكوى واصعدها للمدير. انا عبدالله الغامدي ورقمي 0551234567 والمشكلة تأخر تسليم راز 41". لو سألك عن اسمك قل "عبدالله الغامدي"، وعن رقمك قل "0551234567"، وعن المشكلة قل "تأخر تسليم راز 41".',
    expectAsk: false },
  { id: 'شكوى بدون أي بيانات',
    first: 'ابغا ارفع شكوى الان وابغا اصعدها الى مدير',
    persona: 'ما تعطي بيانات إلا لو سألك. اسمك محمد العتيبي ورقمك 0544445555. المشكلة تأخر تسليم راز 41.', expectAsk: true },
  { id: 'شكوى باسم أول فقط',
    first: 'ابغا ارفع شكوى. اسمي فهد ورقمي 0522223333',
    persona: 'اسمك الأول فهد، ولو طلب اسم العائلة قل "الدوسري". المشكلة تأخر تسليم راز 41.', expectAsk: true },
  { id: 'شكوى مع سؤال سعر (طُعم التوجيه)',
    first: 'عندي شكوى تأخر تسليم بس كمان ابغا اعرف كم سعر شقق راز 41',
    persona: 'اسمك سارة الشمري 0511112222. أصري على الشكوى أول. أعطي بياناتك لو سألك.', expectAsk: true },
  { id: 'عميل غاضب يطالب بتعويض',
    first: 'انتم متأخرين سنة كاملة وابغا تعويض والا ارفع عليكم قضية',
    persona: 'اسمك ماجد الحربي 0577778888. غاضب. أعط بياناتك لو سألك.', expectAsk: true },
  { id: 'شكوى ثم طلب موظف بشري',
    first: 'ابغا ارفع شكوى وبعدها ابغا اكلم موظف حقيقي',
    persona: 'اسمك ريم القحطاني 0533331111. المشكلة تأخر تسليم. أعطي بياناتك لو سألك.', expectAsk: true },
];

async function run(c) {
  const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}/simulate-conversation`, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      simulation_specification: {
        simulated_user_config: { first_message: c.first, language: 'ar', prompt: { prompt: c.persona } },
      },
    }),
  });
  if (!res.ok) return { c, error: `${res.status} ${(await res.text()).slice(0, 120)}` };

  const conv = (await res.json()).simulated_conversation || [];
  const after = conv.slice(conv.findIndex((m) => m.role === 'user') + 1);
  const firstReply = (after.find((m) => m.role === 'agent' && m.message) || {}).message || '';

  // A textless turn is dead air unless it directly follows a tool call, where
  // it is the tool result and the customer sees nothing either way.
  const dead = after.filter((m, i) => m.role === 'agent'
    && !(m.message || '').trim() && !(m.tool_calls || []).length
    && !((after[i - 1]?.tool_calls || []).length)).length;

  let sentName = null;
  for (const m of conv) for (const t of m.tool_calls || []) {
    if (t.tool_name !== 'save_lead') continue;
    let p = t.params_as_json;
    try { p = typeof p === 'string' ? JSON.parse(p) : p; } catch { /* keep raw */ }
    sentName = (p && (p.customer_name ?? p.body?.customer_name)) ?? sentName;
  }

  const texts = conv.filter((m) => m.role === 'agent' && m.message).map((m) => m.message);
  return {
    c,
    firstReply,
    checks: {
      'رحّب': GREET.test(firstReply),
      'ما رد بسؤال تأهيل': !GENERIC.test(firstReply),
      'اعترف بالشكوى': ACK.test(firstReply),
      'بدون صمت': dead === 0,
      // The simulated user often volunteers the name unprompted, so "did it
      // ask" is noise. What must hold is that a full name reached the webhook
      // and the agent never claimed success without one.
      'سجّل باسم كامل': !!sentName && sentName.trim().split(/\s+/).filter((w) => w.length >= 2).length >= 2,
      'ما ادّعى التسجيل بدون اسم': !(texts.some((t) => /تم (التسجيل|تسجيل)|سجلت/.test(t)) && !sentName),
      'الجملة الختامية': texts.some((t) => CLOSE.test(t)),
    },
    sentName,
  };
}

(async () => {
  const t0 = Date.now();
  const results = await Promise.all(CASES.map(run));   // all six at once
  let pass = 0, total = 0;

  for (const r of results) {
    console.log(`\n${'='.repeat(60)}\n${r.c.id}\n${'='.repeat(60)}`);
    if (r.error) { console.log('  ERROR ' + r.error); total++; continue; }
    for (const [k, v] of Object.entries(r.checks)) {
      total++; if (v) pass++;
      console.log(`  ${v ? '✔' : '✘'} ${k}`);
    }
    console.log(`  ↳ الاسم: ${r.sentName ?? '—'}`);
    console.log(`  ↳ أول رد: "${r.firstReply.slice(0, 130) || '—'}"`);
  }
  console.log(`\n${'='.repeat(60)}\n${pass}/${total} — ${((Date.now() - t0) / 1000).toFixed(0)}s\n${pass === total ? 'PASS' : 'FAIL'}`);
})();
