-- Phase 3: integration fields for onboarding, idempotency, and manual FX

alter table public.profiles
  add column if not exists savings_plan_mode text not null default 'balanced'
    check (savings_plan_mode in ('comfortable', 'balanced', 'aggressive', 'custom'));

alter table public.profiles
  add column if not exists custom_savings_rate numeric(10, 4)
    check (custom_savings_rate is null or (custom_savings_rate >= 0 and custom_savings_rate <= 1));

alter table public.transactions
  add column if not exists client_request_id uuid
    check (client_request_id is null or client_request_id <> '00000000-0000-0000-0000-000000000000'::uuid);

create unique index if not exists transactions_client_request_id_unique
  on public.transactions (client_request_id)
  where client_request_id is not null;

alter table public.transactions
  add column if not exists exchange_rate_is_manual boolean not null default false;

-- Prevent duplicate onboarding accounts for the same owner + bank + name
create unique index if not exists accounts_owner_bank_name_unique
  on public.accounts (owner_profile_id, lower(bank_name), lower(name));
