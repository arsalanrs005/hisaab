import { z } from "zod";

export const reconcileAccountSchema = z.object({
  accountId: z.string().uuid(),
  actualBalance: z.string().min(1, "Actual balance is required"),
  reason: z.string().trim().min(3, "Please provide a reconciliation reason").max(2000),
  reconciledAt: z.string().optional(),
});

export type ReconcileAccountInput = z.infer<typeof reconcileAccountSchema>;

export const reconciliationFilterSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export type ReconciliationFilterInput = z.infer<typeof reconciliationFilterSchema>;
