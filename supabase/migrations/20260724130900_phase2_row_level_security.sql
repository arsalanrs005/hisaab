-- Phase 2: Row Level Security for all new financial tables
-- Both approved users share read access; writes follow ownership / shared-admin rules.

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------

alter table public.accounts enable row level security;
alter table public.account_permissions enable row level security;
alter table public.categories enable row level security;
alter table public.income_sources enable row level security;
alter table public.transactions enable row level security;
alter table public.transfers enable row level security;
alter table public.account_contributions enable row level security;
alter table public.balance_adjustments enable row level security;
alter table public.financial_goals enable row level security;
alter table public.goal_contributions enable row level security;
alter table public.loans enable row level security;
alter table public.loan_payments enable row level security;
alter table public.budgets enable row level security;
alter table public.note_folders enable row level security;
alter table public.notes enable row level security;
alter table public.attachments enable row level security;
alter table public.business_clients enable row level security;
alter table public.business_income enable row level security;
alter table public.business_expenses enable row level security;
alter table public.business_targets enable row level security;
alter table public.upwork_activities enable row level security;
alter table public.linkedin_activities enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.app_settings enable row level security;

-- ---------------------------------------------------------------------------
-- accounts
-- ---------------------------------------------------------------------------

drop policy if exists "accounts_select_approved" on public.accounts;
create policy "accounts_select_approved"
  on public.accounts for select to authenticated
  using (public.is_approved_active_user());

drop policy if exists "accounts_insert_own" on public.accounts;
create policy "accounts_insert_own"
  on public.accounts for insert to authenticated
  with check (
    public.is_approved_active_user()
    and owner_profile_id = auth.uid()
  );

drop policy if exists "accounts_update_own" on public.accounts;
create policy "accounts_update_own"
  on public.accounts for update to authenticated
  using (public.is_account_owner(id))
  with check (
    public.is_account_owner(id)
    and owner_profile_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- account_permissions (read-only for clients; sync via SECURITY DEFINER)
-- ---------------------------------------------------------------------------

drop policy if exists "account_permissions_select_approved" on public.account_permissions;
create policy "account_permissions_select_approved"
  on public.account_permissions for select to authenticated
  using (public.is_approved_active_user());

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------

drop policy if exists "categories_select_approved" on public.categories;
create policy "categories_select_approved"
  on public.categories for select to authenticated
  using (public.is_approved_active_user());

drop policy if exists "categories_insert_approved" on public.categories;
create policy "categories_insert_approved"
  on public.categories for insert to authenticated
  with check (public.is_shared_admin());

drop policy if exists "categories_update_approved" on public.categories;
create policy "categories_update_approved"
  on public.categories for update to authenticated
  using (public.is_shared_admin())
  with check (public.is_shared_admin());

-- ---------------------------------------------------------------------------
-- income_sources
-- ---------------------------------------------------------------------------

drop policy if exists "income_sources_select_approved" on public.income_sources;
create policy "income_sources_select_approved"
  on public.income_sources for select to authenticated
  using (public.is_approved_active_user());

drop policy if exists "income_sources_insert_approved" on public.income_sources;
create policy "income_sources_insert_approved"
  on public.income_sources for insert to authenticated
  with check (
    public.is_approved_active_user()
    and created_by = auth.uid()
    and (
      is_shared_income = true
      or owner_profile_id = auth.uid()
      or owner_profile_id is null
    )
  );

drop policy if exists "income_sources_update_owner_or_shared" on public.income_sources;
create policy "income_sources_update_owner_or_shared"
  on public.income_sources for update to authenticated
  using (
    public.is_approved_active_user()
    and (is_shared_income = true or owner_profile_id = auth.uid())
  )
  with check (
    public.is_approved_active_user()
    and (is_shared_income = true or owner_profile_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------------

drop policy if exists "transactions_select_approved" on public.transactions;
create policy "transactions_select_approved"
  on public.transactions for select to authenticated
  using (public.is_approved_active_user());

drop policy if exists "transactions_insert_own_account" on public.transactions;
create policy "transactions_insert_own_account"
  on public.transactions for insert to authenticated
  with check (
    public.is_approved_active_user()
    and created_by = auth.uid()
    and public.is_account_owner(account_id)
    and type not in ('transfer_in', 'transfer_out', 'balance_adjustment')
  );

drop policy if exists "transactions_update_own_account" on public.transactions;
create policy "transactions_update_own_account"
  on public.transactions for update to authenticated
  using (
    public.is_approved_active_user()
    and public.is_account_owner(account_id)
    and type not in ('transfer_in', 'transfer_out', 'balance_adjustment')
  )
  with check (
    public.is_approved_active_user()
    and public.is_account_owner(account_id)
    and type not in ('transfer_in', 'transfer_out', 'balance_adjustment')
  );

-- ---------------------------------------------------------------------------
-- transfers / contributions / balance_adjustments (SELECT only)
-- ---------------------------------------------------------------------------

drop policy if exists "transfers_select_approved" on public.transfers;
create policy "transfers_select_approved"
  on public.transfers for select to authenticated
  using (public.is_approved_active_user());

drop policy if exists "account_contributions_select_approved" on public.account_contributions;
create policy "account_contributions_select_approved"
  on public.account_contributions for select to authenticated
  using (public.is_approved_active_user());

drop policy if exists "balance_adjustments_select_approved" on public.balance_adjustments;
create policy "balance_adjustments_select_approved"
  on public.balance_adjustments for select to authenticated
  using (public.is_approved_active_user());

-- ---------------------------------------------------------------------------
-- financial_goals
-- ---------------------------------------------------------------------------

drop policy if exists "financial_goals_select_approved" on public.financial_goals;
create policy "financial_goals_select_approved"
  on public.financial_goals for select to authenticated
  using (public.is_approved_active_user());

drop policy if exists "financial_goals_insert" on public.financial_goals;
create policy "financial_goals_insert"
  on public.financial_goals for insert to authenticated
  with check (
    public.is_approved_active_user()
    and created_by = auth.uid()
    and (
      ownership_type in ('shared', 'business')
      or (ownership_type = 'personal' and owner_profile_id = auth.uid())
    )
  );

drop policy if exists "financial_goals_update" on public.financial_goals;
create policy "financial_goals_update"
  on public.financial_goals for update to authenticated
  using (
    public.is_approved_active_user()
    and (
      ownership_type in ('shared', 'business')
      or owner_profile_id = auth.uid()
    )
  )
  with check (
    public.is_approved_active_user()
    and (
      ownership_type in ('shared', 'business')
      or owner_profile_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- goal_contributions
-- ---------------------------------------------------------------------------

drop policy if exists "goal_contributions_select_approved" on public.goal_contributions;
create policy "goal_contributions_select_approved"
  on public.goal_contributions for select to authenticated
  using (public.is_approved_active_user());

drop policy if exists "goal_contributions_insert" on public.goal_contributions;
create policy "goal_contributions_insert"
  on public.goal_contributions for insert to authenticated
  with check (
    public.is_approved_active_user()
    and created_by = auth.uid()
    and exists (
      select 1
      from public.financial_goals g
      where g.id = goal_id
        and (
          g.ownership_type in ('shared', 'business')
          or g.owner_profile_id = auth.uid()
        )
    )
    and (account_id is null or public.is_account_owner(account_id))
  );

drop policy if exists "goal_contributions_update" on public.goal_contributions;
create policy "goal_contributions_update"
  on public.goal_contributions for update to authenticated
  using (
    public.is_approved_active_user()
    and exists (
      select 1
      from public.financial_goals g
      where g.id = goal_id
        and (
          g.ownership_type in ('shared', 'business')
          or g.owner_profile_id = auth.uid()
        )
    )
  )
  with check (
    public.is_approved_active_user()
    and exists (
      select 1
      from public.financial_goals g
      where g.id = goal_id
        and (
          g.ownership_type in ('shared', 'business')
          or g.owner_profile_id = auth.uid()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- loans / loan_payments
-- ---------------------------------------------------------------------------

drop policy if exists "loans_select_approved" on public.loans;
create policy "loans_select_approved"
  on public.loans for select to authenticated
  using (public.is_approved_active_user());

drop policy if exists "loans_insert_own" on public.loans;
create policy "loans_insert_own"
  on public.loans for insert to authenticated
  with check (
    public.is_approved_active_user()
    and owner_profile_id = auth.uid()
    and created_by = auth.uid()
  );

drop policy if exists "loans_update_own" on public.loans;
create policy "loans_update_own"
  on public.loans for update to authenticated
  using (
    public.is_approved_active_user()
    and owner_profile_id = auth.uid()
  )
  with check (
    public.is_approved_active_user()
    and owner_profile_id = auth.uid()
  );

drop policy if exists "loan_payments_select_approved" on public.loan_payments;
create policy "loan_payments_select_approved"
  on public.loan_payments for select to authenticated
  using (public.is_approved_active_user());

drop policy if exists "loan_payments_insert_owner" on public.loan_payments;
create policy "loan_payments_insert_owner"
  on public.loan_payments for insert to authenticated
  with check (
    public.is_approved_active_user()
    and created_by = auth.uid()
    and exists (
      select 1 from public.loans l
      where l.id = loan_id and l.owner_profile_id = auth.uid()
    )
    and (transaction_id is null or exists (
      select 1 from public.transactions t
      where t.id = transaction_id and public.is_account_owner(t.account_id)
    ))
  );

drop policy if exists "loan_payments_update_owner" on public.loan_payments;
create policy "loan_payments_update_owner"
  on public.loan_payments for update to authenticated
  using (
    public.is_approved_active_user()
    and exists (
      select 1 from public.loans l
      where l.id = loan_id and l.owner_profile_id = auth.uid()
    )
  )
  with check (
    public.is_approved_active_user()
    and exists (
      select 1 from public.loans l
      where l.id = loan_id and l.owner_profile_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- budgets
-- ---------------------------------------------------------------------------

drop policy if exists "budgets_select_approved" on public.budgets;
create policy "budgets_select_approved"
  on public.budgets for select to authenticated
  using (public.is_approved_active_user());

drop policy if exists "budgets_insert" on public.budgets;
create policy "budgets_insert"
  on public.budgets for insert to authenticated
  with check (
    public.is_approved_active_user()
    and created_by = auth.uid()
    and (
      scope in ('shared', 'business')
      or (scope = 'personal' and owner_profile_id = auth.uid())
    )
  );

drop policy if exists "budgets_update" on public.budgets;
create policy "budgets_update"
  on public.budgets for update to authenticated
  using (
    public.is_approved_active_user()
    and (
      scope in ('shared', 'business')
      or owner_profile_id = auth.uid()
    )
  )
  with check (
    public.is_approved_active_user()
    and (
      scope in ('shared', 'business')
      or owner_profile_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- note_folders / notes / attachments
-- ---------------------------------------------------------------------------

drop policy if exists "note_folders_select_approved" on public.note_folders;
create policy "note_folders_select_approved"
  on public.note_folders for select to authenticated
  using (public.is_approved_active_user());

drop policy if exists "note_folders_insert_approved" on public.note_folders;
create policy "note_folders_insert_approved"
  on public.note_folders for insert to authenticated
  with check (public.is_shared_admin());

drop policy if exists "note_folders_update_approved" on public.note_folders;
create policy "note_folders_update_approved"
  on public.note_folders for update to authenticated
  using (public.is_shared_admin())
  with check (public.is_shared_admin());

drop policy if exists "notes_select" on public.notes;
create policy "notes_select"
  on public.notes for select to authenticated
  using (
    public.is_approved_active_user()
    and (
      visibility = 'shared'
      or owner_profile_id = auth.uid()
    )
  );

drop policy if exists "notes_insert" on public.notes;
create policy "notes_insert"
  on public.notes for insert to authenticated
  with check (
    public.is_approved_active_user()
    and created_by = auth.uid()
    and (
      (visibility = 'shared')
      or (visibility = 'personal' and owner_profile_id = auth.uid())
    )
  );

drop policy if exists "notes_update" on public.notes;
create policy "notes_update"
  on public.notes for update to authenticated
  using (
    public.is_approved_active_user()
    and (
      visibility = 'shared'
      or owner_profile_id = auth.uid()
    )
  )
  with check (
    public.is_approved_active_user()
    and (
      visibility = 'shared'
      or owner_profile_id = auth.uid()
    )
  );

drop policy if exists "attachments_select" on public.attachments;
create policy "attachments_select"
  on public.attachments for select to authenticated
  using (
    public.is_approved_active_user()
    and (
      note_id is null
      or exists (
        select 1 from public.notes n
        where n.id = note_id
          and (n.visibility = 'shared' or n.owner_profile_id = auth.uid())
      )
    )
  );

drop policy if exists "attachments_insert" on public.attachments;
create policy "attachments_insert"
  on public.attachments for insert to authenticated
  with check (
    public.is_approved_active_user()
    and uploaded_by = auth.uid()
  );

drop policy if exists "attachments_update_own" on public.attachments;
create policy "attachments_update_own"
  on public.attachments for update to authenticated
  using (
    public.is_approved_active_user()
    and uploaded_by = auth.uid()
  )
  with check (
    public.is_approved_active_user()
    and uploaded_by = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- business + growth
-- ---------------------------------------------------------------------------

drop policy if exists "business_clients_all_approved" on public.business_clients;
create policy "business_clients_all_approved"
  on public.business_clients for all to authenticated
  using (public.is_shared_admin())
  with check (public.is_shared_admin());

drop policy if exists "business_income_all_approved" on public.business_income;
create policy "business_income_all_approved"
  on public.business_income for all to authenticated
  using (public.is_shared_admin())
  with check (public.is_shared_admin());

drop policy if exists "business_expenses_all_approved" on public.business_expenses;
create policy "business_expenses_all_approved"
  on public.business_expenses for all to authenticated
  using (public.is_shared_admin())
  with check (public.is_shared_admin());

drop policy if exists "business_targets_all_approved" on public.business_targets;
create policy "business_targets_all_approved"
  on public.business_targets for all to authenticated
  using (public.is_shared_admin())
  with check (public.is_shared_admin());

drop policy if exists "upwork_activities_all_approved" on public.upwork_activities;
create policy "upwork_activities_all_approved"
  on public.upwork_activities for all to authenticated
  using (public.is_shared_admin())
  with check (public.is_shared_admin());

drop policy if exists "linkedin_activities_all_approved" on public.linkedin_activities;
create policy "linkedin_activities_all_approved"
  on public.linkedin_activities for all to authenticated
  using (public.is_shared_admin())
  with check (public.is_shared_admin());

-- ---------------------------------------------------------------------------
-- notifications (own rows only)
-- ---------------------------------------------------------------------------

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select to authenticated
  using (
    public.is_approved_active_user()
    and profile_id = auth.uid()
  );

drop policy if exists "notifications_update_own_read" on public.notifications;
create policy "notifications_update_own_read"
  on public.notifications for update to authenticated
  using (
    public.is_approved_active_user()
    and profile_id = auth.uid()
  )
  with check (
    public.is_approved_active_user()
    and profile_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- audit_logs (SELECT only)
-- ---------------------------------------------------------------------------

drop policy if exists "audit_logs_select_approved" on public.audit_logs;
create policy "audit_logs_select_approved"
  on public.audit_logs for select to authenticated
  using (public.is_approved_active_user());

-- ---------------------------------------------------------------------------
-- app_settings
-- ---------------------------------------------------------------------------

drop policy if exists "app_settings_select_approved" on public.app_settings;
create policy "app_settings_select_approved"
  on public.app_settings for select to authenticated
  using (public.is_shared_admin());

drop policy if exists "app_settings_insert_approved" on public.app_settings;
create policy "app_settings_insert_approved"
  on public.app_settings for insert to authenticated
  with check (public.is_shared_admin());

drop policy if exists "app_settings_update_approved" on public.app_settings;
create policy "app_settings_update_approved"
  on public.app_settings for update to authenticated
  using (public.is_shared_admin())
  with check (public.is_shared_admin());
