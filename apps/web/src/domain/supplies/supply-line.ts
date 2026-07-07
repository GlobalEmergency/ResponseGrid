import type { components } from '@responsegrid/api-client';
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
  /** Presentation / route of administration (health vertical, #61). Free-form. */
  presentation?: string;
  expiresAt?: string;
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

/**
 * The full set of per-line fields, before assembly into the wire DTO. Listing
 * every field here (all required) is the single source of truth for the SHAPE
 * of a supply line: add a field to `SupplyLineDto` and neither `toDto` (trusted
 * editor path) nor `parseSupplyLines` (untrusted re-parse path) will compile
 * until both pass it — so the two serializers can never silently drift (the bug
 * that dropped `presentation`, #61). Optional-value fields are `unknown` so this
 * is also the one place that narrows/trims them.
 */
export interface SupplyLineFields {
  name: string;
  quantity: number;
  category: string;
  unit: unknown;
  supplyId: unknown;
  presentation: unknown;
  expiresAt: unknown;
}

const trimmed = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** Assemble a clean {@link SupplyLineDto}: trim strings and drop empty optionals. */
export function buildSupplyLineDto(f: SupplyLineFields): SupplyLineDto {
  const unit = trimmed(f.unit);
  const supplyId = trimmed(f.supplyId);
  const presentation = trimmed(f.presentation);
  const expiresAt = trimmed(f.expiresAt);
  return {
    name: f.name.trim(),
    quantity: f.quantity,
    category: f.category as SupplyLineDto['category'],
    ...(unit !== '' ? { unit } : {}),
    ...(supplyId !== '' ? { supplyId } : {}),
    ...(presentation !== '' ? { presentation } : {}),
    ...(expiresAt !== '' ? { expiresAt } : {}),
  };
}

/** Serialize a (complete) editor line to the API request shape. */
export function toDto(line: SupplyLine): SupplyLineDto {
  return buildSupplyLineDto({
    name: line.name,
    quantity: line.quantity,
    category: line.category,
    unit: line.unit,
    supplyId: line.supplyId,
    presentation: line.presentation,
    expiresAt: line.expiresAt,
  });
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
