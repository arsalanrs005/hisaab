import { Calculator, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { FinancialInsight, SavingsPlan } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CurrencyAmount } from "@/components/finance/currency-amount";

interface InsightCardProps {
  insight: FinancialInsight;
  className?: string;
}

const severityStyles = {
  warning: "border-warning/30 bg-warning-subtle/40",
  positive: "border-success/30 bg-success-subtle/40",
  info: "border-primary/30 bg-primary-subtle/50",
} as const;

const severityIcon = {
  warning: "text-warning",
  positive: "text-success",
  info: "text-primary",
} as const;

export function InsightCard({ insight, className }: InsightCardProps) {
  return (
    <Card
      className={cn(
        "min-w-0 border shadow-[var(--shadow-xs)]",
        severityStyles[insight.severity],
        className
      )}
    >
      <CardContent className="flex gap-3 p-4">
        <div
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface/80",
            severityIcon[insight.severity]
          )}
        >
          <span className="h-2 w-2 rounded-full bg-current" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium leading-snug text-foreground">{insight.title}</p>
          <p className="text-xs leading-[18px] text-foreground-muted">{insight.detail}</p>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                <Calculator className="mr-1 h-3 w-3" />
                View calculation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Calculation</DialogTitle>
                <DialogDescription>{insight.title}</DialogDescription>
              </DialogHeader>
              <pre className="whitespace-pre-wrap rounded-md bg-background-subtle p-4 text-sm font-mono">
                {insight.formula}
              </pre>
            </DialogContent>
          </Dialog>
          {insight.href ? (
            <Link
              href={insight.href}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Open related view
              <ChevronRight className="h-3 w-3" />
            </Link>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

interface SavingsPlanPanelProps {
  plan: SavingsPlan;
  hidden?: boolean;
}

export function SavingsPlanPanel({ plan, hidden }: SavingsPlanPanelProps) {
  const ahead = plan.actualSavings >= plan.recommendedSavings;

  return (
    <Card className="border-primary/20 bg-primary-subtle/30 shadow-[var(--shadow-xs)]">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold capitalize text-foreground">{plan.mode} plan</h3>
            <p className="mt-1 text-xs leading-[18px] text-foreground-muted">{plan.explanation}</p>
          </div>
          <Badge variant={ahead ? "success" : "warning"}>{ahead ? "On track" : "Behind"}</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-foreground-muted">Recommended</p>
            <CurrencyAmount
              amount={plan.recommendedSavings}
              hidden={hidden}
              size="md"
              className="font-semibold"
            />
          </div>
          <div>
            <p className="text-xs text-foreground-muted">Saved this month</p>
            <CurrencyAmount
              amount={plan.actualSavings}
              hidden={hidden}
              size="md"
              className="font-semibold"
            />
          </div>
          <div>
            <p className="text-xs text-foreground-muted">Remaining</p>
            <CurrencyAmount amount={plan.remaining} hidden={hidden} size="md" className="font-semibold" />
          </div>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Calculator className="mr-1.5 h-3.5 w-3.5" />
              View calculation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Savings plan calculation</DialogTitle>
              <DialogDescription className="capitalize">{plan.mode} mode formula</DialogDescription>
            </DialogHeader>
            <pre className="whitespace-pre-wrap rounded-md bg-background-subtle p-4 text-sm font-mono">
              {plan.formula}
            </pre>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
