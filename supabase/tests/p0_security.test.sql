-- P0 security remediation tests (pgTAP)
-- Run after migrations: npm run supabase:test

begin;

create extension if not exists pgtap with schema extensions;
create schema if not exists tests;

select plan(8);

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

select has_function(
  'public',
  'ensure_workspace_membership',
  array[]::text[],
  '1. ensure_workspace_membership() exists with no caller-supplied profile id'
);

select has_function(
  'public',
  'account_actual_balance',
  array['uuid'],
  '2. account_actual_balance(uuid) exists'
);

select ok(
  (
    select count(*) = 4
    from public.approved_users
    where email in (
      'arsalanrs005@gmail.com',
      'alirashidd.232@gmail.com',
      'anum112004@gmail.com',
      'sarahbatool23@gmail.com'
    )
      and is_active = true
  ),
  '3. Seed includes all four approved active users'
);

do $$
declare
  v_arsalan uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_anum uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  v_ws_shared uuid := '11111111-1111-4111-8111-111111111111';
  v_account uuid;
begin
  select a.id into v_account
  from public.accounts a
  where a.workspace_id = v_ws_shared
  limit 1;

  perform tests.authenticate_as(v_arsalan, 'arsalanrs005@gmail.com');
  perform set_config('tests.shared_balance', public.account_actual_balance(v_account)::text, true);
  perform tests.clear_auth();

  perform tests.authenticate_as(v_anum, 'anum112004@gmail.com');
  perform set_config(
    'tests.cross_balance_error',
    (
      select case
        when public.account_actual_balance(v_account) is null then 'null'
        else 'allowed'
      end
    ),
    true
  );
  perform tests.clear_auth();
end;
$$;

select ok(current_setting('tests.shared_balance', true) is not null, '4. Shared workspace member can read account balance');

select isnt(
  current_setting('tests.cross_balance_error', true),
  'allowed',
  '5. Cross-workspace member cannot read shared account balance'
);

select ok(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'storage_path_workspace_id'
  ),
  '6. storage_path_workspace_id helper exists for attachment policies'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like '%hisab%'
  ),
  '7. hisab-attachments storage policies exist'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'upwork_opportunities'
      and policyname = 'upwork_opportunities_insert'
  ),
  '8. P0 tightened upwork_opportunities insert policy exists'
);

select * from finish();
rollback;
