#!/usr/bin/env node
// madar: command line for the Madar platform. Zero dependencies, Node 18+.
//   madar login mk_xxx            save your API key (from the dashboard: المطورين)
//   madar whoami
//   madar conversations --limit 10 --needs_review
//   madar get_conversation chat:966501234567
//   madar transfer_conversation chat:966501234567 --team المبيعات --reason "عرض سعر"
//   madar --help                  every command, generated from the live API
// Every API operation is a command: `madar <operation> [first-required-arg] [--arg value]`.
// Add --json for raw output. The key can also come from MADAR_API_KEY.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const DEFAULT_URL = 'https://aacnqiuwrpzgxhzdavaq.supabase.co/functions/v1'
const CONFIG_DIR = join(homedir(), '.madar')
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

// Short names for the commands people type most.
const ALIASES = {
  conversations: 'list_conversations', conversation: 'get_conversation', note: 'add_note', transfer: 'transfer_conversation',
  close: 'set_conversation_status', teams: 'list_teams', customers: 'list_customers', customer: 'upsert_customer',
  tickets: 'list_tickets', ticket: 'create_ticket', bookings: 'list_bookings', booking: 'create_booking',
  templates: 'list_whatsapp_templates', send: 'send_whatsapp_template',
}

const readConfig = () => { try { return JSON.parse(readFileSync(CONFIG_FILE, 'utf8')) } catch { return {} } }
const writeConfig = (c) => { mkdirSync(CONFIG_DIR, { recursive: true }); writeFileSync(CONFIG_FILE, JSON.stringify(c, null, 2), { mode: 0o600 }) }

function parse(argv) {
  const pos = []; const flags = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const [k, inline] = a.slice(2).split('=')
      if (inline !== undefined) flags[k] = inline
      else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) flags[k] = argv[++i]
      else flags[k] = true
    } else pos.push(a)
  }
  return { pos, flags }
}

function cell(v) {
  if (v === null || v === undefined) return ''
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
  return s.length > 48 ? s.slice(0, 47) + '…' : s
}
function table(rows) {
  const cols = Object.keys(rows[0]).slice(0, 7)
  const width = cols.map((c) => Math.max(c.length, ...rows.map((r) => cell(r[c]).length)))
  const line = (vals) => vals.map((v, i) => String(v).padEnd(width[i])).join('  ')
  console.log(line(cols)); console.log(line(width.map((w) => '-'.repeat(w))))
  for (const r of rows) console.log(line(cols.map((c) => cell(r[c]))))
}
function show(data, asJson) {
  if (asJson) return console.log(JSON.stringify(data, null, 2))
  if (Array.isArray(data)) return data.length === 0 ? console.log('(no results)') : typeof data[0] === 'object' ? table(data) : console.log(data.join('\n'))
  console.log(JSON.stringify(data, null, 2))
}

async function main() {
  const { pos, flags } = parse(process.argv.slice(2))
  const cfg = readConfig()
  const base = (flags.url || process.env.MADAR_URL || cfg.url || DEFAULT_URL).replace(/\/$/, '') + '/madar-api'
  const asJson = !!flags.json

  if (pos[0] === 'login') {
    const key = pos[1] || flags.key
    if (!key || !key.startsWith('mk_')) { console.error('Usage: madar login mk_xxxxxxxx   (create a key in the dashboard under المطورين)'); process.exitCode = 1; return }
    writeConfig({ ...cfg, key, ...(flags.url ? { url: flags.url } : {}) })
    console.log(`Saved to ${CONFIG_FILE}`)
    return
  }
  if (pos[0] === 'logout') { writeConfig({ ...cfg, key: undefined }); console.log('Signed out.'); return }
  if (pos[0] === 'mcp') {
    const url = `${(flags.url || cfg.url || DEFAULT_URL).replace(/\/$/, '')}/madar-mcp`
    console.log(JSON.stringify({ mcpServers: { madar: { type: 'http', url, headers: { Authorization: 'Bearer ' + (process.env.MADAR_API_KEY || cfg.key || 'mk_YOUR_KEY') } } } }, null, 2))
    console.log('\nClaude Code:  claude mcp add --transport http madar ' + url + ' --header "Authorization: Bearer mk_YOUR_KEY"')
    return
  }

  const docs = await fetch(base).then((r) => r.json()).catch(() => null)
  if (!docs?.operations) { console.error(`Could not reach ${base}`); process.exitCode = 1; return }
  const ops = new Map(docs.operations.map((o) => [o.name, o]))

  if (!pos[0] || pos[0] === 'help' || flags.help) {
    console.log('madar <command> [args] [--flags]\n\n  login <key>   save your API key\n  logout\n  mcp           print the MCP config for Claude and other agents\n')
    for (const o of docs.operations) {
      const alias = Object.entries(ALIASES).find(([, v]) => v === o.name)?.[0]
      console.log(`  ${(alias ? `${alias}, ` : '') + o.name}`.padEnd(46) + o.description)
    }
    console.log('\nFirst positional argument fills the first required argument; everything else is --name value. Add --json for raw output.')
    return
  }

  const name = ALIASES[pos[0]] || pos[0]
  const op = ops.get(name)
  if (!op) { console.error(`Unknown command: ${pos[0]}. Run: madar help`); process.exitCode = 1; return }
  const key = process.env.MADAR_API_KEY || cfg.key
  if (!key) { console.error('No API key. Run: madar login mk_xxx'); process.exitCode = 1; return }

  const args = {}
  const first = (op.required && op.required[0]) || Object.keys(op.arguments)[0]
  if (pos[1] !== undefined && first) args[first] = pos[1]
  if (pos[2] !== undefined && op.required?.[1]) args[op.required[1]] = pos.slice(2).join(' ')
  for (const [k, v] of Object.entries(flags)) {
    if (['json', 'url', 'key', 'help'].includes(k)) continue
    const type = op.arguments[k]?.type
    args[k] = type === 'number' ? Number(v) : type === 'boolean' ? v === true || v === 'true' : type === 'array' ? String(v).split(',') : v
  }
  // `madar close <key>` closes; `madar close <key> --reopen` reopens.
  if (pos[0] === 'close') args.status = flags.reopen ? 'open' : 'closed'

  const res = await fetch(`${base}/v1/${op.name}`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args) })
  const out = await res.json().catch(() => ({}))
  if (!res.ok) { console.error(`Error ${res.status}: ${out.error || 'request failed'}`); process.exitCode = 1; return }
  show(out.data, asJson)
}

main().catch((e) => { console.error(e.message); process.exit(1) })
