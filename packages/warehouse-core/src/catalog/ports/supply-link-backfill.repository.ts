export const SUPPLY_LINK_BACKFILL_REPOSITORY = Symbol(
  'SUPPLY_LINK_BACKFILL_REPOSITORY',
);

/**
 * De dónde sale una línea de material sin enlazar. Las cuatro primeras son las
 * tablas `*_items`/`*_lines` con columna `supply_id` (migración 0045); la
 * quinta son las líneas jsonb embebidas en `containers.lines`.
 */
export type SupplyLineSource =
  | 'need_items'
  | 'offer_items'
  | 'resource_items'
  | 'donation_intake_lines'
  | 'container_lines';

/** Texto libre de líneas con `supplyId` nulo, agrupado por fuente + nombre. */
export interface UnlinkedLineGroup {
  source: SupplyLineSource;
  /** El `name` crudo tal y como está persistido (sin normalizar). */
  name: string;
  /** Cuántas líneas sin enlazar comparten exactamente ese texto. */
  lines: number;
}

/** Orden de enlace: fija `supplyId` en las líneas de `source` cuyo `name` crudo coincida. */
export interface SupplyLinkPatch {
  source: SupplyLineSource;
  name: string;
  supplyId: string;
}

/**
 * Puerto del backfill de soft-links (#226). El contrato garantiza la
 * idempotencia: `applyLinks` SOLO escribe donde `supplyId` sigue nulo, así que
 * re-ejecutar no duplica ni revierte enlaces manuales previos.
 */
export interface SupplyLinkBackfillRepository {
  /** Grupos (fuente, texto) de líneas aún sin enlazar al catálogo. */
  listUnlinked(): Promise<UnlinkedLineGroup[]>;
  /** Aplica los enlaces resueltos y devuelve cuántas líneas se actualizaron. */
  applyLinks(patches: readonly SupplyLinkPatch[]): Promise<number>;
}
