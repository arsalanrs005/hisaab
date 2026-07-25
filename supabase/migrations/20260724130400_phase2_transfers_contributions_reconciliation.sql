-- Phase 2: transfers, account_contributions, balance_adjustments
-- Then add deferred FKs from transactions to transfer_id and balance_adjustment_id.

create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  source_account_id uuid not null references public.accounts (id),
  destination_account_id uuid not null references public.accounts (id),
  amount_original numeric(18, 2) not null
    check (amount_original > 0),
  currency text not null
    check (currency = upper(currency)),
  exchange_rate numeric(18, 6) not null default 1
    check (exchange_rate > 0),
  amount_pkr numeric(18, 2) not null
    check (amount_pkr > 0),
  initiated_by uuid not null references public.profiles (id),
  transaction_date date not null,
  notes text,
  status public.transaction_status not null default 'completed',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz,
  constraint transfers_accounts_differ check (source_account_id <> destination_account_id)
);

create index if not exists transfers_source_account_id_idx
  on public.transfers (source_account_id);

create index if not exists transfers_destination_account_id_idx
  on public.transfers (destination_account_id);

create index if not exists transfers_initiated_by_idx
  on public.transfers (initiated_by);

create index if not exists transfers_transaction_date_idx
  on public.transfers (transaction_date);

drop trigger if exists transfers_set_updated_at on public.transfers;
create trigger transfers_set_updated_at
  before update on public.transfers
  for each row
  execute function public.set_updated_at();

create table if not exists public.account_contributions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id),
  contributor_profile_id uuid not null references public.profiles (id),
  transfer_id uuid references public.transfers (id),
  transaction_id uuid references public.transactions (id),
  amount_pkr numeric(18, 2) not null
    check (amount_pkr > 0),
  contribution_type text not null
    check (contribution_type in ('deposit', 'opening_allocation', 'manual_adjustment')),
  contribution_date date not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists account_contributions_account_id_idx
  on public.account_contributions (account_id);

create index if not exists account_contributions_contributor_profile_id_idx
  on public.account_contributions (contributor_profile_id);

create index if not exists account_contributions_transfer_id_idx
  on public.account_contributions (transfer_id);

create table if not exists public.balance_adjustments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id),
  calculated_balance_before numeric(18, 2) not null,
  actual_balance numeric(18, 2) not null,
  adjustment_amount numeric(18, 2) not null,
  reason text not null,
  reconciled_by uuid not null references public.profiles (id),
  reconciled_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists balance_adjustments_account_id_idx
  on public.balance_adjustments (account_id);

create index if not exists balance_adjustments_reconciled_by_idx
  on public.balance_adjustments (reconciled_by);

-- Deferred FKs now that parent tables exist
do $$ begin
  alter table public.transactions
    add constraint transactions_transfer_id_fkey
    foreign key (transfer_id) references public.transfers (id);
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter table public.transactions
    add constraint transactions_balance_adjustment_id_fkey
    foreign key (balance_adjustment_id) references public.balance_adjustments (id);
exception
  when duplicate_object then null;
end $$;

grant select on public.transfers to authenticated;
grant select on public.account_contributions to authenticated;
grant select on public.balance_adjustments to authenticated;
