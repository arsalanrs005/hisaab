import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile } from "@/data/profiles/queries";
import { mapNotificationToUi, type UiNotification } from "@/data/notifications/mappers";

export async function getNotifications(limit = 50): Promise<UiNotification[]> {
  const profile = await requireCurrentProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error("Unable to load notifications.");
  return (data ?? []).map(mapNotificationToUi);
}

export async function getUnreadNotificationCount(): Promise<number> {
  const profile = await requireCurrentProfile();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", profile.id)
    .is("read_at", null);

  if (error) return 0;
  return count ?? 0;
}
