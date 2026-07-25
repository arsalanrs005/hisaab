import "server-only";

import { redirect } from "next/navigation";
import type { Profile } from "@/lib/auth/types";
import { ensureCurrentProfile, profileToAppUser } from "@/lib/auth/session";
import type { User, UserId } from "@/types";
import type { ProfileSummary } from "@/data/profiles/helpers";

export type { ProfileSummary };
export {
  mapProfileSummary,
  profilesToUserMap,
  profileIdToLegacyUserId,
} from "@/data/profiles/helpers";

export type AppProfile = Profile & {
  legacyUserId: UserId;
  user: User;
};

export function toAppProfile(profile: Profile): AppProfile {
  const user = profileToAppUser(profile);
  return {
    ...profile,
    legacyUserId: user.id,
    user,
  };
}

export async function getCurrentProfile(): Promise<AppProfile | null> {
  const profile = await ensureCurrentProfile();
  if (!profile) return null;
  return toAppProfile(profile);
}

export async function requireCurrentProfile(): Promise<AppProfile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }
  return profile;
}

export async function getAllProfiles(): Promise<ProfileSummary[]> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, avatar_url")
    .order("display_name");

  if (error) {
    throw new Error("Unable to load workspace profiles.");
  }

  return data ?? [];
}
