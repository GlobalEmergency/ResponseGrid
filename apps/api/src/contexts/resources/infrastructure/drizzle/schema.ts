import {
  pgTable,
  uuid,
  text,
  timestamp,
  doublePrecision,
  jsonb,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';

export const resourcesTable = pgTable('resources', {
  id: uuid('id').primaryKey(),
  emergencyId: uuid('emergency_id').notNull(),
  type: text('type').notNull(),
  stage: text('stage').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  address: text('address').notNull(),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  ownerUserId: uuid('owner_user_id').notNull(),
  ownerOrganizationId: uuid('owner_organization_id'),
  verificationLevel: text('verification_level').notNull(),
  publicStatus: text('public_status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  // enriched fields (0018_resources_enrich)
  contact: text('contact'),
  schedule: text('schedule'),
  manager: text('manager'),
  accepts: text('accepts').array(),
  sourceName: text('source_name'),
  externalId: text('external_id'),
  externalUpdatedAt: timestamp('external_updated_at', { withTimezone: true }),
  country: text('country'),
  city: text('city'),
  raw: jsonb('raw'),
  // destinatario final (0023_resource_recipient_role)
  isFinalRecipient: boolean('is_final_recipient').notNull().default(false),
  recipientType: text('recipient_type'),
});

// Inventario declarado de un recurso/lugar (0028_resource_inventory):
// líneas de insumo (SupplyLine) — qué material/productos tiene para entregar,
// con cantidad/unidad/categoría/presentación. Misma forma que need_items —
// permite el control de inventario por punto.
export const resourceItemsTable = pgTable('resource_items', {
  id: uuid('id').primaryKey(),
  resourceId: uuid('resource_id')
    .notNull()
    .references(() => resourcesTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  quantity: integer('quantity').notNull(),
  unit: text('unit'),
  category: text('category').notNull(),
  presentation: text('presentation'),
});
