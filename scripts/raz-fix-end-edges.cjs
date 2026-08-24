#!/usr/bin/env node
/**
 * Fix: the agent ended the conversation before answering the customer.
 *
 * Symptom the client reported on WhatsApp: "سعود" replied with its opening
 * greeting over and over and never answered the question.
 *
 * Cause, from the ElevenLabs conversation log (conv_0101m0sf5gv9fb79q817tqqtrve9):
 *   greeting -> user asks -> notify_condition_4_met (triage -> info)
 *            -> notify_condition_5_met (info -> end_node) -> "end_call tool was called."
 * The *_end edge conditions were satisfiable on the very first turn inside a
 * node, before the agent had produced any answer. On a voice call ending is
 * just a hang-up; on WhatsApp it destroys the session, so the customer's next
 * message opens a brand-new conversation and replays first_message — which is
 * exactly the repeated-greeting loop in the screenshot.
 *
 * The fix guards every transition into end_node: an explicit goodbye is now
 * required, and ending is forbidden while the customer's last message is still
 * unanswered.
 *
 *   node scripts/raz-fix-end-edges.cjs          # apply
 *   node scripts/raz-fix-end-edges.cjs --dry    # show the diff only
 *
 * A timestamped copy of the current workflow is written to scripts/backups/
 * before anything is patched.
 */
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '..', '.env');
const API_KEY = fs.readFileSync(ENV_PATH, 'utf8').match(/^ELEVENLABS_API_KEY=(.+)$/m)?.[1]?.trim();
const AGENT_ID = 'agent_7501kzx1z7xaekxbegasw7cpqs7n';
const DRY = process.argv.includes('--dry');

// A first attempt appended exceptions underneath the original wording and it
// did NOT hold: conv_4001m0swtbkbf0grxpa94enabkg7 still ended on "كيف حالك
// تمام", because the original clause ("انتهى طلب العميل أو قال إنه ما يحتاج
// شي ثاني") stays true for any message that isn't a request. A long list of
// negative exceptions does not outweigh a permissive positive trigger.
//
// So the conversational stages get their condition REPLACED with a single
// strict test — an explicit farewell — plus the counter-examples that actually
// misfired. The transactional stages keep their business rule and gain the
// same farewell requirement.
const FAREWELL_ONLY = [
  'العميل قال عبارة وداع صريحة وواضحة، مثل: "مع السلامة"، "باي"، "شكراً خلاص"، "الله يعطيك العافية خلاص"، "ما أبغى شي ثاني".',
  '',
  '⛔ أي رسالة غير ذلك ليست وداعاً والشرط غير متحقق، ومنها: التحية والسلام، السؤال عن الحال ("كيف حالك"، "تمام"، "الحمدلله")، المجاملات، أي سؤال أو طلب، وأي رسالة لم ترد عليها بعد.',
].join('\n');

const FAREWELL_SUFFIX = '\n\nويشترط إضافةً لذلك أن يكون العميل قد ودّع صراحة بعد التأكيد. التحية أو السؤال عن الحال أو أي طلب جديد ليست وداعاً.';

// Stages where the customer is still conversing — no legitimate reason to hang
// up except a real goodbye.
const CONVERSATIONAL = ['e_triage_end', 'e_info_end', 'e_objection_end'];

async function main() {
  if (!API_KEY) {
    console.error('ELEVENLABS_API_KEY not found in .env');
    process.exit(1);
  }

  const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    headers: { 'xi-api-key': API_KEY },
  });
  if (!res.ok) {
    console.error(`Cannot read agent (${res.status})`);
    process.exit(1);
  }
  const agent = await res.json();
  const edges = agent.workflow?.edges || {};

  const endEdges = Object.entries(edges).filter(([, e]) => e.target === 'end_node');
  if (endEdges.length === 0) {
    console.error('No edges into end_node — workflow shape changed, aborting.');
    process.exit(1);
  }

  const backupDir = path.join(__dirname, 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const backup = path.join(backupDir, `raz-workflow-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(backup, JSON.stringify(agent.workflow, null, 2), 'utf8');
  console.log(`Backup written: ${path.relative(path.join(__dirname, '..'), backup)}\n`);

  const patched = JSON.parse(JSON.stringify(edges));
  for (const [id, e] of endEdges) {
    const before = e.forward_condition?.condition || '';
    // Drop any guard from the earlier (ineffective) revision before rewriting.
    const original = before.split('\n\n⛔ شرط إضافي إلزامي فوق ما سبق')[0].trimEnd();

    let after;
    if (CONVERSATIONAL.includes(id)) {
      after = FAREWELL_ONLY;                       // replace the permissive trigger outright
    } else {
      after = original + FAREWELL_SUFFIX;          // keep the business rule, add the farewell gate
    }

    if (before === after) {
      console.log(`${id}: already correct, skipping`);
      continue;
    }
    patched[id] = {
      ...e,
      forward_condition: { ...(e.forward_condition || { label: null, type: 'llm' }), condition: after },
    };
    console.log(`${id}  (${e.source} -> end_node)  [${CONVERSATIONAL.includes(id) ? 'REPLACED' : 'business rule kept + farewell gate'}]`);
    console.log(`   was: ${original.slice(0, 95)}`);
    console.log(`   now: ${after.split('\n')[0].slice(0, 95)}\n`);
  }

  if (DRY) {
    console.log('--dry: nothing written to ElevenLabs.');
    return;
  }

  const put = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    method: 'PATCH',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflow: { ...agent.workflow, edges: patched } }),
  });
  if (!put.ok) {
    console.error(`PATCH failed: ${put.status}`);
    console.error((await put.text()).slice(0, 600));
    process.exit(1);
  }
  console.log(`Patched ${endEdges.length} end-edge(s) ✔`);
  console.log('Now run: node scripts/raz-preflight.cjs');
}

main().catch((e) => { console.error(e.message); process.exit(1); });
