import type { Goal, GoalVisibility, UserId } from "@/types";
import type { ProfileSummary } from "@/data/profiles/helpers";
import { emailToLegacyUserId } from "@/lib/auth/approved-users";
import { parseMoney } from "@/lib/money";
import type { Tables, Views } from "@/types/database";

const GOAL_COLORS = ["#991b1b", "#1e40af", "#0f766e", "#4338ca", "#115e59", "#b45309"];

function priorityFromDb(value: number | null): Goal["priority"] {
  if (value == null || value <= 2) return "high";
  if (value <= 3) return "medium";
  return "low";
}

function mapOwnershipToVisibility(type: Tables<"financial_goals">["ownership_type"]): GoalVisibility {
  return type;
}

export function mapGoalToUi(
  goal: Tables<"financial_goals">,
  progress: Views<"goal_progress"> | undefined,
  profiles: ProfileSummary[],
  colorIndex = 0
): Goal {
  const ownerProfile = profiles.find((p) => p.id === goal.owner_profile_id);
  const ownerId: UserId = ownerProfile
    ? emailToLegacyUserId(ownerProfile.email)
    : "arsalan";
  const savedAmount = parseMoney(progress?.current_amount ?? goal.starting_amount);
  const targetAmount = parseMoney(goal.target_amount);

  return {
    id: goal.id,
    name: goal.name,
    targetAmount,
    savedAmount,
    monthlyContribution: parseMoney(goal.monthly_target ?? 0),
    ownerId,
    visibility: mapOwnershipToVisibility(goal.ownership_type),
    priority: priorityFromDb(goal.priority),
    estimatedCompletion: goal.target_date ?? new Date().toISOString().slice(0, 10),
    fundingAccountIds: goal.funding_account_id ? [goal.funding_account_id] : [],
    relatedNoteIds: [],
    color: GOAL_COLORS[colorIndex % GOAL_COLORS.length],
  };
}

export function goalProgressPercent(goal: Goal): number {
  if (goal.targetAmount <= 0) return 0;
  return Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100));
}
