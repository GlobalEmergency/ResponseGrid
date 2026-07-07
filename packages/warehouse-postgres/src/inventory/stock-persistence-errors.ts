/**
 * Errores de la capa de persistencia del stock. Viven en warehouse-postgres, no
 * en el dominio puro (warehouse-core): son fallos de concurrencia/almacenamiento
 * del adaptador, no invariantes del negocio. El host los mapea a HTTP (409).
 */

/**
 * Se lanza cuando `StockItemRepository.save` detecta un choque de concurrencia
 * optimista: el UPDATE con `WHERE version = version_esperada` no afectó a
 * ninguna fila porque otro proceso ya actualizó (o borró) el item. El llamante
 * debe recargar el snapshot y reintentar.
 */
export class StaleStockItemError extends Error {
  constructor(
    public readonly stockItemId: string,
    public readonly expectedVersion: number,
  ) {
    super(
      `StockItem ${stockItemId} fue modificado concurrentemente ` +
        `(se esperaba la versión ${expectedVersion}); recargue y reintente`,
    );
    this.name = 'StaleStockItemError';
  }
}
