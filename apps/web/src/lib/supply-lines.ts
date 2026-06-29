import type { components } from '@reliefhub/api-client';

export type SupplyLine = components['schemas']['SupplyLineDto'];

/**
 * Parse the supply lines serialized by `InventoryField` (a JSON array carried
 * in the hidden `items` input) into typed `SupplyLineDto[]`.
 *
 * Returns `null` when the payload is malformed (tampered) so the caller can
 * surface a validation error; an absent or empty payload yields `[]`.
 *
 * Framework-free and dependency-free on purpose (only a *type* import, which is
 * erased at runtime) so it is unit-testable under `node --test`. The canonical
 * category list is injected via `validCategories` rather than imported, keeping
 * the single source of truth (`lib/categories`) in the caller; when omitted the
 * function validates shape only and defers category validation to the API.
 */
export function parseSupplyLines(
  raw: unknown,
  validCategories?: readonly string[],
): SupplyLine[] | null {
  if (typeof raw !== 'string' || raw.trim() === '') return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const items: SupplyLine[] = [];
  for (const entry of parsed) {
    if (typeof entry !== 'object' || entry === null) return null;
    const { name, quantity, unit, category } = entry as Record<string, unknown>;
    if (typeof name !== 'string' || name.trim() === '') return null;
    if (
      typeof quantity !== 'number' ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      return null;
    }
    if (typeof category !== 'string' || category.trim() === '') return null;
    if (validCategories !== undefined && !validCategories.includes(category)) {
      return null;
    }
    items.push({
      name: name.trim(),
      quantity,
      category: category as SupplyLine['category'],
      ...(typeof unit === 'string' && unit.trim() !== ''
        ? { unit: unit.trim() }
        : {}),
    });
  }
  return items;
}
