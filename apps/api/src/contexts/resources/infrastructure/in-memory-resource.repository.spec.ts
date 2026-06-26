import { InMemoryResourceRepository } from './in-memory-resource.repository';
import { Resource } from '../domain/resource';
import { ResourceId } from '../domain/resource-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { ResourceType, ResourceStage, VerificationLevel } from '../domain/resource-enums';
import { PublicStatus } from '../domain/resource-enums';
import { Location } from '../../../shared/domain/location';

const EM_A = '11111111-1111-4111-8111-111111111111';
const EM_B = '22222222-2222-4222-8222-222222222222';
const baseLocation = Location.create({ address: 'Calle Test 1, Madrid', latitude: 40.4168, longitude: -3.7038 });

const make = (emergencyId: string, name: string) =>
  Resource.register({
    id: ResourceId.create(),
    emergencyId: EmergencyId.fromString(emergencyId),
    type: ResourceType.CollectionPoint,
    stage: ResourceStage.Origin,
    name,
    location: baseLocation,
    ownerUserId: 'user-test-inmem',
  });

describe('InMemoryResourceRepository', () => {
  it('saves and finds by id', async () => {
    const repo = new InMemoryResourceRepository();
    const r = make(EM_A, 'Punto 1');
    await repo.save(r);
    const found = await repo.findById(r.id);
    expect(found?.name).toBe('Punto 1');
  });

  it('findPendingByEmergency returns only unverified rows of that emergency', async () => {
    const repo = new InMemoryResourceRepository();
    const pending = make(EM_A, 'Pending A');
    const verified = make(EM_A, 'Verified A');
    verified.verify(VerificationLevel.Verified, 'c1');
    const otherEmergency = make(EM_B, 'Pending B');
    await repo.save(pending);
    await repo.save(verified);
    await repo.save(otherEmergency);

    const result = await repo.findPendingByEmergency(EmergencyId.fromString(EM_A));
    expect(result.map((r) => r.name)).toEqual(['Pending A']);
  });

  it('findActiveByEmergency returns only published resources and excludes them from pending', async () => {
    const repo = new InMemoryResourceRepository();
    const active = make(EM_A, 'Active A');
    active.verify(VerificationLevel.Verified, 'c1');
    active.publish();
    const pending = make(EM_A, 'Pending A');
    const otherEmergency = make(EM_B, 'Active B');
    otherEmergency.verify(VerificationLevel.Verified, 'c2');
    otherEmergency.publish();
    await repo.save(active);
    await repo.save(pending);
    await repo.save(otherEmergency);

    const activeResult = await repo.findActiveByEmergency(EmergencyId.fromString(EM_A));
    expect(activeResult.map((r) => r.name)).toEqual(['Active A']);
    expect(activeResult[0].publicStatus).toBe(PublicStatus.Active);

    const pendingResult = await repo.findPendingByEmergency(EmergencyId.fromString(EM_A));
    expect(pendingResult.map((r) => r.name)).toEqual(['Pending A']);
  });
});
