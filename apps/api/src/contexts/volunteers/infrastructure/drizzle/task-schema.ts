import {
  pgTable,
  uuid,
  text,
  timestamp,
  doublePrecision,
} from 'drizzle-orm/pg-core';

export const tasksTable = pgTable('tasks', {
  id: uuid('id').primaryKey(),
  emergencyId: uuid('emergency_id').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  locationAddress: text('location_address'),
  locationLatitude: doublePrecision('location_latitude'),
  locationLongitude: doublePrecision('location_longitude'),
  requiredSkill: text('required_skill'),
  status: text('status').notNull(),
  createdByUserId: uuid('created_by_user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  /** F05: link back to the Need that originated this task (no FK for test isolation) */
  linkedNeedId: uuid('linked_need_id'),
});

export const taskAssignmentsTable = pgTable('task_assignments', {
  id: uuid('id').primaryKey(),
  taskId: uuid('task_id').notNull(),
  volunteerId: uuid('volunteer_id').notNull(),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull(),
  checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
  checkedOutAt: timestamp('checked_out_at', { withTimezone: true }),
  status: text('status').notNull(),
});
