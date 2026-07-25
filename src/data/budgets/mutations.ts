"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile } from "@/data/profiles/queries";
import { requireCurrentWorkspace } from "@/data/workspaces/queries";
import { mapDatabaseError } from "@/data/errors";
import { parseMoney, toDbMoney } from "@/lib/money";
import { updateAppSettingAction } from "@/data/settings/mutations";
import {
  updateBudgetAssumptionsSchema,
  upsertBudgetCategorySchema,
  type UpsertBudgetCategoryInput,
} from "@/data/budgets/validation";

export async function upsertBudgetCategoryAction(raw: UpsertBudgetCategoryInput) {
  const profile = await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const input = upsertBudgetCategorySchema.parse(raw);
  const budgeted = parseMoney(input.budgetedAmount);
  if (budgeted < 0) throw new Error("Budget amount cannot be negative.");

  const supabase = await createClient();
  const ownerProfileId = input.scope === "personal" ? profile.id : null;

  const { data: existing } = await (supabase as any)
    .from("budgets")
    .select("id")
    .eq("workspace_id", workspace.workspaceId)
    .eq("year", input.year)
    .eq("month", input.month)
    .eq("category_id", input.categoryId)
    .eq("scope", input.scope)
    .is("owner_profile_id", ownerProfileId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await (supabase as any)
      .from("budgets")
      .update({
        budgeted_amount: toDbMoney(budgeted),
        updated_by: profile.id,
      })
      .eq("id", existing.id);

    if (error) throw new Error(mapDatabaseError(error));
  } else {
    const { error } = await (supabase as any).from("budgets").insert({
      workspace_id: workspace.workspaceId,
      year: input.year,
      month: input.month,
      category_id: input.categoryId,
      scope: input.scope,
      owner_profile_id: ownerProfileId,
      budgeted_amount: toDbMoney(budgeted),
      created_by: profile.id,
      updated_by: profile.id,
    });

    if (error) throw new Error(mapDatabaseError(error));
  }

  revalidatePath("/budget");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function updateBudgetAssumptionsAction(raw: Record<string, unknown>) {
  const parsed = updateBudgetAssumptionsSchema.parse(raw);
  if (parsed.comfortableSavingsRate !== undefined) {
    await updateAppSettingAction("comfortable_savings_rate", parsed.comfortableSavingsRate);
  }
  if (parsed.balancedSavingsRate !== undefined) {
    await updateAppSettingAction("balanced_savings_rate", parsed.balancedSavingsRate);
  }
  if (parsed.aggressiveSavingsRate !== undefined) {
    await updateAppSettingAction("aggressive_savings_rate", parsed.aggressiveSavingsRate);
  }
  if (parsed.budgetWarningThreshold !== undefined) {
    await updateAppSettingAction("budget_warning_threshold", parsed.budgetWarningThreshold);
  }
  if (parsed.budgetExceededThreshold !== undefined) {
    await updateAppSettingAction("budget_exceeded_threshold", parsed.budgetExceededThreshold);
  }
  revalidatePath("/budget");
  revalidatePath("/settings");
  return { ok: true as const };
}
