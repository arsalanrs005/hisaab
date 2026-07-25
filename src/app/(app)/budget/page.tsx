import { getBudgetPageData } from "@/data/budgets/queries";
import { getSettingsPageData } from "@/data/settings/queries";
import { BudgetClient } from "./budget-client";

export const dynamic = "force-dynamic";

export default async function BudgetPage() {
  const [data, settings] = await Promise.all([getBudgetPageData(), getSettingsPageData()]);
  return <BudgetClient data={data} assumptions={settings.settings} />;
}
