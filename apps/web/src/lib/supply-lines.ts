import type { components } from '@reliefhub/api-client';
// Relative + .ts extension (not the `@/` alias) so the `node --test` runner,
// which does not resolve tsconfig paths, can load this value import.
import { buildSupplyLineDto } from '../domain/supplies/supply-line.ts';

type SupplyLineDto = components['schemas']['SupplyLineDto'];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Parse the supply lines serialized by a SupplyLine editor (a JSON array in a
 * hidden `items` input) into the typed request shape. Returns `null` on a
 * malformed/tampered payload so the caller can surface a validation error.
 *
 * - `isValidCategory` narrows each category against the allowed catalogue for
 *   the caller's context (e.g. all categories for needs, material-only
 *   categories for offers/inventory) — sourced from the DB category taxonomy.
 * - `allowEmpty` decides whether an absent/empty list is valid (`[]`, e.g.
 *   optional resource inventory) or an error (`null`, e.g. a need needs ≥1 item).
 */
export function parseSupplyLines(
  raw: FormDataEntryValue | null,
  opts: { isValidCategory: (c: string) => boolean; allowEmpty: boolean },
): SupplyLineDto[] | null {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return opts.allowEmpty ? [] : null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  if (parsed.length === 0) return opts.allowEmpty ? [] : null;

  const items: SupplyLineDto[] = [];
  for (const entry of parsed) {
    if (typeof entry !== 'object' || entry === null) return null;
    const { name, quantity, unit, category, supplyId, presentation, expiresAt } =
      entry as Record<string, unknown>;
    if (typeof name !== 'string' || name.trim() === '') return null;
    if (
      typeof quantity !== 'number' ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      return null;
    }
    if (typeof category !== 'string' || !opts.isValidCategory(category)) {
      return null;
    }
    if (
      expiresAt !== undefined &&
      expiresAt !== null &&
      (typeof expiresAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(expiresAt))
    ) {
      return null;
    }
    if (
      supplyId !== undefined &&
      supplyId !== null &&
      (typeof supplyId !== 'string' || !UUID_RE.test(supplyId.trim()))
    ) {
      return null;
    }
    if (
      presentation !== undefined &&
      presentation !== null &&
      typeof presentation !== 'string'
    ) {
      return null;
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
  return items;
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
