import { TransportCapacity } from '@globalemergency/warehouse-core/logistics';
import { CapacityProps } from '@globalemergency/warehouse-core/logistics';
import { CoverageProps } from '@globalemergency/warehouse-core/logistics';
import { CapacityWindowProps } from '@globalemergency/warehouse-core/logistics';

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
    emergencyId: s.scopeId,
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
