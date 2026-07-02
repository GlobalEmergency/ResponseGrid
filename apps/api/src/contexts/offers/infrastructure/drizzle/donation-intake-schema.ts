import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { supplyLineColumns } from '../../../supplies/infrastructure/drizzle/supply-line-columns';
import { suppliesTable } from '../../../supplies/infrastructure/drizzle/schema';

export const donationIntakesTable = pgTable('donation_intakes', {
  id: uuid('id').primaryKey(),
  emergencyId: uuid('emergency_id').notNull(),
  targetResourceId: uuid('target_resource_id').notNull(),
  intakeCode: text('intake_code').notNull(),
  status: text('status').notNull(),
  donorName: text('donor_name').notNull(),
  donorPhone: text('donor_phone'),
  donorEmail: text('donor_email'),
  donorUserId: uuid('donor_user_id'),
  contactNormalized: text('contact_normalized').notNull(),
  volunteerNotes: text('volunteer_notes'),
  evidenceFileKey: text('evidence_file_key'),
  receptionAdjustmentReason: text('reception_adjustment_reason'),
  receivedAt: timestamp('received_at', { withTimezone: true }),
  receivedByUserId: uuid('received_by_user_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const donationIntakeLinesTable = pgTable('donation_intake_lines', {
  id: uuid('id').primaryKey(),
  intakeId: uuid('intake_id')
    .notNull()
    .references(() => donationIntakesTable.id, { onDelete: 'cascade' }),
  ...supplyLineColumns(
    uuid('supply_id').references(() => suppliesTable.id, {
      onDelete: 'set null',
    }),
  ),
  sortOrder: integer('sort_order').notNull().default(0),
});
