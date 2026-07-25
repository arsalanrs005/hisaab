import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile } from "@/data/profiles/queries";
import { parseMoney } from "@/lib/money";
import {
  mapReconciliationToUi,
  type ReconciliationPreview,
  type UiReconciliation,
} from "@/data/reconciliation/mappers";
import {
  reconcileAccountSchema,
  reconciliationFilterSchema,
  type ReconcileAccountInput,
  type ReconciliationFilterInput,
} from "@/data/reconciliation/validation";

export async function getReconciliationPreview(
  accountId: string,
  actualBalanceRaw: string
): Promise<ReconciliationPreview> {
  const profile = await requireCurrentProfile();
  const supabase = await createClient();

  const { data: account, error } = await supabase
    .from("accounts")
    .select("id, name, owner_profile_id")
    .eq("id", accountId)
    .maybeSingle();

  if (error || !account) throw new Error("Account not found.");
  if (account.owner_profile_id !== profile.id) {
    throw new Error("Only the account owner can reconcile this account.");
  }

  const { data: balanceRow } = await supabase
    .from("account_actual_balances")
    .select("actual_balance")
    .eq("account_id", accountId)
    .maybeSingle();

  const calculated = parseMoney(balanceRow?.actual_balance ?? 0);
  const actual = parseMoney(actualBalanceRaw);
  const adjustment = actual - calculated;

  return {
    accountId,
    accountName: account.name,
    calculatedBalance: calculated,
    actualBalance: actual,
    adjustmentAmount: adjustment,
    direction: adjustment === 0 ? 0 : adjustment > 0 ? 1 : -1,
    requiresTransaction: adjustment !== 0,
  };
}

export async function getAccountReconciliations(
  accountId: string,
  rawFilters: Partial<ReconciliationFilterInput> = {}
) {
  const filters = reconciliationFilterSchema.parse(rawFilters);
  const supabase = await createClient();
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  const { data, error, count } = await supabase
    .from("balance_adjustments")
    .select("*", { count: "exact" })
    .eq("account_id", accountId)
    .order("reconciled_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error("Unable to load reconciliation history.");

  const ids = (data ?? []).map((r) => r.id);
  const { data: txns } = ids.length
    ? await supabase
        .from("transactions")
        .select("id, balance_adjustment_id")
        .in("balance_adjustment_id", ids)
    : { data: [] };

  const txnByAdj = new Map((txns ?? []).map((t) => [t.balance_adjustment_id, t.id]));

  const items: UiReconciliation[] = (data ?? []).map((row) =>
    mapReconciliationToUi(row, txnByAdj.get(row.id))
  );

  return { items, total: count ?? items.length, page: filters.page, pageSize: filters.pageSize };
}

import type { AccountWithMeta } from "@/data/accounts/mappers";

export async function getReconcileDialogData(accountId: string): Promise<AccountWithMeta | null> {
  const { getAccountById } = await import("@/data/accounts/queries");
  return getAccountById(accountId);
}

export async function getReconciliationById(reconciliationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("balance_adjustments")
    .select("*")
    .eq("id", reconciliationId)
    .maybeSingle();
  if (error || !data) return null;

  const { data: txn } = await supabase
    .from("transactions")
    .select("id")
    .eq("balance_adjustment_id", reconciliationId)
    .maybeSingle();

  return mapReconciliationToUi(data, txn?.id);
}
