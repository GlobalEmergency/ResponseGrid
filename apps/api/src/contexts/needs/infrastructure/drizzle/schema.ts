import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  doublePrecision,
} from 'drizzle-orm/pg-core';

export const needsTable = pgTable('needs', {
  id: uuid('id').primaryKey(),
  emergencyId: uuid('emergency_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  address: text('address').notNull(),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  priority: text('priority').notNull(),
  requesterUserId: uuid('requester_user_id').notNull(),
  requesterOrganizationId: uuid('requester_organization_id'),
  managingOrganizationId: uuid('managing_organization_id'),
  locationSensitivity: text('location_sensitivity').notNull().default('public'),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
  /** F05: optional personnel-need fields */
  requiredSkill: text('required_skill'),
  skillSpecialty: text('skill_specialty'),
  requestedCount: integer('requested_count'),
  /** Optional link to the resource / final recipient (#60). */
  resourceId: uuid('resource_id'),
});

export const needItemsTable = pgTable('need_items', {
  id: uuid('id').primaryKey(),
  needId: uuid('need_id')
    .notNull()
    .references(() => needsTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  quantity: integer('quantity').notNull(),
  unit: text('unit'),
  category: text('category').notNull(),
});
