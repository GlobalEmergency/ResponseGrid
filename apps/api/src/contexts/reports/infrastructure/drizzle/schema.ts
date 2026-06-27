import {
  pgTable,
  uuid,
  text,
  timestamp,
  doublePrecision,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';

export const reportsTable = pgTable('reports', {
  id: uuid('id').primaryKey(),
  emergencyId: uuid('emergency_id').notNull(),
  resourceId: uuid('resource_id'),
  reporterUserId: uuid('reporter_user_id').notNull(),
  type: text('type').notNull(),
  note: text('note').notNull(),
  photoUrls: text('photo_urls').array().notNull().default([]),
  priority: text('priority').notNull(),
  status: text('status').notNull(),
  locationAddress: text('location_address'),
  locationLatitude: doublePrecision('location_latitude'),
  locationLongitude: doublePrecision('location_longitude'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  // Structural SAR fields (nullable; only populated for structural_damage / trapped_persons types)
  damageLevel: text('damage_level'),
  trappedPersonsEstimate: integer('trapped_persons_estimate'),
  accessibleForRescue: boolean('accessible_for_rescue'),
  buildingType: text('building_type'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  publishNote: text('publish_note'),
});
