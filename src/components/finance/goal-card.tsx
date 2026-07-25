import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CurrencyAmount } from "@/components/finance/currency-amount";
import type { Goal } from "@/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface GoalCardProps {
  goal: Goal;
  progress?: number;
  ownerName?: string;
  hidden?: boolean;
  className?: string;
}

export function GoalCard({ goal, progress: progressProp, ownerName, hidden, className }: GoalCardProps) {
  const progress =
    progressProp ??
    (goal.targetAmount > 0
      ? Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100))
      : 0);

  return (
    <Card className={cn("min-w-0 border-border bg-surface shadow-[var(--shadow-xs)]", className)}>
      <CardHeader className="space-y-2 p-5 pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold">
            <Link href={`/goals/${goal.id}`} className="hover:text-primary">
              {goal.name}
            </Link>
          </CardTitle>
          <Badge
            variant={
              goal.priority === "high"
                ? "danger"
                : goal.priority === "medium"
                  ? "warning"
                  : "secondary"
            }
            className="capitalize"
          >
            {goal.priority} priority
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="capitalize">
            {goal.visibility}
          </Badge>
          <Badge variant="secondary">{ownerName ?? goal.ownerId}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Saved</p>
            <CurrencyAmount amount={goal.savedAmount} hidden={hidden} size="md" className="text-lg font-semibold" />
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Target</p>
            <CurrencyAmount amount={goal.targetAmount} hidden={hidden} size="sm" muted />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-foreground-muted">
            <span className="tabular-nums">{progress}% complete</span>
            <span>Est. {formatDate(goal.estimatedCompletion)}</span>
          </div>
          <Progress value={progress} className="h-2.5" />
        </div>
        <p className="text-xs text-muted-foreground">
          Monthly ·{" "}
          <CurrencyAmount
            amount={goal.monthlyContribution}
            hidden={hidden}
            size="sm"
            className="font-medium text-foreground"
          />
        </p>
      </CardContent>
    </Card>
  );
}
