/**
 * computeLoad — suma la carga (peso kg / volumen m³) de un contenido de almacén
 * o vehículo: líneas sueltas de stock + árboles de containers (palets/cajas).
 * Servicio PURO del diseño de vehículos (Inc 1): no importa catalog ni
 * containers — el llamador mapea a formas estructurales y aporta el catálogo
 * vía el port `SupplyLoadLookup`.
 *
 * Reglas (spec 2026-07-13-vehiculos-almacen-movil-design.md §2):
 * - **Base de unidades:** el unitario del catálogo se define respecto al
 *   `defaultUnit` del insumo. Una línea con unidad distinta NO se multiplica:
 *   queda como desconocida (`unit_mismatch`). Unidad null = se asume la base.
 * - **Nodo más alto (anti doble-conteo), POR DIMENSIÓN:** un container con
 *   bruto declarado aporta ese número y corta la recursión de esa dimensión en
 *   todo su subárbol (hijos y líneas no suman en ella); la dimensión no
 *   declarada se deriva del contenido.
 * - **`nature === 'human'` no es carga:** se excluye del total y se reporta
 *   aparte en `personnel` (el manifiesto lo muestra como personal a bordo).
 * - **Honestidad:** todo lo no calculable va a `unknowns` con su dimensión y
 *   motivo; `weightComplete`/`volumeComplete` marcan si el total de cada
 *   dimensión es exacto o un límite inferior ("al menos X").
 *
 * Precondiciones (garantizadas por el llamador, que mapea desde agregados WMS
 * ya validados; esta función NO las re-valida):
 * - `quantity` finita y ≥ 0 (viene del VO `Quantity` de un `StockItem`). Un
 *   valor no finito/negativo envenenaría el total sin marcarse como desconocido.
 * - Los containers forman un **bosque acíclico** (lo garantiza el agregado
 *   `Container` vía `ContainerCycleError`). Un ciclo dejaría esos containers
 *   fuera del cómputo (nunca serían raíz), no un bucle infinito.
 */

/** Lo que el catálogo sabe de un insumo a efectos de carga (port de lookup). */
export interface SupplyLoadInfo {
  unitWeightKg: number | null;
  unitVolumeM3: number | null;
  /** Unidad base respecto a la que se definen los unitarios. */
  defaultUnit: string | null;
  /** Naturaleza logística; 'human' se excluye de la carga. */
  nature: string | null;
}

/** Port síncrono: el llamador precarga su catálogo (p.ej. en un Map). */
export type SupplyLoadLookup = (supplyId: string) => SupplyLoadInfo | null;

/** Una línea de material (stock suelto o línea de un container). */
export interface LoadLine {
  /** Id del insumo del catálogo; null = no vinculado (no calculable). */
  supplyId: string | null;
  quantity: number;
  /** Unidad de la línea; null = se asume la unidad base del insumo. */
  unit: string | null;
  /** Referencia legible para reportar (id de stock item, nombre de línea…). */
  ref: string;
}

/** Un container (palet/caja) del árbol de carga, aplanado por el llamador. */
export interface ContainerLoadNode {
  id: string;
  /** Container padre, o null si es raíz (un padre desconocido cuenta como raíz). */
  parentId: string | null;
  grossWeightKg: number | null;
  grossVolumeM3: number | null;
  lines: readonly LoadLine[];
}

export type LoadDimension = 'weight' | 'volume';

export interface LoadUnknown {
  ref: string;
  dimensions: LoadDimension[];
  reason: 'unknown_supply' | 'unit_mismatch' | 'missing_unit_measure';
}

export interface LoadTotals {
  weightKg: number;
  volumeM3: number;
  weightComplete: boolean;
  volumeComplete: boolean;
  /** true solo si ambas dimensiones son exactas. */
  complete: boolean;
  unknowns: LoadUnknown[];
  /** Líneas de personal (nature=human), excluidas del peso/volumen. */
  personnel: LoadLine[];
}

interface Accumulator {
  weight: number;
  volume: number;
}

/** Dimensiones ya cubiertas por un bruto declarado más arriba en el árbol. */
interface Covered {
  weight: boolean;
  volume: boolean;
}

export function computeLoad(
  looseLines: readonly LoadLine[],
  containers: readonly ContainerLoadNode[],
  lookup: SupplyLoadLookup,
): LoadTotals {
  const acc: Accumulator = { weight: 0, volume: 0 };
  const unknowns: LoadUnknown[] = [];
  const personnel: LoadLine[] = [];

  for (const line of looseLines) {
    addLine(
      line,
      { weight: false, volume: false },
      acc,
      unknowns,
      personnel,
      lookup,
    );
  }

  // Árbol de containers: raíces = sin padre o con padre fuera del conjunto.
  const ids = new Set(containers.map((c) => c.id));
  const byParent = new Map<string, ContainerLoadNode[]>();
  const roots: ContainerLoadNode[] = [];
  for (const c of containers) {
    if (c.parentId !== null && ids.has(c.parentId)) {
      const siblings = byParent.get(c.parentId) ?? [];
      siblings.push(c);
      byParent.set(c.parentId, siblings);
    } else {
      roots.push(c);
    }
  }
  for (const root of roots) {
    addContainer(
      root,
      byParent,
      { weight: false, volume: false },
      acc,
      unknowns,
      personnel,
      lookup,
    );
  }

  const weightComplete = !unknowns.some((u) => u.dimensions.includes('weight'));
  const volumeComplete = !unknowns.some((u) => u.dimensions.includes('volume'));
  return {
    weightKg: round6(acc.weight),
    volumeM3: round6(acc.volume),
    weightComplete,
    volumeComplete,
    complete: weightComplete && volumeComplete,
    unknowns,
    personnel,
  };
}

function addContainer(
  node: ContainerLoadNode,
  byParent: Map<string, ContainerLoadNode[]>,
  covered: Covered,
  acc: Accumulator,
  unknowns: LoadUnknown[],
  personnel: LoadLine[],
  lookup: SupplyLoadLookup,
): void {
  // El bruto declarado aporta y corta la recursión de SU dimensión (si un
  // ancestro ya la cubrió, este declarado se ignora: el nodo más alto gana).
  if (!covered.weight && node.grossWeightKg !== null) {
    acc.weight += node.grossWeightKg;
  }
  if (!covered.volume && node.grossVolumeM3 !== null) {
    acc.volume += node.grossVolumeM3;
  }

  const next: Covered = {
    weight: covered.weight || node.grossWeightKg !== null,
    volume: covered.volume || node.grossVolumeM3 !== null,
  };

  // Siempre se recorren líneas e hijos, aunque ambas dimensiones estén
  // cubiertas por el bruto declarado: el peso/volumen no suma (lo corta
  // `addLine`/la propagación de `next`), pero el PERSONAL de un subárbol
  // declarado debe reportarse igual (no es carga).
  for (const line of node.lines) {
    addLine(line, next, acc, unknowns, personnel, lookup);
  }
  for (const child of byParent.get(node.id) ?? []) {
    addContainer(child, byParent, next, acc, unknowns, personnel, lookup);
  }
}

function addLine(
  line: LoadLine,
  covered: Covered,
  acc: Accumulator,
  unknowns: LoadUnknown[],
  personnel: LoadLine[],
  lookup: SupplyLoadLookup,
): void {
  const info = line.supplyId !== null ? lookup(line.supplyId) : null;

  // El personal (nature=human) NUNCA es carga: se reporta siempre, aun cuando
  // un container ancestro ya tenga el bruto declarado (no depende de las
  // dimensiones abiertas, a diferencia del peso/volumen de abajo).
  if (info !== null && info.nature === 'human') {
    personnel.push(line);
    return;
  }

  const open: LoadDimension[] = [];
  if (!covered.weight) open.push('weight');
  if (!covered.volume) open.push('volume');
  // Dimensiones cubiertas por un bruto declarado más arriba: la línea no aporta
  // (ni cuenta como desconocida — el declarado ya la incluye).
  if (open.length === 0) return;

  if (line.supplyId === null || info === null) {
    unknowns.push({
      ref: line.ref,
      dimensions: open,
      reason: 'unknown_supply',
    });
    return;
  }
  const lineUnit = normalizeUnit(line.unit);
  if (lineUnit !== null && lineUnit !== normalizeUnit(info.defaultUnit)) {
    unknowns.push({
      ref: line.ref,
      dimensions: open,
      reason: 'unit_mismatch',
    });
    return;
  }

  const missing: LoadDimension[] = [];
  if (!covered.weight) {
    if (info.unitWeightKg === null) missing.push('weight');
    else acc.weight += line.quantity * info.unitWeightKg;
  }
  if (!covered.volume) {
    if (info.unitVolumeM3 === null) missing.push('volume');
    else acc.volume += line.quantity * info.unitVolumeM3;
  }
  if (missing.length > 0) {
    unknowns.push({
      ref: line.ref,
      dimensions: missing,
      reason: 'missing_unit_measure',
    });
  }
}

function normalizeUnit(unit: string | null): string | null {
  if (unit === null) return null;
  const trimmed = unit.trim().toLowerCase();
  return trimmed.length === 0 ? null : trimmed;
}

/** Redondeo a 6 decimales (la escala del VO Quantity) contra ruido flotante. */
function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
