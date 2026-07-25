import { z } from "zod";

export const createTransferSchema = z
  .object({
    sourceAccountId: z.string().uuid(),
    destinationAccountId: z.string().uuid(),
    amount: z.string().min(1, "Amount is required"),
    currency: z.enum(["PKR", "USD"]),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes: z.string().max(2000).optional(),
    exchangeRate: z.string().optional(),
    exchangeRateIsManual: z.boolean().optional(),
    idempotencyKey: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.sourceAccountId === data.destinationAccountId) {
      ctx.addIssue({
        code: "custom",
        message: "Source and destination must differ",
        path: ["destinationAccountId"],
      });
    }
    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      ctx.addIssue({ code: "custom", message: "Amount must be greater than zero", path: ["amount"] });
    }
    if (data.currency === "USD") {
      const rate = Number(data.exchangeRate);
      if (!Number.isFinite(rate) || rate <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "Exchange rate is required for USD transfers",
          path: ["exchangeRate"],
        });
      }
    }
  });

export type CreateTransferInput = z.infer<typeof createTransferSchema>;

export const transferFilterSchema = z.object({
  search: z.string().optional(),
  sourceAccountId: z.string().uuid().optional(),
  destinationAccountId: z.string().uuid().optional(),
  initiatorProfileId: z.string().uuid().optional(),
  currency: z.enum(["PKR", "USD"]).optional(),
  status: z.string().optional(),
  sharedContributionOnly: z.coerce.boolean().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  sort: z.enum(["date_desc", "date_asc", "amount_desc", "amount_asc"]).optional().default("date_desc"),
});

export type TransferFilterInput = z.infer<typeof transferFilterSchema>;

export const transferPreviewSchema = createTransferSchema;

export type TransferPreviewInput = z.infer<typeof transferPreviewSchema>;
