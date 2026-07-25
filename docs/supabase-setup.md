# Supabase setup (Hisab)

## Prerequisites

- **Docker Desktop must be running** (required for `supabase start` / `db reset` / `test db`)
- Node.js 20+ (22+ preferred for `@supabase/supabase-js`)
- Supabase CLI via `npx supabase` (devDependency included)

## Project layout

```text
supabase/
  config.toml
  migrations/          # ordered SQL migrations
  seed.sql             # idempotent system seeds
  tests/               # pgTAP database tests
```

## Migration order

1. `20260724120000_phase1_auth_profiles.sql` — approved users + profiles + auth helpers
2. `20260724130000_phase2_enums_and_helpers.sql` — enums + ownership/audit helpers
3. `20260724130100_phase2_accounts_and_permissions.sql` — accounts + permission sync
4. `20260724130200_phase2_categories_and_income_sources.sql` — categories + income sources
5. `20260724130300_phase2_transactions_core.sql` — transactions + direction / secure-write guards
6. `20260724130400_phase2_transfers_contributions_reconciliation.sql` — transfers, contributions, adjustments
7. `20260724130500_phase2_goals_loans_budgets.sql` — goals, loans, budgets
8. `20260724130600_phase2_notes_attachments_storage.sql` — notes + `hisab-attachments` bucket
9. `20260724130700_phase2_business_notifications_audit_settings.sql` — Ops5ive + notifications + audit + settings
10. `20260724130800_phase2_financial_views_and_rpcs.sql` — balances views + secure RPCs + audit triggers
11. `20260724130900_phase2_row_level_security.sql` — RLS policies
12. `20260724140000_phase3_integration_fields.sql` — onboarding/savings/idempotency/unique accounts

## Local commands

```bash
# Start local stack
npx supabase start

# Reset DB from scratch (migrations + seed.sql)
npx supabase db reset

# Check status / API URL / keys
npx supabase status

# Generate TypeScript types (writes generated file; keep src/types/database.ts as app contract)
npx supabase gen types typescript --local -o src/types/database.generated.ts
# or:
npm run supabase:types

# Run pgTAP tests
npx supabase test db
```

npm scripts (same commands):

```bash
npm run supabase:start
npm run supabase:stop
npm run supabase:reset
npm run supabase:status
npm run supabase:types
npm run supabase:test
```

## Seed contents

`supabase/seed.sql` is idempotent (`ON CONFLICT`) and seeds only:

- Approved users: Arsalan + Ali
- System categories (stable slugs)
- System note folders
- Default app settings (savings rates, budget thresholds, currency)

It does **not** seed balances, transactions, goals, loans, or fake revenue.

## Remote apply

```bash
npx supabase db push
# or link first:
npx supabase link --project-ref <ref>
```

After push, confirm Auth providers (Email + Google) match `docs/authentication.md`.

## Phase boundary

- **Phase 2** — schema, RLS, RPCs, seeds, DB tests (no live UI ledger).
- **Phase 3** — `/onboarding`, `/dashboard`, `/accounts`, `/accounts/[accountId]`, `/transactions` use Supabase via `src/data/*`. See `docs/phase-3-live-finance.md`.
- Deferred routes (`/transfers`, `/goals`, etc.) remain mock-backed and do not feed live dashboard totals.
