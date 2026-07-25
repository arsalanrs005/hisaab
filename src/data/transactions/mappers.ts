import type { Tables } from "@/types/database";
import type { Transaction, UserId } from "@/types";
import { parseMoney } from "@/lib/money";
import { signedTransactionAmount } from "@/lib/finance/transaction-direction";
import { dbStatusToUi, dbTypeToUi } from "@/lib/finance/status-map";
import { profileIdToLegacyUserId, type ProfileSummary } from "@/data/profiles/helpers";

export type TransactionRow = Tables<"transactions"> & {
  accounts?: Pick<Tables<"accounts">, "id" | "name" | "owner_profile_id" | "bank_name"> | null;
  categories?: Pick<Tables<"categories">, "id" | "name" | "slug"> | null;
};

export function mapTransactionToUi(
  row: TransactionRow,
  profiles: ProfileSummary[]
): Transaction {
  const ownerLegacy = row.accounts
    ? profileIdToLegacyUserId(row.accounts.owner_profile_id, profiles)
    : profileIdToLegacyUserId(row.created_by, profiles);

  const signed = signedTransactionAmount(row.amount_pkr, row.direction);

  return {
    id: row.id,
    name: row.description,
    type: dbTypeToUi(row.type),
    amount: parseMoney(row.amount_original),
    currency: row.currency_original as Transaction["currency"],
    amountPkr: signed,
    accountId: row.account_id,
    categoryId: row.category_id ?? "",
    personId: ownerLegacy,
    date: row.transaction_date,
    status: dbStatusToUi(row.status),
    description: row.description,
    notes: row.notes ?? undefined,
    incomeSourceId: row.income_source_id ?? undefined,
    goalId: row.goal_id ?? undefined,
    isShared: row.classification === "shared",
    transferId: row.transfer_id ?? undefined,
    usdAmount:
      row.currency_original === "USD" ? parseMoney(row.amount_original) : undefined,
    exchangeRate: row.exchange_rate ? parseMoney(row.exchange_rate) : undefined,
    rateSource: row.exchange_rate_source ?? undefined,
    rateTimestamp: row.exchange_rate_timestamp ?? undefined,
    archivedAt: row.archived_at ?? undefined,
    createdByProfileId: row.created_by,
    updatedByProfileId: row.updated_by ?? undefined,
    balanceAdjustmentId: row.balance_adjustment_id ?? undefined,
    isArchived: Boolean(row.archived_at),
    isTransferLinked: Boolean(row.transfer_id),
    isAdjustmentLinked: Boolean(row.balance_adjustment_id),
    dbType: row.type,
    direction: row.direction,
    classification: row.classification,
    accountName: row.accounts?.name,
    categoryName: row.categories?.name,
    ownerProfileId: row.accounts?.owner_profile_id,
  };
}

export type UiTransaction = ReturnType<typeof mapTransactionToUi>;
