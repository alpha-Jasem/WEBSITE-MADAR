# Madar 10 Dashboard Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise the car wash SaaS dashboards toward a sellable 10/10 by improving admin operational intelligence, client daily operations, and sales pipeline usefulness while leaving OTP implementation alone.

**Architecture:** Use the existing React + Supabase dashboard components and CSS system. Keep changes scoped to admin/client dashboard surfaces and derive intelligence from existing tables: `companies`, `cw_queue`, `cw_visits`, `cw_services`, `cw_workers`, `automations`, and `crm_leads`.

**Tech Stack:** React, TypeScript, Vite, Tailwind, Supabase JS, lucide-react.

---

### Task 1: Admin Integration And Alert Intelligence

**Files:**
- Modify: `src/components/dashboard/admin/AdminCommandDeck.tsx`
- Modify: `src/index.css`

- [ ] Add richer integration health for Supabase, n8n, WhatsApp, Moyasar, QR check-in, and OTP readiness.
- [ ] Add an admin alert lane showing message limits, missing QR, missing services, missing workers, no cars today, and upgrade opportunities.
- [ ] Keep all data reads from existing tables and avoid new schema.
- [ ] Run `npm run build`.

### Task 2: Client Car Wash Command Center

**Files:**
- Modify: `src/components/dashboard/client/CarWashOverview.tsx`
- Modify: `src/index.css`

- [ ] Add an operations score and next-best-action panel for the car wash owner.
- [ ] Highlight stuck cars, pending approvals, ready cars, pending review requests, and missing setup items.
- [ ] Keep the four-stage fast workflow untouched.
- [ ] Run `npm run build`.

### Task 3: Sales Pipeline Upgrade Intelligence

**Files:**
- Modify: `src/components/dashboard/admin/AdminPipeline.tsx`
- Modify: `src/index.css`

- [ ] Add upgrade opportunity cards from real tenant readiness and message usage.
- [ ] Add reasons for sales movement: message limit, QR missing, paid feature disabled, no activity.
- [ ] Keep manual opportunity creation available.
- [ ] Run `npm run build`.

### Task 4: Verification And Release

**Files:**
- No extra files unless build reveals a necessary fix.

- [ ] Run `npm run build`.
- [ ] Check `git status --short`.
- [ ] Commit the plan and implementation.
- [ ] Pull with rebase from `origin/main`.
- [ ] Re-run `npm run build`.
- [ ] Push to `origin/main`.
