-- Restore approved_users.display_name as source of truth for profiles.
-- The p0 migration overwrote names with JWT full_name/email on every login.

-- Backfill all existing profiles from the approved_users allowlist.
update public.profiles p
set
  display_name = au.display_name,
  approved_user_id = au.id,
  updated_at = timezone('utc', now())
from public.approved_users au
where lower(p.email) = lower(au.email)
  and au.is_active = true;

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
      display_name = coalesce(nullif(trim(display_name), ''), approved.display_name),
      updated_at = timezone('utc', now())
    where id = uid;
  end if;

  perform public.ensure_workspace_membership();
  return uid;
end;
$$;
