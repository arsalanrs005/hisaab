# Permissions and RLS (Hisab Phase 2)

Hisab is a two-person private workspace. Both approved users are admins for **shared** entities, but **account ownership** still gates ledger writes.

## Helpers

| Function | Meaning |
|----------|---------|
| `is_approved_active_user()` | JWT email is on `approved_users` and active |
| `is_shared_admin()` | Same as approved active (shared-entity admin) |
| `is_account_owner(account_id)` | `accounts.owner_profile_id = auth.uid()` |
| `current_profile_id()` | `auth.uid()` |

## Permission matrix

| Resource | Arsalan & Ali SELECT | INSERT / UPDATE |
|----------|----------------------|-----------------|
| `approved_users` | Yes | No (trusted server only) |
| `profiles` | Yes | Own row only |
| `accounts` | Yes (all) | Owner only; cannot change owner |
| `account_permissions` | Yes | No (synced by `sync_account_permissions`) |
| `categories` | Yes | Both (shared admin) |
| `income_sources` | Yes | Owner / shared sources |
| `transactions` | Yes | Owner account; **not** transfer/adjustment types |
| `transfers` | Yes | **No** — `create_account_transfer` only |
| `account_contributions` | Yes | **No** — created by transfer RPC |
| `balance_adjustments` | Yes | **No** — `reconcile_account_balance` only |
| `financial_goals` | Yes | Shared/business: both; personal: owner |
| `goal_contributions` | Yes | Follows goal + account ownership |
| `loans` / `loan_payments` | Yes | Owner only |
| `budgets` | Yes | Shared/business: both; personal: owner |
| `note_folders` | Yes | Both |
| `notes` | Shared: both; personal: owner only | Same |
| `attachments` | Follows linked note visibility | Uploader |
| Business / Upwork / LinkedIn | Yes | Both |
| `notifications` | Own rows | Own `read_at` only (no client insert) |
| `audit_logs` | Yes | **No** |
| `app_settings` | Yes | Both |

## Secure write gate

Direct inserts/updates of `transfer_in`, `transfer_out`, and `balance_adjustment` are blocked unless:

```sql
set_config('hisab.allow_secure_write', 'on', true)
```

is set inside a `SECURITY DEFINER` RPC (`create_account_transfer`, `reconcile_account_balance`, `archive_transaction`, `restore_transaction`).

Archive/restore of any transaction also requires that flag (clients cannot set `archived_at` directly).

## Storage (`hisab-attachments`)

Private bucket. Minimal Phase 2 policies:

- Approved users may **read**
- Upload path must start with `{auth.uid()}/...`
- Delete only own uploads

Stricter entity-linked storage auth is deferred to Phase 6.

## Important non-goals

- Being `admin` does **not** allow editing the other user’s account transactions.
- Ali may transfer **into** Arsalan’s shared Meezan via RPC without gaining Meezan write access.
- Completed transfers and balance corrections are immutable; linked legs cannot be archived individually.
- Transfer idempotency keys are scoped per initiator (`transfers.initiated_by`, `idempotency_key`).
- Personal notes must never leak across users through views or joins.

## Phase 3 UI enforcement

Server Actions and page loaders call `requireCurrentProfile()` and derive capabilities from `account_permissions` + ownership (`src/lib/finance/capabilities.ts`).

| UI capability | Rule |
|---------------|------|
| View account / transaction | Both approved users |
| Create / edit / archive normal transactions | Account owner only |
| Shared Meezan | Both view; only Arsalan edits normal Meezan transactions |

## Phase 5 workspace isolation

All tenant-scoped records include `workspace_id`. Read access requires `is_active_workspace_member(workspace_id)`.

| Area | Rule |
|------|------|
| Accounts, transactions, transfers | Workspace member + existing ownership rules |
| Shared Meezan | Only `is_shared_savings_account` in Arsalan & Ali workspace |
| Profiles | Visible only to co-members of a shared workspace |
| Audit logs | Workspace-scoped SELECT; append-only via RPCs |
| Notifications | Own profile + workspace membership |
| Categories / settings | Workspace-scoped; admin writes within workspace |

Cross-workspace transfers, reconciliation, and queries are rejected in RPCs and RLS.

See `docs/phase-5-workspace-isolation.md`.

Never authorize by account display name or email string in UI code — use `owner_profile_id` and `is_shared_savings_account`.
