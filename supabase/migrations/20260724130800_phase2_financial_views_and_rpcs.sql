-- Phase 2: financial calculation helpers, views, and secure RPCs
-- Transfer / reconcile / archive must set hisab.allow_secure_write = on (transaction-local).

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.signed_effect(
  p_amount_pkr numeric,
  p_direction smallint
)
returns numeric
language sql
immutable
parallel safe
set search_path = public
as $$
  select p_amount_pkr * p_direction;
$$;

revoke all on function public.signed_effect(numeric, smallint) from public;
grant execute on function public.signed_effect(numeric, smallint) to authenticated;

-- Alias used by application / docs (same signed PKR effect).
create or replace function public.transaction_signed_amount(
  p_amount_pkr numeric,
  p_direction smallint
)
returns numeric
language sql
immutable
parallel safe
set search_path = public
as $$
  select public.signed_effect(p_amount_pkr, p_direction);
$$;

revoke all on function public.transaction_signed_amount(numeric, smallint) from public;
grant execute on function public.transaction_signed_amount(numeric, smallint) to authenticated;

create or replace function public.account_actual_balance(p_account_id uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_opening numeric(18, 2);
  v_sum numeric(18, 2);
begin
  select opening_balance into v_opening
  from public.accounts
  where id = p_account_id;

  if v_opening is null then
    raise exception 'Account % not found', p_account_id;
  end if;

  select coalesce(sum(public.signed_effect(t.amount_pkr, t.direction)), 0)
  into v_sum
  from public.transactions t
  where t.account_id = p_account_id
    and t.status = 'completed'
    and t.archived_at is null;

  return v_opening + v_sum;
end;
$$;

revoke all on function public.account_actual_balance(uuid) from public;
grant execute on function public.account_actual_balance(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Views (security_invoker so RLS of underlying tables applies)
-- ---------------------------------------------------------------------------

create or replace view public.account_actual_balances
with (security_invoker = true)
as
select
  a.id as account_id,
  a.name,
  a.owner_profile_id,
  a.opening_balance,
  public.account_actual_balance(a.id) as actual_balance
from public.accounts a
where a.is_active = true;

create or replace view public.account_projected_balances
with (security_invoker = true)
as
select
  a.id as account_id,
  a.name,
  a.owner_profile_id,
  public.account_actual_balance(a.id) as actual_balance,
  coalesce((
    select sum(public.signed_effect(t.amount_pkr, t.direction))
    from public.transactions t
    where t.account_id = a.id
      and t.status = 'pending'
      and t.archived_at is null
  ), 0) as pending_effect,
  coalesce((
    select sum(public.signed_effect(t.amount_pkr, t.direction))
    from public.transactions t
    where t.account_id = a.id
      and t.status = 'expected'
      and t.archived_at is null
  ), 0) as expected_effect,
  public.account_actual_balance(a.id)
    + coalesce((
      select sum(public.signed_effect(t.amount_pkr, t.direction))
      from public.transactions t
      where t.account_id = a.id
        and t.status in ('pending', 'expected')
        and t.archived_at is null
    ), 0) as projected_balance
from public.accounts a
where a.is_active = true;

create or replace view public.account_contribution_totals
with (security_invoker = true)
as
select
  c.account_id,
  c.contributor_profile_id,
  sum(c.amount_pkr) as total_contributed_pkr,
  count(*)::integer as contribution_count
from public.account_contributions c
group by c.account_id, c.contributor_profile_id;

create or replace view public.goal_progress
with (security_invoker = true)
as
select
  g.id as goal_id,
  g.name,
  g.ownership_type,
  g.owner_profile_id,
  g.target_amount,
  g.starting_amount,
  g.starting_amount
    + coalesce(sum(
      case gc.contribution_type
        when 'deposit' then gc.amount
        when 'withdrawal' then -gc.amount
        when 'adjustment' then gc.amount
        else 0
      end
    ), 0) as current_amount,
  g.status
from public.financial_goals g
left join public.goal_contributions gc on gc.goal_id = g.id
where g.archived_at is null
group by g.id;

create or replace view public.loan_progress
with (security_invoker = true)
as
select
  l.id as loan_id,
  l.name,
  l.owner_profile_id,
  l.original_amount,
  l.starting_remaining_balance,
  greatest(
    l.starting_remaining_balance - coalesce(sum(lp.principal_amount), 0),
    0
  ) as remaining_balance,
  coalesce(sum(lp.amount), 0) as total_paid,
  l.status
from public.loans l
left join public.loan_payments lp on lp.loan_id = l.id
where l.archived_at is null
group by l.id;

create or replace view public.monthly_budget_usage
with (security_invoker = true)
as
select
  b.id as budget_id,
  b.year,
  b.month,
  b.category_id,
  b.scope,
  b.owner_profile_id,
  b.budgeted_amount,
  coalesce(s.spent_amount, 0) as spent_amount,
  b.budgeted_amount - coalesce(s.spent_amount, 0) as remaining_amount,
  case
    when b.budgeted_amount = 0 then null
    else round(coalesce(s.spent_amount, 0) / b.budgeted_amount, 4)
  end as usage_ratio
from public.budgets b
left join lateral (
  select coalesce(sum(t.amount_pkr), 0) as spent_amount
  from public.transactions t
  where t.category_id = b.category_id
    and t.type = 'expense'
    and t.status = 'completed'
    and t.archived_at is null
    and extract(year from t.transaction_date)::integer = b.year
    and extract(month from t.transaction_date)::integer = b.month
    and (
      b.scope <> 'personal'
      or exists (
        select 1
        from public.accounts a
        where a.id = t.account_id
          and a.owner_profile_id = b.owner_profile_id
      )
    )
) s on true;

create or replace view public.combined_financial_summary
with (security_invoker = true)
as
with balances as (
  select
    coalesce(sum(public.account_actual_balance(a.id)), 0) as total_actual_balance,
    coalesce(sum(
      public.account_actual_balance(a.id)
      + coalesce((
        select sum(public.signed_effect(t.amount_pkr, t.direction))
        from public.transactions t
        where t.account_id = a.id
          and t.status in ('pending', 'expected')
          and t.archived_at is null
      ), 0)
    ), 0) as total_projected_balance
  from public.accounts a
  where a.is_active = true
),
month_flow as (
  select
    coalesce(sum(t.amount_pkr) filter (
      where t.type in ('income', 'refund', 'family_contribution', 'loan_repayment', 'transfer_in')
        and t.direction = 1
    ), 0) as month_income,
    coalesce(sum(t.amount_pkr) filter (
      where t.type in ('expense', 'loan_payment', 'transfer_out')
        and t.direction = -1
    ), 0) as month_expenses
  from public.transactions t
  where t.status = 'completed'
    and t.archived_at is null
    and t.transaction_date >= date_trunc('month', timezone('utc', now()))::date
    and t.transaction_date < (date_trunc('month', timezone('utc', now())) + interval '1 month')::date
)
select
  b.total_actual_balance,
  b.total_projected_balance,
  m.month_income as current_month_income,
  m.month_expenses as current_month_expenses,
  (m.month_income - m.month_expenses) as current_month_net_savings,
  case
    when m.month_income = 0 then null
    else round((m.month_income - m.month_expenses) / m.month_income, 4)
  end as savings_rate
from balances b
cross join month_flow m;

grant select on public.account_actual_balances to authenticated;
grant select on public.account_projected_balances to authenticated;
grant select on public.account_contribution_totals to authenticated;
grant select on public.goal_progress to authenticated;
grant select on public.loan_progress to authenticated;
grant select on public.monthly_budget_usage to authenticated;
grant select on public.combined_financial_summary to authenticated;

-- ---------------------------------------------------------------------------
-- Internal: notify helper (SECURITY DEFINER)
-- ---------------------------------------------------------------------------

create or replace function public.insert_notification(
  p_profile_id uuid,
  p_type public.notification_type,
  p_title text,
  p_message text,
  p_related_entity_type text default null,
  p_related_entity_id uuid default null,
  p_deduplication_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.notifications (
    profile_id,
    type,
    title,
    message,
    related_entity_type,
    related_entity_id,
    deduplication_key
  ) values (
    p_profile_id,
    p_type,
    p_title,
    p_message,
    p_related_entity_type,
    p_related_entity_id,
    p_deduplication_key
  )
  on conflict (profile_id, deduplication_key) where deduplication_key is not null
  do nothing
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.insert_notification(
  uuid, public.notification_type, text, text, text, uuid, text
) from public;
-- Not granted to authenticated; secure RPCs create notifications.

-- ---------------------------------------------------------------------------
-- create_account_transfer
-- ---------------------------------------------------------------------------

create or replace function public.create_account_transfer(
  p_source_account_id uuid,
  p_destination_account_id uuid,
  p_amount_original numeric,
  p_currency text,
  p_exchange_rate numeric,
  p_amount_pkr numeric,
  p_transaction_date date,
  p_notes text default null
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
begin
  if v_actor is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_approved_active_user() then
    raise exception 'Not an active approved user';
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
    status
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
    'completed'
  )
  returning id into v_transfer_id;

  insert into public.transactions (
    account_id,
    type,
    amount_original,
    currency_original,
    exchange_rate,
    amount_pkr,
    description,
    notes,
    transaction_date,
    status,
    classification,
    direction,
    transfer_id,
    created_by
  ) values (
    p_source_account_id,
    'transfer_out',
    p_amount_original,
    v_currency,
    p_exchange_rate,
    p_amount_pkr,
    format('Transfer to %s', v_dest.name),
    p_notes,
    p_transaction_date,
    'completed',
    case when v_dest.is_shared_savings_account then 'shared'::public.financial_classification else 'personal'::public.financial_classification end,
    -1,
    v_transfer_id,
    v_actor
  )
  returning id into v_out_id;

  insert into public.transactions (
    account_id,
    type,
    amount_original,
    currency_original,
    exchange_rate,
    amount_pkr,
    description,
    notes,
    transaction_date,
    status,
    classification,
    direction,
    transfer_id,
    created_by
  ) values (
    p_destination_account_id,
    'transfer_in',
    p_amount_original,
    v_currency,
    p_exchange_rate,
    p_amount_pkr,
    format('Transfer from %s', v_source.name),
    p_notes,
    p_transaction_date,
    'completed',
    case when v_dest.is_shared_savings_account then 'shared'::public.financial_classification else 'personal'::public.financial_classification end,
    1,
    v_transfer_id,
    v_actor
  )
  returning id into v_in_id;

  if v_dest.is_shared_savings_account then
    insert into public.account_contributions (
      account_id,
      contributor_profile_id,
      transfer_id,
      transaction_id,
      amount_pkr,
      contribution_type,
      contribution_date,
      notes
    ) values (
      p_destination_account_id,
      v_actor,
      v_transfer_id,
      v_in_id,
      p_amount_pkr,
      'deposit',
      p_transaction_date,
      p_notes
    )
    returning id into v_contribution_id;
  end if;

  perform public.insert_audit_log(
    'transfer.create',
    'transfer',
    v_transfer_id,
    p_source_account_id,
    null,
    jsonb_build_object(
      'destination_account_id', p_destination_account_id,
      'amount_pkr', p_amount_pkr,
      'transfer_out_id', v_out_id,
      'transfer_in_id', v_in_id,
      'contribution_id', v_contribution_id
    ),
    '{}'::jsonb
  );

  -- Notify destination owner when different from actor
  if v_dest.owner_profile_id is distinct from v_actor then
    perform public.insert_notification(
      v_dest.owner_profile_id,
      'transfer',
      'Incoming transfer',
      format('Received %s PKR into %s', p_amount_pkr::text, v_dest.name),
      'transfer',
      v_transfer_id,
      'transfer:' || v_transfer_id::text || ':dest'
    );
  end if;

  perform public.insert_notification(
    v_actor,
    'transfer',
    'Transfer completed',
    format('Transferred %s PKR from %s to %s', p_amount_pkr::text, v_source.name, v_dest.name),
    'transfer',
    v_transfer_id,
    'transfer:' || v_transfer_id::text || ':src'
  );

  return jsonb_build_object(
    'transfer_id', v_transfer_id,
    'transfer_out_transaction_id', v_out_id,
    'transfer_in_transaction_id', v_in_id,
    'contribution_id', v_contribution_id
  );
end;
$$;

revoke all on function public.create_account_transfer(
  uuid, uuid, numeric, text, numeric, numeric, date, text
) from public;
grant execute on function public.create_account_transfer(
  uuid, uuid, numeric, text, numeric, numeric, date, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- reconcile_account_balance
-- ---------------------------------------------------------------------------

create or replace function public.reconcile_account_balance(
  p_account_id uuid,
  p_actual_balance numeric,
  p_reason text,
  p_reconciled_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_account public.accounts%rowtype;
  v_calculated numeric(18, 2);
  v_adjustment numeric(18, 2);
  v_adj_id uuid;
  v_txn_id uuid;
  v_when timestamptz := coalesce(p_reconciled_at, timezone('utc', now()));
  v_direction smallint;
begin
  if v_actor is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_approved_active_user() then
    raise exception 'Not an active approved user';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'Reconciliation reason is required';
  end if;

  select * into v_account
  from public.accounts
  where id = p_account_id
  for update;

  if not found then
    raise exception 'Account not found';
  end if;

  if v_account.owner_profile_id <> v_actor then
    raise exception 'Only the account owner may reconcile';
  end if;

  v_calculated := public.account_actual_balance(p_account_id);
  v_adjustment := p_actual_balance - v_calculated;

  insert into public.balance_adjustments (
    account_id,
    calculated_balance_before,
    actual_balance,
    adjustment_amount,
    reason,
    reconciled_by,
    reconciled_at
  ) values (
    p_account_id,
    v_calculated,
    p_actual_balance,
    v_adjustment,
    trim(p_reason),
    v_actor,
    v_when
  )
  returning id into v_adj_id;

  if v_adjustment <> 0 then
    v_direction := case when v_adjustment > 0 then 1 else -1 end;

    perform set_config('hisab.allow_secure_write', 'on', true);

    insert into public.transactions (
      account_id,
      type,
      amount_original,
      currency_original,
      exchange_rate,
      amount_pkr,
      description,
      notes,
      transaction_date,
      status,
      classification,
      direction,
      balance_adjustment_id,
      created_by
    ) values (
      p_account_id,
      'balance_adjustment',
      abs(v_adjustment),
      v_account.primary_currency,
      1,
      abs(v_adjustment),
      'Balance reconciliation adjustment',
      trim(p_reason),
      (v_when at time zone 'utc')::date,
      'completed',
      'personal',
      v_direction,
      v_adj_id,
      v_actor
    )
    returning id into v_txn_id;
  end if;

  update public.accounts
  set last_reconciled_at = v_when
  where id = p_account_id;

  perform public.insert_audit_log(
    'account.reconcile',
    'balance_adjustment',
    v_adj_id,
    p_account_id,
    jsonb_build_object('calculated_balance', v_calculated),
    jsonb_build_object(
      'actual_balance', p_actual_balance,
      'adjustment_amount', v_adjustment,
      'transaction_id', v_txn_id
    ),
    '{}'::jsonb
  );

  perform public.insert_notification(
    v_actor,
    'reconciliation',
    'Account reconciled',
    format('%s reconciled (adjustment %s PKR)', v_account.name, v_adjustment::text),
    'balance_adjustment',
    v_adj_id,
    'reconcile:' || v_adj_id::text
  );

  return jsonb_build_object(
    'balance_adjustment_id', v_adj_id,
    'transaction_id', v_txn_id,
    'calculated_balance_before', v_calculated,
    'actual_balance', p_actual_balance,
    'adjustment_amount', v_adjustment
  );
end;
$$;

revoke all on function public.reconcile_account_balance(
  uuid, numeric, text, timestamptz
) from public;
grant execute on function public.reconcile_account_balance(
  uuid, numeric, text, timestamptz
) to authenticated;

-- ---------------------------------------------------------------------------
-- archive_transaction / restore_transaction
-- ---------------------------------------------------------------------------

create or replace function public.archive_transaction(p_transaction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_txn public.transactions%rowtype;
  v_sibling uuid;
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
    raise exception 'Archiving balance_adjustment transactions is not allowed';
  end if;

  if v_txn.archived_at is not null then
    raise exception 'Transaction is already archived';
  end if;

  perform set_config('hisab.allow_secure_write', 'on', true);

  if v_txn.transfer_id is not null then
    select t.id into v_sibling
    from public.transactions t
    where t.transfer_id = v_txn.transfer_id
      and t.id <> v_txn.id
    for update;

    if v_sibling is null then
      raise exception 'Transfer counterpart transaction missing; cannot archive one side';
    end if;

    -- Both legs must be owned by this actor OR actor must own the requested side
    -- and the other side's account may belong to the other user — archive both
    -- atomically regardless of destination ownership (transfer integrity).
    update public.transactions
    set
      archived_at = v_now,
      archived_by = v_actor,
      updated_by = v_actor
    where transfer_id = v_txn.transfer_id
      and archived_at is null;

    update public.transfers
    set archived_at = v_now
    where id = v_txn.transfer_id
      and archived_at is null;

    perform public.insert_audit_log(
      'transfer.archive',
      'transfer',
      v_txn.transfer_id,
      v_txn.account_id,
      null,
      jsonb_build_object('transaction_ids', array[v_txn.id, v_sibling]),
      '{}'::jsonb
    );

    return jsonb_build_object(
      'archived', true,
      'transfer_id', v_txn.transfer_id,
      'transaction_ids', jsonb_build_array(v_txn.id, v_sibling)
    );
  end if;

  update public.transactions
  set
    archived_at = v_now,
    archived_by = v_actor,
    updated_by = v_actor
  where id = v_txn.id;

  perform public.insert_audit_log(
    'transaction.archive',
    'transaction',
    v_txn.id,
    v_txn.account_id,
    null,
    jsonb_build_object('archived_at', v_now),
    '{}'::jsonb
  );

  return jsonb_build_object(
    'archived', true,
    'transaction_id', v_txn.id
  );
end;
$$;

revoke all on function public.archive_transaction(uuid) from public;
grant execute on function public.archive_transaction(uuid) to authenticated;

create or replace function public.restore_transaction(p_transaction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_txn public.transactions%rowtype;
  v_sibling uuid;
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
    raise exception 'Only the account owner may restore transactions';
  end if;

  if v_txn.type = 'balance_adjustment' then
    raise exception 'Restoring balance_adjustment transactions is not allowed';
  end if;

  if v_txn.archived_at is null then
    raise exception 'Transaction is not archived';
  end if;

  perform set_config('hisab.allow_secure_write', 'on', true);

  if v_txn.transfer_id is not null then
    select t.id into v_sibling
    from public.transactions t
    where t.transfer_id = v_txn.transfer_id
      and t.id <> v_txn.id
    for update;

    if v_sibling is null then
      raise exception 'Transfer counterpart transaction missing; cannot restore one side';
    end if;

    update public.transactions
    set
      archived_at = null,
      archived_by = null,
      updated_by = v_actor
    where transfer_id = v_txn.transfer_id
      and archived_at is not null;

    update public.transfers
    set archived_at = null
    where id = v_txn.transfer_id
      and archived_at is not null;

    perform public.insert_audit_log(
      'transfer.restore',
      'transfer',
      v_txn.transfer_id,
      v_txn.account_id,
      null,
      jsonb_build_object('transaction_ids', array[v_txn.id, v_sibling]),
      '{}'::jsonb
    );

    return jsonb_build_object(
      'restored', true,
      'transfer_id', v_txn.transfer_id,
      'transaction_ids', jsonb_build_array(v_txn.id, v_sibling)
    );
  end if;

  update public.transactions
  set
    archived_at = null,
    archived_by = null,
    updated_by = v_actor
  where id = v_txn.id;

  perform public.insert_audit_log(
    'transaction.restore',
    'transaction',
    v_txn.id,
    v_txn.account_id,
    null,
    jsonb_build_object('restored', true),
    '{}'::jsonb
  );

  return jsonb_build_object(
    'restored', true,
    'transaction_id', v_txn.id
  );
end;
$$;

revoke all on function public.restore_transaction(uuid) from public;
grant execute on function public.restore_transaction(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Generic CRUD audit triggers (skip when secure RPCs already audit)
-- ---------------------------------------------------------------------------

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_entity_id uuid;
  v_account_id uuid;
  v_old jsonb;
  v_new jsonb;
begin
  -- Secure RPCs set this flag and write their own audit rows.
  if current_setting('hisab.allow_secure_write', true) = 'on' then
    return coalesce(new, old);
  end if;

  -- Do not put personal note bodies into shared audit_logs (both admins can read audits).
  if tg_table_name = 'notes' then
    if coalesce(new.visibility, old.visibility) = 'personal' then
      return coalesce(new, old);
    end if;
  end if;

  if tg_op = 'UPDATE' then
    v_old := to_jsonb(old) - 'updated_at';
    v_new := to_jsonb(new) - 'updated_at';
    if v_old = v_new then
      return new;
    end if;
    -- Ignore reconciliation timestamp-only updates (RPC audits separately).
    if tg_table_name = 'accounts'
       and (v_old - 'last_reconciled_at') = (v_new - 'last_reconciled_at') then
      return new;
    end if;
  end if;

  v_action := tg_table_name || '.' || lower(tg_op);
  v_entity_id := coalesce(new.id, old.id);

  if tg_table_name = 'accounts' then
    v_account_id := coalesce(new.id, old.id);
  elsif to_jsonb(coalesce(new, old)) ? 'account_id' then
    v_account_id := (to_jsonb(coalesce(new, old)) ->> 'account_id')::uuid;
  end if;

  perform public.insert_audit_log(
    v_action,
    tg_table_name,
    v_entity_id,
    v_account_id,
    case
      when tg_op in ('UPDATE', 'DELETE') and tg_table_name = 'notes' then
        (to_jsonb(old) - 'content_json' - 'plain_text')
      when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old)
      else null
    end,
    case
      when tg_op in ('INSERT', 'UPDATE') and tg_table_name = 'notes' then
        (to_jsonb(new) - 'content_json' - 'plain_text')
      when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new)
      else null
    end,
    jsonb_build_object('via', 'audit_row_change')
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists accounts_audit_au on public.accounts;
create trigger accounts_audit_au
  after update on public.accounts
  for each row
  execute function public.audit_row_change();

drop trigger if exists categories_audit_aiu on public.categories;
create trigger categories_audit_aiu
  after insert or update on public.categories
  for each row
  execute function public.audit_row_change();

drop trigger if exists income_sources_audit_aiu on public.income_sources;
create trigger income_sources_audit_aiu
  after insert or update on public.income_sources
  for each row
  execute function public.audit_row_change();

drop trigger if exists financial_goals_audit_aiu on public.financial_goals;
create trigger financial_goals_audit_aiu
  after insert or update on public.financial_goals
  for each row
  execute function public.audit_row_change();

drop trigger if exists loans_audit_aiu on public.loans;
create trigger loans_audit_aiu
  after insert or update on public.loans
  for each row
  execute function public.audit_row_change();

drop trigger if exists budgets_audit_aiu on public.budgets;
create trigger budgets_audit_aiu
  after insert or update on public.budgets
  for each row
  execute function public.audit_row_change();

drop trigger if exists notes_audit_aiu on public.notes;
create trigger notes_audit_aiu
  after insert or update on public.notes
  for each row
  execute function public.audit_row_change();

drop trigger if exists business_clients_audit_aiu on public.business_clients;
create trigger business_clients_audit_aiu
  after insert or update on public.business_clients
  for each row
  execute function public.audit_row_change();

drop trigger if exists business_income_audit_aiu on public.business_income;
create trigger business_income_audit_aiu
  after insert or update on public.business_income
  for each row
  execute function public.audit_row_change();

drop trigger if exists business_expenses_audit_aiu on public.business_expenses;
create trigger business_expenses_audit_aiu
  after insert or update on public.business_expenses
  for each row
  execute function public.audit_row_change();

drop trigger if exists business_targets_audit_aiu on public.business_targets;
create trigger business_targets_audit_aiu
  after insert or update on public.business_targets
  for each row
  execute function public.audit_row_change();

drop trigger if exists app_settings_audit_aiu on public.app_settings;
create trigger app_settings_audit_aiu
  after insert or update on public.app_settings
  for each row
  execute function public.audit_row_change();
