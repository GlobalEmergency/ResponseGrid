/**
 * Jest global setup — runs once before the entire test suite in a dedicated
 * Node process. Responsibilities:
 *   1. Drop and recreate the `reliefhub_test` database (fresh slate every run).
 *   2. Apply the schema snapshot (`test/schema.sql`) to the empty database.
 *
 * Written as plain JS so Jest can execute it without a TS transformer
 * (globalSetup bypasses the transform pipeline). No additional dependencies —
 * only `pg` (already a production dep) and built-in Node modules.
 *
 * To update the schema snapshot after a migration:
 *   docker exec reliefhub-postgres-1 \
 *     pg_dump -U reliefhub -d reliefhub --schema-only --no-owner --no-acl \
 *     > apps/api/test/schema.sql
 * Then commit both the migration file and the updated schema.sql.
 */

'use strict';

const { Client } = require('pg');
const fs = require('node:fs');
const path = require('node:path');

const TEST_DB = 'reliefhub_test';
/** Connect to the maintenance `postgres` DB so we can DROP/CREATE the test DB. */
const ADMIN_URL = 'postgres://reliefhub:reliefhub@localhost:5433/postgres';
const TEST_URL = `postgres://reliefhub:reliefhub@localhost:5433/${TEST_DB}`;

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

  // ── 2. Apply schema snapshot ───────────────────────────────────────────────
  const schemaFile = path.resolve(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaFile, 'utf8');

  const testClient = new Client({ connectionString: TEST_URL });
  await testClient.connect();
  try {
    await testClient.query(schemaSql);
    console.log(`[global-setup] Schema applied to "${TEST_DB}".`);
  } finally {
    await testClient.end();
  }
};
