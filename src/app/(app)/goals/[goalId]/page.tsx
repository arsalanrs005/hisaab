import { getGoalById, getGoalContributions } from "@/data/goals/queries";
import { getNotes } from "@/data/notes/queries";
import { getAllProfiles } from "@/data/profiles/queries";
import { getAccounts } from "@/data/accounts/queries";
import { emailToLegacyUserId } from "@/lib/auth/approved-users";
import { notFound } from "next/navigation";
import { GoalDetailClient } from "./goal-detail-client";

export const dynamic = "force-dynamic";

export default async function GoalDetailPage({ params }: { params: Promise<{ goalId: string }> }) {
  const { goalId } = await params;
  const [goal, contributions, notes, profiles, accountsResult] = await Promise.all([
    getGoalById(goalId),
    getGoalContributions(goalId),
    getNotes(),
    getAllProfiles(),
    getAccounts(),
  ]);

  if (!goal) notFound();

  const ownerNames = Object.fromEntries(
    profiles.map((p) => [emailToLegacyUserId(p.email), p.display_name])
  );
  const relatedNotes = notes.filter((n) => n.relatedGoalId === goalId);

  return (
    <GoalDetailClient
      goal={goal}
      contributions={contributions}
      relatedNotes={relatedNotes}
      ownerNames={ownerNames}
      accounts={accountsResult.accounts}
    />
  );
}
