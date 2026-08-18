#!/usr/bin/env node
/**
 * RAZ demo pre-flight check.
 *
 * The agent's voice silently changed twice (once mid-client-meeting), so never
 * demo without running this first:
 *   node scripts/raz-preflight.cjs
 *
 * Exits non-zero if anything is off, so it can gate a demo.
 */
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '..', '.env');
const API_KEY = fs.readFileSync(ENV_PATH, 'utf8').match(/^ELEVENLABS_API_KEY=(.+)$/m)?.[1]?.trim();

const AGENT_ID = 'agent_7501kzx1z7xaekxbegasw7cpqs7n';
const EXPECTED = {
  // The chosen voice for the agent "سعود". Update both fields together if the
  // voice is ever changed deliberately, so this check keeps catching accidents.
  voice_id: '3nav5pHC1EYvWOd5LmnA',
  voice_name: 'Saud - Deep, Formal and Clear',
  model_id: 'eleven_flash_v2_5',
  stability: 0.7,
  workflow_nodes: ['start_node', 'discovery', 'present', 'objection', 'booking', 'support', 'end_node'],
  whatsapp_number: '+966 56 876 6030',
};

const ok = (m) => console.log(`\x1b[32m✔\x1b[0m ${m}`);
const bad = (m) => console.log(`\x1b[31m✘\x1b[0m ${m}`);
const warn = (m) => console.log(`\x1b[33m!\x1b[0m ${m}`);

let failures = 0;
const check = (cond, good, fail) => (cond ? ok(good) : (failures++, bad(fail)));

async function main() {
  if (!API_KEY) {
    bad('ELEVENLABS_API_KEY not found in .env');
    process.exit(1);
  }

  const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    headers: { 'xi-api-key': API_KEY },
  });
  if (!res.ok) {
    bad(`Cannot read agent (${res.status}) — API key may be expired`);
    process.exit(1);
  }
  const agent = await res.json();
  const tts = agent.conversation_config?.tts || {};
  const prompt = agent.conversation_config?.agent?.prompt || {};

  console.log('\n=== RAZ demo pre-flight ===\n');

  // 1. Voice identity — the thing that broke twice
  check(tts.voice_id === EXPECTED.voice_id, 'Voice ID is the Hijazi clone',
    `WRONG VOICE: ${tts.voice_id} (expected ${EXPECTED.voice_id})`);

  if (tts.voice_id) {
    const vr = await fetch(`https://api.elevenlabs.io/v1/voices/${tts.voice_id}`, { headers: { 'xi-api-key': API_KEY } });
    if (vr.ok) {
      const v = await vr.json();
      check(v.name === EXPECTED.voice_name, `Voice name: ${v.name}`, `Voice name mismatch: "${v.name}"`);
    } else {
      failures++; bad('Assigned voice no longer exists in the account');
    }
  }

  // 2. TTS model must actually be authorized for this account
  check(tts.model_id === EXPECTED.model_id, `TTS model: ${tts.model_id}`,
    `TTS model is ${tts.model_id} (expected ${EXPECTED.model_id})`);

  const mr = await fetch('https://api.elevenlabs.io/v1/models', { headers: { 'xi-api-key': API_KEY } });
  if (mr.ok) {
    const models = await mr.json();
    const m = models.find((x) => x.model_id === tts.model_id);
    check(m && m.can_do_text_to_speech, 'Account is authorized for this TTS model',
      `ACCOUNT CANNOT USE MODEL "${tts.model_id}" — this is what made it sound non-Saudi`);
  }

  // 3. Accent-critical settings
  check(tts.stability >= 0.6, `Stability ${tts.stability} (accent holds)`,
    `Stability ${tts.stability} is too low — accent will drift (want >= 0.6)`);
  check((tts.pronunciation_dictionary_locators || []).length > 0,
    'Pronunciation dictionary attached', 'Pronunciation dictionary missing');

  // 4. Brain
  check(!!prompt.llm, `LLM: ${prompt.llm}`, 'No LLM set');
  const kb = prompt.knowledge_base || [];
  check(kb.length >= 2, `Knowledge base docs: ${kb.length}`, `Only ${kb.length} KB doc(s) attached`);
  check(prompt.prompt?.includes('ممنوع اللهجة المصرية'), 'Egyptian-dialect ban present in prompt',
    'Egyptian-dialect ban missing from prompt');

  // 5. Booking tool — without this the agent promises callbacks that vanish
  const toolIds = prompt.tool_ids || [];
  check(toolIds.length > 0, 'Lead-capture tool attached to agent',
    'NO LEAD TOOL — the agent will promise callbacks that are never recorded');

  const bookingTools = agent.workflow?.nodes?.booking?.additional_tool_ids || [];
  const supportTools = agent.workflow?.nodes?.support?.additional_tool_ids || [];
  check(bookingTools.length > 0 && supportTools.length > 0,
    'Booking + support stages can save leads',
    `Lead tool missing from stages (booking: ${bookingTools.length}, support: ${supportTools.length})`);

  // 6. Workflow
  const nodes = Object.keys(agent.workflow?.nodes || {});
  const missing = EXPECTED.workflow_nodes.filter((n) => !nodes.includes(n));
  check(missing.length === 0, `Workflow intact (${nodes.length} nodes)`, `Workflow missing nodes: ${missing.join(', ')}`);

  const badEntry = Object.entries(agent.workflow?.nodes || {})
    .filter(([, n]) => n.type === 'override_agent' && n.entry_behavior !== 'wait_for_user')
    .map(([id]) => id);
  check(badEntry.length === 0, 'Stage entry behavior correct (no duplicate greetings)',
    `Nodes will double-greet: ${badEntry.join(', ')}`);

  // 7. WhatsApp channel
  const wr = await fetch('https://api.elevenlabs.io/v1/convai/whatsapp-accounts', { headers: { 'xi-api-key': API_KEY } });
  if (wr.ok) {
    const list = (await wr.json()).items || [];
    const mine = list.find((w) => w.assigned_agent_id === AGENT_ID);
    check(!!mine, `WhatsApp ${mine?.phone_number || ''} routed to this agent`,
      'WhatsApp number is NOT routed to the RAZ agent');
    if (mine?.is_token_expired) { failures++; bad('WhatsApp token expired'); }
  }

  console.log('');
  if (failures === 0) {
    ok('ALL CHECKS PASSED — safe to demo\n');
    process.exit(0);
  }
  bad(`${failures} problem(s) found — FIX BEFORE DEMOING\n`);
  warn('Restore known-good state: node scripts/raz-restore.cjs\n');
  process.exit(1);
}

main().catch((e) => { bad(`Pre-flight crashed: ${e.message}`); process.exit(1); });
