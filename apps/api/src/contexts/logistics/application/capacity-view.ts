import { TransportCapacity } from '../domain/transport-capacity';
import { CapacityProps } from '../domain/capacity';
import { CoverageProps } from '../domain/coverage';
import { CapacityWindowProps } from '../domain/capacity-window';

export interface CapacityView {
  id: string;
  emergencyId: string;
  providerType: string;
  providerId: string;
  mode: string;
  capacity: CapacityProps;
  coverage: CoverageProps;
  window: CapacityWindowProps;
  constraints: string[];
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toCapacityView(c: TransportCapacity): CapacityView {
  const s = c.toSnapshot();
  return {
    id: s.id,
    emergencyId: s.emergencyId,
    providerType: s.providerType,
    providerId: s.providerId,
    mode: s.mode,
    capacity: s.capacity,
    coverage: s.coverage,
    window: s.window,
    constraints: s.constraints,
    status: s.status,
    notes: s.notes,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}
