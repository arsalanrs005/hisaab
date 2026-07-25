-- Phase 7: sales pipeline, Upwork opportunities, LinkedIn prospects

create table if not exists public.sales_opportunities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id),
  client_id uuid references public.business_clients (id),
  title text not null,
  stage text not null default 'discovery',
  expected_amount numeric(18, 2) not null default 0,
  probability smallint check (probability is null or probability between 0 and 100),
  expected_close_date date,
  owner_profile_id uuid references public.profiles (id),
  notes text,
  created_by uuid not null references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz
);

create index if not exists sales_opportunities_workspace_idx
  on public.sales_opportunities (workspace_id, stage);

drop trigger if exists sales_opportunities_set_updated_at on public.sales_opportunities;
create trigger sales_opportunities_set_updated_at
  before update on public.sales_opportunities
  for each row execute function public.set_updated_at();

create table if not exists public.upwork_opportunities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id),
  title text not null,
  client_name text not null,
  status text not null default 'sent'
    check (status in ('sent', 'responded', 'interview', 'offer', 'won', 'lost')),
  connects_spent integer not null default 0 check (connects_spent >= 0),
  bid_amount numeric(18, 2) not null default 0,
  activity_date date not null default current_date,
  follow_up_date date,
  revenue numeric(18, 2),
  notes text,
  created_by uuid not null references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz
);

create index if not exists upwork_opportunities_workspace_idx
  on public.upwork_opportunities (workspace_id, activity_date desc);

drop trigger if exists upwork_opportunities_set_updated_at on public.upwork_opportunities;
create trigger upwork_opportunities_set_updated_at
  before update on public.upwork_opportunities
  for each row execute function public.set_updated_at();

create table if not exists public.linkedin_prospects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id),
  prospect_name text not null,
  company text not null,
  title text not null,
  status text not null default 'researched'
    check (status in (
      'researched', 'identified', 'requested', 'accepted',
      'conversation', 'call', 'proposal', 'won', 'lost'
    )),
  activity_date date not null default current_date,
  follow_up_date date,
  revenue numeric(18, 2),
  notes text,
  created_by uuid not null references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz
);

create index if not exists linkedin_prospects_workspace_idx
  on public.linkedin_prospects (workspace_id, activity_date desc);

drop trigger if exists linkedin_prospects_set_updated_at on public.linkedin_prospects;
create trigger linkedin_prospects_set_updated_at
  before update on public.linkedin_prospects
  for each row execute function public.set_updated_at();

alter table public.sales_opportunities enable row level security;
alter table public.upwork_opportunities enable row level security;
alter table public.linkedin_prospects enable row level security;

create policy "sales_opportunities_select"
  on public.sales_opportunities for select to authenticated
  using (public.is_active_workspace_member(workspace_id));

create policy "sales_opportunities_write"
  on public.sales_opportunities for all to authenticated
  using (public.is_active_workspace_member(workspace_id))
  with check (public.is_active_workspace_member(workspace_id));

create policy "upwork_opportunities_select"
  on public.upwork_opportunities for select to authenticated
  using (public.is_active_workspace_member(workspace_id));

create policy "upwork_opportunities_write"
  on public.upwork_opportunities for all to authenticated
  using (public.is_active_workspace_member(workspace_id))
  with check (public.is_active_workspace_member(workspace_id));

create policy "linkedin_prospects_select"
  on public.linkedin_prospects for select to authenticated
  using (public.is_active_workspace_member(workspace_id));

create policy "linkedin_prospects_write"
  on public.linkedin_prospects for all to authenticated
  using (public.is_active_workspace_member(workspace_id))
  with check (public.is_active_workspace_member(workspace_id));

grant select, insert, update on public.sales_opportunities to authenticated;
grant select, insert, update on public.upwork_opportunities to authenticated;
grant select, insert, update on public.linkedin_prospects to authenticated;

create table if not exists public.exchange_rate_cache (
  id uuid primary key default gen_random_uuid(),
  from_currency text not null,
  to_currency text not null,
  rate numeric(18, 6) not null,
  source text not null,
  fetched_at timestamptz not null default timezone('utc', now()),
  constraint exchange_rate_cache_pair_unique unique (from_currency, to_currency)
);

alter table public.exchange_rate_cache enable row level security;
create policy "exchange_rate_cache_select"
  on public.exchange_rate_cache for select to authenticated
  using (public.is_approved_active_user());

grant select on public.exchange_rate_cache to authenticated;
