import { getOps5iveMetrics } from "@/data/business/queries";
import { Ops5iveClient } from "./ops5ive-client";

export const dynamic = "force-dynamic";

export default async function Ops5ivePage() {
  const metrics = await getOps5iveMetrics();
  return (
    <Ops5iveClient
      initialMetrics={{
        monthlyRecurring: metrics.monthlyRecurring,
        projectRevenue: metrics.projectRevenue,
        expectedIncome: metrics.expectedIncome,
        receivedIncome: metrics.receivedIncome,
        expenses: metrics.expenses,
        employeePayments: metrics.employeePayments,
        netProfit: metrics.netProfit,
        businessReserve: metrics.businessReserve,
        reinvestment: metrics.reinvestment,
      }}
      clients={metrics.clients}
    />
  );
}
