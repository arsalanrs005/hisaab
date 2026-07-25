"use client";

import { useActionState, useState } from "react";
import { useTheme } from "next-themes";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/providers/app-provider";
import type { AccountWithMeta } from "@/data/accounts/mappers";
import type { Category, IncomeSource, Loan, ExchangeRate } from "@/types";
import type { Profile } from "@/lib/auth/types";
import type { WorkspaceContext } from "@/data/workspaces/types";
import { refreshExchangeRateAction, updateProfileDisplayNameAction } from "@/data/settings/mutations";
import { updateBudgetAssumptionsAction } from "@/data/budgets/mutations";
import { updatePassword, type AuthActionState } from "@/lib/auth/actions";
import { APPROVED_EMAILS } from "@/lib/auth/approved-users";
import { exportWorkspaceBackupAction } from "@/data/reports/mutations";
import { downloadJson } from "@/lib/exports/download";
import { devPreviewUsers } from "@/lib/auth/dev-users";
import { formatPKR } from "@/lib/format";
import type { ThemeMode } from "@/types";

const sections = [
  { id: "profile", label: "Profile" },
  { id: "accounts", label: "Accounts" },
  { id: "permissions", label: "Permissions" },
  { id: "categories", label: "Categories" },
  { id: "assumptions", label: "Spending assumptions" },
  { id: "income", label: "Income sources" },
  { id: "savings", label: "Savings plan" },
  { id: "loans", label: "Loans" },
  { id: "notifications", label: "Notifications" },
  { id: "currency", label: "Currency conversion" },
  { id: "appearance", label: "Appearance" },
  { id: "data", label: "Data and exports" },
  { id: "security", label: "Security" },
];

export function SettingsClient({
  profile,
  workspace,
  accounts,
  categories,
  incomeSources,
  loans,
  settings,
  exchangeRate,
}: {
  profile: Profile;
  workspace: WorkspaceContext;
  accounts: AccountWithMeta[];
  categories: Category[];
  incomeSources: IncomeSource[];
  loans: Loan[];
  settings: {
    comfortableSavingsRate: number;
    balancedSavingsRate: number;
    aggressiveSavingsRate: number;
    budgetWarningThreshold: number;
    budgetExceededThreshold: number;
    defaultCurrency: string;
    allowTransferOverdraft: boolean;
  };
  exchangeRate: ExchangeRate;
}) {
  const { currentUser, setCurrentUserId, isDevUserSwitcherEnabled, savingsPlanMode, setSavingsPlanMode } = useApp();
  const { theme, setTheme } = useTheme();
  const [assumptionMessage, setAssumptionMessage] = useState<string | null>(null);
  const [passwordState, passwordAction, passwordPending] = useActionState(updatePassword, {} as AuthActionState);

  async function saveAssumptions(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setAssumptionMessage(null);
    try {
      await updateBudgetAssumptionsAction({
        comfortableSavingsRate: Number(formData.get("comfortableSavingsRate")) / 100,
        balancedSavingsRate: Number(formData.get("balancedSavingsRate")) / 100,
        aggressiveSavingsRate: Number(formData.get("aggressiveSavingsRate")) / 100,
        budgetWarningThreshold: Number(formData.get("budgetWarningThreshold")) / 100,
        budgetExceededThreshold: Number(formData.get("budgetExceededThreshold")) / 100,
      });
      setAssumptionMessage("Assumptions saved.");
    } catch (e) {
      setAssumptionMessage(e instanceof Error ? e.message : "Unable to save assumptions.");
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Settings"
        description="Workspace preferences saved to your Hisab database."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`}>
            <Badge variant="outline" className="cursor-pointer hover:bg-muted">
              {s.label}
            </Badge>
          </a>
        ))}
      </div>

      <div className="space-y-6">
        <Card id="profile">
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
            <CardDescription>
              {isDevUserSwitcherEnabled
                ? "Preview permission states by switching the active mock user (development only)."
                : "Your profile is linked to the approved Supabase account for this private workspace."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isDevUserSwitcherEnabled ? (
              <div className="space-y-1.5">
                <Label>Active user (dev preview)</Label>
                <Select
                  value={currentUser.id}
                  onValueChange={(v) => setCurrentUserId(v as "arsalan" | "ali")}
                >
                  <SelectTrigger className="max-w-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {devPreviewUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} · {u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Development only. Production uses the signed-in Supabase profile.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Signed in as {currentUser.name} ({currentUser.email}).
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Display name</Label>
                <Input id="name" defaultValue={currentUser.name} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" defaultValue={currentUser.email} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card id="accounts">
          <CardHeader>
            <CardTitle className="text-base">Accounts</CardTitle>
            <CardDescription>Owned accounts and pooled savings visibility.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {accounts.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-[10px] border border-border px-3 py-2 text-sm"
              >
                <span>
                  {a.name}
                  {a.isPooled ? (
                    <Badge variant="secondary" className="ml-2">
                      Pooled
                    </Badge>
                  ) : null}
                </span>
                <span className="text-muted-foreground">
                  {a.ownerId === currentUser.id ? "Owner" : "View only"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card id="permissions">
          <CardHeader>
            <CardTitle className="text-base">Permissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Owners can add, edit, archive, and reconcile transactions on their accounts.</p>
            <p>Both users can manage categories, shared goals, notes, reports, and Ops5ive plans.</p>
            <p>Transfers into shared Meezan remain available to both users.</p>
          </CardContent>
        </Card>

        <Card id="categories">
          <CardHeader>
            <CardTitle className="text-base">Categories</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Badge key={c.id} variant="outline">
                {c.name}
              </Badge>
            ))}
            <Button size="sm" variant="secondary">
              Add category
            </Button>
          </CardContent>
        </Card>

        <Card id="assumptions">
          <CardHeader>
            <CardTitle className="text-base">Monthly spending assumptions</CardTitle>
            <CardDescription>Defaults used by budget warnings and savings plans.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <form onSubmit={(e) => void saveAssumptions(e)} className="contents">
              <div className="space-y-1.5">
                <Label htmlFor="comfortable-rate">Comfortable savings rate (%)</Label>
                <Input
                  id="comfortable-rate"
                  name="comfortableSavingsRate"
                  defaultValue={String(Math.round(settings.comfortableSavingsRate * 100))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="balanced-rate">Balanced savings rate (%)</Label>
                <Input
                  id="balanced-rate"
                  name="balancedSavingsRate"
                  defaultValue={String(Math.round(settings.balancedSavingsRate * 100))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="aggressive-rate">Aggressive savings rate (%)</Label>
                <Input
                  id="aggressive-rate"
                  name="aggressiveSavingsRate"
                  defaultValue={String(Math.round(settings.aggressiveSavingsRate * 100))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="warning-threshold">Budget warning threshold (%)</Label>
                <Input
                  id="warning-threshold"
                  name="budgetWarningThreshold"
                  defaultValue={String(Math.round(settings.budgetWarningThreshold * 100))}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="exceeded-threshold">Budget exceeded threshold (%)</Label>
                <Input
                  id="exceeded-threshold"
                  name="budgetExceededThreshold"
                  defaultValue={String(Math.round(settings.budgetExceededThreshold * 100))}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" size="sm">
                  Save assumptions
                </Button>
                {assumptionMessage ? (
                  <p className="mt-2 text-sm text-muted-foreground">{assumptionMessage}</p>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card id="income">
          <CardHeader>
            <CardTitle className="text-base">Income sources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {incomeSources.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-[10px] border border-border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {workspace.memberships.find((m) => m.profileId === s.ownerProfileId)?.displayName ??
                      s.ownerId}{" "}
                    {s.active ? "Active" : "Inactive"}
                  </p>
                </div>
                <span className="tabular-nums">{formatPKR(s.expectedMonthly)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card id="savings">
          <CardHeader>
            <CardTitle className="text-base">Savings plan</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={savingsPlanMode}
              onValueChange={(v) =>
                setSavingsPlanMode(v as "comfortable" | "balanced" | "aggressive" | "custom")
              }
            >
              <SelectTrigger className="max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="aggressive">Aggressive</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card id="loans">
          <CardHeader>
            <CardTitle className="text-base">Loans</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {loans.map((l) => (
              <div key={l.id} className="flex justify-between border-b border-border py-2 last:border-0">
                <span>{l.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {formatPKR(l.remainingBalance)} left
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card id="notifications">
          <CardHeader>
            <CardTitle className="text-base">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              "Budget warnings",
              "Expected payments",
              "Loan due reminders",
              "Contribution activity",
            ].map((label) => (
              <div key={label} className="flex items-center justify-between">
                <Label>{label}</Label>
                <Switch defaultChecked />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card id="currency">
          <CardHeader>
            <CardTitle className="text-base">Currency conversion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              {exchangeRate.from} → {exchangeRate.to}:{" "}
              <span className="font-medium tabular-nums">{exchangeRate.rate}</span>
            </p>
            <p className="text-muted-foreground">
              Source: {exchangeRate.source}
              {exchangeRate.source.includes("fallback") ? " · not a live market rate" : ""} ·{" "}
              {new Date(exchangeRate.timestamp).toLocaleString()}
            </p>
            <div className="space-y-1.5 max-w-xs">
              <Label>Manual override rate</Label>
              <Input defaultValue={String(exchangeRate.rate)} readOnly />
              <Button type="button" variant="outline" onClick={() => void refreshExchangeRateAction()}>
                Refresh live rate
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card id="appearance">
          <CardHeader>
            <CardTitle className="text-base">Appearance</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="inline-flex rounded-[10px] bg-muted p-1"
              role="group"
              aria-label="Theme"
            >
              {(["light", "dark", "system"] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTheme(mode)}
                  className={`rounded-[8px] px-3 py-1.5 text-sm capitalize ${
                    theme === mode
                      ? "bg-card font-medium shadow-[var(--shadow-sm)]"
                      : "text-muted-foreground"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card id="data">
          <CardHeader>
            <CardTitle className="text-base">Data and exports</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline">Export CSV</Button>
            <Button variant="outline">Export Excel</Button>
            <Button
              variant="outline"
              onClick={async () => {
                const result = await exportWorkspaceBackupAction();
                downloadJson(result.filename, JSON.parse(result.content));
              }}
            >
              Backup JSON
            </Button>
          </CardContent>
        </Card>

        <Card id="security">
          <CardHeader>
            <CardTitle className="text-base">Security</CardTitle>
            <CardDescription>
              Change your Supabase password while signed in. Use the reset flow on the login page if
              you are locked out.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={passwordAction} className="max-w-md space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input id="new-password" name="password" type="password" autoComplete="new-password" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                />
              </div>
              {passwordState.error ? (
                <p className="text-sm text-danger">{passwordState.error}</p>
              ) : null}
              <Button type="submit" variant="outline" disabled={passwordPending}>
                {passwordPending ? "Updating…" : "Change password"}
              </Button>
            </form>
            <Separator />
            <p className="text-sm text-muted-foreground">
              Allowed emails: {APPROVED_EMAILS.join(" · ")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
