-- Phase 4: transfer idempotency, opening contribution allocation, performance indexes

alter table public.transfers
  add column if not exists idempotency_key uuid;

create unique index if not exists transfers_initiator_idempotency_unique
  on public.transfers (initiated_by, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists account_contributions_opening_allocation_unique
  on public.account_contributions (account_id, contributor_profile_id)
  where contribution_type = 'opening_allocation';

create index if not exists transfers_initiated_by_date_idx
  on public.transfers (initiated_by, transaction_date desc, created_at desc);

create index if not exists transfers_source_dest_idx
  on public.transfers (source_account_id, destination_account_id);

create index if not exists balance_adjustments_account_date_idx
  on public.balance_adjustments (account_id, reconciled_at desc);

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

create index if not exists audit_logs_account_id_idx
  on public.audit_logs (account_id, created_at desc);

create index if not exists notifications_profile_unread_idx
  on public.notifications (profile_id, read_at, created_at desc);

-- ---------------------------------------------------------------------------
-- create_account_transfer (with idempotency)
-- ---------------------------------------------------------------------------

create or replace function public.create_account_transfer(
  p_source_account_id uuid,
  p_destination_account_id uuid,
  p_amount_original numeric,
  p_currency text,
  p_exchange_rate numeric,
  p_amount_pkr numeric,
  p_transaction_date date,
  p_notes text default null,
  p_idempotency_key uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_source public.accounts%rowtype;
  v_dest public.accounts%rowtype;
  v_balance numeric(18, 2);
  v_transfer_id uuid;
  v_out_id uuid;
  v_in_id uuid;
  v_contribution_id uuid;
  v_currency text := upper(trim(p_currency));
  v_existing record;
begin
  if v_actor is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_approved_active_user() then
    raise exception 'Not an active approved user';
  end if;

  if p_idempotency_key is not null then
    select
      t.id,
      (select id from public.transactions where transfer_id = t.id and type = 'transfer_out' limit 1) as out_id,
      (select id from public.transactions where transfer_id = t.id and type = 'transfer_in' limit 1) as in_id,
      (select id from public.account_contributions where transfer_id = t.id limit 1) as contribution_id
    into v_existing
    from public.transfers t
    where t.initiated_by = v_actor
      and t.idempotency_key = p_idempotency_key
    limit 1;

    if found then
      return jsonb_build_object(
        'transfer_id', v_existing.id,
        'transfer_out_transaction_id', v_existing.out_id,
        'transfer_in_transaction_id', v_existing.in_id,
        'contribution_id', v_existing.contribution_id,
        'deduplicated', true
      );
    end if;
  end if;

  if p_source_account_id = p_destination_account_id then
    raise exception 'Source and destination accounts must differ';
  end if;

  if p_amount_original is null or p_amount_original <= 0 then
    raise exception 'amount_original must be > 0';
  end if;

  if p_amount_pkr is null or p_amount_pkr <= 0 then
    raise exception 'amount_pkr must be > 0';
  end if;

  if p_exchange_rate is null or p_exchange_rate <= 0 then
    raise exception 'exchange_rate must be > 0';
  end if;

  select * into v_source
  from public.accounts
  where id = p_source_account_id
  for update;

  if not found then
    raise exception 'Source account not found';
  end if;

  select * into v_dest
  from public.accounts
  where id = p_destination_account_id
  for update;

  if not found then
    raise exception 'Destination account not found';
  end if;

  if not v_source.is_active or not v_dest.is_active then
    raise exception 'Both accounts must be active';
  end if;

  if v_source.owner_profile_id <> v_actor then
    raise exception 'Only the source account owner may initiate a transfer';
  end if;

  v_balance := public.account_actual_balance(p_source_account_id);
  if p_amount_pkr > v_balance
     and coalesce(
       (select (value_json)::boolean
        from public.app_settings
        where key = 'allow_transfer_overdraft'),
       false
     ) is not true then
    raise exception 'Insufficient funds: available % PKR, requested % PKR', v_balance, p_amount_pkr;
  end if;

  perform set_config('hisab.allow_secure_write', 'on', true);

  insert into public.transfers (
    source_account_id,
    destination_account_id,
    amount_original,
    currency,
    exchange_rate,
    amount_pkr,
    initiated_by,
    transaction_date,
    notes,
    status,
    idempotency_key
  ) values (
    p_source_account_id,
    p_destination_account_id,
    p_amount_original,
    v_currency,
    p_exchange_rate,
    p_amount_pkr,
    v_actor,
    p_transaction_date,
    p_notes,
    'completed',
    p_idempotency_key
  )
  returning id into v_transfer_id;

  insert into public.transactions (
    account_id, type, amount_original, currency_original, exchange_rate, amount_pkr,
    description, notes, transaction_date, status, classification, direction, transfer_id, created_by
  ) values (
    p_source_account_id, 'transfer_out', p_amount_original, v_currency, p_exchange_rate, p_amount_pkr,
    format('Transfer to %s', v_dest.name), p_notes, p_transaction_date, 'completed',
    case when v_dest.is_shared_savings_account then 'shared'::public.financial_classification else 'personal'::public.financial_classification end,
    -1, v_transfer_id, v_actor
  )
  returning id into v_out_id;

  insert into public.transactions (
    account_id, type, amount_original, currency_original, exchange_rate, amount_pkr,
    description, notes, transaction_date, status, classification, direction, transfer_id, created_by
  ) values (
    p_destination_account_id, 'transfer_in', p_amount_original, v_currency, p_exchange_rate, p_amount_pkr,
    format('Transfer from %s', v_source.name), p_notes, p_transaction_date, 'completed',
    case when v_dest.is_shared_savings_account then 'shared'::public.financial_classification else 'personal'::public.financial_classification end,
    1, v_transfer_id, v_actor
  )
  returning id into v_in_id;

  if v_dest.is_shared_savings_account then
    insert into public.account_contributions (
      account_id, contributor_profile_id, transfer_id, transaction_id,
      amount_pkr, contribution_type, contribution_date, notes
    ) values (
      p_destination_account_id, v_actor, v_transfer_id, v_in_id,
      p_amount_pkr, 'deposit', p_transaction_date, p_notes
    )
    returning id into v_contribution_id;
  end if;

  perform public.insert_audit_log(
    'transfer.create', 'transfer', v_transfer_id, p_source_account_id, null,
    jsonb_build_object(
      'destination_account_id', p_destination_account_id,
      'amount_pkr', p_amount_pkr,
      'transfer_out_id', v_out_id,
      'transfer_in_id', v_in_id,
      'contribution_id', v_contribution_id
    ),
    '{}'::jsonb
  );

  if v_dest.owner_profile_id is distinct from v_actor then
    perform public.insert_notification(
      v_dest.owner_profile_id, 'transfer', 'Money received',
      format('%s transferred %s PKR into %s',
        (select display_name from public.profiles where id = v_actor),
        p_amount_pkr::text, v_dest.name),
      'transfer', v_transfer_id,
      'transfer:' || v_transfer_id::text || ':destination-owner'
    );
  end if;

  perform public.insert_notification(
    v_actor, 'transfer', 'Transfer completed',
    format('PKR %s was transferred from %s to %s', p_amount_pkr::text, v_source.name, v_dest.name),
    'transfer', v_transfer_id,
    'transfer:' || v_transfer_id::text || ':initiator'
  );

  return jsonb_build_object(
    'transfer_id', v_transfer_id,
    'transfer_out_transaction_id', v_out_id,
    'transfer_in_transaction_id', v_in_id,
    'contribution_id', v_contribution_id,
    'deduplicated', false
  );
end;
$$;

revoke all on function public.create_account_transfer(
  uuid, uuid, numeric, text, numeric, numeric, date, text, uuid
) from public;
grant execute on function public.create_account_transfer(
  uuid, uuid, numeric, text, numeric, numeric, date, text, uuid
) to authenticated;

-- ---------------------------------------------------------------------------
-- allocate_opening_contributions (shared savings opening split)
-- ---------------------------------------------------------------------------

create or replace function public.allocate_opening_contributions(
  p_account_id uuid,
  p_allocations jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_account public.accounts%rowtype;
  v_item jsonb;
  v_total numeric(18, 2) := 0;
  v_amount numeric(18, 2);
  v_contributor uuid;
  v_created_ids uuid[] := '{}';
  v_id uuid;
begin
  if v_actor is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_approved_active_user() then
    raise exception 'Not an active approved user';
  end if;

  select * into v_account from public.accounts where id = p_account_id for update;
  if not found then
    raise exception 'Account not found';
  end if;

  if v_account.owner_profile_id <> v_actor then
    raise exception 'Only the account owner may allocate opening contributions';
  end if;

  if not v_account.is_shared_savings_account then
    raise exception 'Opening allocation applies only to shared savings accounts';
  end if;

  if exists (
    select 1 from public.account_contributions
    where account_id = p_account_id and contribution_type = 'opening_allocation'
  ) then
    raise exception 'Opening contributions were already allocated for this account';
  end if;

  if p_allocations is null or jsonb_typeof(p_allocations) <> 'array' then
    raise exception 'Allocations must be a JSON array';
  end if;

  for v_item in select * from jsonb_array_elements(p_allocations)
  loop
    v_amount := (v_item->>'amount_pkr')::numeric;
    v_contributor := (v_item->>'contributor_profile_id')::uuid;
    if v_amount is null or v_amount < 0 then
      raise exception 'Each allocation amount must be >= 0';
    end if;
    if v_contributor is null then
      raise exception 'Each allocation requires contributor_profile_id';
    end if;
    v_total := v_total + v_amount;
  end loop;

  if v_total > v_account.opening_balance then
    raise exception 'Total allocated (% PKR) exceeds opening balance (% PKR)', v_total, v_account.opening_balance;
  end if;

  for v_item in select * from jsonb_array_elements(p_allocations)
  loop
    v_amount := (v_item->>'amount_pkr')::numeric;
    v_contributor := (v_item->>'contributor_profile_id')::uuid;
    if v_amount > 0 then
      insert into public.account_contributions (
        account_id, contributor_profile_id, amount_pkr,
        contribution_type, contribution_date, notes
      ) values (
        p_account_id, v_contributor, v_amount,
        'opening_allocation', current_date,
        coalesce(v_item->>'notes', 'Opening balance allocation')
      )
      returning id into v_id;
      v_created_ids := array_append(v_created_ids, v_id);
    end if;
  end loop;

  perform public.insert_audit_log(
    'contribution.opening_allocate', 'account', p_account_id, p_account_id,
    null,
    jsonb_build_object('allocations', p_allocations, 'contribution_ids', v_created_ids),
    '{}'::jsonb
  );

  return jsonb_build_object(
    'account_id', p_account_id,
    'contribution_ids', v_created_ids,
    'total_allocated', v_total
  );
end;
$$;

revoke all on function public.allocate_opening_contributions(uuid, jsonb) from public;
grant execute on function public.allocate_opening_contributions(uuid, jsonb) to authenticated;

-- Block archiving individual transfer legs from the standard archive RPC (Phase 4 immutability)
create or replace function public.archive_transaction(p_transaction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_txn public.transactions%rowtype;
  v_now timestamptz := timezone('utc', now());
begin
  if v_actor is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_approved_active_user() then
    raise exception 'Not an active approved user';
  end if;

  select * into v_txn
  from public.transactions
  where id = p_transaction_id
  for update;

  if not found then
    raise exception 'Transaction not found';
  end if;

  if not public.is_account_owner(v_txn.account_id) then
    raise exception 'Only the account owner may archive transactions';
  end if;

  if v_txn.type = 'balance_adjustment' then
    raise exception 'Balance corrections cannot be archived. Create a new reconciliation to correct the balance.';
  end if;

  if v_txn.transfer_id is not null then
    raise exception 'Linked transfers cannot be archived as individual transactions.';
  end if;

  if v_txn.archived_at is not null then
    raise exception 'Transaction is already archived';
  end if;

  perform set_config('hisab.allow_secure_write', 'on', true);

  update public.transactions
  set archived_at = v_now, archived_by = v_actor, updated_by = v_actor
  where id = v_txn.id;

  perform public.insert_audit_log(
    'transaction.archive', 'transaction', v_txn.id, v_txn.account_id,
    null, jsonb_build_object('archived_at', v_now), '{}'::jsonb
  );

  return jsonb_build_object('archived', true, 'transaction_id', v_txn.id);
end;
$$;
