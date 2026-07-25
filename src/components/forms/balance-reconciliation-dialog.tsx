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
import { useApp } from "@/providers/app-provider";
import { formatPKR } from "@/lib/format";
import {
  getReconciliationPreviewAction,
  getReconcileDialogDataAction,
  reconcileAccountAction,
} from "@/data/reconciliation/mutations";
import {
  reconcileAccountSchema,
  type ReconcileAccountInput,
} from "@/data/reconciliation/validation";
import type { ReconciliationPreview } from "@/data/reconciliation/mappers";
import type { AccountWithMeta } from "@/data/accounts/mappers";
import { CurrencyAmount } from "@/components/finance/currency-amount";

export function BalanceReconciliationDialog() {
  const router = useRouter();
  const { reconcileOpen, setReconcileOpen, reconcileAccountId, hideBalances } = useApp();
  const [step, setStep] = React.useState<"form" | "preview">("form");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [account, setAccount] = React.useState<AccountWithMeta | null>(null);
  const [preview, setPreview] = React.useState<ReconciliationPreview | null>(null);

  const form = useForm<ReconcileAccountInput>({
    resolver: zodResolver(reconcileAccountSchema),
    defaultValues: {
      accountId: "",
      actualBalance: "",
      reason: "",
    },
  });

  React.useEffect(() => {
    if (!reconcileOpen || !reconcileAccountId) return;
    setStep("form");
    setError(null);
    void getReconcileDialogDataAction(reconcileAccountId).then((loaded) => {
      setAccount(loaded);
      form.reset({
        accountId: reconcileAccountId,
        actualBalance: loaded ? String(loaded.actualBalance) : "",
        reason: "",
      });
    });
  }, [reconcileOpen, reconcileAccountId, form]);

  const actualBalance = form.watch("actualBalance");

  React.useEffect(() => {
    if (!reconcileOpen || !reconcileAccountId || !actualBalance) return;
    const timer = setTimeout(() => {
      void getReconciliationPreviewAction(reconcileAccountId, actualBalance)
        .then(setPreview)
        .catch(() => setPreview(null));
    }, 250);
    return () => clearTimeout(timer);
  }, [reconcileOpen, reconcileAccountId, actualBalance]);

  async function onPreview(values: ReconcileAccountInput) {
    setPreview(await getReconciliationPreviewAction(values.accountId, values.actualBalance));
    setStep("preview");
  }

  async function onConfirm() {
    const values = form.getValues();
    setSubmitting(true);
    setError(null);
    try {
      await reconcileAccountAction(values);
      setReconcileOpen(false);
      setStep("form");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to reconcile account.");
    } finally {
      setSubmitting(false);
    }
  }

  const canReconcile = account?.capabilities.canReconcile;

  return (
    <Dialog open={reconcileOpen} onOpenChange={setReconcileOpen}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reconcile balance</DialogTitle>
          <DialogDescription>
            {account
              ? `Compare Hisab’s calculated balance for ${account.name} with your actual bank balance.`
              : "Select an account to reconcile."}
          </DialogDescription>
        </DialogHeader>

        {!canReconcile ? (
          <p className="text-sm text-muted-foreground">
            Only the account owner can reconcile this account.
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {account && canReconcile && step === "form" ? (
          <form onSubmit={form.handleSubmit(onPreview)} className="space-y-4">
            <div className="rounded-[10px] border border-border bg-muted/40 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Calculated ledger balance</span>
                <CurrencyAmount amount={preview?.calculatedBalance ?? account.actualBalance} hidden={hideBalances} size="sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="actual">Actual bank balance</Label>
              <Input id="actual" inputMode="decimal" {...form.register("actualBalance")} />
            </div>
            {preview ? (
              <div className="flex justify-between rounded-[10px] border border-border p-3 text-sm">
                <span className="text-muted-foreground">Adjustment required</span>
                <span className="tabular-nums font-medium">
                  {preview.adjustmentAmount > 0 ? "+" : preview.adjustmentAmount < 0 ? "−" : ""}
                  {formatPKR(Math.abs(preview.adjustmentAmount))}
                </span>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="reason">Reason</Label>
              <Textarea id="reason" placeholder="e.g. ATM fee not recorded" {...form.register("reason")} />
            </div>
            <p className="text-xs text-muted-foreground">
              Hisab will create a balance-adjustment entry. It will not overwrite your existing
              transaction history.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReconcileOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Preview adjustment</Button>
            </DialogFooter>
          </form>
        ) : null}

        {account && canReconcile && step === "preview" && preview ? (
          <div className="space-y-4">
            <div className="rounded-[10px] border border-border bg-muted/40 p-4 text-sm space-y-2">
              <p className="font-medium">Reconciliation preview</p>
              <div className="flex justify-between text-muted-foreground">
                <span>Calculated balance</span>
                <CurrencyAmount amount={preview.calculatedBalance} hidden={hideBalances} size="sm" />
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Actual bank balance</span>
                <CurrencyAmount amount={preview.actualBalance} hidden={hideBalances} size="sm" />
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Adjustment</span>
                <span className="font-medium text-foreground">
                  {preview.adjustmentAmount > 0 ? "+" : preview.adjustmentAmount < 0 ? "−" : ""}
                  {formatPKR(Math.abs(preview.adjustmentAmount))}
                </span>
              </div>
              {preview.requiresTransaction ? (
                <p className="text-xs text-muted-foreground">
                  A balance correction transaction will be created with direction{" "}
                  {preview.direction > 0 ? "positive" : "negative"}.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  The ledger already matches the bank balance. No adjustment entry is required.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep("form")}>
                Back
              </Button>
              <Button onClick={() => void onConfirm()} disabled={submitting}>
                {submitting ? "Saving…" : "Confirm reconciliation"}
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
