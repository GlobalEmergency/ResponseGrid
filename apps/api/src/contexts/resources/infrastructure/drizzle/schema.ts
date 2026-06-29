import {
  pgTable,
  uuid,
  text,
  timestamp,
  doublePrecision,
  jsonb,
  boolean,
} from 'drizzle-orm/pg-core';
import { supplyLineColumns } from '../../../supplies/infrastructure/drizzle/supply-line-columns';
import { AuthorSnapshot } from '../../../../shared/domain/author';

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
  // validez reportada por ciudadanos (0031_resource_validity_reports):
  // `disputed` = varios ciudadanos lo han reportado como cerrado/inexistente/…
  disputed: boolean('disputed').notNull().default(false),
  disputedAt: timestamp('disputed_at', { withTimezone: true }),
  /** Restricted self-reported author attribution (#235). Never public. */
  author: jsonb('author').$type<AuthorSnapshot>(),
});

// Reportes ciudadanos de validez de un punto (0031_resource_validity_reports):
// un usuario autenticado avisa de que un punto está cerrado/no existe/mudado/
// desactualizado. Un reporte `open` por (recurso, usuario) — índice único
// parcial; al llegar a N reportantes distintos el recurso pasa a `disputed`.
export const resourceValidityReportsTable = pgTable(
  'resource_validity_reports',
  {
    id: uuid('id').primaryKey(),
    resourceId: uuid('resource_id')
      .notNull()
      .references(() => resourcesTable.id, { onDelete: 'cascade' }),
    emergencyId: uuid('emergency_id').notNull(),
    reporterUserId: uuid('reporter_user_id').notNull(),
    reason: text('reason').notNull(),
    note: text('note'),
    photoUrls: text('photo_urls').array().notNull(),
    status: text('status').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    resolvedByUserId: uuid('resolved_by_user_id'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
);

// Inventario declarado de un recurso/lugar (0028_resource_inventory):
// líneas de insumo (SupplyLine) — qué material/productos tiene para entregar,
// con cantidad/unidad/categoría/presentación. Misma forma que need_items —
// permite el control de inventario por punto.
export const resourceItemsTable = pgTable('resource_items', {
  id: uuid('id').primaryKey(),
  resourceId: uuid('resource_id')
    .notNull()
    .references(() => resourcesTable.id, { onDelete: 'cascade' }),
  ...supplyLineColumns(),
});
