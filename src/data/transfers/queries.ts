import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile, getAllProfiles } from "@/data/profiles/queries";
import { parseMoney } from "@/lib/money";
import {
  mapTransferToUi,
  type TransferRow,
  type TransferPreview,
  type UiTransfer,
} from "@/data/transfers/mappers";
import {
  transferFilterSchema,
  transferPreviewSchema,
  type TransferFilterInput,
  type TransferPreviewInput,
} from "@/data/transfers/validation";
import { getOwnedAccountsForForms, getAccounts } from "@/data/accounts/queries";
import type { Tables } from "@/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TransferQuery = any;

async function enrichTransfers(
  rows: Tables<"transfers">[],
  supabase: Awaited<ReturnType<typeof createClient>>,
  profiles: Awaited<ReturnType<typeof getAllProfiles>>
): Promise<UiTransfer[]> {
  if (rows.length === 0) return [];

  const accountIds = [
    ...new Set(rows.flatMap((r) => [r.source_account_id, r.destination_account_id])),
  ];
  const transferIds = rows.map((r) => r.id);

  const [{ data: accounts }, { data: contributions }, { data: txns }] = await Promise.all([
    supabase.from("accounts").select("id, name, bank_name, owner_profile_id, is_shared_savings_account").in("id", accountIds),
    supabase.from("account_contributions").select("id, transfer_id, contributor_profile_id, amount_pkr").in("transfer_id", transferIds),
    supabase.from("transactions").select("id, type, transfer_id").in("transfer_id", transferIds),
  ]);

  const accountById = new Map((accounts ?? []).map((a) => [a.id, a]));
  const contribByTransfer = new Map((contributions ?? []).map((c) => [c.transfer_id, c]));
  const legsByTransfer = new Map<string, { outId?: string; inId?: string }>();
  for (const txn of txns ?? []) {
    if (!txn.transfer_id) continue;
    const bucket = legsByTransfer.get(txn.transfer_id) ?? {};
    if (txn.type === "transfer_out") bucket.outId = txn.id;
    if (txn.type === "transfer_in") bucket.inId = txn.id;
    legsByTransfer.set(txn.transfer_id, bucket);
  }

  return rows.map((row) => {
    const enriched: TransferRow = {
      ...row,
      source: accountById.get(row.source_account_id) ?? null,
      destination: accountById.get(row.destination_account_id) ?? null,
      initiator: profiles.find((p) => p.id === row.initiated_by)
        ? {
            id: row.initiated_by,
            display_name: profiles.find((p) => p.id === row.initiated_by)!.display_name,
            email: profiles.find((p) => p.id === row.initiated_by)!.email,
          }
        : null,
      contribution: contribByTransfer.get(row.id) ?? null,
    };
    return mapTransferToUi(enriched, profiles, legsByTransfer.get(row.id));
  });
}

function applyTransferFilters(query: TransferQuery, filters: TransferFilterInput) {
  let q = query as TransferQuery;
  if (filters.sourceAccountId) q = q.eq("source_account_id", filters.sourceAccountId);
  if (filters.destinationAccountId) q = q.eq("destination_account_id", filters.destinationAccountId);
  if (filters.initiatorProfileId) q = q.eq("initiated_by", filters.initiatorProfileId);
  if (filters.currency) q = q.eq("currency", filters.currency);
  if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
  if (filters.dateFrom) q = q.gte("transaction_date", filters.dateFrom);
  if (filters.dateTo) q = q.lte("transaction_date", filters.dateTo);
  if (filters.search?.trim()) q = q.ilike("notes", `%${filters.search.trim()}%`);
  if (filters.sort === "date_asc") {
    q = q.order("transaction_date", { ascending: true }).order("created_at", { ascending: true });
  } else if (filters.sort === "amount_desc") {
    q = q.order("amount_pkr", { ascending: false });
  } else if (filters.sort === "amount_asc") {
    q = q.order("amount_pkr", { ascending: true });
  } else {
    q = q.order("transaction_date", { ascending: false }).order("created_at", { ascending: false });
  }
  q = q.is("archived_at", null);
  return q;
}

export async function getTransfers(rawFilters: Partial<TransferFilterInput> = {}) {
  const filters = transferFilterSchema.parse(rawFilters);
  const profile = await requireCurrentProfile();
  const supabase = await createClient();
  const profiles = await getAllProfiles();

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  let query = supabase.from("transfers").select("*", { count: "exact" });
  query = applyTransferFilters(query, filters);

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error("Unable to load transfers.");

  let rows = data ?? [];
  if (filters.sharedContributionOnly) {
    const { data: contribRows } = await supabase
      .from("account_contributions")
      .select("transfer_id")
      .in("transfer_id", rows.map((r) => r.id));
    const withContrib = new Set((contribRows ?? []).map((c) => c.transfer_id));
    rows = rows.filter((r) => withContrib.has(r.id));
  }

  const transfers = await enrichTransfers(rows, supabase, profiles);

  return {
    transfers,
    total: count ?? transfers.length,
    page: filters.page,
    pageSize: filters.pageSize,
    profiles,
    currentProfileId: profile.id,
  };
}

export async function getTransferById(transferId: string): Promise<UiTransfer | null> {
  const supabase = await createClient();
  const profiles = await getAllProfiles();
  const { data, error } = await supabase.from("transfers").select("*").eq("id", transferId).maybeSingle();
  if (error || !data) return null;
  const [transfer] = await enrichTransfers([data], supabase, profiles);
  return transfer ?? null;
}

export async function getRecentTransfers(limit = 5) {
  const result = await getTransfers({ page: 1, pageSize: limit });
  return result.transfers;
}

export async function getTransferFormData() {
  const profile = await requireCurrentProfile();
  const [sourceAccounts, allAccounts] = await Promise.all([
    getOwnedAccountsForForms(),
    getAccounts(),
  ]);

  return {
    sourceAccounts,
    destinationAccounts: allAccounts.accounts.filter((a) => a.capabilities.canReceiveTransfer),
    profiles: allAccounts.profiles,
    currentProfileId: profile.id,
  };
}

export async function getTransferPreview(raw: TransferPreviewInput): Promise<TransferPreview> {
  const profile = await requireCurrentProfile();
  const input = transferPreviewSchema.parse(raw);
  const supabase = await createClient();
  const profiles = await getAllProfiles();

  const [{ data: sourceBal }, { data: destBal }, { data: sourceAcct }, { data: destAcct }] =
    await Promise.all([
      supabase.from("account_actual_balances").select("actual_balance").eq("account_id", input.sourceAccountId).maybeSingle(),
      supabase.from("account_actual_balances").select("actual_balance").eq("account_id", input.destinationAccountId).maybeSingle(),
      supabase.from("accounts").select("name, owner_profile_id").eq("id", input.sourceAccountId).maybeSingle(),
      supabase.from("accounts").select("name, owner_profile_id, is_shared_savings_account").eq("id", input.destinationAccountId).maybeSingle(),
    ]);

  if (!sourceAcct || !destAcct) throw new Error("Unable to load accounts for preview.");

  const isUsd = input.currency === "USD";
  const exchangeRate = isUsd ? parseMoney(input.exchangeRate ?? 0) : 1;
  const amountOriginal = parseMoney(input.amount);
  const amountPkr = isUsd ? amountOriginal * exchangeRate : amountOriginal;
  const sourceBalance = parseMoney(sourceBal?.actual_balance ?? 0);
  const destBalance = parseMoney(destBal?.actual_balance ?? 0);
  const recordsSharedContribution = Boolean(destAcct.is_shared_savings_account);

  return {
    sourceAccountId: input.sourceAccountId,
    destinationAccountId: input.destinationAccountId,
    sourceAccountName: sourceAcct.name,
    destinationAccountName: destAcct.name,
    sourceOwnerName: profiles.find((p) => p.id === sourceAcct.owner_profile_id)?.display_name ?? "—",
    destinationOwnerName: profiles.find((p) => p.id === destAcct.owner_profile_id)?.display_name ?? "—",
    sourceActualBalance: sourceBalance,
    sourceBalanceAfter: sourceBalance - amountPkr,
    destinationActualBalance: destBalance,
    destinationBalanceAfter: destBalance + amountPkr,
    amountOriginal,
    amountPkr,
    currency: input.currency,
    exchangeRate,
    date: input.date,
    initiatorName: profile.display_name,
    notes: input.notes,
    recordsSharedContribution,
    contributionOwnerName: recordsSharedContribution ? profile.display_name : undefined,
  };
}

export async function getAccountContributionTotals(accountId: string) {
  const supabase = await createClient();
  const profiles = await getAllProfiles();
  const { data, error } = await supabase
    .from("account_contribution_totals")
    .select("*")
    .eq("account_id", accountId);
  if (error) throw new Error("Unable to load contribution totals.");
  const { mapContributionTotals } = await import("@/data/transfers/mappers");
  return mapContributionTotals(data ?? [], profiles);
}

export async function getHasOpeningAllocation(accountId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("account_contributions")
    .select("*", { count: "exact", head: true })
    .eq("account_id", accountId)
    .eq("contribution_type", "opening_allocation");

  if (error) return false;
  return (count ?? 0) > 0;
}

export async function getAccountContributionHistory(accountId: string, limit = 20) {
  const supabase = await createClient();
  const profiles = await getAllProfiles();
  const { data, error } = await supabase
    .from("account_contributions")
    .select("*")
    .eq("account_id", accountId)
    .order("contribution_date", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Unable to load contribution history.");

  return (data ?? []).map((row) => ({
    id: row.id,
    contributorProfileId: row.contributor_profile_id,
    contributorName:
      profiles.find((p) => p.id === row.contributor_profile_id)?.display_name ?? "Unknown",
    amountPkr: parseMoney(row.amount_pkr),
    date: row.contribution_date,
    type: row.contribution_type,
    transferId: row.transfer_id ?? undefined,
    notes: row.notes ?? undefined,
  }));
}
