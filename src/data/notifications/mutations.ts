"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile } from "@/data/profiles/queries";

export async function markNotificationReadAction(notificationId: string) {
  const profile = await requireCurrentProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("profile_id", profile.id);

  if (error) throw new Error("Unable to mark notification as read.");
  revalidatePath("/notifications");
  return { ok: true as const };
}

export async function markAllNotificationsReadAction() {
  const profile = await requireCurrentProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("profile_id", profile.id)
    .is("read_at", null);

  if (error) throw new Error("Unable to mark notifications as read.");
  revalidatePath("/notifications");
  return { ok: true as const };
}
