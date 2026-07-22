import type { WmsDatabase } from './db.js';
import { DrizzleWarehouseRepository } from './drizzle-warehouse.repository.js';
import { DrizzleBinRepository } from './drizzle-bin.repository.js';
import { DrizzleStockItemRepository } from './drizzle-stock-item.repository.js';
import { DrizzleStockMovementRepository } from './drizzle-stock-movement.repository.js';
import { DrizzleContainerRepository } from './drizzle-container.repository.js';
import { DrizzleLoadTemplateRepository } from './drizzle-load-template.repository.js';

/**
 * Los repositorios del módulo inventory, ligados a una misma transacción.
 * Es lo que recibe el callback de {@link runInWmsTransaction}: úsalos para
 * componer varias escrituras (p. ej. las dos patas de un traslado + el asiento
 * del libro mayor, o un palet y el stock que lo empaqueta) de forma atómica.
 */
export interface WmsUnitOfWork {
  warehouses: DrizzleWarehouseRepository;
  bins: DrizzleBinRepository;
  items: DrizzleStockItemRepository;
  movements: DrizzleStockMovementRepository;
  containers: DrizzleContainerRepository;
  loadTemplates: DrizzleLoadTemplateRepository;
}

/**
 * Unit of Work mínima del paquete warehouse-postgres. El dominio
 * ({@link StockMovement}) exige que el host persista "ambas patas + el asiento"
 * de un traslado ATÓMICAMENTE, pero cada repositorio, construido sobre el `db`
 * del pool, auto-commitea en su propia conexión. Esta función abre una
 * transacción (`db.transaction`), construye los 4 repositorios ligados al `tx`
 * y se los pasa al callback: todo lo que se escriba dentro comparte la misma
 * transacción, así que confirma o revierte en bloque.
 *
 * No es un framework: es la pieza justa para componer transaccionalmente los
 * repositorios sin tocar los puertos de warehouse-core (esto vive sólo en
 * warehouse-postgres). Si el callback lanza, drizzle hace ROLLBACK y el error se
 * propaga; si retorna, hace COMMIT y devuelve el valor del callback.
 *
 * @example
 * await runInWmsTransaction(db, async ({ items, movements }) => {
 *   await items.save(fromItem);
 *   await items.save(toItem);
 *   await movements.append(transfer);
 * });
 */
export async function runInWmsTransaction<T>(
  db: WmsDatabase,
  work: (uow: WmsUnitOfWork) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    const uow: WmsUnitOfWork = {
      // `tx` satisface `WmsDatabase` (extiende `PgDatabase<NodePgQueryResultHKT>`),
      // así que los repositorios se construyen sin ningún cast.
      warehouses: new DrizzleWarehouseRepository(tx),
      bins: new DrizzleBinRepository(tx),
      items: new DrizzleStockItemRepository(tx),
      movements: new DrizzleStockMovementRepository(tx),
      containers: new DrizzleContainerRepository(tx),
      loadTemplates: new DrizzleLoadTemplateRepository(tx),
    };
    return work(uow);
  });
}
