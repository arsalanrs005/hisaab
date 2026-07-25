import { z } from "zod";

export const createLoanSchema = z.object({
  name: z.string().trim().min(1).max(120),
  originalAmount: z.string().min(1),
  monthlyInstallment: z.string().min(1),
  interestRate: z.string().optional(),
  dueDay: z.coerce.number().int().min(1).max(28).default(1),
  fundingAccountId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  notes: z.string().optional(),
});

export const addLoanPaymentSchema = z.object({
  loanId: z.string().uuid(),
  amount: z.string().min(1),
  paymentDate: z.string().optional(),
  accountId: z.string().uuid().optional(),
  principalAmount: z.string().optional(),
  markupAmount: z.string().optional(),
});

export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type AddLoanPaymentInput = z.infer<typeof addLoanPaymentSchema>;
