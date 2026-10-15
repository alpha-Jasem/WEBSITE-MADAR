// Madar MCP server (Streamable HTTP, JSON responses). Lets Claude and other MCP clients work a company's
// conversations, customers, tickets and bookings with the same API keys as the REST API.
//   Endpoint: https://<project>.supabase.co/functions/v1/madar-mcp
//   Auth:     Authorization: Bearer mk_...
// Tools are the operations in _shared/madar-core.ts; a key without write:all only sees the read tools.

import { ApiError, OPS, allowed, authenticate } from '../_shared/madar-core.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, mcp-session-id, mcp-protocol-version',
  'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
}
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const rpcError = (id: unknown, code: number, message: string) => reply({ jsonrpc: '2.0', id: id ?? null, error: { code, message } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method === 'GET' || req.method === 'DELETE') return new Response('Use POST', { status: 405, headers: cors })

  let msg: { jsonrpc?: string; id?: unknown; method?: string; params?: Record<string, unknown> }
  try { msg = await req.json() } catch { return rpcError(null, -32700, 'parse error') }
  const { id, method, params } = msg

  // Notifications carry no id and get no body back.
  if (id === undefined) return new Response(null, { status: 202, headers: cors })

  try {
    if (method === 'initialize') {
      return reply({
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: (params?.protocolVersion as string) || '2025-03-26',
          capabilities: { tools: {} },
          serverInfo: { name: 'madar', version: '1.0.0' },
          instructions: 'Madar is a customer-conversation platform. Use list_conversations to see recent conversations, get_conversation for the full transcript, and transfer_conversation to hand one to a team.',
        },
      })
    }
    if (method === 'ping') return reply({ jsonrpc: '2.0', id, result: {} })

    const { ctx, scopes } = await authenticate(req)
    const visible = OPS.filter((o) => allowed(scopes, o))

    if (method === 'tools/list') {
      return reply({ jsonrpc: '2.0', id, result: { tools: visible.map((o) => ({ name: o.name, description: o.description, inputSchema: o.input })) } })
    }
    if (method === 'tools/call') {
      const op = visible.find((o) => o.name === params?.name)
      if (!op) return rpcError(id, -32602, `unknown or not permitted tool: ${String(params?.name)}`)
      const args = (params?.arguments as Record<string, unknown>) || {}
      for (const k of op.input.required || []) if (args[k] === undefined || args[k] === '') {
        return reply({ jsonrpc: '2.0', id, result: { isError: true, content: [{ type: 'text', text: `missing argument: ${k}` }] } })
      }
      try {
        const data = await op.run(ctx, args)
        return reply({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] } })
      } catch (e) {
        return reply({ jsonrpc: '2.0', id, result: { isError: true, content: [{ type: 'text', text: e instanceof ApiError ? e.message : 'internal error' }] } })
      }
    }
    return rpcError(id, -32601, `method not found: ${method}`)
  } catch (e) {
    if (e instanceof ApiError) return reply({ jsonrpc: '2.0', id, error: { code: -32001, message: e.message } }, e.status === 401 ? 401 : 200)
    return rpcError(id, -32603, 'internal error')
  }
})
