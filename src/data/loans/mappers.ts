import type { Loan, UserId } from "@/types";
import type { ProfileSummary } from "@/data/profiles/helpers";
import { emailToLegacyUserId } from "@/lib/auth/approved-users";
import { parseMoney } from "@/lib/money";
import type { Tables, Views } from "@/types/database";

export function mapLoanToUi(
  loan: Tables<"loans">,
  progress: Views<"loan_progress"> | undefined,
  profiles: ProfileSummary[]
): Loan {
  const ownerProfile = profiles.find((p) => p.id === loan.owner_profile_id);
  const ownerId: UserId = ownerProfile
    ? emailToLegacyUserId(ownerProfile.email)
    : "arsalan";

  return {
    id: loan.id,
    name: loan.name,
    ownerId,
    originalAmount: parseMoney(loan.original_amount),
    remainingBalance: parseMoney(progress?.remaining_balance ?? loan.starting_remaining_balance),
    monthlyInstallment: parseMoney(loan.monthly_installment ?? 0),
    interestRate: Number(loan.interest_rate ?? 0),
    dueDay: loan.installment_due_day ?? 1,
    fundingAccountId: loan.funding_account_id ?? "",
    startDate: loan.start_date ?? "",
    expectedCompletion: loan.expected_end_date ?? "",
  };
}

export function loanProgressPercent(loan: Loan): number {
  if (loan.originalAmount <= 0) return 0;
  const paid = loan.originalAmount - loan.remainingBalance;
  return Math.min(100, Math.round((paid / loan.originalAmount) * 100));
}
