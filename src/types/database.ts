/**
 * Phase 2 database types for Hisab.
 *
 * Prefer regenerating with:
 *   npm run supabase:types
 * which writes `database.generated.ts`. Keep this file as the app-facing contract
 * (helpers + Phase 1/2 tables). Merge generated output carefully — do not overwrite
 * handwritten UI domain types in `src/types/index.ts`.
 *
 * Direction model: `transactions.direction` is -1 or 1. Amounts stay positive;
 * signed ledger effect = amount_pkr * direction.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SystemRole = "admin";
export type DashboardModeDb = "combined" | "personal";
export type ThemePreference = "light" | "dark" | "system";

export type AppRole = "admin";
export type AccountTypeDb = "current" | "savings" | "business" | "cash" | "other";
export type CategoryTypeDb = "income" | "expense" | "both";
export type TransactionTypeDb =
  | "income"
  | "expense"
  | "transfer_in"
  | "transfer_out"
  | "refund"
  | "family_contribution"
  | "loan_repayment"
  | "loan_payment"
  | "balance_adjustment";
export type TransactionStatusDb = "expected" | "pending" | "completed" | "cancelled";
export type FinancialClassificationDb = "personal" | "shared" | "business";
export type GoalOwnershipTypeDb = "personal" | "shared" | "business";
export type GoalStatusDb = "active" | "completed" | "paused" | "cancelled";
export type GoalContributionTypeDb = "deposit" | "withdrawal" | "adjustment";
export type LoanStatusDb = "active" | "paid" | "paused" | "cancelled";
export type NoteVisibilityDb = "personal" | "shared";
export type BudgetScopeDb = "personal" | "shared" | "business";
export type BusinessIncomeStatusDb =
  | "expected"
  | "partially_received"
  | "received"
  | "overdue"
  | "cancelled";
export type NotificationTypeDb =
  | "transfer"
  | "reconciliation"
  | "transaction"
  | "budget"
  | "goal"
  | "income"
  | "loan"
  | "system";
export type TransactionDirection = -1 | 1;

type IsoTimestamptz = string;
type IsoDate = string;

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];

export interface Database {
  public: {
    Tables: {
      approved_users: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          system_role: AppRole;
          is_active: boolean;
          initial_workspace_slug: string | null;
          created_at: IsoTimestamptz;
          updated_at: IsoTimestamptz;
        };
        Insert: {
          id?: string;
          email: string;
          display_name: string;
          system_role?: AppRole;
          is_active?: boolean;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string;
          system_role?: AppRole;
          is_active?: boolean;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          approved_user_id: string;
          email: string;
          display_name: string;
          avatar_url: string | null;
          default_dashboard_mode: DashboardModeDb;
          preferred_theme: ThemePreference;
          balances_hidden_by_default: boolean;
          onboarding_completed: boolean;
          savings_plan_mode: string;
          custom_savings_rate: number | null;
          created_at: IsoTimestamptz;
          updated_at: IsoTimestamptz;
        };
        Insert: {
          id: string;
          approved_user_id: string;
          email: string;
          display_name: string;
          avatar_url?: string | null;
          default_dashboard_mode?: DashboardModeDb;
          preferred_theme?: ThemePreference;
          balances_hidden_by_default?: boolean;
          onboarding_completed?: boolean;
          savings_plan_mode?: string;
          custom_savings_rate?: number | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
        };
        Update: {
          id?: string;
          approved_user_id?: string;
          email?: string;
          display_name?: string;
          avatar_url?: string | null;
          default_dashboard_mode?: DashboardModeDb;
          preferred_theme?: ThemePreference;
          balances_hidden_by_default?: boolean;
          onboarding_completed?: boolean;
          savings_plan_mode?: string;
          custom_savings_rate?: number | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_approved_user_id_fkey";
            columns: ["approved_user_id"];
            isOneToOne: true;
            referencedRelation: "approved_users";
            referencedColumns: ["id"];
          },
        ];
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string;
          workspace_type: "shared" | "personal";
          default_currency: string;
          is_active: boolean;
          created_by: string | null;
          created_at: IsoTimestamptz;
          updated_at: IsoTimestamptz;
          archived_at: IsoTimestamptz | null;
        };
        Insert: {
          id: string;
          name: string;
          slug: string;
          workspace_type: "shared" | "personal";
          default_currency?: string;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
          archived_at?: IsoTimestamptz | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          workspace_type?: "shared" | "personal";
          default_currency?: string;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
          archived_at?: IsoTimestamptz | null;
        };
        Relationships: [];
      };
      workspace_memberships: {
        Row: {
          id: string;
          workspace_id: string;
          profile_id: string;
          role: "admin" | "member";
          is_active: boolean;
          joined_at: IsoTimestamptz;
          created_at: IsoTimestamptz;
          updated_at: IsoTimestamptz;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          profile_id: string;
          role?: "admin" | "member";
          is_active?: boolean;
          joined_at?: IsoTimestamptz;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          profile_id?: string;
          role?: "admin" | "member";
          is_active?: boolean;
          joined_at?: IsoTimestamptz;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
        };
        Relationships: [];
      };
      accounts: {
        Row: {
          id: string;
          name: string;
          bank_name: string;
          owner_profile_id: string;
          workspace_id: string;
          account_type: AccountTypeDb;
          primary_currency: string;
          opening_balance: number;
          is_shared_savings_account: boolean;
          is_active: boolean;
          last_reconciled_at: IsoTimestamptz | null;
          created_at: IsoTimestamptz;
          updated_at: IsoTimestamptz;
        };
        Insert: {
          id?: string;
          name: string;
          bank_name: string;
          owner_profile_id: string;
          workspace_id?: string;
          account_type: AccountTypeDb;
          primary_currency?: string;
          opening_balance?: number;
          is_shared_savings_account?: boolean;
          is_active?: boolean;
          last_reconciled_at?: IsoTimestamptz | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
        };
        Update: {
          id?: string;
          name?: string;
          bank_name?: string;
          owner_profile_id?: string;
          account_type?: AccountTypeDb;
          primary_currency?: string;
          opening_balance?: number;
          is_shared_savings_account?: boolean;
          is_active?: boolean;
          last_reconciled_at?: IsoTimestamptz | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
        };
        Relationships: [
          {
            foreignKeyName: "accounts_owner_profile_id_fkey";
            columns: ["owner_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      account_permissions: {
        Row: {
          id: string;
          account_id: string;
          profile_id: string;
          can_view: boolean;
          can_create_transactions: boolean;
          can_edit_transactions: boolean;
          can_archive_transactions: boolean;
          can_reconcile: boolean;
          created_at: IsoTimestamptz;
        };
        Insert: {
          id?: string;
          account_id: string;
          profile_id: string;
          can_view?: boolean;
          can_create_transactions?: boolean;
          can_edit_transactions?: boolean;
          can_archive_transactions?: boolean;
          can_reconcile?: boolean;
          created_at?: IsoTimestamptz;
        };
        Update: {
          id?: string;
          account_id?: string;
          profile_id?: string;
          can_view?: boolean;
          can_create_transactions?: boolean;
          can_edit_transactions?: boolean;
          can_archive_transactions?: boolean;
          can_reconcile?: boolean;
          created_at?: IsoTimestamptz;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          type: CategoryTypeDb;
          icon: string | null;
          is_system: boolean;
          is_active: boolean;
          created_by: string | null;
          created_at: IsoTimestamptz;
          updated_at: IsoTimestamptz;
          archived_at: IsoTimestamptz | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          type: CategoryTypeDb;
          icon?: string | null;
          is_system?: boolean;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
          archived_at?: IsoTimestamptz | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          type?: CategoryTypeDb;
          icon?: string | null;
          is_system?: boolean;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
          archived_at?: IsoTimestamptz | null;
        };
        Relationships: [];
      };
      income_sources: {
        Row: {
          id: string;
          name: string;
          owner_profile_id: string | null;
          workspace_id: string;
          source_type: string | null;
          expected_currency: string;
          default_expected_amount: number | null;
          payment_frequency: string | null;
          next_expected_date: IsoDate | null;
          is_shared_income: boolean;
          is_active: boolean;
          created_by: string;
          created_at: IsoTimestamptz;
          updated_at: IsoTimestamptz;
          archived_at: IsoTimestamptz | null;
        };
        Insert: {
          id?: string;
          name: string;
          owner_profile_id?: string | null;
          workspace_id?: string;
          source_type?: string | null;
          expected_currency?: string;
          default_expected_amount?: number | null;
          payment_frequency?: string | null;
          next_expected_date?: IsoDate | null;
          is_shared_income?: boolean;
          is_active?: boolean;
          created_by: string;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
          archived_at?: IsoTimestamptz | null;
        };
        Update: {
          id?: string;
          name?: string;
          owner_profile_id?: string | null;
          workspace_id?: string;
          source_type?: string | null;
          expected_currency?: string;
          default_expected_amount?: number | null;
          payment_frequency?: string | null;
          next_expected_date?: IsoDate | null;
          is_shared_income?: boolean;
          is_active?: boolean;
          created_by?: string;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
          archived_at?: IsoTimestamptz | null;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          account_id: string;
          type: TransactionTypeDb;
          category_id: string | null;
          income_source_id: string | null;
          amount_original: number;
          currency_original: string;
          exchange_rate: number | null;
          amount_pkr: number;
          exchange_rate_source: string | null;
          exchange_rate_timestamp: IsoTimestamptz | null;
          description: string;
          notes: string | null;
          transaction_date: IsoDate;
          status: TransactionStatusDb;
          classification: FinancialClassificationDb;
          direction: TransactionDirection;
          goal_id: string | null;
          transfer_id: string | null;
          balance_adjustment_id: string | null;
          created_by: string;
          updated_by: string | null;
          archived_at: IsoTimestamptz | null;
          archived_by: string | null;
          created_at: IsoTimestamptz;
          updated_at: IsoTimestamptz;
          client_request_id: string | null;
          exchange_rate_is_manual: boolean;
        };
        Insert: {
          id?: string;
          account_id: string;
          type: TransactionTypeDb;
          category_id?: string | null;
          income_source_id?: string | null;
          amount_original: number;
          currency_original?: string;
          exchange_rate?: number | null;
          amount_pkr: number;
          exchange_rate_source?: string | null;
          exchange_rate_timestamp?: IsoTimestamptz | null;
          description: string;
          notes?: string | null;
          transaction_date: IsoDate;
          status?: TransactionStatusDb;
          classification?: FinancialClassificationDb;
          direction: TransactionDirection;
          goal_id?: string | null;
          transfer_id?: string | null;
          balance_adjustment_id?: string | null;
          created_by: string;
          updated_by?: string | null;
          archived_at?: IsoTimestamptz | null;
          archived_by?: string | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
          client_request_id?: string | null;
          exchange_rate_is_manual?: boolean;
        };
        Update: {
          id?: string;
          account_id?: string;
          type?: TransactionTypeDb;
          category_id?: string | null;
          income_source_id?: string | null;
          amount_original?: number;
          currency_original?: string;
          exchange_rate?: number | null;
          amount_pkr?: number;
          exchange_rate_source?: string | null;
          exchange_rate_timestamp?: IsoTimestamptz | null;
          description?: string;
          notes?: string | null;
          transaction_date?: IsoDate;
          status?: TransactionStatusDb;
          classification?: FinancialClassificationDb;
          direction?: TransactionDirection;
          goal_id?: string | null;
          transfer_id?: string | null;
          balance_adjustment_id?: string | null;
          created_by?: string;
          updated_by?: string | null;
          archived_at?: IsoTimestamptz | null;
          archived_by?: string | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
          client_request_id?: string | null;
          exchange_rate_is_manual?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey",
            columns: ["account_id"],
            isOneToOne: false,
            referencedRelation: "accounts",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "transactions_category_id_fkey",
            columns: ["category_id"],
            isOneToOne: false,
            referencedRelation: "categories",
            referencedColumns: ["id"],
          },
        ];
      };
      transfers: {
        Row: {
          id: string;
          source_account_id: string;
          destination_account_id: string;
          amount_original: number;
          currency: string;
          exchange_rate: number;
          amount_pkr: number;
          initiated_by: string;
          transaction_date: IsoDate;
          notes: string | null;
          status: TransactionStatusDb;
          idempotency_key: string | null;
          created_at: IsoTimestamptz;
          updated_at: IsoTimestamptz;
          archived_at: IsoTimestamptz | null;
        };
        Insert: {
          id?: string;
          source_account_id: string;
          destination_account_id: string;
          amount_original: number;
          currency: string;
          exchange_rate?: number;
          amount_pkr: number;
          initiated_by: string;
          transaction_date: IsoDate;
          notes?: string | null;
          status?: TransactionStatusDb;
          idempotency_key?: string | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
          archived_at?: IsoTimestamptz | null;
        };
        Update: {
          id?: string;
          source_account_id?: string;
          destination_account_id?: string;
          amount_original?: number;
          currency?: string;
          exchange_rate?: number;
          amount_pkr?: number;
          idempotency_key?: string | null;
          initiated_by?: string;
          transaction_date?: IsoDate;
          notes?: string | null;
          status?: TransactionStatusDb;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
          archived_at?: IsoTimestamptz | null;
        };
        Relationships: [];
      };
      account_contributions: {
        Row: {
          id: string;
          account_id: string;
          contributor_profile_id: string;
          transfer_id: string | null;
          transaction_id: string | null;
          amount_pkr: number;
          contribution_type: "deposit" | "opening_allocation" | "manual_adjustment";
          contribution_date: IsoDate;
          notes: string | null;
          created_at: IsoTimestamptz;
        };
        Insert: {
          id?: string;
          account_id: string;
          contributor_profile_id: string;
          transfer_id?: string | null;
          transaction_id?: string | null;
          amount_pkr: number;
          contribution_type: "deposit" | "opening_allocation" | "manual_adjustment";
          contribution_date: IsoDate;
          notes?: string | null;
          created_at?: IsoTimestamptz;
        };
        Update: {
          id?: string;
          account_id?: string;
          contributor_profile_id?: string;
          transfer_id?: string | null;
          transaction_id?: string | null;
          amount_pkr?: number;
          contribution_type?: "deposit" | "opening_allocation" | "manual_adjustment";
          contribution_date?: IsoDate;
          notes?: string | null;
          created_at?: IsoTimestamptz;
        };
        Relationships: [];
      };
      balance_adjustments: {
        Row: {
          id: string;
          account_id: string;
          calculated_balance_before: number;
          actual_balance: number;
          adjustment_amount: number;
          reason: string;
          reconciled_by: string;
          reconciled_at: IsoTimestamptz;
          created_at: IsoTimestamptz;
        };
        Insert: {
          id?: string;
          account_id: string;
          calculated_balance_before: number;
          actual_balance: number;
          adjustment_amount: number;
          reason: string;
          reconciled_by: string;
          reconciled_at?: IsoTimestamptz;
          created_at?: IsoTimestamptz;
        };
        Update: {
          id?: string;
          account_id?: string;
          calculated_balance_before?: number;
          actual_balance?: number;
          adjustment_amount?: number;
          reason?: string;
          reconciled_by?: string;
          reconciled_at?: IsoTimestamptz;
          created_at?: IsoTimestamptz;
        };
        Relationships: [];
      };
      financial_goals: {
        Row: {
          id: string;
          name: string;
          goal_type: string;
          ownership_type: GoalOwnershipTypeDb;
          owner_profile_id: string | null;
          target_amount: number;
          starting_amount: number;
          target_date: IsoDate | null;
          priority: number;
          funding_account_id: string | null;
          monthly_target: number | null;
          status: GoalStatusDb;
          description: string | null;
          created_by: string;
          updated_by: string | null;
          created_at: IsoTimestamptz;
          updated_at: IsoTimestamptz;
          archived_at: IsoTimestamptz | null;
        };
        Insert: {
          id?: string;
          name: string;
          goal_type: string;
          ownership_type: GoalOwnershipTypeDb;
          owner_profile_id?: string | null;
          target_amount: number;
          starting_amount?: number;
          target_date?: IsoDate | null;
          priority?: number;
          funding_account_id?: string | null;
          monthly_target?: number | null;
          status?: GoalStatusDb;
          description?: string | null;
          created_by: string;
          updated_by?: string | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
          archived_at?: IsoTimestamptz | null;
        };
        Update: {
          id?: string;
          name?: string;
          goal_type?: string;
          ownership_type?: GoalOwnershipTypeDb;
          owner_profile_id?: string | null;
          target_amount?: number;
          starting_amount?: number;
          target_date?: IsoDate | null;
          priority?: number;
          funding_account_id?: string | null;
          monthly_target?: number | null;
          status?: GoalStatusDb;
          description?: string | null;
          created_by?: string;
          updated_by?: string | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
          archived_at?: IsoTimestamptz | null;
        };
        Relationships: [];
      };
      goal_contributions: {
        Row: {
          id: string;
          goal_id: string;
          contributor_profile_id: string;
          account_id: string | null;
          transaction_id: string | null;
          amount: number;
          contribution_date: IsoDate;
          contribution_type: GoalContributionTypeDb;
          notes: string | null;
          created_by: string;
          created_at: IsoTimestamptz;
        };
        Insert: {
          id?: string;
          goal_id: string;
          contributor_profile_id: string;
          account_id?: string | null;
          transaction_id?: string | null;
          amount: number;
          contribution_date: IsoDate;
          contribution_type: GoalContributionTypeDb;
          notes?: string | null;
          created_by: string;
          created_at?: IsoTimestamptz;
        };
        Update: {
          id?: string;
          goal_id?: string;
          contributor_profile_id?: string;
          account_id?: string | null;
          transaction_id?: string | null;
          amount?: number;
          contribution_date?: IsoDate;
          contribution_type?: GoalContributionTypeDb;
          notes?: string | null;
          created_by?: string;
          created_at?: IsoTimestamptz;
        };
        Relationships: [];
      };
      loans: {
        Row: {
          id: string;
          name: string;
          owner_profile_id: string;
          original_amount: number;
          starting_remaining_balance: number;
          interest_rate: number | null;
          markup_type: string | null;
          monthly_installment: number | null;
          installment_due_day: number | null;
          funding_account_id: string | null;
          start_date: IsoDate | null;
          expected_end_date: IsoDate | null;
          status: LoanStatusDb;
          notes: string | null;
          created_by: string;
          updated_by: string | null;
          created_at: IsoTimestamptz;
          updated_at: IsoTimestamptz;
          archived_at: IsoTimestamptz | null;
        };
        Insert: {
          id?: string;
          name: string;
          owner_profile_id: string;
          original_amount: number;
          starting_remaining_balance: number;
          interest_rate?: number | null;
          markup_type?: string | null;
          monthly_installment?: number | null;
          installment_due_day?: number | null;
          funding_account_id?: string | null;
          start_date?: IsoDate | null;
          expected_end_date?: IsoDate | null;
          status?: LoanStatusDb;
          notes?: string | null;
          created_by: string;
          updated_by?: string | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
          archived_at?: IsoTimestamptz | null;
        };
        Update: {
          id?: string;
          name?: string;
          owner_profile_id?: string;
          original_amount?: number;
          starting_remaining_balance?: number;
          interest_rate?: number | null;
          markup_type?: string | null;
          monthly_installment?: number | null;
          installment_due_day?: number | null;
          funding_account_id?: string | null;
          start_date?: IsoDate | null;
          expected_end_date?: IsoDate | null;
          status?: LoanStatusDb;
          notes?: string | null;
          created_by?: string;
          updated_by?: string | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
          archived_at?: IsoTimestamptz | null;
        };
        Relationships: [];
      };
      loan_payments: {
        Row: {
          id: string;
          loan_id: string;
          transaction_id: string | null;
          amount: number;
          principal_amount: number | null;
          markup_amount: number | null;
          payment_date: IsoDate;
          remaining_balance_after: number | null;
          created_by: string;
          created_at: IsoTimestamptz;
        };
        Insert: {
          id?: string;
          loan_id: string;
          transaction_id?: string | null;
          amount: number;
          principal_amount?: number | null;
          markup_amount?: number | null;
          payment_date: IsoDate;
          remaining_balance_after?: number | null;
          created_by: string;
          created_at?: IsoTimestamptz;
        };
        Update: {
          id?: string;
          loan_id?: string;
          transaction_id?: string | null;
          amount?: number;
          principal_amount?: number | null;
          markup_amount?: number | null;
          payment_date?: IsoDate;
          remaining_balance_after?: number | null;
          created_by?: string;
          created_at?: IsoTimestamptz;
        };
        Relationships: [];
      };
      budgets: {
        Row: {
          id: string;
          month: number;
          year: number;
          category_id: string;
          scope: BudgetScopeDb;
          owner_profile_id: string | null;
          budgeted_amount: number;
          created_by: string;
          updated_by: string | null;
          created_at: IsoTimestamptz;
          updated_at: IsoTimestamptz;
        };
        Insert: {
          id?: string;
          month: number;
          year: number;
          category_id: string;
          scope: BudgetScopeDb;
          owner_profile_id?: string | null;
          budgeted_amount: number;
          created_by: string;
          updated_by?: string | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
        };
        Update: {
          id?: string;
          month?: number;
          year?: number;
          category_id?: string;
          scope?: BudgetScopeDb;
          owner_profile_id?: string | null;
          budgeted_amount?: number;
          created_by?: string;
          updated_by?: string | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
        };
        Relationships: [];
      };
      note_folders: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          slug: string;
          sort_order: number;
          is_system: boolean;
          created_by: string | null;
          created_at: IsoTimestamptz;
          updated_at: IsoTimestamptz;
          archived_at: IsoTimestamptz | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          slug: string;
          sort_order?: number;
          is_system?: boolean;
          created_by?: string | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
          archived_at?: IsoTimestamptz | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          slug?: string;
          sort_order?: number;
          is_system?: boolean;
          created_by?: string | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
          archived_at?: IsoTimestamptz | null;
        };
        Relationships: [];
      };
      notes: {
        Row: {
          id: string;
          workspace_id: string;
          folder_id: string | null;
          title: string;
          content_json: Json;
          plain_text: string;
          owner_profile_id: string | null;
          visibility: NoteVisibilityDb;
          priority: number | null;
          due_date: IsoDate | null;
          is_pinned: boolean;
          related_account_id: string | null;
          related_transaction_id: string | null;
          related_goal_id: string | null;
          related_loan_id: string | null;
          related_business_record_type: string | null;
          related_business_record_id: string | null;
          created_by: string;
          updated_by: string | null;
          archived_at: IsoTimestamptz | null;
          created_at: IsoTimestamptz;
          updated_at: IsoTimestamptz;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          folder_id?: string | null;
          title: string;
          content_json?: Json;
          plain_text?: string;
          owner_profile_id?: string | null;
          visibility?: NoteVisibilityDb;
          priority?: number | null;
          due_date?: IsoDate | null;
          is_pinned?: boolean;
          related_account_id?: string | null;
          related_transaction_id?: string | null;
          related_goal_id?: string | null;
          related_loan_id?: string | null;
          related_business_record_type?: string | null;
          related_business_record_id?: string | null;
          created_by: string;
          updated_by?: string | null;
          archived_at?: IsoTimestamptz | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
        };
        Update: {
          id?: string;
          folder_id?: string | null;
          title?: string;
          content_json?: Json;
          plain_text?: string;
          owner_profile_id?: string | null;
          visibility?: NoteVisibilityDb;
          priority?: number | null;
          due_date?: IsoDate | null;
          is_pinned?: boolean;
          related_account_id?: string | null;
          related_transaction_id?: string | null;
          related_goal_id?: string | null;
          related_loan_id?: string | null;
          related_business_record_type?: string | null;
          related_business_record_id?: string | null;
          created_by?: string;
          updated_by?: string | null;
          archived_at?: IsoTimestamptz | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
        };
        Relationships: [];
      };
      attachments: {
        Row: {
          id: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          file_size: number;
          uploaded_by: string;
          transaction_id: string | null;
          note_id: string | null;
          goal_id: string | null;
          loan_id: string | null;
          created_at: IsoTimestamptz;
          archived_at: IsoTimestamptz | null;
        };
        Insert: {
          id?: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          file_size: number;
          uploaded_by: string;
          transaction_id?: string | null;
          note_id?: string | null;
          goal_id?: string | null;
          loan_id?: string | null;
          created_at?: IsoTimestamptz;
          archived_at?: IsoTimestamptz | null;
        };
        Update: {
          id?: string;
          storage_path?: string;
          file_name?: string;
          mime_type?: string;
          file_size?: number;
          uploaded_by?: string;
          transaction_id?: string | null;
          note_id?: string | null;
          goal_id?: string | null;
          loan_id?: string | null;
          created_at?: IsoTimestamptz;
          archived_at?: IsoTimestamptz | null;
        };
        Relationships: [];
      };
      business_clients: {
        Row: {
          id: string;
          name: string;
          status: string;
          primary_currency: string;
          expected_monthly_value: number | null;
          notes: string | null;
          created_by: string;
          updated_by: string | null;
          created_at: IsoTimestamptz;
          updated_at: IsoTimestamptz;
          archived_at: IsoTimestamptz | null;
        };
        Insert: {
          id?: string;
          name: string;
          status?: string;
          primary_currency?: string;
          expected_monthly_value?: number | null;
          notes?: string | null;
          created_by: string;
          updated_by?: string | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
          archived_at?: IsoTimestamptz | null;
        };
        Update: {
          id?: string;
          name?: string;
          status?: string;
          primary_currency?: string;
          expected_monthly_value?: number | null;
          notes?: string | null;
          created_by?: string;
          updated_by?: string | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
          archived_at?: IsoTimestamptz | null;
        };
        Relationships: [];
      };
      business_income: {
        Row: {
          id: string;
          client_id: string | null;
          transaction_id: string | null;
          expected_amount: number | null;
          received_amount: number | null;
          currency: string;
          exchange_rate: number | null;
          amount_pkr: number | null;
          expected_date: IsoDate | null;
          received_date: IsoDate | null;
          status: BusinessIncomeStatusDb;
          notes: string | null;
          created_by: string;
          updated_by: string | null;
          created_at: IsoTimestamptz;
          updated_at: IsoTimestamptz;
          archived_at: IsoTimestamptz | null;
        };
        Insert: {
          id?: string;
          client_id?: string | null;
          transaction_id?: string | null;
          expected_amount?: number | null;
          received_amount?: number | null;
          currency?: string;
          exchange_rate?: number | null;
          amount_pkr?: number | null;
          expected_date?: IsoDate | null;
          received_date?: IsoDate | null;
          status?: BusinessIncomeStatusDb;
          notes?: string | null;
          created_by: string;
          updated_by?: string | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
          archived_at?: IsoTimestamptz | null;
        };
        Update: {
          id?: string;
          client_id?: string | null;
          transaction_id?: string | null;
          expected_amount?: number | null;
          received_amount?: number | null;
          currency?: string;
          exchange_rate?: number | null;
          amount_pkr?: number | null;
          expected_date?: IsoDate | null;
          received_date?: IsoDate | null;
          status?: BusinessIncomeStatusDb;
          notes?: string | null;
          created_by?: string;
          updated_by?: string | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
          archived_at?: IsoTimestamptz | null;
        };
        Relationships: [];
      };
      business_expenses: {
        Row: {
          id: string;
          transaction_id: string | null;
          category_id: string | null;
          name: string;
          amount_pkr: number;
          expense_date: IsoDate;
          recurring: boolean;
          notes: string | null;
          created_by: string;
          updated_by: string | null;
          created_at: IsoTimestamptz;
          updated_at: IsoTimestamptz;
          archived_at: IsoTimestamptz | null;
        };
        Insert: {
          id?: string;
          transaction_id?: string | null;
          category_id?: string | null;
          name: string;
          amount_pkr: number;
          expense_date: IsoDate;
          recurring?: boolean;
          notes?: string | null;
          created_by: string;
          updated_by?: string | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
          archived_at?: IsoTimestamptz | null;
        };
        Update: {
          id?: string;
          transaction_id?: string | null;
          category_id?: string | null;
          name?: string;
          amount_pkr?: number;
          expense_date?: IsoDate;
          recurring?: boolean;
          notes?: string | null;
          created_by?: string;
          updated_by?: string | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
          archived_at?: IsoTimestamptz | null;
        };
        Relationships: [];
      };
      business_targets: {
        Row: {
          id: string;
          metric: string;
          target_value: number;
          period_start: IsoDate;
          period_end: IsoDate;
          assumptions: Json;
          created_by: string;
          updated_by: string | null;
          created_at: IsoTimestamptz;
          updated_at: IsoTimestamptz;
        };
        Insert: {
          id?: string;
          metric: string;
          target_value: number;
          period_start: IsoDate;
          period_end: IsoDate;
          assumptions?: Json;
          created_by: string;
          updated_by?: string | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
        };
        Update: {
          id?: string;
          metric?: string;
          target_value?: number;
          period_start?: IsoDate;
          period_end?: IsoDate;
          assumptions?: Json;
          created_by?: string;
          updated_by?: string | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
        };
        Relationships: [];
      };
      upwork_activities: {
        Row: {
          id: string;
          activity_date: IsoDate;
          proposals_sent: number;
          responses: number;
          interviews: number;
          offers: number;
          projects_won: number;
          connects_spent: number;
          revenue_generated: number;
          notes: string | null;
          created_by: string;
          updated_by: string | null;
          created_at: IsoTimestamptz;
          updated_at: IsoTimestamptz;
        };
        Insert: {
          id?: string;
          activity_date: IsoDate;
          proposals_sent?: number;
          responses?: number;
          interviews?: number;
          offers?: number;
          projects_won?: number;
          connects_spent?: number;
          revenue_generated?: number;
          notes?: string | null;
          created_by: string;
          updated_by?: string | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
        };
        Update: {
          id?: string;
          activity_date?: IsoDate;
          proposals_sent?: number;
          responses?: number;
          interviews?: number;
          offers?: number;
          projects_won?: number;
          connects_spent?: number;
          revenue_generated?: number;
          notes?: string | null;
          created_by?: string;
          updated_by?: string | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
        };
        Relationships: [];
      };
      linkedin_activities: {
        Row: {
          id: string;
          activity_date: IsoDate;
          accounts_researched: number;
          decision_makers_identified: number;
          connection_requests: number;
          accepted_connections: number;
          conversations_started: number;
          discovery_calls: number;
          proposals_sent: number;
          clients_won: number;
          revenue_generated: number;
          content_published: number;
          notes: string | null;
          created_by: string;
          updated_by: string | null;
          created_at: IsoTimestamptz;
          updated_at: IsoTimestamptz;
        };
        Insert: {
          id?: string;
          activity_date: IsoDate;
          accounts_researched?: number;
          decision_makers_identified?: number;
          connection_requests?: number;
          accepted_connections?: number;
          conversations_started?: number;
          discovery_calls?: number;
          proposals_sent?: number;
          clients_won?: number;
          revenue_generated?: number;
          content_published?: number;
          notes?: string | null;
          created_by: string;
          updated_by?: string | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
        };
        Update: {
          id?: string;
          activity_date?: IsoDate;
          accounts_researched?: number;
          decision_makers_identified?: number;
          connection_requests?: number;
          accepted_connections?: number;
          conversations_started?: number;
          discovery_calls?: number;
          proposals_sent?: number;
          clients_won?: number;
          revenue_generated?: number;
          content_published?: number;
          notes?: string | null;
          created_by?: string;
          updated_by?: string | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          profile_id: string;
          type: NotificationTypeDb;
          title: string;
          message: string;
          related_entity_type: string | null;
          related_entity_id: string | null;
          deduplication_key: string | null;
          read_at: IsoTimestamptz | null;
          created_at: IsoTimestamptz;
        };
        Insert: {
          id?: string;
          profile_id: string;
          type: NotificationTypeDb;
          title: string;
          message: string;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
          deduplication_key?: string | null;
          read_at?: IsoTimestamptz | null;
          created_at?: IsoTimestamptz;
        };
        Update: {
          id?: string;
          profile_id?: string;
          type?: NotificationTypeDb;
          title?: string;
          message?: string;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
          deduplication_key?: string | null;
          read_at?: IsoTimestamptz | null;
          created_at?: IsoTimestamptz;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          workspace_id: string;
          actor_profile_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          account_id: string | null;
          old_values: Json | null;
          new_values: Json | null;
          metadata: Json;
          created_at: IsoTimestamptz;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          actor_profile_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          account_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          metadata?: Json;
          created_at?: IsoTimestamptz;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          actor_profile_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          account_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          metadata?: Json;
          created_at?: IsoTimestamptz;
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          id: string;
          key: string;
          value_json: Json;
          updated_by: string | null;
          created_at: IsoTimestamptz;
          updated_at: IsoTimestamptz;
        };
        Insert: {
          id?: string;
          key: string;
          value_json: Json;
          updated_by?: string | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
        };
        Update: {
          id?: string;
          key?: string;
          value_json?: Json;
          updated_by?: string | null;
          created_at?: IsoTimestamptz;
          updated_at?: IsoTimestamptz;
        };
        Relationships: [];
      };
    };
    Views: {
      account_actual_balances: {
        Row: {
          account_id: string | null;
          name: string | null;
          owner_profile_id: string | null;
          opening_balance: number | null;
          actual_balance: number | null;
        };
        Relationships: [];
      };
      account_projected_balances: {
        Row: {
          account_id: string | null;
          name: string | null;
          owner_profile_id: string | null;
          actual_balance: number | null;
          pending_effect: number | null;
          expected_effect: number | null;
          projected_balance: number | null;
        };
        Relationships: [];
      };
      combined_financial_summary: {
        Row: {
          total_actual_balance: number | null;
          total_projected_balance: number | null;
          current_month_income: number | null;
          current_month_expenses: number | null;
          current_month_net_savings: number | null;
          savings_rate: number | null;
        };
        Relationships: [];
      };
      account_contribution_totals: {
        Row: {
          account_id: string | null;
          contributor_profile_id: string | null;
          total_contributed_pkr: number | null;
          contribution_count: number | null;
        };
        Relationships: [];
      };
      goal_progress: {
        Row: {
          goal_id: string | null;
          name: string | null;
          ownership_type: GoalOwnershipTypeDb | null;
          owner_profile_id: string | null;
          target_amount: number | null;
          starting_amount: number | null;
          current_amount: number | null;
          status: GoalStatusDb | null;
        };
        Relationships: [];
      };
      loan_progress: {
        Row: {
          loan_id: string | null;
          name: string | null;
          owner_profile_id: string | null;
          original_amount: number | null;
          starting_remaining_balance: number | null;
          remaining_balance: number | null;
          total_paid: number | null;
          status: LoanStatusDb | null;
        };
        Relationships: [];
      };
      monthly_budget_usage: {
        Row: {
          budget_id: string | null;
          year: number | null;
          month: number | null;
          category_id: string | null;
          scope: BudgetScopeDb | null;
          owner_profile_id: string | null;
          budgeted_amount: number | null;
          spent_amount: number | null;
          remaining_amount: number | null;
          usage_ratio: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_approved_active_user: { Args: Record<string, never>; Returns: boolean };
      ensure_profile_for_auth_user: { Args: Record<string, never>; Returns: string };
      is_shared_admin: { Args: Record<string, never>; Returns: boolean };
      is_account_owner: { Args: { p_account_id: string }; Returns: boolean };
      current_profile_id: { Args: Record<string, never>; Returns: string };
      account_actual_balance: { Args: { p_account_id: string }; Returns: number };
      signed_effect: {
        Args: { p_amount_pkr: number; p_direction: number };
        Returns: number;
      };
      sync_account_permissions: { Args: { p_account_id: string }; Returns: undefined };
      create_account_transfer: {
        Args: {
          p_source_account_id: string;
          p_destination_account_id: string;
          p_amount_original: number;
          p_currency: string;
          p_exchange_rate: number;
          p_amount_pkr: number;
          p_transaction_date: string;
          p_notes?: string | null;
          p_idempotency_key?: string | null;
        };
        Returns: Json;
      };
      allocate_opening_contributions: {
        Args: { p_account_id: string; p_allocations: Json };
        Returns: Json;
      };
      reconcile_account_balance: {
        Args: {
          p_account_id: string;
          p_actual_balance: number;
          p_reason: string;
          p_reconciled_at?: string | null;
        };
        Returns: Json;
      };
      archive_transaction: { Args: { p_transaction_id: string }; Returns: Json };
      restore_transaction: { Args: { p_transaction_id: string }; Returns: Json };
    };
    Enums: {
      app_role: AppRole;
      account_type: AccountTypeDb;
      category_type: CategoryTypeDb;
      transaction_type: TransactionTypeDb;
      transaction_status: TransactionStatusDb;
      financial_classification: FinancialClassificationDb;
      goal_ownership_type: GoalOwnershipTypeDb;
      goal_status: GoalStatusDb;
      goal_contribution_type: GoalContributionTypeDb;
      loan_status: LoanStatusDb;
      note_visibility: NoteVisibilityDb;
      budget_scope: BudgetScopeDb;
      business_income_status: BusinessIncomeStatusDb;
      notification_type: NotificationTypeDb;
      system_role: SystemRole;
      dashboard_mode: DashboardModeDb;
      theme_preference: ThemePreference;
    };
    CompositeTypes: Record<string, never>;
  };
}

/** Adapters between DB enums and Phase 0 UI domain types (mock-backed until Phase 3+). */
export const dbTransactionTypeToUi = {
  income: "income",
  expense: "expense",
  transfer_in: "transfer",
  transfer_out: "transfer",
  refund: "refund",
  family_contribution: "family_contribution",
  loan_repayment: "income",
  loan_payment: "loan_payment",
  balance_adjustment: "balance_adjustment",
} as const satisfies Record<TransactionTypeDb, string>;

export const dbStatusToUi = {
  expected: "expected",
  pending: "pending",
  completed: "cleared",
  cancelled: "cancelled",
} as const satisfies Record<TransactionStatusDb, string>;
