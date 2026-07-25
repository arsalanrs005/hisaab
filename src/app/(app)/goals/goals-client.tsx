"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { MetricCard } from "@/components/finance/metric-card";
import { GoalCard } from "@/components/finance/goal-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GoalDialog } from "@/components/forms/goal-dialog";
import { useApp } from "@/providers/app-provider";
import type { Goal, GoalVisibility } from "@/types";
import type { AccountWithMeta } from "@/data/accounts/mappers";
import { Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoalsClientProps {
  goals: Goal[];
  totalSaved: number;
  monthlyTotal: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  ownerNames: Record<string, string>;
  accounts: AccountWithMeta[];
}

export function GoalsClient({
  goals,
  totalSaved,
  monthlyTotal,
  highCount,
  mediumCount,
  lowCount,
  ownerNames,
  accounts,
}: GoalsClientProps) {
  const { hideBalances } = useApp();
  const [visibility, setVisibility] = useState<"all" | GoalVisibility>("all");
  const [priority, setPriority] = useState<"all" | "high" | "medium" | "low">("all");
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    return goals.filter((g) => {
      if (visibility !== "all" && g.visibility !== visibility) return false;
      if (priority !== "all" && g.priority !== priority) return false;
      return true;
    });
  }, [goals, visibility, priority]);

  const filters: Array<"all" | GoalVisibility> = ["all", "personal", "shared", "business"];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Savings & goals"
        description="Track personal, shared, and business funding targets with monthly contributions."
      >
        <Button onClick={() => setGoalDialogOpen(true)}>Add goal</Button>
      </PageHeader>

      <GoalDialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen} accounts={accounts} />

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <MetricCard title="Total saved across goals" amount={totalSaved} hidden={hideBalances} icon={Target} />
        <MetricCard title="Monthly contributions" amount={monthlyTotal} hidden={hideBalances} />
        <div className="rounded-[12px] border border-border bg-card p-5 shadow-[var(--shadow-sm)]">
          <p className="text-sm font-medium text-muted-foreground">Priority breakdown</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{highCount} high</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {mediumCount} medium · {lowCount} low
          </p>
        </div>
      </section>

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button key={f} type="button" onClick={() => setVisibility(f)}>
            <Badge variant={visibility === f ? "default" : "outline"} className={cn("cursor-pointer capitalize")}>
              {f}
            </Badge>
          </button>
        ))}
        {(["all", "high", "medium", "low"] as const).map((p) => (
          <button key={p} type="button" onClick={() => setPriority(p)}>
            <Badge variant={priority === p ? "secondary" : "outline"} className="cursor-pointer capitalize">
              {p === "all" ? "Any priority" : p}
            </Badge>
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            ownerName={ownerNames[goal.ownerId]}
            hidden={hideBalances}
          />
        ))}
      </div>
    </div>
  );
}
