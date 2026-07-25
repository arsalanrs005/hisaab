import type { Tables } from "@/types/database";
import { parseMoney } from "@/lib/money";

export type ReconciliationRow = Tables<"balance_adjustments">;

export interface UiReconciliation {
  id: string;
  accountId: string;
  calculatedBalanceBefore: number;
  actualBalance: number;
  adjustmentAmount: number;
  reason: string;
  reconciledByProfileId: string;
  reconciledAt: string;
  transactionId?: string;
}

export interface ReconciliationPreview {
  accountId: string;
  accountName: string;
  calculatedBalance: number;
  actualBalance: number;
  adjustmentAmount: number;
  direction: 1 | -1 | 0;
  requiresTransaction: boolean;
}

export function mapReconciliationToUi(
  row: ReconciliationRow,
  transactionId?: string
): UiReconciliation {
  return {
    id: row.id,
    accountId: row.account_id,
    calculatedBalanceBefore: parseMoney(row.calculated_balance_before),
    actualBalance: parseMoney(row.actual_balance),
    adjustmentAmount: parseMoney(row.adjustment_amount),
    reason: row.reason,
    reconciledByProfileId: row.reconciled_by,
    reconciledAt: row.reconciled_at,
    transactionId,
  };
}
