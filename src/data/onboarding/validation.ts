import { z } from "zod";

const accountSetupSchema = z.object({
  key: z.string(),
  name: z.string().min(1),
  bankName: z.string().min(1),
  openingBalance: z.string(),
  enabled: z.boolean(),
  isSharedSavings: z.boolean().optional(),
});

export const onboardingSubmitSchema = z.object({
  accounts: z.array(accountSetupSchema),
  incomeSources: z.array(
    z.object({
      name: z.string().min(1),
      currency: z.enum(["PKR", "USD"]).default("PKR"),
      expectedAmount: z.string().optional(),
      frequency: z.string().optional(),
      nextExpectedDate: z.string().optional(),
      isShared: z.boolean().optional(),
    })
  ),
  savingsMode: z.enum(["comfortable", "balanced", "aggressive", "custom"]),
  customSavingsRate: z.number().min(0).max(1).optional(),
  skipLoans: z.boolean().optional(),
  skipGoals: z.boolean().optional(),
});

export type OnboardingSubmitInput = z.infer<typeof onboardingSubmitSchema>;
