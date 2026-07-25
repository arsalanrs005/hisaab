# Phase 5 — Workspace isolation

Phase 5 introduces strict multi-tenant workspace isolation enforced in Supabase RLS and secure RPCs.

## Workspaces

| Name | Slug | Type | Members |
|------|------|------|---------|
| Arsalan & Ali | `arsalan-ali` | shared | Arsalan, Ali |
| Anum Personal | `anum-personal` | personal | Anum Shahid |
| Sarah Personal | `sarah-personal` | personal | Sarah Batool |

Stable workspace IDs are seeded in migration `20260725120000_phase5_workspaces_core.sql`.

## Approved users

All four emails are in `approved_users` with `initial_workspace_slug`:

- `arsalanrs005@gmail.com` → `arsalan-ali`
- `alirashidd.232@gmail.com` → `arsalan-ali`
- `anum112004@gmail.com` → `anum-personal`
- `sarahbatool23@gmail.com` → `sarah-personal`

On first login, `ensure_profile_for_auth_user()` creates the profile and calls `ensure_workspace_membership()` idempotently.

## Data backfill

Existing Arsalan and Ali Phase 4 data is assigned to the shared workspace ID. All tenant-scoped tables receive non-null `workspace_id` after backfill.

Categories, note folders, and app settings use `(workspace_id, slug)` or `(workspace_id, key)` uniqueness. New personal workspaces receive copies via `seed_workspace_defaults()`.

## RLS model

Read access requires:

```text
is_active_workspace_member(record.workspace_id)
```

Profiles are visible only to co-members of a shared workspace. Notifications require own `profile_id` plus workspace membership. Audit logs are append-only and workspace-scoped.

Account ownership rules from Phases 2–4 remain; workspace membership is an additional gate.

## Shared Meezan behavior

Only accounts with `is_shared_savings_account = true` inside the **Arsalan & Ali** workspace use pooled contribution tracking. Anum's Meezan account is personal (`is_shared_savings_account = false`) even if the bank name is Meezan.

## RPC validation

`create_account_transfer` and `reconcile_account_balance` derive workspace from accounts, reject cross-workspace operations, and write `workspace_id` on all related rows.

## Application layer

- `src/data/workspaces/queries.ts` — `getCurrentWorkspace()`, `requireCurrentWorkspace()`, `getAccessibleWorkspaces()`
- Server layout resolves the user's sole accessible workspace
- Optional route `/w/[workspaceSlug]/...` validates slug membership then redirects
- Workspace switcher shows only the current user's workspace

## Storage path (deferred attachments)

Future attachment paths: `{workspace_id}/{profile_id}/{entity_type}/{entity_id}/{uuid}-{filename}`

## Migrations

1. `20260725120000_phase5_workspaces_core.sql`
2. `20260725120100_phase5_workspace_id_backfill.sql`
3. `20260725120200_phase5_workspace_functions.sql`
4. `20260725120300_phase5_workspace_rls.sql`
5. `20260725120400_phase5_workspace_rpcs.sql`

## Tests

- `supabase/tests/phase5_workspace_isolation.test.sql`
- `src/lib/finance/__tests__/phase5.test.ts`

## Deferred (Phase 6+)

Goals, loans, budgets, savings insights, notes UI persistence, reports, attachments, Ops5ive persistence.

## Verification

```bash
npm run supabase:reset
npm run supabase:test
npm test
npm run typecheck
npm run build
```
