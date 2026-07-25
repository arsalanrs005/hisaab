"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { GoalContributionDialog } from "@/components/forms/goal-contribution-dialog";
import { Target } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { CurrencyAmount } from "@/components/finance/currency-amount";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useApp } from "@/providers/app-provider";
import { formatDate } from "@/lib/format";
import { canEditGoal } from "@/lib/permissions";
import type { Goal } from "@/types";
import type { AccountWithMeta } from "@/data/accounts/mappers";
import type { UiNote } from "@/data/notes/types";

interface GoalDetailClientProps {
  goal: Goal;
  contributions: Array<{
    id: string;
    contributorName: string;
    contributorProfileId: string;
    amount: number;
    date: string;
    notes: string | null;
  }>;
  relatedNotes: UiNote[];
  ownerNames: Record<string, string>;
  accounts: AccountWithMeta[];
}

export function GoalDetailClient({
  goal,
  contributions,
  relatedNotes,
  ownerNames,
  accounts,
}: GoalDetailClientProps) {
  const router = useRouter();
  const { currentUser, hideBalances } = useApp();
  const progress =
    goal.targetAmount > 0
      ? Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100))
      : 0;
  const byUser = contributions.reduce<Record<string, number>>((acc, c) => {
    acc[c.contributorName] = (acc[c.contributorName] ?? 0) + c.amount;
    return acc;
  }, {});
  const remaining = goal.targetAmount - goal.savedAmount;
  const monthsLeft =
    goal.monthlyContribution > 0 ? Math.ceil(remaining / goal.monthlyContribution) : null;
  const canEdit = canEditGoal(currentUser, goal);
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
  const [contributionOpen, setContributionOpen] = React.useState(false);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={goal.name}
        description={`${goal.visibility} · ${ownerNames[goal.ownerId] ?? goal.ownerId} · Est. ${formatDate(goal.estimatedCompletion)}`}
      >
        <Badge variant="outline" className="capitalize">
          {goal.priority} priority
        </Badge>
        {canEdit ? (
          <Button size="sm" onClick={() => setContributionOpen(true)}>
            Add contribution
          </Button>
        ) : null}
      </PageHeader>

      <GoalContributionDialog
        open={contributionOpen}
        onOpenChange={setContributionOpen}
        goalId={goal.id}
        goalName={goal.name}
        accounts={accounts}
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div
              className="relative flex h-36 w-36 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(var(--primary) ${progress}%, var(--muted) 0)`,
              }}
              role="img"
              aria-label={`${progress}% complete`}
            >
              <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-card">
                <span className="text-2xl font-semibold tabular-nums">{progress}%</span>
                <span className="text-xs text-muted-foreground">complete</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Funding snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Saved</p>
              <CurrencyAmount amount={goal.savedAmount} hidden={hideBalances} size="lg" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Target</p>
              <CurrencyAmount amount={goal.targetAmount} hidden={hideBalances} size="lg" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Monthly plan</p>
              <CurrencyAmount amount={goal.monthlyContribution} hidden={hideBalances} size="lg" />
            </div>
            <div className="space-y-2 sm:col-span-3">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground">
                Remaining{" "}
                <CurrencyAmount amount={remaining} hidden={hideBalances} size="sm" className="font-medium text-foreground" />
                {monthsLeft !== null ? ` · ~${monthsLeft} months at current contribution` : null}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contributions by person</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(byUser).map(([name, amount]) => (
              <div key={name} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{name}</span>
                <CurrencyAmount amount={amount} hidden={hideBalances} size="sm" className="font-medium" />
              </div>
            ))}
            {Object.keys(byUser).length === 0 ? (
              <p className="text-sm text-muted-foreground">No contributions recorded yet.</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funding accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {goal.fundingAccountIds.map((id) => (
              <Link
                key={id}
                href={`/accounts/${id}`}
                className="block rounded-[10px] border border-border px-3 py-2 text-sm hover:bg-muted/40"
              >
                {accountMap.get(id) ?? id}
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Contribution history</h2>
        <div className="space-y-2">
          {contributions.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-border bg-card p-4 text-sm"
            >
              <div>
                <p className="font-medium">{c.contributorName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(c.date)}
                  {c.notes ? ` · ${c.notes}` : ""}
                </p>
              </div>
              <CurrencyAmount amount={c.amount} hidden={hideBalances} size="sm" className="font-semibold" />
            </div>
          ))}
        </div>
      </section>

      {relatedNotes.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Related notes</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {relatedNotes.map((n) => (
              <Link
                key={n.id}
                href="/notes"
                className="rounded-[12px] border border-border bg-card p-4 hover:bg-muted/30"
              >
                <p className="font-medium">{n.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{n.content}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
