"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/providers/app-provider";
import { formatPKR } from "@/lib/format";
import { getTransferFormDataAction, getTransferPreviewAction, createTransferAction } from "@/data/transfers/mutations";
import { createTransferSchema, type CreateTransferInput } from "@/data/transfers/validation";
import type { AccountWithMeta } from "@/data/accounts/mappers";
import type { TransferPreview } from "@/data/transfers/mappers";
import { CurrencyAmount } from "@/components/finance/currency-amount";

export function TransferDialog() {
  const router = useRouter();
  const { transferOpen, setTransferOpen, transferDefaults, hideBalances } = useApp();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<TransferPreview | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [sourceAccounts, setSourceAccounts] = React.useState<AccountWithMeta[]>([]);
  const [destinationAccounts, setDestinationAccounts] = React.useState<AccountWithMeta[]>([]);
  const idempotencyKey = React.useRef(crypto.randomUUID());

  const form = useForm<CreateTransferInput>({
    resolver: zodResolver(createTransferSchema),
    defaultValues: {
      sourceAccountId: "",
      destinationAccountId: "",
      amount: "",
      currency: "PKR",
      date: new Date().toISOString().slice(0, 10),
      notes: "",
      exchangeRate: "278.50",
    },
  });

  const values = form.watch();

  React.useEffect(() => {
    if (!transferOpen) return;
    void getTransferFormDataAction().then((data) => {
      setSourceAccounts(data.sourceAccounts);
      setDestinationAccounts(data.destinationAccounts);
      const source =
        transferDefaults?.sourceAccountId &&
        data.sourceAccounts.some((a) => a.id === transferDefaults.sourceAccountId)
          ? transferDefaults.sourceAccountId
          : data.sourceAccounts[0]?.id ?? "";
      const destination =
        transferDefaults?.destinationAccountId &&
        data.destinationAccounts.some((a) => a.id === transferDefaults.destinationAccountId)
          ? transferDefaults.destinationAccountId
          : data.destinationAccounts.find((a) => a.id !== source)?.id ?? "";
      form.reset({
        sourceAccountId: source,
        destinationAccountId: destination,
        amount: "",
        currency: "PKR",
        date: new Date().toISOString().slice(0, 10),
        notes: "",
        exchangeRate: "278.50",
      });
      setError(null);
      setPreview(null);
      idempotencyKey.current = crypto.randomUUID();
    });
  }, [transferOpen, transferDefaults, form]);

  React.useEffect(() => {
    if (!transferOpen) return;
    const timer = setTimeout(() => {
      if (!values.sourceAccountId || !values.destinationAccountId || !values.amount) {
        setPreview(null);
        return;
      }
      setPreviewLoading(true);
      void getTransferPreviewAction(values)
        .then(setPreview)
        .catch(() => setPreview(null))
        .finally(() => setPreviewLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [transferOpen, values]);

  async function onSubmit(input: CreateTransferInput) {
    setSubmitting(true);
    setError(null);
    try {
      await createTransferAction({ ...input, idempotencyKey: idempotencyKey.current });
      setTransferOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to complete transfer.");
    } finally {
      setSubmitting(false);
    }
  }

  const insufficient = Boolean(
    preview && preview.sourceBalanceAfter < 0 && values.amount
  );

  return (
    <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transfer money</DialogTitle>
          <DialogDescription>
            Move funds between accounts. Transfers create two linked ledger entries atomically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>From (your accounts)</Label>
              <Select
                value={values.sourceAccountId}
                onValueChange={(v) => form.setValue("sourceAccountId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {sourceAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} · {formatPKR(a.actualBalance)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Select
                value={values.destinationAccountId}
                onValueChange={(v) => form.setValue("destinationAccountId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {destinationAccounts
                    .filter((a) => a.id !== values.sourceAccountId)
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                        {a.isPooled ? " · Shared savings" : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="transfer-amount">Amount</Label>
              <Input id="transfer-amount" inputMode="decimal" {...form.register("amount")} />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select
                value={values.currency}
                onValueChange={(v) => form.setValue("currency", v as "PKR" | "USD")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PKR">PKR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {values.currency === "USD" ? (
            <div className="space-y-1.5">
              <Label htmlFor="transfer-rate">Exchange rate (manual)</Label>
              <Input id="transfer-rate" inputMode="decimal" {...form.register("exchangeRate")} />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="transfer-date">Date</Label>
            <Input id="transfer-date" type="date" {...form.register("date")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="transfer-notes">Notes</Label>
            <Textarea id="transfer-notes" {...form.register("notes")} />
          </div>

          <div className="rounded-[10px] border border-border bg-muted/40 p-4 text-sm space-y-2">
            <p className="font-medium">Transfer preview</p>
            {previewLoading ? (
              <p className="text-muted-foreground">Calculating preview…</p>
            ) : preview ? (
              <>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{preview.sourceAccountName} after</span>
                  <CurrencyAmount amount={preview.sourceBalanceAfter} hidden={hideBalances} size="sm" />
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{preview.destinationAccountName} after</span>
                  <CurrencyAmount amount={preview.destinationBalanceAfter} hidden={hideBalances} size="sm" signed />
                </div>
                {preview.recordsSharedContribution ? (
                  <p className="text-xs text-muted-foreground">
                    PKR {preview.amountPkr.toLocaleString("en-PK")} will be recorded as{" "}
                    {preview.contributionOwnerName}&apos;s contribution to shared savings.
                  </p>
                ) : null}
                {insufficient ? (
                  <p className="text-xs text-destructive">
                    This account does not have enough completed funds for this transfer.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground">Enter amount to preview balances.</p>
            )}
            <p className="pt-1 text-xs text-muted-foreground">
              Final balances are recalculated when you confirm.
            </p>
          </div>

          <DialogFooter className="sticky bottom-0 bg-card pt-2">
            <Button type="button" variant="outline" onClick={() => setTransferOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                submitting ||
                sourceAccounts.length === 0 ||
                values.sourceAccountId === values.destinationAccountId ||
                insufficient
              }
            >
              {submitting ? "Transferring…" : "Confirm transfer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
