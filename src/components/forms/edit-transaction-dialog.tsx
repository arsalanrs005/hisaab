"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { formatPKR } from "@/lib/format";
import { getQuickAddFormData } from "@/data/transactions/form-data";
import { updateTransactionAction } from "@/data/transactions/mutations";
import type { AccountWithMeta } from "@/data/accounts/mappers";
import type { Category, IncomeSource, Transaction, TransactionType } from "@/types";
import { isFormCreatableType } from "@/lib/finance/transaction-direction";
import type { TransactionTypeDb } from "@/types/database";

const editableTypes = [
  "income",
  "expense",
  "refund",
  "family_contribution",
  "loan_repayment",
  "loan_payment",
] as const satisfies readonly TransactionType[];

const schema = z
  .object({
    type: z.enum(editableTypes),
    amount: z.string().min(1),
    currency: z.enum(["PKR", "USD"]),
    accountId: z.string().uuid(),
    date: z.string().min(1),
    categoryId: z.string().optional(),
    description: z.string().min(1),
    incomeSourceId: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(["cleared", "pending", "expected"]),
    classification: z.enum(["personal", "shared", "business"]),
    exchangeRate: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      ctx.addIssue({ code: "custom", message: "Amount must be greater than zero", path: ["amount"] });
    }
    if (data.currency === "USD") {
      const rate = Number(data.exchangeRate);
      if (!Number.isFinite(rate) || rate <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "Exchange rate is required for USD transactions",
          path: ["exchangeRate"],
        });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

interface EditTransactionDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toEditableType(type: TransactionType): FormValues["type"] | null {
  if (type === "transfer" || type === "balance_adjustment") return null;
  if (editableTypes.includes(type as (typeof editableTypes)[number])) {
    return type as FormValues["type"];
  }
  return null;
}

export function EditTransactionDialog({
  transaction,
  open,
  onOpenChange,
}: EditTransactionDialogProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [accounts, setAccounts] = React.useState<AccountWithMeta[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [incomeSources, setIncomeSources] = React.useState<IncomeSource[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "expense",
      amount: "",
      currency: "PKR",
      accountId: "",
      date: new Date().toISOString().slice(0, 10),
      description: "",
      status: "cleared",
      classification: "personal",
      exchangeRate: "278.50",
    },
  });

  React.useEffect(() => {
    if (!open || !transaction) return;
    const editableType = toEditableType(transaction.type);
    if (!editableType || (transaction.dbType && !isFormCreatableType(transaction.dbType as TransactionTypeDb))) {
      return;
    }

    void getQuickAddFormData().then((data) => {
      setAccounts(data.accounts);
      setCategories(data.categories);
      setIncomeSources(data.incomeSources);
    });

    form.reset({
      type: editableType,
      amount: String(transaction.amount),
      currency: transaction.currency,
      accountId: transaction.accountId,
      date: transaction.date,
      categoryId: transaction.categoryId || undefined,
      description: transaction.description ?? transaction.name,
      incomeSourceId: transaction.incomeSourceId || undefined,
      notes: transaction.notes ?? "",
      status: transaction.status === "cancelled" ? "cleared" : transaction.status,
      classification: transaction.classification ?? "personal",
      exchangeRate: transaction.exchangeRate ? String(transaction.exchangeRate) : "278.50",
    });
    setError(null);
  }, [open, transaction, form]);

  const currency = form.watch("currency");
  const amount = form.watch("amount");
  const exchangeRate = form.watch("exchangeRate");

  const convertedPkr =
    currency === "USD" && amount && exchangeRate
      ? Number(amount) * Number(exchangeRate)
      : Number(amount || 0);

  async function onSubmit(values: FormValues) {
    if (!transaction) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateTransactionAction({
        transactionId: transaction.id,
        ...values,
        exchangeRateIsManual: currency === "USD",
      });
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update transaction.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit transaction</DialogTitle>
          <DialogDescription>
            Update details for this record. Linked transfers and reconciliation entries cannot be
            edited here.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-type">Type</Label>
              <Select
                value={form.watch("type")}
                onValueChange={(v) => form.setValue("type", v as FormValues["type"])}
              >
                <SelectTrigger id="edit-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="loan_payment">Loan payment</SelectItem>
                  <SelectItem value="loan_repayment">Loan repayment</SelectItem>
                  <SelectItem value="family_contribution">Contribution</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-currency">Currency</Label>
              <Select
                value={currency}
                onValueChange={(v) => form.setValue("currency", v as "PKR" | "USD")}
              >
                <SelectTrigger id="edit-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PKR">PKR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-amount">Amount</Label>
            <Input id="edit-amount" inputMode="decimal" {...form.register("amount")} />
          </div>

          {currency === "USD" ? (
            <div className="space-y-3 rounded-[10px] border border-border bg-muted/40 p-3">
              <Label htmlFor="edit-exchangeRate">Exchange rate (manual)</Label>
              <Input id="edit-exchangeRate" {...form.register("exchangeRate")} inputMode="decimal" />
              <p className="text-xs text-muted-foreground">
                Converted · {formatPKR(convertedPkr || 0)}
              </p>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="edit-accountId">Account</Label>
            <Select
              value={form.watch("accountId")}
              onValueChange={(v) => form.setValue("accountId", v)}
            >
              <SelectTrigger id="edit-accountId">
                <SelectValue placeholder="Select owned account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-date">Date</Label>
              <Input id="edit-date" type="date" {...form.register("date")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-categoryId">Category</Label>
              <Select
                value={form.watch("categoryId") ?? ""}
                onValueChange={(v) => form.setValue("categoryId", v)}
              >
                <SelectTrigger id="edit-categoryId">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-description">Description</Label>
            <Input id="edit-description" {...form.register("description")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea id="edit-notes" {...form.register("notes")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(v) => form.setValue("status", v as FormValues["status"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cleared">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="expected">Expected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Classification</Label>
              <Select
                value={form.watch("classification")}
                onValueChange={(v) =>
                  form.setValue("classification", v as FormValues["classification"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="shared">Shared</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {incomeSources.length > 0 ? (
            <div className="space-y-1.5">
              <Label>Income source</Label>
              <Select
                value={form.watch("incomeSourceId") ?? ""}
                onValueChange={(v) => form.setValue("incomeSourceId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {incomeSources.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || accounts.length === 0}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
