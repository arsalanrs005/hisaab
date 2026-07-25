import type { Goal, GoalContribution } from "@/types";

export const goals: Goal[] = [
  {
    id: "goal-car-loan",
    name: "Existing car loan",
    targetAmount: 1200000,
    savedAmount: 780000,
    monthlyContribution: 85000,
    ownerId: "arsalan",
    visibility: "shared",
    priority: "high",
    estimatedCompletion: "2026-12-15",
    fundingAccountIds: ["acc-arsalan-meezan"],
    relatedNoteIds: ["note-loan-1"],
    color: "#991b1b",
  },
  {
    id: "goal-house",
    name: "New house advance",
    targetAmount: 5000000,
    savedAmount: 1250000,
    monthlyContribution: 200000,
    ownerId: "arsalan",
    visibility: "shared",
    priority: "high",
    estimatedCompletion: "2028-03-01",
    fundingAccountIds: ["acc-arsalan-meezan"],
    relatedNoteIds: ["note-house-1"],
    color: "#1e40af",
  },
  {
    id: "goal-emergency",
    name: "Emergency fund",
    targetAmount: 1500000,
    savedAmount: 520000,
    monthlyContribution: 100000,
    ownerId: "arsalan",
    visibility: "shared",
    priority: "high",
    estimatedCompletion: "2027-05-01",
    fundingAccountIds: ["acc-arsalan-meezan", "acc-ali-hbl"],
    relatedNoteIds: [],
    color: "#0f766e",
  },
  {
    id: "goal-elantra",
    name: "Elantra 2021",
    targetAmount: 3500000,
    savedAmount: 680000,
    monthlyContribution: 120000,
    ownerId: "ali",
    visibility: "shared",
    priority: "medium",
    estimatedCompletion: "2028-06-01",
    fundingAccountIds: ["acc-ali-hbl", "acc-arsalan-meezan"],
    relatedNoteIds: ["note-car-1"],
    color: "#4338ca",
  },
  {
    id: "goal-ops5ive",
    name: "Ops5ive reserve",
    targetAmount: 2000000,
    savedAmount: 410000,
    monthlyContribution: 150000,
    ownerId: "arsalan",
    visibility: "business",
    priority: "medium",
    estimatedCompletion: "2027-08-01",
    fundingAccountIds: ["acc-arsalan-meezan"],
    relatedNoteIds: ["note-ops-1"],
    color: "#115e59",
  },
];

export const goalContributions: GoalContribution[] = [
  {
    id: "gc-1",
    goalId: "goal-car-loan",
    contributorId: "arsalan",
    amount: 85000,
    date: "2026-07-18",
    accountId: "acc-arsalan-meezan",
    note: "Monthly installment",
  },
  {
    id: "gc-2",
    goalId: "goal-emergency",
    contributorId: "arsalan",
    amount: 50000,
    date: "2026-07-08",
    accountId: "acc-arsalan-hbl",
  },
  {
    id: "gc-3",
    goalId: "goal-emergency",
    contributorId: "ali",
    amount: 50000,
    date: "2026-07-05",
    accountId: "acc-ali-hbl",
  },
  {
    id: "gc-4",
    goalId: "goal-elantra",
    contributorId: "ali",
    amount: 120000,
    date: "2026-07-01",
    accountId: "acc-ali-hbl",
  },
  {
    id: "gc-5",
    goalId: "goal-house",
    contributorId: "arsalan",
    amount: 150000,
    date: "2026-07-01",
    accountId: "acc-arsalan-meezan",
  },
  {
    id: "gc-6",
    goalId: "goal-house",
    contributorId: "ali",
    amount: 50000,
    date: "2026-07-01",
    accountId: "acc-ali-hbl",
  },
  {
    id: "gc-7",
    goalId: "goal-ops5ive",
    contributorId: "arsalan",
    amount: 100000,
    date: "2026-07-01",
    accountId: "acc-arsalan-meezan",
  },
  {
    id: "gc-8",
    goalId: "goal-ops5ive",
    contributorId: "ali",
    amount: 50000,
    date: "2026-07-22",
    accountId: "acc-arsalan-meezan",
  },
];

export function getGoal(id: string): Goal | undefined {
  return goals.find((g) => g.id === id);
}

export function getGoalProgress(goal: Goal): number {
  return Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100));
}

export function getTotalSavedAcrossGoals(): number {
  return goals.reduce((sum, g) => sum + g.savedAmount, 0);
}
