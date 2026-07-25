-- Phase 5: workspace-scoped RLS (replaces Phase 2 global is_approved_active_user() read policies)

-- ---------------------------------------------------------------------------
-- workspaces
-- ---------------------------------------------------------------------------

drop policy if exists "workspaces_select_member" on public.workspaces;
create policy "workspaces_select_member"
  on public.workspaces for select to authenticated
  using (public.is_active_workspace_member(id));

-- ---------------------------------------------------------------------------
-- workspace_memberships (SELECT only for clients)
-- ---------------------------------------------------------------------------

drop policy if exists "workspace_memberships_select" on public.workspace_memberships;
create policy "workspace_memberships_select"
  on public.workspace_memberships for select to authenticated
  using (
    profile_id = auth.uid()
    or exists (
      select 1
      from public.workspace_memberships wm2
      where wm2.profile_id = auth.uid()
        and wm2.workspace_id = workspace_memberships.workspace_id
        and wm2.is_active = true
        and workspace_memberships.is_active = true
    )
  );

-- No client insert/update/delete on workspace_memberships.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

drop policy if exists "profiles_select_approved" on public.profiles;
create policy "profiles_select_approved"
  on public.profiles for select to authenticated
  using (
    exists (
      select 1
      from public.workspace_memberships wm_self
      inner join public.workspace_memberships wm_target
        on wm_target.workspace_id = wm_self.workspace_id
      where wm_self.profile_id = auth.uid()
        and wm_self.is_active = true
        and wm_target.profile_id = profiles.id
        and wm_target.is_active = true
    )
  );

-- profiles_insert_own / profiles_update_own unchanged (Phase 1).

-- ---------------------------------------------------------------------------
-- accounts
-- ---------------------------------------------------------------------------

drop policy if exists "accounts_select_approved" on public.accounts;
create policy "accounts_select_approved"
  on public.accounts for select to authenticated
  using (public.is_active_workspace_member(workspace_id));

drop policy if exists "accounts_insert_own" on public.accounts;
create policy "accounts_insert_own"
  on public.accounts for insert to authenticated
  with check (
    public.is_approved_active_user()
    and owner_profile_id = auth.uid()
    and public.profile_belongs_to_workspace(owner_profile_id, workspace_id)
  );

drop policy if exists "accounts_update_own" on public.accounts;
create policy "accounts_update_own"
  on public.accounts for update to authenticated
  using (public.is_account_owner(id))
  with check (public.is_account_owner(id));

-- workspace_id / owner_profile_id immutability enforced by accounts_prevent_workspace_change_bu trigger.

-- ---------------------------------------------------------------------------
-- account_permissions (read-only for clients; sync via SECURITY DEFINER)
-- ---------------------------------------------------------------------------

drop policy if exists "account_permissions_select_approved" on public.account_permissions;
create policy "account_permissions_select_approved"
  on public.account_permissions for select to authenticated
  using (public.is_active_workspace_member(workspace_id));

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------

drop policy if exists "categories_select_approved" on public.categories;
create policy "categories_select_approved"
  on public.categories for select to authenticated
  using (public.is_active_workspace_member(workspace_id));

drop policy if exists "categories_insert_approved" on public.categories;
create policy "categories_insert_approved"
  on public.categories for insert to authenticated
  with check (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  );

drop policy if exists "categories_update_approved" on public.categories;
create policy "categories_update_approved"
  on public.categories for update to authenticated
  using (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  )
  with check (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  );

-- ---------------------------------------------------------------------------
-- income_sources
-- ---------------------------------------------------------------------------

drop policy if exists "income_sources_select_approved" on public.income_sources;
create policy "income_sources_select_approved"
  on public.income_sources for select to authenticated
  using (public.is_active_workspace_member(workspace_id));

drop policy if exists "income_sources_insert_approved" on public.income_sources;
create policy "income_sources_insert_approved"
  on public.income_sources for insert to authenticated
  with check (
    public.is_active_workspace_member(workspace_id)
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
    public.is_active_workspace_member(workspace_id)
    and (is_shared_income = true or owner_profile_id = auth.uid())
  )
  with check (
    public.is_active_workspace_member(workspace_id)
    and (is_shared_income = true or owner_profile_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------------

drop policy if exists "transactions_select_approved" on public.transactions;
create policy "transactions_select_approved"
  on public.transactions for select to authenticated
  using (public.is_active_workspace_member(workspace_id));

drop policy if exists "transactions_insert_own_account" on public.transactions;
create policy "transactions_insert_own_account"
  on public.transactions for insert to authenticated
  with check (
    public.is_active_workspace_member(workspace_id)
    and created_by = auth.uid()
    and public.is_account_owner(account_id)
    and type not in ('transfer_in', 'transfer_out', 'balance_adjustment')
  );

drop policy if exists "transactions_update_own_account" on public.transactions;
create policy "transactions_update_own_account"
  on public.transactions for update to authenticated
  using (
    public.is_active_workspace_member(workspace_id)
    and public.is_account_owner(account_id)
    and type not in ('transfer_in', 'transfer_out', 'balance_adjustment')
  )
  with check (
    public.is_active_workspace_member(workspace_id)
    and public.is_account_owner(account_id)
    and type not in ('transfer_in', 'transfer_out', 'balance_adjustment')
  );

-- ---------------------------------------------------------------------------
-- transfers / contributions / balance_adjustments (SELECT only)
-- ---------------------------------------------------------------------------

drop policy if exists "transfers_select_approved" on public.transfers;
create policy "transfers_select_approved"
  on public.transfers for select to authenticated
  using (public.is_active_workspace_member(workspace_id));

drop policy if exists "account_contributions_select_approved" on public.account_contributions;
create policy "account_contributions_select_approved"
  on public.account_contributions for select to authenticated
  using (public.is_active_workspace_member(workspace_id));

drop policy if exists "balance_adjustments_select_approved" on public.balance_adjustments;
create policy "balance_adjustments_select_approved"
  on public.balance_adjustments for select to authenticated
  using (public.is_active_workspace_member(workspace_id));

-- ---------------------------------------------------------------------------
-- financial_goals
-- ---------------------------------------------------------------------------

drop policy if exists "financial_goals_select_approved" on public.financial_goals;
create policy "financial_goals_select_approved"
  on public.financial_goals for select to authenticated
  using (public.is_active_workspace_member(workspace_id));

drop policy if exists "financial_goals_insert" on public.financial_goals;
create policy "financial_goals_insert"
  on public.financial_goals for insert to authenticated
  with check (
    public.is_active_workspace_member(workspace_id)
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
    public.is_active_workspace_member(workspace_id)
    and (
      ownership_type in ('shared', 'business')
      or owner_profile_id = auth.uid()
    )
  )
  with check (
    public.is_active_workspace_member(workspace_id)
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
  using (public.is_active_workspace_member(workspace_id));

drop policy if exists "goal_contributions_insert" on public.goal_contributions;
create policy "goal_contributions_insert"
  on public.goal_contributions for insert to authenticated
  with check (
    public.is_active_workspace_member(workspace_id)
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
    public.is_active_workspace_member(workspace_id)
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
    public.is_active_workspace_member(workspace_id)
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
  using (public.is_active_workspace_member(workspace_id));

drop policy if exists "loans_insert_own" on public.loans;
create policy "loans_insert_own"
  on public.loans for insert to authenticated
  with check (
    public.is_active_workspace_member(workspace_id)
    and owner_profile_id = auth.uid()
    and created_by = auth.uid()
  );

drop policy if exists "loans_update_own" on public.loans;
create policy "loans_update_own"
  on public.loans for update to authenticated
  using (
    public.is_active_workspace_member(workspace_id)
    and owner_profile_id = auth.uid()
  )
  with check (
    public.is_active_workspace_member(workspace_id)
    and owner_profile_id = auth.uid()
  );

drop policy if exists "loan_payments_select_approved" on public.loan_payments;
create policy "loan_payments_select_approved"
  on public.loan_payments for select to authenticated
  using (public.is_active_workspace_member(workspace_id));

drop policy if exists "loan_payments_insert_owner" on public.loan_payments;
create policy "loan_payments_insert_owner"
  on public.loan_payments for insert to authenticated
  with check (
    public.is_active_workspace_member(workspace_id)
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
    public.is_active_workspace_member(workspace_id)
    and exists (
      select 1 from public.loans l
      where l.id = loan_id and l.owner_profile_id = auth.uid()
    )
  )
  with check (
    public.is_active_workspace_member(workspace_id)
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
  using (public.is_active_workspace_member(workspace_id));

drop policy if exists "budgets_insert" on public.budgets;
create policy "budgets_insert"
  on public.budgets for insert to authenticated
  with check (
    public.is_active_workspace_member(workspace_id)
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
    public.is_active_workspace_member(workspace_id)
    and (
      scope in ('shared', 'business')
      or owner_profile_id = auth.uid()
    )
  )
  with check (
    public.is_active_workspace_member(workspace_id)
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
  using (public.is_active_workspace_member(workspace_id));

drop policy if exists "note_folders_insert_approved" on public.note_folders;
create policy "note_folders_insert_approved"
  on public.note_folders for insert to authenticated
  with check (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  );

drop policy if exists "note_folders_update_approved" on public.note_folders;
create policy "note_folders_update_approved"
  on public.note_folders for update to authenticated
  using (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  )
  with check (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  );

drop policy if exists "notes_select" on public.notes;
create policy "notes_select"
  on public.notes for select to authenticated
  using (
    public.is_active_workspace_member(workspace_id)
    and (
      visibility = 'shared'
      or owner_profile_id = auth.uid()
    )
  );

drop policy if exists "notes_insert" on public.notes;
create policy "notes_insert"
  on public.notes for insert to authenticated
  with check (
    public.is_active_workspace_member(workspace_id)
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
    public.is_active_workspace_member(workspace_id)
    and (
      visibility = 'shared'
      or owner_profile_id = auth.uid()
    )
  )
  with check (
    public.is_active_workspace_member(workspace_id)
    and (
      visibility = 'shared'
      or owner_profile_id = auth.uid()
    )
  );

drop policy if exists "attachments_select" on public.attachments;
create policy "attachments_select"
  on public.attachments for select to authenticated
  using (
    public.is_active_workspace_member(workspace_id)
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
    public.is_active_workspace_member(workspace_id)
    and uploaded_by = auth.uid()
  );

drop policy if exists "attachments_update_own" on public.attachments;
create policy "attachments_update_own"
  on public.attachments for update to authenticated
  using (
    public.is_active_workspace_member(workspace_id)
    and uploaded_by = auth.uid()
  )
  with check (
    public.is_active_workspace_member(workspace_id)
    and uploaded_by = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- business + growth (members read; workspace admins write)
-- ---------------------------------------------------------------------------

drop policy if exists "business_clients_all_approved" on public.business_clients;
create policy "business_clients_select_approved"
  on public.business_clients for select to authenticated
  using (public.is_active_workspace_member(workspace_id));

create policy "business_clients_insert_approved"
  on public.business_clients for insert to authenticated
  with check (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  );

create policy "business_clients_update_approved"
  on public.business_clients for update to authenticated
  using (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  )
  with check (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  );

create policy "business_clients_delete_approved"
  on public.business_clients for delete to authenticated
  using (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  );

drop policy if exists "business_income_all_approved" on public.business_income;
create policy "business_income_select_approved"
  on public.business_income for select to authenticated
  using (public.is_active_workspace_member(workspace_id));

create policy "business_income_insert_approved"
  on public.business_income for insert to authenticated
  with check (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  );

create policy "business_income_update_approved"
  on public.business_income for update to authenticated
  using (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  )
  with check (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  );

create policy "business_income_delete_approved"
  on public.business_income for delete to authenticated
  using (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  );

drop policy if exists "business_expenses_all_approved" on public.business_expenses;
create policy "business_expenses_select_approved"
  on public.business_expenses for select to authenticated
  using (public.is_active_workspace_member(workspace_id));

create policy "business_expenses_insert_approved"
  on public.business_expenses for insert to authenticated
  with check (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  );

create policy "business_expenses_update_approved"
  on public.business_expenses for update to authenticated
  using (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  )
  with check (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  );

create policy "business_expenses_delete_approved"
  on public.business_expenses for delete to authenticated
  using (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  );

drop policy if exists "business_targets_all_approved" on public.business_targets;
create policy "business_targets_select_approved"
  on public.business_targets for select to authenticated
  using (public.is_active_workspace_member(workspace_id));

create policy "business_targets_insert_approved"
  on public.business_targets for insert to authenticated
  with check (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  );

create policy "business_targets_update_approved"
  on public.business_targets for update to authenticated
  using (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  )
  with check (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  );

create policy "business_targets_delete_approved"
  on public.business_targets for delete to authenticated
  using (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  );

drop policy if exists "upwork_activities_all_approved" on public.upwork_activities;
create policy "upwork_activities_select_approved"
  on public.upwork_activities for select to authenticated
  using (public.is_active_workspace_member(workspace_id));

create policy "upwork_activities_insert_approved"
  on public.upwork_activities for insert to authenticated
  with check (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  );

create policy "upwork_activities_update_approved"
  on public.upwork_activities for update to authenticated
  using (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  )
  with check (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  );

create policy "upwork_activities_delete_approved"
  on public.upwork_activities for delete to authenticated
  using (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  );

drop policy if exists "linkedin_activities_all_approved" on public.linkedin_activities;
create policy "linkedin_activities_select_approved"
  on public.linkedin_activities for select to authenticated
  using (public.is_active_workspace_member(workspace_id));

create policy "linkedin_activities_insert_approved"
  on public.linkedin_activities for insert to authenticated
  with check (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  );

create policy "linkedin_activities_update_approved"
  on public.linkedin_activities for update to authenticated
  using (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  )
  with check (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  );

create policy "linkedin_activities_delete_approved"
  on public.linkedin_activities for delete to authenticated
  using (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  );

-- ---------------------------------------------------------------------------
-- notifications (own rows only)
-- ---------------------------------------------------------------------------

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select to authenticated
  using (
    profile_id = auth.uid()
    and public.is_active_workspace_member(workspace_id)
  );

drop policy if exists "notifications_update_own_read" on public.notifications;
create policy "notifications_update_own_read"
  on public.notifications for update to authenticated
  using (
    profile_id = auth.uid()
    and public.is_active_workspace_member(workspace_id)
  )
  with check (
    profile_id = auth.uid()
    and public.is_active_workspace_member(workspace_id)
  );

-- ---------------------------------------------------------------------------
-- audit_logs (SELECT only)
-- ---------------------------------------------------------------------------

drop policy if exists "audit_logs_select_approved" on public.audit_logs;
create policy "audit_logs_select_approved"
  on public.audit_logs for select to authenticated
  using (public.is_active_workspace_member(workspace_id));

-- No client insert/update/delete on audit_logs.

-- ---------------------------------------------------------------------------
-- app_settings
-- ---------------------------------------------------------------------------

drop policy if exists "app_settings_select_approved" on public.app_settings;
create policy "app_settings_select_approved"
  on public.app_settings for select to authenticated
  using (public.is_active_workspace_member(workspace_id));

drop policy if exists "app_settings_insert_approved" on public.app_settings;
create policy "app_settings_insert_approved"
  on public.app_settings for insert to authenticated
  with check (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  );

drop policy if exists "app_settings_update_approved" on public.app_settings;
create policy "app_settings_update_approved"
  on public.app_settings for update to authenticated
  using (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  )
  with check (
    public.is_active_workspace_member(workspace_id)
    and public.is_workspace_admin(workspace_id)
  );
