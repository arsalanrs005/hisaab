"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isApprovedEmail, normalizeEmail } from "@/lib/auth/approved-users";
import { resolveSafeRedirect } from "@/lib/auth/safe-redirect";

function siteOrigin() {
  // Prefer forwarded host in production behind proxies.
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? null;
}

async function resolveOrigin() {
  const configured = siteOrigin();
  if (configured) return configured;
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}

export type AuthActionState = {
  error?: string;
  success?: string;
};

export async function signInWithPassword(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  if (!isApprovedEmail(email)) {
    return {
      error:
        "This workspace is private. Only approved Hisab accounts can sign in.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Invalid email or password." };
  }

  redirect(resolveSafeRedirect(next));
}

export async function signInWithGoogleAction(formData: FormData) {
  const next = String(formData.get("next") ?? "/dashboard");
  await signInWithGoogle(next);
}

export async function signInWithGoogle(nextPath = "/dashboard") {
  const supabase = await createClient();
  const origin = await resolveOrigin();
  const safeNext = resolveSafeRedirect(nextPath);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    redirect(`/login?error=oauth_failed`);
  }

  redirect(data.url);
}

export async function requestPasswordReset(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!email) return { error: "Enter your email address." };
  if (!isApprovedEmail(email)) {
    return {
      error:
        "This workspace is private. Password reset is only available for approved accounts.",
    };
  }

  const supabase = await createClient();
  const origin = await resolveOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/reset-password`,
  });

  if (error) {
    return { error: "Unable to send reset email. Try again shortly." };
  }

  return {
    success: "If that account exists, a reset link has been sent.",
  };
}

export async function updatePassword(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "Unable to update password. Request a new reset link." };
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
