import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  eyebrow?: string;
}

export function PageHeader({ title, description, children, className, eyebrow }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-foreground-faint">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-[28px] font-semibold leading-[34px] tracking-tight text-foreground sm:text-[30px]">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-[22px] text-foreground-muted">{description}</p>
        ) : null}
      </div>
      {children ? (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--glass-border)] bg-[var(--surface)] px-6 py-14 text-center backdrop-blur-[var(--glass-blur)]",
        className
      )}
    >
      {Icon ? (
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-background-subtle text-foreground-muted">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      ) : null}
      <h3 className="text-base font-semibold leading-6 text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm leading-[22px] text-foreground-muted">{description}</p>
      ) : null}
      {actionLabel && onAction ? (
        <Button className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-7", className)} aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[108px] animate-pulse rounded-lg border border-border bg-muted/60" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-72 animate-pulse rounded-lg border border-border bg-muted/60 lg:col-span-2" />
        <div className="h-72 animate-pulse rounded-lg border border-border bg-muted/60" />
      </div>
    </div>
  );
}

interface BudgetProgressProps {
  label: string;
  budgeted: number;
  spent: number;
  previousMonthSpent?: number;
  hidden?: boolean;
}

export function BudgetProgress({
  label,
  budgeted,
  spent,
  previousMonthSpent,
  hidden,
}: BudgetProgressProps) {
  const pct = budgeted === 0 ? 0 : Math.round((spent / budgeted) * 100);
  const over = pct >= 100;
  const warn = pct >= 80 && pct < 100;
  const remaining = budgeted - spent;
  const vsPrev =
    previousMonthSpent !== undefined && previousMonthSpent > 0
      ? Math.round(((spent - previousMonthSpent) / previousMonthSpent) * 100)
      : null;

  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-[var(--shadow-xs)]">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-0.5 text-xs text-foreground-muted">
            {hidden ? "••••" : `PKR ${spent.toLocaleString("en-PK")}`} of{" "}
            {hidden ? "••••" : `PKR ${budgeted.toLocaleString("en-PK")}`}
          </p>
        </div>
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            over && "text-danger",
            warn && "text-warning",
            !over && !warn && "text-foreground-secondary"
          )}
        >
          {pct}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-border-subtle">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-[var(--duration-normal)]",
            over ? "bg-danger" : warn ? "bg-warning" : "bg-primary"
          )}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <div className="mt-2.5 flex justify-between text-xs text-foreground-muted">
        <span>
          Remaining{" "}
          <span className="tabular-nums text-foreground-secondary">
            {hidden ? "••••" : `PKR ${remaining.toLocaleString("en-PK")}`}
          </span>
        </span>
        {vsPrev !== null ? (
          <span className={vsPrev > 0 ? "text-danger" : "text-success"}>
            {vsPrev > 0 ? "+" : ""}
            {vsPrev}% vs last month
          </span>
        ) : null}
      </div>
    </div>
  );
}
