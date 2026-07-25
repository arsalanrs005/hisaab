"use client";

import Link from "next/link";
import { ArrowLeftRight, Eye, MoreHorizontal, Plus, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CurrencyAmount } from "@/components/finance/currency-amount";
import { useApp } from "@/providers/app-provider";
import { getAccountPermissionLabel } from "@/lib/finance/capabilities";
import type { AccountWithMeta } from "@/data/accounts/mappers";
import type { User } from "@/types";
import { cn } from "@/lib/utils";

interface AccountCardProps {
  account: AccountWithMeta;
  owner?: User;
  currentProfileId?: string;
  showActions?: boolean;
  className?: string;
}

export function AccountCard({
  account,
  owner,
  showActions = true,
  className,
}: AccountCardProps) {
  const { hideBalances, openTransfer, setQuickAddOpen, openReconcile } = useApp();
  const permission = getAccountPermissionLabel(account.capabilities);
  const canEdit = account.capabilities.canCreateTransactions;
  const canTransferOut = account.capabilities.canTransferOut;
  const canReconcile = account.capabilities.canReconcile;
  const maxTrend = Math.max(...account.trend);
  const minTrend = Math.min(...account.trend);

  return (
    <Card
      className={cn(
        "min-w-0 border-border border-t-2 border-t-primary/60 bg-surface shadow-[var(--shadow-xs)]",
        className
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 p-5 pb-3">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-sm font-semibold text-primary">
            {account.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 space-y-1">
            <CardTitle className="truncate text-base font-semibold">
              <Link href={`/accounts/${account.id}`} className="hover:text-primary">
                {account.name}
              </Link>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">{account.bank}</Badge>
              <Badge variant={permission === "Owner" ? "default" : "outline"}>
                {permission === "Owner" ? "Owned by you" : `${owner?.name ?? "Owner"} · View only`}
              </Badge>
              {account.isPooled ? <Badge variant="outline">Shared savings</Badge> : null}
            </div>
          </div>
        </div>
        {showActions ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Account actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/accounts/${account.id}`}>View details</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openTransfer({ sourceAccountId: account.id })}>
                Quick transfer
              </DropdownMenuItem>
              {canEdit ? (
                <DropdownMenuItem onClick={() => setQuickAddOpen(true)}>
                  Add transaction
                </DropdownMenuItem>
              ) : null}
              {canReconcile ? (
                <DropdownMenuItem onClick={() => openReconcile(account.id)}>
                  Reconcile balance
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5 pt-0">
        <div>
          <p className="text-xs font-medium text-foreground-muted">Actual balance</p>
          <CurrencyAmount amount={account.actualBalance} hidden={hideBalances} size="lg" className="metric-value-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Projected</p>
            <CurrencyAmount
              amount={account.projectedBalance}
              hidden={hideBalances}
              size="sm"
              className="font-medium"
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pending / expected</p>
            <CurrencyAmount
              amount={account.pendingEffect + account.expectedEffect}
              hidden={hideBalances}
              size="sm"
              className="font-medium"
            />
          </div>
        </div>

        <div className="flex h-8 items-end gap-0.5" aria-hidden>
          {account.trend.map((v, i) => {
            const height =
              maxTrend === minTrend ? 50 : ((v - minTrend) / (maxTrend - minTrend)) * 100;
            return (
              <div
                key={i}
                className="flex-1 rounded-sm bg-primary/20"
                style={{ height: `${Math.max(12, height)}%` }}
              />
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">{account.recentActivityLabel}</p>

        {showActions ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {canTransferOut ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => openTransfer({ sourceAccountId: account.id })}
                className="gap-1.5"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Transfer
              </Button>
            ) : null}
            {canReconcile ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => openReconcile(account.id)}
                className="gap-1.5"
              >
                <Scale className="h-3.5 w-3.5" />
                Reconcile
              </Button>
            ) : null}
            {canEdit ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setQuickAddOpen(true)}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            ) : (
              <Badge variant="outline" className="gap-1">
                <Eye className="h-3 w-3" />
                Read only
              </Badge>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
