import { Container } from '../domain/container';
import { SupplyLineSnapshot } from '../domain/supply-line';

export interface ContainerLineView {
  name: string;
  quantity: number;
  unit: string | null;
  category: string;
  presentation: string | null;
}

export interface ContainerView {
  id: string;
  code: string;
  type: string;
  emergencyId: string;
  parentContainerId: string | null;
  lines: ContainerLineView[];
  grossWeightKg: number | null;
  grossVolumeM3: number | null;
  holderType: string | null;
  holderId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * A container with its sub-tree and the aggregated weight/volume (own + Σ
 * children). The total is `null` only when nothing in the sub-tree declared
 * that magnitude.
 */
export interface ContainerTreeView extends ContainerView {
  children: ContainerTreeView[];
  totalWeightKg: number | null;
  totalVolumeM3: number | null;
}

function toLineView(l: SupplyLineSnapshot): ContainerLineView {
  return {
    name: l.name,
    quantity: l.quantity,
    unit: l.unit,
    category: l.category,
    presentation: l.presentation ?? null,
  };
}

export function toContainerView(c: Container): ContainerView {
  const snap = c.toSnapshot();
  return {
    id: snap.id,
    code: snap.code,
    type: snap.type,
    emergencyId: snap.emergencyId,
    parentContainerId: snap.parentContainerId,
    lines: snap.lines.map(toLineView),
    grossWeightKg: snap.grossWeightKg,
    grossVolumeM3: snap.grossVolumeM3,
    holderType: snap.holderType,
    holderId: snap.holderId,
    status: snap.status,
    createdAt: snap.createdAt.toISOString(),
    updatedAt: snap.updatedAt.toISOString(),
  };
}

/**
 * Adds two optional magnitudes treating "not declared" (null) as absent: the
 * result is null only if both are null, otherwise the numeric sum.
 */
export function addOptionalAmounts(
  a: number | null,
  b: number | null,
): number | null {
  if (a === null && b === null) return null;
  return (a ?? 0) + (b ?? 0);
}
