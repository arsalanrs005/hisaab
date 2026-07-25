-- Phase 2: accounts and account_permissions
-- Owner-scoped accounts with shared view permissions for both approved profiles.

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bank_name text not null,
  owner_profile_id uuid not null references public.profiles (id),
  account_type public.account_type not null,
  primary_currency text not null default 'PKR'
    check (primary_currency = upper(primary_currency)),
  opening_balance numeric(18, 2) not null default 0
    check (opening_balance >= 0),
  is_shared_savings_account boolean not null default false,
  is_active boolean not null default true,
  last_reconciled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists accounts_owner_profile_id_idx
  on public.accounts (owner_profile_id);

create index if not exists accounts_is_active_idx
  on public.accounts (is_active);

create index if not exists accounts_is_shared_savings_account_idx
  on public.accounts (is_shared_savings_account);

drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at
  before update on public.accounts
  for each row
  execute function public.set_updated_at();

create table if not exists public.account_permissions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  can_view boolean not null default true,
  can_create_transactions boolean not null default false,
  can_edit_transactions boolean not null default false,
  can_archive_transactions boolean not null default false,
  can_reconcile boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  constraint account_permissions_account_profile_unique unique (account_id, profile_id)
);

create index if not exists account_permissions_profile_id_idx
  on public.account_permissions (profile_id);

create index if not exists account_permissions_account_id_idx
  on public.account_permissions (account_id);

-- Grants view to all profiles; write/reconcile only to the account owner.
-- Safe to re-run after the second profile is created.
create or replace function public.sync_account_permissions(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select owner_profile_id into v_owner
  from public.accounts
  where id = p_account_id;

  if v_owner is null then
    raise exception 'Account % not found', p_account_id;
  end if;

  insert into public.account_permissions (
    account_id,
    profile_id,
    can_view,
    can_create_transactions,
    can_edit_transactions,
    can_archive_transactions,
    can_reconcile
  )
  select
    p_account_id,
    p.id,
    true,
    (p.id = v_owner),
    (p.id = v_owner),
    (p.id = v_owner),
    (p.id = v_owner)
  from public.profiles p
  on conflict (account_id, profile_id) do update
  set
    can_view = true,
    can_create_transactions = (public.account_permissions.profile_id = v_owner),
    can_edit_transactions = (public.account_permissions.profile_id = v_owner),
    can_archive_transactions = (public.account_permissions.profile_id = v_owner),
    can_reconcile = (public.account_permissions.profile_id = v_owner);
end;
$$;

revoke all on function public.sync_account_permissions(uuid) from public;
-- Called by SECURITY DEFINER triggers after account/profile insert; not a client RPC.

create or replace function public.tg_accounts_sync_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_account_permissions(new.id);
  return new;
end;
$$;

drop trigger if exists accounts_sync_permissions_ai on public.accounts;
create trigger accounts_sync_permissions_ai
  after insert on public.accounts
  for each row
  execute function public.tg_accounts_sync_permissions();

-- When a second approved profile appears, re-sync every account's permission rows.
create or replace function public.tg_profiles_resync_account_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in select id from public.accounts loop
    perform public.sync_account_permissions(r.id);
  end loop;
  return new;
end;
$$;

drop trigger if exists profiles_resync_account_permissions_ai on public.profiles;
create trigger profiles_resync_account_permissions_ai
  after insert on public.profiles
  for each row
  execute function public.tg_profiles_resync_account_permissions();

grant select, insert, update on public.accounts to authenticated;
grant select on public.account_permissions to authenticated;
