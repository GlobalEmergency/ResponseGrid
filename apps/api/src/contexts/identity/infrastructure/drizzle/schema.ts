import {
  pgTable,
  uuid,
  text,
  boolean,
  unique,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

export const usersTable = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  /** Nullable: social-only accounts have no password */
  passwordHash: text('password_hash'),
  name: text('name').notNull(),
  isAdmin: boolean('is_admin').notNull().default(false),
  /** Optional contact phone (migration 0035). */
  phone: text('phone'),
  /** Registration date (migration 0032). */
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  /** Last successful login; null until the user logs in (migration 0032). */
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
});

/**
 * Versioned record of the legal documents a user has accepted (Terms of
 * Service, Privacy Policy). One row per acceptance so we keep *when* and *which
 * version* was accepted (migration 0038). Required for every account.
 */
export const userConsentsTable = pgTable(
  'user_consents',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    /** 'terms' | 'privacy' */
    document: text('document').notNull(),
    /** Published version of the document that was accepted, e.g. '2026-07-01'. */
    version: text('version').notNull(),
    /** Request IP at the moment of acceptance (audit). Nullable. */
    ip: text('ip'),
    /** Request User-Agent at the moment of acceptance (audit). Nullable. */
    userAgent: text('user_agent'),
    /**
     * Service account that recorded this acceptance on the user's behalf when it
     * came through a trusted channel/bot instead of a browser (#315, migration
     * 0054). Null for the normal web flows. No FK — historical trace survives SA
     * deletion.
     */
    serviceAccountId: uuid('service_account_id'),
    acceptedAt: timestamp('accepted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('user_consents_user_idx').on(t.userId)],
);

/**
 * Single-use, expiring tokens that let a passwordless profile set its password
 * (#204). Only the SHA-256 hash of the secret is stored — a DB read never yields
 * a usable token. A token is spent by stamping `used_at`; validity is
 * `used_at IS NULL AND expires_at > now()` (migration 0059).
 */
export const passwordSetupTokensTable = pgTable(
  'password_setup_tokens',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    /** SHA-256 hex of the raw token; unique so a lookup is an indexed equality. */
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('password_setup_tokens_user_idx').on(t.userId)],
);

export const membershipsTable = pgTable(
  'memberships',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    /** NOTE: no FK to emergencies.id — e2e tests insert memberships with
     *  emergency UUIDs that may not exist in the emergencies table. */
    emergencyId: uuid('emergency_id').notNull(),
    role: text('role').notNull(),
  },
  (t) => [
    // One role per user per emergency — the upsert key is (user_id, emergency_id)
    // so that updating a role replaces the existing row rather than inserting a new one.
    unique('memberships_user_emergency_unique').on(t.userId, t.emergencyId),
  ],
);

export const userIdentitiesTable = pgTable(
  'user_identities',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    /** OAuth provider: 'google' | 'facebook' */
    provider: text('provider').notNull(),
    providerUserId: text('provider_user_id').notNull(),
  },
  (t) => [
    unique('user_identities_provider_provider_user_id_unique').on(
      t.provider,
      t.providerUserId,
    ),
  ],
);

/**
 * Polymorphic authorization grant: (principal, role, scope). Generalizes
 * memberships + organization_members + users.is_admin. See docs/features/13 §3.
 * No FK on principal_id — a principal may be a service account, not a user.
 */
export const grantsTable = pgTable(
  'grants',
  {
    id: uuid('id').primaryKey(),
    principalId: uuid('principal_id').notNull(),
    /** 'user' | 'service_account' */
    principalType: text('principal_type').notNull().default('user'),
    roleId: text('role_id').notNull(),
    /** 'platform' | 'organization' | 'emergency' | 'group' | 'entity' */
    scopeType: text('scope_type').notNull(),
    /** null for platform scope; the scope's id otherwise */
    scopeId: text('scope_id'),
    /** only populated for scope_type = 'entity' */
    scopeEntityType: text('scope_entity_type'),
    grantedByPrincipalId: uuid('granted_by_principal_id'),
    grantedAt: timestamp('granted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (t) => [
    index('grants_principal_id_idx').on(t.principalId),
    index('grants_scope_idx').on(t.scopeType, t.scopeId),
  ],
);

/** Machine principal — receives grants like a user (principal_type='service_account'). */
export const serviceAccountsTable = pgTable('service_accounts', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  ownerOrganizationId: uuid('owner_organization_id'),
  createdByUserId: uuid('created_by_user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Credential for a service account. The plaintext secret is never stored. */
export const apiKeysTable = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey(),
    prefix: text('prefix').notNull().unique(),
    hashedSecret: text('hashed_secret').notNull(),
    serviceAccountId: uuid('service_account_id')
      .notNull()
      .references(() => serviceAccountsTable.id, { onDelete: 'cascade' }),
    createdByUserId: uuid('created_by_user_id').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('api_keys_service_account_idx').on(t.serviceAccountId)],
);
