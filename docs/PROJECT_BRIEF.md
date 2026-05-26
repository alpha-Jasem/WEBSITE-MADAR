# MADAR OS Project Brief

## What MADAR Is

MADAR is an Arabic SaaS platform for automating car wash and medical clinic operations in the Saudi market. Each customer gets a complete dashboard, WhatsApp automation, reporting, loyalty features, and operational workflows without needing to write code.

The current product focus is the car wash operating system. The broader platform also includes partial clinic and general CRM foundations.

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, TailwindCSS |
| Backend | Supabase: PostgreSQL, Auth, Edge Functions, Realtime |
| Automation | n8n Cloud: `keepcalm.app.n8n.cloud` |
| WhatsApp | Meta Cloud API, Graph API v18 |
| AI | OpenAI GPT-4o-mini for weekly promotions |
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
  - `cw_automations` JSONB
  - `cw_message_templates` JSONB
  - `cw_loyalty_threshold`
  - `cw_services` JSONB, per original product brief
  - `google_maps_url`
  - `tax_enabled`
  - `vat_rate`
  - `messages_used`
  - `message_limit`

### Car Wash Tables

`cw_queue`

- Current operational queue for cars.
- Important fields:
  - `company_id`
  - `customer_name`
  - `phone`
  - `car_type`
  - `plate`
  - `service_id`
  - `service_name`
  - `price`
  - `worker_id`
  - `status`: `received`, `washing`, `drying`, `ready`, `delivered`
  - `payment_method`
  - `payment_status`
  - `is_free_wash`
  - `started_at`
  - `delivered_at`
  - `followup_sent`

`cw_customers`

- Customer register and loyalty state.
- Important fields:
  - `company_id`
  - `phone`
  - `name`
  - `total_visits`
  - `loyalty_tier`: `bronze`, `silver`, `gold`
  - `free_washes_available`
  - `loyalty_count`
  - `last_visit_at`
  - `welcome_sent`
  - `google_review_requested`

`cw_visits`

- Historical visit ledger.
- Important fields:
  - `company_id`
  - `customer_id`
  - `service_name`
  - `price`
  - `subtotal`
  - `vat_amount`
  - `total_amount`
  - `payment_method`
  - `is_free_wash`
  - `review_request_sent`

`cw_workers`

- Car wash staff.
- Important fields:
  - `company_id`
  - `name`
  - `role`
  - `active`

`cw_campaigns`

- Manual WhatsApp campaigns.
- Important fields:
  - `company_id`
  - `message`
  - `phones[]`
  - `status`
  - `sent_count`

`cw_closing`

- Daily closing, per original product brief.
- Important fields:
  - `company_id`
  - `date`
  - `total_revenue`
  - `total_cars`
  - `notes`

### CRM Tables

`leads`

- CRM leads for clinics and other business types.

`conversations`

- Conversation records for broader CRM/clinic workflows.

## Client Portal Routes

Car wash routes:

| Route | Purpose |
| --- | --- |
| `/client` | Car wash overview: stats and top customers |
| `/client/queue` | Operations Kanban: received to delivered |
| `/client/leads` | Car wash customers, loyalty, and WhatsApp campaigns |
| `/client/workers` | Workers |
| `/client/finance` | Finance, revenue, expenses, VAT, daily closing |
| `/client/automations` | Automation toggles |
| `/client/reports` | Charts and PDF/CSV reporting |
| `/client/settings` | Webhook, email, Google Maps, and setup settings |
| `/client/upgrade` | Subscription upgrade through Moyasar |

## n8n Workflows

n8n base URL:

```text
https://keepcalm.app.n8n.cloud/webhook/
```

Webhook workflows:

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| `cw-car-ready` | Webhook | Tell customer the car is ready |
| `cw-delivery-receipt` | Webhook | Send delivery receipt |
| `cw-loyalty-milestone` | Webhook | Notify customer about free wash reward |
| `cw-registration` | Webhook | Welcome new customer |
| `cw-campaign-send` | Webhook | Send manual campaigns immediately |

Scheduled workflows:

| Workflow | Schedule | Purpose |
| --- | --- | --- |
| Review Request | Every 3 hours | Ask for Google review |
| First Visit Welcome | Every 2 hours | Follow up first visit |
| Post Followup | Every 4 hours | Follow up after service |
| Daily Reactivation | Daily at 10:00 | Reactivate customers absent for 30 days |
| Weekly Promo AI | Thursdays | Generate weekly promo with GPT-4o-mini |
| Daily Closing | Daily | Send daily closing report |

In n8n Code nodes, always use:

```js
$helpers.httpRequest()
```

Do not use:

```js
fetch()
```

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

## Built

- Complete car wash dashboard.
- n8n workflow integration points.
- Loyalty and reward system.
- VAT and daily closing.
- Manual WhatsApp campaigns.
- Moyasar payment and plan upgrade flow.
- PDF/CSV reports.
- RTL layout.

## Not Built Yet

- Complete worker performance based on `worker_id` in `cw_visits`.
- Comprehensive Admin KPI dashboard.
- Full clinic dashboard.
- Multi-branch support for larger car washes.

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

## Implementation Notes / Current Repo Reality

- The product brief lists `companies.cw_services` as JSONB, but the current code uses a separate `cw_services` table for car wash services and prices.
- The product brief refers to `cw_closing`, but the current code uses `cw_daily_closings`.
- Worker performance is partially implemented. Current calculations rely on `cw_queue.worker_id` and some `cw_visits.worker_id` usage, but the final intended worker-performance model still needs consolidation.
- Clinic and multi-branch groundwork exists through `branches`, `wbos_services`, `wbos_resources`, `wbos_schedules`, and `branch_settings`, but it is not complete as a polished product surface.
- The client portal is expected to stay Arabic-only and RTL-first. Any future client-facing English or LTR behavior must be treated as out of scope unless explicitly requested.
