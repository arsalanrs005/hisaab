-- Phase 1: approved allowlist + profiles
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.approved_users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  display_name text not null,
  system_role text not null default 'admin' check (system_role in ('admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  constraint approved_users_email_unique unique (email)
);

create unique index if not exists approved_users_email_lower_idx
  on public.approved_users (lower(email));

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  approved_user_id uuid not null references public.approved_users (id),
  email text not null,
  display_name text not null,
  avatar_url text,
  default_dashboard_mode text not null default 'combined'
    check (default_dashboard_mode in ('combined', 'personal')),
  preferred_theme text not null default 'system'
    check (preferred_theme in ('light', 'dark', 'system')),
  balances_hidden_by_default boolean not null default false,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_email_unique unique (email)
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

insert into public.approved_users (email, display_name, system_role, is_active)
values
  ('arsalanrs005@gmail.com', 'Arsalan', 'admin', true),
  ('alirashidd.232@gmail.com', 'Ali', 'admin', true)
on conflict (email) do update
set
  display_name = excluded.display_name,
  system_role = excluded.system_role,
  is_active = excluded.is_active;

create or replace function public.is_approved_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.approved_users au
    where lower(au.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and au.is_active = true
  );
$$;

revoke all on function public.is_approved_active_user() from public;
grant execute on function public.is_approved_active_user() to authenticated;

create or replace function public.ensure_profile_for_auth_user()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  user_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  approved record;
  existing_id uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if user_email = '' then
    raise exception 'Authenticated user has no email';
  end if;

  select * into approved
  from public.approved_users
  where lower(email) = user_email
    and is_active = true
  limit 1;

  if approved is null then
    raise exception 'Email is not approved for this private workspace';
  end if;

  select id into existing_id from public.profiles where id = uid;

  if existing_id is null then
    insert into public.profiles (
      id,
      approved_user_id,
      email,
      display_name
    ) values (
      uid,
      approved.id,
      approved.email,
      approved.display_name
    );
  else
    update public.profiles
    set
      approved_user_id = approved.id,
      email = approved.email,
      display_name = coalesce(nullif(display_name, ''), approved.display_name),
      updated_at = timezone('utc', now())
    where id = uid;
  end if;

  return uid;
end;
$$;

revoke all on function public.ensure_profile_for_auth_user() from public;
grant execute on function public.ensure_profile_for_auth_user() to authenticated;

alter table public.approved_users enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "approved_users_select_authenticated" on public.approved_users;
create policy "approved_users_select_authenticated"
  on public.approved_users
  for select
  to authenticated
  using (public.is_approved_active_user());

drop policy if exists "profiles_select_approved" on public.profiles;
create policy "profiles_select_approved"
  on public.profiles
  for select
  to authenticated
  using (public.is_approved_active_user());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (
    id = auth.uid()
    and public.is_approved_active_user()
  );

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid() and public.is_approved_active_user())
  with check (id = auth.uid() and public.is_approved_active_user());

-- No delete policies: profiles and allowlist are not client-deletable.
