"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CurrencyAmount } from "@/components/finance/currency-amount";
import { ConfirmArchiveDialog } from "@/components/forms/confirm-archive-dialog";
import { EditTransactionDialog } from "@/components/forms/edit-transaction-dialog";
import { formatDate } from "@/lib/format";
import type { Transaction, TransactionStatus, TransactionType } from "@/types";
import type { ProfileSummary } from "@/data/profiles/helpers";
import { profilesToUserMap } from "@/data/profiles/helpers";
import type { AccountCapabilities } from "@/lib/finance/capabilities";
import {
  archiveTransactionAction,
  restoreTransactionAction,
} from "@/data/transactions/mutations";
import { cn } from "@/lib/utils";

const typeLabels: Record<TransactionType, string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
  balance_adjustment: "Balance correction",
  refund: "Refund",
  loan_payment: "Loan payment",
  loan_repayment: "Loan repayment",
  family_contribution: "Contribution",
};

const statusVariant: Record<
  TransactionStatus,
  "success" | "warning" | "secondary" | "danger"
> = {
  cleared: "success",
  pending: "warning",
  expected: "secondary",
  cancelled: "danger",
};

interface TransactionTableProps {
  transactions: Transaction[];
  hidden?: boolean;
  profiles?: ProfileSummary[];
  currentProfileId?: string;
  accountCapabilities?: AccountCapabilities;
}

export function TransactionTable({
  transactions,
  hidden,
  profiles = [],
  currentProfileId,
  accountCapabilities,
}: TransactionTableProps) {
  const router = useRouter();
  const usersByProfileId = profilesToUserMap(profiles);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = React.useState<Transaction | null>(null);
  const [editTarget, setEditTarget] = React.useState<Transaction | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function handleArchive() {
    if (!archiveTarget) return;
    setPendingId(archiveTarget.id);
    setError(null);
    try {
      await archiveTransactionAction(archiveTarget.id);
      setArchiveTarget(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to archive transaction.");
    } finally {
      setPendingId(null);
    }
  }

  async function handleRestore(transactionId: string) {
    setPendingId(transactionId);
    setError(null);
    try {
      await restoreTransactionAction(transactionId);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to restore transaction.");
    } finally {
      setPendingId(null);
    }
  }

  const canEdit = (txn: Transaction) => {
    if (accountCapabilities) return accountCapabilities.canEditTransactions;
    return txn.ownerProfileId === currentProfileId;
  };

  const canArchive = (txn: Transaction) => {
    if (accountCapabilities) return accountCapabilities.canArchiveTransactions;
    return txn.ownerProfileId === currentProfileId;
  };

  return (
    <>
      {error ? (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="hidden overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-xs)] md:block">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 border-b border-border bg-background-subtle text-left text-xs text-foreground-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Transaction</th>
              <th className="hidden px-4 py-3 font-medium lg:table-cell">Account</th>
              <th className="hidden px-4 py-3 font-medium xl:table-cell">Category</th>
              <th className="hidden px-4 py-3 font-medium lg:table-cell">Person</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn) => {
              const person =
                usersByProfileId.get(txn.createdByProfileId ?? "") ??
                ({ name: "—" } as { name: string });
              return (
                <tr key={txn.id} className="h-11 border-b border-border-subtle transition-colors hover:bg-surface-hover">
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{txn.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {typeLabels[txn.type]}
                      {txn.currency === "USD" && txn.usdAmount ? ` · $${txn.usdAmount}` : null}
                      {txn.isArchived ? " · Archived" : null}
                    </div>
                  </td>
                  <td className="hidden px-4 py-2.5 text-foreground-muted lg:table-cell">{txn.accountName ?? "—"}</td>
                  <td className="hidden px-4 py-2.5 xl:table-cell">
                    <Badge variant="outline">{txn.categoryName ?? "—"}</Badge>
                  </td>
                  <td className="hidden px-4 py-2.5 text-foreground-muted lg:table-cell">{person.name}</td>
                  <td className="px-4 py-2.5 text-foreground-muted">{formatDate(txn.date)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    <CurrencyAmount
                      amount={txn.amountPkr}
                      hidden={hidden}
                      size="sm"
                      signed
                      className="font-medium"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[txn.status]} className="capitalize">
                      {txn.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Transaction menu">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {txn.isArchived ? (
                          canArchive(txn) ? (
                            <DropdownMenuItem
                              disabled={pendingId === txn.id}
                              onClick={() => void handleRestore(txn.id)}
                            >
                              Restore
                            </DropdownMenuItem>
                          ) : null
                        ) : canEdit(txn) &&
                          !txn.isTransferLinked &&
                          !txn.isAdjustmentLinked ? (
                          <>
                            <DropdownMenuItem onClick={() => setEditTarget(txn)}>
                              Edit
                            </DropdownMenuItem>
                            {canArchive(txn) ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-danger"
                                  onClick={() => setArchiveTarget(txn)}
                                >
                                  Archive
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </>
                        ) : (
                          <DropdownMenuItem disabled>
                            {txn.isTransferLinked
                              ? "Linked transfer — view only"
                              : txn.isAdjustmentLinked
                                ? "Balance correction — view only"
                                : "View only"}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <EditTransactionDialog
        transaction={editTarget}
        open={Boolean(editTarget)}
        onOpenChange={(open) => !open && setEditTarget(null)}
      />

      <ConfirmArchiveDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title="Archive transaction?"
        description="Archived transactions no longer affect balances, but remain in audit history."
        confirmLabel="Archive"
        loading={Boolean(pendingId)}
        onConfirm={() => void handleArchive()}
      />
    </>
  );
}

interface TransactionMobileCardProps {
  transaction: Transaction;
  hidden?: boolean;
  profiles?: ProfileSummary[];
  className?: string;
}

export function TransactionMobileCard({
  transaction,
  hidden,
  profiles = [],
  className,
}: TransactionMobileCardProps) {
  const usersByProfileId = profilesToUserMap(profiles);
  const person =
    usersByProfileId.get(transaction.createdByProfileId ?? "") ??
    ({ name: "—" } as { name: string });

  return (
    <div
      className={cn(
        "rounded-[12px] border border-border bg-card p-4 md:hidden",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{transaction.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {transaction.accountName ?? "Account"} · {transaction.categoryName ?? "—"} ·{" "}
            {person.name}
          </p>
        </div>
        <CurrencyAmount
          amount={transaction.amountPkr}
          hidden={hidden}
          size="sm"
          signed
          className="font-semibold"
        />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{formatDate(transaction.date)}</span>
        <Badge variant={statusVariant[transaction.status]} className="capitalize">
          {transaction.status}
        </Badge>
      </div>
    </div>
  );
}
