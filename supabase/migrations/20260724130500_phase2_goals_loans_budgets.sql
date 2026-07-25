-- Phase 2: financial_goals, goal_contributions, loans, loan_payments, budgets
-- Then add transactions.goal_id FK.

create table if not exists public.financial_goals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  goal_type text not null,
  ownership_type public.goal_ownership_type not null,
  owner_profile_id uuid references public.profiles (id),
  target_amount numeric(18, 2) not null
    check (target_amount > 0),
  starting_amount numeric(18, 2) not null default 0
    check (starting_amount >= 0),
  target_date date,
  priority smallint not null default 3
    check (priority between 1 and 5),
  funding_account_id uuid references public.accounts (id),
  monthly_target numeric(18, 2)
    check (monthly_target is null or monthly_target >= 0),
  status public.goal_status not null default 'active',
  description text,
  created_by uuid not null references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz,
  constraint financial_goals_personal_owner_check check (
    ownership_type <> 'personal' or owner_profile_id is not null
  )
);

create index if not exists financial_goals_owner_profile_id_idx
  on public.financial_goals (owner_profile_id);

create index if not exists financial_goals_ownership_type_idx
  on public.financial_goals (ownership_type);

create index if not exists financial_goals_status_idx
  on public.financial_goals (status);

drop trigger if exists financial_goals_set_updated_at on public.financial_goals;
create trigger financial_goals_set_updated_at
  before update on public.financial_goals
  for each row
  execute function public.set_updated_at();

create table if not exists public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.financial_goals (id),
  contributor_profile_id uuid not null references public.profiles (id),
  account_id uuid references public.accounts (id),
  transaction_id uuid references public.transactions (id),
  amount numeric(18, 2) not null
    check (amount > 0),
  contribution_date date not null,
  contribution_type public.goal_contribution_type not null,
  notes text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists goal_contributions_goal_id_idx
  on public.goal_contributions (goal_id);

create index if not exists goal_contributions_contributor_profile_id_idx
  on public.goal_contributions (contributor_profile_id);

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_profile_id uuid not null references public.profiles (id),
  original_amount numeric(18, 2) not null
    check (original_amount > 0),
  starting_remaining_balance numeric(18, 2) not null
    check (starting_remaining_balance >= 0),
  interest_rate numeric(10, 4)
    check (interest_rate is null or interest_rate >= 0),
  markup_type text,
  monthly_installment numeric(18, 2)
    check (monthly_installment is null or monthly_installment >= 0),
  installment_due_day smallint
    check (installment_due_day is null or installment_due_day between 1 and 31),
  funding_account_id uuid references public.accounts (id),
  start_date date,
  expected_end_date date,
  status public.loan_status not null default 'active',
  notes text,
  created_by uuid not null references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz,
  constraint loans_remaining_lte_original check (
    starting_remaining_balance <= original_amount
  )
);

create index if not exists loans_owner_profile_id_idx
  on public.loans (owner_profile_id);

create index if not exists loans_status_idx
  on public.loans (status);

drop trigger if exists loans_set_updated_at on public.loans;
create trigger loans_set_updated_at
  before update on public.loans
  for each row
  execute function public.set_updated_at();

create table if not exists public.loan_payments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans (id),
  transaction_id uuid references public.transactions (id),
  amount numeric(18, 2) not null
    check (amount > 0),
  principal_amount numeric(18, 2)
    check (principal_amount is null or principal_amount >= 0),
  markup_amount numeric(18, 2)
    check (markup_amount is null or markup_amount >= 0),
  payment_date date not null,
  remaining_balance_after numeric(18, 2)
    check (remaining_balance_after is null or remaining_balance_after >= 0),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  constraint loan_payments_parts_lte_total check (
    coalesce(principal_amount, 0) + coalesce(markup_amount, 0) <= amount
  )
);

create index if not exists loan_payments_loan_id_idx
  on public.loan_payments (loan_id);

create index if not exists loan_payments_payment_date_idx
  on public.loan_payments (payment_date);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  month smallint not null
    check (month between 1 and 12),
  year smallint not null
    check (year between 2000 and 2100),
  category_id uuid not null references public.categories (id),
  scope public.budget_scope not null,
  owner_profile_id uuid references public.profiles (id),
  budgeted_amount numeric(18, 2) not null
    check (budgeted_amount >= 0),
  created_by uuid not null references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint budgets_personal_owner_check check (
    scope <> 'personal' or owner_profile_id is not null
  )
);

create unique index if not exists budgets_year_month_category_scope_owner_uidx
  on public.budgets (
    year,
    month,
    category_id,
    scope,
    (coalesce(owner_profile_id, '00000000-0000-0000-0000-000000000000'::uuid))
  );

create index if not exists budgets_category_id_idx
  on public.budgets (category_id);

create index if not exists budgets_owner_profile_id_idx
  on public.budgets (owner_profile_id);

drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at
  before update on public.budgets
  for each row
  execute function public.set_updated_at();

do $$ begin
  alter table public.transactions
    add constraint transactions_goal_id_fkey
    foreign key (goal_id) references public.financial_goals (id);
exception
  when duplicate_object then null;
end $$;

grant select, insert, update on public.financial_goals to authenticated;
grant select, insert, update on public.goal_contributions to authenticated;
grant select, insert, update on public.loans to authenticated;
grant select, insert, update on public.loan_payments to authenticated;
grant select, insert, update on public.budgets to authenticated;
