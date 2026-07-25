import { z } from "zod";

export const createUpworkOpportunitySchema = z.object({
  title: z.string().trim().min(1).max(200),
  clientName: z.string().trim().min(1).max(120),
  status: z.enum(["sent", "responded", "interview", "offer", "won", "lost"]).default("sent"),
  connectsSpent: z.coerce.number().int().min(0).default(0),
  bidAmount: z.string().optional(),
  activityDate: z.string().optional(),
  followUpDate: z.string().optional(),
  revenue: z.string().optional(),
  notes: z.string().optional(),
});

export const createLinkedInProspectSchema = z.object({
  prospectName: z.string().trim().min(1).max(120),
  company: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(120),
  status: z
    .enum([
      "researched",
      "identified",
      "requested",
      "accepted",
      "conversation",
      "call",
      "proposal",
      "won",
      "lost",
    ])
    .default("researched"),
  activityDate: z.string().optional(),
  followUpDate: z.string().optional(),
  revenue: z.string().optional(),
  notes: z.string().optional(),
});

export const createSalesOpportunitySchema = z.object({
  title: z.string().trim().min(1).max(200),
  stage: z.string().trim().min(1).default("discovery"),
  expectedAmount: z.string().optional(),
  probability: z.coerce.number().int().min(0).max(100).optional(),
  expectedCloseDate: z.string().optional(),
  clientId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const createBusinessIncomeSchema = z.object({
  clientId: z.string().uuid().optional(),
  expectedAmount: z.string().optional(),
  receivedAmount: z.string().optional(),
  expectedDate: z.string().optional(),
  receivedDate: z.string().optional(),
  status: z.enum(["expected", "received", "partial"]).default("expected"),
  notes: z.string().optional(),
});

export const createBusinessExpenseSchema = z.object({
  name: z.string().trim().min(1).max(200),
  amountPkr: z.string().min(1),
  expenseDate: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  recurring: z.boolean().default(false),
});

export type CreateUpworkOpportunityInput = z.infer<typeof createUpworkOpportunitySchema>;
export type CreateLinkedInProspectInput = z.infer<typeof createLinkedInProspectSchema>;
export type CreateSalesOpportunityInput = z.infer<typeof createSalesOpportunitySchema>;
export type CreateBusinessIncomeInput = z.infer<typeof createBusinessIncomeSchema>;
export type CreateBusinessExpenseInput = z.infer<typeof createBusinessExpenseSchema>;
