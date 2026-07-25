import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile } from "@/data/profiles/queries";
import { emailToLegacyUserId, isSharedWorkspaceEmail } from "@/lib/auth/approved-users";
import { requireCurrentWorkspace } from "@/data/workspaces/queries";

export interface OnboardingAccountSuggestion {
  key: string;
  name: string;
  bankName: string;
  openingBalance: string;
  enabled: boolean;
  isSharedSavings: boolean;
}

function defaultAccountsForUser(email: string): OnboardingAccountSuggestion[] {
  const legacy = emailToLegacyUserId(email);

  if (legacy === "ali") {
    return [
      {
        key: "ali-hbl",
        name: "Ali HBL",
        bankName: "HBL",
        openingBalance: "0",
        enabled: true,
        isSharedSavings: false,
      },
    ];
  }

  if (legacy === "anum") {
    return [
      {
        key: "anum-meezan",
        name: "Meezan",
        bankName: "Meezan Bank",
        openingBalance: "0",
        enabled: true,
        isSharedSavings: false,
      },
      {
        key: "anum-ubl",
        name: "UBL",
        bankName: "UBL",
        openingBalance: "0",
        enabled: true,
        isSharedSavings: false,
      },
      {
        key: "anum-nayapay",
        name: "Nayapay",
        bankName: "Nayapay",
        openingBalance: "0",
        enabled: true,
        isSharedSavings: false,
      },
    ];
  }

  if (legacy === "sarah") {
    return [
      {
        key: "sarah-nayapay",
        name: "Nayapay",
        bankName: "Nayapay",
        openingBalance: "0",
        enabled: true,
        isSharedSavings: false,
      },
      {
        key: "sarah-sadapay",
        name: "Sadapay",
        bankName: "Sadapay",
        openingBalance: "0",
        enabled: true,
        isSharedSavings: false,
      },
    ];
  }

  return [
    {
      key: "meezan",
      name: "Arsalan Meezan",
      bankName: "Meezan Bank",
      openingBalance: "0",
      enabled: true,
      isSharedSavings: true,
    },
    {
      key: "arsalan-hbl",
      name: "Arsalan HBL",
      bankName: "HBL",
      openingBalance: "0",
      enabled: true,
      isSharedSavings: false,
    },
  ];
}

function defaultIncomeSources(email: string): string[] {
  const legacy = emailToLegacyUserId(email);
  if (legacy === "ali") return ["HelloForce", "Geoey"];
  if (legacy === "anum" || legacy === "sarah") return [];
  return ["QuestRock", "Greg", "Jason"];
}

export async function getOnboardingBootstrap() {
  const profile = await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const supabase = await createClient();

  const { data: existingAccounts } = await supabase
    .from("accounts")
    .select("id, name, bank_name, opening_balance, is_shared_savings_account")
    .eq("owner_profile_id", profile.id)
    .eq("workspace_id", workspace.workspaceId)
    .eq("is_active", true);

  return {
    profile,
    workspace,
    suggestedAccounts: defaultAccountsForUser(profile.email),
    existingAccounts: existingAccounts ?? [],
    suggestedIncomeSources: defaultIncomeSources(profile.email),
    onboardingCompleted: profile.onboarding_completed,
    canMarkSharedSavings: isSharedWorkspaceEmail(profile.email) && legacyUserIsArsalan(profile.email),
  };
}

function legacyUserIsArsalan(email: string): boolean {
  return emailToLegacyUserId(email) === "arsalan";
}

export async function ensureOnboardingIncomplete() {
  const bootstrap = await getOnboardingBootstrap();
  if (bootstrap.onboardingCompleted) {
    redirect("/dashboard");
  }
  return bootstrap;
}
