import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile } from "@/data/profiles/queries";
import { requireCurrentWorkspace } from "@/data/workspaces/queries";
import { getActiveCategories } from "@/data/categories/queries";
import { parseMoney } from "@/lib/money";
import type { BudgetPageData, BudgetCategoryRow } from "@/data/budgets/types";

export const dynamic = "force-dynamic";

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export async function getBudgetPageData(year?: number, month?: number): Promise<BudgetPageData> {
  await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth() + 1;

  const supabase = await createClient();
  const categories = await getActiveCategories();
  const prevMonth = m === 1 ? 12 : m - 1;
  const prevYear = m === 1 ? y - 1 : y;

  const [currentRes, prevRes] = await Promise.all([
    supabase.from("monthly_budget_usage").select("*").eq("year", y).eq("month", m),
    supabase.from("monthly_budget_usage").select("*").eq("year", prevYear).eq("month", prevMonth),
  ]);

  if (currentRes.error) throw new Error("Unable to load budget.");

  const prevByCategory = new Map(
    (prevRes.data ?? []).map((row) => [row.category_id, parseMoney(row.spent_amount ?? 0)])
  );
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const mapped: BudgetCategoryRow[] = (currentRes.data ?? [])
    .filter((row) => row.category_id && categoryMap.has(row.category_id))
    .map((row) => ({
      categoryId: row.category_id!,
      categoryName: categoryMap.get(row.category_id!) ?? "Unknown",
      budgeted: parseMoney(row.budgeted_amount ?? 0),
      spent: parseMoney(row.spent_amount ?? 0),
      previousMonthSpent: prevByCategory.get(row.category_id!) ?? 0,
    }));

  const budgeted = mapped.reduce((s, c) => s + c.budgeted, 0);
  const spent = mapped.reduce((s, c) => s + c.spent, 0);

  return {
    id: `budget-${monthKey(y, m)}`,
    month: monthKey(y, m),
    categories: mapped,
    budgeted,
    spent,
    remaining: budgeted - spent,
  };
}

export function getBudgetUsagePercent(budgeted: number, spent: number): number {
  if (budgeted === 0) return 0;
  return Math.round((spent / budgeted) * 100);
}
