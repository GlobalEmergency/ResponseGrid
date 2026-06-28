import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';

/**
 * A group/cuadrilla. `owner_kind` + `owner_id` is a *polymorphic* parent
 * (organization OR emergency) — there is no single FK target, mirroring how
 * `grants.scope_id` is stored. See docs/features/13 §6.
 */
export const groupsTable = pgTable(
  'groups',
  {
    id: uuid('id').primaryKey(),
    name: text('name').notNull(),
    /** GroupVisibility: 'public' | 'private' */
    visibility: text('visibility').notNull().default('private'),
    /** 'organization' | 'emergency' */
    ownerKind: text('owner_kind').notNull(),
    ownerId: uuid('owner_id').notNull(),
    /** Parent group for nesting (managers of managers); unused for now. */
    parentGroupId: uuid('parent_group_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('groups_owner_idx').on(t.ownerKind, t.ownerId)],
);

export const groupMembersTable = pgTable(
  'group_members',
  {
    groupId: uuid('group_id')
      .notNull()
      .references(() => groupsTable.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    /** GroupMemberStatus: 'pending' | 'approved' */
    status: text('status').notNull().default('pending'),
    addedByUserId: uuid('added_by_user_id'),
  },
  (t) => [
    primaryKey({ columns: [t.groupId, t.userId] }),
    index('group_members_group_idx').on(t.groupId),
  ],
);
