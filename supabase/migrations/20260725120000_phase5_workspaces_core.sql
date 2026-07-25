-- Phase 5: workspaces, memberships, approved-user mapping

-- Stable workspace IDs for backfill and seeds
-- Arsalan & Ali shared: 11111111-1111-4111-8111-111111111111
-- Anum Personal:        22222222-2222-4222-8222-222222222222
-- Sarah Personal:       33333333-3333-4333-8333-333333333333

do $$ begin
  create type public.workspace_type as enum ('shared', 'personal');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.workspace_role as enum ('admin', 'member');
exception when duplicate_object then null;
end $$;

create table if not exists public.workspaces (
  id uuid primary key,
  name text not null,
  slug text not null,
  workspace_type public.workspace_type not null,
  default_currency text not null default 'PKR'
    check (default_currency = upper(default_currency)),
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz,
  constraint workspaces_slug_unique unique (slug)
);

drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row
  execute function public.set_updated_at();

create table if not exists public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role public.workspace_role not null default 'member',
  is_active boolean not null default true,
  joined_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint workspace_memberships_workspace_profile_unique unique (workspace_id, profile_id)
);

create index if not exists workspace_memberships_profile_id_idx
  on public.workspace_memberships (profile_id);

create index if not exists workspace_memberships_workspace_id_idx
  on public.workspace_memberships (workspace_id);

drop trigger if exists workspace_memberships_set_updated_at on public.workspace_memberships;
create trigger workspace_memberships_set_updated_at
  before update on public.workspace_memberships
  for each row
  execute function public.set_updated_at();

alter table public.approved_users
  add column if not exists initial_workspace_slug text;

insert into public.workspaces (id, name, slug, workspace_type, default_currency, is_active)
values
  (
    '11111111-1111-4111-8111-111111111111'::uuid,
    'Arsalan & Ali',
    'arsalan-ali',
    'shared',
    'PKR',
    true
  ),
  (
    '22222222-2222-4222-8222-222222222222'::uuid,
    'Anum Personal',
    'anum-personal',
    'personal',
    'PKR',
    true
  ),
  (
    '33333333-3333-4333-8333-333333333333'::uuid,
    'Sarah Personal',
    'sarah-personal',
    'personal',
    'PKR',
    true
  )
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  workspace_type = excluded.workspace_type,
  default_currency = excluded.default_currency,
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());

insert into public.approved_users (email, display_name, system_role, is_active, initial_workspace_slug)
values
  ('arsalanrs005@gmail.com', 'Arsalan', 'admin', true, 'arsalan-ali'),
  ('alirashidd.232@gmail.com', 'Ali', 'admin', true, 'arsalan-ali'),
  ('anum112004@gmail.com', 'Anum Shahid', 'admin', true, 'anum-personal'),
  ('sarahbatool23@gmail.com', 'Sarah Batool', 'admin', true, 'sarah-personal')
on conflict (email) do update
set
  display_name = excluded.display_name,
  system_role = excluded.system_role,
  is_active = excluded.is_active,
  initial_workspace_slug = excluded.initial_workspace_slug,
  updated_at = timezone('utc', now());

alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
