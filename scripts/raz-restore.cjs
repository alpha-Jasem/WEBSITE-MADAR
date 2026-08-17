#!/usr/bin/env node
/**
 * Restore the RAZ demo agent to its known-good state.
 *
 *   node scripts/raz-restore.cjs
 *
 * Only touches the settings that have drifted before (voice, TTS model,
 * accent-critical params, pronunciation dictionary). Prompt/workflow are left
 * alone unless the pre-flight reports them broken.
 */
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '..', '.env');
const API_KEY = fs.readFileSync(ENV_PATH, 'utf8').match(/^ELEVENLABS_API_KEY=(.+)$/m)?.[1]?.trim();
const AGENT_ID = 'agent_7501kzx1z7xaekxbegasw7cpqs7n';

const GOOD_TTS = {
  voice_id: 'VAFkN4Xb78Y1zB1QZa3i', // RAZ - Omar (Munsit official Hijazi) v4
  model_id: 'eleven_flash_v2_5',    // verified account-authorized
  stability: 0.7,                    // keeps the cloned accent from drifting
  similarity_boost: 1.0,
  speed: 1.05,
  expressive_mode: false,
  pronunciation_dictionary_locators: [
    { pronunciation_dictionary_id: 'V67EGn3cmH3n6Wo1dpjz', version_id: 'zAGRy9aIewYsEHCjHWDr' },
  ],
};

async function main() {
  const check = await fetch(`https://api.elevenlabs.io/v1/voices/${GOOD_TTS.voice_id}`, {
    headers: { 'xi-api-key': API_KEY },
  });
  if (!check.ok) {
    console.error('The Hijazi voice clone no longer exists in this account — it must be re-cloned.');
    process.exit(1);
  }
  console.log('Voice found:', (await check.json()).name);

  const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    method: 'PATCH',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversation_config: { tts: GOOD_TTS } }),
  });
  console.log(res.ok ? 'Restored ✔' : `Restore failed: ${res.status}`);
  if (!res.ok) console.log((await res.text()).slice(0, 400));
}

main().catch((e) => { console.error(e.message); process.exit(1); });
