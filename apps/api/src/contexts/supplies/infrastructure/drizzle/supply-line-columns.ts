import { integer, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { Category } from '../../domain/category';
import { SupplyLineSnapshot } from '../../domain/supply-line';

/**
 * The shared Drizzle columns of a supply line — the canonical material line of
 * the platform: name + quantity + unit + category + supplyId + presentation +
 * expiresAt.
 * Spread into every `*_items` child table (`need_items`, `resource_items`,
 * `offer_items`, `donation_intake_lines`) so the column set can never drift
 * across contexts.
 *
 * A factory (not a shared constant) so each table gets its own fresh column
 * builders.
 */
export function supplyLineColumns(supplyIdColumn = uuid('supply_id')) {
  return {
    name: text('name').notNull(),
    quantity: integer('quantity').notNull(),
    unit: text('unit'),
    category: text('category').notNull(),
    supplyId: supplyIdColumn,
    presentation: text('presentation'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  };
}

/** Structural shape of a persisted supply-line row (the columns above). */
export interface SupplyLineRow {
  name: string;
  quantity: number;
  unit: string | null;
  category: string;
  supplyId: string | null;
  presentation: string | null;
  expiresAt: Date | null;
}

function supplyLineDateToDb(value: string | null | undefined): Date | null {
  if (value == null || value === '') return null;
  return new Date(`${value}T00:00:00.000Z`);
}

function supplyLineDateFromDb(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
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
    supplyId: row.supplyId ?? null,
    presentation: row.presentation ?? null,
    expiresAt: supplyLineDateFromDb(row.expiresAt),
  };
}

/** Map a supply line to its persisted columns (the caller adds `id` + the FK). */
export function supplyLineToColumns(line: SupplyLineSnapshot): SupplyLineRow {
  return {
    name: line.name,
    quantity: line.quantity,
    unit: line.unit,
    category: line.category,
    supplyId: line.supplyId ?? null,
    presentation: line.presentation ?? null,
    expiresAt: supplyLineDateToDb(line.expiresAt),
  };
}
