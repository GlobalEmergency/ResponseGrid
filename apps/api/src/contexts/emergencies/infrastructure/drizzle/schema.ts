import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const emergenciesTable = pgTable('emergencies', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  country: text('country').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});
