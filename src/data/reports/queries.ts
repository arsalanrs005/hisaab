import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile } from "@/data/profiles/queries";
import { requireCurrentWorkspace } from "@/data/workspaces/queries";
import { getAccounts } from "@/data/accounts/queries";
import { getTransactions } from "@/data/transactions/queries";
import { getGoalsSummary } from "@/data/goals/queries";
import { getOps5iveMetrics } from "@/data/business/queries";
import { getLoansPageData } from "@/data/loans/queries";
import { getBudgetPageData } from "@/data/budgets/queries";
import { parseMoney } from "@/lib/money";
import { resolveDateRangePreset } from "@/lib/date-range";
import type { DateRangePreset } from "@/providers/app-provider";

export const dynamic = "force-dynamic";

export type ReportType =
  | "monthly"
  | "income"
  | "expense"
  | "savings"
  | "goal"
  | "statement"
  | "ops5ive";

export interface ReportFilters {
  dateRange: DateRangePreset;
  accountId?: string;
  reportType?: ReportType;
}

function filterTransactions<T extends { date: string; accountId?: string; type?: string }>(
  transactions: T[],
  filters: ReportFilters
) {
  const { dateFrom, dateTo } = resolveDateRangePreset(filters.dateRange);
  return transactions.filter((t) => {
    if (t.date < dateFrom || t.date > dateTo) return false;
    if (filters.accountId && filters.accountId !== "all" && t.accountId !== filters.accountId) {
      return false;
    }
    return true;
  });
}

export async function getReportsPageData(filters?: Partial<ReportFilters>) {
  await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const merged: ReportFilters = {
    dateRange: filters?.dateRange ?? "this_month",
    accountId: filters?.accountId,
    reportType: filters?.reportType,
  };

  const [accountsResult, transactionsResult, goalsSummary, opsMetrics] = await Promise.all([
    getAccounts(),
    getTransactions({ page: 1, pageSize: 2000 }),
    getGoalsSummary(),
    getOps5iveMetrics().catch(() => null),
  ]);

  const transactions = filterTransactions(
    transactionsResult.transactions.map((t) => ({
      ...t,
      accountId: t.accountId,
    })),
    merged
  );

  return {
    accounts: accountsResult.accounts,
    transactions,
    goalsSummary,
    opsMetrics,
    workspaceName: workspace.name,
    filters: merged,
  };
}

export async function buildReportLines(filters: ReportFilters) {
  const { transactions, goalsSummary, workspaceName, opsMetrics } =
    await getReportsPageData(filters);

  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amountPkr, 0);
  const expenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amountPkr, 0);
  const net = income - expenses;
  const savingsRate = income > 0 ? Math.round((net / income) * 100) : 0;

  const reportType = filters.reportType ?? "monthly";
  let title = `${workspaceName} · Monthly summary`;
  const lines: string[] = [
    `Generated: ${new Date().toISOString()}`,
    `Report type: ${reportType}`,
    `Date range: ${filters.dateRange}`,
    `Account: ${filters.accountId && filters.accountId !== "all" ? filters.accountId : "All accounts"}`,
  ];

  switch (reportType) {
    case "income":
      title = `${workspaceName} · Income report`;
      lines.push(`Income (PKR): ${income.toLocaleString()}`);
      lines.push(`Transactions: ${transactions.filter((t) => t.type === "income").length}`);
      break;
    case "expense":
      title = `${workspaceName} · Expense report`;
      lines.push(`Expenses (PKR): ${expenses.toLocaleString()}`);
      lines.push(`Transactions: ${transactions.filter((t) => t.type === "expense").length}`);
      break;
    case "savings":
      title = `${workspaceName} · Savings report`;
      lines.push(`Net saved (PKR): ${net.toLocaleString()}`);
      lines.push(`Savings rate: ${savingsRate}%`);
      break;
    case "goal":
      title = `${workspaceName} · Goal progress`;
      lines.push(`Goals tracked: ${goalsSummary.goals.length}`);
      lines.push(`Total saved toward goals (PKR): ${goalsSummary.totalSaved.toLocaleString()}`);
      break;
    case "statement":
      title = `${workspaceName} · Account statement`;
      lines.push(`Transactions in period: ${transactions.length}`);
      break;
    case "ops5ive":
      title = `${workspaceName} · Ops5ive business`;
      if (opsMetrics) {
        lines.push(`Received income (PKR): ${opsMetrics.receivedIncome.toLocaleString()}`);
        lines.push(`Expenses (PKR): ${opsMetrics.expenses.toLocaleString()}`);
        lines.push(`Net profit (PKR): ${opsMetrics.netProfit.toLocaleString()}`);
        lines.push(`Business reserve (PKR): ${opsMetrics.businessReserve.toLocaleString()}`);
      }
      break;
    case "monthly":
    default:
      lines.push(`Income (PKR): ${income.toLocaleString()}`);
      lines.push(`Expenses (PKR): ${expenses.toLocaleString()}`);
      lines.push(`Net saved (PKR): ${net.toLocaleString()}`);
      lines.push(`Savings rate: ${savingsRate}%`);
      lines.push(`Goals tracked: ${goalsSummary.goals.length}`);
      lines.push(`Total saved toward goals (PKR): ${goalsSummary.totalSaved.toLocaleString()}`);
      break;
  }

  return {
    title,
    lines,
    csvRows: transactions.map((t) => [
      t.date,
      t.name,
      t.type,
      String(t.amountPkr),
      t.accountName ?? "",
      t.categoryName ?? "",
    ]),
  };
}

/** @deprecated use buildReportLines */
export async function buildMonthlySummaryLines(filters?: ReportFilters) {
  return buildReportLines({
    dateRange: filters?.dateRange ?? "this_month",
    accountId: filters?.accountId,
    reportType: filters?.reportType ?? "monthly",
  });
}

export async function getWorkspaceBackupPayload(filters?: Partial<ReportFilters>) {
  const { getNotesPageData } = await import("@/data/notes/queries");
  const { getSettingsPageData } = await import("@/data/settings/queries");

  const merged: ReportFilters = {
    dateRange: filters?.dateRange ?? "year_to_date",
    accountId: filters?.accountId,
    reportType: filters?.reportType,
  };

  const [reports, notes, settings, loans, budget] = await Promise.all([
    getReportsPageData(merged),
    getNotesPageData(),
    getSettingsPageData(),
    getLoansPageData(),
    getBudgetPageData(),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    filters: merged,
    workspace: settings.workspace,
    accounts: reports.accounts,
    transactions: reports.transactions,
    goals: reports.goalsSummary.goals,
    goalSummary: {
      totalSaved: reports.goalsSummary.totalSaved,
      monthlyTotal: reports.goalsSummary.monthlyTotal,
    },
    loans: loans.loans,
    loanPayments: loans.payments,
    budget,
    opsMetrics: reports.opsMetrics,
    notes: notes.notes,
    settings: settings.settings,
    profile: {
      id: settings.profile.id,
      email: settings.profile.email,
      displayName: settings.profile.display_name,
    },
  };
}
