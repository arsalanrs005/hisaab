import { createClient } from "@/lib/supabase/server";
import { emailToLegacyUserId, isApprovedEmail, normalizeEmail } from "@/lib/auth/approved-users";
import type { Profile } from "@/lib/auth/types";
import type { User as AppUser } from "@/types";

export type { Profile, ApprovedUser } from "@/lib/auth/types";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function ensureCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !isApprovedEmail(user.email)) {
    return null;
  }

  const { error: ensureError } = await supabase.rpc("ensure_profile_for_auth_user");
  if (ensureError) {
    console.error("[hisab] ensure_profile_for_auth_user", ensureError.message);
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[hisab] load profile", error.message);
    return null;
  }

  return data;
}

export function profileToAppUser(profile: Profile): AppUser {
  const legacyId = emailToLegacyUserId(profile.email);
  return {
    id: legacyId,
    name: profile.display_name,
    email: normalizeEmail(profile.email),
    initials: profile.display_name
      .split(/\s+/)
      .map((part: string) => part[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "H",
    avatarColor: legacyId === "ali" ? "#0f766e" : "#3730a3",
  };
}

export async function requireApprovedSession() {
  const user = await getSessionUser();
  if (!user?.email || !isApprovedEmail(user.email)) {
    return { user: null, profile: null as Profile | null };
  }
  const profile = await ensureCurrentProfile();
  return { user, profile };
}
