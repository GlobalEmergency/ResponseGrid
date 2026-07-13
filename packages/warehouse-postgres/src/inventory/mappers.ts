import type {
  WarehouseSnapshot,
  ZoneSnapshot,
  BinSnapshot,
  StockItemSnapshot,
  StockMovementSnapshot,
} from '@globalemergency/warehouse-core/inventory';
import {
  WarehouseKind,
  WarehouseStatus,
  ZoneStatus,
  ZoneKind,
  BinStatus,
  BinKind,
  StockStatus,
  MovementKind,
} from '@globalemergency/warehouse-core/inventory';
import type { CapacityProps } from '@globalemergency/warehouse-core/kernel';
import type {
  warehousesTable,
  zonesTable,
  binsTable,
  stockItemsTable,
  stockMovementsTable,
} from './schema.js';

type WarehouseRow = typeof warehousesTable.$inferSelect;
type ZoneRow = typeof zonesTable.$inferSelect;
type BinRow = typeof binsTable.$inferSelect;
type StockItemRow = typeof stockItemsTable.$inferSelect;
type StockMovementRow = typeof stockMovementsTable.$inferSelect;

/**
 * `numeric` de Postgres llega a la app como string (gotcha del repo). Se
 * convierte a number para el snapshot del dominio, que trabaja con `number`
 * (el VO Quantity redondea a escala 6, en sintonía con `numeric(18,6)`).
 */
function numericToNumber(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`Valor numeric no finito en la BBDD: "${value}"`);
  }
  return n;
}

/** `numeric` nullable → number | null (misma cautela que {@link numericToNumber}). */
function nullableNumericToNumber(value: string | null): number | null {
  return value === null ? null : numericToNumber(value);
}

/**
 * Reconstruye la carga útil máxima del vehículo a partir de las dos columnas
 * `max_weight_kg` / `max_volume_m3`: `null` si ambas son nulas (almacén fijo o
 * vehículo sin capacidad declarada); en otro caso, las props del VO Capacity.
 */
function rowToMaxCapacity(
  maxWeightKg: string | null,
  maxVolumeM3: string | null,
): CapacityProps | null {
  if (maxWeightKg === null && maxVolumeM3 === null) return null;
  return {
    weightKg: nullableNumericToNumber(maxWeightKg),
    volumeM3: nullableNumericToNumber(maxVolumeM3),
  };
}

// --- Warehouse + Zone ------------------------------------------------------

/** Fila de zona → {@link ZoneSnapshot} (sin la FK warehouse_id, implícita). */
export function rowToZoneSnapshot(row: ZoneRow): ZoneSnapshot {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    kind: row.kind as ZoneKind,
    status: row.status as ZoneStatus,
  };
}

/**
 * Ensambla el {@link WarehouseSnapshot} a partir de la fila del almacén y sus
 * filas de zona (ya cargadas). El agregado se reconstruye luego con
 * `Warehouse.fromSnapshot`.
 */
export function rowsToWarehouseSnapshot(
  row: WarehouseRow,
  zones: ZoneRow[],
): WarehouseSnapshot {
  return {
    id: row.id,
    scopeId: row.scopeId,
    code: row.code,
    name: row.name,
    address: row.address ?? null,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    status: row.status as WarehouseStatus,
    kind: row.kind as WarehouseKind,
    maxCapacity: rowToMaxCapacity(row.maxWeightKg, row.maxVolumeM3),
    zones: zones.map(rowToZoneSnapshot),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** {@link WarehouseSnapshot} → columnas de la fila del almacén (sin las zonas). */
export function warehouseSnapshotToRow(
  s: WarehouseSnapshot,
): typeof warehousesTable.$inferInsert {
  return {
    id: s.id,
    scopeId: s.scopeId,
    code: s.code,
    name: s.name,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    status: s.status,
    kind: s.kind,
    // `numeric` acepta string; se serializa igual que quantityAmount. null → null.
    maxWeightKg:
      s.maxCapacity?.weightKg != null
        ? s.maxCapacity.weightKg.toString()
        : null,
    maxVolumeM3:
      s.maxCapacity?.volumeM3 != null
        ? s.maxCapacity.volumeM3.toString()
        : null,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

/** {@link ZoneSnapshot} + su warehouseId → columnas de la fila de zona. */
export function zoneSnapshotToRow(
  warehouseId: string,
  s: ZoneSnapshot,
): typeof zonesTable.$inferInsert {
  return {
    id: s.id,
    warehouseId,
    code: s.code,
    name: s.name,
    kind: s.kind,
    status: s.status,
  };
}

// --- Bin -------------------------------------------------------------------

export function rowToBinSnapshot(row: BinRow): BinSnapshot {
  return {
    id: row.id,
    scopeId: row.scopeId,
    warehouseId: row.warehouseId,
    zoneId: row.zoneId ?? null,
    code: row.code,
    kind: row.kind as BinKind,
    status: row.status as BinStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function binSnapshotToRow(
  s: BinSnapshot,
): typeof binsTable.$inferInsert {
  return {
    id: s.id,
    scopeId: s.scopeId,
    warehouseId: s.warehouseId,
    zoneId: s.zoneId,
    code: s.code,
    kind: s.kind,
    status: s.status,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

// --- StockItem -------------------------------------------------------------

export function rowToStockItemSnapshot(row: StockItemRow): StockItemSnapshot {
  return {
    id: row.id,
    scopeId: row.scopeId,
    warehouseId: row.warehouseId,
    binId: row.binId,
    supplyId: row.supplyId,
    lotCode: row.lotCode ?? null,
    expiresAt: row.expiresAt ?? null,
    quantityAmount: numericToNumber(row.quantityAmount),
    unit: row.unit,
    status: row.status as StockStatus,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function stockItemSnapshotToRow(
  s: StockItemSnapshot,
): typeof stockItemsTable.$inferInsert {
  return {
    id: s.id,
    scopeId: s.scopeId,
    warehouseId: s.warehouseId,
    binId: s.binId,
    supplyId: s.supplyId,
    lotCode: s.lotCode,
    expiresAt: s.expiresAt,
    // `numeric` acepta string; se serializa con la escala del VO (6 decimales).
    quantityAmount: s.quantityAmount.toString(),
    unit: s.unit,
    status: s.status,
    version: s.version,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

// --- StockMovement ---------------------------------------------------------

export function rowToStockMovementSnapshot(
  row: StockMovementRow,
): StockMovementSnapshot {
  return {
    id: row.id,
    scopeId: row.scopeId,
    kind: row.kind as MovementKind,
    quantityAmount: numericToNumber(row.quantityAmount),
    unit: row.unit,
    fromItemId: row.fromItemId ?? null,
    toItemId: row.toItemId ?? null,
    reason: row.reason ?? null,
    idempotencyKey: row.idempotencyKey ?? null,
    occurredAt: row.occurredAt,
  };
}

export function stockMovementSnapshotToRow(
  s: StockMovementSnapshot,
): typeof stockMovementsTable.$inferInsert {
  return {
    id: s.id,
    scopeId: s.scopeId,
    kind: s.kind,
    quantityAmount: s.quantityAmount.toString(),
    unit: s.unit,
    fromItemId: s.fromItemId,
    toItemId: s.toItemId,
    reason: s.reason,
    idempotencyKey: s.idempotencyKey,
    occurredAt: s.occurredAt,
  };
}
