import { createDb, Db } from '../../../../shared/db';
import { usersTable } from './schema';
import { DrizzleUserRepository } from './drizzle-user.repository';
import { User } from '../../domain/user';
import { UserId } from '../../domain/user-id';
import { Email } from '../../domain/email';
import type { Pool } from 'pg';

const URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';
const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('DrizzleUserRepository (integration)', () => {
  let db: Db;
  let pool: Pool;
  let repo: DrizzleUserRepository;

  beforeAll(() => {
    ({ db, pool } = createDb(URL));
    repo = new DrizzleUserRepository(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await db.delete(usersTable);
  });

  it('saves and finds a user by id', async () => {
    const user = User.create({
      id: UserId.fromString(USER_ID),
      email: Email.fromString('test@reliefhub.org'),
      passwordHash: 'hash',
      name: 'Test User',
      isAdmin: false,
    });

    await repo.save(user);
    const found = await repo.findById(UserId.fromString(USER_ID));

    expect(found).not.toBeNull();
    expect(found?.id.value).toBe(USER_ID);
    expect(found?.email.value).toBe('test@reliefhub.org');
    expect(found?.isAdmin).toBe(false);
  });

  it('saves and finds a user by email', async () => {
    const user = User.create({
      id: UserId.fromString(USER_ID),
      email: Email.fromString('test@reliefhub.org'),
      passwordHash: 'hash',
      name: 'Test User',
      isAdmin: true,
    });

    await repo.save(user);
    const found = await repo.findByEmail(
      Email.fromString('test@reliefhub.org'),
    );

    expect(found).not.toBeNull();
    expect(found?.isAdmin).toBe(true);
  });

  it('findByEmail returns null when not found', async () => {
    const result = await repo.findByEmail(
      Email.fromString('nonexistent@example.com'),
    );
    expect(result).toBeNull();
  });

  it('findById returns null when not found', async () => {
    const result = await repo.findById(
      UserId.fromString('ffffffff-ffff-4fff-8fff-ffffffffffff'),
    );
    expect(result).toBeNull();
  });

  it('findByPhone matches after normalisation, format-insensitively (#315)', async () => {
    await repo.save(
      User.create({
        id: UserId.fromString(USER_ID),
        email: Email.fromString('ana@reliefhub.org'),
        passwordHash: null,
        name: 'Ana',
        isAdmin: false,
        phone: '+58 412 555 0101',
      }),
    );

    for (const input of [
      '584125550101',
      '+58-412-555.0101',
      '(58)4125550101',
    ]) {
      const found = await repo.findByPhone(input);
      expect(found.map((u) => u.email.value)).toEqual(['ana@reliefhub.org']);
    }
  });

  it('findByPhone returns [] for no match, null phones, or empty input', async () => {
    await repo.save(
      User.create({
        id: UserId.fromString(USER_ID),
        email: Email.fromString('nophone@reliefhub.org'),
        passwordHash: null,
        name: 'No Phone',
        isAdmin: false,
        // phone omitted → null
      }),
    );

    expect(await repo.findByPhone('584125550101')).toEqual([]);
    expect(await repo.findByPhone('   ')).toEqual([]);
  });

  it('findByPhone returns the most recent first when several accounts share a phone (#315)', async () => {
    const OLD = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const NEW = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    // Explicit createdAt so recency ordering is deterministic.
    await db.insert(usersTable).values([
      {
        id: OLD,
        email: 'old@reliefhub.org',
        passwordHash: null,
        name: 'Old',
        isAdmin: false,
        phone: '+58 412 555 0101',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
      {
        id: NEW,
        email: 'new@reliefhub.org',
        passwordHash: null,
        name: 'New',
        isAdmin: false,
        phone: '(58) 412.555.0101',
        createdAt: new Date('2026-06-01T00:00:00Z'),
      },
    ]);

    const found = await repo.findByPhone('+584125550101');
    expect(found.map((u) => u.email.value)).toEqual([
      'new@reliefhub.org',
      'old@reliefhub.org',
    ]);
  });

  it('upserts on duplicate id (updates name)', async () => {
    const user = User.create({
      id: UserId.fromString(USER_ID),
      email: Email.fromString('test@reliefhub.org'),
      passwordHash: 'hash',
      name: 'Original',
      isAdmin: false,
    });
    await repo.save(user);

    const updated = User.create({
      id: UserId.fromString(USER_ID),
      email: Email.fromString('test@reliefhub.org'),
      passwordHash: 'hash',
      name: 'Updated',
      isAdmin: false,
    });
    await repo.save(updated);

    const found = await repo.findById(UserId.fromString(USER_ID));
    expect(found?.name).toBe('Updated');
  });
});
