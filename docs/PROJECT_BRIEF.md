# MADAR OS Project Brief

## What MADAR Is

MADAR is an Arabic SaaS platform for automating medical clinic operations in the Saudi market. Each customer gets a dashboard, WhatsApp automation, reporting, and operational workflows without needing to write code.

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, TailwindCSS |
| Backend | Supabase: PostgreSQL, Auth, Edge Functions, Realtime |
| Automation | n8n Cloud: `keepcalm.app.n8n.cloud` |
| WhatsApp | Meta Cloud API, Graph API v18 |
| AI | OpenAI GPT-4o-mini |
| Payments | Moyasar, Saudi payment gateway |
| Hosting | Netlify |
| Fonts | Cairo, Tajawal, Sora |

## Supabase Data Model

Use only the MADAR Supabase project:

```text
aacnqiuwrpzgxhzdavaq
```

Do not use or touch:

```text
checwxcpfwbvjfvbujaw
```

### Core Tables

`companies`

- Stores customer companies and account-level settings.
- Important fields:
  - `id`
  - `name`
  - `industry`
  - `business_type`
  - `plan`: `starter`, `growth`, `enterprise`
  - `owner_name`
  - `owner_email`
  - `webhook_token`
  - `google_maps_url`
  - `tax_enabled`
  - `vat_rate`
  - `messages_used`
  - `message_limit`

### CRM Tables

`leads`

- CRM leads for clinics.

`conversations`

- Conversation records for broader CRM/clinic workflows.

## Subscriptions And Payments

| Plan | Monthly Messages |
| --- | --- |
| Starter | 2,000 |
| Growth | 10,000 |
| Enterprise | Unlimited |

Payments use Moyasar.

Supabase Edge Functions:

- `create-moyasar-payment`
  - Creates invoice through `/v1/invoices`.
- `moyasar-callback`
  - Updates `companies.plan` automatically after payment callback.

## Design Direction

- Client portal must be 100% RTL.
- Sidebar belongs on the right.
- Client portal language is Arabic 100%.
- Theme is dark, based around `#030713`.
- Fonts:
  - Cairo for headings.
  - Tajawal for body copy.
  - Sora for numbers and technical labels.

## Important Conventions

Phone numbers stored in the database must always use international Saudi format:

```text
966XXXXXXXXX
```

Do not store local format:

```text
0XXXXXXXXX
```

Use only this Supabase project ID for MADAR:

```text
aacnqiuwrpzgxhzdavaq
```

Never use:

```text
checwxcpfwbvjfvbujaw
```

Use this n8n base URL:

```text
https://keepcalm.app.n8n.cloud/webhook/
```

## Notes

- Clinic and multi-branch groundwork exists through `branches`, `wbos_services`, `wbos_resources`, `wbos_schedules`, and `branch_settings`, but it is not complete as a polished product surface.
- The client portal is expected to stay Arabic-only and RTL-first.
