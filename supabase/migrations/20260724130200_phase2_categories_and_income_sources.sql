-- Phase 2: categories and income_sources
-- System category seed only (stable slugs). No income amounts or clients.

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  type public.category_type not null,
  icon text,
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz,
  constraint categories_slug_unique unique (slug)
);

create index if not exists categories_type_idx on public.categories (type);
create index if not exists categories_is_active_idx on public.categories (is_active);

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row
  execute function public.set_updated_at();

create table if not exists public.income_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_profile_id uuid references public.profiles (id),
  source_type text,
  expected_currency text not null default 'PKR'
    check (expected_currency = upper(expected_currency)),
  default_expected_amount numeric(18, 2)
    check (default_expected_amount is null or default_expected_amount >= 0),
  payment_frequency text,
  next_expected_date date,
  is_shared_income boolean not null default false,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz
);

create index if not exists income_sources_owner_profile_id_idx
  on public.income_sources (owner_profile_id);

create index if not exists income_sources_is_active_idx
  on public.income_sources (is_active);

drop trigger if exists income_sources_set_updated_at on public.income_sources;
create trigger income_sources_set_updated_at
  before update on public.income_sources
  for each row
  execute function public.set_updated_at();

insert into public.categories (name, slug, type, icon, is_system, is_active)
values
  ('Food', 'food', 'expense', 'utensils', true, true),
  ('Fuel', 'fuel', 'expense', 'fuel', true, true),
  ('Subscriptions', 'subscriptions', 'expense', 'repeat', true, true),
  ('University', 'university', 'expense', 'graduation-cap', true, true),
  ('Shopping', 'shopping', 'expense', 'shopping-bag', true, true),
  ('Family', 'family', 'expense', 'users', true, true),
  ('Business', 'business', 'expense', 'briefcase', true, true),
  ('Transport', 'transport', 'expense', 'car', true, true),
  ('Bills', 'bills', 'expense', 'receipt', true, true),
  ('Entertainment', 'entertainment', 'expense', 'film', true, true),
  ('Employee payment', 'employee-payment', 'expense', 'user-check', true, true),
  ('Loan payment', 'loan-payment', 'expense', 'landmark', true, true),
  ('Other', 'other', 'expense', 'more-horizontal', true, true),
  ('Client income', 'client-income', 'income', 'handshake', true, true),
  ('Refund', 'refund', 'income', 'rotate-ccw', true, true),
  ('Family contribution', 'family-contribution', 'income', 'heart-handshake', true, true),
  ('Loan repayment', 'loan-repayment', 'income', 'banknote', true, true),
  ('Other income', 'other-income', 'income', 'plus-circle', true, true)
on conflict (slug) do update
set
  name = excluded.name,
  type = excluded.type,
  icon = excluded.icon,
  is_system = true,
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());

grant select, insert, update on public.categories to authenticated;
grant select, insert, update on public.income_sources to authenticated;
