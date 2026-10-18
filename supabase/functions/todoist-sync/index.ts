// Two-way sync between admin_tasks and the Todoist projects the owner selected.
// - Pull: active Todoist tasks of the selected projects become/refresh admin_tasks (Todoist wins for title, due, priority).
// - Push: local tasks that never reached Todoist are created there (idempotent through X-Request-Id).
// - Completion goes both ways; a task that vanished remotely is marked done locally (Todoist does not tell completed from deleted here).
// Customer and agent tasks are never exported. "connected" is only reported after a live call succeeds.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const API = 'https://api.todoist.com/api/v1'

interface RTask { id: string; content: string; project_id: string; priority: number; due: { date?: string; datetime?: string } | null }
interface Local { id: string; title: string; due_at: string | null; priority: 'high' | 'medium' | 'low'; done: boolean; source: string; external_id: string | null; project_id: string | null; synced_done: boolean }

const prioFromRemote = (p: number): Local['priority'] => (p >= 4 ? 'high' : p === 3 ? 'medium' : 'low')
const prioToRemote = (p: Local['priority']) => (p === 'high' ? 4 : p === 'medium' ? 3 : 1)
// Todoist returns floating times without an offset; the owner's calendar is Riyadh time.
// API v1 puts a time-of-day into `date` itself ("2026-08-15T16:00:00"); a plain date means "sometime that day".
const dueFromRemote = (d: RTask['due']) => {
  if (!d) return null
  const raw = d.datetime ?? d.date
  if (!raw) return null
  const iso = raw.includes('T') ? (/Z|[+-]\d\d:\d\d$/.test(raw) ? raw : `${raw}+03:00`) : `${raw}T09:00:00+03:00`
  const t = new Date(iso)
  return Number.isNaN(t.getTime()) ? null : t.toISOString()
}

async function td(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) } })
  if (res.status === 204) return null
  const text = await res.text()
  if (!res.ok) throw new Error(`todoist_${res.status}${text ? ': ' + text.slice(0, 120) : ''}`)
  return text ? JSON.parse(text) : null
}

async function listProjects(token: string) {
  const out: { id: string; name: string; inbox: boolean }[] = []
  let cursor: string | null = null
  do {
    const d = await td(token, `/projects?limit=200${cursor ? `&cursor=${cursor}` : ''}`)
    for (const p of d.results ?? []) if (!p.is_archived && !p.is_deleted) out.push({ id: p.id, name: p.name, inbox: !!p.inbox_project })
    cursor = d.next_cursor ?? null
  } while (cursor)
  return out
}

async function activeTasks(token: string, projectId: string) {
  const out: RTask[] = []
  let cursor: string | null = null
  do {
    const d = await td(token, `/tasks?project_id=${projectId}&limit=200${cursor ? `&cursor=${cursor}` : ''}`)
    out.push(...(d.results ?? []))
    cursor = d.next_cursor ?? null
  } while (cursor)
  return out
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
  const secret = Deno.env.get('OUTREACH_CRON_SECRET')
  if (!(secret && req.headers.get('x-cron-secret') === secret)) {
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    if (!jwt) return json({ error: 'missing_auth' }, 401)
    const { data: u } = await service.auth.getUser(jwt)
    if (!u.user) return json({ error: 'invalid_auth' }, 401)
    const { data: me } = await service.from('users').select('role').eq('id', u.user.id).maybeSingle()
    if (me?.role !== 'admin') return json({ error: 'forbidden' }, 403)
  }

  const token = Deno.env.get('TODOIST_API_TOKEN')
  if (!token) return json({ ok: true, configured: false })
  const { action = 'sync' } = await req.json().catch(() => ({}))

  const note = (patch: Record<string, unknown>) => service.from('agency_settings').update(patch).eq('id', 1)

  try {
    if (action === 'status') {
      const projects = await listProjects(token)
      const { data: s } = await service.from('agency_settings').select('todoist_project_ids, todoist_last_sync_at, todoist_last_ok_at, todoist_last_error').eq('id', 1).maybeSingle()
      return json({ ok: true, configured: true, projects, selected: s?.todoist_project_ids ?? [], last_sync_at: s?.todoist_last_sync_at, last_ok_at: s?.todoist_last_ok_at, last_error: s?.todoist_last_error })
    }

    // ---- sync ----
    const now = new Date().toISOString()
    const projects = await listProjects(token)
    const { data: s } = await service.from('agency_settings').select('todoist_project_ids').eq('id', 1).maybeSingle()
    const selected: string[] = (s?.todoist_project_ids ?? []).filter((id: string) => projects.some(p => p.id === id))
    // Nothing is imported or pushed until the owner chooses which project(s) to sync.
    if (selected.length === 0) {
      await note({ todoist_last_sync_at: now, todoist_last_error: null })
      return json({ ok: true, configured: true, needs_project: true, projects })
    }

    const remote = new Map<string, RTask>()
    for (const pid of selected) for (const t of await activeTasks(token, pid)) remote.set(t.id, t)

    const { data: localRows } = await service.from('admin_tasks').select('id, title, due_at, priority, done, source, external_id, project_id, synced_done')
    const local = (localRows ?? []) as Local[]
    const byExternal = new Map(local.filter(l => l.source === 'todoist' && l.external_id).map(l => [l.external_id!, l]))
    const stats = { pulled: 0, updated: 0, pushed: 0, closed: 0, reopened: 0, completed_remotely: 0 }

    // pull and two-way completion
    for (const r of remote.values()) {
      const row = byExternal.get(r.id)
      if (!row) {
        const { error } = await service.from('admin_tasks').insert({ title: r.content, due_at: dueFromRemote(r.due), priority: prioFromRemote(r.priority), source: 'todoist', external_id: r.id, project_id: r.project_id })
        if (!error) stats.pulled++
        continue
      }
      if (row.done && !row.synced_done) { await td(token, `/tasks/${r.id}/close`, { method: 'POST' }); await service.from('admin_tasks').update({ synced_done: true, updated_at: now }).eq('id', row.id); stats.closed++; continue }
      if (!row.done) {
        await service.from('admin_tasks').update({ title: r.content, due_at: dueFromRemote(r.due), priority: prioFromRemote(r.priority), project_id: r.project_id, synced_done: false, updated_at: now }).eq('id', row.id)
        stats.updated++
      }
    }
    for (const row of local) {
      if (row.source !== 'todoist' || !row.external_id || remote.has(row.external_id)) continue
      if (row.project_id && !selected.includes(row.project_id)) continue
      if (!row.done && row.synced_done) { await td(token, `/tasks/${row.external_id}/reopen`, { method: 'POST' }); await service.from('admin_tasks').update({ synced_done: false, updated_at: now }).eq('id', row.id); stats.reopened++ }
      else if (!row.done) { await service.from('admin_tasks').update({ done: true, done_at: now, synced_done: true, updated_at: now }).eq('id', row.id); stats.completed_remotely++ }
    }

    // push local tasks that never reached Todoist
    for (const row of local.filter(l => l.source === 'local' && !l.external_id && !l.done)) {
      const body: Record<string, unknown> = { content: row.title, project_id: selected[0], priority: prioToRemote(row.priority) }
      if (row.due_at) body.due_datetime = new Date(row.due_at).toISOString().replace(/\.\d{3}Z$/, 'Z')
      const made = await td(token, '/tasks', { method: 'POST', body: JSON.stringify(body), headers: { 'X-Request-Id': row.id } })
      await service.from('admin_tasks').update({ source: 'todoist', external_id: made.id, project_id: selected[0], synced_done: false, updated_at: now }).eq('id', row.id)
      stats.pushed++
    }

    await note({ todoist_last_sync_at: now, todoist_last_ok_at: now, todoist_last_error: null })
    return json({ ok: true, configured: true, synced_at: now, projects: selected.length, ...stats })
  } catch (e) {
    const msg = (e as Error).message.slice(0, 300)
    await note({ todoist_last_sync_at: new Date().toISOString(), todoist_last_error: msg })
    return json({ ok: false, configured: true, error: msg }, 502)
  }
})
