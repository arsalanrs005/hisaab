-- Phase 2: enums, helper functions, and Phase 1 alignment
-- Adds app enums, ownership/audit helpers, and upgrades approved_users/profiles.

-- ---------------------------------------------------------------------------
-- Enums (idempotent)
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.app_role as enum ('admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.account_type as enum ('current', 'savings', 'business', 'cash', 'other');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.category_type as enum ('income', 'expense', 'both');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.transaction_type as enum (
    'income',
    'expense',
    'transfer_in',
    'transfer_out',
    'refund',
    'family_contribution',
    'loan_repayment',
    'loan_payment',
    'balance_adjustment'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.transaction_status as enum ('expected', 'pending', 'completed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.financial_classification as enum ('personal', 'shared', 'business');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.goal_ownership_type as enum ('personal', 'shared', 'business');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.goal_status as enum ('active', 'completed', 'paused', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.goal_contribution_type as enum ('deposit', 'withdrawal', 'adjustment');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.loan_status as enum ('active', 'paid', 'paused', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.note_visibility as enum ('personal', 'shared');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.budget_scope as enum ('personal', 'shared', 'business');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.business_income_status as enum (
    'expected',
    'partially_received',
    'received',
    'overdue',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.notification_type as enum (
    'transfer',
    'reconciliation',
    'transaction',
    'budget',
    'goal',
    'income',
    'loan',
    'system'
  );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Align approved_users with Phase 2 shape
-- ---------------------------------------------------------------------------

alter table public.approved_users
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

drop trigger if exists approved_users_set_updated_at on public.approved_users;
create trigger approved_users_set_updated_at
  before update on public.approved_users
  for each row
  execute function public.set_updated_at();

alter table public.approved_users
  drop constraint if exists approved_users_system_role_check;

alter table public.approved_users
  alter column system_role drop default;

alter table public.approved_users
  alter column system_role type public.app_role
  using system_role::public.app_role;

alter table public.approved_users
  alter column system_role set default 'admin'::public.app_role;

-- One auth profile per approved allowlist row
create unique index if not exists profiles_approved_user_id_unique
  on public.profiles (approved_user_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.normalize_email(p_email text)
returns text
language sql
immutable
parallel safe
set search_path = public
as $$
  select lower(trim(coalesce(p_email, '')));
$$;

revoke all on function public.normalize_email(text) from public;
grant execute on function public.normalize_email(text) to authenticated;

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid();
$$;

revoke all on function public.current_profile_id() from public;
grant execute on function public.current_profile_id() to authenticated;

-- Both approved workspace members are shared admins for shared entities.
create or replace function public.is_shared_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_approved_active_user();
$$;

revoke all on function public.is_shared_admin() from public;
grant execute on function public.is_shared_admin() to authenticated;

-- Resolves at runtime once accounts exists (Phase 2 accounts migration).
create or replace function public.is_account_owner(p_account_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  return exists (
    select 1
    from public.accounts a
    where a.id = p_account_id
      and a.owner_profile_id = auth.uid()
  );
end;
$$;

revoke all on function public.is_account_owner(uuid) from public;
grant execute on function public.is_account_owner(uuid) to authenticated;

-- Trusted audit insert used by SECURITY DEFINER RPCs / triggers.
-- audit_logs table is created in a later Phase 2 migration; body resolves at runtime.
create or replace function public.insert_audit_log(
  p_action text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_account_id uuid default null,
  p_old_values jsonb default null,
  p_new_values jsonb default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_actor uuid := auth.uid();
begin
  insert into public.audit_logs (
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    account_id,
    old_values,
    new_values,
    metadata
  ) values (
    v_actor,
    p_action,
    p_entity_type,
    p_entity_id,
    p_account_id,
    p_old_values,
    p_new_values,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.insert_audit_log(text, text, uuid, uuid, jsonb, jsonb, jsonb) from public;
-- Intentionally not granted to authenticated; only SECURITY DEFINER RPCs/triggers call this.
