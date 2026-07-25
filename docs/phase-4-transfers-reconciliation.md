# Phase 4 — Transfers, reconciliation, audit, notifications

Phase 4 connects atomic transfers, balance reconciliation, shared Meezan contributions, audit activity, and in-app notifications to Supabase secure RPCs.

## Live routes

| Route | Data source |
|-------|-------------|
| `/transfers` | Transfer history + creation via `create_account_transfer` |
| `/accounts/[accountId]` | Contributions, reconciliation history, transfer actions |
| `/transactions` | Linked transfer/adjustment rows (view-only mutations) |
| `/dashboard` | Metrics exclude transfers from income/expense |
| `/notifications` | User-scoped notification feed |
| `/activity` | Append-only audit log |

## Transfer architecture

- Creation only through `create_account_transfer` RPC
- Actor derived from `auth.uid()` — never trusted from browser
- Source account must be owned by initiator
- Insufficient funds checked against **actual** balance server-side
- Optional `idempotency_key` scoped to initiator (unique index)
- Shared Meezan destination creates `account_contributions` for initiator
- Completed transfers are immutable; individual legs cannot be archived

## Reconciliation architecture

- Only account owner via `reconcile_account_balance` RPC
- Server calculates difference; browser preview is non-authoritative
- Zero-difference reconciliation records history without zero-value transaction
- Balance-adjustment transactions are immutable and non-archivable

## Dashboard rules

- Internal transfers change account balances but not combined household total
- Transfers excluded from income, expense, net saved, and savings rate
- Balance adjustments affect actual balance and combined total but not normal income/expense metrics

## Phase 4 migration

`20260724150000_phase4_transfers_reconciliation_integration.sql`

- `transfers.idempotency_key` + unique index per initiator
- Updated `create_account_transfer` with idempotency return path
- `allocate_opening_contributions` RPC for shared savings opening split
- Transfer leg archive blocked in `archive_transaction`
- Performance indexes for transfers, reconciliations, audit, notifications

## Deferred

- Transfer reversal/cancellation workflow
- Email notification delivery
- Realtime subscriptions (route refresh used instead)
- Playwright browser tests (not configured in repo)

## Manual verification

```bash
npm run supabase:reset
npm run supabase:test
npm test
npm run build
```

Sign in as Arsalan and Ali; verify transfer permissions, shared Meezan contributions, reconciliation ownership, audit entries, and notification ownership.
