/**
 * Convert an `<input type="date">` value to an ISO timestamp.
 *
 * All callers use this for *expiries*, and a date-only value means "valid through
 * that whole day". So a bare `YYYY-MM-DD` is pinned to the END of the day (UTC)
 * rather than `00:00`: otherwise picking today would produce an already-expired
 * value, and picking any day would cut the credential off a day early for users
 * west of UTC. A full timestamp (already carrying a time) is parsed as-is.
 *
 * Returns null for an empty string or an invalid date so callers can omit the
 * field instead of sending a broken expiry.
 */
export function parseDateInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  const date = new Date(dateOnly ? `${trimmed}T23:59:59.999Z` : trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
