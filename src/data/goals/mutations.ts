"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile } from "@/data/profiles/queries";
import { requireCurrentWorkspace } from "@/data/workspaces/queries";
import { mapDatabaseError } from "@/data/errors";
import { parseMoney, toDbMoney } from "@/lib/money";
import {
  addGoalContributionSchema,
  createGoalSchema,
  priorityToDb,
  type AddGoalContributionInput,
  type CreateGoalInput,
} from "@/data/goals/validation";

function revalidateGoalPaths(goalId?: string) {
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  if (goalId) revalidatePath(`/goals/${goalId}`);
}

export async function createGoalAction(raw: CreateGoalInput) {
  const profile = await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const input = createGoalSchema.parse(raw);
  const targetAmount = parseMoney(input.targetAmount);
  if (targetAmount <= 0) throw new Error("Target amount must be greater than zero.");

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("financial_goals")
    .insert({
      workspace_id: workspace.workspaceId,
      name: input.name,
      goal_type: input.ownershipType === "business" ? "business" : "savings",
      ownership_type: input.ownershipType,
      owner_profile_id: input.ownershipType === "personal" ? profile.id : null,
      target_amount: toDbMoney(targetAmount),
      starting_amount: toDbMoney(0),
      monthly_target: input.monthlyTarget ? toDbMoney(parseMoney(input.monthlyTarget)) : null,
      target_date: input.targetDate ?? null,
      priority: priorityToDb(input.priority),
      funding_account_id: input.fundingAccountId ?? null,
      status: "active",
      description: input.description ?? null,
      created_by: profile.id,
      updated_by: profile.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(mapDatabaseError(error));
  revalidateGoalPaths(data.id);
  return { ok: true as const, goalId: data.id };
}

export async function addGoalContributionAction(raw: AddGoalContributionInput) {
  const profile = await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const input = addGoalContributionSchema.parse(raw);
  const amount = parseMoney(input.amount);
  if (amount <= 0) throw new Error("Contribution amount must be greater than zero.");

  const supabase = await createClient();
  const { data: goal, error: goalError } = await (supabase as any)
    .from("financial_goals")
    .select("id")
    .eq("id", input.goalId)
    .eq("workspace_id", workspace.workspaceId)
    .is("archived_at", null)
    .maybeSingle();

  if (goalError || !goal) throw new Error("Goal not found.");

  const { data, error } = await (supabase as any)
    .from("goal_contributions")
    .insert({
      workspace_id: workspace.workspaceId,
      goal_id: input.goalId,
      contributor_profile_id: profile.id,
      account_id: input.accountId ?? null,
      amount: toDbMoney(amount),
      contribution_date: input.contributionDate ?? new Date().toISOString().slice(0, 10),
      contribution_type: input.contributionType,
      notes: input.notes ?? null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(mapDatabaseError(error));
  revalidateGoalPaths(input.goalId);
  return { ok: true as const, contributionId: data.id };
}

export async function archiveGoalAction(goalId: string) {
  await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const supabase = await createClient();
  const { error } = await (supabase as any)
    .from("financial_goals")
    .update({ archived_at: new Date().toISOString(), status: "cancelled" })
    .eq("id", goalId)
    .eq("workspace_id", workspace.workspaceId);

  if (error) throw new Error(mapDatabaseError(error));
  revalidateGoalPaths(goalId);
  return { ok: true as const };
}
