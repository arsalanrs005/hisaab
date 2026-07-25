"use client";

import * as React from "react";
import { ArrowDownRight, ArrowUpRight, ArrowLeftRight, PiggyBank, Wallet, Landmark, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { MetricCard } from "@/components/finance/metric-card";
import { AccountCard } from "@/components/finance/account-card";
import {
  TransactionTable,
  TransactionMobileCard,
} from "@/components/finance/transaction-table";
import {
  ChartCard,
  IncomeExpenseChart,
  SpendingCategoryChart,
} from "@/components/charts/chart-card";
import { Button } from "@/components/ui/button";
import { useApp } from "@/providers/app-provider";
import { formatMonthYear, formatPercent, formatDate } from "@/lib/format";
import type { DashboardMode } from "@/types";
import type { getDashboardLiveData } from "@/data/dashboard/queries";
import { profilesToUserMap } from "@/data/profiles/helpers";
import { CurrencyAmount } from "@/components/finance/currency-amount";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

type DashboardPayload = Awaited<ReturnType<typeof getDashboardLiveData>>;

interface DashboardClientProps {
  initialMode: DashboardMode;
  combinedData: DashboardPayload;
}

export function DashboardClient({ combinedData }: DashboardClientProps) {
  const { currentUser, hideBalances, dashboardMode, setQuickAddOpen, openTransfer, profile } =
    useApp();

  const visibleAccounts =
    dashboardMode === "personal"
      ? combinedData.accounts.filter((a) => a.ownerProfileId === profile?.id)
      : combinedData.accounts;

  const summary = React.useMemo(() => {
    if (dashboardMode === "combined") return combinedData.summary;
    const totalActual = visibleAccounts.reduce((s, a) => s + a.actualBalance, 0);
    const totalProjected = visibleAccounts.reduce((s, a) => s + a.projectedBalance, 0);
    return { ...combinedData.summary, totalActual, totalProjected };
  }, [dashboardMode, combinedData.summary, visibleAccounts]);

  const recentTxns =
    dashboardMode === "personal"
      ? combinedData.recentTransactions.filter((t) => t.ownerProfileId === profile?.id)
      : combinedData.recentTransactions;

  const usersByProfileId = profilesToUserMap(combinedData.profiles ?? []);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="">
      <PageHeader
        title={`${greeting}, ${currentUser.name}`}
        description={`${formatMonthYear()} · ${dashboardMode === "combined" ? "Combined household view" : "Personal view"}`}
      >
        <Button variant="outline" onClick={() => openTransfer()}>
          Transfer money
        </Button>
        <Button
          onClick={() => setQuickAddOpen(true)}
          disabled={!visibleAccounts.some((a) => a.capabilities.canCreateTransactions)}
        >
          Add transaction
        </Button>
      </PageHeader>

      <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Actual money"
          amount={summary.totalActual}
          hidden={hideBalances}
          icon={Wallet}
        />
        <MetricCard
          title="Available to spend"
          amount={summary.totalProjected}
          hidden={hideBalances}
          icon={ArrowUpRight}
          changeLabel="Includes pending and expected"
          changeTone="neutral"
        />
        <MetricCard
          title="Monthly net movement"
          amount={summary.netSaved}
          hidden={hideBalances}
          icon={TrendingUp}
          changeTone={summary.netSaved >= 0 ? "positive" : "negative"}
        />
        <MetricCard
          title="Savings rate"
          amount={0}
          hidden={hideBalances}
          icon={PiggyBank}
          displayValue={formatPercent(summary.savingsRate)}
          changeLabel={
            hideBalances
              ? "Net saved hidden"
              : `Net saved PKR ${summary.netSaved.toLocaleString("en-PK")}`
          }
          changeTone={summary.netSaved >= 0 ? "positive" : "neutral"}
        />
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <MetricCard
          title="Monthly income"
          amount={summary.monthlyIncome}
          hidden={hideBalances}
          icon={ArrowDownRight}
          changeLabel="Completed income only"
          changeTone="neutral"
        />
        <MetricCard
          title="Monthly expenses"
          amount={summary.monthlyExpenses}
          hidden={hideBalances}
          icon={Landmark}
        />
        <div className="rounded-[12px] border border-border bg-card p-5 shadow-[var(--shadow-sm)]">
          <p className="text-sm font-medium text-muted-foreground">Savings rate</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {hideBalances ? "••••" : formatPercent(summary.savingsRate)}
          </p>
          <p className="mt-1.5 text-xs text-success">Of completed income retained</p>
        </div>
      </section>

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Accounts</h2>
        </div>
        {visibleAccounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No accounts in this view yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                owner={usersByProfileId.get(account.ownerProfileId)}
                currentProfileId={profile?.id}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-2">
        <ChartCard title="Income versus expenses" description="Recent completed activity">
          {combinedData.charts.incomeVsExpenses.length > 0 ? (
            <IncomeExpenseChart data={combinedData.charts.incomeVsExpenses} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Add completed transactions to see trends.
            </p>
          )}
        </ChartCard>
        <ChartCard title="Spending by category" description="Current month completed expenses">
          {combinedData.charts.spendingByCategory.length > 0 ? (
            <SpendingCategoryChart data={combinedData.charts.spendingByCategory} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No categorized spending this month yet.
            </p>
          )}
        </ChartCard>
      </section>

      {combinedData.sharedContributionTotals.length > 0 ? (
        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {combinedData.sharedSavingsAccountName ?? "Shared savings"} contributions
            </h2>
            <Link href="/transfers" className="text-sm text-muted-foreground hover:text-foreground">
              View transfers
            </Link>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            Historical contribution ownership within the pooled balance — not separate bank accounts.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {combinedData.sharedContributionTotals.map((row) => (
              <div key={row.contributorProfileId} className="rounded-[12px] border border-border bg-card p-4">
                <p className="font-medium">{row.contributorName}</p>
                <CurrencyAmount amount={row.totalAmount} hidden={hideBalances} size="lg" />
                <p className="mt-1 text-xs text-muted-foreground">
                  {row.percentage.toFixed(0)}% of recorded contributions
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {combinedData.recentTransfers.length > 0 ? (
        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent transfers</h2>
            <Link href="/transfers" className="text-sm text-muted-foreground hover:text-foreground">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {combinedData.recentTransfers.map((transfer) => (
              <Link
                key={transfer.id}
                href={`/transfers?detail=${transfer.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-border bg-card p-4 text-sm hover:bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {transfer.sourceAccountName} → {transfer.destinationAccountName}
                  </span>
                  {transfer.hasContribution ? (
                    <Badge variant="outline">Shared contribution</Badge>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>{formatDate(transfer.date)}</span>
                  <CurrencyAmount amount={transfer.amountPkr} hidden={hideBalances} size="sm" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Recent transactions</h2>
        {recentTxns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <>
            <TransactionTable
              transactions={recentTxns}
              hidden={hideBalances}
              profiles={combinedData.profiles}
              currentProfileId={profile?.id ?? ""}
            />
            <div className="space-y-2 md:hidden">
              {recentTxns.map((txn) => (
                <TransactionMobileCard key={txn.id} transaction={txn} hidden={hideBalances} />
              ))}
            </div>
          </>
        )}
      </section>

      <section className="mb-6 rounded-[12px] border border-dashed border-border bg-muted/20 p-6">
        <h2 className="text-lg font-semibold">Goals, budgets, and insights</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          These sections stay unavailable until Phase 5+. They no longer show mock financial values.
        </p>
      </section>
    </div>
  );
}
