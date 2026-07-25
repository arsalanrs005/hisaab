import { emailToLegacyUserId } from "@/lib/auth/approved-users";
import type { User, UserId } from "@/types";
import type { Tables } from "@/types/database";

export type ProfileSummary = Pick<
  Tables<"profiles">,
  "id" | "email" | "display_name" | "avatar_url"
>;

const AVATAR_COLORS: Record<UserId, string> = {
  arsalan: "#3730a3",
  ali: "#0f766e",
  anum: "#be185d",
  sarah: "#b45309",
};

export function mapProfileSummary(profile: ProfileSummary): User {
  const legacyUserId = emailToLegacyUserId(profile.email);
  return {
    id: legacyUserId,
    name: profile.display_name,
    email: profile.email,
    initials:
      profile.display_name
        .split(/\s+/)
        .map((part) => part[0] ?? "")
        .join("")
        .slice(0, 2)
        .toUpperCase() || "H",
    avatarColor: AVATAR_COLORS[legacyUserId] ?? "#3730a3",
  };
}

export function profilesToUserMap(profiles: ProfileSummary[]): Map<string, User> {
  return new Map(profiles.map((p) => [p.id, mapProfileSummary(p)]));
}

export function profileIdToLegacyUserId(
  profileId: string,
  profiles: ProfileSummary[]
): UserId {
  const profile = profiles.find((p) => p.id === profileId);
  return profile ? emailToLegacyUserId(profile.email) : "arsalan";
}
