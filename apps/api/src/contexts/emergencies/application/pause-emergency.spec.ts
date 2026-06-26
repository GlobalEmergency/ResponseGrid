import { PauseEmergency } from './pause-emergency';
import { InMemoryEmergencyRepository } from '../infrastructure/in-memory-emergency.repository';
import { CreateEmergency } from './create-emergency';
import { EmergencyNotFoundError } from './emergency-not-found.error';
import { InvalidEmergencyTransitionError } from '../domain/invalid-emergency-transition.error';
import { EmergencyStatus } from '../domain/emergency-status';
import { EmergencyId } from '../../../shared/domain/emergency-id';

async function createAndGetId(
  repo: InMemoryEmergencyRepository,
): Promise<string> {
  const createUC = new CreateEmergency(repo);
  const result = await createUC.execute({
    name: 'Test Emergency',
    country: 'ES',
  });
  return result.id;
}

describe('PauseEmergency', () => {
  it('pauses an active emergency', async () => {
    const repo = new InMemoryEmergencyRepository();
    const id = await createAndGetId(repo);
    const useCase = new PauseEmergency(repo);

    await useCase.execute({ emergencyId: id });

    const saved = await repo.findById(EmergencyId.fromString(id));
    expect(saved?.status).toBe(EmergencyStatus.Paused);
  });

  it('throws EmergencyNotFoundError for unknown id', async () => {
    const repo = new InMemoryEmergencyRepository();
    const useCase = new PauseEmergency(repo);

    await expect(
      useCase.execute({ emergencyId: '00000000-0000-4000-8000-000000000000' }),
    ).rejects.toThrow(EmergencyNotFoundError);
  });

  it('throws InvalidEmergencyTransitionError when already paused', async () => {
    const repo = new InMemoryEmergencyRepository();
    const id = await createAndGetId(repo);
    const useCase = new PauseEmergency(repo);

    await useCase.execute({ emergencyId: id });

    await expect(useCase.execute({ emergencyId: id })).rejects.toThrow(
      InvalidEmergencyTransitionError,
    );
  });
});
