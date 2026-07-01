import type { components } from '@reliefhub/api-client';
import type { CatalogueSupply } from '@/domain/supplies/catalogue-supply';
import type { Category } from '@/domain/supplies/category';

type SupplyLineDto = components['schemas']['SupplyLineDto'];

/**
 * SupplyLine — the frontend value object for a line of aid material (mirror of
 * the backend `SupplyLine` VO): a quantity of a named supply in a category and
 * unit, optionally soft-linked to a catalogue item (`supplyId`), with an
 * optional freshness date. `quantity` is canonical `number`; `category` is a
 * slug (`''` = not chosen yet).
 */
export interface SupplyLine {
  name: string;
  supplyId: string | null;
  quantity: number;
  unit: string;
  category: string;
  expiresAt?: string;
  // Health-vertical route/presentation (#61). Not edited in the current UIs;
  // carried through so editing a line never erases it (data-loss guard).
  presentation?: string;
}

/** A blank line seeded with the given default category slug. */
export function emptyLine(defaultCategory: string): SupplyLine {
  return { name: '', supplyId: null, quantity: 1, unit: '', category: defaultCategory };
}

/**
 * The patch a catalogue selection implies for a line: name + supplyId always;
 * category only when the supply's slug resolves to a known MATERIAL category
 * (never auto-fill a personnel category into a material line); unit only when
 * the supply declares a defaultUnit. (Resolve inlined — see plan note on
 * node:test constraints.)
 */
export function deriveFromSupply(
  s: CatalogueSupply,
  categories: readonly Category[],
): Partial<SupplyLine> {
  const patch: Partial<SupplyLine> = { name: s.name, supplyId: s.id };
  const category = categories.find((c) => c.slug === s.categorySlug);
  if (category !== undefined && category.kind === 'material') {
    patch.category = category.slug;
  }
  if (s.defaultUnit !== null && s.defaultUnit !== '') {
    patch.unit = s.defaultUnit;
  }
  return patch;
}

/** Serialize a line to the API request shape: trim, drop empty unit, pass supplyId. */
export function toDto(line: SupplyLine): SupplyLineDto {
  const name = line.name.trim();
  const unit = line.unit.trim();
  return {
    name,
    quantity: line.quantity,
    category: line.category as SupplyLineDto['category'],
    ...(line.supplyId !== null && line.supplyId !== '' ? { supplyId: line.supplyId } : {}),
    ...(unit !== '' ? { unit } : {}),
    ...(line.expiresAt !== undefined && line.expiresAt !== '' ? { expiresAt: line.expiresAt } : {}),
    ...(line.presentation !== undefined && line.presentation !== '' ? { presentation: line.presentation } : {}),
  };
}

/** A line is complete when it has a non-empty name, a positive integer quantity, and a category. */
export function isComplete(line: SupplyLine): boolean {
  return (
    line.name.trim() !== '' &&
    Number.isInteger(line.quantity) &&
    line.quantity >= 1 &&
    line.category.trim() !== ''
  );
}
