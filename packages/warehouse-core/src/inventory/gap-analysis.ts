import type { LoadTemplate } from './load-template.js';

/** Una línea del manifiesto real a bordo (estructura de `VehicleManifest.cargo`). */
export interface OnboardLine {
  supplyId: string;
  quantity: number;
  unit: string | null;
}

export interface GapLine {
  supplyId: string;
  unit: string | null;
  quantity: number;
  permanent: boolean;
}

/**
 * Checklist operativo: compara lo que hay a bordo con la dotación tipo. Empareja
 * por `(supplyId, unit)` SIN convertir unidades — si difieren, no casa (honestidad,
 * como `computeLoad`): la línea de la plantilla cae en `missing` y la del
 * manifiesto en `extra`. `completenessPct` es Σ min(hay, requerido) / Σ requerido.
 */
export interface GapReport {
  missing: GapLine[];
  extra: GapLine[];
  matched: GapLine[];
  completenessPct: number;
  permanentOk: boolean;
}

function key(supplyId: string, unit: string | null): string {
  return `${supplyId} ${unit ?? ''}`;
}

export function gapAnalysis(
  onboard: readonly OnboardLine[],
  template: LoadTemplate,
): GapReport {
  // Suma lo de a bordo por (supplyId, unit).
  const have = new Map<string, OnboardLine>();
  for (const line of onboard) {
    const k = key(line.supplyId, line.unit);
    const acc = have.get(k);
    if (acc) acc.quantity += line.quantity;
    else have.set(k, { ...line });
  }

  const missing: GapLine[] = [];
  const matched: GapLine[] = [];
  const consumed = new Map<string, number>(); // cuánto de a bordo cubre la plantilla
  let sumReq = 0;
  let sumSatisfied = 0;
  let permanentOk = true;

  for (const line of template.lines) {
    const k = key(line.supplyId, line.unit);
    const onboardQty = have.get(k)?.quantity ?? 0;
    const satisfied = Math.min(onboardQty, line.quantity);
    consumed.set(k, satisfied);
    sumReq += line.quantity;
    sumSatisfied += satisfied;
    if (onboardQty >= line.quantity) {
      matched.push({
        supplyId: line.supplyId,
        unit: line.unit,
        quantity: line.quantity,
        permanent: line.permanent,
      });
    } else {
      missing.push({
        supplyId: line.supplyId,
        unit: line.unit,
        quantity: line.quantity - onboardQty,
        permanent: line.permanent,
      });
      if (line.permanent) permanentOk = false;
    }
  }

  // Excedente: lo de a bordo que la plantilla no consumió (no requerido o de más).
  const extra: GapLine[] = [];
  for (const [k, line] of have) {
    const surplus = line.quantity - (consumed.get(k) ?? 0);
    if (surplus > 0) {
      extra.push({
        supplyId: line.supplyId,
        unit: line.unit,
        quantity: surplus,
        permanent: false,
      });
    }
  }

  const completenessPct =
    sumReq === 0 ? 100 : Math.round((sumSatisfied / sumReq) * 1000) / 10;

  return { missing, extra, matched, completenessPct, permanentOk };
}
