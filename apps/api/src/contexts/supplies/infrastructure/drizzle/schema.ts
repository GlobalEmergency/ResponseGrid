import { pgTable, text, integer, AnyPgColumn } from 'drizzle-orm/pg-core';

export const categoriesTable = pgTable('categories', {
  slug: text('slug').primaryKey(),
  labelEs: text('label_es').notNull(),
  labelEn: text('label_en').notNull(),
  /** Self-referential FK: nullable, references parent category */
  parentSlug: text('parent_slug').references(
    (): AnyPgColumn => categoriesTable.slug,
  ),
  vertical: text('vertical').notNull().default('general'),
  sort: integer('sort').notNull().default(0),
});

export const categoryAliasesTable = pgTable('category_aliases', {
  aliasNorm: text('alias_norm').primaryKey(),
  categorySlug: text('category_slug')
    .notNull()
    .references(() => categoriesTable.slug),
});
