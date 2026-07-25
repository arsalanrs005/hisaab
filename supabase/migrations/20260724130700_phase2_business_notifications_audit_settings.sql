-- Phase 2: business, notifications, audit_logs, app_settings
-- Seeds configurable savings/budget settings only (no fake revenue).

create table if not exists public.business_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active',
  primary_currency text not null default 'PKR'
    check (primary_currency = upper(primary_currency)),
  expected_monthly_value numeric(18, 2)
    check (expected_monthly_value is null or expected_monthly_value >= 0),
  notes text,
  created_by uuid not null references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz
);

drop trigger if exists business_clients_set_updated_at on public.business_clients;
create trigger business_clients_set_updated_at
  before update on public.business_clients
  for each row
  execute function public.set_updated_at();

create table if not exists public.business_income (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.business_clients (id),
  transaction_id uuid references public.transactions (id),
  expected_amount numeric(18, 2)
    check (expected_amount is null or expected_amount >= 0),
  received_amount numeric(18, 2)
    check (received_amount is null or received_amount >= 0),
  currency text not null default 'PKR'
    check (currency = upper(currency)),
  exchange_rate numeric(18, 6)
    check (exchange_rate is null or exchange_rate > 0),
  amount_pkr numeric(18, 2)
    check (amount_pkr is null or amount_pkr >= 0),
  expected_date date,
  received_date date,
  status public.business_income_status not null default 'expected',
  notes text,
  created_by uuid not null references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz
);

create index if not exists business_income_client_id_idx
  on public.business_income (client_id);

create index if not exists business_income_status_idx
  on public.business_income (status);

drop trigger if exists business_income_set_updated_at on public.business_income;
create trigger business_income_set_updated_at
  before update on public.business_income
  for each row
  execute function public.set_updated_at();

create table if not exists public.business_expenses (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references public.transactions (id),
  category_id uuid references public.categories (id),
  name text not null,
  amount_pkr numeric(18, 2) not null
    check (amount_pkr > 0),
  expense_date date not null,
  recurring boolean not null default false,
  notes text,
  created_by uuid not null references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz
);

create index if not exists business_expenses_expense_date_idx
  on public.business_expenses (expense_date);

drop trigger if exists business_expenses_set_updated_at on public.business_expenses;
create trigger business_expenses_set_updated_at
  before update on public.business_expenses
  for each row
  execute function public.set_updated_at();

create table if not exists public.business_targets (
  id uuid primary key default gen_random_uuid(),
  metric text not null,
  target_value numeric(18, 2) not null,
  period_start date not null,
  period_end date not null,
  assumptions jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint business_targets_period_check check (period_end >= period_start)
);

drop trigger if exists business_targets_set_updated_at on public.business_targets;
create trigger business_targets_set_updated_at
  before update on public.business_targets
  for each row
  execute function public.set_updated_at();

create table if not exists public.upwork_activities (
  id uuid primary key default gen_random_uuid(),
  activity_date date not null,
  proposals_sent integer not null default 0 check (proposals_sent >= 0),
  responses integer not null default 0 check (responses >= 0),
  interviews integer not null default 0 check (interviews >= 0),
  offers integer not null default 0 check (offers >= 0),
  projects_won integer not null default 0 check (projects_won >= 0),
  connects_spent integer not null default 0 check (connects_spent >= 0),
  revenue_generated numeric(18, 2) not null default 0 check (revenue_generated >= 0),
  notes text,
  created_by uuid not null references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists upwork_activities_activity_date_idx
  on public.upwork_activities (activity_date);

drop trigger if exists upwork_activities_set_updated_at on public.upwork_activities;
create trigger upwork_activities_set_updated_at
  before update on public.upwork_activities
  for each row
  execute function public.set_updated_at();

create table if not exists public.linkedin_activities (
  id uuid primary key default gen_random_uuid(),
  activity_date date not null,
  accounts_researched integer not null default 0 check (accounts_researched >= 0),
  decision_makers_identified integer not null default 0 check (decision_makers_identified >= 0),
  connection_requests integer not null default 0 check (connection_requests >= 0),
  accepted_connections integer not null default 0 check (accepted_connections >= 0),
  conversations_started integer not null default 0 check (conversations_started >= 0),
  discovery_calls integer not null default 0 check (discovery_calls >= 0),
  proposals_sent integer not null default 0 check (proposals_sent >= 0),
  clients_won integer not null default 0 check (clients_won >= 0),
  revenue_generated numeric(18, 2) not null default 0 check (revenue_generated >= 0),
  content_published integer not null default 0 check (content_published >= 0),
  notes text,
  created_by uuid not null references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists linkedin_activities_activity_date_idx
  on public.linkedin_activities (activity_date);

drop trigger if exists linkedin_activities_set_updated_at on public.linkedin_activities;
create trigger linkedin_activities_set_updated_at
  before update on public.linkedin_activities
  for each row
  execute function public.set_updated_at();

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id),
  type public.notification_type not null,
  title text not null,
  message text not null,
  related_entity_type text,
  related_entity_id uuid,
  deduplication_key text,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists notifications_profile_id_idx
  on public.notifications (profile_id);

create index if not exists notifications_created_at_idx
  on public.notifications (created_at desc);

create unique index if not exists notifications_profile_dedup_uidx
  on public.notifications (profile_id, deduplication_key)
  where deduplication_key is not null;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  account_id uuid references public.accounts (id),
  old_values jsonb,
  new_values jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists audit_logs_actor_profile_id_idx
  on public.audit_logs (actor_profile_id);

create index if not exists audit_logs_entity_type_idx
  on public.audit_logs (entity_type);

create index if not exists audit_logs_entity_id_idx
  on public.audit_logs (entity_id);

create index if not exists audit_logs_account_id_idx
  on public.audit_logs (account_id);

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  value_json jsonb not null,
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint app_settings_key_unique unique (key)
);

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row
  execute function public.set_updated_at();

insert into public.app_settings (key, value_json)
values
  ('comfortable_savings_rate', '0.35'::jsonb),
  ('balanced_savings_rate', '0.50'::jsonb),
  ('aggressive_savings_rate', '0.65'::jsonb),
  ('budget_warning_threshold', '0.80'::jsonb),
  ('budget_exceeded_threshold', '1.00'::jsonb),
  ('default_currency', '"PKR"'::jsonb),
  ('allow_transfer_overdraft', 'false'::jsonb)
on conflict (key) do update
set
  value_json = excluded.value_json,
  updated_at = timezone('utc', now());

grant select, insert, update on public.business_clients to authenticated;
grant select, insert, update on public.business_income to authenticated;
grant select, insert, update on public.business_expenses to authenticated;
grant select, insert, update on public.business_targets to authenticated;
grant select, insert, update on public.upwork_activities to authenticated;
grant select, insert, update on public.linkedin_activities to authenticated;
grant select, update on public.notifications to authenticated;
grant select on public.audit_logs to authenticated;
grant select, insert, update on public.app_settings to authenticated;
