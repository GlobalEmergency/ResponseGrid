import type { CapacityProps } from '../kernel/index.js';
import {
  computeLoad,
  type ContainerLoadNode,
  type LoadLine,
  type LoadTotals,
  type SupplyLoadLookup,
} from './compute-load.js';
import {
  vehicleLoadStatus,
  type VehicleLoadStatus,
} from './vehicle-load-status.js';

/** Una entrada del manifiesto: cuánto de un producto va a bordo, agregado. */
export interface ManifestLine {
  supplyId: string;
  quantity: number;
  unit: string | null;
}

/**
 * El manifiesto de un vehículo: "abrir el camión y ver". Composición PURA (spec
 * §3) — el llamador (host) consulta el stock/containers a bordo y pasa las formas
 * estructurales; aquí se computa la carga (`computeLoad`), su estado frente a la
 * capacidad (`vehicleLoadStatus`) y se agrega el material por `(supplyId, unit)`.
 * El personal (nature=human) va aparte, no como cargo.
 */
export interface VehicleManifest {
  totals: LoadTotals;
  status: VehicleLoadStatus;
  cargo: ManifestLine[];
  personnel: LoadLine[];
}

export function buildVehicleManifest(
  looseLines: readonly LoadLine[],
  containers: readonly ContainerLoadNode[],
  lookup: SupplyLoadLookup,
  maxCapacity: CapacityProps | null,
): VehicleManifest {
  const totals = computeLoad(looseLines, containers, lookup);
  const status = vehicleLoadStatus(maxCapacity, totals);

  // Agrega TODO el material a bordo por (supplyId, unit) — suelto + líneas de
  // cualquier container (el recuento de contenido es independiente de la regla
  // del nodo más alto, que sólo rige el peso/volumen). Excluye personal y
  // líneas sin supplyId (no verificables).
  const personnelRefs = new Set(totals.personnel);
  const byKey = new Map<string, ManifestLine>();
  const allLines: LoadLine[] = [
    ...looseLines,
    ...containers.flatMap((c) => c.lines),
  ];
  for (const line of allLines) {
    if (line.supplyId === null || personnelRefs.has(line)) continue;
    const key = `${line.supplyId} ${line.unit ?? ''}`;
    const existing = byKey.get(key);
    if (existing) existing.quantity += line.quantity;
    else
      byKey.set(key, {
        supplyId: line.supplyId,
        quantity: line.quantity,
        unit: line.unit,
      });
  }

  return {
    totals,
    status,
    cargo: [...byKey.values()],
    personnel: totals.personnel,
  };
}
