import { getAuditLogs } from "@/data/audit/queries";
import { ActivityClient } from "./activity-client";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const result = await getAuditLogs({ page: 1, pageSize: 50 });
  return <ActivityClient result={result} />;
}
