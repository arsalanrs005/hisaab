import { z } from "zod";
import type { TransactionStatus, TransactionType } from "@/types";

const creatableTypes = [
  "income",
  "expense",
  "refund",
  "family_contribution",
  "loan_repayment",
  "loan_payment",
] as const satisfies readonly TransactionType[];

export const createTransactionSchema = z
  .object({
    accountId: z.string().uuid(),
    type: z.enum(creatableTypes),
    amount: z.string().min(1, "Amount is required"),
    currency: z.enum(["PKR", "USD"]),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    description: z.string().min(1).max(500),
    notes: z.string().max(2000).optional(),
    categoryId: z.string().uuid().optional().nullable(),
    incomeSourceId: z.string().uuid().optional().nullable(),
    status: z.enum(["cleared", "pending", "expected"]),
    classification: z.enum(["personal", "shared", "business"]),
    exchangeRate: z.string().optional(),
    exchangeRateIsManual: z.boolean().optional(),
    clientRequestId: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      ctx.addIssue({ code: "custom", message: "Amount must be greater than zero", path: ["amount"] });
    }
    if (data.currency === "USD") {
      const rate = Number(data.exchangeRate);
      if (!Number.isFinite(rate) || rate <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "Exchange rate is required for USD transactions",
          path: ["exchangeRate"],
        });
      }
    }
  });

export const updateTransactionSchema = z
  .object({
    transactionId: z.string().uuid(),
    accountId: z.string().uuid().optional(),
    type: z.enum(creatableTypes).optional(),
    amount: z.string().optional(),
    currency: z.enum(["PKR", "USD"]).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    description: z.string().min(1).max(500).optional(),
    notes: z.string().max(2000).optional(),
    categoryId: z.string().uuid().optional().nullable(),
    incomeSourceId: z.string().uuid().optional().nullable(),
    status: z.enum(["cleared", "pending", "expected"]).optional(),
    classification: z.enum(["personal", "shared", "business"]).optional(),
    exchangeRate: z.string().optional(),
    exchangeRateIsManual: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.amount !== undefined) {
      const amount = Number(data.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        ctx.addIssue({ code: "custom", message: "Amount must be greater than zero", path: ["amount"] });
      }
    }
    const currency = data.currency;
    if (currency === "USD" && data.exchangeRate !== undefined) {
      const rate = Number(data.exchangeRate);
      if (!Number.isFinite(rate) || rate <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "Exchange rate is required for USD transactions",
          path: ["exchangeRate"],
        });
      }
    }
  });

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export const transactionFilterSchema = z.object({
  search: z.string().optional(),
  accountId: z.string().uuid().optional(),
  ownerProfileId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  classification: z.string().optional(),
  currency: z.enum(["PKR", "USD"]).optional(),
  amountMin: z.coerce.number().optional(),
  amountMax: z.coerce.number().optional(),
  archived: z.enum(["active", "archived", "all"]).optional().default("active"),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  sort: z.enum(["date_desc", "date_asc", "amount_desc", "amount_asc"]).optional().default("date_desc"),
});

export type TransactionFilterInput = z.infer<typeof transactionFilterSchema>;
