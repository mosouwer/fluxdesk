/**
 * Sanitizes a workspace slug:
 * Converts to lowercase, strips non-alphanumeric characters, replaces whitespace/underscores with hyphens,
 * collapses consecutive hyphens, and removes leading/trailing hyphens.
 */
export function sanitizeSlug(rawSlug: string): string {
  if (!rawSlug) return "";
  return rawSlug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
