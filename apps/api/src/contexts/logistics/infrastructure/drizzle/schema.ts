import {
  pgTable,
  uuid,
  text,
  timestamp,
  doublePrecision,
  jsonb,
} from 'drizzle-orm/pg-core';
import { CoverageProps } from '../../domain/coverage';
import { SupplyLineSnapshot } from '../../../supplies/domain/supply-line';

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

export const shipmentsTable = pgTable('shipments', {
  id: uuid('id').primaryKey(),
  emergencyId: uuid('emergency_id').notNull(),
  // Route between two resource nodes (no FK — cross-context to resources).
  originResourceId: uuid('origin_resource_id').notNull(),
  destinationResourceId: uuid('destination_resource_id').notNull(),
  // Loose cargo lines (canonical SupplyLine, #141) stored as JSONB.
  items: jsonb('items').$type<SupplyLineSnapshot[]>().notNull(),
  // Trackable containers (#140/#141) loaded onto the expedition. No FK —
  // cross-context to supplies; the holder lives on the Container aggregate.
  containerIds: uuid('container_ids').array().notNull(),
  // Optional ref to a TransportCapacity (#105). No FK (assigned late, nullable).
  assignedCapacityId: uuid('assigned_capacity_id'),
  // Optional polymorphic carrier (no FK): 'volunteer' | 'organization'. Null on
  // an internal inventory transfer.
  carrierType: text('carrier_type'),
  carrierId: uuid('carrier_id'),
  // Free-text cargo manifest note (pragmatic; structured lines live in `items`).
  manifest: text('manifest'),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});
