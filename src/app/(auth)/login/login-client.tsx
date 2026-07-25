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
    <div className="flex min-h-screen">
      <div className="hidden w-[44%] flex-col justify-between border-r border-border bg-background-subtle p-10 lg:flex">
        <div>
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            H
          </div>
          <h1 className="mt-8 text-[32px] font-semibold leading-tight tracking-tight text-foreground">
            Your private financial workspace
          </h1>
          <p className="mt-3 max-w-md text-sm leading-[22px] text-foreground-muted">
            Track accounts, goals, loans, and business operations with workspace isolation built for
            trusted household and personal finance.
          </p>
        </div>
        <p className="text-xs text-foreground-faint">Approved members only · No public registration</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-8">
        <div className="mb-8 text-center lg:hidden">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-primary text-lg font-semibold text-primary-foreground">
            H
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Hisab</h1>
          <p className="mt-1 text-sm text-foreground-muted">Money, goals, and growth in one place.</p>
        </div>

        <Card className="w-full max-w-md border-border shadow-[var(--shadow-sm)]">
        <CardHeader>
          <CardTitle className="text-lg">
            {mode === "signin" ? "Sign in" : "Reset password"}
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
                      className="text-xs text-primary hover:underline"
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

          <p className="text-center text-xs text-muted-foreground">
            Allowed: arsalanrs005@gmail.com · alirashidd.232@gmail.com · anum112004@gmail.com ·
            sarahbatool23@gmail.com
          </p>
          <p className="text-center text-xs text-muted-foreground">
            After your first approved sign-in, complete onboarding from the app.
          </p>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
