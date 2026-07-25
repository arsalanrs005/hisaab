"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile } from "@/data/profiles/queries";
import { requireCurrentWorkspace } from "@/data/workspaces/queries";
import { mapDatabaseError } from "@/data/errors";
import { parseMoney, toDbMoney } from "@/lib/money";
import {
  addLoanPaymentSchema,
  createLoanSchema,
  type AddLoanPaymentInput,
  type CreateLoanInput,
} from "@/data/loans/validation";

function revalidateLoanPaths() {
  revalidatePath("/loans");
  revalidatePath("/dashboard");
}

export async function createLoanAction(raw: CreateLoanInput) {
  const profile = await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const input = createLoanSchema.parse(raw);
  const original = parseMoney(input.originalAmount);
  const installment = parseMoney(input.monthlyInstallment);
  if (original <= 0 || installment <= 0) {
    throw new Error("Loan amounts must be greater than zero.");
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("loans")
    .insert({
      workspace_id: workspace.workspaceId,
      name: input.name,
      owner_profile_id: profile.id,
      original_amount: toDbMoney(original),
      starting_remaining_balance: toDbMoney(original),
      interest_rate: input.interestRate ? parseMoney(input.interestRate) : 0,
      markup_type: "flat",
      monthly_installment: toDbMoney(installment),
      installment_due_day: input.dueDay,
      funding_account_id: input.fundingAccountId ?? null,
      start_date: input.startDate ?? new Date().toISOString().slice(0, 10),
      status: "active",
      notes: input.notes ?? null,
      created_by: profile.id,
      updated_by: profile.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(mapDatabaseError(error));
  revalidateLoanPaths();
  return { ok: true as const, loanId: data.id };
}

export async function addLoanPaymentAction(raw: AddLoanPaymentInput) {
  const profile = await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const input = addLoanPaymentSchema.parse(raw);
  const amount = parseMoney(input.amount);
  if (amount <= 0) throw new Error("Payment amount must be greater than zero.");

  const supabase = await createClient();
  const { data: loan, error: loanError } = await (supabase as any)
    .from("loans")
    .select("id, owner_profile_id")
    .eq("id", input.loanId)
    .eq("workspace_id", workspace.workspaceId)
    .is("archived_at", null)
    .maybeSingle();

  if (loanError || !loan) throw new Error("Loan not found.");
  if (loan.owner_profile_id !== profile.id) {
    throw new Error("Only the loan owner can record payments.");
  }

  const principal = input.principalAmount ? parseMoney(input.principalAmount) : amount;
  const markup = input.markupAmount ? parseMoney(input.markupAmount) : 0;

  const { data: progress } = await supabase
    .from("loan_progress")
    .select("remaining_balance")
    .eq("loan_id", input.loanId)
    .maybeSingle();

  const remainingAfter = Math.max(0, parseMoney(progress?.remaining_balance ?? 0) - principal);

  const { data, error } = await (supabase as any)
    .from("loan_payments")
    .insert({
      workspace_id: workspace.workspaceId,
      loan_id: input.loanId,
      amount: toDbMoney(amount),
      principal_amount: toDbMoney(principal),
      markup_amount: toDbMoney(markup),
      payment_date: input.paymentDate ?? new Date().toISOString().slice(0, 10),
      remaining_balance_after: toDbMoney(remainingAfter),
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(mapDatabaseError(error));
  revalidateLoanPaths();
  return { ok: true as const, paymentId: data.id };
}
