import {
  PublicSupplyRecord,
  SupplyCatalogReadModel,
} from '../domain/ports/supply-catalog.read-model';

/**
 * Decorator que cachea en memoria el catálogo activo (patrón Decorator: misma
 * interfaz, sin tocar el adaptador Drizzle ni la aplicación).
 *
 * El catálogo maestro es dato de referencia de cambio lento —las altas/bajas
 * irán por la API interna de gestión— así que servirlo desde una caché con TTL
 * evita recargar toda la tabla en cada request de autocomplete, sin alterar el
 * ranking (que sigue calculándose en la aplicación). Una caché Redis sería lo
 * apropiado en despliegue multi-instancia; con un solo proceso basta esta, igual
 * que en `NominatimGeocodingProvider`.
 */
export class CachingSupplyCatalogReadModel implements SupplyCatalogReadModel {
  private cached: { records: PublicSupplyRecord[]; expiresAt: number } | null =
    null;
  private inflight: Promise<PublicSupplyRecord[]> | null = null;

  constructor(
    private readonly inner: SupplyCatalogReadModel,
    private readonly ttlMs = 60_000,
    private readonly now: () => number = () => Date.now(),
  ) {}

  async listActive(): Promise<PublicSupplyRecord[]> {
    const current = this.cached;
    if (current && current.expiresAt > this.now()) {
      return current.records;
    }
    // Dedupe de cargas concurrentes: evita la estampida de caché (varias
    // requests recargando la tabla a la vez cuando el TTL caduca).
    this.inflight ??= this.refresh();
    return this.inflight;
  }

  private async refresh(): Promise<PublicSupplyRecord[]> {
    try {
      const records = await this.inner.listActive();
      this.cached = { records, expiresAt: this.now() + this.ttlMs };
      return records;
    } finally {
      this.inflight = null;
    }
  }

  /**
   * Descarta el catálogo cacheado para que la próxima lectura recargue datos
   * frescos. Lo llaman las escrituras de gestión (#222) tras alta/edición/
   * archivado/alias/fusión, de modo que el cambio aflora de inmediato en la
   * cara pública en vez de esperar al TTL.
   */
  invalidate(): void {
    this.cached = null;
  }
}
