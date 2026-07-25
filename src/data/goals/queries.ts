import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile, getAllProfiles } from "@/data/profiles/queries";
import { requireCurrentWorkspace } from "@/data/workspaces/queries";
import { goalProgressPercent, mapGoalToUi } from "@/data/goals/mappers";
import type { Goal } from "@/types";
import type { Tables } from "@/types/database";

export const dynamic = "force-dynamic";

export async function getGoals(): Promise<Goal[]> {
  await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const profiles = await getAllProfiles();
  const supabase = await createClient();

  const [goalsRes, progressRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("financial_goals")
      .select("*")
      .eq("workspace_id", workspace.workspaceId)
      .eq("status", "active")
      .is("archived_at", null)
      .order("priority"),
    supabase.from("goal_progress").select("*"),
  ]);

  if (goalsRes.error) throw new Error("Unable to load goals.");
  const progressByGoal = new Map(
    (progressRes.data ?? []).map((row) => [row.goal_id, row])
  );

  return (goalsRes.data ?? []).map((row: Tables<"financial_goals">, index: number) =>
    mapGoalToUi(row, progressByGoal.get(row.id), profiles, index)
  );
}

export async function getGoalById(goalId: string): Promise<Goal | null> {
  const goals = await getGoals();
  return goals.find((g) => g.id === goalId) ?? null;
}

export async function getGoalsSummary() {
  const goals = await getGoals();
  const totalSaved = goals.reduce((sum, g) => sum + g.savedAmount, 0);
  const monthlyTotal = goals.reduce((sum, g) => sum + g.monthlyContribution, 0);
  const highCount = goals.filter((g) => g.priority === "high").length;
  const mediumCount = goals.filter((g) => g.priority === "medium").length;
  const lowCount = goals.filter((g) => g.priority === "low").length;

  return { goals, totalSaved, monthlyTotal, highCount, mediumCount, lowCount };
}

export async function getGoalContributions(goalId: string) {
  await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const profiles = await getAllProfiles();
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("goal_contributions")
    .select("*")
    .eq("workspace_id", workspace.workspaceId)
    .eq("goal_id", goalId)
    .order("contribution_date", { ascending: false });

  if (error) throw new Error("Unable to load goal contributions.");

  return (data ?? []).map((row: Tables<"goal_contributions">) => {
    const contributor = profiles.find((p) => p.id === row.contributor_profile_id);
    return {
      id: row.id,
      goalId: row.goal_id,
      contributorProfileId: row.contributor_profile_id,
      contributorName: contributor?.display_name ?? "Unknown",
      amount: Number(row.amount),
      date: row.contribution_date,
      type: row.contribution_type,
      notes: row.notes,
    };
  });
}

export { goalProgressPercent };
