import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CurrencyAmount } from "@/components/finance/currency-amount";
import { formatDate } from "@/lib/format";
import type { Loan } from "@/types";
import { cn } from "@/lib/utils";

interface LoanCardProps {
  loan: Loan;
  progress?: number;
  ownerName?: string;
  accountName?: string;
  hidden?: boolean;
  className?: string;
}

export function LoanCard({
  loan,
  progress: progressProp,
  ownerName,
  accountName,
  hidden,
  className,
}: LoanCardProps) {
  const progress =
    progressProp ??
    (loan.originalAmount > 0
      ? Math.min(100, Math.round(((loan.originalAmount - loan.remainingBalance) / loan.originalAmount) * 100))
      : 0);

  return (
    <Card className={cn("min-w-0", className)}>
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{loan.name}</CardTitle>
          <Badge variant="secondary">{ownerName ?? loan.ownerId}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Funded from {accountName ?? "—"} · Due day {loan.dueDay}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Remaining</p>
            <CurrencyAmount
              amount={loan.remainingBalance}
              hidden={hidden}
              size="md"
              className="text-lg font-semibold"
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Original</p>
            <CurrencyAmount amount={loan.originalAmount} hidden={hidden} size="sm" muted />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progress}% paid</span>
            <span>{loan.interestRate}% markup</span>
          </div>
          <Progress value={progress} indicatorClassName="bg-warning" />
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">
            Installment{" "}
            <CurrencyAmount
              amount={loan.monthlyInstallment}
              hidden={hidden}
              size="sm"
              className="font-medium text-foreground"
            />
          </span>
          <span className="text-muted-foreground">
            Ends {formatDate(loan.expectedCompletion)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
