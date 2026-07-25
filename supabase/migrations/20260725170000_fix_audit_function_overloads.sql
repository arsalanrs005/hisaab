-- Fix duplicate insert_audit_log / insert_notification overloads that break
-- audit_row_change() during onboarding (and any insert with audit triggers).
--
-- Phase 5 added workspace_id parameters via CREATE OR REPLACE, which created
-- second overloads instead of replacing the originals. Calls with 7 args then
-- match both functions and fail with "function ... is not unique".

drop function if exists public.insert_audit_log(
  text, text, uuid, uuid, jsonb, jsonb, jsonb
);

drop function if exists public.insert_notification(
  uuid, public.notification_type, text, text, text, uuid, text
);

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
  v_workspace_id uuid;
begin
  if current_setting('hisab.allow_secure_write', true) = 'on' then
    return coalesce(new, old);
  end if;

  if tg_table_name = 'notes' then
    if coalesce(new.visibility, old.visibility) = 'personal' then
      return coalesce(new, old);
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if (to_jsonb(old) - 'updated_at') = (to_jsonb(new) - 'updated_at') then
      return new;
    end if;
    if tg_table_name = 'accounts'
       and (to_jsonb(old) - 'last_reconciled_at') = (to_jsonb(new) - 'last_reconciled_at') then
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

  if to_jsonb(coalesce(new, old)) ? 'workspace_id' then
    v_workspace_id := nullif(to_jsonb(coalesce(new, old)) ->> 'workspace_id', '')::uuid;
  end if;

  perform public.insert_audit_log(
    v_action,
    tg_table_name::text,
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
    jsonb_build_object('via', 'audit_row_change'),
    v_workspace_id
  );

  return coalesce(new, old);
end;
$$;

revoke all on function public.insert_audit_log(text, text, uuid, uuid, jsonb, jsonb, jsonb, uuid) from public;
revoke all on function public.insert_notification(uuid, public.notification_type, text, text, text, uuid, text, uuid) from public;
