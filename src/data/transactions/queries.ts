import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile, getAllProfiles } from "@/data/profiles/queries";
import {
  mapTransactionToUi,
  type TransactionRow,
  type UiTransaction,
} from "@/data/transactions/mappers";
import {
  transactionFilterSchema,
  type TransactionFilterInput,
} from "@/data/transactions/validation";
import { uiStatusToDb } from "@/lib/finance/status-map";

export const dynamic = "force-dynamic";

const SELECT =
  "*, accounts(id, name, owner_profile_id, bank_name), categories(id, name, slug)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TransactionQuery = any;

function applyFilters(query: TransactionQuery, filters: TransactionFilterInput) {
  let q = query as TransactionQuery;

  if (filters.archived === "active") q = q.is("archived_at", null);
  if (filters.archived === "archived") q = q.not("archived_at", "is", null);

  if (filters.accountId) q = q.eq("account_id", filters.accountId);
  if (filters.categoryId) q = q.eq("category_id", filters.categoryId);
  if (filters.classification) q = q.eq("classification", filters.classification);
  if (filters.currency) q = q.eq("currency_original", filters.currency);
  if (filters.dateFrom) q = q.gte("transaction_date", filters.dateFrom);
  if (filters.dateTo) q = q.lte("transaction_date", filters.dateTo);

  if (filters.type && filters.type !== "all") {
    if (filters.type === "transfer") {
      q = q.in("type", ["transfer_in", "transfer_out"]);
    } else if (filters.type === "transfer_in") {
      q = q.eq("type", "transfer_in");
    } else if (filters.type === "transfer_out") {
      q = q.eq("type", "transfer_out");
    } else if (filters.type === "balance_adjustment") {
      q = q.eq("type", "balance_adjustment");
    } else if (filters.type === "linked_transfer") {
      q = q.not("transfer_id", "is", null);
    } else if (filters.type === "income") {
      q = q.in("type", ["income", "refund", "family_contribution", "loan_repayment"]);
    } else if (filters.type === "expense") {
      q = q.in("type", ["expense", "loan_payment"]);
    } else {
      q = q.eq("type", filters.type);
    }
  }

  if (filters.status && filters.status !== "all") {
    q = q.eq("status", uiStatusToDb(filters.status as "cleared"));
  }

  if (filters.amountMin !== undefined) q = q.gte("amount_pkr", filters.amountMin);
  if (filters.amountMax !== undefined) q = q.lte("amount_pkr", filters.amountMax);

  if (filters.search?.trim()) {
    q = q.or(
      `description.ilike.%${filters.search.trim()}%,notes.ilike.%${filters.search.trim()}%`
    );
  }

  switch (filters.sort) {
    case "date_asc":
      q = q.order("transaction_date", { ascending: true }).order("created_at", { ascending: true });
      break;
    case "amount_desc":
      q = q.order("amount_pkr", { ascending: false });
      break;
    case "amount_asc":
      q = q.order("amount_pkr", { ascending: true });
      break;
    default:
      q = q.order("transaction_date", { ascending: false }).order("created_at", { ascending: false });
  }

  return q;
}

export async function getTransactions(rawFilters: Partial<TransactionFilterInput> = {}) {
  const filters = transactionFilterSchema.parse(rawFilters);
  const profile = await requireCurrentProfile();
  const supabase = await createClient();
  const profiles = await getAllProfiles();

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  let query = supabase.from("transactions").select(SELECT, { count: "exact" });
  query = applyFilters(query, filters);

  if (filters.ownerProfileId) {
    const ownedAccountIds = (
      await supabase
        .from("accounts")
        .select("id")
        .eq("owner_profile_id", filters.ownerProfileId)
    ).data?.map((a) => a.id);

    if (ownedAccountIds?.length) {
      query = query.in("account_id", ownedAccountIds);
    } else {
      return {
        transactions: [] as UiTransaction[],
        total: 0,
        page: filters.page,
        pageSize: filters.pageSize,
        profiles,
        currentProfileId: profile.id,
      };
    }
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error("Unable to load transactions.");

  const rows = (data ?? []) as TransactionRow[];
  return {
    transactions: rows.map((row) => mapTransactionToUi(row, profiles)),
    total: count ?? rows.length,
    page: filters.page,
    pageSize: filters.pageSize,
    profiles,
    currentProfileId: profile.id,
  };
}

export async function getTransactionById(transactionId: string): Promise<UiTransaction | null> {
  const supabase = await createClient();
  const profiles = await getAllProfiles();
  const { data, error } = await supabase
    .from("transactions")
    .select(SELECT)
    .eq("id", transactionId)
    .maybeSingle();

  if (error) throw new Error("Unable to load transaction.");
  if (!data) return null;
  return mapTransactionToUi(data as TransactionRow, profiles);
}

export async function getRecentTransactions(limit = 8) {
  const result = await getTransactions({ page: 1, pageSize: limit, archived: "active" });
  return result.transactions;
}

export async function getTransactionsForAccount(
  accountId: string,
  rawFilters: Partial<TransactionFilterInput> = {}
) {
  return getTransactions({ ...rawFilters, accountId });
}

export async function getTransactionFilterOptions() {
  const supabase = await createClient();
  const [accountsRes, categoriesRes, profiles] = await Promise.all([
    supabase.from("accounts").select("id, name, owner_profile_id").eq("is_active", true),
    supabase.from("categories").select("id, name, slug, type").eq("is_active", true).is("archived_at", null),
    getAllProfiles(),
  ]);

  if (accountsRes.error || categoriesRes.error) {
    throw new Error("Unable to load filter options.");
  }

  return {
    accounts: accountsRes.data ?? [],
    categories: categoriesRes.data ?? [],
    profiles,
  };
}
