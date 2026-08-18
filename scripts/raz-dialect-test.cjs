/**
 * Runs several conversations against the agent and lints every agent turn for
 * dialect violations: Egyptian vocabulary, over-formal MSA, and spellings that
 * should follow Hijazi convention (e.g. بكرا not بكرة).
 */
const fs = require('fs');
const path = require('path');
const API_KEY = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8')
  .match(/^ELEVENLABS_API_KEY=(.+)$/m)[1].trim();
const AGENT_ID = 'agent_7501kzx1z7xaekxbegasw7cpqs7n';

// Whole-word matching: Arabic letters must not sit either side, otherwise
// "عندي" would match "دي" and every result would be a false positive.
const AR = '\\u0600-\\u06FF';
const word = (t) => new RegExp(`(?<![${AR}])${t}(?![${AR}])`, 'g');

const EGYPTIAN = {
  'عايز': 'أبغى', 'عاوز': 'أبغى', 'إيه': 'وش', 'ايه': 'وش',
  'دلوقتي': 'الحين', 'كده': 'كذا', 'كدا': 'كذا', 'مش': 'مو',
  'بتاع': 'حق', 'بتاعت': 'حق', 'إزيك': 'كيفك', 'ازيك': 'كيفك',
  'فين': 'وين', 'أهو': '—', 'ازاي': 'كيف', 'إزاي': 'كيف',
  'لسه': 'لسا', 'حاجة': 'شي', 'حاجات': 'أشياء', 'دي': 'هذي', 'ده': 'هذا',
  'علشان كده': 'عشان كذا', 'طب': 'طيب', 'خالص': 'أبداً', 'شوية': 'شوي',
};

const TOO_FORMAL = {
  'سوف': 'راح/بـ', 'يمكنك': 'تقدر', 'لديك': 'عندك', 'لديكم': 'عندكم',
  'هل تود': 'تبغى', 'هل ترغب': 'تبغى', 'يرجى': '—', 'الرجاء': '—',
  'سيتم': 'راح/بـ', 'نعتذر': 'آسفين', 'بالإضافة إلى': 'وكمان',
  'لذلك': 'عشان كذا', 'حيث': '—', 'يتميز': 'فيه', 'كافة': 'كل',
  'الآن': 'الحين', 'ماذا': 'وش', 'لماذا': 'ليش', 'كيفية': 'كيف',
  'بإمكانك': 'تقدر', 'نود': 'نبغى', 'أرغب': 'أبغى',
};

// Hijazi orthography: the left form is wrong, the right is what we want.
const SPELLING = {
  'بكرة': 'بكرا',
  'غداً': 'بكرا', 'غدا': 'بكرا', 'غدًا': 'بكرا',
  'اليوم التالي': 'بكرا',
  'حالياً': 'الحين', 'حاليا': 'الحين',
  'الأسبوع القادم': 'الأسبوع الجاي', 'الاسبوع القادم': 'الأسبوع الجاي',
  'الشهر القادم': 'الشهر الجاي',
};

const SCENARIOS = [
  { id: 'sales', first: 'السلام عليكم، أبغى شقة للسكن',
    persona: 'عميل سعودي يبي شقة. اسأل عن السعر والمساحة والموقع. كن مختصراً. لا تحجز.' },
  { id: 'tomorrow', first: 'أبغى أحجز موعد بكرا',
    persona: 'تبي موعد بكرا العصر. اسمك سعد المطيري ورقمك 0551110000. أكد الموعد وكرر كلمة بكرا.' },
  { id: 'complaint', first: 'عندي شكوى، تأخر التسليم',
    persona: 'عميل غاضب بمشروع راز 41. اسمك بدر العنزي 0552220000. اسأل متى ينحل الموضوع.' },
  { id: 'objection', first: 'الأسعار غالية عندكم',
    persona: 'تعترض على السعر وتقول شفت أرخص. ثم اسأل عن أرخص خيار.' },
  { id: 'smalltalk', first: 'كيف حالك؟',
    persona: 'ابدأ بمجاملة، اسأل كيف حاله، ثم اسأل وش عندهم من مشاريع.' },
  { id: 'timing', first: 'متى أقدر أزور المعرض؟',
    persona: 'تسأل عن التوقيت والزيارة. استخدم كلمات زمنية (اليوم، بكرا، الأسبوع الجاي) وشوف كيف يرد.' },
];

async function run(s) {
  const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}/simulate-conversation`, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      simulation_specification: {
        simulated_user_config: { first_message: s.first, language: 'ar', prompt: { prompt: s.persona } },
      },
    }),
  });
  if (!res.ok) return { id: s.id, turns: [], error: `${res.status}` };
  const d = await res.json();
  const turns = (d.simulated_conversation || []).filter((m) => m.role === 'agent' && m.message).map((m) => m.message);
  return { id: s.id, turns };
}

// The client chose this exact closing wording, so it outranks the dialect rule.
// Blanked before linting so its formal words don't count against the turn.
const SANCTIONED = [/سيتم التواصل مع(ك|كم)\s*من قبل فريق الدعم/g];

function lint(text) {
  for (const p of SANCTIONED) text = text.replace(p, '');
  const hits = [];
  for (const [group, dict] of [['مصري', EGYPTIAN], ['فصحى رسمية', TOO_FORMAL], ['إملاء حجازي', SPELLING]]) {
    for (const [bad, good] of Object.entries(dict)) {
      const m = text.match(word(bad));
      if (m) hits.push({ group, bad, good, count: m.length });
    }
  }
  return hits;
}

(async () => {
  const all = [];
  let totalTurns = 0;
  const violations = [];

  for (const s of SCENARIOS) {
    const r = await run(s);
    all.push(r);
    if (r.error) { console.log(`[${s.id}] FAILED ${r.error}`); continue; }
    totalTurns += r.turns.length;
    for (const t of r.turns) {
      for (const h of lint(t)) {
        violations.push({ scenario: s.id, ...h, sample: t.slice(0, 110) });
      }
    }
    console.log(`[${s.id}] ${r.turns.length} agent turns`);
  }

  // Transcripts go to a temp path so the repo stays clean.
  const dump = path.join(require('os').tmpdir(), 'raz-dialect-turns.json');
  fs.writeFileSync(dump, JSON.stringify(all, null, 2), 'utf8');

  console.log(`\n${'='.repeat(64)}`);
  console.log(`agent turns linted: ${totalTurns} | violations: ${violations.length}`);
  console.log('='.repeat(64));
  const byTerm = {};
  for (const v of violations) {
    const k = `${v.group} | ${v.bad} → ${v.good}`;
    byTerm[k] = byTerm[k] || { count: 0, samples: [] };
    byTerm[k].count += v.count;
    if (byTerm[k].samples.length < 2) byTerm[k].samples.push(`[${v.scenario}] ${v.sample}`);
  }
  for (const [k, v] of Object.entries(byTerm).sort((a, b) => b[1].count - a[1].count)) {
    console.log(`\n✘ ${k}  (${v.count}x)`);
    v.samples.forEach((s) => console.log(`   ${s}`));
  }
  if (!violations.length) console.log('\n✔ CLEAN — no dialect violations found');
})();
