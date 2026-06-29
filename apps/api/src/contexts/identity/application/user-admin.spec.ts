import { ListUsersAdmin } from './list-users-admin';
import { GetUserAdminDetail } from './get-user-admin-detail';
import {
  UserAdminRepository,
  UserAdminRow,
} from '../domain/ports/user-admin.repository';
import { GrantRepository } from '../domain/ports/grant.repository';
import { Grant } from '../domain/authorization/grant';
import { ScopeRef } from '../domain/authorization/scope-ref';
import {
  OrganizationReader,
  UserOrganizationMembership,
} from '../domain/ports/organization-reader';
import {
  UserActivityReader,
  UserActivityEntry,
} from '../domain/ports/user-activity-reader';
import { ScopeNameReader } from '../domain/ports/scope-name-reader';
import { UserNotFoundError } from '../domain/user-not-found.error';

// ── Fakes ────────────────────────────────────────────────────────────────────

class FakeUserAdminRepository implements UserAdminRepository {
  private rows = new Map<string, UserAdminRow>();

  seed(row: UserAdminRow): void {
    this.rows.set(row.id, row);
  }

  listAll(): Promise<UserAdminRow[]> {
    return Promise.resolve([...this.rows.values()]);
  }

  findById(id: string): Promise<UserAdminRow | null> {
    return Promise.resolve(this.rows.get(id) ?? null);
  }
}

class FakeGrantRepository implements GrantRepository {
  private byPrincipal = new Map<string, Grant[]>();

  seed(principalId: string, grants: Grant[]): void {
    this.byPrincipal.set(principalId, grants);
  }

  findByPrincipal(principalId: string): Promise<Grant[]> {
    return Promise.resolve(this.byPrincipal.get(principalId) ?? []);
  }
  findByScope(): Promise<Grant[]> {
    return Promise.resolve([]);
  }
  findById(): Promise<Grant | null> {
    return Promise.resolve(null);
  }
  save(): Promise<void> {
    return Promise.resolve();
  }
  deleteById(): Promise<void> {
    return Promise.resolve();
  }
}

class FakeOrganizationReader implements OrganizationReader {
  private byUser = new Map<string, UserOrganizationMembership[]>();

  set(userId: string, orgs: UserOrganizationMembership[]): void {
    this.byUser.set(userId, orgs);
  }

  listForUser(userId: string): Promise<UserOrganizationMembership[]> {
    return Promise.resolve(this.byUser.get(userId) ?? []);
  }
}

class FakeActivityReader implements UserActivityReader {
  private byUser = new Map<string, UserActivityEntry[]>();
  lastLimit: number | null = null;

  set(userId: string, entries: UserActivityEntry[]): void {
    this.byUser.set(userId, entries);
  }

  recentForUser(userId: string, limit: number): Promise<UserActivityEntry[]> {
    this.lastLimit = limit;
    return Promise.resolve((this.byUser.get(userId) ?? []).slice(0, limit));
  }
}

class FakeScopeNameReader implements ScopeNameReader {
  private names = new Map<string, string>();

  set(scopeType: string, scopeId: string, name: string): void {
    this.names.set(`${scopeType}:${scopeId}`, name);
  }

  nameFor(scopeType: string, scopeId: string): Promise<string | null> {
    return Promise.resolve(this.names.get(`${scopeType}:${scopeId}`) ?? null);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const USER_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const USER_B = 'bbbbbbbb-0000-4000-8000-000000000001';
const ORG_ID = 'cccccccc-0000-4000-8000-000000000001';
const EMERGENCY_ID = '99999999-9999-4999-8999-999999999999';

function row(overrides: Partial<UserAdminRow> & { id: string }): UserAdminRow {
  return {
    email: 'user@example.org',
    name: 'User',
    isAdmin: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastLoginAt: null,
    ...overrides,
  };
}

function grant(
  id: string,
  principalId: string,
  roleId: string,
  scope: ScopeRef,
  opts: { expiresAt?: Date | null } = {},
): Grant {
  return Grant.create({
    id,
    principalId,
    roleId,
    scope,
    grantedAt: new Date('2026-02-01T00:00:00.000Z'),
    expiresAt: opts.expiresAt ?? null,
  });
}

// ── ListUsersAdmin ───────────────────────────────────────────────────────────

describe('ListUsersAdmin', () => {
  it('returns an empty list when there are no users', async () => {
    const users = new FakeUserAdminRepository();
    const grants = new FakeGrantRepository();
    const useCase = new ListUsersAdmin(users, grants);

    expect(await useCase.execute()).toEqual([]);
  });

  it('lists every user with a distinct roles summary and grant count, sorted by name', async () => {
    const users = new FakeUserAdminRepository();
    const grants = new FakeGrantRepository();
    const useCase = new ListUsersAdmin(users, grants);

    users.seed(
      row({
        id: USER_B,
        name: 'Zoe',
        email: 'zoe@example.org',
        createdAt: '2026-03-01T00:00:00.000Z',
        lastLoginAt: '2026-06-01T12:00:00.000Z',
      }),
    );
    users.seed(row({ id: USER_A, name: 'Ana', email: 'ana@example.org' }));

    // Zoe holds two distinct roles (one repeated across scopes → deduped).
    grants.seed(USER_B, [
      grant(
        'g1',
        USER_B,
        'emergency_coordinator',
        ScopeRef.emergency(EMERGENCY_ID),
      ),
      grant('g2', USER_B, 'org_admin', ScopeRef.organization(ORG_ID)),
      grant('g3', USER_B, 'org_admin', ScopeRef.platform()),
    ]);

    const result = await useCase.execute();

    expect(result.map((u) => u.name)).toEqual(['Ana', 'Zoe']);

    const zoe = result.find((u) => u.id === USER_B)!;
    expect(zoe.email).toBe('zoe@example.org');
    expect(zoe.lastLoginAt).toBe('2026-06-01T12:00:00.000Z');
    expect(zoe.grantCount).toBe(3);
    expect([...zoe.roles].sort()).toEqual([
      'emergency_coordinator',
      'org_admin',
    ]);

    const ana = result.find((u) => u.id === USER_A)!;
    expect(ana.roles).toEqual([]);
    expect(ana.grantCount).toBe(0);
    expect(ana.lastLoginAt).toBeNull();
  });

  it('excludes expired grants from the roles summary and count', async () => {
    const users = new FakeUserAdminRepository();
    const grants = new FakeGrantRepository();
    const useCase = new ListUsersAdmin(users, grants);

    users.seed(row({ id: USER_A, name: 'Ana' }));
    grants.seed(USER_A, [
      grant('active', USER_A, 'viewer', ScopeRef.platform()),
      grant('expired', USER_A, 'org_admin', ScopeRef.organization(ORG_ID), {
        expiresAt: new Date('2020-01-01T00:00:00.000Z'),
      }),
    ]);

    const [ana] = await useCase.execute();
    expect(ana.roles).toEqual(['viewer']);
    expect(ana.grantCount).toBe(1);
  });
});

// ── GetUserAdminDetail ───────────────────────────────────────────────────────

describe('GetUserAdminDetail', () => {
  function build() {
    const users = new FakeUserAdminRepository();
    const grants = new FakeGrantRepository();
    const orgs = new FakeOrganizationReader();
    const activity = new FakeActivityReader();
    const scopeNames = new FakeScopeNameReader();
    const useCase = new GetUserAdminDetail(
      users,
      grants,
      orgs,
      activity,
      scopeNames,
    );
    return { users, grants, orgs, activity, scopeNames, useCase };
  }

  it('throws UserNotFoundError for an unknown user', async () => {
    const { useCase } = build();
    await expect(useCase.execute({ userId: USER_A })).rejects.toBeInstanceOf(
      UserNotFoundError,
    );
  });

  it('aggregates user fields, grants (with resolved scope names), organizations and activity', async () => {
    const { users, grants, orgs, activity, scopeNames, useCase } = build();

    users.seed(
      row({
        id: USER_A,
        name: 'Ana Coord',
        email: 'ana@example.org',
        isAdmin: false,
        createdAt: '2026-01-10T00:00:00.000Z',
        lastLoginAt: '2026-06-20T08:00:00.000Z',
      }),
    );

    grants.seed(USER_A, [
      grant(
        'g1',
        USER_A,
        'emergency_coordinator',
        ScopeRef.emergency(EMERGENCY_ID),
      ),
      grant('g2', USER_A, 'org_admin', ScopeRef.organization(ORG_ID)),
      grant('g3', USER_A, 'citizen', ScopeRef.platform()),
    ]);
    scopeNames.set('emergency', EMERGENCY_ID, 'Terremoto Venezuela 2026');
    scopeNames.set('organization', ORG_ID, 'Cruz Roja');

    orgs.set(USER_A, [
      { organizationId: ORG_ID, organizationName: 'Cruz Roja', role: 'owner' },
    ]);

    activity.set(USER_A, [
      {
        id: 'act-1',
        action: 'resource.verify',
        entityType: 'resource',
        entityId: 'r-1',
        emergencyId: EMERGENCY_ID,
        method: 'POST',
        path: '/resources/r-1/verify',
        statusCode: 200,
        createdAt: '2026-06-19T10:00:00.000Z',
      },
    ]);

    const detail = await useCase.execute({ userId: USER_A });

    expect(detail.id).toBe(USER_A);
    expect(detail.email).toBe('ana@example.org');
    expect(detail.name).toBe('Ana Coord');
    expect(detail.createdAt).toBe('2026-01-10T00:00:00.000Z');
    expect(detail.lastLoginAt).toBe('2026-06-20T08:00:00.000Z');

    expect(detail.grants).toHaveLength(3);
    const emGrant = detail.grants.find((g) => g.scopeType === 'emergency')!;
    expect(emGrant.roleId).toBe('emergency_coordinator');
    expect(emGrant.scopeId).toBe(EMERGENCY_ID);
    expect(emGrant.scopeName).toBe('Terremoto Venezuela 2026');
    const orgGrant = detail.grants.find((g) => g.scopeType === 'organization')!;
    expect(orgGrant.scopeName).toBe('Cruz Roja');
    const platformGrant = detail.grants.find(
      (g) => g.scopeType === 'platform',
    )!;
    expect(platformGrant.scopeId).toBeNull();
    expect(platformGrant.scopeName).toBeNull();

    expect(detail.organizations).toEqual([
      { organizationId: ORG_ID, organizationName: 'Cruz Roja', role: 'owner' },
    ]);

    expect(detail.activity).toHaveLength(1);
    expect(detail.activity[0].action).toBe('resource.verify');
    // recent activity is bounded
    expect(activity.lastLimit).toBeGreaterThan(0);
  });

  it('still resolves the user when they have no grants, orgs or activity', async () => {
    const { users, useCase } = build();
    users.seed(row({ id: USER_B, name: 'Lonely' }));

    const detail = await useCase.execute({ userId: USER_B });
    expect(detail.grants).toEqual([]);
    expect(detail.organizations).toEqual([]);
    expect(detail.activity).toEqual([]);
  });
});
