import {
  pgTable,
  uuid,
  text,
  timestamp,
  doublePrecision,
  jsonb,
} from 'drizzle-orm/pg-core';
import { CoverageProps } from '../../domain/coverage';

export const transportCapacitiesTable = pgTable('transport_capacities', {
  id: uuid('id').primaryKey(),
  emergencyId: uuid('emergency_id').notNull(),
  // Polymorphic provider (no FK, like grants' principal): 'volunteer' | 'organization'.
  providerType: text('provider_type').notNull(),
  providerId: uuid('provider_id').notNull(),
  mode: text('mode').notNull(),
  // Capacity: at least one of the two is non-null (enforced in the domain).
  weightKg: doublePrecision('weight_kg'),
  volumeM3: doublePrecision('volume_m3'),
  // Coverage: discriminated value object (corridor | area) stored as JSONB.
  coverage: jsonb('coverage').$type<CoverageProps>().notNull(),
  // Availability window (both ends optional).
  windowFrom: timestamp('window_from', { withTimezone: true }),
  windowTo: timestamp('window_to', { withTimezone: true }),
  // Free-form constraints (e.g. refrigerated, hazmat).
  constraints: text('constraints').array().notNull(),
  status: text('status').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});
