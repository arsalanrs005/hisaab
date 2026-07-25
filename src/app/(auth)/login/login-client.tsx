"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  requestPasswordReset,
  signInWithGoogleAction,
  signInWithPassword,
  type AuthActionState,
} from "@/lib/auth/actions";

const initialState: AuthActionState = {};

function errorMessage(code: string | null): string | null {
  if (!code) return null;
  if (code === "private_workspace") {
    return "This workspace is private. Your Google account is not approved for Hisab. You have been signed out.";
  }
  if (code === "oauth_failed") {
    return "Google sign-in failed. Please try again.";
  }
  return "Unable to sign in. Please try again.";
}

export default function LoginClient() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const urlError = errorMessage(searchParams.get("error"));
  const [mode, setMode] = useState<"signin" | "reset">("signin");
  const [signInState, signInAction, signInPending] = useActionState(
    signInWithPassword,
    initialState
  );
  const [resetState, resetAction, resetPending] = useActionState(
    requestPasswordReset,
    initialState
  );

  return (
    <div className="relative flex min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-0 h-[480px] w-[480px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <div className="relative hidden w-[46%] flex-col justify-between border-r border-[var(--glass-border)] p-12 lg:flex">
        <div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]">
            H
          </div>
          <p className="mt-10 text-xs font-medium uppercase tracking-[0.14em] text-foreground-faint">
            Private finance workspace
          </p>
          <h1 className="mt-4 max-w-md text-[40px] font-semibold leading-[1.1] tracking-[-0.03em] text-gradient">
            Money, goals, and growth — in one place.
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-foreground-muted">
            Track accounts, savings, loans, and business operations with workspace isolation built
            for trusted household and personal finance.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {["Accounts", "Goals", "Reports"].map((label) => (
            <div
              key={label}
              className="rounded-lg border border-[var(--glass-border)] bg-[var(--surface)] px-3 py-3 backdrop-blur-[var(--glass-blur)]"
            >
              <p className="text-[11px] text-foreground-faint">{label}</p>
              <p className="mt-1 text-sm font-medium text-foreground">Live</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-8">
        <div className="mb-8 text-center lg:hidden">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground shadow-[var(--shadow-glow)]">
            H
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Hisab</h1>
          <p className="mt-1 text-sm text-foreground-muted">Money, goals, and growth in one place.</p>
        </div>

        <Card className="w-full max-w-md border-[var(--glass-border)] bg-[var(--surface-raised)] shadow-[var(--shadow-md)] backdrop-blur-[var(--glass-blur)]">
          <CardHeader>
            <CardTitle className="text-lg tracking-[-0.01em]">
              {mode === "signin" ? "Welcome back" : "Reset password"}
            </CardTitle>
            <CardDescription>
              Private workspace for approved Hisab members. There is no public registration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {urlError ? <p className="text-sm text-danger">{urlError}</p> : null}

            {mode === "signin" ? (
              <>
                <form action={signInAction} className="space-y-4">
                  <input type="hidden" name="next" value={next} />
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="username"
                      defaultValue="arsalanrs005@gmail.com"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button
                        type="button"
                        className="text-xs text-primary hover:text-[var(--primary-hover)]"
                        onClick={() => setMode("reset")}
                      >
                        Forgot password
                      </button>
                    </div>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                  {signInState.error ? (
                    <p className="text-sm text-danger">{signInState.error}</p>
                  ) : null}
                  <Button type="submit" className="w-full" disabled={signInPending}>
                    {signInPending ? "Signing in…" : "Sign in"}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-[var(--glass-border)]" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[var(--surface-raised)] px-2 text-foreground-faint">or</span>
                  </div>
                </div>

                <form action={signInWithGoogleAction}>
                  <input type="hidden" name="next" value={next} />
                  <Button type="submit" variant="outline" className="w-full">
                    Sign in with Google
                  </Button>
                </form>
              </>
            ) : (
              <form action={resetAction} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                  />
                </div>
                {resetState.error ? (
                  <p className="text-sm text-danger">{resetState.error}</p>
                ) : null}
                {resetState.success ? (
                  <p className="text-sm text-success">{resetState.success}</p>
                ) : null}
                <Button type="submit" className="w-full" disabled={resetPending}>
                  {resetPending ? "Sending…" : "Send reset link"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setMode("signin")}
                >
                  Back to sign in
                </Button>
              </form>
            )}

            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              Allowed: arsalanrs005@gmail.com · alirashidd.232@gmail.com · anum112004@gmail.com ·
              sarahbatool23@gmail.com
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
