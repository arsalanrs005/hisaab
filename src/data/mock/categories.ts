import type { Category, IncomeSource, ExchangeRate } from "@/types";

export const categories: Category[] = [
  { id: "cat-food", name: "Food", type: "expense", color: "#c2410c", icon: "utensils" },
  { id: "cat-fuel", name: "Fuel", type: "expense", color: "#b45309", icon: "fuel" },
  { id: "cat-subscriptions", name: "Subscriptions", type: "expense", color: "#7c3aed", icon: "repeat" },
  { id: "cat-university", name: "University", type: "expense", color: "#1d4ed8", icon: "graduation-cap" },
  { id: "cat-shopping", name: "Shopping", type: "expense", color: "#be185d", icon: "shopping-bag" },
  { id: "cat-family", name: "Family", type: "expense", color: "#0f766e", icon: "users" },
  { id: "cat-business", name: "Business", type: "expense", color: "#3730a3", icon: "briefcase" },
  { id: "cat-transport", name: "Transport", type: "expense", color: "#0369a1", icon: "car" },
  { id: "cat-bills", name: "Bills", type: "expense", color: "#4b5563", icon: "receipt" },
  { id: "cat-entertainment", name: "Entertainment", type: "expense", color: "#a21caf", icon: "film" },
  { id: "cat-employee", name: "Employee payment", type: "expense", color: "#115e59", icon: "user-check" },
  { id: "cat-loan", name: "Loan payment", type: "expense", color: "#991b1b", icon: "landmark" },
  { id: "cat-other", name: "Other", type: "expense", color: "#6b7280", icon: "more-horizontal" },
  { id: "cat-salary", name: "Salary", type: "income", color: "#15803d", icon: "banknote" },
  { id: "cat-freelance", name: "Freelance", type: "income", color: "#047857", icon: "laptop" },
  { id: "cat-client", name: "Client income", type: "income", color: "#0f766e", icon: "handshake" },
  { id: "cat-transfer", name: "Transfer", type: "transfer", color: "#4338ca", icon: "arrow-left-right" },
  { id: "cat-adjustment", name: "Balance adjustment", type: "other", color: "#78716c", icon: "scale" },
  { id: "cat-savings", name: "Savings", type: "other", color: "#1e40af", icon: "piggy-bank" },
  { id: "cat-contribution", name: "Family contribution", type: "other", color: "#0e7490", icon: "heart-handshake" },
];

export const incomeSources: IncomeSource[] = [
  {
    id: "inc-arsalan-ops5ive",
    name: "Ops5ive retainer",
    ownerId: "arsalan",
    expectedMonthly: 850000,
    currency: "PKR",
    active: true,
  },
  {
    id: "inc-ali-upwork",
    name: "Upwork projects",
    ownerId: "ali",
    expectedMonthly: 420000,
    currency: "PKR",
    active: true,
  },
  {
    id: "inc-arsalan-client",
    name: "QuestRock project",
    ownerId: "arsalan",
    expectedMonthly: 280000,
    currency: "PKR",
    active: true,
  },
  {
    id: "inc-shared-family",
    name: "Family support",
    ownerId: "arsalan",
    expectedMonthly: 50000,
    currency: "PKR",
    active: false,
  },
];

export const mockExchangeRate: ExchangeRate = {
  from: "USD",
  to: "PKR",
  rate: 278.5,
  source: "Mock FX (manual)",
  timestamp: "2026-07-24T08:00:00Z",
};

export function getCategory(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}
