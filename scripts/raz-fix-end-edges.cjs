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

// APPENDED to each end-edge's existing condition — never replaces it. The
// booking/complaint/handoff edges carry real business rules ("the lead was
// recorded and confirmed"); those must survive. Only the premature-exit hole
// is being closed.
const GUARD = [
  '',
  '',
  '⛔ شرط إضافي إلزامي فوق ما سبق — ممنوع اعتبار هذا الشرط متحققاً في أي من الحالات التالية:',
  '- آخر رسالة من العميل فيها سؤال أو طلب لم تُرسل له إجابة نصية بعد.',
  '- ما أرسلت أي رد نصي للعميل في هذه المرحلة بعد.',
  '- العميل طلب معلومة أو قائمة أو تفاصيل (مثل: "ابغاك تسرد لي كل المشاريع"، "اش ابرز مشاريعكم"، "ابغاك تعلمني عن مشاريعكم") — هذا طلب معلومات وليس وداعاً.',
  '- العميل عبّر عن انزعاج أو قال "ما رديت علي" — هذا يعني إنك لم تجب، وليس إنه انتهى.',
  '',
  '✅ القاعدة: لا تُنهِ المحادثة أبداً وأنت مدين للعميل برد.',
].join('\n');

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
    if (before.includes('⛔ شرط إضافي إلزامي فوق ما سبق')) {
      console.log(`${id}: already guarded, skipping`);
      continue;
    }
    const after = before.trimEnd() + GUARD;
    patched[id] = {
      ...e,
      forward_condition: { ...(e.forward_condition || { label: null, type: 'llm' }), condition: after },
    };
    console.log(`${id}  (${e.source} -> end_node)`);
    console.log(`   kept  : ${before.slice(0, 100)}`);
    console.log(`   +guard: ${after.length - before.length} chars appended\n`);
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
