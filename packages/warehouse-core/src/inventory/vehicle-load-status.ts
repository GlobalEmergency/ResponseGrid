import type { CapacityProps } from '../kernel/index.js';
import type { LoadTotals } from './compute-load.js';

/**
 * Estado de carga de un vehículo frente a su carga útil máxima (spec §3). Es una
 * DERIVACIÓN en vivo, no una barrera: `overWeight`/`overVolume` avisan pero
 * nunca lanzan (soft-warn — en emergencias decide el operador). La utilización
 * es `null` en la dimensión sin límite declarado (capacidad parcial). `incomplete`
 * refleja que el total de carga es un límite inferior (faltan datos de peso/volumen
 * de algún ítem), así que el % podría quedarse corto.
 */
export interface VehicleLoadStatus {
  weightKg: number;
  volumeM3: number;
  maxWeightKg: number | null;
  maxVolumeM3: number | null;
  weightUtilizationPct: number | null;
  volumeUtilizationPct: number | null;
  overWeight: boolean;
  overVolume: boolean;
  incomplete: boolean;
}

export function vehicleLoadStatus(
  maxCapacity: CapacityProps | null,
  totals: LoadTotals,
): VehicleLoadStatus {
  const maxWeightKg = maxCapacity?.weightKg ?? null;
  const maxVolumeM3 = maxCapacity?.volumeM3 ?? null;
  return {
    weightKg: totals.weightKg,
    volumeM3: totals.volumeM3,
    maxWeightKg,
    maxVolumeM3,
    weightUtilizationPct: utilization(totals.weightKg, maxWeightKg),
    volumeUtilizationPct: utilization(totals.volumeM3, maxVolumeM3),
    overWeight: maxWeightKg !== null && totals.weightKg > maxWeightKg,
    overVolume: maxVolumeM3 !== null && totals.volumeM3 > maxVolumeM3,
    incomplete: !totals.weightComplete || !totals.volumeComplete,
  };
}

/** % de utilización redondeado a 1 decimal; null si no hay límite (o límite ≤ 0). */
function utilization(value: number, max: number | null): number | null {
  if (max === null || max <= 0) return null;
  return Math.round((value / max) * 1000) / 10;
}
