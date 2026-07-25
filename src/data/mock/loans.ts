import type { Loan, LoanPayment } from "@/types";

export const loans: Loan[] = [
  {
    id: "loan-car",
    name: "Car financing — Meezan",
    ownerId: "arsalan",
    originalAmount: 1800000,
    remainingBalance: 420000,
    monthlyInstallment: 85000,
    interestRate: 12.5,
    dueDay: 18,
    fundingAccountId: "acc-arsalan-meezan",
    startDate: "2024-06-01",
    expectedCompletion: "2026-12-15",
  },
  {
    id: "loan-personal",
    name: "Personal loan — HBL",
    ownerId: "ali",
    originalAmount: 500000,
    remainingBalance: 175000,
    monthlyInstallment: 35000,
    interestRate: 18,
    dueDay: 5,
    fundingAccountId: "acc-ali-hbl",
    startDate: "2025-01-05",
    expectedCompletion: "2026-11-05",
  },
];

export const loanPayments: LoanPayment[] = [
  {
    id: "lp-1",
    loanId: "loan-car",
    amount: 85000,
    date: "2026-07-18",
    accountId: "acc-arsalan-meezan",
    principal: 72000,
    interest: 13000,
  },
  {
    id: "lp-2",
    loanId: "loan-car",
    amount: 85000,
    date: "2026-06-18",
    accountId: "acc-arsalan-meezan",
    principal: 71000,
    interest: 14000,
  },
  {
    id: "lp-3",
    loanId: "loan-personal",
    amount: 35000,
    date: "2026-07-05",
    accountId: "acc-ali-hbl",
    principal: 28500,
    interest: 6500,
  },
  {
    id: "lp-4",
    loanId: "loan-personal",
    amount: 35000,
    date: "2026-06-05",
    accountId: "acc-ali-hbl",
    principal: 28000,
    interest: 7000,
  },
];

export function getLoan(id: string): Loan | undefined {
  return loans.find((l) => l.id === id);
}

export function getLoanProgress(loan: Loan): number {
  const paid = loan.originalAmount - loan.remainingBalance;
  return Math.round((paid / loan.originalAmount) * 100);
}
