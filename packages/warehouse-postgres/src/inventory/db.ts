import type { PgDatabase } from 'drizzle-orm/pg-core';
import type { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';

/**
 * Tipo compartido de "handle de base de datos" del paquete. Tanto una conexión
 * de nivel superior (`NodePgDatabase`, obtenida con `drizzle(pool)`) como una
 * transacción (`tx`, el argumento de `db.transaction(...)`) satisfacen este tipo,
 * porque ambas extienden `PgDatabase<NodePgQueryResultHKT>`.
 *
 * Los 4 repositorios se tipan sobre `WmsDatabase` (en vez de `NodePgDatabase`)
 * para que se puedan construir tanto sobre el `db` global — auto-commit por
 * conexión del pool — como sobre un `tx`, sin ningún `as`. Esto es lo que
 * habilita la Unit of Work ({@link ./unit-of-work.js}): componer save de ambas
 * patas + append del libro mayor en una única transacción atómica.
 */
export type WmsDatabase = PgDatabase<NodePgQueryResultHKT>;
