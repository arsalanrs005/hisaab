"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeftRight, Plus } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { CurrencyAmount } from "@/components/finance/currency-amount";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApp } from "@/providers/app-provider";
import { formatDate } from "@/lib/format";
import { getTransferByIdAction } from "@/data/transfers/mutations";
import type { UiTransfer } from "@/data/transfers/mappers";
import type { TransfersQueryResult } from "@/data/transfers/types";

type TransfersResult = TransfersQueryResult;

interface TransfersClientProps {
  result: TransfersResult;
  initialDetailId?: string;
  initialSearch?: string;
}

export function TransfersClient({ result, initialDetailId, initialSearch = "" }: TransfersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { hideBalances, openTransfer } = useApp();
  const [search, setSearch] = React.useState(initialSearch);
  const [detail, setDetail] = React.useState<UiTransfer | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, 350);
    return () => clearTimeout(timer);
  }, [search, pathname, router]);

  React.useEffect(() => {
    if (!initialDetailId) return;
    void getTransferByIdAction(initialDetailId).then(setDetail);
  }, [initialDetailId]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Transfers"
        description="Move money between accounts with atomic linked ledger entries."
      >
        <Button onClick={() => openTransfer()} className="gap-1.5">
          <Plus className="h-4 w-4" />
          New transfer
        </Button>
      </PageHeader>

      <section className="mb-6 rounded-[12px] border border-border bg-card p-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search transfer notes…"
          className="max-w-md"
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Transfer history</h2>
        {result.transfers.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="No transfers yet"
            description="Create your first transfer between household accounts."
            actionLabel="New transfer"
            onAction={() => openTransfer()}
          />
        ) : (
          <div className="space-y-3">
            {result.transfers.map((transfer) => (
                <Card key={transfer.id} className="cursor-pointer" onClick={() => setDetail(transfer)}>
                  <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{transfer.sourceAccountName}</span>
                        <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{transfer.destinationAccountName}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="secondary">By {transfer.initiatedByName}</Badge>
                        {transfer.hasContribution ? (
                          <Badge variant="outline">Shared contribution</Badge>
                        ) : null}
                        <Badge variant="outline">{formatDate(transfer.date)}</Badge>
                      </div>
                      {transfer.notes ? (
                        <p className="text-sm text-muted-foreground">{transfer.notes}</p>
                      ) : null}
                    </div>
                    <CurrencyAmount
                      amount={transfer.amountPkr}
                      hidden={hideBalances}
                      size="lg"
                      className="shrink-0 font-semibold"
                    />
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </section>

      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transfer detail</DialogTitle>
            <DialogDescription>
              This transfer created two linked ledger entries.
            </DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">From</span>
                <span>{detail.sourceAccountName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">To</span>
                <span>{detail.destinationAccountName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <CurrencyAmount amount={detail.amountPkr} hidden={hideBalances} size="sm" />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Initiated by</span>
                <span>{detail.initiatedByName}</span>
              </div>
              {detail.hasContribution ? (
                <p className="rounded-[8px] bg-muted/50 p-3 text-xs text-muted-foreground">
                  Shared Meezan contribution recorded for the initiator.
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Linked out/in transactions are view-only in the ledger.
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
