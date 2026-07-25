"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { MetricCard } from "@/components/finance/metric-card";
import { LoanCard } from "@/components/finance/loan-card";
import { CurrencyAmount } from "@/components/finance/currency-amount";
import { Button } from "@/components/ui/button";
import { LoanPaymentDialog } from "@/components/forms/loan-payment-dialog";
import { useApp } from "@/providers/app-provider";
import type { Loan, LoanPayment } from "@/types";
import { formatDate } from "@/lib/format";
import { Landmark } from "lucide-react";

interface LoansClientProps {
  loans: Loan[];
  payments: LoanPayment[];
  remainingTotal: number;
  monthlyTotal: number;
  ownerNames: Record<string, string>;
  accountNames: Record<string, string>;
}

export function LoansClient({
  loans,
  payments,
  remainingTotal,
  monthlyTotal,
  ownerNames,
  accountNames,
}: LoansClientProps) {
  const { hideBalances } = useApp();
  const [paymentLoan, setPaymentLoan] = useState<Loan | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);

  function openPayment(loan: Loan) {
    setPaymentLoan(loan);
    setPaymentOpen(true);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Loans"
        description="Track financing balances, installments, and payoff progress."
      />

      <LoanPaymentDialog open={paymentOpen} onOpenChange={setPaymentOpen} loan={paymentLoan} />

      <section className="mb-6 grid gap-3 sm:grid-cols-2">
        <MetricCard title="Total remaining" amount={remainingTotal} hidden={hideBalances} icon={Landmark} />
        <MetricCard title="Monthly installments" amount={monthlyTotal} hidden={hideBalances} />
      </section>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        {loans.map((loan) => (
          <div key={loan.id} className="space-y-2">
            <LoanCard
              loan={loan}
              ownerName={ownerNames[loan.ownerId]}
              accountName={accountNames[loan.fundingAccountId]}
              hidden={hideBalances}
            />
            <Button variant="outline" size="sm" onClick={() => openPayment(loan)}>
              Record payment
            </Button>
          </div>
        ))}
      </div>

      {loans.map((loan) => {
        const loanPayments = payments.filter((p) => p.loanId === loan.id);
        return (
          <section key={loan.id} className="mb-8 rounded-[12px] border border-border bg-card p-5">
            <h2 className="mb-4 text-base font-semibold">{loan.name} · payment history</h2>
            {loanPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {loanPayments.map((payment) => (
                  <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">{formatDate(payment.date)}</span>
                    <CurrencyAmount amount={payment.amount} hidden={hideBalances} size="sm" />
                    <span className="text-xs text-muted-foreground">
                      Principal <CurrencyAmount amount={payment.principal} hidden={hideBalances} size="sm" /> ·
                      Markup <CurrencyAmount amount={payment.interest} hidden={hideBalances} size="sm" />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
