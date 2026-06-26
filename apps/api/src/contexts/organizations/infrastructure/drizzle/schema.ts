import { pgTable, uuid, text, timestamp, unique } from 'drizzle-orm/pg-core';

export const organizationsTable = pgTable('organizations', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  taxId: text('tax_id'),
  contactEmail: text('contact_email'),
  verificationLevel: text('verification_level').notNull().default('unverified'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const organizationMembersTable = pgTable(
  'organization_members',
  {
    organizationId: uuid('organization_id').notNull(),
    userId: uuid('user_id').notNull(),
    /** OrganizationRole: 'owner' | 'member' */
    role: text('role').notNull().default('member'),
  },
  (t) => [unique('org_members_org_user_unique').on(t.organizationId, t.userId)],
);
