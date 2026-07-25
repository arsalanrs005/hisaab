"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Eye,
  Plus,
  Scale,
  ArrowLeftRight,
  Landmark,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { MetricCard } from "@/components/finance/metric-card";
import { CurrencyAmount } from "@/components/finance/currency-amount";
import {
  TransactionTable,
  TransactionMobileCard,
} from "@/components/finance/transaction-table";
import { ChartCard, TrendLineChart } from "@/components/charts/chart-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/providers/app-provider";
import { formatRelative } from "@/lib/format";
import type { AccountWithMeta } from "@/data/accounts/mappers";
import type { UiTransaction } from "@/data/transactions/mappers";
import type { Category, ChartPoint } from "@/types";
import type { ProfileSummary } from "@/data/profiles/helpers";
import { profilesToUserMap } from "@/data/profiles/helpers";
import { getAccountPermissionLabel } from "@/lib/finance/capabilities";

import type { UiContributionTotal } from "@/data/transfers/mappers";
import type { UiReconciliation } from "@/data/reconciliation/mappers";
import { OpeningContributionDialog } from "@/components/forms/opening-contribution-dialog";

interface AccountDetailClientProps {
  account: AccountWithMeta;
  transactions: UiTransaction[];
  categories: Category[];
  profiles: ProfileSummary[];
  trend: ChartPoint[];
  currentProfileId: string;
  contributionTotals?: UiContributionTotal[];
  contributionHistory?: Array<{
    id: string;
    contributorName: string;
    amountPkr: number;
    date: string;
    type: string;
    notes?: string;
  }>;
  reconciliations?: UiReconciliation[];
  showOpeningAllocation?: boolean;
}

export function AccountDetailClient({
  account,
  transactions,
  categories,
  profiles,
  trend,
  currentProfileId,
  contributionTotals = [],
  contributionHistory = [],
  reconciliations = [],
  showOpeningAllocation = false,
}: AccountDetailClientProps) {
  const { hideBalances, openTransfer, setQuickAddOpen, openReconcile } = useApp();
  const [openingDialogOpen, setOpeningDialogOpen] = React.useState(false);
  const usersByProfileId = profilesToUserMap(profiles);
  const owner = usersByProfileId.get(account.ownerProfileId);
  const canEdit = account.capabilities.canCreateTransactions;
  const permission = getAccountPermissionLabel(account.capabilities);

  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");

  const filteredTxns = transactions.filter((t) => {
    if (typeFilter === "transfer") {
      if (t.type !== "transfer") return false;
    } else if (typeFilter === "balance_adjustment") {
      if (t.type !== "balance_adjustment") return false;
    } else if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (categoryFilter !== "all" && t.categoryId !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q) ?? false) ||
        (t.notes?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  const handleExport = () => {
    const rows = [
      ["Date", "Name", "Type", "Amount PKR", "Status"].join(","),
      ...filteredTxns.map((t) =>
        [t.date, `"${t.name}"`, t.type, t.amountPkr, t.status].join(",")
      ),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${account.id}-transactions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4">
        <Link
          href="/accounts"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All accounts
        </Link>
      </div>

      <PageHeader
        title={account.name}
        description={`${account.bank} · Last reconciled ${
          account.lastReconciledAt ? formatRelative(account.lastReconciledAt) : "never"
        }`}
      >
        {!canEdit ? (
          <Badge variant="outline" className="gap-1">
            <Eye className="h-3 w-3" />
            Read only · owned by {owner?.name ?? "Owner"}
          </Badge>
        ) : (
          <Badge variant="default">{permission === "Owner" ? "Owned by you" : permission}</Badge>
        )}
        {account.capabilities.canTransferOut ? (
          <Button variant="outline" onClick={() => openTransfer({ sourceAccountId: account.id })} className="gap-1.5">
            <ArrowLeftRight className="h-4 w-4" />
            Transfer
          </Button>
        ) : account.capabilities.canReceiveTransfer ? (
          <Button variant="outline" onClick={() => openTransfer({ destinationAccountId: account.id })} className="gap-1.5">
            <ArrowLeftRight className="h-4 w-4" />
            Transfer in
          </Button>
        ) : null}
        {account.capabilities.canReconcile ? (
          <Button variant="outline" onClick={() => openReconcile(account.id)} className="gap-1.5">
            <Scale className="h-4 w-4" />
            Reconcile
          </Button>
        ) : null}
        {showOpeningAllocation && account.capabilities.isOwner ? (
          <Button variant="outline" onClick={() => setOpeningDialogOpen(true)} className="gap-1.5">
            Allocate opening balance
          </Button>
        ) : null}
        {canEdit ? (
          <Button onClick={() => setQuickAddOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        ) : null}
        <Button variant="outline" onClick={handleExport} className="gap-1.5">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </PageHeader>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Actual balance" amount={account.actualBalance} hidden={hideBalances} icon={Landmark} />
        <MetricCard title="Projected balance" amount={account.projectedBalance} hidden={hideBalances} />
        <MetricCard title="Opening balance" amount={account.openingBalance} hidden={hideBalances} />
        <div className="rounded-[12px] border border-border bg-card p-5 shadow-[var(--shadow-sm)]">
          <p className="text-sm font-medium text-muted-foreground">Owner</p>
          <p className="mt-2 text-lg font-semibold">{owner?.name ?? "—"}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {account.isPooled ? <Badge variant="outline">Shared savings</Badge> : null}
            <Badge variant="secondary">{account.currency}</Badge>
          </div>
        </div>
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-2">
        <MetricCard
          title="This month income"
          amount={account.monthlyIncome}
          hidden={hideBalances}
          icon={ArrowDownRight}
          changeLabel="Completed income on this account"
          changeTone="positive"
        />
        <MetricCard
          title="This month expenses"
          amount={account.monthlyExpenses}
          hidden={hideBalances}
          icon={ArrowUpRight}
          changeLabel="Completed outgoing activity"
          changeTone="neutral"
        />
      </section>

      <section className="mb-6">
        <ChartCard title="Balance trend" description="From opening balance through completed activity">
          {trend.length > 0 ? (
            <TrendLineChart data={trend} />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No completed transactions yet — trend starts at your opening balance.
            </p>
          )}
        </ChartCard>
      </section>

      {account.isPooled && contributionTotals.length > 0 ? (
        <section className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">Shared contribution breakdown</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Historical contribution ownership within this pooled balance — not separate bank accounts.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {contributionTotals.map((row) => (
              <Card key={row.contributorProfileId}>
                <CardContent className="p-4">
                  <p className="font-medium">{row.contributorName}</p>
                  <CurrencyAmount amount={row.totalAmount} hidden={hideBalances} size="lg" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.percentage.toFixed(0)}% of recorded contributions
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {reconciliations.length > 0 ? (
        <section className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">Reconciliation history</h2>
          <div className="space-y-2">
            {reconciliations.map((item) => (
              <div key={item.id} className="rounded-[12px] border border-border bg-card p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>{formatRelative(item.reconciledAt)}</span>
                  <Badge variant="outline">Adjustment {item.adjustmentAmount >= 0 ? "+" : "−"}
                    {Math.abs(item.adjustmentAmount).toLocaleString("en-PK")} PKR
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{item.reason}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Transaction history</h2>
          <p className="text-sm text-muted-foreground">
            {filteredTxns.length} of {transactions.length} transactions
          </p>
        </div>

        <div className="mb-4 flex flex-col gap-3 rounded-[12px] border border-border bg-card p-4 lg:flex-row lg:items-center">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions…"
            className="lg:max-w-xs"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full lg:w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
              <SelectItem value="balance_adjustment">Balance correction</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full lg:w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filteredTxns.length === 0 ? (
          <EmptyState
            title="No matching transactions"
            description="Try clearing filters or add your first transaction."
            actionLabel={canEdit ? "Add transaction" : undefined}
            onAction={canEdit ? () => setQuickAddOpen(true) : undefined}
          />
        ) : (
          <>
            <TransactionTable
              transactions={filteredTxns}
              hidden={hideBalances}
              profiles={profiles}
              currentProfileId={currentProfileId}
              accountCapabilities={account.capabilities}
            />
            <div className="mt-3 space-y-2 md:hidden">
              {filteredTxns.map((txn) => (
                <TransactionMobileCard
                  key={txn.id}
                  transaction={txn}
                  hidden={hideBalances}
                  profiles={profiles}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <OpeningContributionDialog
        open={openingDialogOpen}
        onOpenChange={setOpeningDialogOpen}
        accountId={account.id}
        openingBalance={account.openingBalance}
        profiles={profiles}
      />
    </div>
  );
}
