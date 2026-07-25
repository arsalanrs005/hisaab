"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile } from "@/data/profiles/queries";
import { mapDatabaseError } from "@/data/errors";
import { toDbMoney, parseMoney } from "@/lib/money";
import type { TablesUpdate } from "@/types/database";
import { accountHasTransactions } from "@/data/accounts/queries";

export async function createAccountAction(input: {
  name: string;
  bankName: string;
  accountType: "current" | "savings" | "business" | "cash" | "other";
  openingBalance: string;
  isSharedSavings?: boolean;
}) {
  const profile = await requireCurrentProfile();
  const opening = parseMoney(input.openingBalance);
  if (opening < 0) throw new Error("Opening balance cannot be negative.");

  if (input.isSharedSavings && profile.legacyUserId !== "arsalan") {
    throw new Error("Only Arsalan can mark a shared savings account.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .insert({
      name: input.name.trim(),
      bank_name: input.bankName.trim(),
      owner_profile_id: profile.id,
      account_type: input.accountType,
      primary_currency: "PKR",
      opening_balance: toDbMoney(opening),
      is_shared_savings_account: Boolean(input.isSharedSavings),
      is_active: true,
    })
    .select("id")
    .single();

  if (error) throw new Error(mapDatabaseError(error));
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return { ok: true as const, accountId: data.id };
}

export async function updateAccountAction(input: {
  accountId: string;
  name: string;
  bankName: string;
  accountType: "current" | "savings" | "business" | "cash" | "other";
  openingBalance?: string;
  isSharedSavings?: boolean;
}) {
  const profile = await requireCurrentProfile();
  const supabase = await createClient();

  const { data: account, error: loadError } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", input.accountId)
    .maybeSingle();

  if (loadError || !account) throw new Error("Account not found.");
  if (account.owner_profile_id !== profile.id) {
    throw new Error("Only the account owner can edit account details.");
  }

  const hasActivity = await accountHasTransactions(input.accountId);
  const update: TablesUpdate<"accounts"> = {
    name: input.name.trim(),
    bank_name: input.bankName.trim(),
    account_type: input.accountType,
    is_shared_savings_account: Boolean(input.isSharedSavings),
  };

  if (input.openingBalance !== undefined && !hasActivity) {
    const opening = parseMoney(input.openingBalance);
    if (opening < 0) throw new Error("Opening balance cannot be negative.");
    update.opening_balance = toDbMoney(opening);
  }

  const { error } = await supabase
    .from("accounts")
    .update(update)
    .eq("id", input.accountId);

  if (error) throw new Error(mapDatabaseError(error));
  revalidatePath("/accounts");
  revalidatePath(`/accounts/${input.accountId}`);
  revalidatePath("/dashboard");
  return { ok: true as const };
}
