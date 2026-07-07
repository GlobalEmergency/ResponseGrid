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

/**
 * Se lanza cuando el alta (`version === 1`) de una StockItem viola el índice
 * único de grano (bin, supply, lote, estado): otro proceso ya dio de alta ese
 * mismo grano (primera entrada concurrente o un create reintentado). Es la
 * traducción tipada del error crudo `23505` de Postgres, para que el host no vea
 * un 500 sino un conflicto identificable. El llamante debe cargar el item
 * existente por grano y aplicar la mutación sobre él en vez de reinsertar.
 */
export class DuplicateStockItemError extends Error {
  constructor(
    public readonly binId: string,
    public readonly supplyId: string,
    public readonly lotCode: string | null,
    public readonly status: string,
  ) {
    super(
      `Ya existe una StockItem para el grano ` +
        `(bin ${binId}, supply ${supplyId}, lote ${lotCode ?? 'null'}, estado ${status}); ` +
        `cargue el item existente por grano y aplique la mutación sobre él`,
    );
    this.name = 'DuplicateStockItemError';
  }
}

/**
 * Se lanza cuando un `StockMovementRepository.append` con clave de idempotencia
 * choca con un asiento ya persistido bajo esa misma `(scope_id, idempotency_key)`
 * pero que representa un movimiento DISTINTO (otro tipo/cantidad/unidad/patas).
 * No es un reintento legítimo (que sería no-op), sino una reutilización de clave
 * en conflicto: silenciarla ocultaría un doble-registro divergente, así que se
 * lanza para que el host lo detecte (mapea a 409).
 */
export class IdempotencyKeyConflictError extends Error {
  constructor(
    public readonly scopeId: string,
    public readonly idempotencyKey: string,
  ) {
    super(
      `La clave de idempotencia "${idempotencyKey}" del scope ${scopeId} ya está ` +
        `registrada para un movimiento distinto; no es un reintento del mismo asiento`,
    );
    this.name = 'IdempotencyKeyConflictError';
  }
}
