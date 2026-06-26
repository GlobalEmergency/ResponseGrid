import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  doublePrecision,
} from 'drizzle-orm/pg-core';

export const offersTable = pgTable('offers', {
  id: uuid('id').primaryKey(),
  emergencyId: uuid('emergency_id').notNull(),
  donorUserId: uuid('donor_user_id').notNull(),
  donorOrganizationId: uuid('donor_organization_id'),
  category: text('category').notNull(),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull(),
  unit: text('unit'),
  address: text('address').notNull(),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  targetNeedId: uuid('target_need_id'),
  matchedNeedId: uuid('matched_need_id'),
  status: text('status').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});
