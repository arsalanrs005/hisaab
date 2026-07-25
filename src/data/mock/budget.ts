import type { Budget } from "@/types";

export const budget: Budget = {
  id: "budget-2026-07",
  month: "2026-07",
  categories: [
    { categoryId: "cat-food", budgeted: 80000, spent: 94500, previousMonthSpent: 80000 },
    { categoryId: "cat-fuel", budgeted: 40000, spent: 32000, previousMonthSpent: 38000 },
    { categoryId: "cat-subscriptions", budgeted: 8000, spent: 6400, previousMonthSpent: 6200 },
    { categoryId: "cat-university", budgeted: 45000, spent: 45000, previousMonthSpent: 45000 },
    { categoryId: "cat-shopping", budgeted: 30000, spent: 18500, previousMonthSpent: 42000 },
    { categoryId: "cat-family", budgeted: 50000, spent: 28000, previousMonthSpent: 35000 },
    { categoryId: "cat-business", budgeted: 100000, spent: 82000, previousMonthSpent: 75000 },
    { categoryId: "cat-transport", budgeted: 15000, spent: 8500, previousMonthSpent: 12000 },
    { categoryId: "cat-bills", budgeted: 60000, spent: 48000, previousMonthSpent: 55000 },
    { categoryId: "cat-entertainment", budgeted: 20000, spent: 12000, previousMonthSpent: 18000 },
    { categoryId: "cat-employee", budgeted: 150000, spent: 150000, previousMonthSpent: 150000 },
    { categoryId: "cat-loan", budgeted: 120000, spent: 120000, previousMonthSpent: 120000 },
    { categoryId: "cat-other", budgeted: 25000, spent: 9800, previousMonthSpent: 15000 },
  ],
};

export function getBudgetUsagePercent(budgeted: number, spent: number): number {
  if (budgeted === 0) return 0;
  return Math.round((spent / budgeted) * 100);
}

export function getBudgetTotals() {
  const budgeted = budget.categories.reduce((s, c) => s + c.budgeted, 0);
  const spent = budget.categories.reduce((s, c) => s + c.spent, 0);
  return { budgeted, spent, remaining: budgeted - spent };
}
