/**
 * Validates internal redirect paths to prevent open redirects.
 * Accepts only same-origin relative paths with a single leading slash.
 */
export function isSafeInternalRedirect(path: string | null | undefined): path is string {
  if (!path || typeof path !== "string") return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.includes("\\")) return false;
  if (path.includes("@")) return false;
  return true;
}

export function resolveSafeRedirect(
  path: string | null | undefined,
  fallback = "/dashboard"
): string {
  return isSafeInternalRedirect(path) ? path : fallback;
}
