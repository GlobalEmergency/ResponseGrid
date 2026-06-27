import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  doublePrecision,
  index,
} from 'drizzle-orm/pg-core';

export const missingPersonReportsTable = pgTable(
  'missing_person_reports',
  {
    id: uuid('id').primaryKey(),
    emergencyId: uuid('emergency_id').notNull(),
    // Person fields
    personFirstName: text('person_first_name').notNull(),
    personLastName: text('person_last_name').notNull(),
    personDocumentId: text('person_document_id'),
    personApproximateAge: integer('person_approximate_age'),
    personLastKnownLocation: text('person_last_known_location').notNull(),
    personLastKnownCoordsAddress: text('person_last_known_coords_address'),
    personLastKnownCoordsLat: doublePrecision('person_last_known_coords_lat'),
    personLastKnownCoordsLon: doublePrecision('person_last_known_coords_lon'),
    personDescription: text('person_description'),
    // Reporter fields
    reporterUserId: uuid('reporter_user_id'),
    reporterName: text('reporter_name').notNull(),
    reporterPhone: text('reporter_phone').notNull(),
    reporterEmail: text('reporter_email'),
    // Status / metadata
    status: text('status').notNull().default('open'),
    consentGiven: boolean('consent_given').notNull().default(false),
    photoUrl: text('photo_url'),
    reviewedByUserId: uuid('reviewed_by_user_id'),
    matchNote: text('match_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('idx_missing_person_reports_emergency_status').on(
      t.emergencyId,
      t.status,
    ),
    index('idx_missing_person_reports_document_id').on(t.personDocumentId),
  ],
);

export const sightingsTable = pgTable(
  'sightings',
  {
    id: uuid('id').primaryKey(),
    reportId: uuid('report_id')
      .notNull()
      .references(() => missingPersonReportsTable.id, { onDelete: 'cascade' }),
    reportedByUserId: uuid('reported_by_user_id'),
    reportedByName: text('reported_by_name'),
    location: text('location').notNull(),
    coordsAddress: text('coords_address'),
    coordsLat: doublePrecision('coords_lat'),
    coordsLon: doublePrecision('coords_lon'),
    note: text('note').notNull(),
    reportedAt: timestamp('reported_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('idx_sightings_report_id').on(t.reportId)],
);
