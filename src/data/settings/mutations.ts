"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile } from "@/data/profiles/queries";
import { requireCurrentWorkspace } from "@/data/workspaces/queries";
import type { Json } from "@/types/database";
import { mapDatabaseError } from "@/data/errors";
import { fetchLatestExchangeRate, cacheExchangeRate } from "@/lib/exchange-rates/fetch";

export async function updateProfileDisplayNameAction(displayName: string) {
  const profile = await requireCurrentProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName.trim() })
    .eq("id", profile.id);
  if (error) throw new Error(mapDatabaseError(error));
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function refreshExchangeRateAction() {
  await requireCurrentProfile();
  const supabase = await createClient();
  const rate = await fetchLatestExchangeRate("USD", "PKR", { skipCache: true });
  await cacheExchangeRate(supabase, rate.from, rate.to, rate.rate, rate.source);
  revalidatePath("/settings");
  return { ok: true as const, rate };
}

export async function updateAppSettingAction(key: string, value: unknown) {
  await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const profile = await requireCurrentProfile();
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("app_settings").upsert(
    {
      workspace_id: workspace.workspaceId,
      key,
      value_json: value,
      updated_by: profile.id,
    },
    { onConflict: "workspace_id,key" }
  );

  if (error) throw new Error(mapDatabaseError(error));
  revalidatePath("/settings");
  return { ok: true as const };
}
