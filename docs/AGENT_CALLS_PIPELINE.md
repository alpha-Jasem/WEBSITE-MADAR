# Agent calls pipeline (Nabrah + ElevenLabs → dashboard)

Real AI-receptionist calls land in `public.clinic_os_ai_calls`, which the dashboard
already reads (`useAICalls` → Call logs, Conversations, Home, Analytics, Reports).

```
Nabrah post_call_callback ─┐                       ┌─ agent_links (agent → company)
                           ├─► agent-call-webhook ─┤
ElevenLabs post-call hook ─┘   (edge function)     ├─ upsert clinic_os_ai_calls on (provider, external_id)
                                                   └─ needs a person? insert ai_agent_support_tickets (one per call)

scripts/backfill-agent-calls.mjs ── same mapper ──► same upsert (history)
```

## Pieces

| File | Role |
|---|---|
| `supabase/migrations/20261012090000_agent_call_ingestion.sql` | `agent_links` table (RLS on, no policies = service role only); adds `provider`, `external_id`, `agent_id`, `channel`, `caller_name` to `clinic_os_ai_calls`; unique index on `(provider, external_id)`; adds nullable `ai_agent_support_tickets.ai_call_id` (FK → `clinic_os_ai_calls`, on delete set null) with a unique index; adds both tables to the `supabase_realtime` publication so the dashboard updates live. Additive only. |
| `supabase/functions/_shared/agentCallMapper.js` | The single normaliser, shared by the function (Deno) and the backfill (Node). Also the ElevenLabs signature check. |
| `supabase/functions/_shared/agentCallWebhook.js` | The webhook's request handling (auth, provider routing, idempotent ingest), free of Deno/supabase-js so the self-check can run it in Node with a fake store. |
| `supabase/functions/agent-call-webhook/index.ts` | Deno entry point: wires `Deno.env` and a supabase-js (service role) store into the handler. `?provider=nabrah` or `?provider=elevenlabs`. |
| `scripts/backfill-agent-calls.mjs` | Pages through each linked agent's history and upserts it. |
| `scripts/agent-calls-selfcheck.mjs` | Offline check of the mapper, signature verification and the full webhook handler (incl. duplicate deliveries). |

The unique indexes are deliberately not partial: PostgREST's `on_conflict` cannot target a
partial index (`ON CONFLICT (provider, external_id)` without the index predicate does not match it). NULLs are
distinct in Postgres, so a plain unique index behaves exactly like `... where external_id is not null`:
old/manual calls and manually created tickets never collide.

`ai_call_id` is a new column rather than the existing `conversation_id`, because
`conversation_id` is a foreign key to `ai_agent_conversations` (the website chat agent), not to calls.

### Webhook behaviour

- **Nabrah**: requires header `X-Madar-Secret` equal to `NABRAH_WEBHOOK_SECRET` (else 401).
  The callback body format is undocumented, so only a call id is read from it
  (`call_id`, `id`, `call.id`, `data.call_id`, `data.id`, `data.call.id`) and the full call is
  fetched from `GET https://api.nabrah.ai/api/ext/call/{id}` with `NABRAH_API_KEY` (a `?call_id=` query
  parameter on the callback URL is also accepted). The secret is checked before any Nabrah API call.
  Nabrah API 404 → `202 {skipped: "call not found"}`; other API errors → 502 so Nabrah retries.
- **ElevenLabs**: verifies `elevenlabs-signature` = `t=<unix secs>,v0=<hex HMAC-SHA256(secret, "<t>.<raw body>")>`
  with `ELEVENLABS_WEBHOOK_SECRET`, rejecting timestamps older/newer than 30 min (same as the
  official SDK's `webhooks.constructEvent`). Only `post_call_transcription` is stored; other
  event types get `200 {ignored}`.
- Agent not in `agent_links` → `202 {skipped: "unknown agent"}` and a log line (not an error, so
  the platform does not retry forever). Retries are idempotent thanks to the upsert.

### Mapping

| Column | Nabrah | ElevenLabs |
|---|---|---|
| `external_id` | `id` | `conversation_id` |
| `phone` | `call_from` (inbound/web) or `call_to` (outbound); `'unknown'` if empty | `metadata.phone_call.external_number`, else `metadata.whatsapp.whatsapp_user_id`, else `system__caller_id`, else `'unknown'` |
| `channel` | `web` if `call_type = 'web'`, else `phone` | `whatsapp` if `metadata.whatsapp` or initiation source `whatsapp`; `phone` if `metadata.phone_call`; else `web` |
| `call_time` / `duration_seconds` | `call_started_at` / `duration` | `metadata.start_time_unix_secs` / `metadata.call_duration_secs` |
| `transcript` | `role` assistant→`agent`, user→`patient`; `time` = mm:ss since call start | `role` agent→`agent`, user→`patient`; `time` = mm:ss of `time_in_call_secs` (empty tool-only turns dropped) |
| `summary` | `analysis_results` key `summary` / `call_summary` | `analysis.transcript_summary` |
| `caller_name` | analysis key `caller_name` / `customer_name` / `patient_name` / `full_name` / `name` | same keys in `data_collection_results` |

Status / result (in this order):

1. **failed** — Nabrah status `failed`, `no_answer`, `busy`, `canceled` (hyphen/space spellings such as
   `no-answer` are normalised); ElevenLabs `status = failed`
   or `phone_call.call_result` in `no_answer`, `busy`, `failed`, `voicemail` → `status=failed`, `result=failed`.
2. `result`: `referred` on a transfer (an analysis field about transfer/escalation is truthy, a
   tag or tool call named like `transfer…`/`escalat…`, or ElevenLabs `termination_reason`
   mentions transfer); else `booked` / `rescheduled` / `cancelled` when an analysis field with
   that meaning is truthy (e.g. `appointment_booked: yes`, `booking_confirmed: true`, ElevenLabs
   evaluation criterion `appointment_booked: success`, or a categorical `outcome: booked`); else `no_action`.
3. `status=needs_review` if any trigger below applies (else `completed`). `review_reason` lists every
   trigger that applied, `; `-separated in this order (e.g. `transferred to a human; refund or return request`):

   | Trigger | `review_reason` | Ticket priority |
   |---|---|---|
   | transfer / escalation (above; Nabrah also a status like `transferred`/`escalated`) | `transferred to a human` | normal |
   | complaint: truthy analysis key like `complaint`, or complaint wording (`complain`, `شكوى`, `يشتكي`, `غير راض`) in the summary / intent / outcome (Nabrah: also tags) | `customer complaint` | **high** |
   | refund/return: same, with `refund`, `money back`, `return request`, `استرجاع`, `استرداد`, `إرجاع` | `refund or return request` | **high** |
   | call-back request: `call back`, `callback`, `معاودة الاتصال`, `يتصل عليه`… | `customer asked for a call back` | normal |
   | unsuccessful: ElevenLabs `call_successful = failure`; Nabrah status containing `unsuccessful`/`unresolved`; either provider's analysis field `call_successful` / `successful` / `resolved` = no/false/failure, or `outcome: unsuccessful` | `agent marked the call unsuccessful` | normal, and when it is the only trigger only if the caller spoke at least once |

   Priority is **high** whenever complaint or refund is among the triggers (e.g. a transfer that is also
   a refund request), else normal.

4. `intent` = an analysis `intent` field when it matches the DB values, else `other` for a
   complaint/refund, `follow_up` for a call-back, else derived from the result
   (`booked`→`new_booking`, `rescheduled`→`reschedule`, `cancelled`→`cancellation`), else `inquiry`.

### Tickets

`buildTicketForCall(row)` in the shared mapper turns a `needs_review` call into one
`ai_agent_support_tickets` row: `subject` = first sentence of the call summary (≤ 90 chars;
falls back to the reason + caller name/phone), `description` = summary plus caller, phone,
channel, call time, duration, intent, result and provider id, `route='ai-receptionist'`,
`status='open'`, `priority` per the table above, `ai_call_id` = the saved call's id. The subject
falls back to the most serious reason (complaint > refund > call-back > transfer > unsuccessful). Failed
calls (no answer, busy…) never open a ticket.

The webhook upserts the call, then inserts the ticket with `on conflict (ai_call_id) do nothing`,
so retries never create a second ticket and never reset a ticket staff already moved to
`in_progress`/`resolved`. Tickets show up on the dashboard's Tickets page and Home widget as usual.

The wording detection is keyword based, so a summary like "no complaint" can still open a
ticket. For precise routing add explicit analysis fields (`complaint`, `refund_requested`,
`callback_requested` as yes/no) to each agent; those are read first.

To get bookings counted reliably, add a structured field to each agent's analysis: in Nabrah an
analysis result named `appointment_booked` (yes/no) and optionally `intent`, `caller_name`,
`summary`; in ElevenLabs a data-collection item `appointment_booked` (boolean) plus `caller_name`.

## Steps to go live (need approval — none of this has been done)

1. **Apply the migration** `20261012090000_agent_call_ingestion.sql`
   (`supabase db push`, or paste it into the SQL editor).
2. **Set secrets** (generate the webhook secret yourself, e.g. `openssl rand -hex 32`):
   ```
   supabase secrets set NABRAH_WEBHOOK_SECRET=<random> ELEVENLABS_WEBHOOK_SECRET=<from ElevenLabs>
   ```
   `NABRAH_API_KEY` already exists for `madar-nabrah-token`; `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` are provided automatically.
3. **Deploy the function without JWT verification**:
   ```
   supabase functions deploy agent-call-webhook --no-verify-jwt --project-ref aacnqiuwrpzgxhzdavaq
   ```
4. **Link agents to companies** (service role / SQL editor):
   ```sql
   insert into public.agent_links (provider, agent_id, company_id, label) values
     ('nabrah',     '<nabrah agent id>',     '<companies.id>', 'Clinic X reception'),
     ('elevenlabs', '<elevenlabs agent id>', '<companies.id>', 'Clinic Y WhatsApp');
   ```
5. **Nabrah**: on each linked agent set `post_call_callback` (and, recommended, `post_analysis_callback`
   with the same value, so the row is refreshed once `analysis_results` exist; re-delivery is idempotent
   and a ticket is opened at that point if the analysis calls for one) to
   ```json
   {
     "url": "https://aacnqiuwrpzgxhzdavaq.supabase.co/functions/v1/agent-call-webhook?provider=nabrah",
     "parameters": [
       { "name": "X-Madar-Secret", "location": "header", "data_type": "string", "value": "<NABRAH_WEBHOOK_SECRET>" }
     ]
   }
   ```
   (Nabrah dashboard, or `PATCH` the agent through the Nabrah API.) If calls arrive with
   `400 missing call id`, check the function logs for the logged body and add its id field to
   `extractNabrahCallId`.
6. **ElevenLabs**: Agents Platform → Settings → Post-call webhook → URL
   `https://aacnqiuwrpzgxhzdavaq.supabase.co/functions/v1/agent-call-webhook?provider=elevenlabs`,
   enable transcription webhooks, copy the generated secret into `ELEVENLABS_WEBHOOK_SECRET`
   (step 2). This is workspace-wide; agents not in `agent_links` are skipped with 202.
7. **Backfill history** (locally, keys only in your shell):
   ```
   SUPABASE_URL=https://aacnqiuwrpzgxhzdavaq.supabase.co SUPABASE_SERVICE_ROLE_KEY=... \
   NABRAH_API_KEY=... ELEVENLABS_API_KEY=... \
   node scripts/backfill-agent-calls.mjs --dry-run          # prints rows, writes nothing
   node scripts/backfill-agent-calls.mjs [--since=2026-09-01] [--provider=nabrah] [--no-tickets]
   ```
   The backfill opens tickets for historic calls that needed a person, same as the webhook.
   Pass `--no-tickets` (or a recent `--since`) to avoid filling the Tickets board with old calls.

## Testing

- Offline: `node scripts/agent-calls-selfcheck.mjs` (no network, no DB). Covers both providers' mapping,
  failed calls, transfer → normal ticket, complaint/refund → high ticket, booked / silent-unsuccessful →
  no ticket, the ElevenLabs signature (wrong key, stale, missing), and the whole webhook handler against
  an in-memory store that enforces the two unique indexes: a signed ElevenLabs call → `completed`, a Nabrah
  complaint → `needs_review` + one high ticket, duplicate deliveries (same and different body shapes) →
  still one row and one ticket (and a ticket already `in_progress` is untouched), unknown agent → 202,
  bad secret → 401 without calling Nabrah.
- Nabrah end to end: make a test call to a linked agent, or replay one:
  ```
  curl -X POST "https://aacnqiuwrpzgxhzdavaq.supabase.co/functions/v1/agent-call-webhook?provider=nabrah" \
    -H "X-Madar-Secret: $NABRAH_WEBHOOK_SECRET" -H "Content-Type: application/json" \
    -d '{"call_id":"<an existing call id>"}'
  ```
  Expect `{"ok":true, "call_id": "<row uuid>", "ticket": "none"|"opened"|"exists"}`; a wrong secret gives 401, an unlinked agent 202. Running it twice still
  leaves one row.
- ElevenLabs: use "Send test" in the webhook settings, or finish a conversation with a linked
  agent. Bad signatures return 401 (visible in ElevenLabs' webhook delivery log).
- Check: `select provider, external_id, status, result, intent, channel, call_time from clinic_os_ai_calls order by created_at desc limit 20;`
  and `select subject, priority, status, ai_call_id from ai_agent_support_tickets where route = 'ai-receptionist' order by created_at desc;`
  then open the dashboard's Call logs and Tickets pages for that company — new rows appear live.
  Replaying the same webhook must not add a second ticket.
