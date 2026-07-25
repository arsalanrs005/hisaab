-- Hisab seed data (idempotent, Phase 5 workspace-aware)
-- Categories, note folders, and app settings are workspace-scoped.
-- Shared workspace defaults are created by migration backfill + seed_workspace_defaults.

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
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());

-- Ensure shared workspace has system defaults (no-op if migration already backfilled)
insert into public.categories (workspace_id, name, slug, type, icon, is_system, is_active)
select
  '11111111-1111-4111-8111-111111111111'::uuid,
  v.name, v.slug, v.type::public.category_type, v.icon, true, true
from (values
  ('Food', 'food', 'expense', 'utensils'),
  ('Fuel', 'fuel', 'expense', 'fuel'),
  ('Subscriptions', 'subscriptions', 'expense', 'repeat'),
  ('University', 'university', 'expense', 'graduation-cap'),
  ('Shopping', 'shopping', 'expense', 'shopping-bag'),
  ('Family', 'family', 'expense', 'users'),
  ('Business', 'business', 'expense', 'briefcase'),
  ('Transport', 'transport', 'expense', 'car'),
  ('Bills', 'bills', 'expense', 'receipt'),
  ('Entertainment', 'entertainment', 'expense', 'film'),
  ('Employee payment', 'employee-payment', 'expense', 'user-check'),
  ('Loan payment', 'loan-payment', 'expense', 'landmark'),
  ('Other', 'other', 'expense', 'more-horizontal'),
  ('Client income', 'client-income', 'income', 'handshake'),
  ('Refund', 'refund', 'income', 'rotate-ccw'),
  ('Family contribution', 'family-contribution', 'income', 'heart-handshake'),
  ('Loan repayment', 'loan-repayment', 'income', 'banknote'),
  ('Other income', 'other-income', 'income', 'plus-circle')
) as v(name, slug, type, icon)
on conflict (workspace_id, slug) do update
set name = excluded.name, type = excluded.type, icon = excluded.icon, is_active = true;

insert into public.note_folders (workspace_id, name, slug, sort_order, is_system)
select
  '11111111-1111-4111-8111-111111111111'::uuid,
  v.name, v.slug, v.sort_order, true
from (values
  ('Shared quick notes', 'shared-quick-notes', 10),
  ('Financial plans', 'financial-plans', 20),
  ('Spending decisions', 'spending-decisions', 30),
  ('House plan', 'house-plan', 40),
  ('Car plan', 'car-plan', 50),
  ('Loan notes', 'loan-notes', 60),
  ('Ops5ive strategy', 'ops5ive-strategy', 70),
  ('Upwork plan', 'upwork-plan', 80),
  ('LinkedIn plan', 'linkedin-plan', 90),
  ('Client notes', 'client-notes', 100),
  ('Monthly reviews', 'monthly-reviews', 110)
) as v(name, slug, sort_order)
on conflict (workspace_id, slug) do update
set name = excluded.name, sort_order = excluded.sort_order, is_system = true;

insert into public.app_settings (workspace_id, key, value_json)
select '11111111-1111-4111-8111-111111111111'::uuid, v.key, v.value_json
from (values
  ('comfortable_savings_rate', '0.35'::jsonb),
  ('balanced_savings_rate', '0.50'::jsonb),
  ('aggressive_savings_rate', '0.65'::jsonb),
  ('budget_warning_threshold', '0.80'::jsonb),
  ('budget_exceeded_threshold', '1.00'::jsonb),
  ('default_currency', '"PKR"'::jsonb),
  ('allow_transfer_overdraft', 'false'::jsonb)
) as v(key, value_json)
on conflict (workspace_id, key) do update
set value_json = excluded.value_json, updated_at = timezone('utc', now());
