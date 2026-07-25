"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
import { addLoanPaymentAction } from "@/data/loans/mutations";
import { addLoanPaymentSchema, type AddLoanPaymentInput } from "@/data/loans/validation";
import type { Loan } from "@/types";
import { formatPKR } from "@/lib/format";

interface LoanPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: Loan | null;
}

export function LoanPaymentDialog({ open, onOpenChange, loan }: LoanPaymentDialogProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const form = useForm<AddLoanPaymentInput>({
    defaultValues: {
      loanId: loan?.id ?? "",
      amount: "",
      paymentDate: new Date().toISOString().slice(0, 10),
      principalAmount: "",
      markupAmount: "",
    },
  });

  React.useEffect(() => {
    if (open && loan) {
      form.reset({
        loanId: loan.id,
        amount: String(loan.monthlyInstallment || ""),
        paymentDate: new Date().toISOString().slice(0, 10),
        principalAmount: "",
        markupAmount: "",
      });
      setError(null);
    }
  }, [open, loan, form]);

  async function onSubmit(raw: AddLoanPaymentInput) {
    if (!loan) return;
    setPending(true);
    setError(null);
    try {
      const values = addLoanPaymentSchema.parse({ ...raw, loanId: loan.id });
      await addLoanPaymentAction(values);
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to record payment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record loan payment</DialogTitle>
          <DialogDescription>
            {loan
              ? `${loan.name} · remaining ${formatPKR(loan.remainingBalance)}`
              : "Select a loan to record a payment."}
          </DialogDescription>
        </DialogHeader>

        {loan ? (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="payment-amount">Payment amount (PKR)</Label>
              <Input id="payment-amount" {...form.register("amount")} className="tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-date">Payment date</Label>
              <Input id="payment-date" type="date" {...form.register("paymentDate")} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="payment-principal">Principal (optional)</Label>
                <Input
                  id="payment-principal"
                  {...form.register("principalAmount")}
                  className="tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payment-markup">Markup (optional)</Label>
                <Input
                  id="payment-markup"
                  {...form.register("markupAmount")}
                  className="tabular-nums"
                />
              </div>
            </div>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save payment"}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
