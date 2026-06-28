import {
  pgTable,
  uuid,
  text,
  timestamp,
  doublePrecision,
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
});
