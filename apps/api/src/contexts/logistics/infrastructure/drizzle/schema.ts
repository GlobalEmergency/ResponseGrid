import {
  pgTable,
  uuid,
  text,
  timestamp,
  doublePrecision,
  boolean,
} from 'drizzle-orm/pg-core';

export const transportCapacitiesTable = pgTable('transport_capacities', {
  id: uuid('id').primaryKey(),
  emergencyId: uuid('emergency_id').notNull(),
  providerType: text('provider_type').notNull(),
  providerId: uuid('provider_id').notNull(),
  mode: text('mode').notNull(),
  weightKg: doublePrecision('weight_kg'),
  volumeM3: doublePrecision('volume_m3'),
  originMunicipality: text('origin_municipality').notNull(),
  destinationMunicipality: text('destination_municipality'),
  availableFrom: timestamp('available_from', { withTimezone: true }).notNull(),
  availableUntil: timestamp('available_until', { withTimezone: true }),
  refrigerated: boolean('refrigerated').notNull(),
  notes: text('notes'),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});
