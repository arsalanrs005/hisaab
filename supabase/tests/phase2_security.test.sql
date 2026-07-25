-- Phase 2 database security & finance enforcement tests (pgTAP)
-- Run after migrations + seed: npx supabase test db
--
-- Covers the 36 Phase 2 brief cases with simulated Arsalan / Ali / outsider JWTs.

begin;

create extension if not exists pgtap with schema extensions;
create schema if not exists tests;

select plan(36);

create or replace function tests.authenticate_as(p_user_id uuid, p_email text)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  perform set_config('request.jwt.claim.email', p_email, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', p_user_id::text,
      'email', p_email,
      'role', 'authenticated',
      'aud', 'authenticated'
    )::text,
    true
  );
  execute 'set local role authenticated';
end;
$$;

create or replace function tests.clear_auth()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.email', '', true);
  perform set_config('request.jwt.claims', '{}', true);
  execute 'set local role anon';
end;
$$;

-- Superuser setup (bypasses RLS)
reset role;

do $$
declare
  v_arsalan uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_ali uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_outsider uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  v_au_arsalan uuid;
  v_au_ali uuid;
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) values
    (
      '00000000-0000-0000-0000-000000000000', v_arsalan, 'authenticated', 'authenticated',
      'arsalanrs005@gmail.com', crypt('test-password', gen_salt('bf')),
      timezone('utc', now()), '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb, timezone('utc', now()), timezone('utc', now()), '', '', '', ''
    ),
    (
      '00000000-0000-0000-0000-000000000000', v_ali, 'authenticated', 'authenticated',
      'alirashidd.232@gmail.com', crypt('test-password', gen_salt('bf')),
      timezone('utc', now()), '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb, timezone('utc', now()), timezone('utc', now()), '', '', '', ''
    ),
    (
      '00000000-0000-0000-0000-000000000000', v_outsider, 'authenticated', 'authenticated',
      'outsider@example.com', crypt('test-password', gen_salt('bf')),
      timezone('utc', now()), '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb, timezone('utc', now()), timezone('utc', now()), '', '', '', ''
    )
  on conflict (id) do nothing;

  select id into v_au_arsalan from public.approved_users where email = 'arsalanrs005@gmail.com';
  select id into v_au_ali from public.approved_users where email = 'alirashidd.232@gmail.com';

  insert into public.profiles (id, approved_user_id, email, display_name, onboarding_completed)
  values
    (v_arsalan, v_au_arsalan, 'arsalanrs005@gmail.com', 'Arsalan', true),
    (v_ali, v_au_ali, 'alirashidd.232@gmail.com', 'Ali', true)
  on conflict (id) do update
  set approved_user_id = excluded.approved_user_id,
      display_name = excluded.display_name;

  insert into public.accounts (
    id, name, bank_name, owner_profile_id, account_type, primary_currency,
    opening_balance, is_shared_savings_account, is_active
  ) values
    (
      'a1111111-1111-1111-1111-111111111111',
      'Arsalan Meezan', 'Meezan', v_arsalan, 'savings', 'PKR',
      100000, true, true
    ),
    (
      'a2222222-2222-2222-2222-222222222222',
      'Arsalan HBL', 'HBL', v_arsalan, 'current', 'PKR',
      50000, false, true
    ),
    (
      'a3333333-3333-3333-3333-333333333333',
      'Ali HBL', 'HBL', v_ali, 'current', 'PKR',
      80000, false, true
    )
  on conflict (id) do update
  set opening_balance = excluded.opening_balance,
      is_shared_savings_account = excluded.is_shared_savings_account;
end;
$$;

-- 1. Unauthenticated cannot read accounts
select tests.clear_auth();
select throws_ok(
  $$ select count(*) from public.accounts $$,
  '42501',
  null,
  '1. unauthenticated cannot read accounts'
);

-- 2. Unauthorized authenticated user cannot read application data
select tests.authenticate_as(
  'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
  'outsider@example.com'
);
select is(
  (select count(*)::integer from public.accounts),
  0,
  '2. unauthorized authenticated user sees zero accounts'
);

-- 3. Arsalan can view Ali HBL
select tests.authenticate_as(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'arsalanrs005@gmail.com'
);
select ok(
  exists (
    select 1 from public.accounts
    where id = 'a3333333-3333-3333-3333-333333333333'::uuid
  ),
  '3. Arsalan can view Ali HBL'
);

-- 4. Ali can view Arsalan accounts
select tests.authenticate_as(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'alirashidd.232@gmail.com'
);
select is(
  (
    select count(*)::integer from public.accounts
    where owner_profile_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
  ),
  2,
  '4. Ali can view Arsalan accounts'
);

-- 5. Arsalan cannot update Ali HBL
select tests.authenticate_as(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'arsalanrs005@gmail.com'
);
select is(
  (
    with u as (
      update public.accounts
      set name = 'Hacked Ali HBL'
      where id = 'a3333333-3333-3333-3333-333333333333'::uuid
      returning 1
    )
    select count(*)::integer from u
  ),
  0,
  '5. Arsalan cannot update Ali HBL'
);

-- 6. Ali cannot update Arsalan HBL or Meezan
select tests.authenticate_as(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'alirashidd.232@gmail.com'
);
select is(
  (
    with u as (
      update public.accounts
      set name = 'Hacked'
      where id in (
        'a1111111-1111-1111-1111-111111111111'::uuid,
        'a2222222-2222-2222-2222-222222222222'::uuid
      )
      returning 1
    )
    select count(*)::integer from u
  ),
  0,
  '6. Ali cannot update Arsalan HBL or Meezan'
);

-- 7. Arsalan can create transactions in his accounts
select tests.authenticate_as(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'arsalanrs005@gmail.com'
);
select lives_ok(
  $$
    insert into public.transactions (
      account_id, type, amount_original, currency_original, amount_pkr,
      description, transaction_date, status, created_by
    ) values (
      'a2222222-2222-2222-2222-222222222222',
      'expense', 1000, 'PKR', 1000,
      'Test expense', current_date, 'completed',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    )
  $$,
  '7. Arsalan can create transactions in his accounts'
);

-- 8. Ali can create transactions in Ali HBL
select tests.authenticate_as(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'alirashidd.232@gmail.com'
);
select lives_ok(
  $$
    insert into public.transactions (
      account_id, type, amount_original, currency_original, amount_pkr,
      description, transaction_date, status, created_by
    ) values (
      'a3333333-3333-3333-3333-333333333333',
      'income', 5000, 'PKR', 5000,
      'Test income', current_date, 'completed',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    )
  $$,
  '8. Ali can create transactions in Ali HBL'
);

-- 9. Arsalan cannot create a normal transaction in Ali HBL
select tests.authenticate_as(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'arsalanrs005@gmail.com'
);
select throws_ok(
  $$
    insert into public.transactions (
      account_id, type, amount_original, currency_original, amount_pkr,
      description, transaction_date, status, created_by
    ) values (
      'a3333333-3333-3333-3333-333333333333',
      'expense', 10, 'PKR', 10,
      'Illegal', current_date, 'completed',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    )
  $$,
  '42501',
  null,
  '9. Arsalan cannot create a normal transaction in Ali HBL'
);

-- 10. Ali cannot create a normal transaction in Arsalan Meezan
select tests.authenticate_as(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'alirashidd.232@gmail.com'
);
select throws_ok(
  $$
    insert into public.transactions (
      account_id, type, amount_original, currency_original, amount_pkr,
      description, transaction_date, status, created_by
    ) values (
      'a1111111-1111-1111-1111-111111111111',
      'expense', 10, 'PKR', 10,
      'Illegal', current_date, 'completed',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    )
  $$,
  '42501',
  null,
  '10. Ali cannot create a normal transaction in Arsalan Meezan'
);

-- 11. Ali can transfer from Ali HBL into shared Meezan
select tests.authenticate_as(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'alirashidd.232@gmail.com'
);
select ok(
  (public.create_account_transfer(
    'a3333333-3333-3333-3333-333333333333'::uuid,
    'a1111111-1111-1111-1111-111111111111'::uuid,
    10000, 'PKR', 1, 10000, current_date, 'Ali contribution'
  ) ->> 'transfer_id') is not null,
  '11. Ali can transfer from Ali HBL into shared Meezan'
);

-- 12. Ali cannot transfer out of Arsalan Meezan
select throws_ok(
  $$
    select public.create_account_transfer(
      'a1111111-1111-1111-1111-111111111111'::uuid,
      'a3333333-3333-3333-3333-333333333333'::uuid,
      100, 'PKR', 1, 100, current_date, 'Illegal'
    )
  $$,
  'P0001',
  'Only the source account owner may initiate a transfer',
  '12. Ali cannot transfer out of Arsalan Meezan'
);

-- 13. Arsalan can transfer out of Arsalan-owned accounts
select tests.authenticate_as(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'arsalanrs005@gmail.com'
);
select ok(
  (public.create_account_transfer(
    'a2222222-2222-2222-2222-222222222222'::uuid,
    'a1111111-1111-1111-1111-111111111111'::uuid,
    2000, 'PKR', 1, 2000, current_date, 'Arsalan to Meezan'
  ) ->> 'transfer_id') is not null,
  '13. Arsalan can transfer out of Arsalan-owned accounts'
);

-- 14. A transfer creates exactly two linked transactions
select is(
  (
    select count(*)::integer
    from public.transactions t
    join public.transfers tr on tr.id = t.transfer_id
    where tr.notes = 'Ali contribution'
  ),
  2,
  '14. A transfer creates exactly two linked transactions'
);

-- 15. A failed transfer creates no transfer or transaction rows
select tests.authenticate_as(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'alirashidd.232@gmail.com'
);
do $$
declare
  v_transfers_before integer;
  v_tx_before integer;
  v_transfers_after integer;
  v_tx_after integer;
begin
  select count(*) into v_transfers_before from public.transfers;
  select count(*) into v_tx_before from public.transactions;
  begin
    perform public.create_account_transfer(
      'a3333333-3333-3333-3333-333333333333'::uuid,
      'a1111111-1111-1111-1111-111111111111'::uuid,
      999999999, 'PKR', 1, 999999999, current_date, 'should-fail-insufficient'
    );
  exception when others then
    null;
  end;
  select count(*) into v_transfers_after from public.transfers;
  select count(*) into v_tx_after from public.transactions;
  perform set_config(
    'tests.failed_transfer_clean',
    (v_transfers_before = v_transfers_after and v_tx_before = v_tx_after)::text,
    true
  );
end;
$$;
select is(
  current_setting('tests.failed_transfer_clean', true),
  'true',
  '15. A failed transfer creates no transfer or transaction rows'
);

-- 16. Insufficient funds rejects the transfer
select throws_ok(
  $$
    select public.create_account_transfer(
      'a3333333-3333-3333-3333-333333333333'::uuid,
      'a1111111-1111-1111-1111-111111111111'::uuid,
      999999999, 'PKR', 1, 999999999, current_date, 'overdraft'
    )
  $$,
  'P0001',
  null,
  '16. Insufficient funds rejects the transfer'
);

-- 17. Transfer into shared Meezan records the correct contributor
select ok(
  exists (
    select 1
    from public.account_contributions c
    join public.transfers tr on tr.id = c.transfer_id
    where tr.notes = 'Ali contribution'
      and c.contributor_profile_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid
      and c.account_id = 'a1111111-1111-1111-1111-111111111111'::uuid
      and c.contribution_type = 'deposit'
  ),
  '17. Transfer into shared Meezan records Ali as contributor'
);

-- 18–22 balance status effects
select tests.authenticate_as(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'arsalanrs005@gmail.com'
);
do $$
declare
  v_acc uuid := 'a2222222-2222-2222-2222-222222222222';
  v_actor uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_base numeric;
  v_after_completed numeric;
  v_after_pending numeric;
  v_after_expected numeric;
  v_after_cancelled numeric;
  v_arch_id uuid;
  v_before_archive numeric;
begin
  v_base := public.account_actual_balance(v_acc);

  insert into public.transactions (
    account_id, type, amount_original, currency_original, amount_pkr,
    description, transaction_date, status, created_by
  ) values (
    v_acc, 'income', 3000, 'PKR', 3000, 'completed income', current_date, 'completed', v_actor
  );
  v_after_completed := public.account_actual_balance(v_acc);

  insert into public.transactions (
    account_id, type, amount_original, currency_original, amount_pkr,
    description, transaction_date, status, created_by
  ) values (
    v_acc, 'income', 4000, 'PKR', 4000, 'pending income', current_date, 'pending', v_actor
  );
  v_after_pending := public.account_actual_balance(v_acc);

  insert into public.transactions (
    account_id, type, amount_original, currency_original, amount_pkr,
    description, transaction_date, status, created_by
  ) values (
    v_acc, 'income', 5000, 'PKR', 5000, 'expected income', current_date, 'expected', v_actor
  );
  v_after_expected := public.account_actual_balance(v_acc);

  insert into public.transactions (
    account_id, type, amount_original, currency_original, amount_pkr,
    description, transaction_date, status, created_by
  ) values (
    v_acc, 'income', 6000, 'PKR', 6000, 'cancelled income', current_date, 'cancelled', v_actor
  );
  v_after_cancelled := public.account_actual_balance(v_acc);

  insert into public.transactions (
    account_id, type, amount_original, currency_original, amount_pkr,
    description, transaction_date, status, created_by
  ) values (
    v_acc, 'expense', 700, 'PKR', 700, 'to archive', current_date, 'completed', v_actor
  )
  returning id into v_arch_id;

  v_before_archive := public.account_actual_balance(v_acc);
  perform public.archive_transaction(v_arch_id);

  perform set_config('tests.bal_completed', (v_after_completed = v_base + 3000)::text, true);
  perform set_config('tests.bal_pending', (v_after_pending = v_after_completed)::text, true);
  perform set_config('tests.bal_expected', (v_after_expected = v_after_pending)::text, true);
  perform set_config('tests.bal_cancelled', (v_after_cancelled = v_after_expected)::text, true);
  perform set_config(
    'tests.bal_archived',
    (public.account_actual_balance(v_acc) = v_before_archive + 700)::text,
    true
  );
end;
$$;

select is(current_setting('tests.bal_completed', true), 'true', '18. Completed transactions affect actual balance');
select is(current_setting('tests.bal_pending', true), 'true', '19. Pending transactions do not affect actual balance');
select is(current_setting('tests.bal_expected', true), 'true', '20. Expected transactions do not affect actual balance');
select is(current_setting('tests.bal_cancelled', true), 'true', '21. Cancelled transactions do not affect actual balance');
select is(current_setting('tests.bal_archived', true), 'true', '22. Archived transactions do not affect actual balance');

-- 23. Reconciliation creates adjustment; opening balance unchanged
do $$
declare
  v_acc uuid := 'a2222222-2222-2222-2222-222222222222';
  v_opening numeric;
  v_result jsonb;
begin
  select opening_balance into v_opening from public.accounts where id = v_acc;
  v_result := public.reconcile_account_balance(
    v_acc,
    public.account_actual_balance(v_acc) + 150,
    'Bank statement variance',
    timezone('utc', now())
  );
  perform set_config(
    'tests.reconcile_ok',
    (
      (select opening_balance from public.accounts where id = v_acc) = v_opening
      and (v_result ->> 'adjustment_amount')::numeric = 150
      and (v_result ->> 'balance_adjustment_id') is not null
      and (v_result ->> 'transaction_id') is not null
    )::text,
    true
  );
end;
$$;
select is(
  current_setting('tests.reconcile_ok', true),
  'true',
  '23. Reconciliation creates adjustment; opening balance unchanged'
);

-- 24. Only account owner can reconcile
select tests.authenticate_as(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'alirashidd.232@gmail.com'
);
select throws_ok(
  $$
    select public.reconcile_account_balance(
      'a2222222-2222-2222-2222-222222222222'::uuid,
      1,
      'Nope',
      timezone('utc', now())
    )
  $$,
  'P0001',
  'Only the account owner may reconcile',
  '24. Only account owner can reconcile'
);

-- 25. Linked transfer transactions cannot be archived individually
select tests.authenticate_as(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'alirashidd.232@gmail.com'
);
select throws_ok(
  $$
    do $inner$
    declare
      v_out uuid;
      v_transfer uuid;
    begin
      select id into v_transfer
      from public.transfers
      where notes = 'Ali contribution'
      limit 1;

      select id into v_out
      from public.transactions
      where transfer_id = v_transfer and type = 'transfer_out';

      perform public.archive_transaction(v_out);
    end;
    $inner$;
  $$,
  'P0001',
  'Linked transfers cannot be archived as individual transactions.',
  '25. Linked transfer transactions cannot be archived individually'
);

-- 26. Audit logs cannot be updated or deleted by users
select tests.authenticate_as(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'arsalanrs005@gmail.com'
);
select ok(
  (
    with upd as (
      update public.audit_logs set action = 'hacked' returning 1
    ),
    del as (
      delete from public.audit_logs returning 1
    )
    select (select count(*) from upd) = 0
       and (select count(*) from del) = 0
  ),
  '26. Audit logs cannot be updated or deleted by users'
);

-- 27. Shared notes visible to both
select tests.authenticate_as(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'arsalanrs005@gmail.com'
);
insert into public.notes (id, title, plain_text, visibility, owner_profile_id, created_by)
values (
  'n1111111-1111-1111-1111-111111111111',
  'Shared plan', 'Hello', 'shared',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
)
on conflict (id) do nothing;

select tests.authenticate_as(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'alirashidd.232@gmail.com'
);
select ok(
  exists (
    select 1 from public.notes
    where id = 'n1111111-1111-1111-1111-111111111111'::uuid
  ),
  '27. Shared notes are visible to both'
);

-- 28. Personal notes visible only to owner
select tests.authenticate_as(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'arsalanrs005@gmail.com'
);
insert into public.notes (id, title, plain_text, visibility, owner_profile_id, created_by)
values (
  'n2222222-2222-2222-2222-222222222222',
  'Arsalan private', 'Secret', 'personal',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
)
on conflict (id) do nothing;

select tests.authenticate_as(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'alirashidd.232@gmail.com'
);
select is(
  (
    select count(*)::integer from public.notes
    where id = 'n2222222-2222-2222-2222-222222222222'::uuid
  ),
  0,
  '28. Personal notes are visible only to their owner'
);

-- 29. Both users can manage shared goals
select tests.authenticate_as(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'arsalanrs005@gmail.com'
);
insert into public.financial_goals (
  id, name, goal_type, ownership_type, target_amount, starting_amount, created_by
) values (
  'g1111111-1111-1111-1111-111111111111',
  'House', 'savings', 'shared', 5000000, 0,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
)
on conflict (id) do nothing;

select tests.authenticate_as(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'alirashidd.232@gmail.com'
);
select lives_ok(
  $$
    update public.financial_goals
    set description = 'Updated by Ali'
    where id = 'g1111111-1111-1111-1111-111111111111'
  $$,
  '29. Both users can manage shared goals'
);

-- 30. Cannot edit the other user’s personal goal
select tests.authenticate_as(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'arsalanrs005@gmail.com'
);
insert into public.financial_goals (
  id, name, goal_type, ownership_type, owner_profile_id, target_amount, created_by
) values (
  'g2222222-2222-2222-2222-222222222222',
  'Personal buffer', 'savings', 'personal',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100000,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
)
on conflict (id) do nothing;

select tests.authenticate_as(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'alirashidd.232@gmail.com'
);
select is(
  (
    with u as (
      update public.financial_goals
      set name = 'Hacked'
      where id = 'g2222222-2222-2222-2222-222222222222'
      returning 1
    )
    select count(*)::integer from u
  ),
  0,
  '30. A user cannot edit the other user’s personal goal'
);

-- 31. Both users can view loans
select tests.authenticate_as(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'arsalanrs005@gmail.com'
);
insert into public.loans (
  id, name, owner_profile_id, original_amount, starting_remaining_balance, created_by
) values (
  'l1111111-1111-1111-1111-111111111111',
  'Car loan', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  500000, 420000, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
)
on conflict (id) do nothing;

select tests.authenticate_as(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'alirashidd.232@gmail.com'
);
select ok(
  exists (
    select 1 from public.loans
    where id = 'l1111111-1111-1111-1111-111111111111'
  ),
  '31. Both users can view loans'
);

-- 32. Only loan owner can edit a loan
select is(
  (
    with u as (
      update public.loans
      set notes = 'Ali edit'
      where id = 'l1111111-1111-1111-1111-111111111111'
      returning 1
    )
    select count(*)::integer from u
  ),
  0,
  '32. Only loan owner can edit a loan'
);

-- 33. Both users can manage shared business records
select tests.authenticate_as(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'arsalanrs005@gmail.com'
);
insert into public.business_clients (id, name, created_by)
values (
  'c1111111-1111-1111-1111-111111111111',
  'QuestRock',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
)
on conflict (id) do nothing;

select tests.authenticate_as(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'alirashidd.232@gmail.com'
);
select lives_ok(
  $$
    update public.business_clients
    set notes = 'Managed by Ali'
    where id = 'c1111111-1111-1111-1111-111111111111'
  $$,
  '33. Both users can manage shared business records'
);

-- 34. Cannot change another account’s owner
select is(
  (
    with u as (
      update public.accounts
      set owner_profile_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
      where id = 'a1111111-1111-1111-1111-111111111111'
      returning 1
    )
    select count(*)::integer from u
  ),
  0,
  '34. A user cannot change another account’s owner'
);

-- 35. Direct insertion of transfer transactions is rejected
select tests.authenticate_as(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'arsalanrs005@gmail.com'
);
select throws_ok(
  $$
    insert into public.transactions (
      account_id, type, amount_original, currency_original, amount_pkr,
      description, transaction_date, status, direction, created_by
    ) values (
      'a2222222-2222-2222-2222-222222222222',
      'transfer_out', 1, 'PKR', 1,
      'direct transfer', current_date, 'completed', -1,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    )
  $$,
  'P0001',
  null,
  '35. Direct insertion of transfer transactions is rejected'
);

-- 36. Direct insertion of balance-adjustment transactions is rejected
select throws_ok(
  $$
    insert into public.transactions (
      account_id, type, amount_original, currency_original, amount_pkr,
      description, transaction_date, status, direction, created_by
    ) values (
      'a2222222-2222-2222-2222-222222222222',
      'balance_adjustment', 1, 'PKR', 1,
      'direct adj', current_date, 'completed', 1,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    )
  $$,
  'P0001',
  null,
  '36. Direct insertion of balance-adjustment transactions is rejected'
);

select * from finish();
rollback;
