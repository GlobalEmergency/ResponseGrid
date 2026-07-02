import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/contexts/resources/infrastructure/http/domain-exception.filter';
import { NeedsDomainExceptionFilter } from '../src/contexts/needs/infrastructure/http/domain-exception.filter';
import { ReportExceptionFilter } from '../src/contexts/reports/infrastructure/http/report-exception.filter';
import { createDb } from '../src/shared/db';
import { usersTable } from '../src/contexts/identity/infrastructure/drizzle/schema';
import * as bcrypt from 'bcryptjs';

const USER_ID = 'ff100000-0000-4000-8000-000000000001';

describe('Files upload (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let userToken: string;

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
    app.useGlobalFilters(
      new DomainExceptionFilter(),
      new NeedsDomainExceptionFilter(),
      new ReportExceptionFilter(),
    );
    await app.init();
    server = app.getHttpServer() as Server;

    const { db, pool } = createDb(
      process.env.DATABASE_URL ??
        'postgres://reliefhub:reliefhub@localhost:5433/reliefhub',
    );
    try {
      const hash = await bcrypt.hash('test1234', 10);
      await db
        .insert(usersTable)
        .values({
          id: USER_ID,
          email: 'fileuser@reliefhub.org',
          passwordHash: hash,
          name: 'File User',
          isAdmin: false,
        })
        .onConflictDoNothing();
    } finally {
      await pool.end();
    }

    const loginRes = await request(server)
      .post('/auth/login')
      .send({ email: 'fileuser@reliefhub.org', password: 'test1234' })
      .expect(200);
    userToken = (loginRes.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /files without auth returns 401', async () => {
    // Create a tiny 1x1 PNG buffer
    const buf = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    );
    await request(server)
      .post('/files')
      .attach('file', buf, { filename: 'test.png', contentType: 'image/png' })
      .expect(401);
  });

  it('POST /files with image → 201 and returns key + url; GET /files/:key → 200 same content-type', async () => {
    // Minimal 1x1 PNG
    const pngBuf = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    );

    const uploadRes = await request(server)
      .post('/files')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', pngBuf, {
        filename: 'pixel.png',
        contentType: 'image/png',
      })
      .expect(201);

    const { key, url } = uploadRes.body as { key: string; url: string };
    expect(typeof key).toBe('string');
    expect(url).toBe(`/files/${key}`);

    const getRes = await request(server)
      .get(`/files/${key}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(getRes.headers['content-type']).toContain('image/png');
  });

  it('GET /files/:key without a token returns 401 (files are not world-readable)', async () => {
    const pngBuf = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    );
    const uploadRes = await request(server)
      .post('/files')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', pngBuf, {
        filename: 'private.png',
        contentType: 'image/png',
      })
      .expect(201);
    const { key } = uploadRes.body as { key: string };
    await request(server).get(`/files/${key}`).expect(401);
  });

  it('POST /files with non-image returns 422', async () => {
    const txtBuf = Buffer.from('hello world');
    await request(server)
      .post('/files')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', txtBuf, {
        filename: 'test.txt',
        contentType: 'text/plain',
      })
      .expect(422);
  });

  it('POST /files with a non-image payload mislabelled as image/png returns 422 (magic-byte check)', async () => {
    const fakePng = Buffer.from('<html><script>alert(1)</script></html>');
    await request(server)
      .post('/files')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', fakePng, {
        filename: 'fake.png',
        contentType: 'image/png',
      })
      .expect(422);
  });

  it('POST /files with image/svg+xml is rejected with 422 (XSS prevention)', async () => {
    const svgBuf = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );
    await request(server)
      .post('/files')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', svgBuf, {
        filename: 'evil.svg',
        contentType: 'image/svg+xml',
      })
      .expect(422);
  });

  it('GET /files/:key response includes X-Content-Type-Options: nosniff', async () => {
    const pngBuf = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    );
    const uploadRes = await request(server)
      .post('/files')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', pngBuf, {
        filename: 'nosniff-test.png',
        contentType: 'image/png',
      })
      .expect(201);
    const { key } = uploadRes.body as { key: string; url: string };
    const getRes = await request(server)
      .get(`/files/${key}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(getRes.headers['x-content-type-options']).toBe('nosniff');
  });

  it('GET /files/:key with unknown key returns 404', async () => {
    await request(server)
      .get('/files/nonexistent-key.png')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(404);
  });
});
