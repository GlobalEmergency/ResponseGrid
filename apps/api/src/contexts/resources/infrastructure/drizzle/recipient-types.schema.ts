import { pgTable, text, integer } from 'drizzle-orm/pg-core';

/**
 * Taxonomía extensible de tipos de destinatario final (#62).
 * `slug` es la clave estable referenciada por `resources.recipient_type` (#60).
 */
export const recipientTypesTable = pgTable('recipient_types', {
  slug: text('slug').primaryKey(),
  labelEs: text('label_es').notNull(),
  labelEn: text('label_en').notNull(),
  sort: integer('sort').notNull().default(0),
});
