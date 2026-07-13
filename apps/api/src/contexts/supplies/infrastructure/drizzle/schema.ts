import {
  pgTable,
  text,
  integer,
  boolean,
  uuid,
  jsonb,
  doublePrecision,
  timestamp,
  AnyPgColumn,
  index,
  primaryKey,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { SupplyLineSnapshot } from '@globalemergency/warehouse-core/kernel';
import { AttributeOption } from '@globalemergency/warehouse-core/catalog';

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
  codePrefix: text('code_prefix'),
  kind: text('kind').notNull().default('material'),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

export const categoryAliasesTable = pgTable('category_aliases', {
  aliasNorm: text('alias_norm').primaryKey(),
  categorySlug: text('category_slug')
    .notNull()
    .references(() => categoriesTable.slug),
});

export const categoryTranslationsTable = pgTable(
  'category_translations',
  {
    categorySlug: text('category_slug')
      .notNull()
      .references(() => categoriesTable.slug, { onDelete: 'cascade' }),
    locale: text('locale').notNull(),
    label: text('label').notNull(),
  },
  (t) => [
    primaryKey({
      columns: [t.categorySlug, t.locale],
      name: 'category_translations_category_slug_locale_pk',
    }),
    index('category_translations_locale_idx').on(t.locale),
  ],
);

export const suppliesTable = pgTable(
  'supplies',
  {
    id: uuid('id').primaryKey(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    status: text('status').notNull().default('active'),
    registrationNotes: text('registration_notes'),
    categorySlug: text('category_slug')
      .notNull()
      .references(() => categoriesTable.slug),
    defaultUnit: text('default_unit'),
    attributes: jsonb('attributes').notNull().default({}),
    variantOfId: uuid('variant_of_id').references(
      (): AnyPgColumn => suppliesTable.id,
      { onDelete: 'set null' },
    ),
    /** Tenencia (#397): null = fila global · set = extensión de un tenant. */
    scopeId: uuid('scope_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    // Unicidad de `code` por scope (#397, migración 0056): par de índices
    // parciales — global (scope_id IS NULL) + por tenant (code, scope_id).
    uniqueIndex('supplies_code_global_uniq')
      .on(t.code)
      .where(sql`${t.scopeId} IS NULL`),
    uniqueIndex('supplies_code_scope_uniq')
      .on(t.code, t.scopeId)
      .where(sql`${t.scopeId} IS NOT NULL`),
    index('supplies_category_slug_idx').on(t.categorySlug),
    index('supplies_variant_of_id_idx').on(t.variantOfId),
    index('supplies_scope_id_idx').on(t.scopeId),
  ],
);

/**
 * Metamodelo de atributos data-driven (#396): describe los campos tipados de
 * cada familia (nodo de `categories`, con herencia). Los valores viven en el
 * `attributes` jsonb de `supplies`, validados contra la unión de definiciones
 * de la ascendencia de su categoría. `scopeId` null = global (Inc 1). El índice
 * único parcial (categoría, key) WHERE scope_id IS NULL vive en la migración
 * 0055.
 */
export const attributeDefinitionsTable = pgTable(
  'attribute_definitions',
  {
    id: uuid('id').primaryKey(),
    categorySlug: text('category_slug')
      .notNull()
      .references(() => categoriesTable.slug),
    key: text('key').notNull(),
    dataType: text('data_type').notNull(),
    required: boolean('required').notNull().default(false),
    options: jsonb('options').$type<AttributeOption[]>(),
    unit: text('unit'),
    sort: integer('sort').notNull().default(0),
    scopeId: uuid('scope_id'),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index('attribute_definitions_category_slug_idx').on(t.categorySlug),
    // Unicidad por scope: global (categoría,key) WHERE scope_id IS NULL en 0055;
    // por tenant (categoría,key,scope_id) WHERE scope_id IS NOT NULL en 0056 (#397).
    uniqueIndex('attribute_definitions_global_category_key_uniq')
      .on(t.categorySlug, t.key)
      .where(sql`${t.scopeId} IS NULL`),
    uniqueIndex('attribute_definitions_scope_category_key_uniq')
      .on(t.categorySlug, t.key, t.scopeId)
      .where(sql`${t.scopeId} IS NOT NULL`),
  ],
);

export const supplyAliasesTable = pgTable(
  'supply_aliases',
  {
    aliasNorm: text('alias_norm').notNull(),
    supplyId: uuid('supply_id')
      .notNull()
      .references(() => suppliesTable.id, { onDelete: 'cascade' }),
    /** Tenencia (#397): null = alias global · set = alias de un tenant. */
    scopeId: uuid('scope_id'),
  },
  (t) => [
    index('supply_aliases_supply_id_idx').on(t.supplyId),
    // Unicidad del alias normalizado por scope (#397, migración 0056): par de
    // índices parciales — global (alias_norm) + por tenant (alias_norm, scope_id).
    // Reemplaza la PRIMARY KEY global sobre alias_norm de 0037.
    uniqueIndex('supply_aliases_alias_global_uniq')
      .on(t.aliasNorm)
      .where(sql`${t.scopeId} IS NULL`),
    uniqueIndex('supply_aliases_alias_scope_uniq')
      .on(t.aliasNorm, t.scopeId)
      .where(sql`${t.scopeId} IS NOT NULL`),
    index('supply_aliases_scope_id_idx').on(t.scopeId),
  ],
);

export const supplyTranslationsTable = pgTable(
  'supply_translations',
  {
    supplyId: uuid('supply_id')
      .notNull()
      .references(() => suppliesTable.id, { onDelete: 'cascade' }),
    locale: text('locale').notNull(),
    name: text('name').notNull(),
  },
  (t) => [
    primaryKey({
      columns: [t.supplyId, t.locale],
      name: 'supply_translations_supply_id_locale_pk',
    }),
    index('supply_translations_locale_idx').on(t.locale),
  ],
);

/**
 * Trackable packaging units (palet/caja/lote) — #140. Composition is by
 * reference via the self-FK `parent_container_id` (ON DELETE SET NULL: deleting
 * a parent un-nests its children). Direct content is the SupplyLine[] jsonb;
 * the polymorphic holder (resource|shipment, no FK) records where it is now.
 */
export const containersTable = pgTable('containers', {
  id: uuid('id').primaryKey(),
  emergencyId: uuid('emergency_id').notNull(),
  // Generated legible code / QR payload (e.g. PAL-0001). Unique per emergency.
  code: text('code').notNull(),
  type: text('type').notNull(),
  parentContainerId: uuid('parent_container_id').references(
    (): AnyPgColumn => containersTable.id,
    { onDelete: 'set null' },
  ),
  // Loose supply lines held directly in this container (VO from #131).
  lines: jsonb('lines').$type<SupplyLineSnapshot[]>().notNull(),
  // Declared gross weight/volume (not yet derived from a catalogue).
  grossWeightKg: doublePrecision('gross_weight_kg'),
  grossVolumeM3: doublePrecision('gross_volume_m3'),
  // Polymorphic holder (no FK): 'resource' | 'shipment'. Null when held by none.
  holderType: text('holder_type'),
  holderId: uuid('holder_id'),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

/**
 * Monotonic per-(emergency, type) allocator for container codes. An atomic
 * upsert (`INSERT … ON CONFLICT (emergency_id, type) DO UPDATE SET
 * last_value = last_value + 1 RETURNING last_value`) hands out the next value,
 * so concurrent creates never mint the same code and a deleted container never
 * frees its code for reuse — keeping `containers.code` unique per emergency.
 * The composite primary key (emergency_id, type) lives in migration 0033.
 */
export const containerCodeSequencesTable = pgTable('container_code_sequences', {
  emergencyId: uuid('emergency_id').notNull(),
  type: text('type').notNull(),
  lastValue: integer('last_value').notNull(),
});
