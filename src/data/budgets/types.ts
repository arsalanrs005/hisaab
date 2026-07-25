export interface BudgetCategoryRow {
  categoryId: string;
  categoryName: string;
  budgeted: number;
  spent: number;
  previousMonthSpent: number;
}

export interface BudgetPageData {
  id: string;
  month: string;
  categories: BudgetCategoryRow[];
  budgeted: number;
  spent: number;
  remaining: number;
}
