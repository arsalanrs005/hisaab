import { getReportsPageData } from "@/data/reports/queries";
import { ReportsClient } from "./reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const data = await getReportsPageData();
  return <ReportsClient accounts={data.accounts} workspaceName={data.workspaceName} />;
}
