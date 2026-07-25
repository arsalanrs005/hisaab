"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile } from "@/data/profiles/queries";
import { mapDatabaseError } from "@/data/errors";
import { reconcileAccountSchema, type ReconcileAccountInput } from "@/data/reconciliation/validation";
import { toDbMoney } from "@/lib/money";
import {
  getReconciliationPreview,
  getReconcileDialogData,
} from "@/data/reconciliation/queries";

export async function getReconciliationPreviewAction(accountId: string, actualBalanceRaw: string) {
  return getReconciliationPreview(accountId, actualBalanceRaw);
}

export async function getReconcileDialogDataAction(accountId: string) {
  return getReconcileDialogData(accountId);
}

function revalidateReconciliationPaths(accountId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath(`/accounts/${accountId}`);
  revalidatePath("/transactions");
  revalidatePath("/notifications");
  revalidatePath("/activity");
}

export async function reconcileAccountAction(raw: ReconcileAccountInput) {
  const profile = await requireCurrentProfile();
  const input = reconcileAccountSchema.parse(raw);

  const supabase = await createClient();
  const { data: account } = await supabase
    .from("accounts")
    .select("owner_profile_id")
    .eq("id", input.accountId)
    .maybeSingle();

  if (!account || account.owner_profile_id !== profile.id) {
    throw new Error("Only the account owner can reconcile this account.");
  }

  const { data, error } = await supabase.rpc("reconcile_account_balance", {
    p_account_id: input.accountId,
    p_actual_balance: toDbMoney(input.actualBalance),
    p_reason: input.reason.trim(),
    p_reconciled_at: input.reconciledAt ?? null,
  });

  if (error) throw new Error(mapDatabaseError(error));

  revalidateReconciliationPaths(input.accountId);
  return { ok: true as const, result: data };
}
