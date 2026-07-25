import { getUpworkOpportunities } from "@/data/business/queries";
import { UpworkClient } from "./upwork-client";

export const dynamic = "force-dynamic";

export default async function UpworkPage() {
  const activities = await getUpworkOpportunities();
  return <UpworkClient upworkActivities={activities} />;
}
