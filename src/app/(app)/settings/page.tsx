import { getSettingsPageData, getExchangeRate } from "@/data/settings/queries";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [data, exchangeRate] = await Promise.all([getSettingsPageData(), getExchangeRate()]);
  return <SettingsClient {...data} exchangeRate={exchangeRate} />;
}
