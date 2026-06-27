import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const templatesTable = pgTable('templates', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  dontBringList: text('dont_bring_list').array().notNull().default([]),
  defaultAnnouncement: text('default_announcement'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});
