# Financial calculations (Hisab Phase 2)

## Direction model

Every ledger row stores a positive `amount_pkr` plus `direction`:

| Value | Effect |
|-------|--------|
| `1` | Increases account balance |
| `-1` | Decreases account balance |

Default directions (set by trigger):

| Type | Direction |
|------|-----------|
| `income`, `transfer_in`, `refund`, `family_contribution`, `loan_repayment` | `+1` |
| `expense`, `transfer_out`, `loan_payment` | `-1` |
| `balance_adjustment` | Caller-supplied (`+1` or `-1`) |

Helpers:

- `signed_effect(amount_pkr, direction)` → `amount_pkr * direction`
- `transaction_signed_amount(...)` → alias of `signed_effect`

## Actual vs projected balances

### Actual (`account_actual_balance` / `account_actual_balances`)

```text
opening_balance
+ sum(signed_effect) for status = completed AND archived_at IS NULL
```

Excluded from actual:

- `pending`
- `expected`
- `cancelled`
- archived rows

### Projected (`account_projected_balances`)

```text
actual
+ pending signed effects
+ expected signed effects
```

Also exposes `pending_effect` and `expected_effect` separately.

## Transfers

`create_account_transfer(...)`:

1. Actor from `auth.uid()` (never trusted from client args)
2. Source must be owned by actor and active
3. Rejects insufficient funds using **server** actual balance
4. Inserts `transfers` + `transfer_out` + `transfer_in`
5. If destination `is_shared_savings_account`, inserts `account_contributions` (`deposit`) for the initiator
6. Writes audit + notifications

Direct client inserts of transfer legs are rejected.

## Shared Meezan contributions

Contribution history is append-only. Transfers into a shared savings account add a contribution for the initiator; withdrawals do not erase prior contribution rows. Totals are exposed by `account_contribution_totals`.

## Reconciliation

`reconcile_account_balance(account_id, actual_bank_balance, reason, ...)`:

```text
adjustment = actual_bank_balance - calculated_ledger_balance
```

- Always inserts `balance_adjustments`
- If `adjustment != 0`, inserts a `balance_adjustment` transaction with matching direction
- If `adjustment = 0`, no zero-amount transaction is created
- Updates `accounts.last_reconciled_at`
- **Does not** rewrite `opening_balance`

Only the account owner may reconcile.

## Archive / restore

- Owner of the transaction’s account required
- Linked transfer legs **cannot** be archived individually (Phase 4 immutability)
- `balance_adjustment` archive/restore is **rejected** (preserves reconciliation history)

## Dashboard metrics (Phase 4)

Income, expense, net saved, and savings rate **exclude**:

- `transfer_in` / `transfer_out`
- `balance_adjustment`

Internal transfers change per-account balances but not combined household net worth. Balance adjustments change actual balances and combined totals but are not counted as normal income or expense.

## Goals / loans / budgets (views)

| View | Formula |
|------|---------|
| `goal_progress` | `starting_amount + deposits − withdrawals ± adjustments` |
| `loan_progress` | `starting_remaining_balance − sum(principal_amount)` |
| `monthly_budget_usage` | budgeted vs completed non-archived expenses in month |
| `combined_financial_summary` | totals + current-month income/expense/net/savings rate |

Views use `security_invoker = true` so underlying RLS applies.

## Money types

- PKR / amounts: `numeric(18,2)`
- FX rates: `numeric(18,6)`
- Percents / interest: `numeric(10,4)`
- No floating-point money columns
- Timestamps stored in UTC via `timezone('utc', now())`

## Phase 3 frontend helpers

| Module | Purpose |
|--------|---------|
| `src/lib/money.ts` | Parse/format `numeric` as integer minor units (avoid JS float drift) |
| `src/lib/finance/transaction-direction.ts` | `signedTransactionAmount`, `isFormCreatableType` — mirrors DB direction rules |
| `src/data/accounts/queries.ts` | Reads `account_actual_balances` / `account_projected_balances` — **do not** recompute in React |
| `src/data/dashboard/queries.ts` | Aggregates from views + filtered transactions for charts |

### Account trend chart

1. Start at `opening_balance`
2. Sort completed, non-archived transactions chronologically (stable tie-break by id)
3. Apply `signedTransactionAmount(amount_pkr, direction)` cumulatively
4. Emit daily/monthly points for charting

### USD entry (Phase 3)

Manual rate required. Stored fields: `amount_original`, `currency_original`, `exchange_rate`, `amount_pkr`, `exchange_rate_is_manual`, `exchange_rate_timestamp`. Rates are never retroactively changed.
