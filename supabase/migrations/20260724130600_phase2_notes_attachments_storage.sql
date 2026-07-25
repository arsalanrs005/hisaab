-- Phase 2: note_folders, notes, attachments + private hisab-attachments storage bucket

create table if not exists public.note_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  sort_order integer not null default 0,
  is_system boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz,
  constraint note_folders_slug_unique unique (slug)
);

drop trigger if exists note_folders_set_updated_at on public.note_folders;
create trigger note_folders_set_updated_at
  before update on public.note_folders
  for each row
  execute function public.set_updated_at();

insert into public.note_folders (name, slug, sort_order, is_system)
values
  ('Shared quick notes', 'shared-quick-notes', 10, true),
  ('Financial plans', 'financial-plans', 20, true),
  ('Spending decisions', 'spending-decisions', 30, true),
  ('House plan', 'house-plan', 40, true),
  ('Car plan', 'car-plan', 50, true),
  ('Loan notes', 'loan-notes', 60, true),
  ('Ops5ive strategy', 'ops5ive-strategy', 70, true),
  ('Upwork plan', 'upwork-plan', 80, true),
  ('LinkedIn plan', 'linkedin-plan', 90, true),
  ('Client notes', 'client-notes', 100, true),
  ('Monthly reviews', 'monthly-reviews', 110, true)
on conflict (slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_system = true,
  updated_at = timezone('utc', now());

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references public.note_folders (id),
  title text not null,
  content_json jsonb not null default '{}'::jsonb,
  plain_text text not null default '',
  owner_profile_id uuid references public.profiles (id),
  visibility public.note_visibility not null default 'shared',
  priority smallint
    check (priority is null or priority between 1 and 5),
  due_date date,
  is_pinned boolean not null default false,
  related_account_id uuid references public.accounts (id),
  related_transaction_id uuid references public.transactions (id),
  related_goal_id uuid references public.financial_goals (id),
  related_loan_id uuid references public.loans (id),
  related_business_record_type text,
  related_business_record_id uuid,
  created_by uuid not null references public.profiles (id),
  updated_by uuid references public.profiles (id),
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint notes_personal_owner_check check (
    visibility <> 'personal' or owner_profile_id is not null
  )
);

create index if not exists notes_folder_id_idx on public.notes (folder_id);
create index if not exists notes_owner_profile_id_idx on public.notes (owner_profile_id);
create index if not exists notes_visibility_idx on public.notes (visibility);
create index if not exists notes_is_pinned_idx on public.notes (is_pinned);

create index if not exists notes_title_plain_text_search_idx
  on public.notes using gin (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(plain_text, ''))
  );

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
  before update on public.notes
  for each row
  execute function public.set_updated_at();

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  file_name text not null,
  mime_type text not null
    check (
      mime_type in (
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'application/pdf'
      )
    ),
  file_size bigint not null
    check (file_size > 0),
  uploaded_by uuid not null references public.profiles (id),
  transaction_id uuid references public.transactions (id),
  note_id uuid references public.notes (id),
  goal_id uuid references public.financial_goals (id),
  loan_id uuid references public.loans (id),
  created_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz,
  constraint attachments_storage_path_unique unique (storage_path),
  constraint attachments_has_related_entity check (
    num_nonnulls(transaction_id, note_id, goal_id, loan_id) >= 1
  )
);

create index if not exists attachments_uploaded_by_idx on public.attachments (uploaded_by);
create index if not exists attachments_transaction_id_idx on public.attachments (transaction_id);
create index if not exists attachments_note_id_idx on public.attachments (note_id);

-- Private storage bucket (minimal policies; entity-level hardening deferred)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hisab-attachments',
  'hisab-attachments',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
  ]::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "hisab_attachments_select_approved" on storage.objects;
create policy "hisab_attachments_select_approved"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'hisab-attachments'
    and public.is_approved_active_user()
  );

drop policy if exists "hisab_attachments_insert_own_path" on storage.objects;
create policy "hisab_attachments_insert_own_path"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'hisab-attachments'
    and public.is_approved_active_user()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "hisab_attachments_delete_own" on storage.objects;
create policy "hisab_attachments_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'hisab-attachments'
    and public.is_approved_active_user()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

grant select, insert, update on public.note_folders to authenticated;
grant select, insert, update on public.notes to authenticated;
grant select, insert, update on public.attachments to authenticated;
