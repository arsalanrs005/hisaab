export const APPROVED_EMAILS = [
  "arsalanrs005@gmail.com",
  "alirashidd.232@gmail.com",
  "anum112004@gmail.com",
  "sarahbatool23@gmail.com",
] as const;

export type LegacyUserId = "arsalan" | "ali" | "anum" | "sarah";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isApprovedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return (APPROVED_EMAILS as readonly string[]).includes(normalizeEmail(email));
}

export function emailToLegacyUserId(email: string): LegacyUserId {
  const normalized = normalizeEmail(email);
  if (normalized === "alirashidd.232@gmail.com") return "ali";
  if (normalized === "anum112004@gmail.com") return "anum";
  if (normalized === "sarahbatool23@gmail.com") return "sarah";
  return "arsalan";
}

export function isSharedWorkspaceEmail(email: string): boolean {
  const id = emailToLegacyUserId(email);
  return id === "arsalan" || id === "ali";
}
