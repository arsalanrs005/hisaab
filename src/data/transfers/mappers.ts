import type { Tables, Views } from "@/types/database";
import type { ProfileSummary } from "@/data/profiles/helpers";
import { parseMoney } from "@/lib/money";

export type TransferRow = Tables<"transfers"> & {
  source?: Pick<Tables<"accounts">, "id" | "name" | "bank_name" | "owner_profile_id"> | null;
  destination?: Pick<Tables<"accounts">, "id" | "name" | "bank_name" | "owner_profile_id" | "is_shared_savings_account"> | null;
  initiator?: Pick<Tables<"profiles">, "id" | "display_name" | "email"> | null;
  contribution?: Pick<Tables<"account_contributions">, "id" | "contributor_profile_id" | "amount_pkr"> | null;
};

export interface UiTransfer {
  id: string;
  sourceAccountId: string;
  destinationAccountId: string;
  sourceAccountName: string;
  destinationAccountName: string;
  sourceOwnerProfileId: string;
  destinationOwnerProfileId: string;
  initiatedByProfileId: string;
  initiatedByName: string;
  amountOriginal: number;
  amountPkr: number;
  currency: string;
  exchangeRate: number;
  date: string;
  status: string;
  notes?: string;
  hasContribution: boolean;
  contributionId?: string;
  contributorProfileId?: string;
  transferOutTransactionId?: string;
  transferInTransactionId?: string;
  createdAt: string;
}

export interface TransferPreview {
  sourceAccountId: string;
  destinationAccountId: string;
  sourceAccountName: string;
  destinationAccountName: string;
  sourceOwnerName: string;
  destinationOwnerName: string;
  sourceActualBalance: number;
  sourceBalanceAfter: number;
  destinationActualBalance: number;
  destinationBalanceAfter: number;
  amountOriginal: number;
  amountPkr: number;
  currency: string;
  exchangeRate: number;
  date: string;
  initiatorName: string;
  notes?: string;
  recordsSharedContribution: boolean;
  contributionOwnerName?: string;
}

export function mapTransferToUi(
  row: TransferRow,
  profiles: ProfileSummary[],
  legs?: { outId?: string; inId?: string }
): UiTransfer {
  const profileName = (id: string) =>
    profiles.find((p) => p.id === id)?.display_name ?? "Unknown";

  return {
    id: row.id,
    sourceAccountId: row.source_account_id,
    destinationAccountId: row.destination_account_id,
    sourceAccountName: row.source?.name ?? "Source",
    destinationAccountName: row.destination?.name ?? "Destination",
    sourceOwnerProfileId: row.source?.owner_profile_id ?? "",
    destinationOwnerProfileId: row.destination?.owner_profile_id ?? "",
    initiatedByProfileId: row.initiated_by,
    initiatedByName: row.initiator?.display_name ?? profileName(row.initiated_by),
    amountOriginal: parseMoney(row.amount_original),
    amountPkr: parseMoney(row.amount_pkr),
    currency: row.currency,
    exchangeRate: parseMoney(row.exchange_rate),
    date: row.transaction_date,
    status: row.status,
    notes: row.notes ?? undefined,
    hasContribution: Boolean(row.contribution?.id),
    contributionId: row.contribution?.id,
    contributorProfileId: row.contribution?.contributor_profile_id,
    transferOutTransactionId: legs?.outId,
    transferInTransactionId: legs?.inId,
    createdAt: row.created_at,
  };
}

export type ContributionTotalRow = Views<"account_contribution_totals">;

export interface UiContributionTotal {
  contributorProfileId: string;
  contributorName: string;
  totalAmount: number;
  percentage: number;
}

export function mapContributionTotals(
  rows: ContributionTotalRow[],
  profiles: ProfileSummary[]
): UiContributionTotal[] {
  const total = rows.reduce((s, r) => s + parseMoney(r.total_contributed_pkr ?? 0), 0);
  return rows.map((row) => {
    const amount = parseMoney(row.total_contributed_pkr ?? 0);
    const contributorProfileId = row.contributor_profile_id ?? "";
    return {
      contributorProfileId,
      contributorName:
        profiles.find((p) => p.id === contributorProfileId)?.display_name ?? "Unknown",
      totalAmount: amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    };
  });
}
