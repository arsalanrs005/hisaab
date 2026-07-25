/**
 * Escape user input for PostgREST filter strings (especially `.or()`).
 */
export function escapePostgrestFilter(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

export function escapeIlikePattern(value: string): string {
  return escapePostgrestFilter(value);
}
