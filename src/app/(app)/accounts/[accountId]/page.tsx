import { notFound } from "next/navigation";
import { getAccountById } from "@/data/accounts/queries";
import { getTransactionsForAccount } from "@/data/transactions/queries";
import { getActiveCategories } from "@/data/categories/queries";
import { getAllProfiles } from "@/data/profiles/queries";
import { getAccountBalanceTrend } from "@/data/accounts/queries";
import { getAccountContributionTotals, getAccountContributionHistory, getHasOpeningAllocation } from "@/data/transfers/queries";
import { getAccountReconciliations } from "@/data/reconciliation/queries";
import { AccountDetailClient } from "./account-detail-client";

export const dynamic = "force-dynamic";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  const account = await getAccountById(accountId);
  if (!account) notFound();

  const [transactionsResult, categories, profiles, trend, contributionTotals, contributionHistory, reconciliations, hasOpeningAllocation] =
    await Promise.all([
    getTransactionsForAccount(accountId, { page: 1, pageSize: 100, archived: "active" }),
    getActiveCategories(),
    getAllProfiles(),
    getAccountBalanceTrend(accountId, account.openingBalance),
    account.isPooled ? getAccountContributionTotals(accountId) : Promise.resolve([]),
    account.isPooled ? getAccountContributionHistory(accountId) : Promise.resolve([]),
    getAccountReconciliations(accountId, { page: 1, pageSize: 10 }),
    account.isPooled ? getHasOpeningAllocation(accountId) : Promise.resolve(true),
  ]);

  return (
    <AccountDetailClient
      account={account}
      transactions={transactionsResult.transactions}
      categories={categories}
      profiles={profiles}
      trend={trend}
      currentProfileId={transactionsResult.currentProfileId}
      contributionTotals={contributionTotals}
      contributionHistory={contributionHistory}
      reconciliations={reconciliations.items}
      showOpeningAllocation={account.isPooled && !hasOpeningAllocation}
    />
  );
}
