import { CurrencyAmount } from "@/components/finance/currency-amount";
import type { Contribution } from "@/types";

interface ContributionBreakdownProps {
  contributions: Contribution[];
  contributorNames?: Record<string, string>;
  hidden?: boolean;
}

export function ContributionBreakdown({
  contributions,
  contributorNames = {},
  hidden,
}: ContributionBreakdownProps) {
  const byUser = contributions.reduce<Record<string, number>>((acc, c) => {
    acc[c.contributorId] = (acc[c.contributorId] ?? 0) + c.amount;
    return acc;
  }, {});

  return (
    <div className="rounded-[10px] border border-border bg-muted/40 p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        Pooled contributions
      </p>
      <div className="space-y-1.5">
        {Object.entries(byUser).map(([userId, amount]) => (
            <div key={userId} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">{contributorNames[userId] ?? userId}</span>
              <CurrencyAmount amount={amount} hidden={hidden} size="sm" className="font-medium" />
            </div>
          ))}
      </div>
    </div>
  );
}
