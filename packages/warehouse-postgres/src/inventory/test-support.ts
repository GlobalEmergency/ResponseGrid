import { Pool } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { migrateWms } from './index.js';

/**
 * Utilidades de los tests de integración. NO forman parte de la API pública del
 * paquete (no se exportan desde el barrel): sólo dan soporte a los `*.test.ts`.
 * Importan únicamente warehouse-postgres + pg/drizzle; nunca `apps/*`.
 */

/**
 * Postgres de test. Un contenedor `wms-test-pg` corre en localhost:5434
 * (user/pass/db = reliefhub). Se puede sobreescribir con `TEST_DATABASE_URL`.
 */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5434/reliefhub';

export function newPool(): Pool {
  return new Pool({ connectionString: TEST_DATABASE_URL });
}

/**
 * Deja el esquema `wms` limpio y migrado, para que cada suite arranque desde un
 * estado repetible: `DROP SCHEMA wms CASCADE` + `migrateWms`.
 *
 * NOTA sobre `--test-concurrency=1` (script `test:int`): los ficheros de test
 * comparten la MISMA BBDD y cada suite hace este `DROP SCHEMA wms CASCADE` en su
 * `before`. Correr los ficheros en serie evita que el reset de una suite borre
 * el esquema mientras otra está a mitad de sus tests. Es una preocupación
 * distinta del advisory lock de {@link migrateWms} (que serializa runners de
 * migración concurrentes DENTRO de la BBDD): NO quitar `--test-concurrency=1`
 * pensando que el lock lo cubre — no protege del `DROP SCHEMA` entre ficheros.
 */
export async function resetSchema(pool: Pool): Promise<void> {
  await pool.query('DROP SCHEMA IF EXISTS wms CASCADE');
  await migrateWms(pool);
}

/** Vacía las tablas de datos entre tests (mantiene el esquema/migraciones). */
export async function truncateAll(db: NodePgDatabase): Promise<void> {
  // CASCADE + RESTART IDENTITY: borra almacenes y, por la FK con cascada, zonas.
  // Incluye los containers y su allocator de código (self-FK → CASCADE), y los
  // kits de misión con sus líneas (FK con cascada).
  await db.execute(
    sql`TRUNCATE TABLE wms.stock_movements, wms.stock_items, wms.bins, wms.zones, wms.warehouses, wms.containers, wms.container_code_sequences, wms.load_templates, wms.load_template_lines RESTART IDENTITY CASCADE`,
  );
}

export function makeDb(pool: Pool): NodePgDatabase {
  return drizzle(pool);
}

/** UUID v4 aleatorio (para ids de test que no vienen de un VO). */
export function uuid(): string {
  return crypto.randomUUID();
}
