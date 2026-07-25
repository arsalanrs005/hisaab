"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile } from "@/data/profiles/queries";
import { mapDatabaseError } from "@/data/errors";
import {
  createTransactionSchema,
  updateTransactionSchema,
  type CreateTransactionInput,
  type UpdateTransactionInput,
} from "@/data/transactions/validation";
import { uiStatusToDb, uiTypeToDb } from "@/lib/finance/status-map";
import { multiplyMoney, toDbMoney, parseMoney } from "@/lib/money";
import type { TransactionTypeDb } from "@/types/database";
import { getTransactionById } from "@/data/transactions/queries";
import { isSecureTransactionType } from "@/lib/finance/transaction-direction";

function revalidateFinancePaths(accountId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath("/transactions");
  if (accountId) revalidatePath(`/accounts/${accountId}`);
}

async function assertAccountOwnership(accountId: string, profileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("id, owner_profile_id")
    .eq("id", accountId)
    .maybeSingle();

  if (error || !data) throw new Error("Account not found.");
  if (data.owner_profile_id !== profileId) {
    throw new Error("You can view this account, but only its owner can modify transactions.");
  }
}

export async function createTransactionAction(raw: CreateTransactionInput) {
  const profile = await requireCurrentProfile();
  const input = createTransactionSchema.parse(raw);
  await assertAccountOwnership(input.accountId, profile.id);

  const dbType = uiTypeToDb(input.type);
  if (isSecureTransactionType(dbType)) {
    throw new Error("This transaction type cannot be created manually.");
  }

  const amountOriginal = toDbMoney(input.amount);
  const isUsd = input.currency === "USD";
  const exchangeRate = isUsd ? toDbMoney(input.exchangeRate ?? 0) : 1;
  const amountPkr = isUsd
    ? toDbMoney(multiplyMoney(amountOriginal, exchangeRate))
    : amountOriginal;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      account_id: input.accountId,
      type: dbType,
      category_id: input.categoryId || null,
      income_source_id: input.incomeSourceId || null,
      amount_original: amountOriginal,
      currency_original: input.currency,
      exchange_rate: isUsd ? exchangeRate : 1,
      amount_pkr: amountPkr,
      exchange_rate_source: isUsd ? "manual" : "fixed",
      exchange_rate_timestamp: new Date().toISOString(),
      exchange_rate_is_manual: isUsd ? Boolean(input.exchangeRateIsManual ?? true) : false,
      description: input.description,
      notes: input.notes ?? null,
      transaction_date: input.date,
      status: uiStatusToDb(input.status),
      classification: input.classification,
      direction: 1,
      created_by: profile.id,
      client_request_id: input.clientRequestId ?? null,
    })
    .select("id, account_id")
    .single();

  if (error) {
    if (error.code === "23505" && input.clientRequestId) {
      const { data: existing } = await supabase
        .from("transactions")
        .select("id, account_id")
        .eq("client_request_id", input.clientRequestId)
        .maybeSingle();
      if (existing) {
        revalidateFinancePaths(existing.account_id);
        return { ok: true as const, transactionId: existing.id, deduplicated: true };
      }
    }
    throw new Error(mapDatabaseError(error));
  }

  revalidateFinancePaths(data.account_id);
  return { ok: true as const, transactionId: data.id, deduplicated: false };
}

export async function updateTransactionAction(raw: UpdateTransactionInput) {
  const profile = await requireCurrentProfile();
  const input = updateTransactionSchema.parse(raw);

  const existing = await getTransactionById(input.transactionId);
  if (!existing) throw new Error("Transaction not found.");
  if (existing.isTransferLinked || existing.isAdjustmentLinked) {
    throw new Error("This transaction is linked to a transfer or reconciliation and cannot be edited directly.");
  }
  if (existing.isArchived) throw new Error("Archived transactions must be restored before editing.");

  const accountId = input.accountId ?? existing.accountId;
  await assertAccountOwnership(accountId, profile.id);
  if (existing.ownerProfileId && existing.ownerProfileId !== profile.id) {
    throw new Error("You can view this transaction, but only the account owner can edit it.");
  }

  const nextType = input.type
    ? uiTypeToDb(input.type)
    : (existing.dbType as TransactionTypeDb);
  if (isSecureTransactionType(nextType)) {
    throw new Error("This transaction type cannot be assigned manually.");
  }

  const amountOriginal = input.amount
    ? toDbMoney(input.amount)
    : toDbMoney(existing.amount);
  const currency = input.currency ?? existing.currency;
  const isUsd = currency === "USD";
  const exchangeRate = isUsd
    ? toDbMoney(input.exchangeRate ?? existing.exchangeRate ?? 0)
    : 1;
  const amountPkr = isUsd
    ? toDbMoney(multiplyMoney(amountOriginal, exchangeRate))
    : amountOriginal;

  const supabase = await createClient();
  const { error } = await supabase
    .from("transactions")
    .update({
      account_id: accountId,
      type: nextType,
      category_id: input.categoryId === undefined ? undefined : input.categoryId || null,
      income_source_id:
        input.incomeSourceId === undefined ? undefined : input.incomeSourceId || null,
      amount_original: amountOriginal,
      currency_original: currency,
      exchange_rate: isUsd ? exchangeRate : 1,
      amount_pkr: amountPkr,
      exchange_rate_is_manual: isUsd ? Boolean(input.exchangeRateIsManual ?? true) : false,
      description: input.description ?? existing.description ?? existing.name,
      notes: input.notes === undefined ? undefined : input.notes ?? null,
      transaction_date: input.date ?? existing.date,
      status: input.status ? uiStatusToDb(input.status) : undefined,
      classification: input.classification ?? existing.classification,
      updated_by: profile.id,
    })
    .eq("id", input.transactionId);

  if (error) throw new Error(mapDatabaseError(error));
  revalidateFinancePaths(accountId);
  return { ok: true as const };
}

export async function archiveTransactionAction(transactionId: string) {
  const profile = await requireCurrentProfile();
  const existing = await getTransactionById(transactionId);
  if (!existing) throw new Error("Transaction not found.");
  if (existing.ownerProfileId !== profile.id) {
    throw new Error("You can view this transaction, but only the account owner can archive it.");
  }
  if (existing.isTransferLinked) {
    throw new Error("Linked transfers cannot be archived as individual transactions.");
  }
  if (existing.isAdjustmentLinked) {
    throw new Error("Balance corrections cannot be edited or archived. Create a new reconciliation to correct the balance.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("archive_transaction", {
    p_transaction_id: transactionId,
  });

  if (error) throw new Error(mapDatabaseError(error));
  revalidateFinancePaths(existing.accountId);
  return { ok: true as const };
}

export async function restoreTransactionAction(transactionId: string) {
  const profile = await requireCurrentProfile();
  const existing = await getTransactionById(transactionId);
  if (!existing) throw new Error("Transaction not found.");
  if (existing.ownerProfileId !== profile.id) {
    throw new Error("You can view this transaction, but only the account owner can restore it.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("restore_transaction", {
    p_transaction_id: transactionId,
  });

  if (error) throw new Error(mapDatabaseError(error));
  revalidateFinancePaths(existing.accountId);
  return { ok: true as const };
}
