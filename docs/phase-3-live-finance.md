# Phase 3 — Live finance routes

Phase 3 connects core household finance UI to Supabase. Mock data remains only on deferred routes.

## Live routes

| Route | Data source |
|-------|-------------|
| `/onboarding` | Profiles, accounts, income sources |
| `/dashboard` | Accounts, transactions, balance views |
| `/accounts` | Accounts + projected balances |
| `/accounts/[accountId]` | Account detail, trend, transactions |
| `/transactions` | Paginated transaction ledger |

## Deferred after Phase 3 (Phase 4+)

Phase 4 now live: `/transfers`, `/notifications`, `/activity`, reconciliation, contributions.

Still mock/deferred: `/goals`, `/loans`, `/budget`, `/reports`, `/notes`, `/ops5ive/*`.

These deferred pages do not contribute fake totals to live dashboard metrics.

## Data layer

```text
src/data/profiles/
src/data/accounts/
src/data/transactions/
src/data/dashboard/
src/data/onboarding/
src/data/categories/
```

Server Components load initial data; mutations use Server Actions with `revalidatePath`.

## Balances

- **Actual** — opening balance + completed, non-archived signed transactions
- **Projected** — actual + pending + expected signed effects

Signed effect = `amount_pkr * direction` (matches Phase 2 database rules).

## Decimal strategy

Supabase `numeric` values are parsed via `src/lib/money.ts` using integer minor units (PKR cents) to avoid JavaScript float drift during aggregation.

## USD transactions

Phase 3 requires a **manual exchange rate** for USD entries. The exact rate and timestamp are stored on the transaction row. Live FX is deferred to Phase 7.

## Archive behavior

Normal transactions archive/restore through `archive_transaction` / `restore_transaction` RPCs. Transfer-linked and reconciliation rows are view-only (implemented in Phase 4).

## Phase 3 migration

`20260724140000_phase3_integration_fields.sql`

- `profiles.savings_plan_mode`, `profiles.custom_savings_rate`
- `transactions.client_request_id` (idempotency)
- `transactions.exchange_rate_is_manual`
- Unique index on `(owner_profile_id, bank_name, name)` for onboarding duplicate prevention

## Revalidation

After create, edit, archive, or restore:

- `/dashboard`
- `/accounts`
- `/transactions`
- `/accounts/[accountId]` when applicable

## Edit workflow

Normal transactions edit through `updateTransactionAction` + `EditTransactionDialog`. Transfer-linked and reconciliation rows remain view-only.

## Manual verification

```bash
npm run supabase:reset
npm run dev
npm test
npm run typecheck
npm run build
```

Sign in as each approved user, complete onboarding once, then create PKR/USD transactions and verify cross-account read-only behavior.
