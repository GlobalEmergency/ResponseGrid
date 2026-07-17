import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Pool } from 'pg';

/**
 * Runner de migraciones propio del paquete (decisión de diseño): warehouse-postgres
 * migra su esquema `wms.` de forma independiente del host, de modo que el WMS
 * standalone puede desplegar sin depender del sistema de migraciones de
 * ResponseGrid.
 *
 * Aplica los ficheros `wms_*.sql` de `migrations/` en orden de nombre, cada uno
 * dentro de su propia transacción, y los rastrea de forma idempotente en la
 * tabla `wms."_migrations"` (name text primary key). Re-ejecutar es seguro: los
 * ya aplicados se saltan. Los `.sql` usan `IF NOT EXISTS`, así que incluso una
 * aplicación parcial converge.
 *
 * Cerrojo entre procesos: dos runners concurrentes (dos instancias de la app
 * arrancando a la vez, o procesos en paralelo) se serializan con un
 * `pg_advisory_lock` de sesión sobre una clave constante ANTES de leer las
 * migraciones aplicadas, de modo que el patrón check-then-apply no compita. El
 * cerrojo se libera en un `finally`. Todo sigue siendo idempotente.
 */

/** Nombre del paquete, usado para anclar la búsqueda del directorio. */
const PACKAGE_SEGMENT = join('packages', 'warehouse-postgres');

/**
 * Clave constante del advisory lock de sesión. Un valor fijo dentro del rango de
 * `bigint` de Postgres (derivado como hash constante de 'warehouse-postgres:wms')
 * para que todos los runners del esquema `wms.` compitan por el MISMO cerrojo,
 * sin colisionar con otros advisory locks del host.
 */
const WMS_MIGRATION_LOCK_KEY = 4310472051201983n;

/**
 * Localiza el directorio `migrations/` del paquete sin depender del sistema de
 * módulos (ni `__dirname` de CJS ni `import.meta` de ESM), para que ambos builds
 * compilen y funcionen igual. Prioridad:
 *
 *   1. La env `WMS_MIGRATIONS_DIR` (override explícito).
 *   2. Ascendiendo desde `process.cwd()`: `<cwd>/migrations` (cuando se ejecuta
 *      desde la raíz del paquete) o `<x>/packages/warehouse-postgres/migrations`
 *      (cuando se ejecuta desde la raíz del monorepo).
 *
 * Un consumidor externo que no encaje en ese layout pasa el directorio explícito
 * a {@link migrateWms} o define la env.
 */
function resolveMigrationsDir(): string {
  const fromEnv = process.env.WMS_MIGRATIONS_DIR;
  if (fromEnv) return fromEnv;

  let dir = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    const localCandidate = join(dir, 'migrations');
    if (existsSync(localCandidate)) return localCandidate;
    const monorepoCandidate = join(dir, PACKAGE_SEGMENT, 'migrations');
    if (existsSync(monorepoCandidate)) return monorepoCandidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback: relativo al cwd (mejor un error claro de readdir que un silencio).
  return join(process.cwd(), 'migrations');
}

async function ensureMigrationsTable(pool: Pool): Promise<void> {
  await pool.query('CREATE SCHEMA IF NOT EXISTS wms');
  await pool.query(
    `CREATE TABLE IF NOT EXISTS wms."_migrations" (
       name text PRIMARY KEY,
       applied_at timestamptz NOT NULL DEFAULT now()
     )`,
  );
}

async function appliedMigrations(pool: Pool): Promise<Set<string>> {
  const { rows } = await pool.query<{ name: string }>(
    'SELECT name FROM wms."_migrations"',
  );
  return new Set(rows.map((r) => r.name));
}

async function migrationFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir);
  return entries
    .filter((name) => name.startsWith('wms_') && name.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Aplica las migraciones pendientes del esquema `wms.` contra el pool dado.
 * Idempotente y seguro de re-ejecutar. Devuelve los nombres aplicados en esta
 * llamada (vacío si ya estaba todo al día). Se puede pasar `migrationsDir`
 * explícito; por defecto se resuelve con {@link resolveMigrationsDir}.
 */
export async function migrateWms(
  pool: Pool,
  migrationsDir: string = resolveMigrationsDir(),
): Promise<string[]> {
  // Cerrojo de sesión sobre un cliente dedicado: serializa runners concurrentes
  // en la BBDD antes del check-then-apply. Adquirir y liberar sobre el MISMO
  // cliente (el advisory lock es por sesión), de ahí que no se use el pool.
  const lockClient = await pool.connect();
  try {
    await lockClient.query('SELECT pg_advisory_lock($1)', [
      WMS_MIGRATION_LOCK_KEY.toString(),
    ]);
    return await applyPendingMigrations(pool, migrationsDir);
  } finally {
    try {
      await lockClient.query('SELECT pg_advisory_unlock($1)', [
        WMS_MIGRATION_LOCK_KEY.toString(),
      ]);
    } finally {
      lockClient.release();
    }
  }
}

/**
 * Cuerpo idempotente de la migración, ya bajo el advisory lock: asegura la tabla
 * de control, lee lo aplicado y aplica los ficheros pendientes en orden, cada
 * uno en su propia transacción.
 */
async function applyPendingMigrations(
  pool: Pool,
  migrationsDir: string,
): Promise<string[]> {
  await ensureMigrationsTable(pool);
  const already = await appliedMigrations(pool);
  const files = await migrationFiles(migrationsDir);
  const applied: string[] = [];

  for (const file of files) {
    if (already.has(file)) continue;
    const sql = await readFile(join(migrationsDir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO wms."_migrations" (name) VALUES ($1) ON CONFLICT DO NOTHING',
        [file],
      );
      await client.query('COMMIT');
      applied.push(file);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  return applied;
}
