/**
 * Jest global setup — runs once before the entire test suite in a dedicated
 * Node process. Responsibilities:
 *   1. Drop and recreate the `reliefhub_test` database (fresh slate every run).
 *   2. Apply Drizzle baseline migrations (drizzle/0000_baseline.sql, etc.) in
 *      order, so the test DB always reflects the canonical schema TS source of
 *      truth.
 *
 * Written as plain JS so Jest can execute it without a TS transformer
 * (globalSetup bypasses the transform pipeline). No additional dependencies —
 * only `pg` (already a production dep) and built-in Node modules.
 *
 * To update the schema after adding a migration: just add the new .sql file to
 * apps/api/drizzle/ — this setup applies all files in lexicographic order
 * automatically.
 */

'use strict';

const { Client } = require('pg');
const fs = require('node:fs');
const path = require('node:path');

/**
 * Single source of truth for the test DB connection — the SAME env var the Jest
 * workers read (see test/jest-setup-test-db.ts), so the schema is applied to
 * exactly the DB the tests talk to. Defaults to the docker-compose port (5433,
 * used by CI); override TEST_DATABASE_URL to point at another host/port locally.
 */
const TEST_URL =
  process.env.TEST_DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub_test';

/** Test DB name, parsed from the connection URL (e.g. `reliefhub_test`). */
const TEST_DB = new URL(TEST_URL).pathname.replace(/^\//, '');

/** Maintenance `postgres` DB on the same server — to DROP/CREATE the test DB. */
const ADMIN_URL = (() => {
  const url = new URL(TEST_URL);
  url.pathname = '/postgres';
  return url.toString();
})();

/** Directory that holds the Drizzle migration .sql files. */
const DRIZZLE_DIR = path.resolve(__dirname, '../drizzle');

/**
 * Collect all *.sql files from the drizzle directory in lexicographic order
 * (0000_baseline.sql, 0001_…, etc.). Skips the meta/ subdirectory.
 */
function getMigrationFiles() {
  return fs
    .readdirSync(DRIZZLE_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => path.join(DRIZZLE_DIR, f));
}

/**
 * Drizzle uses `--> statement-breakpoint` as a delimiter between statements
 * that must be executed separately (e.g. after CREATE TABLE before ALTER TABLE
 * that references it). Split on that marker and execute each chunk in order.
 */
async function applyMigrationFile(client, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const statements = sql
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of statements) {
    await client.query(stmt);
  }
}

module.exports = async function globalSetup() {
  // ── 1. Drop reliefhub_test and recreate it (clean slate) ──────────────────
  const adminClient = new Client({ connectionString: ADMIN_URL });
  await adminClient.connect();
  try {
    // Terminate any open connections to the old test DB before dropping it.
    await adminClient.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${TEST_DB}' AND pid <> pg_backend_pid()
    `);
    await adminClient.query(`DROP DATABASE IF EXISTS "${TEST_DB}"`);
    await adminClient.query(`CREATE DATABASE "${TEST_DB}"`);
    console.log(`\n[global-setup] Recreated database "${TEST_DB}".`);
  } finally {
    await adminClient.end();
  }

  // ── 2. Apply Drizzle baseline migrations in order ─────────────────────────
  const migrationFiles = getMigrationFiles();
  if (migrationFiles.length === 0) {
    throw new Error(
      `[global-setup] No migration files found in ${DRIZZLE_DIR}`,
    );
  }

  const testClient = new Client({ connectionString: TEST_URL });
  await testClient.connect();
  try {
    for (const filePath of migrationFiles) {
      await applyMigrationFile(testClient, filePath);
      console.log(
        `[global-setup] Applied migration: ${path.basename(filePath)}`,
      );
    }
    console.log(`[global-setup] Schema applied to "${TEST_DB}".`);
  } finally {
    await testClient.end();
  }
};
