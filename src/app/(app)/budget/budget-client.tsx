"use client";

import { useState } from "react";
import { PageHeader, BudgetProgress } from "@/components/layout/page-header";
import { MetricCard } from "@/components/finance/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BudgetEditDialog } from "@/components/forms/budget-edit-dialog";
import { useApp } from "@/providers/app-provider";
import type { BudgetPageData } from "@/data/budgets/types";
import { formatMonthYear } from "@/lib/format";

export function BudgetClient({
  data,
  assumptions,
}: {
  data: BudgetPageData;
  assumptions: {
    comfortableSavingsRate: number;
    balancedSavingsRate: number;
    aggressiveSavingsRate: number;
    budgetWarningThreshold: number;
    budgetExceededThreshold: number;
  };
}) {
  const { hideBalances } = useApp();
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  const overBudget = data.categories.filter((c) => c.spent >= c.budgeted && c.budgeted > 0);
  const nearLimit = data.categories.filter((c) => {
    const pct = c.budgeted === 0 ? 0 : (c.spent / c.budgeted) * 100;
    return pct >= 80 && pct < 100;
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Budget"
        description={`Monthly workspace for ${formatMonthYear(new Date(data.month + "-01"))}. Warnings trigger at 80% and 100%.`}
      >
        <Button variant="outline" onClick={() => setAssumptionsOpen(true)}>
          Edit assumptions
        </Button>
      </PageHeader>

      <BudgetEditDialog
        open={assumptionsOpen}
        onOpenChange={setAssumptionsOpen}
        assumptions={assumptions}
      />

      <section className="mb-4 grid gap-3 sm:grid-cols-3">
        <MetricCard title="Budgeted" amount={data.budgeted} hidden={hideBalances} />
        <MetricCard title="Spent" amount={data.spent} hidden={hideBalances} />
        <MetricCard title="Remaining" amount={data.remaining} hidden={hideBalances} />
      </section>

      <div className="mb-6 flex flex-wrap gap-2">
        {overBudget.length > 0 ? (
          <Badge variant="danger">{overBudget.length} at or over 100%</Badge>
        ) : null}
        {nearLimit.length > 0 ? (
          <Badge variant="warning">{nearLimit.length} at or over 80%</Badge>
        ) : null}
        {overBudget.length === 0 && nearLimit.length === 0 ? (
          <Badge variant="success">All categories under 80%</Badge>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {data.categories.map((item) => (
          <BudgetProgress
            key={item.categoryId}
            label={item.categoryName}
            budgeted={item.budgeted}
            spent={item.spent}
            previousMonthSpent={item.previousMonthSpent}
            hidden={hideBalances}
          />
        ))}
      </div>
    </div>
  );
}
