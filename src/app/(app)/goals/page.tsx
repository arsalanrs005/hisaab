import { getGoalsSummary } from "@/data/goals/queries";
import { getAllProfiles } from "@/data/profiles/queries";
import { getAccounts } from "@/data/accounts/queries";
import { emailToLegacyUserId } from "@/lib/auth/approved-users";
import { GoalsClient } from "./goals-client";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const [summary, profiles, accountsResult] = await Promise.all([
    getGoalsSummary(),
    getAllProfiles(),
    getAccounts(),
  ]);
  const ownerNames = Object.fromEntries(
    profiles.map((p) => [emailToLegacyUserId(p.email), p.display_name])
  );

  return (
    <GoalsClient {...summary} ownerNames={ownerNames} accounts={accountsResult.accounts} />
  );
}
