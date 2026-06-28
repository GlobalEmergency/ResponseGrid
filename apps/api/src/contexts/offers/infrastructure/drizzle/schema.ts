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

/**
 * Lines of material an offer commits to deliver — the same shape as
 * `need_items` / `resource_items` / `donation_intake_lines` (the shared
 * SupplyLine model). FK with cascade delete so lines disappear with their offer.
 */
export const offerItemsTable = pgTable('offer_items', {
  id: uuid('id').primaryKey(),
  offerId: uuid('offer_id')
    .notNull()
    .references(() => offersTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  quantity: integer('quantity').notNull(),
  unit: text('unit'),
  category: text('category').notNull(),
  presentation: text('presentation'),
});
