// Read-only view of the owner's n8n: workflows and recent executions straight from the n8n REST API.
// Returns configured:false when N8N_BASE_URL / N8N_API_KEY are missing. Nothing is invented.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  if (!token) return json({ error: 'missing_auth' }, 401)
  const { data: u } = await service.auth.getUser(token)
  if (!u.user) return json({ error: 'invalid_auth' }, 401)
  const { data: profile } = await service.from('users').select('role').eq('id', u.user.id).maybeSingle()
  if (profile?.role !== 'admin') return json({ error: 'forbidden' }, 403)

  const base = Deno.env.get('N8N_BASE_URL')
  const key = Deno.env.get('N8N_API_KEY')
  if (!base || !key) return json({ ok: true, configured: false })

  const root = base.replace(/\/$/, '')
  const headers = { 'X-N8N-API-KEY': key }
  try {
    const [wf, ex] = await Promise.all([
      fetch(`${root}/api/v1/workflows?limit=100`, { headers }),
      fetch(`${root}/api/v1/executions?limit=30`, { headers }),
    ])
    if (!wf.ok) return json({ ok: false, configured: true, error: `workflows_http_${wf.status}` })
    const workflows = ((await wf.json()).data ?? []) as { id: string; name: string; active: boolean; updatedAt?: string }[]
    const executions = ex.ok ? (((await ex.json()).data ?? []) as { id: string; workflowId: string; status?: string; finished?: boolean; startedAt?: string; stoppedAt?: string }[]) : []
    return json({
      ok: true, configured: true, fetched_at: new Date().toISOString(),
      executions_error: ex.ok ? null : `executions_http_${ex.status}`,
      workflows: workflows.map(w => ({ id: w.id, name: w.name, active: w.active, updated_at: w.updatedAt ?? null })),
      executions: executions.map(e => ({
        id: e.id, workflow_id: e.workflowId, status: e.status ?? (e.finished ? 'success' : 'unknown'),
        started_at: e.startedAt ?? null, stopped_at: e.stoppedAt ?? null,
      })),
    })
  } catch (e) {
    return json({ ok: false, configured: true, error: (e as Error).message.slice(0, 200) })
  }
})
