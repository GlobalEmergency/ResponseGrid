import { ResourceRepository } from '../domain/ports/resource.repository';
import { Resource } from '../domain/resource';
import { ResourceId } from '../domain/resource-id';
import { EmergencyId } from '../domain/emergency-id';
import { VerificationLevel, PublicStatus } from '../domain/resource-enums';

export class InMemoryResourceRepository implements ResourceRepository {
  private store = new Map<string, ReturnType<Resource['toSnapshot']>>();

  async save(resource: Resource): Promise<void> {
    this.store.set(resource.id.value, resource.toSnapshot());
  }
  async findById(id: ResourceId): Promise<Resource | null> {
    const snap = this.store.get(id.value);
    return snap ? Resource.fromSnapshot(snap) : null;
  }
  async findPendingByEmergency(emergencyId: EmergencyId): Promise<Resource[]> {
    return [...this.store.values()]
      .filter(
        (s) => s.emergencyId === emergencyId.value && s.verificationLevel === VerificationLevel.Unverified,
      )
      .map((s) => Resource.fromSnapshot(s));
  }
  async findActiveByEmergency(emergencyId: EmergencyId): Promise<Resource[]> {
    return [...this.store.values()]
      .filter(
        (s) => s.emergencyId === emergencyId.value && s.publicStatus === PublicStatus.Active,
      )
      .map((s) => Resource.fromSnapshot(s));
  }
}
