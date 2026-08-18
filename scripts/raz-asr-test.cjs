const fs = require('fs');
const API_KEY = fs.readFileSync('c:\\Users\\acer\\Desktop\\ملفي الشركة\\.env', 'utf8').match(/^ELEVENLABS_API_KEY=(.+)$/m)[1].trim();
const AGENT_ID = 'agent_7501kzx1z7xaekxbegasw7cpqs7n';

const CLARIFY = /ما فهمتك صح|ممكن تعيد|تقدر تعيد|ما وصلني صح/;
const BAD_DEFLECT = /خارج تخصصي|ما أقدر أساعدك في هذا/;

// Garbled transcripts of the kind Scribe actually emits on noise, coughs, and
// clipped speech — the inputs that produced generic replies and dead air.
const CASES = [
  { id: 'كحة فقط', first: 'كحة، طيب.' },
  { id: 'تشويش وكلام مقطوع', first: 'اييي... مم... الششش... راز... تتت' },
  { id: 'كلمة وحدة مبتورة', first: 'تسلي' },
  { id: 'أرقام مشوشة', first: 'رقمي صفر خمسة خمسة اثنين ... ااا ... تسعة' },
  { id: 'اسم غير واضح', first: 'اسمي عبدال... ششش ...مدي' },
  { id: 'ضجيج بدون كلام مفهوم', first: 'أهه مم ااا هاه' },
];

async function run(c) {
  const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}/simulate-conversation`, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      simulation_specification: {
        simulated_user_config: {
          first_message: c.first,
          language: 'ar',
          // Naming an intent or a name here leaks it into the agent's context —
          // it greeted "عبدالله" for a caller who only coughed. The persona must
          // carry no content, so the agent is judged on the garbled input alone.
          prompt: { prompt: 'كرر نفس الصوت غير الواضح مرة ثانية. لا تضف أي معلومة جديدة.' },
        },
      },
    }),
  });
  if (!res.ok) return { c, error: `${res.status}` };

  const conv = (await res.json()).simulated_conversation || [];
  const after = conv.slice(conv.findIndex((m) => m.role === 'user') + 1);
  const reply = (after.find((m) => m.role === 'agent' && m.message) || {}).message || '';
  const dead = after.filter((m, i) => m.role === 'agent'
    && !(m.message || '').trim() && !(m.tool_calls || []).length
    && !((after[i - 1]?.tool_calls || []).length)).length;

  return {
    c, reply,
    asked: CLARIFY.test(reply),
    deflected: BAD_DEFLECT.test(reply),
    dead,
  };
}

(async () => {
  const rs = await Promise.all(CASES.map(run));
  let pass = 0;
  for (const r of rs) {
    if (r.error) { console.log(`\n${r.c.id}: ERROR ${r.error}`); continue; }
    const ok = r.asked && !r.deflected && r.dead === 0;
    if (ok) pass++;
    console.log(`\n${'='.repeat(58)}\n${r.c.id}\n${'='.repeat(58)}`);
    console.log(`  ${r.asked ? '✔' : '✘'} طلب الإعادة`);
    console.log(`  ${!r.deflected ? '✔' : '✘'} ما قال "خارج تخصصي"`);
    console.log(`  ${r.dead === 0 ? '✔' : '✘'} بدون صمت (${r.dead})`);
    console.log(`  ↳ "${r.reply.slice(0, 130) || '—'}"`);
  }
  console.log(`\n${pass}/${CASES.length} ${pass === CASES.length ? 'PASS' : 'FAIL'}`);
})();
