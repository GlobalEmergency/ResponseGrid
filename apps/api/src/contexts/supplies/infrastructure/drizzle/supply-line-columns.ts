import { text, integer } from 'drizzle-orm/pg-core';
import { Category } from '../../domain/category';
import { SupplyLineSnapshot } from '../../domain/supply-line';

/**
 * The shared Drizzle columns of a supply line — the canonical material line of
 * the platform: `name + quantity + unit + category + presentation`. Spread into
 * every `*_items` child table (`need_items`, `resource_items`, `offer_items`,
 * `donation_intake_lines`) so the column set can never drift across contexts.
 *
 * A factory (not a shared constant) so each table gets its own fresh column
 * builders.
 */
export function supplyLineColumns() {
  return {
    name: text('name').notNull(),
    quantity: integer('quantity').notNull(),
    unit: text('unit'),
    category: text('category').notNull(),
    presentation: text('presentation'),
  };
}

/** Structural shape of a persisted supply-line row (the columns above). */
export interface SupplyLineRow {
  name: string;
  quantity: number;
  unit: string | null;
  category: string;
  presentation: string | null;
}

/** Map a persisted row to the canonical {@link SupplyLineSnapshot}. */
export function rowToSupplyLineSnapshot(
  row: SupplyLineRow,
): SupplyLineSnapshot {
  return {
    name: row.name,
    quantity: row.quantity,
    unit: row.unit ?? null,
    category: row.category as Category,
    presentation: row.presentation ?? null,
  };
}

/** Map a supply line to its persisted columns (the caller adds `id` + the FK). */
export function supplyLineToColumns(line: SupplyLineSnapshot): SupplyLineRow {
  return {
    name: line.name,
    quantity: line.quantity,
    unit: line.unit,
    category: line.category,
    presentation: line.presentation ?? null,
  };
}
