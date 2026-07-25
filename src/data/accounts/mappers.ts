import type { Tables, Views } from "@/types/database";
import type { Account, Currency, UserId } from "@/types";
import type { AccountCapabilities } from "@/lib/finance/capabilities";
import { parseMoney } from "@/lib/money";
import { profileIdToLegacyUserId, type ProfileSummary } from "@/data/profiles/helpers";

export type AccountRow = Tables<"accounts">;
export type ProjectedBalanceRow = Views<"account_projected_balances">;
export type ContributionTotalRow = Views<"account_contribution_totals">;

export interface AccountWithMeta extends Account {
  ownerProfileId: string;
  accountType: Tables<"accounts">["account_type"];
  openingBalance: number;
  actualBalance: number;
  projectedBalance: number;
  pendingEffect: number;
  expectedEffect: number;
  capabilities: AccountCapabilities;
  transactionCount: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  contributionTotals: ContributionTotalRow[];
}

export interface AccountListSummary {
  totalActual: number;
  totalProjected: number;
  sharedSavingsTotal: number;
  activeCount: number;
  ownedCount: number;
}

export function mapAccountToUi(
  account: AccountRow,
  balance: ProjectedBalanceRow | undefined,
  ownerLegacyId: UserId,
  capabilities: AccountCapabilities,
  extras?: {
    transactionCount?: number;
    monthlyIncome?: number;
    monthlyExpenses?: number;
    contributionTotals?: ContributionTotalRow[];
    recentActivityLabel?: string;
    trend?: number[];
  }
): AccountWithMeta {
  const actual = parseMoney(balance?.actual_balance ?? account.opening_balance);
  const projected = parseMoney(balance?.projected_balance ?? actual);
  const pending = parseMoney(balance?.pending_effect ?? 0);
  const expected = parseMoney(balance?.expected_effect ?? 0);

  return {
    id: account.id,
    name: account.name,
    bank: account.bank_name,
    ownerId: ownerLegacyId,
    ownerProfileId: account.owner_profile_id,
    currency: (account.primary_currency as Currency) ?? "PKR",
    currentBalance: actual,
    availableBalance: projected,
    protectedSavings: 0,
    isPooled: account.is_shared_savings_account,
    lastReconciledAt: account.last_reconciled_at ?? new Date(0).toISOString(),
    trend: extras?.trend ?? [actual],
    recentActivityLabel:
      extras?.recentActivityLabel ??
      (extras?.transactionCount
        ? `${extras.transactionCount} transaction${extras.transactionCount === 1 ? "" : "s"}`
        : "No activity yet"),
    accountType: account.account_type,
    openingBalance: parseMoney(account.opening_balance),
    actualBalance: actual,
    projectedBalance: projected,
    pendingEffect: pending,
    expectedEffect: expected,
    capabilities,
    transactionCount: extras?.transactionCount ?? 0,
    monthlyIncome: extras?.monthlyIncome ?? 0,
    monthlyExpenses: extras?.monthlyExpenses ?? 0,
    contributionTotals: extras?.contributionTotals ?? [],
  };
}

export function summarizeAccounts(
  accounts: AccountWithMeta[],
  currentProfileId: string
): AccountListSummary {
  return {
    totalActual: accounts.reduce((sum, a) => sum + a.actualBalance, 0),
    totalProjected: accounts.reduce((sum, a) => sum + a.projectedBalance, 0),
    sharedSavingsTotal: accounts
      .filter((a) => a.isPooled)
      .reduce((sum, a) => sum + a.actualBalance, 0),
    activeCount: accounts.length,
    ownedCount: accounts.filter((a) => a.ownerProfileId === currentProfileId).length,
  };
}

export function ownerLegacyIdForAccount(
  account: AccountRow,
  profiles: ProfileSummary[]
): UserId {
  return profileIdToLegacyUserId(account.owner_profile_id, profiles);
}
