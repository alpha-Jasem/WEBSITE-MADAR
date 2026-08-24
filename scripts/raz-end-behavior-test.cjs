#!/usr/bin/env node
/**
 * Does the agent hang up when it shouldn't?
 *
 *   node scripts/raz-end-behavior-test.cjs           # 5 runs per case
 *   node scripts/raz-end-behavior-test.cjs 10        # 10 runs per case
 *
 * Ending a conversation is destructive on WhatsApp: the session dies, the
 * customer's next message opens a new one, and first_message replays — which
 * is the repeated-greeting loop the client reported. Every case below is a
 * real transcript pattern taken from the agent's own conversation log.
 *
 * The end condition is judged by an LLM, so a single run proves nothing.
 * Each case runs N times and reports a pass rate.
 */
const fs = require('fs');
const path = require('path');

const API_KEY = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8')
  .match(/^ELEVENLABS_API_KEY=(.+)$/m)?.[1]?.trim();
const AGENT_ID = 'agent_7501kzx1z7xaekxbegasw7cpqs7n';
const RUNS = parseInt(process.argv[2], 10) || 5;
const CONCURRENCY = 4;

const CASES = [
  {
    id: 'دردشة بلا طلب — "كيف حالك"',
    note: 'conv_4001m0swtbkbf0grxpa94enabkg7 مات هنا',
    first: 'سلام عليكم',
    persona: 'قل بالترتيب: "كيف حالك" ثم "تمام" ثم "الحمدلله" ثم "زين". لا تسأل أي سؤال ولا تودّع أبداً.',
    mustEnd: false,
  },
  {
    id: 'شكر مجرد كأول رسالة',
    note: 'conv_3601m0sxmps7ez3b737j1sw3xxnv مات هنا برسالة فاضية',
    first: 'شكراً لك',
    persona: 'قل "شكراً لك" فقط. ثم "مشكور". ثم "يعطيك العافية". لا تقل مع السلامة ولا باي نهائياً.',
    mustEnd: false,
  },
  {
    id: 'شكر بعد إجابة',
    first: 'اش ابرز مشاريعكم',
    persona: 'اسأل عن المشاريع، وبعد ما يجاوبك قل "شكراً لك" ثم "يعطيك العافية". لا تقل مع السلامة نهائياً.',
    mustEnd: false,
  },
  {
    id: 'طلب قائمة المشاريع متكرر',
    note: 'شكوى العميل الأصلية بالسكرين شوت',
    first: 'اش ابرز مشاريعكم',
    persona: 'قل بالترتيب: "ما رديت علي" ثم "ابغاك تسرد لي كل المشاريع" ثم "ابغاك تقلي كل مشاريعكم" ثم "ابغاك تعلمني عن جميع مشاريعكم". لا تودّع أبداً.',
    mustEnd: false,
  },
  {
    id: 'انصراف صريح — يجب أن ينهي',
    first: 'اش ابرز مشاريعكم',
    persona: 'اسأل عن المشاريع، وبعد ما يجاوبك قل "خلاص شكراً، مع السلامة"، وكرر "مع السلامة" لو رد عليك.',
    mustEnd: true,
  },
];

async function simulate(c) {
  const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}/simulate-conversation`, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      simulation_specification: {
        simulated_user_config: { first_message: c.first, language: 'ar', prompt: { prompt: c.persona } },
      },
    }),
  });
  if (!res.ok) return { error: res.status };
  const conv = (await res.json()).simulated_conversation || [];

  const tools = [];
  conv.forEach((m) => (m.tool_calls || []).forEach((t) => tools.push(t.tool_name)));

  // The simulator injects ==!END_CALL!== as a *user* turn once the scripted
  // persona runs out of lines. The agent reads that as a message and politely
  // signs off, which looks identical to a premature hang-up but is caused by
  // the harness. Any run where that marker appears before the agent ends is
  // inconclusive, not a failure — counting it as one would make the agent look
  // broken for behaving correctly.
  const markerAt = conv.findIndex((m) => m.role !== 'agent' && /END_CALL/.test(m.message || ''));
  const endIdx = conv.findIndex((m) =>
    (m.tool_calls || []).some((t) => t.tool_name === 'end_call')
    || (m.role === 'agent' && /END_CALL/.test(m.message || '')));

  const agentEnded = endIdx !== -1;
  const harnessStopped = markerAt !== -1 && (endIdx === -1 || markerAt < endIdx);

  // An end with no closing text is the worst shape: the customer sees silence.
  // end_call is always followed by an empty agent turn, so "last agent turn is
  // blank" is true for every ending and says nothing. What matters is whether
  // the agent spoke after the customer's final *real* message.
  const real = conv.filter((m) => !/END_CALL/.test(m.message || ''));
  const lastUser = real.map((m) => m.role).lastIndexOf('user');
  const spokeAfterUser = real
    .slice(lastUser + 1)
    .some((m) => m.role === 'agent' && (m.message || '').trim());
  const endedSilently = agentEnded && !harnessStopped && !spokeAfterUser;

  return { conv, agentEnded, endedSilently, harnessStopped, turns: conv.length };
}

async function pool(tasks, limit) {
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (i < tasks.length) out[i] = await tasks[i++]();
  }));
  return out;
}

async function main() {
  if (!API_KEY) { console.error('ELEVENLABS_API_KEY not found in .env'); process.exit(1); }
  console.log(`\nRAZ end-behavior test — ${RUNS} runs per case, ${CASES.length} cases\n`);

  let hardFail = 0;
  for (const c of CASES) {
    const results = await pool(Array.from({ length: RUNS }, () => () => simulate(c)), CONCURRENCY);
    // "must not end" runs are only meaningful if the harness let them play out.
    const scored = results.filter((r) => !r.error && (c.mustEnd || !r.harnessStopped));
    const excluded = results.filter((r) => !r.error && !c.mustEnd && r.harnessStopped).length;
    const usable = scored;
    const passes = usable.filter((r) => (c.mustEnd ? r.agentEnded : !r.agentEnded));
    const silent = usable.filter((r) => r.endedSilently).length;
    const rate = usable.length ? Math.round((passes.length / usable.length) * 100) : 0;
    const mark = rate === 100 ? '\x1b[32m✔\x1b[0m' : rate >= 80 ? '\x1b[33m!\x1b[0m' : '\x1b[31m✘\x1b[0m';
    if (rate < 100) hardFail++;

    console.log(`${mark} ${c.id}`);
    if (c.note) console.log(`    (${c.note})`);
    console.log(`    ${passes.length}/${usable.length} (${rate}%) — ${c.mustEnd ? 'يجب أن ينهي' : 'يجب ألا ينهي'}`
      + `  | متوسط الدورات ${Math.round(usable.reduce((s, r) => s + r.turns, 0) / (usable.length || 1))}`
      + (silent ? `  | \x1b[31mأنهى بصمت ${silent}×\x1b[0m` : '')
      + (excluded ? `  | مستبعدة (المحاكي أوقفها) ${excluded}×` : ''));

    const bad = usable.find((r) => (c.mustEnd ? !r.agentEnded : r.agentEnded));
    if (bad) {
      console.log('    مثال فاشل:');
      for (const m of bad.conv.slice(-6)) {
        const t = (m.tool_calls || []).map((x) => x.tool_name).join(',');
        console.log(`      [${m.role}] ${(m.message || '').slice(0, 78) || (t ? `<${t}>` : '<فارغ>')}`);
      }
    }
    console.log('');
  }

  if (hardFail === 0) { console.log('\x1b[32mكل الحالات 100%\x1b[0m\n'); process.exit(0); }
  console.log(`\x1b[31m${hardFail} حالة لم تصل 100%\x1b[0m\n`);
  process.exit(1);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
