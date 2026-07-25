-- P0 security remediation: workspace isolation, storage, Phase 7 RLS hardening

-- ---------------------------------------------------------------------------
-- C-01: account_actual_balance must enforce workspace membership
-- ---------------------------------------------------------------------------
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
  v_workspace_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select a.opening_balance, a.workspace_id
  into v_opening, v_workspace_id
  from public.accounts a
  where a.id = p_account_id;

  if v_opening is null or not public.is_active_workspace_member(v_workspace_id) then
    raise exception 'Account not found or access denied';
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
-- H-01: ensure_workspace_membership locked to auth.uid()
-- ---------------------------------------------------------------------------
drop function if exists public.ensure_workspace_membership(uuid);

create or replace function public.ensure_workspace_membership()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_slug text;
  v_workspace_id uuid;
begin
  if v_profile_id is null then
    raise exception 'Not authenticated';
  end if;

  select au.initial_workspace_slug into v_slug
  from public.profiles p
  join public.approved_users au on au.id = p.approved_user_id
  where p.id = v_profile_id;

  if v_slug is null then
    raise exception 'Approved user has no initial workspace configured';
  end if;

  select id into v_workspace_id
  from public.workspaces
  where slug = v_slug and is_active = true;

  if v_workspace_id is null then
    raise exception 'Workspace % not found', v_slug;
  end if;

  insert into public.workspace_memberships (
    workspace_id, profile_id, role, is_active
  ) values (
    v_workspace_id, v_profile_id, 'admin'::public.workspace_role, true
  )
  on conflict (workspace_id, profile_id) do update
  set
    is_active = true,
    role = 'admin'::public.workspace_role,
    updated_at = timezone('utc', now());

  perform public.seed_workspace_defaults(v_workspace_id);

  return v_workspace_id;
end;
$$;

revoke all on function public.ensure_workspace_membership() from public;
grant execute on function public.ensure_workspace_membership() to authenticated;

-- Service-role backfill only
create or replace function public.ensure_workspace_membership_for_profile(p_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_workspace_id uuid;
begin
  if p_profile_id is null then
    raise exception 'Profile id is required';
  end if;

  select au.initial_workspace_slug into v_slug
  from public.profiles p
  join public.approved_users au on au.id = p.approved_user_id
  where p.id = p_profile_id;

  if v_slug is null then
    raise exception 'Approved user has no initial workspace configured';
  end if;

  select id into v_workspace_id
  from public.workspaces
  where slug = v_slug and is_active = true;

  if v_workspace_id is null then
    raise exception 'Workspace % not found', v_slug;
  end if;

  insert into public.workspace_memberships (
    workspace_id, profile_id, role, is_active
  ) values (
    v_workspace_id, p_profile_id, 'admin'::public.workspace_role, true
  )
  on conflict (workspace_id, profile_id) do update
  set is_active = true, updated_at = timezone('utc', now());

  perform public.seed_workspace_defaults(v_workspace_id);
  return v_workspace_id;
end;
$$;

revoke all on function public.ensure_workspace_membership_for_profile(uuid) from public;
grant execute on function public.ensure_workspace_membership_for_profile(uuid) to service_role;

-- Update ensure_profile_for_auth_user to call no-arg membership helper
create or replace function public.ensure_profile_for_auth_user()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_profile_id uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.profiles (id, approved_user_id, display_name, email)
  select
    uid,
    au.id,
    coalesce(
      nullif(trim(auth.jwt() ->> 'full_name'), ''),
      split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1)
    ),
    lower(coalesce(auth.jwt() ->> 'email', ''))
  from public.approved_users au
  where lower(au.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and au.is_active = true
  on conflict (id) do update
  set
    display_name = excluded.display_name,
    email = excluded.email,
    updated_at = timezone('utc', now())
  returning id into v_profile_id;

  if v_profile_id is null then
    raise exception 'Profile not approved';
  end if;

  perform public.ensure_workspace_membership();
  return v_profile_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- H-10: combined_financial_summary — workspace scoped, exclude transfers
-- ---------------------------------------------------------------------------
create or replace view public.combined_financial_summary
with (security_invoker = true)
as
with ws as (
  select public.current_primary_workspace_id() as workspace_id
),
balances as (
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
  cross join ws
  where a.is_active = true
    and a.workspace_id = ws.workspace_id
),
month_flow as (
  select
    coalesce(sum(t.amount_pkr) filter (
      where t.type in ('income', 'refund', 'family_contribution', 'loan_repayment')
        and t.direction = 1
    ), 0) as month_income,
    coalesce(sum(t.amount_pkr) filter (
      where t.type in ('expense', 'loan_payment')
        and t.direction = -1
    ), 0) as month_expenses
  from public.transactions t
  inner join public.accounts a on a.id = t.account_id
  cross join ws
  where t.status = 'completed'
    and t.archived_at is null
    and a.workspace_id = ws.workspace_id
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

-- ---------------------------------------------------------------------------
-- C-02: workspace-aware attachment storage policies
-- Path: {workspace_id}/{profile_id}/{entity_type}/{entity_id}/{filename}
-- ---------------------------------------------------------------------------
create or replace function public.storage_path_workspace_id(p_path text)
returns uuid
language sql
immutable
as $$
  select nullif((storage.foldername(p_path))[1], '')::uuid;
$$;

create or replace function public.can_read_attachment_storage_object(p_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and public.is_active_workspace_member(public.storage_path_workspace_id(p_path))
    and (
      (storage.foldername(p_path))[2] = auth.uid()::text
      or exists (
        select 1
        from public.attachments att
        where att.storage_path = p_path
          and att.archived_at is null
          and public.is_active_workspace_member(att.workspace_id)
          and (
            att.note_id is null
            or exists (
              select 1 from public.notes n
              where n.id = att.note_id
                and (n.visibility = 'shared' or n.owner_profile_id = auth.uid())
            )
          )
      )
    );
$$;

drop policy if exists "hisab_attachments_select_approved" on storage.objects;
create policy "hisab_attachments_select_workspace"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'hisab-attachments'
    and public.can_read_attachment_storage_object(name)
  );

drop policy if exists "hisab_attachments_insert_own_path" on storage.objects;
create policy "hisab_attachments_insert_workspace"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'hisab-attachments'
    and public.is_active_workspace_member(public.storage_path_workspace_id(name))
    and (storage.foldername(name))[2] = auth.uid()::text
    and array_length(storage.foldername(name), 1) >= 4
  );

drop policy if exists "hisab_attachments_delete_own" on storage.objects;
create policy "hisab_attachments_delete_workspace"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'hisab-attachments'
    and public.is_active_workspace_member(public.storage_path_workspace_id(name))
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- H-03: attachment metadata same-workspace validation
-- ---------------------------------------------------------------------------
create or replace function public.validate_attachment_entity_links()
returns trigger
language plpgsql
as $$
declare
  v_entity_workspace uuid;
begin
  if new.note_id is not null then
    select workspace_id into v_entity_workspace from public.notes where id = new.note_id;
    if v_entity_workspace is null or v_entity_workspace <> new.workspace_id then
      raise exception 'Linked note must belong to the same workspace';
    end if;
    if exists (
      select 1 from public.notes n
      where n.id = new.note_id and n.visibility = 'personal' and n.owner_profile_id <> auth.uid()
    ) then
      raise exception 'Cannot attach to another member private note';
    end if;
  end if;

  if new.transaction_id is not null then
    select a.workspace_id into v_entity_workspace
    from public.transactions t
    join public.accounts a on a.id = t.account_id
    where t.id = new.transaction_id;
    if v_entity_workspace is null or v_entity_workspace <> new.workspace_id then
      raise exception 'Linked transaction must belong to the same workspace';
    end if;
  end if;

  if new.goal_id is not null then
    select workspace_id into v_entity_workspace from public.financial_goals where id = new.goal_id;
    if v_entity_workspace is null or v_entity_workspace <> new.workspace_id then
      raise exception 'Linked goal must belong to the same workspace';
    end if;
  end if;

  if new.loan_id is not null then
    select workspace_id into v_entity_workspace from public.loans where id = new.loan_id;
    if v_entity_workspace is null or v_entity_workspace <> new.workspace_id then
      raise exception 'Linked loan must belong to the same workspace';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists attachments_validate_entity_links on public.attachments;
create trigger attachments_validate_entity_links
  before insert or update on public.attachments
  for each row execute function public.validate_attachment_entity_links();

-- ---------------------------------------------------------------------------
-- H-02: Phase 7 actor + relational integrity triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_phase7_actor_fields()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
    new.updated_by := auth.uid();
  elsif tg_op = 'UPDATE' then
    new.updated_by := auth.uid();
    if new.workspace_id is distinct from old.workspace_id then
      raise exception 'workspace_id is immutable';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.validate_sales_opportunity_relations()
returns trigger
language plpgsql
as $$
begin
  if new.client_id is not null then
    if not exists (
      select 1 from public.business_clients bc
      where bc.id = new.client_id and bc.workspace_id = new.workspace_id
    ) then
      raise exception 'client_id must belong to the same workspace';
    end if;
  end if;

  if new.owner_profile_id is not null then
    if not public.profile_belongs_to_workspace(new.owner_profile_id, new.workspace_id) then
      raise exception 'owner_profile_id must belong to the same workspace';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists sales_opportunities_set_actor on public.sales_opportunities;
create trigger sales_opportunities_set_actor
  before insert or update on public.sales_opportunities
  for each row execute function public.set_phase7_actor_fields();

drop trigger if exists sales_opportunities_validate_relations on public.sales_opportunities;
create trigger sales_opportunities_validate_relations
  before insert or update on public.sales_opportunities
  for each row execute function public.validate_sales_opportunity_relations();

drop trigger if exists upwork_opportunities_set_actor on public.upwork_opportunities;
create trigger upwork_opportunities_set_actor
  before insert or update on public.upwork_opportunities
  for each row execute function public.set_phase7_actor_fields();

drop trigger if exists linkedin_prospects_set_actor on public.linkedin_prospects;
create trigger linkedin_prospects_set_actor
  before insert or update on public.linkedin_prospects
  for each row execute function public.set_phase7_actor_fields();

-- Replace overly broad Phase 7 write policies with admin-only business writes
drop policy if exists "sales_opportunities_write" on public.sales_opportunities;
drop policy if exists "upwork_opportunities_write" on public.upwork_opportunities;
drop policy if exists "linkedin_prospects_write" on public.linkedin_prospects;

create policy "sales_opportunities_insert"
  on public.sales_opportunities for insert to authenticated
  with check (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
    and created_by = auth.uid()
  );

create policy "sales_opportunities_update"
  on public.sales_opportunities for update to authenticated
  using (public.is_active_workspace_member(workspace_id) and public.is_workspace_admin(workspace_id))
  with check (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
    and updated_by = auth.uid()
  );

create policy "upwork_opportunities_insert"
  on public.upwork_opportunities for insert to authenticated
  with check (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
    and created_by = auth.uid()
  );

create policy "upwork_opportunities_update"
  on public.upwork_opportunities for update to authenticated
  using (public.is_active_workspace_member(workspace_id) and public.is_workspace_admin(workspace_id))
  with check (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
    and updated_by = auth.uid()
  );

create policy "linkedin_prospects_insert"
  on public.linkedin_prospects for insert to authenticated
  with check (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
    and created_by = auth.uid()
  );

create policy "linkedin_prospects_update"
  on public.linkedin_prospects for update to authenticated
  using (public.is_active_workspace_member(workspace_id) and public.is_workspace_admin(workspace_id))
  with check (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
    and updated_by = auth.uid()
  );
