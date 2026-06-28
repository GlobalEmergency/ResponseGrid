import { TransportCapacity } from '../domain/transport-capacity';
import {
  TransportMode,
  ProviderType,
  CapacityStatus,
} from '../domain/transport-capacity-enums';

/** Serializable read model for a transport capacity (dates as ISO strings). */
export interface CapacityView {
  id: string;
  emergencyId: string;
  providerType: ProviderType;
  providerId: string;
  mode: TransportMode;
  weightKg: number | null;
  volumeM3: number | null;
  originMunicipality: string;
  destinationMunicipality: string | null;
  availableFrom: string;
  availableUntil: string | null;
  refrigerated: boolean;
  notes: string | null;
  status: CapacityStatus;
  createdAt: string;
  updatedAt: string;
}

export function toCapacityView(c: TransportCapacity): CapacityView {
  return {
    id: c.id.value,
    emergencyId: c.emergencyId.value,
    providerType: c.providerType,
    providerId: c.providerId,
    mode: c.mode,
    weightKg: c.weightKg,
    volumeM3: c.volumeM3,
    originMunicipality: c.originMunicipality,
    destinationMunicipality: c.destinationMunicipality,
    availableFrom: c.availableFrom.toISOString(),
    availableUntil:
      c.availableUntil === null ? null : c.availableUntil.toISOString(),
    refrigerated: c.refrigerated,
    notes: c.notes,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}
