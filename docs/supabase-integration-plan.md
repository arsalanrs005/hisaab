# Hisab Supabase Integration Plan

## Baseline audit (pre-change)

### Existing architecture

| Area | Location | Notes |
|------|----------|--------|
| Mock data | `src/data/mock/*` | Users, accounts, transactions, goals, loans, budget, notes, Ops5ive, insights |
| Domain types | `src/types/index.ts` | Strongly typed mock models |
| App UI state | `src/providers/app-provider.tsx` | Mock `currentUser` via `setCurrentUserId` + localStorage |
| Theme | `src/providers/theme-provider.tsx` | next-themes |
| Auth UI | `src/app/(auth)/login`, `onboarding` | Mock allowlist; no real auth |
| App shell | `src/app/(app)/layout.tsx` + layout components | All product routes |
| Permissions (UI only) | `src/lib/permissions.ts` | Owner vs view-only on mock user ids |

### Routes (preserve)

`/dashboard`, `/accounts`, `/accounts/[accountId]`, `/transactions`, `/transfers`, `/goals`, `/goals/[goalId]`, `/loans`, `/budget`, `/reports`, `/notes`, `/ops5ive`, `/ops5ive/upwork`, `/ops5ive/linkedin`, `/notifications`, `/settings`, `/onboarding`, `/login`

### Pre-existing issues

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Exit 0 |
| `npm run build` | Exit 0 |
| `npm run lint` | **Pre-existing failure**: ESLint 9 `cli.execute is not a function` |
| Supabase packages | Not installed before Phase 1 (now adding `@supabase/ssr`, `@supabase/supabase-js`) |
| Env file | Present but non-standard names (`SUPABASE_URL`, `SUPABASE_ANON_PUBLICK_KEY` typo) |

### Phase rules

- Do not redesign UI or remove routes.
- Financial pages keep mock data until their later phase; once a route goes live it must not invent production balances.
- Dev user switcher only when `NODE_ENV === "development"`.
- Service role never exposed to the browser.

---

## Phased delivery

### Phase 1 — Auth foundation (this delivery)

1. Env validation + `.env.example` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, optional `EXCHANGE_RATE_API_KEY`)
2. Supabase clients: browser, server, middleware, admin
3. Middleware session refresh + route protection + return URL
4. Email/password + Google OAuth + password reset + callback
5. `approved_users` + `profiles` migration, seed Arsalan/Ali, RLS
6. Unauthorized Google account → reject, sign out, clear message
7. Real session drives `currentUser` mapping; mock financial data still used for pages
8. Typecheck + build

**Stop for review before Phase 2.**

### Phase 2 — Core financial schema + RLS

Accounts, categories, transactions, transfers, contributions, balance adjustments, indexes, views, seed categories/folders/settings. Generated `src/types/database.ts`.

### Phase 3 — Accounts, transactions, onboarding persistence ✅

Wire accounts/transactions/onboarding to Supabase; opening balances; no fake production numbers on live routes. See `docs/phase-3-live-finance.md`.

### Phase 4 — Transfers, reconciliation, audit ✅

Atomic transfers, shared Meezan contributions, reconciliation, audit activity, notifications. See `docs/phase-4-transfers-reconciliation.md`.

### Phase 5 — Workspace isolation ✅

Multi-tenant workspaces with strict RLS. Four approved users across three workspaces. See `docs/phase-5-workspace-isolation.md`.

### Phase 6 — Goals, loans, budgets, insights

Deterministic finance modules; persist budgets/goals/loans.

### Phase 7 — Notes, attachments, Ops5ive

Storage bucket `hisab-attachments`; business/Upwork/LinkedIn CRUD.

### Phase 8 — Reports, notifications, FX, hardening

CSV export; notifications; exchange-rate service; Vercel docs; full verification checklist.

---

## Temporary mock ↔ live strategy

| Layer | Phase 1 | After Phase 3 |
|-------|---------|----------------|
| Auth / profile | **Live Supabase** | Live |
| Onboarding, accounts, transactions, dashboard core | Mock (Phase 2) | **Live Supabase** |
| App shell preferences | localStorage UI prefs + `profiles` columns | `profiles.default_dashboard_mode`, `profiles.balances_hidden_by_default` |
| Goals, loans, budget, notes, Ops5ive | Mock data | Deferred Phase 5–7 |
| Transfers, reconciliation, audit, notifications | Mock (Phase 3) | **Live Supabase (Phase 4)** |

`src/data/mock` remains until each domain module is replaced. No silent mix of mock and live balances on the same route after cutover.

---

## Manual Supabase dashboard steps (Phase 1)

1. Enable Email provider (disable public sign-ups if available; app still enforces allowlist).
2. Enable Google OAuth with authorized redirect:
   - Local: `http://localhost:3000/auth/callback`
   - Production: `https://<domain>/auth/callback`
3. Add Site URL and redirect URLs in Authentication → URL Configuration.
4. Apply Phase 1 migration (CLI `db push` or SQL editor).
5. Create Auth users for both approved emails (or first Google login after seed).

---

## Success criteria for Phase 1

- [x] Plan documented (`docs/supabase-integration-plan.md`)
- [x] Clients + env validation (`src/lib/env.ts`, `src/lib/supabase/*`)
- [x] Middleware protects app routes (`src/middleware.ts`)
- [x] Login / Google / reset / sign-out wired to Supabase
- [x] Unauthorized email rejected at callback + middleware
- [x] Profiles migration created (`supabase/migrations/20260724120000_phase1_auth_profiles.sql`)
- [x] Dev switcher gated to `NODE_ENV === "development"`
- [x] `npx tsc --noEmit` passes
- [ ] `npm run build` — blocked by pre-existing broken Next CLI `semver` import in this environment (see Phase 1 report)
- [ ] Migration applied on remote project — **manual step** (SQL file ready; not auto-applied)

**Stop for review before Phase 2.**
