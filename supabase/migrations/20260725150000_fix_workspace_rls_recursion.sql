-- Fix infinite recursion in workspace_memberships / profiles RLS policies.
-- Policies must not SELECT from the same table they protect; use SECURITY DEFINER helpers.

create or replace function public.profiles_share_active_workspace(p_target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_memberships wm_self
    inner join public.workspace_memberships wm_target
      on wm_target.workspace_id = wm_self.workspace_id
    where wm_self.profile_id = auth.uid()
      and wm_self.is_active = true
      and wm_target.profile_id = p_target_profile_id
      and wm_target.is_active = true
  );
$$;

revoke all on function public.profiles_share_active_workspace(uuid) from public;
grant execute on function public.profiles_share_active_workspace(uuid) to authenticated;

drop policy if exists "workspace_memberships_select" on public.workspace_memberships;
create policy "workspace_memberships_select"
  on public.workspace_memberships for select to authenticated
  using (
    profile_id = auth.uid()
    or (
      is_active = true
      and public.is_workspace_member(workspace_id)
    )
  );

drop policy if exists "profiles_select_approved" on public.profiles;
create policy "profiles_select_approved"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.profiles_share_active_workspace(id)
  );
