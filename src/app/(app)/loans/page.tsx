import { getLoansPageData } from "@/data/loans/queries";
import { getAllProfiles } from "@/data/profiles/queries";
import { getAccounts } from "@/data/accounts/queries";
import { emailToLegacyUserId } from "@/lib/auth/approved-users";
import { LoansClient } from "./loans-client";

export const dynamic = "force-dynamic";

export default async function LoansPage() {
  const [data, profiles, accountsResult] = await Promise.all([
    getLoansPageData(),
    getAllProfiles(),
    getAccounts(),
  ]);

  const ownerNames = Object.fromEntries(
    profiles.map((p) => [emailToLegacyUserId(p.email), p.display_name])
  );
  const accountNames = Object.fromEntries(
    accountsResult.accounts.map((a) => [a.id, a.name])
  );

  return (
    <LoansClient
      {...data}
      ownerNames={ownerNames}
      accountNames={accountNames}
    />
  );
}
