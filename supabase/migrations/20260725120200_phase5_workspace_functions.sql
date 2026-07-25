-- Phase 5: workspace helper functions, membership sync, defaults seeding

-- ---------------------------------------------------------------------------
-- Workspace membership helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_memberships wm
    where wm.workspace_id = p_workspace_id
      and wm.profile_id = auth.uid()
      and wm.is_active = true
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;

create or replace function public.is_active_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_workspace_member(p_workspace_id);
$$;

revoke all on function public.is_active_workspace_member(uuid) from public;
grant execute on function public.is_active_workspace_member(uuid) to authenticated;

create or replace function public.is_workspace_admin(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_memberships wm
    where wm.workspace_id = p_workspace_id
      and wm.profile_id = auth.uid()
      and wm.role = 'admin'::public.workspace_role
      and wm.is_active = true
  );
$$;

revoke all on function public.is_workspace_admin(uuid) from public;
grant execute on function public.is_workspace_admin(uuid) to authenticated;

create or replace function public.profile_belongs_to_workspace(
  p_profile_id uuid,
  p_workspace_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_memberships wm
    where wm.profile_id = p_profile_id
      and wm.workspace_id = p_workspace_id
      and wm.is_active = true
  );
$$;

revoke all on function public.profile_belongs_to_workspace(uuid, uuid) from public;
grant execute on function public.profile_belongs_to_workspace(uuid, uuid) to authenticated;

create or replace function public.account_belongs_to_workspace(
  p_account_id uuid,
  p_workspace_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.accounts a
    where a.id = p_account_id
      and a.workspace_id = p_workspace_id
  );
$$;

revoke all on function public.account_belongs_to_workspace(uuid, uuid) from public;
grant execute on function public.account_belongs_to_workspace(uuid, uuid) to authenticated;

create or replace function public.current_primary_workspace_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select wm.workspace_id
  from public.workspace_memberships wm
  where wm.profile_id = auth.uid()
    and wm.is_active = true
  order by wm.joined_at asc
  limit 1;
$$;

revoke all on function public.current_primary_workspace_id() from public;
grant execute on function public.current_primary_workspace_id() to authenticated;

-- Shared-admin within a workspace only (replaces global is_shared_admin for RLS)
create or replace function public.is_shared_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_approved_active_user()
    and public.is_workspace_admin(public.current_primary_workspace_id());
$$;

-- ---------------------------------------------------------------------------
-- Seed workspace defaults (categories, note folders, app settings)
-- ---------------------------------------------------------------------------

create or replace function public.seed_workspace_defaults(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shared uuid := '11111111-1111-4111-8111-111111111111'::uuid;
begin
  if p_workspace_id = v_shared then
    return;
  end if;

  insert into public.categories (
    workspace_id, name, slug, type, icon, is_system, is_active
  )
  select
    p_workspace_id, c.name, c.slug, c.type, c.icon, c.is_system, c.is_active
  from public.categories c
  where c.workspace_id = v_shared
    and c.is_system = true
  on conflict (workspace_id, slug) do nothing;

  insert into public.note_folders (
    workspace_id, name, slug, sort_order, is_system
  )
  select
    p_workspace_id, nf.name, nf.slug, nf.sort_order, nf.is_system
  from public.note_folders nf
  where nf.workspace_id = v_shared
    and nf.is_system = true
  on conflict (workspace_id, slug) do nothing;

  insert into public.app_settings (workspace_id, key, value_json)
  select p_workspace_id, s.key, s.value_json
  from public.app_settings s
  where s.workspace_id = v_shared
  on conflict (workspace_id, key) do nothing;
end;
$$;

revoke all on function public.seed_workspace_defaults(uuid) from public;

-- ---------------------------------------------------------------------------
-- Ensure workspace membership from approved_users.initial_workspace_slug
-- ---------------------------------------------------------------------------

create or replace function public.ensure_workspace_membership(p_profile_id uuid default auth.uid())
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := coalesce(p_profile_id, auth.uid());
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

revoke all on function public.ensure_workspace_membership(uuid) from public;
grant execute on function public.ensure_workspace_membership(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Updated ensure_profile_for_auth_user (creates membership)
-- ---------------------------------------------------------------------------

create or replace function public.ensure_profile_for_auth_user()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  user_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  approved record;
  existing_id uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if user_email = '' then
    raise exception 'Authenticated user has no email';
  end if;

  select * into approved
  from public.approved_users
  where lower(email) = user_email
    and is_active = true
  limit 1;

  if approved is null then
    raise exception 'Email is not approved for this private workspace';
  end if;

  select id into existing_id from public.profiles where id = uid;

  if existing_id is null then
    insert into public.profiles (
      id, approved_user_id, email, display_name
    ) values (
      uid, approved.id, approved.email, approved.display_name
    );
  else
    update public.profiles
    set
      approved_user_id = approved.id,
      email = approved.email,
      display_name = coalesce(nullif(display_name, ''), approved.display_name),
      updated_at = timezone('utc', now())
    where id = uid;
  end if;

  perform public.ensure_workspace_membership(uid);

  return uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Workspace-scoped account permission sync
-- ---------------------------------------------------------------------------

create or replace function public.sync_account_permissions(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_workspace uuid;
begin
  select owner_profile_id, workspace_id
  into v_owner, v_workspace
  from public.accounts
  where id = p_account_id;

  if v_owner is null then
    raise exception 'Account % not found', p_account_id;
  end if;

  insert into public.account_permissions (
    account_id,
    profile_id,
    workspace_id,
    can_view,
    can_create_transactions,
    can_edit_transactions,
    can_archive_transactions,
    can_reconcile
  )
  select
    p_account_id,
    wm.profile_id,
    v_workspace,
    true,
    (wm.profile_id = v_owner),
    (wm.profile_id = v_owner),
    (wm.profile_id = v_owner),
    (wm.profile_id = v_owner)
  from public.workspace_memberships wm
  where wm.workspace_id = v_workspace
    and wm.is_active = true
  on conflict (account_id, profile_id) do update
  set
    workspace_id = excluded.workspace_id,
    can_view = true,
    can_create_transactions = (public.account_permissions.profile_id = v_owner),
    can_edit_transactions = (public.account_permissions.profile_id = v_owner),
    can_archive_transactions = (public.account_permissions.profile_id = v_owner),
    can_reconcile = (public.account_permissions.profile_id = v_owner);
end;
$$;

-- ---------------------------------------------------------------------------
-- Accounts: default workspace_id from owner membership on insert
-- ---------------------------------------------------------------------------

create or replace function public.tg_accounts_set_workspace_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace uuid;
begin
  if new.workspace_id is null then
    select wm.workspace_id into v_workspace
    from public.workspace_memberships wm
    where wm.profile_id = new.owner_profile_id
      and wm.is_active = true
    order by wm.joined_at asc
    limit 1;

    if v_workspace is null then
      raise exception 'Account owner is not a member of any workspace';
    end if;

    new.workspace_id := v_workspace;
  end if;

  if not public.profile_belongs_to_workspace(new.owner_profile_id, new.workspace_id) then
    raise exception 'Account owner must belong to the account workspace';
  end if;

  return new;
end;
$$;

drop trigger if exists accounts_set_workspace_id_bi on public.accounts;
create trigger accounts_set_workspace_id_bi
  before insert on public.accounts
  for each row
  execute function public.tg_accounts_set_workspace_id();

-- Prevent workspace changes on accounts
create or replace function public.tg_accounts_prevent_workspace_change()
returns trigger
language plpgsql
as $$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'Account workspace cannot be changed';
  end if;
  if new.owner_profile_id is distinct from old.owner_profile_id then
    raise exception 'Account ownership cannot be changed through the application';
  end if;
  return new;
end;
$$;

drop trigger if exists accounts_prevent_workspace_change_bu on public.accounts;
create trigger accounts_prevent_workspace_change_bu
  before update on public.accounts
  for each row
  execute function public.tg_accounts_prevent_workspace_change();

-- ---------------------------------------------------------------------------
-- Audit + notification helpers with workspace_id
-- ---------------------------------------------------------------------------

create or replace function public.insert_audit_log(
  p_action text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_account_id uuid default null,
  p_old_values jsonb default null,
  p_new_values jsonb default null,
  p_metadata jsonb default '{}'::jsonb,
  p_workspace_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_actor uuid := auth.uid();
  v_workspace uuid := p_workspace_id;
begin
  if v_workspace is null and p_account_id is not null then
    select workspace_id into v_workspace from public.accounts where id = p_account_id;
  end if;

  if v_workspace is null then
    v_workspace := public.current_primary_workspace_id();
  end if;

  insert into public.audit_logs (
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    account_id,
    workspace_id,
    old_values,
    new_values,
    metadata
  ) values (
    v_actor,
    p_action,
    p_entity_type,
    p_entity_id,
    p_account_id,
    v_workspace,
    p_old_values,
    p_new_values,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.insert_notification(
  p_profile_id uuid,
  p_type public.notification_type,
  p_title text,
  p_message text,
  p_related_entity_type text default null,
  p_related_entity_id uuid default null,
  p_deduplication_key text default null,
  p_workspace_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_workspace uuid := p_workspace_id;
begin
  if v_workspace is null then
    select wm.workspace_id into v_workspace
    from public.workspace_memberships wm
    where wm.profile_id = p_profile_id
      and wm.is_active = true
    order by wm.joined_at asc
    limit 1;
  end if;

  insert into public.notifications (
    profile_id,
    workspace_id,
    type,
    title,
    message,
    related_entity_type,
    related_entity_id,
    deduplication_key
  ) values (
    p_profile_id,
    v_workspace,
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

-- Transaction workspace consistency
create or replace function public.tg_transactions_set_workspace_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_workspace uuid;
begin
  select workspace_id into v_account_workspace
  from public.accounts
  where id = new.account_id;

  if v_account_workspace is null then
    raise exception 'Account not found for transaction';
  end if;

  if tg_op = 'INSERT' then
    new.workspace_id := v_account_workspace;
  elsif new.workspace_id is distinct from v_account_workspace then
    raise exception 'Transaction workspace must match account workspace';
  end if;

  return new;
end;
$$;

drop trigger if exists transactions_set_workspace_id_bi on public.transactions;
create trigger transactions_set_workspace_id_bi
  before insert or update on public.transactions
  for each row
  execute function public.tg_transactions_set_workspace_id();

grant select on public.workspaces to authenticated;
grant select on public.workspace_memberships to authenticated;

-- Income sources workspace default
create or replace function public.tg_income_sources_set_workspace_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace uuid;
begin
  if new.workspace_id is null then
    select wm.workspace_id into v_workspace
    from public.workspace_memberships wm
    where wm.profile_id = new.created_by
      and wm.is_active = true
    order by wm.joined_at asc
    limit 1;

    if v_workspace is null then
      raise exception 'Income source creator is not a member of any workspace';
    end if;

    new.workspace_id := v_workspace;
  end if;

  return new;
end;
$$;

drop trigger if exists income_sources_set_workspace_id_bi on public.income_sources;
create trigger income_sources_set_workspace_id_bi
  before insert on public.income_sources
  for each row
  execute function public.tg_income_sources_set_workspace_id();
