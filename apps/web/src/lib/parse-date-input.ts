/**
 * Convert an `<input type="date">` value to an ISO timestamp.
 *
 * Returns null for an empty string or an invalid date so callers can omit the
 * field instead of sending a broken expiry.
 */
export function parseDateInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
