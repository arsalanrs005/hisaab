"use client";

import Link from "next/link";
import { ArrowLeftRight, Plus, Scale, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { MetricCard } from "@/components/finance/metric-card";
import { AccountCard } from "@/components/finance/account-card";
import { Button } from "@/components/ui/button";
import { useApp } from "@/providers/app-provider";
import { formatRelative } from "@/lib/format";
import type { AccountWithMeta, AccountListSummary } from "@/data/accounts/mappers";
import type { ProfileSummary } from "@/data/profiles/helpers";
import { profilesToUserMap } from "@/data/profiles/helpers";

interface AccountsClientProps {
  accounts: AccountWithMeta[];
  summary: AccountListSummary;
  profiles: ProfileSummary[];
}

export function AccountsClient({ accounts, summary, profiles }: AccountsClientProps) {
  const { hideBalances, openTransfer, setQuickAddOpen, openReconcile, profile } = useApp();
  const usersByProfileId = profilesToUserMap(profiles);

  const lastReconciled = [...accounts]
    .filter((a) => a.lastReconciledAt)
    .sort((a, b) => b.lastReconciledAt.localeCompare(a.lastReconciledAt))[0];

  if (accounts.length === 0) {
    return (
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title="Accounts"
          description="No accounts yet — complete onboarding or add your first account."
        >
          <Button asChild>
            <Link href="/onboarding">Continue onboarding</Link>
          </Button>
        </PageHeader>
        <div className="rounded-[12px] border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Balances come from your real ledger once accounts are created. No sample data is
            shown here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Accounts"
        description="Household balances across Meezan and HBL — pooled and personal."
      >
        <Button variant="outline" onClick={() => openTransfer()} className="gap-1.5">
          <ArrowLeftRight className="h-4 w-4" />
          Transfer
        </Button>
        <Button
          onClick={() => setQuickAddOpen(true)}
          className="gap-1.5"
          disabled={!accounts.some((a) => a.capabilities.canCreateTransactions)}
        >
          <Plus className="h-4 w-4" />
          Add transaction
        </Button>
      </PageHeader>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Actual balance"
          amount={summary.totalActual}
          hidden={hideBalances}
          icon={Wallet}
          changeLabel={`${summary.activeCount} accounts · ${summary.ownedCount} you own`}
          changeTone="neutral"
        />
        <MetricCard
          title="Projected balance"
          amount={summary.totalProjected}
          hidden={hideBalances}
          changeLabel="Includes pending and expected items"
          changeTone="neutral"
        />
        <MetricCard
          title="Shared savings"
          amount={summary.sharedSavingsTotal}
          hidden={hideBalances}
          changeLabel="Pooled shared-savings accounts"
          changeTone="positive"
        />
        <div className="rounded-[12px] border border-border bg-card p-5 shadow-[var(--shadow-sm)]">
          <p className="text-sm font-medium text-muted-foreground">Last reconciled</p>
          <p className="mt-2 text-lg font-semibold">{lastReconciled?.name ?? "—"}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {lastReconciled?.lastReconciledAt
              ? formatRelative(lastReconciled.lastReconciledAt)
              : "Not reconciled yet"}
          </p>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">All accounts</h2>
          <p className="text-sm text-muted-foreground">View-only accounts show a read-only badge</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              owner={usersByProfileId.get(account.ownerProfileId)}
              currentProfileId={profile?.id}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
