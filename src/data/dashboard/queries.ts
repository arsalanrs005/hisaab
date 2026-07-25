import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile } from "@/data/profiles/queries";
import { getAccounts } from "@/data/accounts/queries";
import { getRecentTransactions } from "@/data/transactions/queries";
import { getRecentTransfers, getAccountContributionTotals } from "@/data/transfers/queries";
import { requireCurrentWorkspace } from "@/data/workspaces/queries";
import { parseMoney } from "@/lib/money";
import { signedTransactionAmount } from "@/lib/finance/transaction-direction";
import { countsAsExpense, countsAsIncome } from "@/lib/finance/transaction-metrics";
import type { CategorySpend, ChartPoint, DashboardMode } from "@/types";

export const dynamic = "force-dynamic";

export interface DashboardSummaryLive {
  totalActual: number;
  totalProjected: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netSaved: number;
  savingsRate: number;
  activeCount: number;
  sharedSavingsTotal: number;
}

export interface DashboardChartData {
  incomeVsExpenses: ChartPoint[];
  spendingByCategory: CategorySpend[];
  accountBalances: ChartPoint[];
}

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

function monthPrefix(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function filterByMode<T extends { ownerProfileId: string }>(
  items: T[],
  mode: DashboardMode,
  currentProfileId: string
) {
  return mode === "personal"
    ? items.filter((item) => item.ownerProfileId === currentProfileId)
    : items;
}

export async function getDashboardLiveData(mode: DashboardMode = "combined") {
  const profile = await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const supabase = await createClient();
  const effectiveMode = workspace.type === "personal" ? "personal" : mode;

  const [{ accounts, summary, profiles }, recentTransactions, recentTransfers] = await Promise.all([
    getAccounts(),
    getRecentTransactions(8),
    getRecentTransfers(5),
  ]);

  const visibleAccounts = filterByMode(accounts, effectiveMode, profile.id);
  const accountIds = visibleAccounts.map((a) => a.id);
  const prefix = monthPrefix();

  let monthlyIncome = 0;
  let monthlyExpenses = 0;

  if (accountIds.length > 0) {
    const { data, error } = await supabase
      .from("transactions")
      .select("account_id, amount_pkr, direction, status, transaction_date, archived_at, category_id, type")
      .in("account_id", accountIds)
      .eq("status", "completed")
      .is("archived_at", null);

    if (error) throw new Error("Unable to load dashboard metrics.");

    for (const row of data ?? []) {
      if (!row.transaction_date.startsWith(prefix)) continue;
      const signed = signedTransactionAmount(row.amount_pkr, row.direction);
      if (countsAsIncome(row.type) && signed > 0) monthlyIncome += signed;
      if (countsAsExpense(row.type) && signed < 0) monthlyExpenses += Math.abs(signed);
    }
  }

  const totalActual = visibleAccounts.reduce((s, a) => s + a.actualBalance, 0);
  const totalProjected = visibleAccounts.reduce((s, a) => s + a.projectedBalance, 0);
  const netSaved = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? (netSaved / monthlyIncome) * 100 : 0;

  const chartData = await getDashboardCharts(accountIds, prefix);

  const sharedAccount = visibleAccounts.find((a) => a.isPooled);
  const sharedContributionTotals = sharedAccount
    ? await getAccountContributionTotals(sharedAccount.id)
    : [];

  const filteredRecent =
    effectiveMode === "personal"
      ? recentTransactions.filter((t) => t.ownerProfileId === profile.id)
      : recentTransactions;

  return {
    profile,
    workspace,
    profiles,
    accounts: visibleAccounts,
    summary: {
      totalActual,
      totalProjected,
      monthlyIncome,
      monthlyExpenses,
      netSaved,
      savingsRate,
      activeCount: visibleAccounts.length,
      sharedSavingsTotal: visibleAccounts
        .filter((a) => a.isPooled)
        .reduce((s, a) => s + a.actualBalance, 0),
    } satisfies DashboardSummaryLive,
    recentTransactions: filteredRecent,
    recentTransfers,
    sharedContributionTotals,
    sharedSavingsAccountName: sharedAccount?.name,
    charts: chartData,
    combinedSummary: summary,
  };
}

async function getDashboardCharts(
  accountIds: string[],
  monthPrefixValue: string
): Promise<DashboardChartData> {
  if (accountIds.length === 0) {
    return { incomeVsExpenses: [], spendingByCategory: [], accountBalances: [] };
  }

  const supabase = await createClient();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  const fromDate = sixMonthsAgo.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("transactions")
    .select("transaction_date, amount_pkr, direction, status, archived_at, category_id, type, accounts(name)")
    .in("account_id", accountIds)
    .eq("status", "completed")
    .is("archived_at", null)
    .gte("transaction_date", fromDate);

  if (error) throw new Error("Unable to load dashboard charts.");

  const monthMap = new Map<string, { income: number; expense: number }>();
  const categoryMap = new Map<string, number>();

  for (const row of data ?? []) {
    const month = row.transaction_date.slice(0, 7);
    const bucket = monthMap.get(month) ?? { income: 0, expense: 0 };
    const signed = signedTransactionAmount(row.amount_pkr, row.direction);
    if (countsAsIncome(row.type) && signed > 0) bucket.income += signed;
    if (countsAsExpense(row.type) && signed < 0) bucket.expense += Math.abs(signed);
    monthMap.set(month, bucket);

    if (row.transaction_date.startsWith(monthPrefixValue) && countsAsExpense(row.type) && signed < 0 && row.category_id) {
      const key = row.category_id;
      categoryMap.set(key, (categoryMap.get(key) ?? 0) + Math.abs(signed));
    }
  }

  const incomeVsExpenses: ChartPoint[] = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, values]) => ({
      label: month.slice(5),
      value: values.income,
      secondary: values.expense,
    }));

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .in("id", [...categoryMap.keys()]);

  const categoryName = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const spendingByCategory: CategorySpend[] = [...categoryMap.entries()].map(
    ([id, amount], index) => ({
      category: categoryName.get(id) ?? "Other",
      amount,
      color: CHART_COLORS[index % CHART_COLORS.length] ?? "var(--chart-1)",
    })
  );

  const { data: balances } = await supabase
    .from("account_actual_balances")
    .select("name, actual_balance")
    .in(
      "account_id",
      accountIds
    );

  const accountBalances: ChartPoint[] = (balances ?? []).map((row) => ({
    label: row.name ?? "Account",
    value: parseMoney(row.actual_balance),
  }));

  return { incomeVsExpenses, spendingByCategory, accountBalances };
}

export async function getCombinedFinancialSummary() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("combined_financial_summary")
    .select("*")
    .maybeSingle();

  if (error) throw new Error("Unable to load financial summary.");
  return data;
}
