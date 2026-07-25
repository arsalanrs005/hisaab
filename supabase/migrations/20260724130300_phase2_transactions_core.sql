-- Phase 2: transactions core
-- Creates transactions without FKs to transfers/balance_adjustments/goals yet.
-- direction: +1 increases balance, -1 decreases. Balance adjustments keep caller direction.

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id),
  type public.transaction_type not null,
  category_id uuid references public.categories (id),
  income_source_id uuid references public.income_sources (id),
  amount_original numeric(18, 2) not null
    check (amount_original > 0),
  currency_original text not null default 'PKR'
    check (currency_original = upper(currency_original)),
  exchange_rate numeric(18, 6)
    check (exchange_rate is null or exchange_rate > 0),
  amount_pkr numeric(18, 2) not null
    check (amount_pkr > 0),
  exchange_rate_source text,
  exchange_rate_timestamp timestamptz,
  description text not null,
  notes text,
  transaction_date date not null,
  status public.transaction_status not null default 'completed',
  classification public.financial_classification not null default 'personal',
  direction smallint not null
    check (direction in (-1, 1)),
  goal_id uuid,
  transfer_id uuid,
  balance_adjustment_id uuid,
  created_by uuid not null references public.profiles (id),
  updated_by uuid references public.profiles (id),
  archived_at timestamptz,
  archived_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint transactions_fx_when_foreign check (
    currency_original = 'PKR'
    or (exchange_rate is not null and exchange_rate > 0)
  )
);

create index if not exists transactions_account_id_idx
  on public.transactions (account_id);

create index if not exists transactions_transaction_date_idx
  on public.transactions (transaction_date);

create index if not exists transactions_type_idx
  on public.transactions (type);

create index if not exists transactions_status_idx
  on public.transactions (status);

create index if not exists transactions_category_id_idx
  on public.transactions (category_id);

create index if not exists transactions_income_source_id_idx
  on public.transactions (income_source_id);

create index if not exists transactions_goal_id_idx
  on public.transactions (goal_id);

create index if not exists transactions_transfer_id_idx
  on public.transactions (transfer_id);

create index if not exists transactions_archived_at_idx
  on public.transactions (archived_at);

create index if not exists transactions_created_by_idx
  on public.transactions (created_by);

-- Account history ordered by date
create index if not exists transactions_account_date_idx
  on public.transactions (account_id, transaction_date desc, created_at desc);

-- Monthly completed income / expense rollups
create index if not exists transactions_monthly_completed_idx
  on public.transactions (account_id, status, type, transaction_date)
  where archived_at is null;

-- Expected income by due date
create index if not exists transactions_expected_date_idx
  on public.transactions (transaction_date, status)
  where status = 'expected' and archived_at is null;

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
  before update on public.transactions
  for each row
  execute function public.set_updated_at();

-- Derive direction from type; balance_adjustment must keep the provided direction.
create or replace function public.set_transaction_direction()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.type = 'balance_adjustment' then
    if new.direction is null or new.direction not in (-1, 1) then
      raise exception 'balance_adjustment requires direction of -1 or 1';
    end if;
    return new;
  end if;

  new.direction := case new.type
    when 'income' then 1
    when 'transfer_in' then 1
    when 'refund' then 1
    when 'family_contribution' then 1
    when 'loan_repayment' then 1
    when 'expense' then -1
    when 'transfer_out' then -1
    when 'loan_payment' then -1
    else null
  end;

  if new.direction is null then
    raise exception 'Unsupported transaction type for direction: %', new.type;
  end if;

  return new;
end;
$$;

drop trigger if exists transactions_set_direction_bi on public.transactions;
create trigger transactions_set_direction_bi
  before insert or update of type, direction on public.transactions
  for each row
  execute function public.set_transaction_direction();

-- Block direct client writes of transfer/adjustment types unless RPC sets session flag.
create or replace function public.enforce_secure_transaction_writes()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_secure boolean := current_setting('hisab.allow_secure_write', true) = 'on';
begin
  if tg_op = 'INSERT' then
    if new.type in ('transfer_in', 'transfer_out', 'balance_adjustment')
       and not v_secure then
      raise exception
        'Direct insert of % transactions is not allowed; use secure RPCs',
        new.type;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if (new.archived_at is distinct from old.archived_at
        or new.archived_by is distinct from old.archived_by)
       and not v_secure then
      raise exception
        'Archive/restore must use archive_transaction / restore_transaction RPCs';
    end if;

    if (new.type in ('transfer_in', 'transfer_out', 'balance_adjustment')
        or old.type in ('transfer_in', 'transfer_out', 'balance_adjustment'))
       and not v_secure then
      if new.type is distinct from old.type
         or new.amount_original is distinct from old.amount_original
         or new.amount_pkr is distinct from old.amount_pkr
         or new.direction is distinct from old.direction
         or new.account_id is distinct from old.account_id
         or new.transfer_id is distinct from old.transfer_id
         or new.balance_adjustment_id is distinct from old.balance_adjustment_id
         or new.status is distinct from old.status then
        raise exception
          'Direct update of secure transaction fields is not allowed; use secure RPCs';
      end if;
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists transactions_enforce_secure_writes on public.transactions;
create trigger transactions_enforce_secure_writes
  before insert or update on public.transactions
  for each row
  execute function public.enforce_secure_transaction_writes();

grant select, insert, update on public.transactions to authenticated;
