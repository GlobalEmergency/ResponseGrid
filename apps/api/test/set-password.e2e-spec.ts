import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/contexts/resources/infrastructure/http/domain-exception.filter';
import { createDb } from '../src/shared/db';
import {
  usersTable,
  passwordSetupTokensTable,
} from '../src/contexts/identity/infrastructure/drizzle/schema';
import { hashSetupToken } from '../src/contexts/identity/domain/password-setup-token-generator';

// Deterministic ids scoped to this file to avoid collisions with other suites.
const USER_ID = 'dd000000-0000-4000-8000-000000000001';
const VALID_TOKEN_ID = 'dd000000-0000-4000-8000-000000000010';
const EXPIRED_TOKEN_ID = 'dd000000-0000-4000-8000-000000000011';
const USED_TOKEN_ID = 'dd000000-0000-4000-8000-000000000012';

const VALID = 'valid-raw-token-aaaaaaaaaaaaaaaaaaaaaaaa';
const EXPIRED = 'expired-raw-token-bbbbbbbbbbbbbbbbbbbbbbbb';
const USED = 'used-raw-token-cccccccccccccccccccccccc';
const EMAIL = 'passwordless-donor@example.com';

describe('Set password (e2e)', () => {
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
    server = app.getHttpServer() as Server;

    const { db, pool } = createDb(
      process.env.DATABASE_URL ??
        'postgres://reliefhub:reliefhub@localhost:5433/reliefhub',
    );
    try {
      await db.delete(passwordSetupTokensTable);
      await db.delete(usersTable);

      // Passwordless donor profile (as created by EnsureDonorAccount #168).
      await db.insert(usersTable).values({
        id: USER_ID,
        email: EMAIL,
        passwordHash: null,
        name: 'Donante Sin Cuenta',
        isAdmin: false,
      });

      const now = Date.now();
      await db.insert(passwordSetupTokensTable).values([
        {
          id: VALID_TOKEN_ID,
          userId: USER_ID,
          tokenHash: hashSetupToken(VALID),
          expiresAt: new Date(now + 24 * 3600 * 1000),
          usedAt: null,
        },
        {
          id: EXPIRED_TOKEN_ID,
          userId: USER_ID,
          tokenHash: hashSetupToken(EXPIRED),
          expiresAt: new Date(now - 1000),
          usedAt: null,
        },
        {
          id: USED_TOKEN_ID,
          userId: USER_ID,
          tokenHash: hashSetupToken(USED),
          expiresAt: new Date(now + 24 * 3600 * 1000),
          usedAt: new Date(now - 5000),
        },
      ]);
    } finally {
      await pool.end();
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects an expired token with 400', async () => {
    await request(server)
      .post('/auth/set-password')
      .send({ token: EXPIRED, password: 'new-strong-pass' })
      .expect(400);
  });

  it('rejects an already-used token with 400', async () => {
    await request(server)
      .post('/auth/set-password')
      .send({ token: USED, password: 'new-strong-pass' })
      .expect(400);
  });

  it('rejects an unknown token with 400', async () => {
    await request(server)
      .post('/auth/set-password')
      .send({ token: 'totally-unknown-token', password: 'new-strong-pass' })
      .expect(400);
  });

  it('accepts a valid token, returns a JWT, and makes the account usable', async () => {
    const res = await request(server)
      .post('/auth/set-password')
      .send({ token: VALID, password: 'new-strong-pass' })
      .expect(200);

    const body = res.body as { accessToken: string };
    expect(body.accessToken).toBeTruthy();

    // The JWT logs the donor straight in — they can read their profile.
    const me = await request(server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .expect(200);
    expect((me.body as { email: string }).email).toBe(EMAIL);

    // The account now has a real password: it can log in.
    await request(server)
      .post('/auth/login')
      .send({ email: EMAIL, password: 'new-strong-pass' })
      .expect(200);
  });

  it('does not allow the same token to be replayed (single-use)', async () => {
    await request(server)
      .post('/auth/set-password')
      .send({ token: VALID, password: 'another-pass' })
      .expect(400);
  });

  it('resend endpoint returns 202 regardless of whether the email exists', async () => {
    await request(server)
      .post('/auth/set-password/request')
      .send({ email: 'nobody-here@example.com' })
      .expect(202);
  });
});
