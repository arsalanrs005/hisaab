-- Phase 4 database tests: idempotency, immutability, metrics, notifications
-- Run after migrations + seed: npm run supabase:test

begin;

create extension if not exists pgtap with schema extensions;
create schema if not exists tests;

select plan(14);

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

reset role;

do $$
declare
  v_arsalan uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_ali uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
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

select tests.authenticate_as(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'arsalanrs005@gmail.com'
);
do $$
begin
  perform public.create_account_transfer(
    'a2222222-2222-2222-2222-222222222222'::uuid,
    'a1111111-1111-1111-1111-111111111111'::uuid,
    2000, 'PKR', 1, 2000, current_date, 'Arsalan to Meezan'
  );
end;
$$;

-- 1. Arsalan cannot transfer out of Ali HBL
select tests.authenticate_as(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'arsalanrs005@gmail.com'
);
select throws_ok(
  $$
    select public.create_account_transfer(
      'a3333333-3333-3333-3333-333333333333'::uuid,
      'a1111111-1111-1111-1111-111111111111'::uuid,
      100, 'PKR', 1, 100, current_date, 'cross-owner source'
    )
  $$,
  'P0001',
  'Only the source account owner may initiate a transfer',
  '1. Arsalan cannot transfer out of Ali HBL'
);

-- 2. Source and destination cannot match
select throws_ok(
  $$
    select public.create_account_transfer(
      'a2222222-2222-2222-2222-222222222222'::uuid,
      'a2222222-2222-2222-2222-222222222222'::uuid,
      100, 'PKR', 1, 100, current_date, 'same account'
    )
  $$,
  'P0001',
  'Source and destination accounts must differ',
  '2. Source and destination cannot match'
);

-- 3. Zero transfer is rejected
select throws_ok(
  $$
    select public.create_account_transfer(
      'a2222222-2222-2222-2222-222222222222'::uuid,
      'a1111111-1111-1111-1111-111111111111'::uuid,
      0, 'PKR', 1, 0, current_date, 'zero'
    )
  $$,
  'P0001',
  'amount_original must be > 0',
  '3. Zero transfer is rejected'
);

-- 4. Repeated idempotency key does not duplicate a transfer
do $$
declare
  v_key uuid := 'd1111111-1111-1111-1111-111111111111';
  v_first jsonb;
  v_second jsonb;
  v_count integer;
begin
  v_first := public.create_account_transfer(
    'a2222222-2222-2222-2222-222222222222'::uuid,
    'a1111111-1111-1111-1111-111111111111'::uuid,
    500, 'PKR', 1, 500, current_date, 'idempotent', v_key
  );
  v_second := public.create_account_transfer(
    'a2222222-2222-2222-2222-222222222222'::uuid,
    'a1111111-1111-1111-1111-111111111111'::uuid,
    500, 'PKR', 1, 500, current_date, 'idempotent', v_key
  );

  select count(*) into v_count from public.transfers where idempotency_key = v_key;

  perform set_config(
    'tests.idempotency',
    (
      (v_first->>'transfer_id') = (v_second->>'transfer_id')
      and coalesce(v_second->>'deduplicated', 'false') = 'true'
      and v_count = 1
    )::text,
    true
  );
end;
$$;
select is(current_setting('tests.idempotency', true), 'true', '4. Repeated idempotency key does not duplicate a transfer');

-- 5. Transfer to non-shared account does not create a contribution
do $$
declare
  v_result jsonb;
  v_transfer uuid;
begin
  v_result := public.create_account_transfer(
    'a2222222-2222-2222-2222-222222222222'::uuid,
    'a3333333-3333-3333-3333-333333333333'::uuid,
    300, 'PKR', 1, 300, current_date, 'Arsalan HBL to Ali HBL'
  );
  v_transfer := (v_result->>'transfer_id')::uuid;
  perform set_config(
    'tests.no_contrib',
    (
      select count(*) = 0
      from public.account_contributions
      where transfer_id = v_transfer
    )::text,
    true
  );
end;
$$;
select is(current_setting('tests.no_contrib', true), 'true', '5. Transfer to non-shared account does not create a contribution');

-- 6. Arsalan-to-Meezan transfer records Arsalan contribution
select is(
  (
    select count(*)::integer
    from public.account_contributions c
    join public.transfers t on t.id = c.transfer_id
    where t.notes = 'Arsalan to Meezan'
      and c.contributor_profile_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
  ),
  1,
  '6. Arsalan-to-Meezan transfer records Arsalan contribution'
);

-- 7. Balance-adjustment transaction cannot be archived directly
select tests.authenticate_as(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'arsalanrs005@gmail.com'
);
do $$
declare
  v_adj uuid;
begin
  perform public.reconcile_account_balance(
    'a2222222-2222-2222-2222-222222222222'::uuid,
    public.account_actual_balance('a2222222-2222-2222-2222-222222222222'::uuid) - 100,
    'Test negative adjustment',
    timezone('utc', now())
  );
  select t.id into v_adj
  from public.transactions t
  where t.account_id = 'a2222222-2222-2222-2222-222222222222'::uuid
    and t.type = 'balance_adjustment'
  order by t.created_at desc
  limit 1;
  perform set_config('tests.adj_id', v_adj::text, true);
end;
$$;
select throws_ok(
  $$
    select public.archive_transaction(current_setting('tests.adj_id')::uuid)
  $$,
  'P0001',
  'Balance corrections cannot be archived. Create a new reconciliation to correct the balance.',
  '7. Balance-adjustment transaction cannot be archived directly'
);

-- 8. Zero-difference reconciliation creates no adjustment transaction
do $$
declare
  v_acc uuid := 'a2222222-2222-2222-2222-222222222222';
  v_before integer;
  v_after integer;
  v_result jsonb;
begin
  select count(*) into v_before
  from public.transactions
  where account_id = v_acc and type = 'balance_adjustment';

  v_result := public.reconcile_account_balance(
    v_acc,
    public.account_actual_balance(v_acc),
    'Confirmed match',
    timezone('utc', now())
  );

  select count(*) into v_after
  from public.transactions
  where account_id = v_acc and type = 'balance_adjustment';

  perform set_config(
    'tests.zero_reconcile',
    (
      v_result->>'transaction_id' is null
      and v_before = v_after
    )::text,
    true
  );
end;
$$;
select is(current_setting('tests.zero_reconcile', true), 'true', '8. Zero-difference reconciliation creates no adjustment transaction');

-- 9. Internal transfer does not change combined total balance
do $$
declare
  v_before numeric;
  v_after numeric;
begin
  select coalesce(sum(public.account_actual_balance(id)), 0)
  into v_before
  from public.accounts
  where is_active;

  perform public.create_account_transfer(
    'a2222222-2222-2222-2222-222222222222'::uuid,
    'a1111111-1111-1111-1111-111111111111'::uuid,
    250, 'PKR', 1, 250, current_date, 'combined total check'
  );

  select coalesce(sum(public.account_actual_balance(id)), 0)
  into v_after
  from public.accounts
  where is_active;

  perform set_config('tests.combined_total', (v_before = v_after)::text, true);
end;
$$;
select is(current_setting('tests.combined_total', true), 'true', '9. Internal transfer does not change combined total balance');

-- 10. Users can read audit logs
select isnt_empty(
  $$ select 1 from public.audit_logs limit 1 $$,
  '10. Users can read audit logs'
);

-- 11. Users cannot insert audit logs directly
select throws_ok(
  $$
    insert into public.audit_logs (
      actor_profile_id, action, entity_type, entity_id
    ) values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      'fake.action', 'account', 'a2222222-2222-2222-2222-222222222222'::uuid
    )
  $$,
  '42501',
  null,
  '11. Users cannot insert audit logs directly'
);

-- 12. Users can read only their own notifications
select tests.authenticate_as(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'alirashidd.232@gmail.com'
);
select is(
  (
    select count(*)::integer
    from public.notifications
    where profile_id <> 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid
  ),
  0,
  '12. Users cannot read another user''s notifications'
);

-- 13. Transfer notifications are deduplicated on retry
do $$
declare
  v_key uuid := 'd2222222-2222-2222-2222-222222222222';
  v_transfer uuid;
  v_count integer;
begin
  perform public.create_account_transfer(
    'a3333333-3333-3333-3333-333333333333'::uuid,
    'a1111111-1111-1111-1111-111111111111'::uuid,
    100, 'PKR', 1, 100, current_date, 'notify dedup', v_key
  );

  select id into v_transfer from public.transfers where idempotency_key = v_key;

  perform public.create_account_transfer(
    'a3333333-3333-3333-3333-333333333333'::uuid,
    'a1111111-1111-1111-1111-111111111111'::uuid,
    100, 'PKR', 1, 100, current_date, 'notify dedup', v_key
  );

  select count(*) into v_count
  from public.notifications
  where related_entity_type = 'transfer'
    and related_entity_id = v_transfer::text
    and deduplication_key like 'transfer:' || v_transfer::text || '%';

  perform set_config('tests.notify_dedup', (v_count <= 2)::text, true);
end;
$$;
select is(current_setting('tests.notify_dedup', true), 'true', '13. Transfer notifications are deduplicated on retry');

-- 14. Ali cannot reconcile Arsalan HBL
select throws_ok(
  $$
    select public.reconcile_account_balance(
      'a2222222-2222-2222-2222-222222222222'::uuid,
      1,
      'Cross owner',
      timezone('utc', now())
    )
  $$,
  'P0001',
  'Only the account owner may reconcile',
  '14. Ali cannot reconcile Arsalan HBL'
);

select * from finish();
rollback;
