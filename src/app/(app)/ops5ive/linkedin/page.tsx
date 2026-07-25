import { getLinkedInProspects } from "@/data/business/queries";
import { LinkedInClient } from "./linkedin-client";

export const dynamic = "force-dynamic";

export default async function LinkedInPage() {
  const activities = await getLinkedInProspects();
  return <LinkedInClient linkedInActivities={activities} />;
}
