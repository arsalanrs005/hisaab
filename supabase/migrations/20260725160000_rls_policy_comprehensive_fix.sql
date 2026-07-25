-- Comprehensive RLS fix for workspace_memberships recursion and related policy issues.
--
-- Root cause: SQL-language SECURITY DEFINER helpers used in RLS policies can be
-- inlined by PostgreSQL and then execute as the invoker, re-applying RLS on
-- workspace_memberships and causing infinite recursion.
--
-- Fix: rewrite membership helpers as plpgsql SECURITY DEFINER (non-inlined) and
-- replace every policy that referenced workspace_memberships directly.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to postgres, service_role, authenticated;

-- ---------------------------------------------------------------------------
-- Core membership helpers (plpgsql — must not be SQL for RLS safety)
-- ---------------------------------------------------------------------------

create or replace function private.auth_uid()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid();
$$;

revoke all on function private.auth_uid() from public;
grant execute on function private.auth_uid() to authenticated, service_role;

create or replace function private.is_workspace_member(p_workspace_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_workspace_id is null or private.auth_uid() is null then
    return false;
  end if;

  return exists (
    select 1
    from public.workspace_memberships wm
    where wm.workspace_id = p_workspace_id
      and wm.profile_id = private.auth_uid()
      and wm.is_active = true
  );
end;
$$;

revoke all on function private.is_workspace_member(uuid) from public;
grant execute on function private.is_workspace_member(uuid) to authenticated, service_role;

create or replace function private.is_workspace_admin(p_workspace_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_workspace_id is null or private.auth_uid() is null then
    return false;
  end if;

  return exists (
    select 1
    from public.workspace_memberships wm
    where wm.workspace_id = p_workspace_id
      and wm.profile_id = private.auth_uid()
      and wm.role = 'admin'::public.workspace_role
      and wm.is_active = true
  );
end;
$$;

revoke all on function private.is_workspace_admin(uuid) from public;
grant execute on function private.is_workspace_admin(uuid) to authenticated, service_role;

create or replace function private.profile_belongs_to_workspace(
  p_profile_id uuid,
  p_workspace_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_profile_id is null or p_workspace_id is null then
    return false;
  end if;

  return exists (
    select 1
    from public.workspace_memberships wm
    where wm.profile_id = p_profile_id
      and wm.workspace_id = p_workspace_id
      and wm.is_active = true
  );
end;
$$;

revoke all on function private.profile_belongs_to_workspace(uuid, uuid) from public;
grant execute on function private.profile_belongs_to_workspace(uuid, uuid) to authenticated, service_role;

create or replace function private.profiles_share_active_workspace(p_target_profile_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_target_profile_id is null or private.auth_uid() is null then
    return false;
  end if;

  return exists (
    select 1
    from public.workspace_memberships wm_self
    inner join public.workspace_memberships wm_target
      on wm_target.workspace_id = wm_self.workspace_id
    where wm_self.profile_id = private.auth_uid()
      and wm_self.is_active = true
      and wm_target.profile_id = p_target_profile_id
      and wm_target.is_active = true
  );
end;
$$;

revoke all on function private.profiles_share_active_workspace(uuid) from public;
grant execute on function private.profiles_share_active_workspace(uuid) to authenticated, service_role;

create or replace function private.current_primary_workspace_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
begin
  if private.auth_uid() is null then
    return null;
  end if;

  select wm.workspace_id
  into v_workspace_id
  from public.workspace_memberships wm
  where wm.profile_id = private.auth_uid()
    and wm.is_active = true
  order by wm.joined_at asc
  limit 1;

  return v_workspace_id;
end;
$$;

revoke all on function private.current_primary_workspace_id() from public;
grant execute on function private.current_primary_workspace_id() to authenticated, service_role;

-- Public wrappers (keep existing API surface for app + other functions)
create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return private.is_workspace_member(p_workspace_id);
end;
$$;

create or replace function public.is_active_workspace_member(p_workspace_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return private.is_workspace_member(p_workspace_id);
end;
$$;

create or replace function public.is_workspace_admin(p_workspace_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return private.is_workspace_admin(p_workspace_id);
end;
$$;

create or replace function public.profile_belongs_to_workspace(
  p_profile_id uuid,
  p_workspace_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return private.profile_belongs_to_workspace(p_profile_id, p_workspace_id);
end;
$$;

create or replace function public.profiles_share_active_workspace(p_target_profile_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return private.profiles_share_active_workspace(p_target_profile_id);
end;
$$;

create or replace function public.current_primary_workspace_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return private.current_primary_workspace_id();
end;
$$;

create or replace function public.is_shared_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return public.is_approved_active_user()
    and private.is_workspace_admin(private.current_primary_workspace_id());
end;
$$;

revoke all on function public.is_workspace_member(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated, service_role;

revoke all on function public.is_active_workspace_member(uuid) from public;
grant execute on function public.is_active_workspace_member(uuid) to authenticated, service_role;

revoke all on function public.is_workspace_admin(uuid) from public;
grant execute on function public.is_workspace_admin(uuid) to authenticated, service_role;

revoke all on function public.profile_belongs_to_workspace(uuid, uuid) from public;
grant execute on function public.profile_belongs_to_workspace(uuid, uuid) to authenticated, service_role;

revoke all on function public.profiles_share_active_workspace(uuid) from public;
grant execute on function public.profiles_share_active_workspace(uuid) to authenticated, service_role;

revoke all on function public.current_primary_workspace_id() from public;
grant execute on function public.current_primary_workspace_id() to authenticated, service_role;

revoke all on function public.is_shared_admin() from public;
grant execute on function public.is_shared_admin() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Policies: never SELECT workspace_memberships inside its own policy
-- ---------------------------------------------------------------------------

drop policy if exists "workspace_memberships_select" on public.workspace_memberships;
create policy "workspace_memberships_select"
  on public.workspace_memberships
  for select
  to authenticated
  using (
    profile_id = auth.uid()
    or (
      is_active = true
      and private.is_workspace_member(workspace_id)
    )
  );

drop policy if exists "profiles_select_approved" on public.profiles;
create policy "profiles_select_approved"
  on public.profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or private.profiles_share_active_workspace(id)
  );

drop policy if exists "workspaces_select_member" on public.workspaces;
create policy "workspaces_select_member"
  on public.workspaces
  for select
  to authenticated
  using (private.is_workspace_member(id));

-- ---------------------------------------------------------------------------
-- Sanity: membership table remains client read-only
-- ---------------------------------------------------------------------------
-- (insert/update/delete stay via SECURITY DEFINER RPCs only)
