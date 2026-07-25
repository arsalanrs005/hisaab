import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencyAmount } from "@/components/finance/currency-amount";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  amount: number;
  hidden?: boolean;
  changeLabel?: string;
  changeTone?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
  className?: string;
  interactive?: boolean;
  /** When set, shows this instead of a currency amount (e.g. percentages). */
  displayValue?: string;
}

export function MetricCard({
  title,
  amount,
  hidden,
  changeLabel,
  changeTone = "neutral",
  icon: Icon,
  className,
  interactive = false,
  displayValue,
}: MetricCardProps) {
  return (
    <Card
      className={cn(
        "min-w-0 border-border bg-surface shadow-[var(--shadow-xs)]",
        interactive &&
          "transition-[box-shadow,background-color] duration-[var(--duration-normal)] ease-[var(--ease-out)] hover:bg-surface-hover hover:shadow-[var(--shadow-sm)]",
        className
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium leading-[18px] text-foreground-muted">{title}</p>
          {Icon ? (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background-subtle text-foreground-muted">
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </div>
          ) : null}
        </div>
        <div className="mt-3">
          {displayValue !== undefined ? (
            <p className="metric-value tabular-nums">{hidden ? "••••" : displayValue}</p>
          ) : (
            <CurrencyAmount amount={amount} hidden={hidden} size="lg" className="metric-value" />
          )}
        </div>
        {changeLabel ? (
          <p
            className={cn(
              "mt-2 text-xs leading-[18px]",
              changeTone === "positive" && "text-success",
              changeTone === "negative" && "text-danger",
              changeTone === "neutral" && "text-foreground-muted"
            )}
          >
            {changeLabel}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
