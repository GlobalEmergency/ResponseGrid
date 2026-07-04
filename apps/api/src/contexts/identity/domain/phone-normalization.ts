/**
 * Normalises a phone number for matching by stripping every non-digit character
 * (spaces, dashes, parentheses, dots and the leading `+`). Deliberately simple —
 * NOT full E.164 parsing: it covers the "clean common formats" scope of #315 so
 * a number stored as `+58 412 555 0101` matches an input `+584125550101` or
 * `0412-555-0101`. Two numbers are considered the same iff their digit strings
 * are equal.
 */
export function normalizePhone(raw: string): string {
  return raw.replace(/[^0-9]/g, '');
}
