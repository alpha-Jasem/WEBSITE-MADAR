// Madar public REST API.
//   GET  /functions/v1/madar-api                 -> the list of operations (no key needed)
//   GET|POST /functions/v1/madar-api/v1/<op>     -> run an operation; arguments in the query string (GET) or JSON body (POST)
// Auth: Authorization: Bearer mk_...  (create keys in the dashboard under المطورين). Keys are scoped:
// read:all can call read operations, write:all can call everything.
// Every operation is shared with the MCP server and the `madar` CLI (see _shared/madar-core.ts).

import { ApiError, OPS, allowed, authenticate, findOp } from '../_shared/madar-core.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } })

/** Query-string values arrive as text; turn them into what the operation's schema asks for. */
function coerce(op: { input: { properties: Record<string, unknown> } }, params: URLSearchParams): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of params) {
    const type = (op.input.properties[k] as { type?: string } | undefined)?.type
    out[k] = type === 'number' ? Number(v) : type === 'boolean' ? v === 'true' || v === '1' : v
  }
  return out
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = new URL(req.url)
    const path = url.pathname.replace(/^.*\/madar-api/, '').replace(/\/+$/, '')
    if (path === '' || path === '/v1') {
      return json({
        name: 'Madar API', version: 1, auth: 'Authorization: Bearer mk_...',
        operations: OPS.map((o) => ({ name: o.name, scope: o.scope, description: o.description, arguments: o.input.properties, required: o.input.required || [], endpoint: `/v1/${o.name}` })),
      })
    }
    const m = path.match(/^\/v1\/([a-z_]+)$/)
    const op = m && findOp(m[1])
    if (!op) throw new ApiError(404, 'unknown operation')
    const { ctx, scopes } = await authenticate(req)
    if (!allowed(scopes, op)) throw new ApiError(403, `this key cannot call ${op.name} (needs ${op.scope === 'write' ? 'write:all' : 'read:all'})`)
    let args: Record<string, unknown> = coerce(op, url.searchParams)
    if (req.method === 'POST') args = { ...args, ...(await req.json().catch(() => ({}))) }
    for (const k of op.input.required || []) if (args[k] === undefined || args[k] === '') throw new ApiError(400, `missing argument: ${k}`)
    return json({ data: await op.run(ctx, args) })
  } catch (e) {
    if (e instanceof ApiError) return json({ error: e.message }, e.status)
    return json({ error: 'internal error' }, 500)
  }
})
