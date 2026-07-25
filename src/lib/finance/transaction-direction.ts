import type { TransactionTypeDb, TransactionDirection } from "@/types/database";
import { parseMoney } from "@/lib/money";

/** Matches database `set_transaction_direction` trigger rules. */
export function defaultDirectionForType(type: TransactionTypeDb): TransactionDirection | null {
  switch (type) {
    case "income":
    case "transfer_in":
    case "refund":
    case "family_contribution":
    case "loan_repayment":
      return 1;
    case "expense":
    case "transfer_out":
    case "loan_payment":
      return -1;
    case "balance_adjustment":
      return null;
    default:
      return null;
  }
}

export function signedTransactionAmount(
  amountPkr: string | number,
  direction: TransactionDirection
): number {
  return parseMoney(amountPkr) * direction;
}

export function isIncomingTransaction(type: TransactionTypeDb): boolean {
  return defaultDirectionForType(type) === 1;
}

export function isOutgoingTransaction(type: TransactionTypeDb): boolean {
  return defaultDirectionForType(type) === -1;
}

export function isSecureTransactionType(type: TransactionTypeDb): boolean {
  return type === "transfer_in" || type === "transfer_out" || type === "balance_adjustment";
}

export function isFormCreatableType(type: TransactionTypeDb): boolean {
  return !isSecureTransactionType(type);
}
