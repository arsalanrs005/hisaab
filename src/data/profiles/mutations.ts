"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile } from "@/data/profiles/queries";
import type { DashboardMode } from "@/types";
import type { SavingsPlanMode } from "@/types";

export async function updateDashboardModeAction(mode: DashboardMode) {
  const profile = await requireCurrentProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ default_dashboard_mode: mode })
    .eq("id", profile.id);

  if (error) throw new Error("Unable to save dashboard mode.");
  revalidatePath("/dashboard");
}

export async function updateBalancesHiddenDefaultAction(hidden: boolean) {
  const profile = await requireCurrentProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ balances_hidden_by_default: hidden })
    .eq("id", profile.id);

  if (error) throw new Error("Unable to save balance privacy preference.");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
}

export async function updateSavingsPlanModeAction(
  mode: SavingsPlanMode,
  customRate?: number | null
) {
  const profile = await requireCurrentProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      savings_plan_mode: mode,
      custom_savings_rate: mode === "custom" ? customRate ?? null : null,
    })
    .eq("id", profile.id);

  if (error) throw new Error("Unable to save savings plan.");
  revalidatePath("/dashboard");
}
