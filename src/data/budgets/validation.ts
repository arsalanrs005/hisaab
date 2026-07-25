import { z } from "zod";

export const upsertBudgetCategorySchema = z.object({
  categoryId: z.string().uuid(),
  budgetedAmount: z.string().min(1),
  scope: z.enum(["personal", "shared", "business"]).default("shared"),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
});

export const updateBudgetAssumptionsSchema = z.object({
  comfortableSavingsRate: z.coerce.number().min(0).max(100).optional(),
  balancedSavingsRate: z.coerce.number().min(0).max(100).optional(),
  aggressiveSavingsRate: z.coerce.number().min(0).max(100).optional(),
  budgetWarningThreshold: z.coerce.number().min(0).max(100).optional(),
  budgetExceededThreshold: z.coerce.number().min(0).max(100).optional(),
});

export type UpsertBudgetCategoryInput = z.infer<typeof upsertBudgetCategorySchema>;
