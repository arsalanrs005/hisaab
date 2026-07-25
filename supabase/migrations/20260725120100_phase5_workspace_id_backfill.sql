-- Phase 5: workspace_id columns, backfill, constraints, indexes

-- Shared workspace ID used for existing Arsalan & Ali data
-- 11111111-1111-4111-8111-111111111111

-- ---------------------------------------------------------------------------
-- Add nullable workspace_id columns
-- ---------------------------------------------------------------------------

alter table public.accounts add column if not exists workspace_id uuid;
alter table public.account_permissions add column if not exists workspace_id uuid;
alter table public.categories add column if not exists workspace_id uuid;
alter table public.income_sources add column if not exists workspace_id uuid;
alter table public.transactions add column if not exists workspace_id uuid;
alter table public.transfers add column if not exists workspace_id uuid;
alter table public.account_contributions add column if not exists workspace_id uuid;
alter table public.balance_adjustments add column if not exists workspace_id uuid;
alter table public.financial_goals add column if not exists workspace_id uuid;
alter table public.goal_contributions add column if not exists workspace_id uuid;
alter table public.loans add column if not exists workspace_id uuid;
alter table public.loan_payments add column if not exists workspace_id uuid;
alter table public.budgets add column if not exists workspace_id uuid;
alter table public.note_folders add column if not exists workspace_id uuid;
alter table public.notes add column if not exists workspace_id uuid;
alter table public.attachments add column if not exists workspace_id uuid;
alter table public.business_clients add column if not exists workspace_id uuid;
alter table public.business_income add column if not exists workspace_id uuid;
alter table public.business_expenses add column if not exists workspace_id uuid;
alter table public.business_targets add column if not exists workspace_id uuid;
alter table public.upwork_activities add column if not exists workspace_id uuid;
alter table public.linkedin_activities add column if not exists workspace_id uuid;
alter table public.notifications add column if not exists workspace_id uuid;
alter table public.audit_logs add column if not exists workspace_id uuid;
alter table public.app_settings add column if not exists workspace_id uuid;

-- ---------------------------------------------------------------------------
-- Backfill to shared workspace
-- ---------------------------------------------------------------------------

do $$
declare
  v_shared uuid := '11111111-1111-4111-8111-111111111111'::uuid;
begin
  update public.accounts set workspace_id = v_shared where workspace_id is null;
  update public.categories set workspace_id = v_shared where workspace_id is null;
  update public.income_sources set workspace_id = v_shared where workspace_id is null;
  update public.financial_goals set workspace_id = v_shared where workspace_id is null;
  update public.loans set workspace_id = v_shared where workspace_id is null;
  update public.budgets set workspace_id = v_shared where workspace_id is null;
  update public.note_folders set workspace_id = v_shared where workspace_id is null;
  update public.notes set workspace_id = v_shared where workspace_id is null;
  update public.attachments set workspace_id = v_shared where workspace_id is null;
  update public.business_clients set workspace_id = v_shared where workspace_id is null;
  update public.business_income set workspace_id = v_shared where workspace_id is null;
  update public.business_expenses set workspace_id = v_shared where workspace_id is null;
  update public.business_targets set workspace_id = v_shared where workspace_id is null;
  update public.upwork_activities set workspace_id = v_shared where workspace_id is null;
  update public.linkedin_activities set workspace_id = v_shared where workspace_id is null;
  update public.app_settings set workspace_id = v_shared where workspace_id is null;

  update public.account_permissions ap
  set workspace_id = a.workspace_id
  from public.accounts a
  where ap.account_id = a.id and ap.workspace_id is null;

  update public.transactions t
  set workspace_id = a.workspace_id
  from public.accounts a
  where t.account_id = a.id and t.workspace_id is null;

  update public.transfers tr
  set workspace_id = a.workspace_id
  from public.accounts a
  where tr.source_account_id = a.id and tr.workspace_id is null;

  update public.account_contributions c
  set workspace_id = a.workspace_id
  from public.accounts a
  where c.account_id = a.id and c.workspace_id is null;

  update public.balance_adjustments ba
  set workspace_id = a.workspace_id
  from public.accounts a
  where ba.account_id = a.id and ba.workspace_id is null;

  update public.goal_contributions gc
  set workspace_id = g.workspace_id
  from public.financial_goals g
  where gc.goal_id = g.id and gc.workspace_id is null;

  update public.loan_payments lp
  set workspace_id = l.workspace_id
  from public.loans l
  where lp.loan_id = l.id and lp.workspace_id is null;

  update public.audit_logs al
  set workspace_id = coalesce(
    (select a.workspace_id from public.accounts a where a.id = al.account_id),
    (
      select wm.workspace_id
      from public.workspace_memberships wm
      where wm.profile_id = al.actor_profile_id
        and wm.is_active = true
      order by wm.joined_at
      limit 1
    ),
    v_shared
  )
  where al.workspace_id is null;

  update public.notifications n
  set workspace_id = coalesce(
    (
      select wm.workspace_id
      from public.workspace_memberships wm
      where wm.profile_id = n.profile_id
        and wm.is_active = true
      order by wm.joined_at
      limit 1
    ),
    v_shared
  )
  where n.workspace_id is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Categories / note_folders / app_settings: workspace-scoped uniqueness
-- ---------------------------------------------------------------------------

alter table public.categories drop constraint if exists categories_slug_unique;
create unique index if not exists categories_workspace_slug_unique
  on public.categories (workspace_id, slug);

alter table public.note_folders drop constraint if exists note_folders_slug_key;
alter table public.note_folders drop constraint if exists note_folders_slug_unique;
create unique index if not exists note_folders_workspace_slug_unique
  on public.note_folders (workspace_id, slug);

alter table public.app_settings drop constraint if exists app_settings_key_unique;
create unique index if not exists app_settings_workspace_key_unique
  on public.app_settings (workspace_id, key);

-- ---------------------------------------------------------------------------
-- NOT NULL + FKs + indexes
-- ---------------------------------------------------------------------------

alter table public.accounts alter column workspace_id set not null;
alter table public.account_permissions alter column workspace_id set not null;
alter table public.categories alter column workspace_id set not null;
alter table public.income_sources alter column workspace_id set not null;
alter table public.transactions alter column workspace_id set not null;
alter table public.transfers alter column workspace_id set not null;
alter table public.account_contributions alter column workspace_id set not null;
alter table public.balance_adjustments alter column workspace_id set not null;
alter table public.financial_goals alter column workspace_id set not null;
alter table public.goal_contributions alter column workspace_id set not null;
alter table public.loans alter column workspace_id set not null;
alter table public.loan_payments alter column workspace_id set not null;
alter table public.budgets alter column workspace_id set not null;
alter table public.note_folders alter column workspace_id set not null;
alter table public.notes alter column workspace_id set not null;
alter table public.attachments alter column workspace_id set not null;
alter table public.business_clients alter column workspace_id set not null;
alter table public.business_income alter column workspace_id set not null;
alter table public.business_expenses alter column workspace_id set not null;
alter table public.business_targets alter column workspace_id set not null;
alter table public.upwork_activities alter column workspace_id set not null;
alter table public.linkedin_activities alter column workspace_id set not null;
alter table public.notifications alter column workspace_id set not null;
alter table public.audit_logs alter column workspace_id set not null;
alter table public.app_settings alter column workspace_id set not null;

alter table public.accounts
  drop constraint if exists accounts_workspace_id_fkey;
alter table public.accounts
  add constraint accounts_workspace_id_fkey
  foreign key (workspace_id) references public.workspaces (id);

create index if not exists accounts_workspace_id_idx on public.accounts (workspace_id);
create index if not exists transactions_workspace_id_idx on public.transactions (workspace_id);
create index if not exists transfers_workspace_id_idx on public.transfers (workspace_id);
create index if not exists audit_logs_workspace_id_idx on public.audit_logs (workspace_id, created_at desc);
create index if not exists notifications_workspace_id_idx on public.notifications (workspace_id, profile_id);
create index if not exists categories_workspace_id_idx on public.categories (workspace_id);
create index if not exists income_sources_workspace_id_idx on public.income_sources (workspace_id);

-- Backfill memberships for existing profiles in shared workspace
insert into public.workspace_memberships (workspace_id, profile_id, role, is_active)
select
  '11111111-1111-4111-8111-111111111111'::uuid,
  p.id,
  'admin'::public.workspace_role,
  true
from public.profiles p
join public.approved_users au on au.id = p.approved_user_id
where au.initial_workspace_slug = 'arsalan-ali'
   or au.email in ('arsalanrs005@gmail.com', 'alirashidd.232@gmail.com')
on conflict (workspace_id, profile_id) do update
set role = 'admin'::public.workspace_role, is_active = true, updated_at = timezone('utc', now());
