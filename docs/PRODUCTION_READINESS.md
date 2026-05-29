# MADAR OS Production Readiness

This checklist tracks the car wash product readiness before selling or onboarding a new tenant.

## Car Wash Core

- Queue flow is the main operating screen for staff.
- Self check-in is available for Growth+ tenants through the public QR flow.
- Staff must assign a worker before moving a car into service so performance and commissions stay accurate.
- Daily closing includes revenue, VAT, expenses, worker costs, net profit, and cash drawer reconciliation.
- Customer page is labeled "العملاء" for the car wash portal.

## Founder / Admin Checks

- Admin Companies includes car wash KPIs for monthly visits, revenue, retention, and active washes.
- Admin Companies includes tenant health for car wash accounts:
  - active account status
  - public QR token readiness
  - active services
  - active workers
  - cars created today
  - message usage under limit

## Pre-Onboarding Checklist

Before giving a car wash access, verify:

- `companies.business_type` or `companies.industry` is `car_wash`.
- The tenant has a Growth or Enterprise plan if self check-in is required.
- At least one active service exists in `cw_services`.
- At least one active worker exists in `cw_workers`.
- The public check-in token exists on `companies.public_checkin_token`.
- `webhook_token` is present for internal webhook/QR readiness.
- Phone numbers are stored in international format, for example `9665XXXXXXXX`.

## Supabase / Edge Function

- Supabase project: `aacnqiuwrpzgxhzdavaq`.
- Do not touch project `checwxcpfwbvjfvbujaw`.
- Public self check-in function: `cw-public-checkin`.
- Public check-in must not expose service prices from another company.
- RLS should keep tenant data isolated by `company_id`.

## Manual Acceptance Test

Run this for each production tenant:

1. Open `/client/settings` and confirm QR check-in is visible.
2. Open the public QR URL in a private browser.
3. Submit a customer car with a valid Saudi phone number.
4. Confirm the car appears in `/client/queue` as pending approval.
5. Approve it, assign a worker, and move it through service.
6. Deliver with a payment method.
7. Confirm the visit appears in customers, finance, reports, workers, and daily closing.
8. Close the day and verify the cash drawer note is stored.

## Deferred

- Clinic dashboard polish is deferred.
- n8n workflow redesign is deferred, but existing webhook names remain documented in `docs/PROJECT_BRIEF.md`.
- Multi-branch operations need a separate product pass.
