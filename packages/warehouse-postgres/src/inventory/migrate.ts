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
 */

/** Nombre del paquete, usado para anclar la búsqueda del directorio. */
const PACKAGE_SEGMENT = join('packages', 'warehouse-postgres');

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
