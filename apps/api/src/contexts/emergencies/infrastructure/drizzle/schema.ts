import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';

export const emergenciesTable = pgTable('emergencies', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  country: text('country').notNull(),
  status: text('status').notNull(),
  announcement: text('announcement'),
  dontBringList: text('dont_bring_list').array().notNull().default([]),
  resourceDisputeThreshold: integer('resource_dispute_threshold'),
  autoHideOnDispute: boolean('auto_hide_on_dispute').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
