import type { TransactionTypeDb } from "@/types/database";

/** Types that count toward income/expense dashboard metrics (excludes transfers and adjustments). */
export function countsAsIncome(type: TransactionTypeDb): boolean {
  return (
    type === "income" ||
    type === "refund" ||
    type === "family_contribution" ||
    type === "loan_repayment"
  );
}

export function countsAsExpense(type: TransactionTypeDb): boolean {
  return type === "expense" || type === "loan_payment";
}

export function isTransferType(type: TransactionTypeDb): boolean {
  return type === "transfer_in" || type === "transfer_out";
}

export function isBalanceAdjustmentType(type: TransactionTypeDb): boolean {
  return type === "balance_adjustment";
}
