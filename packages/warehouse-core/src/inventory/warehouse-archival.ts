import { WarehouseNotEmptyError } from './inventory-errors.js';

/**
 * Guard puro de "no archivar con carga": archivar un {@link Warehouse} (fijo o
 * vehículo) que todavía tiene stock a bordo dejaría inventario huérfano. El
 * conteo de StockItems lo aporta el host (el paquete no conoce la persistencia);
 * esta función sólo aplica la política.
 *
 * Es una precondición del port de archivado del host/app: DEBE llamarse antes de
 * archivar. Lanza {@link WarehouseNotEmptyError} si queda carga.
 */
export function assertWarehouseCanBeArchived(stockItemCount: number): void {
  if (stockItemCount > 0) {
    throw new WarehouseNotEmptyError(stockItemCount);
  }
}
