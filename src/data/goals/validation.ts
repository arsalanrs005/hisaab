import { z } from "zod";

export const createGoalSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  targetAmount: z.string().min(1, "Target amount is required"),
  monthlyTarget: z.string().optional(),
  ownershipType: z.enum(["personal", "shared", "business"]),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  targetDate: z.string().optional(),
  fundingAccountId: z.string().uuid().optional(),
  description: z.string().optional(),
});

export const addGoalContributionSchema = z.object({
  goalId: z.string().uuid(),
  amount: z.string().min(1, "Amount is required"),
  accountId: z.string().uuid().optional(),
  contributionDate: z.string().optional(),
  notes: z.string().optional(),
  contributionType: z.enum(["deposit", "withdrawal", "adjustment"]).default("deposit"),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type AddGoalContributionInput = z.infer<typeof addGoalContributionSchema>;

function priorityToDb(priority: "high" | "medium" | "low"): number {
  if (priority === "high") return 1;
  if (priority === "medium") return 3;
  return 5;
}

export { priorityToDb };
