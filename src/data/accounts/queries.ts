import "server-only";

import { createClient } from "@/lib/supabase/server";
import { buildAccountCapabilities } from "@/lib/finance/capabilities";
import { parseMoney } from "@/lib/money";
import { signedTransactionAmount } from "@/lib/finance/transaction-direction";
import { countsAsExpense, countsAsIncome } from "@/lib/finance/transaction-metrics";
import { requireCurrentProfile, getAllProfiles } from "@/data/profiles/queries";
import { requireCurrentWorkspace } from "@/data/workspaces/queries";
import {
  mapAccountToUi,
  ownerLegacyIdForAccount,
  summarizeAccounts,
  type AccountWithMeta,
  type AccountListSummary,
} from "@/data/accounts/mappers";
import type { ChartPoint } from "@/types";
import type { Tables, Views } from "@/types/database";

export const dynamic = "force-dynamic";

type TransactionLedgerRow = Pick<
  Tables<"transactions">,
  "transaction_date" | "amount_pkr" | "direction" | "status" | "type" | "archived_at"
>;

function monthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

async function fetchAccountContext(currentProfileId: string, workspaceId: string) {
  const supabase = await createClient();
  const [accountsRes, balancesRes, permissionsRes, profiles] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .eq("is_active", true)
      .eq("workspace_id", workspaceId)
      .order("name"),
    supabase.from("account_projected_balances").select("*"),
    supabase
      .from("account_permissions")
      .select("*")
      .eq("profile_id", currentProfileId),
    getAllProfiles(),
  ]);

  if (accountsRes.error) throw new Error("Unable to load accounts.");
  if (balancesRes.error) throw new Error("Unable to load account balances.");

  const balanceByAccount = new Map(
    (balancesRes.data ?? []).map((row) => [row.account_id, row])
  );
  const permissionByAccount = new Map(
    (permissionsRes.data ?? []).map((row) => [row.account_id, row])
  );

  return {
    supabase,
    accounts: accountsRes.data ?? [],
    balanceByAccount,
    permissionByAccount,
    profiles,
  };
}

async function fetchMonthlyStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  accountIds: string[]
) {
  const prefix = monthKey();
  const stats = new Map<
    string,
    { income: number; expenses: number; count: number }
  >();

  if (accountIds.length === 0) return stats;

  const { data, error } = await supabase
    .from("transactions")
    .select("account_id, type, status, amount_pkr, direction, archived_at, transaction_date")
    .in("account_id", accountIds)
    .is("archived_at", null);

  if (error) throw new Error("Unable to load account activity.");

  for (const row of data ?? []) {
    const bucket = stats.get(row.account_id) ?? { income: 0, expenses: 0, count: 0 };
    bucket.count += 1;
    const dateStr = row.transaction_date.slice(0, 7);
    if (row.status === "completed" && dateStr === prefix) {
      const signed = signedTransactionAmount(row.amount_pkr, row.direction);
      if (countsAsIncome(row.type) && signed > 0) bucket.income += signed;
      if (countsAsExpense(row.type) && signed < 0) bucket.expenses += Math.abs(signed);
    }
    stats.set(row.account_id, bucket);
  }

  return stats;
}

export async function getAccounts(): Promise<{
  accounts: AccountWithMeta[];
  summary: AccountListSummary;
  profiles: Awaited<ReturnType<typeof getAllProfiles>>;
}> {
  const profile = await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const ctx = await fetchAccountContext(profile.id, workspace.workspaceId);
  const stats = await fetchMonthlyStats(
    ctx.supabase,
    ctx.accounts.map((a) => a.id)
  );

  const accounts = ctx.accounts.map((account) => {
    const balance = ctx.balanceByAccount.get(account.id);
    const permission = ctx.permissionByAccount.get(account.id);
    const stat = stats.get(account.id);
    return mapAccountToUi(
      account,
      balance,
      ownerLegacyIdForAccount(account, ctx.profiles),
      buildAccountCapabilities(
        account.owner_profile_id,
        profile.id,
        account.is_shared_savings_account,
        account.is_active,
        permission
      ),
      {
        transactionCount: stat?.count ?? 0,
        monthlyIncome: stat?.income ?? 0,
        monthlyExpenses: stat?.expenses ?? 0,
      }
    );
  });

  return {
    accounts,
    summary: summarizeAccounts(accounts, profile.id),
    profiles: ctx.profiles,
  };
}

export async function getAccountById(accountId: string): Promise<AccountWithMeta | null> {
  const profile = await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const ctx = await fetchAccountContext(profile.id, workspace.workspaceId);
  const account = ctx.accounts.find((a) => a.id === accountId);
  if (!account) return null;

  const stats = await fetchMonthlyStats(ctx.supabase, [accountId]);
  const stat = stats.get(accountId);

  let contributionTotals: Views<"account_contribution_totals">[] = [];
  if (account.is_shared_savings_account) {
    const { data } = await ctx.supabase
      .from("account_contribution_totals")
      .select("*")
      .eq("account_id", accountId);
    contributionTotals = data ?? [];
  }

  const trend = await getAccountBalanceTrend(accountId, parseMoney(account.opening_balance));

  return mapAccountToUi(
    account,
    ctx.balanceByAccount.get(accountId),
    ownerLegacyIdForAccount(account, ctx.profiles),
    buildAccountCapabilities(
      account.owner_profile_id,
      profile.id,
      account.is_shared_savings_account,
      account.is_active,
      ctx.permissionByAccount.get(accountId)
    ),
    {
      transactionCount: stat?.count ?? 0,
      monthlyIncome: stat?.income ?? 0,
      monthlyExpenses: stat?.expenses ?? 0,
      contributionTotals,
      trend: trend.map((p) => p.value),
      recentActivityLabel: stat?.count
        ? `${stat.count} transaction${stat.count === 1 ? "" : "s"} on this account`
        : "No transactions yet",
    }
  );
}

export async function getAccountBalanceTrend(
  accountId: string,
  openingBalance: number
): Promise<ChartPoint[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("transaction_date, amount_pkr, direction, status, archived_at")
    .eq("account_id", accountId)
    .eq("status", "completed")
    .is("archived_at", null)
    .order("transaction_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error("Unable to load balance trend.");

  const rows = (data ?? []) as TransactionLedgerRow[];
  if (rows.length === 0) {
    return [{ label: "Start", value: openingBalance }];
  }

  let running = openingBalance;
  const points: ChartPoint[] = [{ label: "Open", value: openingBalance }];
  for (const row of rows) {
    running += signedTransactionAmount(row.amount_pkr, row.direction);
    points.push({
      label: row.transaction_date.slice(5),
      value: running,
    });
  }
  return points.slice(-12);
}

export async function getOwnedAccountsForForms() {
  const profile = await requireCurrentProfile();
  const { accounts } = await getAccounts();
  return accounts.filter((a) => a.capabilities.canCreateTransactions);
}

export async function accountHasTransactions(accountId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId)
    .is("archived_at", null)
    .limit(1);

  if (error) throw new Error("Unable to verify account activity.");
  return (count ?? 0) > 0;
}
