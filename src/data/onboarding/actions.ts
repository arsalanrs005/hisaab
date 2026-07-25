"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile } from "@/data/profiles/queries";
import { mapDatabaseError } from "@/data/errors";
import {
  onboardingSubmitSchema,
  type OnboardingSubmitInput,
} from "@/data/onboarding/validation";
import { toDbMoney, parseMoney } from "@/lib/money";
import { requireCurrentWorkspace } from "@/data/workspaces/queries";
import { isSharedWorkspaceEmail } from "@/lib/approved-users";

export async function completeOnboardingAction(raw: OnboardingSubmitInput) {
  const profile = await requireCurrentProfile();
  if (profile.onboarding_completed) {
    redirect("/dashboard");
  }

  const input = onboardingSubmitSchema.parse(raw);
  const supabase = await createClient();
  const workspace = await requireCurrentWorkspace();

  const enabledAccounts = input.accounts.filter((a) => a.enabled);
  if (enabledAccounts.length === 0) {
    throw new Error("Add at least one account to continue.");
  }

  for (const account of enabledAccounts) {
    const opening = parseMoney(account.openingBalance);
    if (opening < 0) {
      throw new Error("Opening balances cannot be negative.");
    }

    const isShared = Boolean(account.isSharedSavings);
    if (isShared && !isSharedWorkspaceEmail(profile.email)) {
      throw new Error("Shared savings accounts are only available in the Arsalan & Ali workspace.");
    }
    if (isShared && profile.legacyUserId !== "arsalan") {
      throw new Error("Only Arsalan can mark a shared savings account during onboarding.");
    }

    const { error } = await supabase.from("accounts").insert({
      name: account.name.trim(),
      bank_name: account.bankName.trim(),
      owner_profile_id: profile.id,
      account_type: isShared ? "savings" : "current",
      primary_currency: "PKR",
      opening_balance: toDbMoney(opening),
      is_shared_savings_account: isShared,
      is_active: true,
    });

    if (error) {
      if (error.message.includes("accounts_owner_bank_name_unique")) {
        continue;
      }
      throw new Error(mapDatabaseError(error));
    }
  }

  for (const source of input.incomeSources) {
    const amount = source.expectedAmount ? parseMoney(source.expectedAmount) : null;
    const { error } = await supabase.from("income_sources").insert({
      name: source.name.trim(),
      owner_profile_id: source.isShared ? null : profile.id,
      expected_currency: source.currency,
      default_expected_amount: amount && amount > 0 ? toDbMoney(amount) : null,
      payment_frequency: source.frequency || null,
      next_expected_date: source.nextExpectedDate || null,
      is_shared_income: Boolean(source.isShared),
      is_active: true,
      created_by: profile.id,
    });

    if (error) throw new Error(mapDatabaseError(error));
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      onboarding_completed: true,
      savings_plan_mode: input.savingsMode,
      custom_savings_rate:
        input.savingsMode === "custom" ? input.customSavingsRate ?? null : null,
    })
    .eq("id", profile.id);

  if (profileError) throw new Error(mapDatabaseError(profileError));

  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath("/onboarding");
  redirect("/dashboard");
}
