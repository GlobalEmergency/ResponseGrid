/**
 * Jest setupFile — runs inside each test worker process before any test.
 * Overrides DATABASE_URL so every test (int-spec and e2e) talks to the
 * dedicated test database instead of the development database.
 */

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub_test';

process.env.DATABASE_URL = TEST_DATABASE_URL;
