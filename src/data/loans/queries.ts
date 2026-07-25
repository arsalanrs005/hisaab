import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile, getAllProfiles } from "@/data/profiles/queries";
import { requireCurrentWorkspace } from "@/data/workspaces/queries";
import { mapLoanToUi, loanProgressPercent } from "@/data/loans/mappers";
import type { Loan, LoanPayment } from "@/types";
import type { Tables } from "@/types/database";

export const dynamic = "force-dynamic";

export async function getLoans(): Promise<Loan[]> {
  await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const profiles = await getAllProfiles();
  const supabase = await createClient();

  const [loansRes, progressRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("loans")
      .select("*")
      .eq("workspace_id", workspace.workspaceId)
      .eq("status", "active")
      .is("archived_at", null)
      .order("name"),
    supabase.from("loan_progress").select("*"),
  ]);

  if (loansRes.error) throw new Error("Unable to load loans.");

  const progressByLoan = new Map(
    (progressRes.data ?? []).map((row) => [row.loan_id, row])
  );

  return (loansRes.data ?? []).map((row: Tables<"loans">) =>
    mapLoanToUi(row, progressByLoan.get(row.id), profiles)
  );
}

export async function getLoanPayments(loanId?: string): Promise<LoanPayment[]> {
  await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("loan_payments")
    .select("*")
    .eq("workspace_id", workspace.workspaceId)
    .order("payment_date", { ascending: false });

  if (loanId) query = query.eq("loan_id", loanId);

  const { data, error } = await query;
  if (error) throw new Error("Unable to load loan payments.");

  return (data ?? []).map((row: Tables<"loan_payments">) => ({
    id: row.id,
    loanId: row.loan_id,
    amount: Number(row.amount),
    date: row.payment_date,
    accountId: "",
    principal: Number(row.principal_amount ?? row.amount),
    interest: Number(row.markup_amount ?? 0),
  }));
}

export async function getLoansPageData() {
  const loans = await getLoans();
  const payments = await getLoanPayments();
  const remainingTotal = loans.reduce((s, l) => s + l.remainingBalance, 0);
  const monthlyTotal = loans.reduce((s, l) => s + l.monthlyInstallment, 0);
  return { loans, payments, remainingTotal, monthlyTotal };
}

export { loanProgressPercent };
