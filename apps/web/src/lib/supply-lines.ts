import type { components } from '@reliefhub/api-client';
// Relative + .ts extension (not the `@/` alias) so the `node --test` runner,
// which does not resolve tsconfig paths, can load this value import.
import { buildSupplyLineDto } from '../domain/supplies/supply-line.ts';

type SupplyLineDto = components['schemas']['SupplyLineDto'];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Result of {@link parseSupplyLines}: either the parsed items, or the index of
 * the first invalid row so the caller can point the user at it (#296) instead
 * of a generic "something in here is wrong". `invalidRow: -1` means the
 * failure isn't tied to a specific row (malformed JSON, a non-array root, or
 * a required-but-empty list) — callers should fall back to a generic message.
 */
export type ParsedSupplyLines = { items: SupplyLineDto[] } | { invalidRow: number };

/**
 * Parse the supply lines serialized by a SupplyLine editor (a JSON array in a
 * hidden `items` input) into the typed request shape. Returns `{ invalidRow }`
 * on a malformed/tampered payload so the caller can surface a validation error
 * (and, when it's row-specific, highlight that row — #296).
 *
 * - `isValidCategory` narrows each category against the allowed catalogue for
 *   the caller's context (e.g. all categories for needs, material-only
 *   categories for offers/inventory) — sourced from the DB category taxonomy.
 * - `allowEmpty` decides whether an absent/empty list is valid (`{ items: [] }`,
 *   e.g. optional resource inventory) or an error (e.g. a need needs ≥1 item).
 */
export function parseSupplyLines(
  raw: FormDataEntryValue | null,
  opts: { isValidCategory: (c: string) => boolean; allowEmpty: boolean },
): ParsedSupplyLines {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return opts.allowEmpty ? { items: [] } : { invalidRow: -1 };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { invalidRow: -1 };
  }
  if (!Array.isArray(parsed)) return { invalidRow: -1 };
  if (parsed.length === 0) return opts.allowEmpty ? { items: [] } : { invalidRow: -1 };

  const items: SupplyLineDto[] = [];
  for (const [index, entry] of parsed.entries()) {
    if (typeof entry !== 'object' || entry === null) return { invalidRow: index };
    const { name, quantity, unit, category, supplyId, presentation, expiresAt } =
      entry as Record<string, unknown>;
    if (typeof name !== 'string' || name.trim() === '') return { invalidRow: index };
    if (
      typeof quantity !== 'number' ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      return { invalidRow: index };
    }
    if (typeof category !== 'string' || !opts.isValidCategory(category)) {
      return { invalidRow: index };
    }
    if (
      expiresAt !== undefined &&
      expiresAt !== null &&
      (typeof expiresAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(expiresAt))
    ) {
      return { invalidRow: index };
    }
    if (
      supplyId !== undefined &&
      supplyId !== null &&
      (typeof supplyId !== 'string' || !UUID_RE.test(supplyId.trim()))
    ) {
      return { invalidRow: index };
    }
    if (
      presentation !== undefined &&
      presentation !== null &&
      typeof presentation !== 'string'
    ) {
      return { invalidRow: index };
    }
    // Validation (above) is the untrusted-input boundary; assembly/trim/drop-empty
    // is shared with the editor path via buildSupplyLineDto so the shape can't drift.
    items.push(
      buildSupplyLineDto({
        name,
        quantity,
        category,
        unit,
        supplyId,
        presentation,
        expiresAt,
      }),
    );
  }
  return { items };
}

/** Short title for a list of supply lines: the first name, "+N" when more. */
export function offerTitle(items: readonly { name: string }[]): string {
  if (items.length === 0) return '—';
  if (items.length === 1) return items[0].name;
  return `${items[0].name} +${items.length - 1}`;
}

/** "qty unit" (unit optional) for a supply line. */
export function quantityLabel(item: {
  quantity: number;
  unit?: string | null;
}): string {
  const unit =
    typeof item.unit === 'string' && item.unit !== '' ? ` ${item.unit}` : '';
  return `${item.quantity}${unit}`;
}

/** "name · qty unit" for a single supply line. */
export function lineSummary(item: {
  name: string;
  quantity: number;
  unit?: string | null;
}): string {
  return `${item.name} · ${quantityLabel(item)}`;
}
