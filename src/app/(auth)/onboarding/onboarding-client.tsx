"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import type { SavingsPlanMode } from "@/types";
import { cn } from "@/lib/utils";
import { completeOnboardingAction } from "@/data/onboarding/actions";
import type { getOnboardingBootstrap } from "@/data/onboarding/queries";

const STORAGE_KEY = "hisab-onboarding";
const TOTAL_STEPS = 9;

type Bootstrap = Awaited<ReturnType<typeof getOnboardingBootstrap>>;

interface OnboardingState {
  step: number;
  accounts: Array<{
    key: string;
    name: string;
    bankName: string;
    openingBalance: string;
    enabled: boolean;
    isSharedSavings?: boolean;
  }>;
  customIncomes: Array<{ name: string; enabled: boolean }>;
  savingsMode: SavingsPlanMode;
  skipLoans: boolean;
  skipGoals: boolean;
}

export function OnboardingClient({ bootstrap }: { bootstrap: Bootstrap }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<OnboardingState>(() => {
    const base: OnboardingState = {
      step: 1,
      accounts: bootstrap.suggestedAccounts.map((a) => ({
        key: a.key,
        name: a.name,
        bankName: a.bankName,
        openingBalance: a.openingBalance,
        enabled: a.enabled,
        isSharedSavings: a.isSharedSavings,
      })),
      customIncomes: bootstrap.suggestedIncomeSources.map((name) => ({
        name,
        enabled: false,
      })),
      savingsMode: "balanced",
      skipLoans: true,
      skipGoals: true,
    };
    if (typeof window === "undefined") return base;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...base, ...(JSON.parse(raw) as Partial<OnboardingState>) };
    } catch {
      /* ignore */
    }
    return base;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const progress = (state.step / TOTAL_STEPS) * 100;
  const isArsalan = bootstrap.profile.legacyUserId === "arsalan";

  function finish() {
    setError(null);
    startTransition(async () => {
      try {
        await completeOnboardingAction({
          accounts: state.accounts,
          incomeSources: state.customIncomes
            .filter((i) => i.enabled)
            .map((i) => ({ name: i.name, currency: "PKR" as const })),
          savingsMode: state.savingsMode,
          skipLoans: state.skipLoans,
          skipGoals: state.skipGoals,
        });
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to complete onboarding.");
      }
    });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary text-sm font-semibold text-primary-foreground">
          H
        </div>
        <p className="text-sm text-muted-foreground">
          Step {state.step} of {TOTAL_STEPS}
        </p>
        <Progress value={progress} className="mt-3" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {state.step === 1 && "Welcome to Hisab"}
            {state.step === 2 && "Your profile"}
            {state.step === 3 && "Create bank accounts"}
            {state.step === 4 && "Enter opening balances"}
            {state.step === 5 && "Optional loans"}
            {state.step === 6 && "Expected income sources"}
            {state.step === 7 && "Choose savings mode"}
            {state.step === 8 && "Initial goals"}
            {state.step === 9 && "You're ready"}
          </CardTitle>
          <CardDescription>
            {state.step === 2 &&
              `Signed in as ${bootstrap.profile.display_name} (${bootstrap.profile.email}).`}
            {state.step === 3 &&
              (isArsalan
                ? "Create Meezan (shared savings) and HBL under your ownership."
                : "Create your HBL account under your ownership.")}
            {state.step === 4 && "Stored as opening balances — not fake transactions."}
            {state.step === 5 && "Skip now or add loans later from the Loans page."}
            {state.step === 6 && "Optional — skip anything you are not ready to configure."}
            {state.step === 8 && "You can add goals from Savings & goals after onboarding."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          {state.step === 2 ? (
            <div className="rounded-[10px] border border-border bg-muted/30 p-4 text-sm">
              <p className="font-medium">{bootstrap.profile.display_name}</p>
              <p className="text-muted-foreground">{bootstrap.profile.email}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {bootstrap.workspace.name} · Identity comes from your approved email.
              </p>
            </div>
          ) : null}

          {state.step === 3 ? (
            <div className="space-y-3">
              {state.accounts.map((account, index) => (
                <label key={account.key} className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={account.enabled}
                    onCheckedChange={(checked) =>
                      setState((s) => ({
                        ...s,
                        accounts: s.accounts.map((a, i) =>
                          i === index ? { ...a, enabled: Boolean(checked) } : a
                        ),
                      }))
                    }
                  />
                  <span>
                    <span className="font-medium">{account.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {account.bankName}
                      {account.isSharedSavings ? " · shared savings" : ""}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          ) : null}

          {state.step === 4 ? (
            <div className="space-y-3">
              {state.accounts
                .filter((a) => a.enabled)
                .map((account, index) => (
                  <div key={account.key} className="space-y-1.5">
                    <Label>
                      {account.name} (PKR)
                    </Label>
                    <Input
                      value={account.openingBalance}
                      onChange={(e) =>
                        setState((s) => ({
                          ...s,
                          accounts: s.accounts.map((a, i) =>
                            a.key === account.key ? { ...a, openingBalance: e.target.value } : a
                          ),
                        }))
                      }
                    />
                  </div>
                ))}
              {isArsalan ? (
                <p className="text-xs text-muted-foreground">
                  Meezan is owned by you and marked as shared savings. Ali can view it and transfer
                  in, but cannot edit your normal Meezan transactions.
                </p>
              ) : null}
            </div>
          ) : null}

          {state.step === 5 ? (
            <p className="text-sm text-muted-foreground">
              Loan tracking is available from the Loans page once onboarding is complete.
            </p>
          ) : null}

          {state.step === 6 ? (
            <div className="space-y-2">
              {state.customIncomes.map((source, index) => (
                <label key={source.name} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={source.enabled}
                    onCheckedChange={(checked) =>
                      setState((s) => ({
                        ...s,
                        customIncomes: s.customIncomes.map((item, i) =>
                          i === index ? { ...item, enabled: Boolean(checked) } : item
                        ),
                      }))
                    }
                  />
                  {source.name}
                </label>
              ))}
            </div>
          ) : null}

          {state.step === 7 ? (
            <div className="grid gap-2">
              {(
                [
                  ["comfortable", "Comfortable"],
                  ["balanced", "Balanced"],
                  ["aggressive", "Aggressive"],
                  ["custom", "Custom"],
                ] as const
              ).map(([mode, title]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setState((s) => ({ ...s, savingsMode: mode }))}
                  className={cn(
                    "rounded-[10px] border px-4 py-3 text-left",
                    state.savingsMode === mode ? "border-primary bg-accent" : "border-border"
                  )}
                >
                  {title}
                </button>
              ))}
            </div>
          ) : null}

          {state.step === 8 ? (
            <p className="text-sm text-muted-foreground">
              You can configure goals from Savings & goals after onboarding.
            </p>
          ) : null}

          {state.step === 9 ? (
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Profile: {bootstrap.profile.display_name}</li>
              <li>
                Accounts to create: {state.accounts.filter((a) => a.enabled).length}
              </li>
              <li>Savings mode: {state.savingsMode}</li>
            </ul>
          ) : null}

          <div className="flex justify-between gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setState((s) => ({ ...s, step: Math.max(1, s.step - 1) }))}
              disabled={state.step === 1 || pending}
            >
              Back
            </Button>
            {state.step < TOTAL_STEPS ? (
              <Button
                onClick={() => setState((s) => ({ ...s, step: Math.min(TOTAL_STEPS, s.step + 1) }))}
                disabled={pending}
              >
                Continue
              </Button>
            ) : (
              <Button onClick={finish} disabled={pending}>
                {pending ? "Saving…" : "Open dashboard"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
