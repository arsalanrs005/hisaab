import { getAccounts } from "@/data/accounts/queries";
import { AccountsClient } from "./accounts-client";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const { accounts, summary, profiles } = await getAccounts();
  return <AccountsClient accounts={accounts} summary={summary} profiles={profiles} />;
}
