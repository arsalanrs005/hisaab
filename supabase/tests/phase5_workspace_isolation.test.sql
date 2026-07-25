-- Phase 5 database tests: workspace isolation (pgTAP)
-- Run after migrations + seed: npx supabase test db

begin;

create extension if not exists pgtap with schema extensions;
create schema if not exists tests;

select plan(29);

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

reset role;

do $$
declare
  v_arsalan uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_ali uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_anum uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  v_sarah uuid := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  v_ws_shared uuid := '11111111-1111-4111-8111-111111111111';
  v_ws_anum uuid := '22222222-2222-4222-8222-222222222222';
  v_ws_sarah uuid := '33333333-3333-4333-8333-333333333333';
  v_au_arsalan uuid;
  v_au_ali uuid;
  v_au_anum uuid;
  v_au_sarah uuid;
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
      '00000000-0000-0000-0000-000000000000', v_anum, 'authenticated', 'authenticated',
      'anum112004@gmail.com', crypt('test-password', gen_salt('bf')),
      timezone('utc', now()), '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb, timezone('utc', now()), timezone('utc', now()), '', '', '', ''
    ),
    (
      '00000000-0000-0000-0000-000000000000', v_sarah, 'authenticated', 'authenticated',
      'sarahbatool23@gmail.com', crypt('test-password', gen_salt('bf')),
      timezone('utc', now()), '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb, timezone('utc', now()), timezone('utc', now()), '', '', '', ''
    )
  on conflict (id) do nothing;

  select id into v_au_arsalan from public.approved_users where email = 'arsalanrs005@gmail.com';
  select id into v_au_ali from public.approved_users where email = 'alirashidd.232@gmail.com';
  select id into v_au_anum from public.approved_users where email = 'anum112004@gmail.com';
  select id into v_au_sarah from public.approved_users where email = 'sarahbatool23@gmail.com';

  insert into public.profiles (id, approved_user_id, email, display_name, onboarding_completed)
  values
    (v_arsalan, v_au_arsalan, 'arsalanrs005@gmail.com', 'Arsalan', true),
    (v_ali, v_au_ali, 'alirashidd.232@gmail.com', 'Ali', true),
    (v_anum, v_au_anum, 'anum112004@gmail.com', 'Anum Shahid', true),
    (v_sarah, v_au_sarah, 'sarahbatool23@gmail.com', 'Sarah Batool', true)
  on conflict (id) do update
  set approved_user_id = excluded.approved_user_id,
      display_name = excluded.display_name,
      onboarding_completed = true;

  delete from public.workspace_memberships
  where profile_id in (v_arsalan, v_ali, v_anum, v_sarah);

  insert into public.workspace_memberships (workspace_id, profile_id, role, is_active)
  values
    (v_ws_shared, v_arsalan, 'admin', true),
    (v_ws_shared, v_ali, 'admin', true),
    (v_ws_anum, v_anum, 'admin', true),
    (v_ws_sarah, v_sarah, 'admin', true);

  insert into public.accounts (
    id, name, bank_name, owner_profile_id, account_type, primary_currency,
    opening_balance, is_shared_savings_account, is_active, workspace_id
  ) values
    (
      'a1111111-1111-1111-1111-111111111111',
      'Meezan', 'Meezan', v_arsalan, 'savings', 'PKR',
      100000, true, true, v_ws_shared
    ),
    (
      'a2222222-2222-2222-2222-222222222222',
      'Arsalan HBL', 'HBL', v_arsalan, 'current', 'PKR',
      50000, false, true, v_ws_shared
    ),
    (
      'a3333333-3333-3333-3333-333333333333',
      'Ali HBL', 'HBL', v_ali, 'current', 'PKR',
      80000, false, true, v_ws_shared
    ),
    (
      'b1111111-1111-1111-1111-111111111111',
      'Anum Meezan', 'Meezan', v_anum, 'savings', 'PKR',
      60000, false, true, v_ws_anum
    ),
    (
      'b2222222-2222-2222-2222-222222222222',
      'Anum UBL', 'UBL', v_anum, 'current', 'PKR',
      45000, false, true, v_ws_anum
    ),
    (
      'b3333333-3333-3333-3333-333333333333',
      'Anum Nayapay', 'Nayapay', v_anum, 'other', 'PKR',
      12000, false, true, v_ws_anum
    ),
    (
      'c1111111-1111-1111-1111-111111111111',
      'Sarah Nayapay', 'Nayapay', v_sarah, 'other', 'PKR',
      15000, false, true, v_ws_sarah
    ),
    (
      'c2222222-2222-2222-2222-222222222222',
      'Sarah Sadapay', 'Sadapay', v_sarah, 'other', 'PKR',
      9000, false, true, v_ws_sarah
    )
  on conflict (id) do update
  set opening_balance = excluded.opening_balance,
      is_shared_savings_account = excluded.is_shared_savings_account,
      workspace_id = excluded.workspace_id,
      owner_profile_id = excluded.owner_profile_id,
      is_active = true;

  insert into public.transactions (
    account_id, type, amount_original, currency_original, amount_pkr,
    description, transaction_date, status, created_by, workspace_id
  ) values (
    'a2222222-2222-2222-2222-222222222222',
    'expense', 2500, 'PKR', 2500,
    'Shared workspace seed expense', current_date, 'completed',
    v_arsalan, v_ws_shared
  );

  insert into public.transactions (
    account_id, type, amount_original, currency_original, amount_pkr,
    description, transaction_date, status, created_by, workspace_id
  ) values (
    'b1111111-1111-1111-1111-111111111111',
    'income', 3000, 'PKR', 3000,
    'Anum workspace seed income', current_date, 'completed',
    v_anum, v_ws_anum
  );

  insert into public.audit_logs (
    actor_profile_id, action, entity_type, entity_id, account_id, workspace_id
  ) values (
    v_arsalan, 'test.workspace_seed', 'account',
    'a2222222-2222-2222-2222-222222222222',
    'a2222222-2222-2222-2222-222222222222',
    v_ws_shared
  );

  insert into public.notifications (
    profile_id, type, title, message, related_entity_type, related_entity_id,
    deduplication_key, workspace_id
  ) values (
    v_arsalan, 'system', 'Shared workspace notice',
    'Arsalan notification in shared workspace', 'account',
    'a1111111-1111-1111-1111-111111111111',
    'phase5-test:shared:arsalan',
    v_ws_shared
  );
end;
$$;

-- 1–3. Workspace membership access: Anum cannot see shared accounts
select tests.authenticate_as(
  'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
  'anum112004@gmail.com'
);
select is(
  (
    select count(*)::integer from public.accounts
    where id = 'a1111111-1111-1111-1111-111111111111'::uuid
  ),
  0,
  '1. Anum cannot see shared workspace Meezan account'
);
select is(
  (
    select count(*)::integer from public.accounts
    where id = 'a2222222-2222-2222-2222-222222222222'::uuid
  ),
  0,
  '2. Anum cannot see shared workspace Arsalan HBL'
);
select is(
  (select count(*)::integer from public.accounts),
  3,
  '3. Anum sees exactly 3 accounts in her workspace'
);

-- 4–6. Arsalan cannot see Anum accounts
select tests.authenticate_as(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'arsalanrs005@gmail.com'
);
select is(
  (
    select count(*)::integer from public.accounts
    where id = 'b1111111-1111-1111-1111-111111111111'::uuid
  ),
  0,
  '4. Arsalan cannot see Anum Meezan account'
);
select is(
  (
    select count(*)::integer from public.accounts
    where id = 'b2222222-2222-2222-2222-222222222222'::uuid
  ),
  0,
  '5. Arsalan cannot see Anum UBL account'
);
select is(
  (select count(*)::integer from public.accounts),
  3,
  '6. Arsalan sees exactly 3 shared workspace accounts'
);

-- 7. Ali can view shared Meezan
select tests.authenticate_as(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'alirashidd.232@gmail.com'
);
select ok(
  exists (
    select 1 from public.accounts
    where id = 'a1111111-1111-1111-1111-111111111111'::uuid
  ),
  '7. Ali can view shared workspace Meezan account'
);

-- 8–9. Sarah isolated from other workspaces
select tests.authenticate_as(
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid,
  'sarahbatool23@gmail.com'
);
select is(
  (
    select count(*)::integer from public.accounts
    where workspace_id = '22222222-2222-4222-8222-222222222222'::uuid
  ),
  0,
  '8. Sarah cannot see Anum workspace accounts'
);
select is(
  (select count(*)::integer from public.accounts),
  2,
  '9. Sarah sees exactly 2 accounts in her workspace'
);

-- 10–12. Cross-workspace account creation rejected or allowed in own workspace
select tests.authenticate_as(
  'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
  'anum112004@gmail.com'
);
select throws_ok(
  $$
    insert into public.accounts (
      id, name, bank_name, owner_profile_id, account_type, primary_currency,
      opening_balance, is_shared_savings_account, is_active, workspace_id
    ) values (
      'b4444444-4444-4444-4444-444444444444',
      'Illegal Shared', 'HBL',
      'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
      'current', 'PKR', 1000, false, true,
      '11111111-1111-4111-8111-111111111111'::uuid
    )
  $$,
  '42501',
  null,
  '10. Anum cannot create an account in the shared workspace'
);

select tests.authenticate_as(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'arsalanrs005@gmail.com'
);
select throws_ok(
  $$
    insert into public.accounts (
      id, name, bank_name, owner_profile_id, account_type, primary_currency,
      opening_balance, is_shared_savings_account, is_active, workspace_id
    ) values (
      'b5555555-5555-5555-5555-555555555555',
      'Illegal Anum', 'HBL',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      'current', 'PKR', 1000, false, true,
      '22222222-2222-4222-8222-222222222222'::uuid
    )
  $$,
  '42501',
  null,
  '11. Arsalan cannot create an account in Anum workspace'
);

select tests.authenticate_as(
  'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
  'anum112004@gmail.com'
);
select lives_ok(
  $$
    insert into public.accounts (
      id, name, bank_name, owner_profile_id, account_type, primary_currency,
      opening_balance, is_shared_savings_account, is_active, workspace_id
    ) values (
      'b4444444-4444-4444-4444-444444444444',
      'Anum JazzCash', 'JazzCash',
      'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
      'other', 'PKR', 5000, false, true,
      '22222222-2222-4222-8222-222222222222'::uuid
    )
    on conflict (id) do nothing
  $$,
  '12. Anum can create an account in her own workspace'
);

-- 13–14. Cross-workspace transaction queries return nothing
select tests.authenticate_as(
  'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
  'anum112004@gmail.com'
);
select is(
  (
    select count(*)::integer from public.transactions
    where workspace_id = '11111111-1111-4111-8111-111111111111'::uuid
  ),
  0,
  '13. Anum cannot read shared workspace transactions'
);

select tests.authenticate_as(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'arsalanrs005@gmail.com'
);
select is(
  (
    select count(*)::integer from public.transactions
    where workspace_id = '22222222-2222-4222-8222-222222222222'::uuid
  ),
  0,
  '14. Arsalan cannot read Anum workspace transactions'
);

-- 15–16. Ali can transfer within shared workspace
select tests.authenticate_as(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'alirashidd.232@gmail.com'
);
select ok(
  (public.create_account_transfer(
    'a3333333-3333-3333-3333-333333333333'::uuid,
    'a1111111-1111-1111-1111-111111111111'::uuid,
    5000, 'PKR', 1, 5000, current_date, 'Ali to shared Meezan'
  ) ->> 'transfer_id') is not null,
  '15. Ali can transfer Ali HBL to shared Meezan'
);
select is(
  (
    select count(*)::integer
    from public.transactions t
    join public.transfers tr on tr.id = t.transfer_id
    where tr.notes = 'Ali to shared Meezan'
  ),
  2,
  '16. Shared workspace transfer creates exactly two linked transactions'
);

-- 17–18. Cross-workspace transfer rejected with no partial rows
select tests.authenticate_as(
  'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
  'anum112004@gmail.com'
);
select throws_ok(
  $$
    select public.create_account_transfer(
      'b3333333-3333-3333-3333-333333333333'::uuid,
      'a1111111-1111-1111-1111-111111111111'::uuid,
      1000, 'PKR', 1, 1000, current_date, 'Anum to Arsalan Meezan'
    )
  $$,
  'P0001',
  'Source and destination accounts must belong to the same workspace',
  '17. Anum cannot transfer to Arsalan Meezan across workspaces'
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
      'b1111111-1111-1111-1111-111111111111'::uuid,
      'a2222222-2222-2222-2222-222222222222'::uuid,
      500, 'PKR', 1, 500, current_date, 'cross-workspace partial check'
    );
  exception when others then
    null;
  end;

  select count(*) into v_transfers_after from public.transfers;
  select count(*) into v_tx_after from public.transactions;

  perform set_config(
    'tests.cross_workspace_transfer_clean',
    (v_transfers_before = v_transfers_after and v_tx_before = v_tx_after)::text,
    true
  );
end;
$$;
select is(
  current_setting('tests.cross_workspace_transfer_clean', true),
  'true',
  '18. Cross-workspace transfer failure leaves no partial rows'
);

-- 19–20. Reconciliation scoped to workspace owner
select tests.authenticate_as(
  'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
  'anum112004@gmail.com'
);
select ok(
  (public.reconcile_account_balance(
    'b2222222-2222-2222-2222-222222222222'::uuid,
    public.account_actual_balance('b2222222-2222-2222-2222-222222222222'::uuid) + 75,
    'Anum UBL statement variance',
    timezone('utc', now())
  ) ->> 'balance_adjustment_id') is not null,
  '19. Anum can reconcile her own UBL account'
);

select tests.authenticate_as(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'arsalanrs005@gmail.com'
);
select throws_ok(
  $$
    select public.reconcile_account_balance(
      'b2222222-2222-2222-2222-222222222222'::uuid,
      1,
      'Cross-workspace reconcile',
      timezone('utc', now())
    )
  $$,
  'P0001',
  null,
  '20. Arsalan cannot reconcile Anum UBL account'
);

-- 21–22. Audit logs scoped by workspace
select tests.authenticate_as(
  'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
  'anum112004@gmail.com'
);
select is(
  (
    select count(*)::integer from public.audit_logs
    where workspace_id = '11111111-1111-4111-8111-111111111111'::uuid
  ),
  0,
  '21. Anum cannot read shared workspace audit logs'
);

select tests.authenticate_as(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'arsalanrs005@gmail.com'
);
select ok(
  exists (
    select 1 from public.audit_logs
    where action = 'test.workspace_seed'
      and workspace_id = '11111111-1111-4111-8111-111111111111'::uuid
  ),
  '22. Arsalan can read shared workspace audit logs'
);

-- 23–24. Notifications scoped by workspace and profile
select tests.authenticate_as(
  'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
  'anum112004@gmail.com'
);
select is(
  (
    select count(*)::integer from public.notifications
    where workspace_id = '11111111-1111-4111-8111-111111111111'::uuid
  ),
  0,
  '23. Anum cannot read shared workspace notifications'
);
select ok(
  exists (
    select 1 from public.notifications
    where profile_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid
      and workspace_id = '22222222-2222-4222-8222-222222222222'::uuid
  ),
  '24. Anum can read her own workspace notifications after reconcile'
);

-- 25. Direct audit insert rejected
select throws_ok(
  $$
    insert into public.audit_logs (
      actor_profile_id, action, entity_type, entity_id, workspace_id
    ) values (
      'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
      'fake.action', 'account',
      'b2222222-2222-2222-2222-222222222222'::uuid,
      '22222222-2222-4222-8222-222222222222'::uuid
    )
  $$,
  '42501',
  null,
  '25. Direct audit insert is rejected'
);

-- 26. Cross-workspace account update invisible
select is(
  (
    with u as (
      update public.accounts
      set name = 'Hacked shared Meezan'
      where id = 'a1111111-1111-1111-1111-111111111111'::uuid
      returning 1
    )
    select count(*)::integer from u
  ),
  0,
  '26. Anum cannot update shared workspace accounts'
);

-- 27–28. Workspace membership visibility
select is(
  (
    select count(*)::integer
    from public.workspaces w
    where public.is_active_workspace_member(w.id)
  ),
  1,
  '27. Anum belongs to exactly one accessible workspace'
);
select ok(
  exists (
    select 1 from public.workspaces w
    where w.slug = 'anum-personal'
      and public.is_active_workspace_member(w.id)
  ),
  '28. Anum accessible workspace is anum-personal'
);

select tests.authenticate_as(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'arsalanrs005@gmail.com'
);
select ok(
  exists (
    select 1 from public.workspaces w
    where w.slug = 'arsalan-ali'
      and public.is_active_workspace_member(w.id)
  ),
  '29. Arsalan accessible workspace is arsalan-ali'
);

select * from finish();
rollback;
