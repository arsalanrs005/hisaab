import { getDashboardLiveData } from "@/data/dashboard/queries";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardLiveData("combined");
  return (
    <DashboardClient
      initialMode={data.profile.default_dashboard_mode}
      combinedData={data}
    />
  );
}
