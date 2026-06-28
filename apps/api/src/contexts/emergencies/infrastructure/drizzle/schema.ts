import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const emergenciesTable = pgTable('emergencies', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  country: text('country').notNull(),
  status: text('status').notNull(),
  announcement: text('announcement'),
  dontBringList: text('dont_bring_list').array().notNull().default([]),
  recommendedList: text('recommended_list').array().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
