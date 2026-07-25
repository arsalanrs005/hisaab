"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { getQuickAddFormData } from "@/data/transactions/form-data";
import { createTransactionAction } from "@/data/transactions/mutations";
import type { AccountWithMeta } from "@/data/accounts/mappers";
import type { Category, IncomeSource } from "@/types";

const schema = z.object({
  type: z.enum([
    "income",
    "expense",
    "refund",
    "loan_payment",
    "family_contribution",
  ]),
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
});

type FormValues = z.infer<typeof schema>;

const LAST_ACCOUNT_KEY = "hisab-last-owned-account";

export function QuickAddTransaction() {
  const router = useRouter();
  const { quickAddOpen, setQuickAddOpen } = useApp();
  const [showMore, setShowMore] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [accounts, setAccounts] = React.useState<AccountWithMeta[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [incomeSources, setIncomeSources] = React.useState<IncomeSource[]>([]);
  const clientRequestId = React.useRef(crypto.randomUUID());

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
    if (!quickAddOpen) return;
    void getQuickAddFormData().then((data) => {
      setAccounts(data.accounts);
      setCategories(data.categories);
      setIncomeSources(data.incomeSources);
      const last = localStorage.getItem(LAST_ACCOUNT_KEY);
      const defaultAccount =
        data.accounts.find((a) => a.id === last)?.id ?? data.accounts[0]?.id ?? "";
      if (defaultAccount) form.setValue("accountId", defaultAccount);
    });
  }, [quickAddOpen, form]);

  const currency = form.watch("currency");
  const amount = form.watch("amount");
  const exchangeRate = form.watch("exchangeRate");

  const convertedPkr =
    currency === "USD" && amount && exchangeRate
      ? Number(amount) * Number(exchangeRate)
      : Number(amount || 0);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    setError(null);
    try {
      localStorage.setItem(LAST_ACCOUNT_KEY, values.accountId);
      await createTransactionAction({
        ...values,
        clientRequestId: clientRequestId.current,
        exchangeRateIsManual: currency === "USD",
      });
      clientRequestId.current = crypto.randomUUID();
      setQuickAddOpen(false);
      form.reset();
      setShowMore(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save transaction.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={quickAddOpen} onOpenChange={setQuickAddOpen}>
      <SheetContent side="bottom" className="flex max-h-[92vh] flex-col overflow-hidden sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add transaction</SheetTitle>
          <SheetDescription>Quick entry for income, expenses, and contributions.</SheetDescription>
        </SheetHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-1 flex-col overflow-y-auto px-6 py-4"
        >
          {error ? (
            <p className="mb-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={form.watch("type")}
                  onValueChange={(v) => form.setValue("type", v as FormValues["type"])}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                    <SelectItem value="loan_payment">Loan payment</SelectItem>
                    <SelectItem value="family_contribution">Contribution</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={currency}
                  onValueChange={(v) => form.setValue("currency", v as "PKR" | "USD")}
                >
                  <SelectTrigger id="currency">
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
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" inputMode="decimal" placeholder="0" {...form.register("amount")} />
            </div>

            {currency === "USD" ? (
              <div className="space-y-3 rounded-[10px] border border-border bg-muted/40 p-3">
                <Label htmlFor="exchangeRate">Exchange rate (manual)</Label>
                <Input id="exchangeRate" {...form.register("exchangeRate")} inputMode="decimal" />
                <p className="text-xs text-muted-foreground">
                  Converted · {formatPKR(convertedPkr || 0)}
                  <br />
                  Live FX arrives in Phase 7 — this rate is stored exactly as entered.
                </p>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="accountId">Account</Label>
              <Select
                value={form.watch("accountId")}
                onValueChange={(v) => form.setValue("accountId", v)}
              >
                <SelectTrigger id="accountId">
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
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" {...form.register("date")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="categoryId">Category</Label>
                <Select
                  value={form.watch("categoryId") ?? ""}
                  onValueChange={(v) => form.setValue("categoryId", v)}
                >
                  <SelectTrigger id="categoryId">
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
              <Label htmlFor="description">Description</Label>
              <Input id="description" {...form.register("description")} />
            </div>

            <Button type="button" variant="ghost" size="sm" onClick={() => setShowMore((s) => !s)}>
              {showMore ? "Hide details" : "More details"}
            </Button>

            {showMore ? (
              <div className="space-y-4 border-t border-border pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" {...form.register("notes")} />
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
              </div>
            ) : null}
          </div>

          <SheetFooter className="mt-6 px-0">
            <Button type="button" variant="outline" onClick={() => setQuickAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || accounts.length === 0}>
              {submitting ? "Saving…" : "Save transaction"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
