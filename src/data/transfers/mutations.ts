"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile } from "@/data/profiles/queries";
import { mapDatabaseError } from "@/data/errors";
import { createTransferSchema, type CreateTransferInput } from "@/data/transfers/validation";
import { multiplyMoney, toDbMoney, parseMoney } from "@/lib/money";
import {
  getTransferFormData,
  getTransferPreview,
  getTransferById,
} from "@/data/transfers/queries";
import type { TransferPreviewInput } from "@/data/transfers/validation";

export async function getTransferFormDataAction() {
  return getTransferFormData();
}

export async function getTransferPreviewAction(raw: TransferPreviewInput) {
  return getTransferPreview(raw);
}

export async function getTransferByIdAction(transferId: string) {
  return getTransferById(transferId);
}

function revalidateTransferPaths(sourceId: string, destinationId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath("/transactions");
  revalidatePath("/transfers");
  revalidatePath("/notifications");
  revalidatePath("/activity");
  revalidatePath(`/accounts/${sourceId}`);
  revalidatePath(`/accounts/${destinationId}`);
}

export async function createTransferAction(raw: CreateTransferInput) {
  const profile = await requireCurrentProfile();
  const input = createTransferSchema.parse(raw);

  const supabase = await createClient();
  const { data: source } = await supabase
    .from("accounts")
    .select("owner_profile_id, is_active")
    .eq("id", input.sourceAccountId)
    .maybeSingle();

  if (!source || source.owner_profile_id !== profile.id) {
    throw new Error("You can only transfer from accounts you own.");
  }
  if (!source.is_active) throw new Error("Source account is inactive.");

  const isUsd = input.currency === "USD";
  const amountOriginal = toDbMoney(input.amount);
  const exchangeRate = isUsd ? toDbMoney(input.exchangeRate ?? 0) : 1;
  const amountPkr = isUsd
    ? toDbMoney(multiplyMoney(amountOriginal, exchangeRate))
    : amountOriginal;

  const { data, error } = await supabase.rpc("create_account_transfer", {
    p_source_account_id: input.sourceAccountId,
    p_destination_account_id: input.destinationAccountId,
    p_amount_original: amountOriginal,
    p_currency: input.currency,
    p_exchange_rate: exchangeRate,
    p_amount_pkr: amountPkr,
    p_transaction_date: input.date,
    p_notes: input.notes ?? null,
    p_idempotency_key: input.idempotencyKey ?? null,
  });

  if (error) {
    const message = mapDatabaseError(error);
    if (message.includes("enough")) {
      throw new Error("This account does not have enough completed funds for this transfer.");
    }
    throw new Error(message);
  }

  const result = data as {
    transfer_id: string;
    deduplicated?: boolean;
  };

  revalidateTransferPaths(input.sourceAccountId, input.destinationAccountId);
  return { ok: true as const, transferId: result.transfer_id, deduplicated: Boolean(result.deduplicated) };
}

const openingAllocationSchema = z.object({
  accountId: z.string().uuid(),
  allocations: z.array(
    z.object({
      contributorProfileId: z.string().uuid(),
      amountPkr: z.string().min(1),
      notes: z.string().max(500).optional(),
    })
  ),
});

export type OpeningAllocationInput = z.infer<typeof openingAllocationSchema>;

export async function allocateOpeningContributionsAction(raw: OpeningAllocationInput) {
  await requireCurrentProfile();
  const input = openingAllocationSchema.parse(raw);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("allocate_opening_contributions", {
    p_account_id: input.accountId,
    p_allocations: input.allocations.map((row) => ({
      contributor_profile_id: row.contributorProfileId,
      amount_pkr: toDbMoney(row.amountPkr),
      notes: row.notes ?? "Opening balance allocation",
    })),
  });

  if (error) throw new Error(mapDatabaseError(error));

  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath(`/accounts/${input.accountId}`);
  revalidatePath("/activity");

  return { ok: true as const, result: data };
}
